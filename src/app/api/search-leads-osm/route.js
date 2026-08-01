const RADIUS_METERS = 15000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const NOMINATIM_MIN_INTERVAL_MS = 1000; // Nominatim usage policy: max 1 req/sec
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Module-level state persists across requests within the same server process.
const searchCache = new Map();
let lastNominatimCallAt = 0;

// Maps this app's business-type values to OpenStreetMap tag(s). Multiple
// [key, value] pairs are OR'd together in the Overpass query.
const OSM_TAG_MAP = {
  "restaurants": [["amenity", "restaurant"]],
  "halal restaurants": [["amenity", "restaurant"]],
  "pakistani restaurants": [["amenity", "restaurant"]],
  "indian restaurants": [["amenity", "restaurant"]],
  "cafes and coffee shops": [["amenity", "cafe"]],
  "barber shops and salons": [["shop", "hairdresser"]],
  "gyms and fitness studios": [["leisure", "fitness_centre"]],
  "dental clinics": [["amenity", "dentist"]],
  "auto repair shops": [["shop", "car_repair"]],
  "bakeries": [["shop", "bakery"]],
  "laundry and dry cleaning": [["shop", "laundry"]],
  "tutoring and coaching": [["office", "educational_institution"]],
  "pet grooming": [["shop", "pet_grooming"], ["shop", "pet"]],
  "medical clinics": [["amenity", "clinic"]],
  "real estate agencies": [["office", "estate_agent"]],
  "property dealers": [["office", "estate_agent"]],
  "real estate developers": [["office", "estate_agent"]],
  "construction companies": [["office", "construction_company"]],
  "beauty salons for women": [["shop", "beauty"]],
  "nail salons": [["shop", "beauty"]],
  "spa and wellness centers": [["leisure", "spa"]],
  "bridal makeup studios": [["shop", "beauty"]],
  "skincare and facial clinics": [["shop", "beauty"]],
  "yoga and pilates studios": [["leisure", "fitness_centre"]],
  "florists and flower shops": [["shop", "florist"]],
  "photography studios": [["shop", "photo"]],
  "car wash and detailing": [["amenity", "car_wash"]],
  "accounting and tax firms": [["office", "accountant"]],
};

function cacheKey(city, businessType) {
  return `${city.trim().toLowerCase()}::${businessType}`;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function respectNominatimRateLimit() {
  const elapsed = Date.now() - lastNominatimCallAt;
  if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, NOMINATIM_MIN_INTERVAL_MS - elapsed));
  }
  lastNominatimCallAt = Date.now();
}

async function geocodeCity(city) {
  await respectNominatimRateLimit();
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(city)}&format=json&limit=1`;
  const resp = await fetchWithTimeout(
    url,
    { headers: { "User-Agent": "LeadHunterApp/1.0" } },
    15000
  );
  if (!resp.ok) throw new Error(`Nominatim error ${resp.status}`);
  const data = await resp.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

function buildOverpassTagQuery(tagPairs, lat, lon) {
  const clauses = tagPairs.flatMap(([k, v]) => [
    `  node["${k}"="${v}"](around:${RADIUS_METERS},${lat},${lon});`,
    `  way["${k}"="${v}"](around:${RADIUS_METERS},${lat},${lon});`,
  ]);
  return `[out:json][timeout:25];\n(\n${clauses.join("\n")}\n);\nout center tags;`;
}

function buildOverpassNameQuery(businessType, lat, lon) {
  const term = businessType.replace(/[^a-zA-Z ]/g, "").trim().split(" ")[0] || businessType;
  return `[out:json][timeout:25];\n(\n  nwr["name"~"${term}",i](around:${RADIUS_METERS},${lat},${lon});\n);\nout center tags;`;
}

async function queryOverpassOnce(query) {
  const resp = await fetchWithTimeout(
    OVERPASS_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "User-Agent": "LeadHunterApp/1.0",
        Accept: "application/json",
      },
      body: query,
    },
    30000
  );
  if (!resp.ok) throw new Error(`Overpass error ${resp.status}`);
  return resp.json();
}

async function queryOverpass(query) {
  try {
    return await queryOverpassOnce(query);
  } catch {
    // Retry once — Overpass's free public instance is frequently slow/overloaded.
    return queryOverpassOnce(query);
  }
}

function buildAddress(tags, cityFallback) {
  const streetParts = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean);
  const street = streetParts.join(" ");
  const cityPart = tags["addr:city"] || cityFallback;
  if (street && cityPart) return `${street}, ${cityPart}`;
  if (street) return street;
  if (cityPart) return cityPart;
  return "Address not listed";
}

function extractLeads(elements, businessType, city, wantedCount) {
  const seen = new Set();
  const leads = [];

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name;
    if (!name) continue;

    const website = tags.website || tags["contact:website"] || "";
    if (website) continue; // has a website — not a lead

    const dedupeKey = name.toLowerCase().trim();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    leads.push({
      name,
      address: buildAddress(tags, city),
      phone: tags.phone || tags["contact:phone"] || null,
      rating: null,
      reviews: null,
      reason: "No website found in OpenStreetMap data",
      detail: businessType,
      source: "openstreetmap",
    });

    if (leads.length >= wantedCount * 3) break; // cap scanning, we slice to wantedCount later
  }

  return leads;
}

export async function POST(request) {
  const { city, businessType, count } = await request.json();
  const wantedCount = parseInt(count) || 5;

  if (!city || !businessType) {
    return Response.json({ leads: [], message: "City and business type are required." });
  }

  const key = cacheKey(city, businessType);
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Response.json({
      leads: cached.leads.slice(0, wantedCount),
      message: cached.message,
    });
  }

  let location;
  try {
    location = await geocodeCity(city);
  } catch (err) {
    console.error("[osm] geocode failed:", err);
    return Response.json({
      leads: [],
      message: "Could not reach OpenStreetMap's geocoder. Try again or use AI search.",
    });
  }

  if (!location) {
    return Response.json({
      leads: [],
      message: "Could not locate that city on OpenStreetMap. Try a different spelling or use AI search.",
    });
  }

  const tagPairs = OSM_TAG_MAP[businessType];
  const query = tagPairs
    ? buildOverpassTagQuery(tagPairs, location.lat, location.lon)
    : buildOverpassNameQuery(businessType, location.lat, location.lon);

  let data;
  try {
    data = await queryOverpass(query);
  } catch (err) {
    console.error("[osm] overpass failed:", err);
    return Response.json({
      leads: [],
      message: "OpenStreetMap search timed out or failed. Try again or use AI search.",
    });
  }

  const leads = extractLeads(data.elements || [], businessType, city, wantedCount);

  const message =
    leads.length === 0
      ? "Limited data available for this area, try Google Maps manually"
      : leads.length < wantedCount
      ? `Only found ${leads.length} businesses without a website in OpenStreetMap data for this area.`
      : "";

  searchCache.set(key, { timestamp: Date.now(), leads, message });

  return Response.json({ leads: leads.slice(0, wantedCount), message });
}
