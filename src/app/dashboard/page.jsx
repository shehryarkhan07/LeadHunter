"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "leadhunter:leads:v2";
const HISTORY_KEY = "leadhunter:history";

const STATUSES = {
  new: { bg: "#EEF2FF", text: "#4338CA", label: "New" },
  mockup_sent: { bg: "#FFF7ED", text: "#C2410C", label: "Mockup sent" },
  contacted: { bg: "#FFFBEB", text: "#B45309", label: "Contacted" },
  follow_up: { bg: "#F5F3FF", text: "#7C3AED", label: "Follow up" },
  replied: { bg: "#F0FDF4", text: "#15803D", label: "Replied" },
  converted: { bg: "#ECFDF5", text: "#047857", label: "Converted" },
  not_interested: { bg: "#FEF2F2", text: "#B91C1C", label: "Not interested" },
  no_reply: { bg: "#F3F4F6", text: "#6B7280", label: "No reply" },
};

async function searchLeads(city, businessType, count) {
  const resp = await fetch("/api/search-leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, businessType, count }),
  });
  return resp.json();
}

async function searchLeadsOsm(city, businessType, count) {
  const resp = await fetch("/api/search-leads-osm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, businessType, count }),
  });
  return resp.json();
}

async function generateEmail(lead, senderName) {
  const resp = await fetch("/api/generate-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead, senderName }),
  });
  return resp.json();
}

function Badge({ status }) {
  const s = STATUSES[status] || STATUSES.new;
  return (
    <span style={{ background: s.bg, color: s.text, fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 6 }}>
      {s.label}
    </span>
  );
}

