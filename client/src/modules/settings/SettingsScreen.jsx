import { useState, useEffect, useRef } from "react";
import MigrationTool from "./MigrationTool";
import DiagnosticsScreen from "./DiagnosticsScreen";
import LicenseManager from "./LicenseManager";
import CoordinateCalibrator from "./CoordinateCalibrator";
import MaskedSecretReveal from "../../components/MaskedSecretReveal";
import { useAuth } from "../../hooks/useAuth";
import PlanGate from "../../components/PlanGate";
import { usePlan } from "../../hooks/usePlan";

const TABS = [
  { id: "company", label: "🏢 Company" },
  { id: "branding", label: "🎨 Branding" },
  { id: "ticket", label: "🎫 Ticket" },
  { id: "charges", label: "💰 Charges" },
  { id: "email", label: "📧 Email" },
  { id: "hardware", label: "🔌 Hardware" },
  { id: "system", label: "⚙️ System" },
  { id: "developer", label: "👨‍💻 Developer" },
  { id: "printing", label: "🖨️ Printing" },
  { id: "migration", label: "📥 Import Data" },
  { id: "diagnostics", label: "🔧 Diagnostics" },
  { id: "licensemanager", label: "🔑 Licenses" },
];

const S = {
  card: {
    background: "white",
    borderRadius: 10,
    padding: "20px 24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#aaa",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  label: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    display: "block",
    fontWeight: 500,
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 6,
    border: "1.5px solid #e0e0e0",
    fontSize: 14,
    outline: "none",
    background: "white",
    transition: "border 0.2s",
  },
  inputFocus: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 6,
    border: "1.5px solid #e94560",
    fontSize: 14,
    outline: "none",
    background: "#fff9f9",
  },
  select: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 6,
    border: "1.5px solid #e0e0e0",
    fontSize: 14,
    outline: "none",
    background: "white",
    cursor: "pointer",
  },
  btnSave: {
    background: "#e94560",
    color: "white",
    border: "none",
    padding: "10px 28px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnSecondary: {
    background: "#f0f0f0",
    color: "#333",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #f5f5f5",
    fontSize: 13,
  },
};

