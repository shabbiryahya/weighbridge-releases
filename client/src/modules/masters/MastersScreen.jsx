import { useState, useEffect } from "react";

const TABS = [
  { id: "materials", label: "📦 Materials" },
  { id: "suppliers", label: "🏭 Suppliers" },
  { id: "receivers", label: "📬 Receivers" },
  { id: "vehicles", label: "🚛 Vehicles" },
];

const S = {
  card: {
    background: "white",
    borderRadius: 10,
    padding: "20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  input: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1.5px solid #e0e0e0",
    fontSize: 14,
    outline: "none",
    width: "100%",
  },
  btnAdd: {
    background: "#e94560",
    color: "white",
    border: "none",
    padding: "9px 20px",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  btnDel: {
    background: "#fff0f0",
    color: "#e94560",
    border: "1px solid #f5c0c0",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderBottom: "1px solid #f5f5f5",
    fontSize: 14,
  },
  label: { fontSize: 12, color: "#666", marginBottom: 4, display: "block" },
};

export default function MastersScreen() {
  const [tab, setTab] = useState("materials");
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [m, s, r, v] = await Promise.all([
      window.db.materials.getAll(),
      window.db.suppliers.getAll(),
      window.db.receivers.getAll(),
      window.db.vehicles.getAll(),
    ]);
    setMaterials(m);
    setSuppliers(s);
    setReceivers(r);
    setVehicles(v);
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async () => {
    if (!form.name?.trim()) return showToast("Name is required", "error");
    setSaving(true);
    try {
      let result;
      if (tab === "materials") result = await window.db.materials.add(form);
      if (tab === "suppliers") result = await window.db.suppliers.add(form);
      if (tab === "receivers") result = await window.db.receivers.add(form);
      if (result.success) {
        showToast("Added successfully!");
        setForm({});
        loadAll();
      } else {
        showToast(
          result.error?.includes("UNIQUE")
            ? "This name already exists!"
            : result.error,
          "error",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (table, id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    await window.db.masters.delete(table, id);
    showToast("Deleted successfully!");
    loadAll();
  };

  const currentList = () => {
    if (tab === "materials") return materials;
    if (tab === "suppliers") return suppliers;
    if (tab === "receivers") return receivers;
    if (tab === "vehicles") return vehicles;
    return [];
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
          }}
        >
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setForm({});
            }}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              fontSize: 14,
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

      <div
        style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}
      >
        {/* Add form — hidden for vehicles (auto managed) */}
        {tab !== "vehicles" && (
          <div style={S.card}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1a1a2e" }}>
              Add New{" "}
              {tab.slice(0, -1).charAt(0).toUpperCase() + tab.slice(1, -1)}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={S.label}>Name *</label>
                <input
                  style={S.input}
                  placeholder="Enter name"
                  value={form.name || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>

              {tab !== "materials" && (
                <>
                  <div>
                    <label style={S.label}>Address</label>
                    <input
                      style={S.input}
                      placeholder="Optional"
                      value={form.address || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, address: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label style={S.label}>Contact</label>
                    <input
                      style={S.input}
                      placeholder="Optional"
                      value={form.contact || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, contact: e.target.value }))
                      }
                    />
                  </div>
                </>
              )}

              {tab === "materials" && (
                <div>
                  <label style={S.label}>Rate per Ton (₹)</label>
                  <input
                    style={S.input}
                    type="number"
                    placeholder="0"
                    value={form.rate_per_ton || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, rate_per_ton: e.target.value }))
                    }
                  />
                </div>
              )}

              <button onClick={handleAdd} disabled={saving} style={S.btnAdd}>
                {saving ? "Adding..." : "+ Add"}
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div style={S.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 15, color: "#1a1a2e" }}>
              {currentList().length} {tab}
            </h3>
            {tab === "vehicles" && (
              <span style={{ fontSize: 12, color: "#aaa" }}>
                Auto populated from weighing entries
              </span>
            )}
          </div>

          {currentList().length === 0 ? (
            <div
              style={{ padding: "40px 0", textAlign: "center", color: "#ccc" }}
            >
              {tab === "vehicles"
                ? "🚛 Vehicles will appear here after first weighing entry"
                : `No ${tab} yet. Add your first one →`}
            </div>
          ) : (
            currentList().map((item) => (
              <div key={item.id} style={S.row}>
                <div>
                  <div style={{ fontWeight: 600, color: "#1a1a2e" }}>
                    {item.name || item.vehicle_no}
                  </div>
                  {item.address && (
                    <div style={{ fontSize: 12, color: "#aaa" }}>
                      {item.address}
                    </div>
                  )}
                  {item.rate_per_ton > 0 && (
                    <div style={{ fontSize: 12, color: "#00d4aa" }}>
                      ₹{item.rate_per_ton}/ton
                    </div>
                  )}
                  {item.vehicle_type && (
                    <div style={{ fontSize: 12, color: "#aaa" }}>
                      {item.vehicle_type}
                    </div>
                  )}
                  {item.standard_tare > 0 && (
                    <div style={{ fontSize: 12, color: "#00d4aa" }}>
                      Standard Tare:{" "}
                      {Number(item.standard_tare).toLocaleString("en-IN")} kg
                    </div>
                  )}
                </div>
                {tab !== "vehicles" && (
                  <button
                    onClick={() =>
                      handleDelete(tab, item.id, item.name || item.vehicle_no)
                    }
                    style={S.btnDel}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