function LeadCard({ lead, onUpdate, onGenerateEmail, generatingEmail, onDelete }) {
  const [showEmail, setShowEmail] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div style={{ background: "#fff", border: "1px solid #E8E4DE", borderRadius: 12, padding: "16px 18px", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{lead.name}</span>
            <Badge status={lead.status} />
          </div>
          <div style={{ fontSize: 12, color: "#7a6b5a", marginBottom: 3 }}>{lead.address}</div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#9a8b7a", marginBottom: 6, flexWrap: "wrap" }}>
            {lead.phone && <span>📞 {lead.phone}</span>}
            {lead.rating && <span>⭐ {lead.rating}</span>}
            {lead.reviews && <span>💬 {lead.reviews} reviews</span>}
            <span>📅 {new Date(lead.addedAt).toLocaleDateString()}</span>
          </div>
          <div style={{ fontSize: 11, color: "#C8782A", fontWeight: 500, background: "#FFF8F0", display: "inline-block", padding: "2px 8px", borderRadius: 5 }}>
            {lead.reason}
          </div>
          {lead.detail && <div style={{ fontSize: 11, color: "#9a8b7a", marginTop: 3 }}>{lead.detail}</div>}
          {lead.notes && <div style={{ fontSize: 11, color: "#4338CA", marginTop: 4, fontStyle: "italic" }}>📝 {lead.notes}</div>}
          {lead.contactedAt && <div style={{ fontSize: 10, color: "#15803D", marginTop: 3 }}>Last contacted: {new Date(lead.contactedAt).toLocaleDateString()}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, marginLeft: 10 }}>
          <select value={lead.status} onChange={(e) => {
            const updates = { status: e.target.value };
            if (["contacted", "mockup_sent", "follow_up"].includes(e.target.value)) updates.contactedAt = new Date().toISOString();
            onUpdate(lead.id, updates);
          }} style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, border: "1px solid #E8E4DE", background: "#FAFAF7", color: "#4a3f34" }}>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => { onGenerateEmail(lead); setShowEmail(true); }} disabled={generatingEmail}
            style={{ fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 6, border: "none", background: "#C8782A", color: "#fff", cursor: generatingEmail ? "wait" : "pointer", opacity: generatingEmail ? 0.6 : 1 }}>
            {generatingEmail ? "..." : "📧 Email"}
          </button>
          <button onClick={() => setShowNotes(!showNotes)}
            style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid #E8E4DE", background: "#FAFAF7", color: "#7a6b5a", cursor: "pointer" }}>
            📝 Note
          </button>
          <button onClick={() => onDelete(lead.id)}
            style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, border: "1px solid #FEE2E2", background: "#FEF2F2", color: "#B91C1C", cursor: "pointer" }}>
            🗑️
          </button>
        </div>
      </div>

      {showNotes && (
        <div style={{ marginTop: 10 }}>
          <input type="text" placeholder="Add a note (e.g. called Tuesday, owner said call back Friday)" defaultValue={lead.notes || ""}
            onBlur={(e) => onUpdate(lead.id, { notes: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") { onUpdate(lead.id, { notes: e.target.value }); setShowNotes(false); }}}
            style={{ width: "100%", fontSize: 12, padding: "8px 12px", borderRadius: 8, border: "1px solid #E8E4DE" }}
          />
        </div>
      )}

      {(showEmail || lead.email) && lead.email && (
        <div style={{ marginTop: 10, padding: "12px 14px", background: "#FAFAF7", borderRadius: 8, border: "1px solid #F0EBE4" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#7a6b5a", marginBottom: 3 }}>Subject: {lead.email.subject}</div>
          <div style={{ fontSize: 12, color: "#4a3f34", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{lead.email.body}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => { navigator.clipboard.writeText(`Subject: ${lead.email.subject}\n\n${lead.email.body}`); }}
              style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 5, border: "1px solid #E8E4DE", background: "#fff", color: "#7a6b5a", cursor: "pointer" }}>
              Copy email
            </button>
            <button onClick={() => { onUpdate(lead.id, { status: "contacted", contactedAt: new Date().toISOString() }); }}
              style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 5, border: "none", background: "#C8782A", color: "#fff", cursor: "pointer" }}>
              Mark as contacted
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadHunter() {
  const [leads, setLeads] = useState([]);
  const [city, setCity] = useState("");
  const [businessType, setBusinessType] = useState("restaurants");
  const [count, setCount] = useState("5");
  const [searching, setSearching] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("search");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [senderName, setSenderName] = useState("Shehryar Khan");
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchSource, setSearchSource] = useState("osm"); // "osm" | "claude"

  useEffect(() => {
    try {
      const rawLeads = localStorage.getItem(STORAGE_KEY);
      if (rawLeads) setLeads(JSON.parse(rawLeads));
      const rawHistory = localStorage.getItem(HISTORY_KEY);
      if (rawHistory) setSearchHistory(JSON.parse(rawHistory));
    } catch {}
  }, []);

  const saveLeads = useCallback(async (updated) => {
    setLeads(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }, []);

  const saveHistory = useCallback(async (updated) => {
    setSearchHistory(updated);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
  }, []);

  const isDuplicate = (newLead) => {
    return leads.some((existing) => {
      const nameMatch = existing.name.toLowerCase().trim() === newLead.name.toLowerCase().trim();
      const phoneMatch = existing.phone && newLead.phone && existing.phone.replace(/\D/g, "") === newLead.phone.replace(/\D/g, "");
      return nameMatch || phoneMatch;
    });
  };

  const handleSearch = async () => {
    if (!city.trim()) return setError("Enter a city name");
    setError("");
    setSearching(true);
    try {
      let results = [];
      let infoMessage = "";

      if (searchSource === "osm") {
        const data = await searchLeadsOsm(city, businessType, parseInt(count));
        results = data.leads || [];
        infoMessage = data.message || "";
      } else {
        results = await searchLeads(city, businessType, parseInt(count));
      }

      if (!results.length) { setError(infoMessage || "No leads found. Try a different city or business type."); setSearching(false); return; }

      let added = 0;
      let skipped = 0;
      const newLeads = [];

      for (const r of results) {
        if (isDuplicate(r)) { skipped++; continue; }
        newLeads.push({ ...r, source: r.source || (searchSource === "osm" ? "openstreetmap" : "claude"), id: Date.now() + "-" + Math.random().toString(36).slice(2, 6), status: "new", city: city, type: businessType, addedAt: new Date().toISOString(), notes: "", contactedAt: null, email: null });
        added++;
      }

      if (newLeads.length > 0) await saveLeads([...newLeads, ...leads]);

      const historyEntry = { city, type: businessType, count: results.length, added, skipped, source: searchSource, date: new Date().toISOString() };
      await saveHistory([historyEntry, ...searchHistory]);

      const summary = skipped > 0 ? `Found ${results.length} leads — added ${added} new, skipped ${skipped} duplicates.` : `Added ${added} new leads!`;
      setError(infoMessage ? `${summary} ${infoMessage}` : summary);
      setTab("pipeline");
    } catch (e) { setError("Search failed — try again. " + (e.message || "")); }
    setSearching(false);
  };

  const handleUpdate = async (id, updates) => {
    const updated = leads.map((l) => (l.id === id ? { ...l, ...updates } : l));
    await saveLeads(updated);
  };

  const handleDelete = async (id) => {
    const updated = leads.filter((l) => l.id !== id);
    await saveLeads(updated);
  };

  const handleGenerateEmail = async (lead) => {
    setGeneratingId(lead.id);
    try {
      const email = await generateEmail(lead, senderName);
      await handleUpdate(lead.id, { email });
    } catch {}
    setGeneratingId(null);
  };

  const allCities = [...new Set(leads.map((l) => l.city).filter(Boolean))];

  const filteredLeads = leads.filter((l) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterCity !== "all" && l.city !== filterCity) return false;
    return true;
  });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => ["contacted", "mockup_sent", "follow_up"].includes(l.status)).length,
    replied: leads.filter((l) => l.status === "replied").length,
    converted: leads.filter((l) => l.status === "converted").length,
    closed: leads.filter((l) => ["not_interested", "no_reply"].includes(l.status)).length,
  };

  const cityGroups = [
    { label: "🇵🇰 Pakistan", cities: ["Islamabad, Pakistan", "Lahore, Pakistan", "Karachi, Pakistan", "Peshawar, Pakistan", "Rawalpindi, Pakistan", "Faisalabad, Pakistan", "Multan, Pakistan", "Swat, Pakistan", "Quetta, Pakistan"] },
    { label: "🇨🇦 Canada", cities: ["Montreal, Canada", "Toronto, Canada", "Vancouver, Canada", "Calgary, Canada", "Ottawa, Canada", "Edmonton, Canada", "Winnipeg, Canada"] },
    { label: "🇬🇧 UK", cities: ["London, UK", "Manchester, UK", "Birmingham, UK", "Leeds, UK", "Glasgow, UK", "Edinburgh, UK", "Bristol, UK"] },
    { label: "🇪🇺 Europe", cities: ["Madrid, Spain", "Barcelona, Spain", "Lisbon, Portugal", "Porto, Portugal", "Rome, Italy", "Milan, Italy", "Berlin, Germany", "Munich, Germany", "Paris, France", "Amsterdam, Netherlands", "Vienna, Austria", "Valletta, Malta", "Brussels, Belgium", "Zurich, Switzerland", "Stockholm, Sweden", "Oslo, Norway", "Copenhagen, Denmark", "Dublin, Ireland", "Prague, Czech Republic", "Warsaw, Poland", "Budapest, Hungary", "Athens, Greece"] },
    { label: "🇺🇸 USA", cities: ["New York, USA", "Los Angeles, USA", "Chicago, USA", "Houston, USA", "Miami, USA", "San Francisco, USA", "Dallas, USA", "Atlanta, USA"] },
    { label: "🇦🇺 Australia", cities: ["Sydney, Australia", "Melbourne, Australia", "Brisbane, Australia", "Perth, Australia", "Adelaide, Australia"] },
    { label: "🌍 Middle East", cities: ["Dubai, UAE", "Abu Dhabi, UAE", "Riyadh, Saudi Arabia", "Jeddah, Saudi Arabia", "Doha, Qatar", "Kuwait City, Kuwait", "Muscat, Oman", "Bahrain"] },
  ];

  const businessTypes = [
    { value: "restaurants", label: "🍽️ Restaurants" },
    { value: "cafes and coffee shops", label: "☕ Cafes" },
    { value: "barber shops and salons", label: "💇 Barbers/Salons" },
    { value: "gyms and fitness studios", label: "🏋️ Gyms" },
    { value: "dental clinics", label: "🦷 Dental clinics" },
    { value: "auto repair shops", label: "🔧 Auto repair" },
    { value: "bakeries", label: "🧁 Bakeries" },
    { value: "laundry and dry cleaning", label: "👔 Laundry" },
    { value: "tutoring and coaching", label: "📚 Tutoring" },
    { value: "pet grooming", label: "🐾 Pet grooming" },
    { value: "halal restaurants", label: "🥘 Halal restaurants" },
    { value: "pakistani restaurants", label: "🇵🇰 Pakistani food" },
    { value: "indian restaurants", label: "🇮🇳 Indian food" },
    { value: "medical clinics", label: "🏥 Medical clinics" },
    { value: "real estate agencies", label: "🏠 Real estate agencies" },
    { value: "property dealers", label: "🏘️ Property dealers" },
    { value: "real estate developers", label: "🏗️ Real estate developers" },
    { value: "construction companies", label: "🔨 Construction" },
    { value: "beauty salons for women", label: "💅 Ladies beauty salons" },
    { value: "nail salons", label: "💅 Nail salons" },
    { value: "spa and wellness centers", label: "🧖 Spa & wellness" },
    { value: "bridal makeup studios", label: "👰 Bridal studios" },
    { value: "skincare and facial clinics", label: "✨ Skincare clinics" },
    { value: "yoga and pilates studios", label: "🧘 Yoga/Pilates" },
    { value: "florists and flower shops", label: "💐 Florists" },
    { value: "photography studios", label: "📷 Photography" },
    { value: "car wash and detailing", label: "🚗 Car wash" },
    { value: "accounting and tax firms", label: "📊 Accounting firms" },
  ];

  const tabs = [
    { key: "search", label: "🔍 Find leads" },
    { key: "pipeline", label: `📋 Pipeline (${leads.length})` },
    { key: "history", label: "📊 History" },
    { key: "settings", label: "⚙️ Settings" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 740, margin: "0 auto", padding: "40px 20px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg, #C8782A, #E8A54B)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>LH</div>
          <span style={{ fontSize: 19, fontWeight: 700 }}>Lead Hunter</span>
          <span style={{ fontSize: 9, fontWeight: 600, background: "#EEF2FF", color: "#4338CA", padding: "2px 7px", borderRadius: 5 }}>PRO</span>
        </div>
        <p style={{ fontSize: 12, color: "#9a8b7a", marginTop: 3 }}>Find businesses without websites • Generate emails • Track your pipeline</p>
      </div>

      {/* Stats */}
      {leads.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 16 }}>
          {[
            { label: "Total", val: stats.total, color: "#1a110a" },
            { label: "New", val: stats.new, color: "#4338CA" },
            { label: "In progress", val: stats.contacted, color: "#C2410C" },
            { label: "Replied", val: stats.replied, color: "#15803D" },
            { label: "Converted", val: stats.converted, color: "#047857" },
            { label: "Closed", val: stats.closed, color: "#6B7280" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #F0EBE4", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "#9a8b7a", marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid #E8E4DE", overflowX: "auto" }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: "9px 16px", fontSize: 12, fontWeight: tab === t.key ? 600 : 400, color: tab === t.key ? "#C8782A" : "#9a8b7a", background: "transparent", border: "none", borderBottom: tab === t.key ? "2px solid #C8782A" : "2px solid transparent", cursor: "pointer", marginBottom: -1, whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* SEARCH TAB */}
      {tab === "search" && (
        <div style={{ background: "#fff", border: "1px solid #E8E4DE", borderRadius: 14, padding: "22px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Search for businesses without websites</div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#7a6b5a", display: "block", marginBottom: 5 }}>Search source</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setSearchSource("osm")}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "6px 12px", borderRadius: 7, border: "1px solid #E8E4DE", background: searchSource === "osm" ? "#C8782A" : "#FAFAF7", color: searchSource === "osm" ? "#fff" : "#7a6b5a", cursor: "pointer", fontWeight: searchSource === "osm" ? 600 : 400 }}>
                🗺️ OpenStreetMap
                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: searchSource === "osm" ? "rgba(255,255,255,0.25)" : "#ECFDF5", color: searchSource === "osm" ? "#fff" : "#047857" }}>
                  Free — no cost
                </span>
              </button>
              <button onClick={() => setSearchSource("claude")}
                style={{ fontSize: 11, padding: "6px 12px", borderRadius: 7, border: "1px solid #E8E4DE", background: searchSource === "claude" ? "#C8782A" : "#FAFAF7", color: searchSource === "claude" ? "#fff" : "#7a6b5a", cursor: "pointer", fontWeight: searchSource === "claude" ? 600 : 400 }}>
                🤖 AI Search (Claude, uses credits)
              </button>
            </div>
            {searchSource === "osm" && (
              <div style={{ fontSize: 10, color: "#9a8b7a", marginTop: 5 }}>
                Best coverage in Europe, North America, and the UK. Weaker in Pakistan and other regions with limited OSM mapping — switch to AI Search if results are sparse.
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#7a6b5a", display: "block", marginBottom: 5 }}>City / Area</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Montreal, Canada"
              style={{ width: "100%", fontSize: 13, padding: "9px 12px", borderRadius: 8, border: "1px solid #E8E4DE", boxSizing: "border-box" }} />
            {cityGroups.map((g) => (
              <div key={g.label} style={{ marginTop: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#7a6b5a", marginBottom: 4 }}>{g.label}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {g.cities.map((c) => (
                    <button key={c} onClick={() => setCity(c)}
                      style={{ fontSize: 10, padding: "3px 9px", borderRadius: 5, border: "1px solid #E8E4DE", background: city === c ? "#FFF5EB" : "#FAFAF7", color: city === c ? "#C8782A" : "#7a6b5a", cursor: "pointer", fontWeight: city === c ? 600 : 400 }}>
                      {c.split(",")[0]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#7a6b5a", display: "block", marginBottom: 5 }}>Business type</label>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {businessTypes.map((bt) => (
                <button key={bt.value} onClick={() => setBusinessType(bt.value)}
                  style={{ fontSize: 11, padding: "6px 12px", borderRadius: 7, border: "1px solid #E8E4DE", background: businessType === bt.value ? "#C8782A" : "#FAFAF7", color: businessType === bt.value ? "#fff" : "#7a6b5a", cursor: "pointer", fontWeight: businessType === bt.value ? 600 : 400 }}>
                  {bt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#7a6b5a", display: "block", marginBottom: 5 }}>How many leads</label>
            <div style={{ display: "flex", gap: 5 }}>
              {["3", "5", "8"].map((n) => (
                <button key={n} onClick={() => setCount(n)}
                  style={{ fontSize: 12, padding: "6px 16px", borderRadius: 7, border: "1px solid #E8E4DE", background: count === n ? "#C8782A" : "#FAFAF7", color: count === n ? "#fff" : "#7a6b5a", cursor: "pointer", fontWeight: count === n ? 600 : 400 }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && (() => {
            const isSuccess = error.includes("Added") || error.includes("Found");
            const isInfo = !isSuccess && (error.includes("Limited data") || error.includes("Could not locate") || error.includes("timed out") || error.includes("geocoder"));
            const color = isSuccess ? "#15803D" : isInfo ? "#B45309" : "#B91C1C";
            const background = isSuccess ? "#F0FDF4" : isInfo ? "#FFFBEB" : "#FEF2F2";
            return (
              <div style={{ fontSize: 12, color, background, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
                {error}
              </div>
            );
          })()}

          <button onClick={handleSearch} disabled={searching}
            style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 600, borderRadius: 10, border: "none", background: searching ? "#E8E4DE" : "linear-gradient(135deg, #C8782A, #D4892F)", color: searching ? "#7a6b5a" : "#fff", cursor: searching ? "wait" : "pointer" }}>
            {searching
              ? (searchSource === "osm" ? "🗺️ Querying OpenStreetMap... (10-25 seconds)" : "🔍 Hunting leads... (15-30 seconds)")
              : `Find ${count} ${businessType} without websites (${searchSource === "osm" ? "free" : "AI"})`}
          </button>

          <div style={{ marginTop: 14, padding: "12px 14px", background: "#FAFAF7", borderRadius: 8, fontSize: 11, color: "#7a6b5a", lineHeight: 1.6 }}>
            <strong>How it works:</strong> {searchSource === "osm"
              ? "OpenStreetMap search is completely free — no API credits used. It geocodes the city, then queries the Overpass API for matching businesses within 15km and keeps only the ones with no website listed."
              : "AI search uses Claude with web search to find real businesses without websites — it checks Google Maps, Yelp, and directories, which costs API credits per search."} Duplicates are automatically skipped — you&apos;ll never get the same lead twice. All leads are saved permanently in your pipeline.
          </div>
        </div>
      )}

      {/* PIPELINE TAB */}
      {tab === "pipeline" && (
        <div>
          {leads.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#9a8b7a" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No leads yet</div>
              <div style={{ fontSize: 12 }}>Go to &quot;Find leads&quot; to start hunting</div>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ fontSize: 11, padding: "6px 10px", borderRadius: 7, border: "1px solid #E8E4DE", background: "#fff" }}>
                  <option value="all">All statuses</option>
                  {Object.entries(STATUSES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label} ({leads.filter((l) => l.status === k).length})</option>
                  ))}
                </select>
                <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}
                  style={{ fontSize: 11, padding: "6px 10px", borderRadius: 7, border: "1px solid #E8E4DE", background: "#fff" }}>
                  <option value="all">All cities</option>
                  {allCities.map((c) => <option key={c} value={c}>{c} ({leads.filter((l) => l.city === c).length})</option>)}
                </select>
                <span style={{ fontSize: 11, color: "#9a8b7a", marginLeft: "auto" }}>
                  Showing {filteredLeads.length} of {leads.length}
                </span>
              </div>

              {/* Quick filter buttons */}
              <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
                {["all", "new", "contacted", "mockup_sent", "follow_up", "replied", "converted"].map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    style={{ fontSize: 10, padding: "4px 10px", borderRadius: 5, border: "1px solid #E8E4DE", background: filterStatus === s ? "#C8782A" : "#fff", color: filterStatus === s ? "#fff" : "#7a6b5a", cursor: "pointer", fontWeight: filterStatus === s ? 600 : 400 }}>
                    {s === "all" ? `All (${leads.length})` : `${STATUSES[s]?.label || s} (${leads.filter((l) => l.status === s).length})`}
                  </button>
                ))}
              </div>

              {filteredLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onUpdate={handleUpdate} onDelete={handleDelete}
                  onGenerateEmail={handleGenerateEmail} generatingEmail={generatingId === lead.id} />
              ))}
            </>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Search history</div>
          {searchHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#9a8b7a", fontSize: 12 }}>No searches yet</div>
          ) : (
            searchHistory.map((h, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #E8E4DE", borderRadius: 10, padding: "12px 16px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{h.type} in {h.city}</div>
                  <div style={{ fontSize: 11, color: "#9a8b7a" }}>{new Date(h.date).toLocaleDateString()} · Found {h.count} · Added {h.added} · Skipped {h.skipped} duplicates</div>
                </div>
                <button onClick={() => { setCity(h.city); setBusinessType(h.type); setTab("search"); }}
                  style={{ fontSize: 10, padding: "4px 10px", borderRadius: 5, border: "1px solid #E8E4DE", background: "#FAFAF7", color: "#7a6b5a", cursor: "pointer" }}>
                  Search again
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === "settings" && (
        <div style={{ background: "#fff", border: "1px solid #E8E4DE", borderRadius: 14, padding: "22px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Settings</div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#7a6b5a", display: "block", marginBottom: 5 }}>Your name (used in emails)</label>
            <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)}
              style={{ width: "100%", fontSize: 13, padding: "9px 12px", borderRadius: 8, border: "1px solid #E8E4DE", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginTop: 20, padding: "14px 16px", background: "#FAFAF7", borderRadius: 8, fontSize: 11, color: "#7a6b5a", lineHeight: 1.7 }}>
            <strong>Your daily workflow:</strong><br /><br />
            1. Search 2-3 cities with different business types<br />
            2. Open Pipeline → filter &quot;New&quot; leads<br />
            3. Verify each lead on Google Maps<br />
            4. Generate email → send with mockup attached<br />
            5. Change status to &quot;Contacted&quot; or &quot;Mockup sent&quot;<br />
            6. Add notes (e.g. &quot;owner said call back Friday&quot;)<br />
            7. Filter &quot;Follow up&quot; every 3-4 days<br />
            8. Repeat daily — 15-20 leads per day
          </div>

          <div style={{ marginTop: 12, padding: "14px 16px", background: "#FEF2F2", borderRadius: 8, fontSize: 11, color: "#B91C1C", lineHeight: 1.7 }}>
            <strong>⚠️ About the 🗑️ delete button:</strong><br />
            Only delete leads that are completely wrong (fake business, wrong info). For leads that didn&apos;t reply, mark them as &quot;No reply&quot; instead — you can always try again later.
          </div>
        </div>
      )}
    </div>
  );
}
