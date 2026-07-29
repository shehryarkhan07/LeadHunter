"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "leadhunter:leads";
const STATUS_COLORS = {
  new: { bg: "#EEF2FF", text: "#4338CA", label: "New" },
  contacted: { bg: "#FFF7ED", text: "#C2410C", label: "Contacted" },
  replied: { bg: "#F0FDF4", text: "#15803D", label: "Replied" },
  converted: { bg: "#ECFDF5", text: "#047857", label: "Converted" },
  rejected: { bg: "#FEF2F2", text: "#B91C1C", label: "No reply" },
};

async function searchLeads(city, businessType, count) {
  const resp = await fetch("/api/search-leads", {
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
  const s = STATUS_COLORS[status] || STATUS_COLORS.new;
  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 6,
        letterSpacing: 0.3,
      }}
    >
      {s.label}
    </span>
  );
}

function LeadCard({ lead, onStatusChange, onGenerateEmail, generatingEmail }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E8E4DE",
        borderRadius: 14,
        padding: "20px 22px",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: "#1a110a" }}>
              {lead.name}
            </span>
            <Badge status={lead.status || "new"} />
          </div>
          <div style={{ fontSize: 13, color: "#7a6b5a", marginBottom: 4 }}>
            {lead.address}
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              fontSize: 12,
              color: "#9a8b7a",
              marginBottom: 8,
            }}
          >
            {lead.phone && <span>Phone: {lead.phone}</span>}
            {lead.rating && <span>Rating: {lead.rating} stars</span>}
            {lead.reviews && <span>{lead.reviews} reviews</span>}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#C8782A",
              fontWeight: 500,
              background: "#FFF8F0",
              display: "inline-block",
              padding: "3px 10px",
              borderRadius: 6,
              marginBottom: 6,
            }}
          >
            {lead.reason}
          </div>
          {lead.detail && (
            <div style={{ fontSize: 12, color: "#9a8b7a", marginTop: 4 }}>
              {lead.detail}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 12 }}>
          <select
            value={lead.status || "new"}
            onChange={(e) => onStatusChange(lead.id, e.target.value)}
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #E8E4DE",
              background: "#FAFAF7",
              color: "#4a3f34",
              cursor: "pointer",
            }}
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="replied">Replied</option>
            <option value="converted">Converted</option>
            <option value="rejected">No reply</option>
          </select>
          <button
            onClick={() => {
              onGenerateEmail(lead);
              setExpanded(true);
            }}
            disabled={generatingEmail}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: "#C8782A",
              color: "#fff",
              cursor: generatingEmail ? "wait" : "pointer",
              opacity: generatingEmail ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {generatingEmail ? "Writing..." : "Generate email"}
          </button>
        </div>
      </div>
      {lead.email && (
        <div
          style={{
            marginTop: 14,
            padding: "16px 18px",
            background: "#FAFAF7",
            borderRadius: 10,
            border: "1px solid #F0EBE4",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#7a6b5a",
              marginBottom: 4,
            }}
          >
            Subject: {lead.email.subject}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#4a3f34",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {lead.email.body}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `Subject: ${lead.email.subject}\n\n${lead.email.body}`
              );
            }}
            style={{
              marginTop: 10,
              fontSize: 11,
              fontWeight: 600,
              padding: "5px 12px",
              borderRadius: 6,
              border: "1px solid #E8E4DE",
              background: "#fff",
              color: "#7a6b5a",
              cursor: "pointer",
            }}
          >
            Copy email
          </button>
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
  const [senderName, setSenderName] = useState("Shehryar Khan");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLeads(JSON.parse(raw));
    } catch {}
  }, []);

  const saveLeads = useCallback(async (updated) => {
    setLeads(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }, []);

  const handleSearch = async () => {
    if (!city.trim()) return setError("Enter a city name");
    setError("");
    setSearching(true);
    try {
      const results = await searchLeads(city, businessType, parseInt(count));
      if (!results.length) {
        setError("No leads found. Try a different city or business type.");
        setSearching(false);
        return;
      }
      const newLeads = results.map((r, i) => ({
        ...r,
        id: Date.now() + "-" + i,
        status: "new",
        city: city,
        addedAt: new Date().toISOString(),
      }));
      await saveLeads([...newLeads, ...leads]);
      setTab("leads");
    } catch (e) {
      setError("Search failed — try again. " + (e.message || ""));
    }
    setSearching(false);
  };

  const handleStatusChange = async (id, status) => {
    const updated = leads.map((l) => (l.id === id ? { ...l, status } : l));
    await saveLeads(updated);
  };

  const handleGenerateEmail = async (lead) => {
    setGeneratingId(lead.id);
    try {
      const email = await generateEmail(lead, senderName);
      const updated = leads.map((l) =>
        l.id === lead.id ? { ...l, email } : l
      );
      await saveLeads(updated);
    } catch {}
    setGeneratingId(null);
  };

  const handleClearAll = async () => {
    await saveLeads([]);
  };

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    replied: leads.filter((l) => l.status === "replied").length,
    converted: leads.filter((l) => l.status === "converted").length,
  };

  const cityGroups = [
    {
      label: "Pakistan",
      cities: [
        "Islamabad, Pakistan",
        "Lahore, Pakistan",
        "Karachi, Pakistan",
        "Peshawar, Pakistan",
        "Rawalpindi, Pakistan",
        "Faisalabad, Pakistan",
        "Multan, Pakistan",
        "Swat, Pakistan",
        "Quetta, Pakistan",
      ],
    },
    {
      label: "Canada",
      cities: [
        "Montreal, Canada",
        "Toronto, Canada",
        "Vancouver, Canada",
        "Calgary, Canada",
        "Ottawa, Canada",
      ],
    },
    {
      label: "Other",
      cities: [
        "New York, USA",
        "London, UK",
        "Dubai, UAE",
        "Riyadh, Saudi Arabia",
        "Doha, Qatar",
      ],
    },
  ];

  const businessTypes = [
    { value: "restaurants", label: "Restaurants" },
    { value: "cafes and coffee shops", label: "Cafes" },
    { value: "barber shops and salons", label: "Barbers / Salons" },
    { value: "gyms and fitness studios", label: "Gyms" },
    { value: "dental clinics", label: "Dental clinics" },
    { value: "auto repair shops", label: "Auto repair" },
    { value: "bakeries", label: "Bakeries" },
    { value: "laundry and dry cleaning", label: "Laundry" },
    { value: "tutoring and coaching", label: "Tutoring" },
    { value: "pet grooming", label: "Pet grooming" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #C8782A, #E8A54B)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            LH
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#1a110a" }}>
            Lead hunter
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              background: "#FFF5EB",
              color: "#C8782A",
              padding: "2px 8px",
              borderRadius: 6,
              letterSpacing: 0.5,
            }}
          >
            AI-POWERED
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#7a6b5a", marginTop: 4 }}>
          Find businesses without websites and generate personalized outreach emails
        </p>
      </div>

      {/* Stats bar */}
      {leads.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {[
            { label: "Total leads", val: stats.total, color: "#1a110a" },
            { label: "New", val: stats.new, color: "#4338CA" },
            { label: "Contacted", val: stats.contacted, color: "#C2410C" },
            { label: "Replied", val: stats.replied, color: "#15803D" },
            { label: "Converted", val: stats.converted, color: "#047857" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#FAFAF7",
                borderRadius: 12,
                padding: "12px 14px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>
                {s.val}
              </div>
              <div style={{ fontSize: 11, color: "#9a8b7a", marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 20,
          borderBottom: "1px solid #E8E4DE",
        }}
      >
        {[
          { key: "search", label: "Find leads" },
          { key: "leads", label: `My leads (${leads.length})` },
          { key: "settings", label: "Settings" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? "#C8782A" : "#7a6b5a",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.key ? "2px solid #C8782A" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SEARCH TAB */}
      {tab === "search" && (
        <div>
          <div
            style={{
              background: "#FFFDFA",
              border: "0.5px solid #E8E4DE",
              borderRadius: 14,
              padding: "24px 26px",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "#1a110a", marginBottom: 16 }}>
              Search for businesses without websites
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#7a6b5a", display: "block", marginBottom: 6 }}>
                City / Area
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Montreal, Canada"
                style={{ width: "100%", fontSize: 14, padding: "10px 14px", boxSizing: "border-box", borderRadius: 8, border: "1px solid #E8E4DE" }}
              />
              {cityGroups.map((group) => (
                <div key={group.label} style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#9a8b7a", letterSpacing: 1, textTransform: "uppercase", marginRight: 8 }}>
                    {group.label}
                  </span>
                  <div style={{ display: "inline-flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
                    {group.cities.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCity(c)}
                        style={{
                          fontSize: 11,
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "0.5px solid #E8E4DE",
                          background: city === c ? "#FFF5EB" : "#FAFAF7",
                          color: city === c ? "#C8782A" : "#7a6b5a",
                          cursor: "pointer",
                          fontWeight: city === c ? 600 : 400,
                        }}
                      >
                        {c.split(",")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#7a6b5a", display: "block", marginBottom: 6 }}>
                Business type
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {businessTypes.map((bt) => (
                  <button
                    key={bt.value}
                    onClick={() => setBusinessType(bt.value)}
                    style={{
                      fontSize: 12,
                      padding: "7px 14px",
                      borderRadius: 8,
                      border: "0.5px solid #E8E4DE",
                      background: businessType === bt.value ? "#C8782A" : "#FAFAF7",
                      color: businessType === bt.value ? "#fff" : "#7a6b5a",
                      cursor: "pointer",
                      fontWeight: businessType === bt.value ? 600 : 400,
                    }}
                  >
                    {bt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#7a6b5a", display: "block", marginBottom: 6 }}>
                Number of leads to find
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {["3", "5", "8", "10"].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    style={{
                      fontSize: 13,
                      padding: "7px 18px",
                      borderRadius: 8,
                      border: "0.5px solid #E8E4DE",
                      background: count === n ? "#C8782A" : "#FAFAF7",
                      color: count === n ? "#fff" : "#7a6b5a",
                      cursor: "pointer",
                      fontWeight: count === n ? 600 : 400,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div
                style={{
                  fontSize: 13,
                  color: "#B91C1C",
                  background: "#FEF2F2",
                  padding: "8px 14px",
                  borderRadius: 8,
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={searching}
              style={{
                width: "100%",
                padding: "14px",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                border: "none",
                background: searching
                  ? "#FAFAF7"
                  : "linear-gradient(135deg, #C8782A, #D4892F)",
                color: searching ? "#7a6b5a" : "#fff",
                cursor: searching ? "wait" : "pointer",
              }}
            >
              {searching
                ? "Hunting for leads... (this takes 15-30 seconds)"
                : `Find ${count} ${businessType} without websites`}
            </button>
          </div>

          <div
            style={{
              marginTop: 20,
              padding: "18px 22px",
              background: "#FAFAF7",
              borderRadius: 12,
              fontSize: 12,
              color: "#7a6b5a",
              lineHeight: 1.7,
            }}
          >
            <span style={{ fontWeight: 600, color: "#1a110a" }}>How it works: </span>
            The AI searches the web for real {businessType} in your chosen city that don't have a dedicated website.
            It checks Google Maps, Yelp, and business directories to find leads with good ratings but no online presence.
            Then you can generate a personalized cold email for each lead with one click.
          </div>
        </div>
      )}

      {/* LEADS TAB */}
      {tab === "leads" && (
        <div>
          {leads.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 20px",
                color: "#9a8b7a",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>&#128269;</div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6, color: "#7a6b5a" }}>
                No leads yet
              </div>
              <div style={{ fontSize: 13 }}>
                Go to &quot;Find leads&quot; to search for businesses without websites
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 13, color: "#7a6b5a" }}>
                  {leads.length} leads found
                </span>
                <button
                  onClick={handleClearAll}
                  style={{
                    fontSize: 11,
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: "0.5px solid #E8E4DE",
                    background: "#FAFAF7",
                    color: "#9a8b7a",
                    cursor: "pointer",
                  }}
                >
                  Clear all
                </button>
              </div>
              {leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onStatusChange={handleStatusChange}
                  onGenerateEmail={handleGenerateEmail}
                  generatingEmail={generatingId === lead.id}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === "settings" && (
        <div
          style={{
            background: "#FFFDFA",
            border: "0.5px solid #E8E4DE",
            borderRadius: 14,
            padding: "24px 26px",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a110a", marginBottom: 16 }}>
            Email settings
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#7a6b5a", display: "block", marginBottom: 6 }}>
              Your name (used in generated emails)
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              style={{ width: "100%", fontSize: 14, padding: "10px 14px", boxSizing: "border-box", borderRadius: 8, border: "1px solid #E8E4DE" }}
            />
          </div>
          <div style={{ fontSize: 12, color: "#9a8b7a", lineHeight: 1.6, marginTop: 16, padding: "14px 16px", background: "#FAFAF7", borderRadius: 8 }}>
            <span style={{ fontWeight: 600, color: "#7a6b5a" }}>Tips for better results:</span>
            <br />
            <br />
            1. Search different cities to build a bigger pipeline
            <br />
            2. Try different business types — salons and clinics convert well
            <br />
            3. Generate the email, then create a mockup for each lead before sending
            <br />
            4. Follow up 3-4 days after the first email
            <br />
            5. Track your status — move leads through the pipeline as you go
          </div>
        </div>
      )}
    </div>
  );
}