export default function SettingsScreen() {
  const [tab, setTab] = useState("company");

  const [settings, setSettings] = useState({});
  const [appInfo, setAppInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [local, setLocal] = useState({});
  const logoRef = useRef(null);
  const [printers, setPrinters] = useState([]);
  const [showLicenseInput, setShowLicenseInput] = useState(false);
  const [newLicenseKey, setNewLicenseKey] = useState("");

  const { user } = useAuth();
  const { can } = usePlan();
  const visibleTabs = TABS.filter((t) => {
    if (t.id === "licensemanager") return user?.role === "superadmin";
    if (t.id === "migration")
      return user?.role === "superadmin" || user?.role === "admin";
    return true;
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [s, info, printerList] = await Promise.all([
      window.db.settings.getAll(),
      window.db.app.info(),
      window.db.printer.getAll(),
    ]);
    setSettings(s);
    setLocal(s);
    setAppInfo(info);
    setPrinters(printerList);
    setLoading(false);
  };

  const setField = (key, val) => {
    setLocal((f) => ({ ...f, [key]: val }));
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const keys = Object.keys(local);
      for (const key of keys) {
        if (key === "company_logo") continue;
        if (local[key] !== settings[key]) {
          await window.db.settings.update(key, local[key]);
        }
      }
      setSettings(local);
      showToast("Settings saved successfully!");
      await loadAll(); // ← ADD THIS LINE
    } catch (e) {
      showToast("Failed to save: " + e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000)
      return showToast("Logo too large. Max 500KB.", "error");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setField("company_logo", base64);
      await window.db.settings.saveLogo(base64);
      showToast("Logo uploaded!");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setField("company_logo", "");
    await window.db.settings.saveLogo("");
    showToast("Logo removed");
  };

  if (loading)
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>
        Loading settings...
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            background: toast.type === "success" ? "#00d4aa" : "#e94560",
            color: "white",
            padding: "10px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
              border: "1.5px solid",
              fontWeight: tab === t.id ? 700 : 400,
              background: tab === t.id ? "#1a1a2e" : "white",
              borderColor: tab === t.id ? "#1a1a2e" : "#e0e0e0",
              color: tab === t.id ? "white" : "#333",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* ── Company Info ── */}
      {tab === "company" && (
        <>
          <div style={S.card}>
            <div style={S.cardTitle}>Company Information</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={S.label}>Company Name *</label>
                <input
                  style={S.input}
                  value={local.company_name || ""}
                  onChange={(e) => setField("company_name", e.target.value)}
                  placeholder="e.g. Shree Bhagwati Weigh Bridge"
                />
              </div>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>City</label>
                  <input
                    style={S.input}
                    value={local.company_city || ""}
                    onChange={(e) => setField("company_city", e.target.value)}
                    placeholder="e.g. Anand"
                  />
                </div>
                <div>
                  <label style={S.label}>Contact Number</label>
                  <input
                    style={S.input}
                    value={local.company_contact || ""}
                    onChange={(e) =>
                      setField("company_contact", e.target.value)
                    }
                    placeholder="e.g. 9879542668"
                  />
                </div>
              </div>
              <div>
                <label style={S.label}>Full Address</label>
                <textarea
                  rows={3}
                  style={{ ...S.input, resize: "vertical" }}
                  value={local.company_address || ""}
                  onChange={(e) => setField("company_address", e.target.value)}
                  placeholder="e.g. Nadiyad Dakor Road, Pansora, Dist. Anand"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={S.card}>
            <div style={S.cardTitle}>Ticket Header Preview</div>
            <div
              style={{
                border: "1px dashed #e0e0e0",
                borderRadius: 8,
                padding: 16,
                textAlign: "center",
                background: "#fafafa",
              }}
            >
              {local.company_logo && (
                <img
                  src={local.company_logo}
                  alt="logo"
                  style={{ height: 50, marginBottom: 8, objectFit: "contain" }}
                />
              )}
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>
                {local.company_name || "Your Company Name"}
              </div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                {local.company_address || "Your Address"}
              </div>
              <div style={{ fontSize: 13, color: "#666" }}>
                {local.company_city}{" "}
                {local.company_contact ? `| ${local.company_contact}` : ""}
              </div>
            </div>
          </div>
        </>
      )}
      {/* ── Branding ── */}
      {tab === "branding" && (
        <>
          <div style={S.card}>
            <div style={S.cardTitle}>Logo</div>
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              {/* Logo preview */}
              <div
                style={{
                  width: 120,
                  height: 120,
                  border: "2px dashed #e0e0e0",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fafafa",
                  flexShrink: 0,
                }}
              >
                {local.company_logo ? (
                  <img
                    src={local.company_logo}
                    alt="logo"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      borderRadius: 6,
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 32 }}>🖼️</span>
                )}
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <p style={{ fontSize: 13, color: "#666" }}>
                  Upload your company logo. It will appear on all printed
                  tickets.
                </p>
                <p style={{ fontSize: 12, color: "#aaa" }}>
                  Recommended: PNG with transparent background. Max 500KB.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    ref={logoRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleLogoUpload}
                  />
                  <button
                    style={S.btnSave}
                    onClick={() => logoRef.current.click()}
                  >
                    📁 Upload Logo
                  </button>
                  {local.company_logo && (
                    <button style={S.btnSecondary} onClick={handleRemoveLogo}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardTitle}>Theme</div>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>App Title</label>
                <input
                  style={S.input}
                  value={local.app_title || ""}
                  onChange={(e) => setField("app_title", e.target.value)}
                  placeholder="Weighbridge Management System"
                />
              </div>
              <div>
                <label style={S.label}>Primary Color</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="color"
                    value={local.app_theme_color || "#e94560"}
                    onChange={(e) =>
                      setField("app_theme_color", e.target.value)
                    }
                    style={{
                      width: 50,
                      height: 40,
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      padding: 2,
                    }}
                  />
                  <input
                    style={{ ...S.input, width: 120 }}
                    value={local.app_theme_color || ""}
                    onChange={(e) =>
                      setField("app_theme_color", e.target.value)
                    }
                    placeholder="#e94560"
                  />
                  {/* Preset colors */}
                  {[
                    "#e94560",
                    "#2196f3",
                    "#00d4aa",
                    "#ff9800",
                    "#9c27b0",
                    "#1a1a2e",
                  ].map((c) => (
                    <div
                      key={c}
                      onClick={() => setField("app_theme_color", c)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: c,
                        cursor: "pointer",
                        border:
                          local.app_theme_color === c
                            ? "3px solid #333"
                            : "2px solid transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {/* ── Ticket Settings ── */}
      {tab === "ticket" && (
        <>
          <div style={S.card}>
            <div style={S.cardTitle}>Ticket Configuration</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>Paper Size</label>
                  <select
                    style={S.select}
                    value={local.paper_size || "80mm"}
                    onChange={(e) => setField("paper_size", e.target.value)}
                  >
                    <option value="80mm">
                      80mm (Standard thermal/dot matrix)
                    </option>
                    <option value="58mm">58mm (Small thermal)</option>
                    <option value="A4">A4 (Full page)</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Number of Copies</label>
                  <select
                    style={S.select}
                    value={local.ticket_copies || "3"}
                    onChange={(e) => setField("ticket_copies", e.target.value)}
                  >
                    <option value="1">1 copy</option>
                    <option value="2">2 copies (Original + Duplicate)</option>
                    <option value="3">
                      3 copies (Original + Duplicate + Triplicate)
                    </option>
                  </select>
                </div>
              </div>
              <div>
                <label style={S.label}>Ticket Footer Message</label>
                <textarea
                  rows={2}
                  style={{ ...S.input, resize: "vertical" }}
                  value={local.ticket_footer || ""}
                  onChange={(e) => setField("ticket_footer", e.target.value)}
                  placeholder="e.g. Please check weight. No responsibility accepted once carrier leaves."
                />
              </div>
            </div>
          </div>

          {/* Ticket preview */}
          <div style={S.card}>
            <div style={S.cardTitle}>Ticket Preview</div>
            <div
              style={{
                border: "1px dashed #e0e0e0",
                borderRadius: 8,
                padding: 16,
                maxWidth: 300,
                margin: "0 auto",
                fontFamily: "monospace",
                fontSize: 12,
              }}
            >
              <div
                style={{ textAlign: "center", fontWeight: 700, fontSize: 14 }}
              >
                {local.company_name || "Company Name"}
              </div>
              <div style={{ textAlign: "center", fontSize: 11, color: "#666" }}>
                {local.company_address || "Address"}
              </div>
              <hr
                style={{
                  margin: "8px 0",
                  border: "none",
                  borderTop: "1px dashed #ccc",
                }}
              />
              <div>
                Ticket No: <strong>1001</strong>
              </div>
              <div>Date: 09-06-2026 | Time: 14:53</div>
              <div>Vehicle: GJ01XX1234</div>
              <div>Material: Sand</div>
              <hr
                style={{
                  margin: "8px 0",
                  border: "none",
                  borderTop: "1px dashed #ccc",
                }}
              />
              <div>Gross: 31,650 kg</div>
              <div>Tare: 8,200 kg</div>
              <div>
                <strong>Net: 23,450 kg</strong>
              </div>
              <div>Charges: ₹7,035</div>
              <hr
                style={{
                  margin: "8px 0",
                  border: "none",
                  borderTop: "1px dashed #ccc",
                }}
              />
              <div style={{ fontSize: 10, color: "#888", textAlign: "center" }}>
                {local.ticket_footer || "Footer message here"}
              </div>
            </div>
          </div>
        </>
      )}
      {/* ── Email Settings ── */}
      {tab === "email" && (
        <PlanGate feature="eod_email">
          <div style={S.card}>
            <div style={S.cardTitle}>EOD Email Configuration</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  background: "#f0fdf9",
                  border: "1px solid #00d4aa",
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontSize: 13,
                  color: "#00a37a",
                }}
              >
                ℹ️ End of Day report is automatically emailed to the owner every
                evening. The report includes all tickets, total weight, and
                total charges for the day.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="checkbox"
                  checked={local.eod_enabled === "true"}
                  onChange={(e) =>
                    setField("eod_enabled", e.target.checked ? "true" : "false")
                  }
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <label
                  style={{ fontSize: 14, cursor: "pointer", fontWeight: 500 }}
                >
                  Enable EOD Email Report
                </label>
              </div>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>Owner Email Address</label>
                  <input
                    style={S.input}
                    type="email"
                    value={local.eod_email || ""}
                    onChange={(e) => setField("eod_email", e.target.value)}
                    placeholder="owner@gmail.com"
                    disabled={local.eod_enabled !== "true"}
                  />
                </div>
                <div>
                  <label style={S.label}>Send Time</label>
                  <input
                    style={S.input}
                    type="time"
                    value={local.eod_time || "20:00"}
                    onChange={(e) => setField("eod_time", e.target.value)}
                    disabled={local.eod_enabled !== "true"}
                  />
                </div>
              </div>
              <div
                style={{
                  background: "#fff8f0",
                  border: "1px solid #ff9800",
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontSize: 13,
                  color: "#cc7a00",
                }}
              >
                ⚠️ EOD email will be configured with your Gmail in Phase 13.
                Save your owner email address here now.
              </div>
            </div>
          </div>
        </PlanGate>
      )}
      {/* ── Hardware Settings ── */}
      {tab === "hardware" && (
        <div style={S.card}>
          <div style={S.cardTitle}>Hardware Configuration</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                background: "#fff8f0",
                border: "1px solid #ff9800",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: 13,
                color: "#cc7a00",
              }}
            >
              ⚠️ Configure after getting hardware specs from client. Required:
              Printer name, COM port, baud rate.
            </div>

            <div style={S.grid2}>
              <div>
                <label style={S.label}>Printer Name</label>
                <input
                  style={S.input}
                  value={local.printer_name || ""}
                  onChange={(e) => setField("printer_name", e.target.value)}
                  placeholder="e.g. TVS MSP 250 Star"
                />
                <p style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                  Find in: Control Panel → Devices & Printers
                </p>
              </div>
              <div>
                <label style={S.label}>COM Port (Weight Indicator)</label>
                <select
                  style={S.select}
                  value={local.com_port || "COM1"}
                  onChange={(e) => setField("com_port", e.target.value)}
                >
                  {[
                    "COM1",
                    "COM2",
                    "COM3",
                    "COM4",
                    "COM5",
                    "COM6",
                    "COM7",
                    "COM8",
                  ].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Baud Rate</label>
                <select
                  style={S.select}
                  value={local.baud_rate || "9600"}
                  onChange={(e) => setField("baud_rate", e.target.value)}
                >
                  {["1200", "2400", "4800", "9600", "19200", "38400"].map(
                    (b) => (
                      <option key={b}>{b}</option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label style={S.label}>Paper Size</label>
                <select
                  style={S.select}
                  value={local.paper_size || "80mm"}
                  onChange={(e) => setField("paper_size", e.target.value)}
                >
                  <option value="80mm">80mm</option>
                  <option value="58mm">58mm</option>
                  <option value="A4">A4</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── System Info ── */}
      {tab === "system" && (
        <div style={S.card}>
          <div style={S.cardTitle}>System Information</div>
          <div>
            {[
              ["App Version", appInfo.version || "1.0.0"],
              ["Next Ticket No.", settings.ticket_next_no || "1"],
            ].map(([label, value]) => (
              <div key={label} style={S.infoRow}>
                <span style={{ color: "#666", fontWeight: 500 }}>{label}</span>
                <span
                  style={{
                    color: "#333",
                    fontFamily: "monospace",
                    fontSize: 12,
                    maxWidth: "60%",
                    wordBreak: "break-all",
                    textAlign: "right",
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <div style={S.cardTitle}>Danger Zone</div>
            <div
              style={{
                border: "1px solid #fcc",
                borderRadius: 8,
                padding: "16px",
                background: "#fff5f5",
              }}
            >
              <p style={{ fontSize: 13, color: "#cc2244", marginBottom: 12 }}>
                ⚠️ Resetting ticket number will cause duplicate ticket numbers.
                Only do this on a fresh installation.
              </p>
              <button
                onClick={async () => {
                  if (
                    window.confirm(
                      "Reset ticket number to 1? This cannot be undone!",
                    )
                  ) {
                    await window.db.settings.update("ticket_next_no", "1");
                    showToast("Ticket number reset to 1");
                    loadAll();
                  }
                }}
                style={{
                  background: "white",
                  color: "#e94560",
                  border: "1.5px solid #e94560",
                  padding: "8px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Reset Ticket Number
              </button>
            </div>
          </div>
          {/* License */}
          <div style={{ marginTop: 20 }}>
            <div style={S.cardTitle}>License</div>
            <div
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                padding: 16,
                background: "#fafafa",
              }}
            >
              <p style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
                Current plan:{" "}
                <strong>{settings.license_plan || "basic"}</strong>
                {settings.license_client ? ` · ${settings.license_client}` : ""}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "#aaa",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Key: <MaskedSecretReveal value={settings.license_key} />
              </p>

              {/* Toggle input on button click */}
              {!showLicenseInput ? (
                <button
                  onClick={() => setShowLicenseInput(true)}
                  style={{
                    background: "white",
                    color: "#e94560",
                    border: "1.5px solid #e94560",
                    padding: "8px 20px",
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  🔑 Change License Key
                </button>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <input
                    autoFocus
                    value={newLicenseKey}
                    onChange={(e) =>
                      setNewLicenseKey(e.target.value.toUpperCase())
                    }
                    placeholder="e.g. WB-XXXX-XXXX-XXXX"
                    style={{
                      padding: "9px 12px",
                      borderRadius: 6,
                      border: "1.5px solid #e94560",
                      fontSize: 14,
                      outline: "none",
                      fontFamily: "monospace",
                      letterSpacing: 1,
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={async () => {
                        if (!newLicenseKey.trim())
                          return showToast(
                            "Please enter a license key",
                            "error",
                          );
                        const result = await window.db.license.activate(
                          newLicenseKey.trim(),
                        );
                        if (result.valid) {
                          showToast(`Activated! Plan: ${result.plan}`);
                          setTimeout(() => window.location.reload(), 1500);
                        } else {
                          showToast(
                            result.reason || "Activation failed",
                            "error",
                          );
                          setShowLicenseInput(false);
                          setNewLicenseKey("");
                        }
                      }}
                      style={{
                        background: "#e94560",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 20px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      🔑 Activate
                    </button>
                    <button
                      onClick={() => {
                        setShowLicenseInput(false);
                        setNewLicenseKey("");
                      }}
                      style={{
                        background: "#f0f0f0",
                        color: "#333",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 16px",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── Developer Info ── */}
      {tab === "developer" && (
        <div style={S.card}>
          <div style={S.cardTitle}>Developer & Support</div>

          {/* Developer card */}
          <div
            style={{
              background: "linear-gradient(135deg, #1a1a2e, #16213e)",
              borderRadius: 12,
              padding: "24px",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>👨‍💻</div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "white",
                marginBottom: 4,
              }}
            >
              Shabbir Yahya ✅
            </div>
            <div style={{ fontSize: 13, color: "#00d4aa", marginBottom: 16 }}>
              Full Stack Developer
            </div>
            <div
              style={{
                display: "inline-block",
                background: "#e94560",
                color: "white",
                fontSize: 12,
                padding: "4px 14px",
                borderRadius: 99,
                fontWeight: 600,
              }}
            >
              Weighbridge Management System Developer
            </div>
          </div>

          {/* Contact details */}
          {[
            ["📱 WhatsApp / Phone", "+91 9574713452"],
            ["📧 Email", "shabbir@saifenterprise.com"],
            ["🌐 Website", "https://saifenterprise.com"],
            ["🕐 Support Hours", "Mon–Sat, 9 AM – 6 PM"],
            ["⚡ Response Time", "Within 24 hours"],
          ].map(([label, value]) => (
            <div key={label} style={S.infoRow}>
              <span style={{ color: "#666", fontWeight: 500 }}>{label}</span>
              <span style={{ color: "#333", fontWeight: 600 }}>{value}</span>
            </div>
          ))}

          {/* Support note */}
          <div
            style={{
              marginTop: 20,
              background: "#f0fdf9",
              border: "1px solid #00d4aa",
              borderRadius: 8,
              padding: "14px 16px",
              fontSize: 13,
              color: "#00a37a",
            }}
          >
            💡 For faster support, use the built-in
            <strong> Support Ticket system</strong> (coming soon). Include your
            ticket number and screenshot when reporting issues.
          </div>

          {/* App version */}
          <div
            style={{
              marginTop: 12,
              background: "#fafafa",
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              padding: "12px 16px",
              fontSize: 12,
              color: "#aaa",
              textAlign: "center",
            }}
          >
            Weighbridge Management System v1.0.0
            <br />
            Developed by Shabbir — 2026
            <br />
            All rights reserved
          </div>
        </div>
      )}
      {/* ── Charges Configuration ── */}
      {tab === "charges" && (
        <>
          <div style={S.card}>
            <div style={S.cardTitle}>How Do You Charge Customers?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                {
                  value: "per_wheel",
                  label: "🔵 Per Wheel",
                  desc: "Charge based on number of wheels on vehicle",
                },
                {
                  value: "per_ton",
                  label: "⚖️ Per Ton",
                  desc: "Charge based on net weight of material",
                },
                {
                  value: "flat",
                  label: "📋 Flat Rate",
                  desc: "Fixed charge for every ticket",
                },
                {
                  value: "manual",
                  label: "✏️ Manual",
                  desc: "Operator enters amount manually each time",
                },
              ].map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => setField("charges_type", opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 16px",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: `2px solid ${local.charges_type === opt.value ? "#e94560" : "#e0e0e0"}`,
                    background:
                      local.charges_type === opt.value ? "#fff5f7" : "white",
                    transition: "all 0.2s",
                  }}
                >
                  <input
                    type="radio"
                    readOnly
                    checked={local.charges_type === opt.value}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#1a1a2e",
                      }}
                    >
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                      {opt.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {local.charges_type !== "manual" && (
            <div style={S.card}>
              <div style={S.cardTitle}>Rate Configuration</div>
              <div style={S.grid2}>
                <div>
                  <label style={S.label}>
                    {local.charges_type === "per_wheel"
                      ? "Rate per Wheel (₹)"
                      : local.charges_type === "per_ton"
                        ? "Rate per Ton (₹)"
                        : "Flat Rate per Ticket (₹)"}
                  </label>
                  <input
                    style={S.input}
                    type="number"
                    placeholder="Enter rate"
                    value={local.charges_rate || ""}
                    onChange={(e) => setField("charges_rate", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Live preview */}
          <div
            style={{
              background: "#f0fdf9",
              border: "1px solid #00d4aa",
              borderRadius: 10,
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#00a37a",
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Preview
            </div>
            <div style={{ fontSize: 14, color: "#1a1a2e" }}>
              {local.charges_type === "per_wheel" &&
                `Truck with 10 wheels × ₹${local.charges_rate || 0} = ₹${10 * parseFloat(local.charges_rate || 0)}`}
              {local.charges_type === "per_ton" &&
                `23,450 kg ÷ 1000 × ₹${local.charges_rate || 0} = ₹${(23.45 * parseFloat(local.charges_rate || 0)).toFixed(0)}`}
              {local.charges_type === "flat" &&
                `Every ticket = ₹${local.charges_rate || 0} (fixed)`}
              {local.charges_type === "manual" &&
                `Operator enters the amount for each ticket manually`}
            </div>
          </div>
        </>
      )}
      {/* ── Migration Tab ── */}
      {tab === "migration" && (
        <PlanGate feature="migration">
          <MigrationTool />
        </PlanGate>
      )}
      {tab === "diagnostics" && <DiagnosticsScreen />}
      {tab === "licensemanager" && <LicenseManager />}
      {/* Save button — not shown on system tab */}
      {/* ── Printing Tab ── */}
      {tab === "printing" && (
        <>
          {/* Print Mode */}
          <div style={S.card}>
            <div style={S.cardTitle}>Print Mode</div>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
              Choose how tickets are printed. Each client can use a different
              mode.
            </p>
            {[
              {
                value: "full",
                label: "📄 Full Ticket (blank paper)",
                desc: "App prints everything — company name, borders, all fields. Works with plain paper.",
              },
              {
                value: "data_only",
                label: "📋 Data Only (pre-printed paper)",
                desc: "App fills in values only. Your pre-printed paper already has the structure.",
              },
              {
                value: "tractor_2copy",
                label: "🖨️ Tractor 2-Copy (10\"×12\", 4\" cut)",
                desc: "ORIGINAL + DUPLICATE side by side on standard Indian dot matrix paper (254mm wide). Header space left blank for your pre-printed stationery.",
              },
              {
                value: "coordinate_2copy",
                label: "📍 Coordinate 2-Copy (old system style)",
                desc: "Prints values at exact mm positions on pre-printed stationery — same approach as the old VB.NET system, extended for ORIGINAL + DUPLICATE side by side.",
              },
            ].map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: `2px solid ${local.print_mode === opt.value ? "#e94560" : "#e0e0e0"}`,
                  background:
                    local.print_mode === opt.value ? "#fff5f7" : "white",
                  marginBottom: 8,
                }}
              >
                <input
                  type="radio"
                  name="print_mode"
                  value={opt.value}
                  checked={local.print_mode === opt.value}
                  onChange={() => setField("print_mode", opt.value)}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    {opt.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* Coordinate Calibrator — only when coordinate_2copy mode is active */}
          {local.print_mode === "coordinate_2copy" && (
            <div style={S.card}>
              <div style={S.cardTitle}>Coordinate Calibration</div>
              <CoordinateCalibrator
                settings={local}
                onSave={(json) => setField("coordinate_positions", json)}
              />
            </div>
          )}

          {/* Printer Selection */}
          <div style={S.card}>
            <div style={S.cardTitle}>Printer</div>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>Select Printer</label>
                <select
                  style={S.select}
                  value={local.printer_name || ""}
                  onChange={(e) => setField("printer_name", e.target.value)}
                >
                  <option value="">— System Default —</option>
                  {printers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                      {p.isDefault ? " (Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Paper Size</label>
                <select
                  style={S.select}
                  value={local.print_paper || "80mm"}
                  onChange={(e) => setField("print_paper", e.target.value)}
                >
                  <option value="80mm">80mm Continuous</option>
                  <option value="76mm">76mm Continuous</option>
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Number of Copies</label>
                <select
                  style={S.select}
                  value={local.print_copies || "3"}
                  onChange={(e) => setField("print_copies", e.target.value)}
                >
                  <option value="1">1 — Original only</option>
                  <option value="2">2 — Original + Duplicate</option>
                  <option value="3">
                    3 — Original + Duplicate + Triplicate
                  </option>
                </select>
              </div>
              <div>
                <label style={S.label}>Font Size</label>
                <select
                  style={S.select}
                  value={local.print_font_size || "11"}
                  onChange={(e) => setField("print_font_size", e.target.value)}
                >
                  <option value="9">9 — Small</option>
                  <option value="11">11 — Normal</option>
                  <option value="13">13 — Large</option>
                  <option value="15">15 — Extra Large</option>
                </select>
              </div>
            </div>
            <button
              onClick={async () => {
                const list = await window.db.printer.getAll();
                setPrinters(list);
              }}
              style={{
                marginTop: 10,
                background: "#f5f5f5",
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              🔄 Refresh Printer List
            </button>
          </div>

          {/* Fields to Show on Ticket */}
          <div style={S.card}>
            <div style={S.cardTitle}>Fields on Ticket</div>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
              Choose which fields appear on the printed ticket.
            </p>
            <div style={S.grid2}>
              {[
                { key: "print_show_supplier", label: "Supplier" },
                { key: "print_show_receiver", label: "Receiver / Buyer" },
                { key: "print_show_royalty", label: "Royalty Number" },
                { key: "print_show_transporter", label: "Transporter" },
                { key: "print_show_charges", label: "Charges / Amount" },
                { key: "print_show_vehicle_type", label: "Vehicle Type" },
                { key: "print_show_remarks", label: "Remarks" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: local[key] !== "false" ? "#f0fff4" : "#fafafa",
                    border: `1px solid ${local[key] !== "false" ? "#00d4aa" : "#e0e0e0"}`,
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={local[key] !== "false"}
                    onChange={(e) =>
                      setField(key, e.target.checked ? "true" : "false")
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Test Print */}
          <div style={S.card}>
            <div style={S.cardTitle}>Test Print</div>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
              Print a sample ticket with dummy data to verify layout.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={async () => {
                  const dummy = {
                    ticket_no: "TEST-001",
                    vehicle_no: "GJ-01-AB-1234",
                    vehicle_type: "Truck",
                    material_name: "Sand",
                    supplier_name: "Test Supplier",
                    receiver_name: "Test Receiver",
                    gross_weight: 31650,
                    tare_weight: 8200,
                    net_weight: 23450,
                    gross_date: new Date()
                      .toLocaleDateString("en-IN")
                      .replace(/\//g, "-"),
                    gross_time: new Date().toTimeString().slice(0, 5),
                    tare_date: new Date()
                      .toLocaleDateString("en-IN")
                      .replace(/\//g, "-"),
                    tare_time: new Date().toTimeString().slice(0, 5),
                    charges: 100,
                    wheel_count: 10,
                    remarks: "",
                  };
                  const { previewTicket } =
                    await import("../../components/TicketPrint");
                  previewTicket(dummy, local);
                }}
                style={{
                  background: "#1a1a2e",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                👁️ Preview Sample
              </button>

              <button
                onClick={async () => {
                  const dummy = {
                    ticket_no: "TEST-001",
                    vehicle_no: "GJ-01-AB-1234",
                    vehicle_type: "Truck",
                    material_name: "Sand",
                    supplier_name: "Test Supplier",
                    receiver_name: "Test Receiver",
                    gross_weight: 31650,
                    tare_weight: 8200,
                    net_weight: 23450,
                    gross_date: new Date()
                      .toLocaleDateString("en-IN")
                      .replace(/\//g, "-"),
                    gross_time: new Date().toTimeString().slice(0, 5),
                    tare_date: new Date()
                      .toLocaleDateString("en-IN")
                      .replace(/\//g, "-"),
                    tare_time: new Date().toTimeString().slice(0, 5),
                    charges: 100,
                    wheel_count: 10,
                    remarks: "",
                  };
                  const { generateTicketHTML } =
                    await import("../../components/TicketPrint");
                  const html = generateTicketHTML(dummy, local);
                  const result = await window.db.printer.print(
                    html,
                    local.printer_name || "",
                  );
                  if (result.success) alert("Test print sent!");
                  else alert(`Test print failed: ${result.reason}`);
                }}
                style={{
                  background: "#e94560",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🖨️ Test Print
              </button>
            </div>
          </div>
        </>
      )}
      {tab !== "system" &&
        tab !== "developer" &&
        tab !== "migration" &&
        tab !== "diagnostics" &&
        tab !== "licensemanager" &&
        !(tab === "email" && !can("eod_email")) && (
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={S.btnSecondary} onClick={() => setLocal(settings)}>
              Cancel
            </button>
            <button style={S.btnSave} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "💾 Save Settings"}
            </button>
          </div>
        )}{" "}
    </div>
  );
}
