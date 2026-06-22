import { useState, useEffect, useCallback } from "react";
import AutocompleteInput from "../../components/AutocompleteInput";

// ── Helpers ──────────────────────────────────────────────────────────────────
const now = () => {
  const d = new Date();
  return {
    date: d
      .toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-"),
    time: d.toTimeString().slice(0, 5),
  };
};

const emptyForm = (ticketNo) => ({
  id: null,
  ticket_no: ticketNo,
  vehicle_no: "",
  vehicle_type: "Truck",
  material_name: "",
  supplier_name: "",
  receiver_name: "",
  gross_weight: "",
  gross_date: "",
  gross_time: "",
  tare_weight: "",
  tare_date: "",
  tare_time: "",
  net_weight: "",
  royalty_no: "",
  transporter: "",
  rate_per_ton: 0,
  wheel_count: 0,
  charges: 0,
  remarks: "",
  status: "pending",
});

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  card: {
    background: "white",
    borderRadius: 10,
    padding: "14px 18px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#aaa",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  label: { fontSize: 11, color: "#666", marginBottom: 3, display: "block" },
  input: {
    width: "100%",
    padding: "7px 10px",
    borderRadius: 6,
    border: "1.5px solid #e0e0e0",
    fontSize: 13,
    outline: "none",
    background: "white",
  },
  inputReadonly: {
    width: "100%",
    padding: "7px 10px",
    borderRadius: 6,
    border: "1.5px solid #f0f0f0",
    fontSize: 13,
    outline: "none",
    background: "#fafafa",
    color: "#888",
  },
  inputHighlight: {
    width: "100%",
    padding: "7px 10px",
    borderRadius: 6,
    border: "1.5px solid #00d4aa",
    fontSize: 13,
    outline: "none",
    background: "#f0fdf9",
    fontWeight: 700,
    color: "#00a37a",
  },
  select: {
    width: "100%",
    padding: "7px 10px",
    borderRadius: 6,
    border: "1.5px solid #e0e0e0",
    fontSize: 13,
    outline: "none",
    background: "white",
    cursor: "pointer",
  },
  weightBox: (color) => ({
    background: color + "12",
    border: `2px solid ${color}`,
    borderRadius: 8,
    padding: "8px 12px",
    textAlign: "center",
  }),
  weightLabel: { fontSize: 10, color: "#888", marginBottom: 2 },
  weightValue: (color, size = 20) => ({
    fontSize: size,
    fontWeight: 700,
    color,
    fontFamily: "monospace",
  }),
  captureBtn: (active) => ({
    padding: "6px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: active ? "pointer" : "not-allowed",
    border: "none",
    background: active ? "#00d4aa" : "#ddd",
    color: active ? "white" : "#aaa",
    whiteSpace: "nowrap",
  }),
};
function calcCharges(type, rate, netWeight, wheelCount) {
  const r = parseFloat(rate || 0);
  switch (type) {
    case "per_wheel":
      return (parseInt(wheelCount || 0) * r).toFixed(2);
    case "per_ton":
      return ((parseFloat(netWeight || 0) / 1000) * r).toFixed(2);
    case "flat":
      return r.toFixed(2);
    case "manual":
      return 0;
    default:
      return 0;
  }
}
// ── Main Component ────────────────────────────────────────────────────────────
export default function WeighingScreen() {
  const [form, setForm] = useState(emptyForm(1));
  const [liveWeight, setLiveWeight] = useState(0);
  const [isStable, setIsStable] = useState(false);
  const [clock, setClock] = useState(now());
  const [vehicleNos, setVehicleNos] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialNames, setMaterialNames] = useState([]);
  const [supplierNames, setSupplierNames] = useState([]);
  const [receiverNames, setReceiverNames] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pendingTickets, setPendingTickets] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("recent");
  const [printSettings, setPrintSettings] = useState({});
  const [printing, setPrinting] = useState(false);
  const [chargesConfig, setChargesConfig] = useState({});
  const [recentPage, setRecentPage] = useState(1);
  const RECENT_PER_PAGE = 5;

  // ── Load all data on mount
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [nextNo, vNos, mats, sups, recs, recent, pending, ps, charges] =
      await Promise.all([
        window.db.tickets.nextNo(),
        window.db.vehicles.getAllNos(),
        window.db.materials.getAll(),
        window.db.suppliers.getAll(),
        window.db.receivers.getAll(),
        window.db.tickets.getRecent(),
        window.db.tickets.getPending(),
        window.db.settings.getPrint(),
        window.db.settings.getCharges(),
      ]);

    setChargesConfig(charges);
    setPrintSettings(ps); // ps is the 8th result
    setVehicleNos(vNos);
    setMaterials(mats);
    setMaterialNames(mats.map((m) => m.name));
    setSupplierNames(sups.map((s) => s.name));
    setReceiverNames(recs.map((r) => r.name));
    setRecentTickets(recent);
    setPendingTickets(pending);

    setForm((f) => (f.id ? f : emptyForm(nextNo)));
  };
  // ── Live clock
  useEffect(() => {
    const t = setInterval(() => setClock(now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Simulate hardware weight (replace with serialport later)
  // useEffect(() => {
  //   let count = 0;
  //   let target = 23450;
  //   const t = setInterval(() => {
  //     const fluctuation =
  //       Math.random() > 0.7 ? Math.floor(Math.random() * 20) - 10 : 0;
  //     setLiveWeight(target + fluctuation);
  //     setIsStable(fluctuation === 0);
  //     if (++count > 30) {
  //       target = target === 23450 ? 8200 : 23450;
  //       count = 0;
  //     }
  //   }, 500);
  //   return () => clearInterval(t);
  // }, []);

  // ── Live weight from serial port
  useEffect(() => {
    // Listen for weight from serial port
    window.db.serial.onWeight((weight) => {
      setLiveWeight(weight);
      setIsStable(true);
      // After 500ms of no new data, mark as unstable
      clearTimeout(window._stableTimer);
      window._stableTimer = setTimeout(() => setIsStable(false), 500);
    });

    window.db.serial.onStatus((status) => {
      if (status === "disconnected") {
        setLiveWeight(0);
        setIsStable(false);
      }
    });

    // Start serial port
    window.db.serial.start();

    return () => {
      window.db.serial.stop();
    };
  }, []);

  // ── Capture weight into correct field
  const captureGross = useCallback(() => {
    if (!isStable) return;
    const { date, time } = now();
    setForm((f) => {
      const updated = {
        ...f,
        gross_weight: liveWeight,
        gross_date: date,
        gross_time: time,
      };
      // Recalculate net and charges if tare exists
      if (updated.tare_weight) {
        updated.net_weight = Math.abs(liveWeight - updated.tare_weight);
        if (updated.rate_per_ton) {
          updated.charges = (
            (updated.net_weight / 1000) *
            updated.rate_per_ton
          ).toFixed(2);
        }
      }
      return updated;
    });
    showToast(
      `Gross captured: ${liveWeight.toLocaleString("en-IN")} kg`,
      "success",
    );
  }, [liveWeight, isStable]);

  const captureTare = useCallback(() => {
    if (!isStable) return;
    const { date, time } = now();
    setForm((f) => {
      const updated = {
        ...f,
        tare_weight: liveWeight,
        tare_date: date,
        tare_time: time,
      };
      // Recalculate net and charges if gross exists
      if (updated.gross_weight) {
        updated.net_weight = Math.abs(updated.gross_weight - liveWeight);
        if (updated.rate_per_ton) {
          updated.charges = (
            (updated.net_weight / 1000) *
            updated.rate_per_ton
          ).toFixed(2);
        }
      }
      return updated;
    });
    showToast(
      `Tare captured: ${liveWeight.toLocaleString("en-IN")} kg`,
      "success",
    );
  }, [liveWeight, isStable]);

  // ── Smart field setter
  const setField = (key, val) => {
    setForm((f) => {
      const updated = { ...f, [key]: val };
      const cType = chargesConfig?.charges_type || "per_ton";
      const cRate = parseFloat(chargesConfig?.charges_rate || 0);

      // When vehicle selected → check for standard tare
      if (key === "vehicle_no" && val.length > 3) {
        window.db.vehicles.getByNo(val).then((vehicle) => {
          if (vehicle?.standard_tare > 0) {
            setForm((prev) => {
              const u = { ...prev, tare_weight: vehicle.standard_tare };
              if (u.gross_weight) {
                u.net_weight = Math.abs(u.gross_weight - vehicle.standard_tare);
                u.charges = calcCharges(
                  cType,
                  cRate,
                  u.net_weight,
                  u.wheel_count,
                );
              }
              return u;
            });
            showToast(
              `Standard tare ${vehicle.standard_tare} kg auto filled`,
              "success",
            );
          }
        });
      }

      // When material selected → auto fill rate
      if (key === "material_name") {
        const mat = materials.find((m) => m.name === val);
        if (mat?.rate_per_ton > 0) {
          updated.rate_per_ton = mat.rate_per_ton;
          if (updated.net_weight) {
            updated.charges = calcCharges(
              cType,
              cRate || mat.rate_per_ton,
              updated.net_weight,
              updated.wheel_count,
            );
          }
        } else {
          updated.rate_per_ton = 0;
          if (cType !== "manual") updated.charges = 0;
        }
      }

      // When wheel count changes → recalculate if per_wheel
      if (key === "wheel_count") {
        if (cType === "per_wheel") {
          updated.charges = calcCharges(
            "per_wheel",
            cRate,
            updated.net_weight,
            val,
          );
        }
      }

      // When rate changed manually → recalculate
      if (key === "rate_per_ton" && f.net_weight) {
        updated.charges = calcCharges(cType, val, f.net_weight, f.wheel_count);
      }

      // When tare typed manually → recalculate net
      if (key === "tare_weight" && f.gross_weight) {
        const net = Math.abs(f.gross_weight - val);
        updated.net_weight = net;
        updated.charges = calcCharges(
          cType,
          cRate || f.rate_per_ton,
          net,
          f.wheel_count,
        );
      }

      // When gross typed manually → recalculate net
      if (key === "gross_weight" && f.tare_weight) {
        const net = Math.abs(val - f.tare_weight);
        updated.net_weight = net;
        updated.charges = calcCharges(
          cType,
          cRate || f.rate_per_ton,
          net,
          f.wheel_count,
        );
      }

      return updated;
    });
  };

  // ── Open pending ticket
  const openPendingTicket = (ticket) => {
    setForm({
      id: ticket.id,
      ticket_no: ticket.ticket_no,
      vehicle_no: ticket.vehicle_no || "",
      vehicle_type: ticket.vehicle_type || "Truck",
      material_name: ticket.material_name || "",
      supplier_name: ticket.supplier_name || "",
      receiver_name: ticket.receiver_name || "",
      gross_weight: ticket.gross_weight || "",
      gross_date: ticket.gross_date || "",
      gross_time: ticket.gross_time || "",
      tare_weight: ticket.tare_weight || "",
      tare_date: ticket.tare_date || "",
      tare_time: ticket.tare_time || "",
      net_weight: ticket.net_weight || "",
      royalty_no: ticket.royalty_no || "",
      transporter: ticket.transporter || "",
      rate_per_ton: ticket.rate_per_ton || 0,
      charges: ticket.charges || 0,
      remarks: ticket.remarks || "",
      status: ticket.status,
    });
    showToast(
      `Opened ticket #${ticket.ticket_no} — add missing weight`,
      "success",
    );
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Save ticket
  const handleSave = async () => {
    // ── Validation ──────────────────────────────────
    if (!form.vehicle_no?.trim())
      return showToast("Vehicle number is required", "error");

    if (!form.material_name?.trim())
      return showToast("Material is required", "error");

    if (!form.gross_weight && !form.tare_weight)
      return showToast("Capture at least one weight first", "error");

    if (form.gross_weight && isNaN(parseFloat(form.gross_weight)))
      return showToast("Gross weight must be a valid number", "error");

    if (form.tare_weight && isNaN(parseFloat(form.tare_weight)))
      return showToast("Tare weight must be a valid number", "error");

    if (form.gross_weight && parseFloat(form.gross_weight) <= 0)
      return showToast("Gross weight must be greater than zero", "error");

    if (form.tare_weight && parseFloat(form.tare_weight) <= 0)
      return showToast("Tare weight must be greater than zero", "error");

    if (form.gross_weight && form.tare_weight) {
      if (parseFloat(form.gross_weight) < parseFloat(form.tare_weight)) {
        return showToast(
          "Gross weight cannot be less than Tare weight. Please check captured weights.",
          "error",
        );
      }
    }

    if (
      form.gross_weight &&
      form.tare_weight &&
      parseFloat(form.gross_weight) === parseFloat(form.tare_weight)
    )
      return showToast("Gross and Tare cannot be equal", "error");

    const cType =
      chargesConfig?.charges_type || printSettings?.charges_type || "per_ton";
    if (cType === "per_wheel" && isComplete) {
      if (!form.wheel_count || parseInt(form.wheel_count) <= 0)
        return showToast(
          "Wheel count is required for per-wheel charges",
          "error",
        );
    }
    // ── End Validation ──────────────────────────────

    setSaving(true);
    try {
      await window.db.vehicles.autoSave(form.vehicle_no, form.vehicle_type);
      const result = await window.db.tickets.save(form);
      if (result.success) {
        const isComplete = result.status === "complete";
        showToast(
          isComplete
            ? `Ticket #${form.ticket_no} saved & complete!`
            : `Ticket #${form.ticket_no} saved as pending`,
          "success",
        );
        await loadAll();
      } else {
        showToast("Save failed: " + result.error, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    const nextNo = await window.db.tickets.nextNo();
    setForm(emptyForm(nextNo));
  };

  // ── Computed values
  const isComplete = form.gross_weight && form.tare_weight;
  const isMissingGross = form.tare_weight && !form.gross_weight;
  const isMissingTare = form.gross_weight && !form.tare_weight;
  const isEditing = !!form.id;

  const handlePrint = async () => {
    if (!isComplete || printing) return;
    setPrinting(true);
    try {
      const { generateTicketHTML } =
        await import("../../components/TicketPrint");
      const html = generateTicketHTML(form, printSettings);
      const result = await window.db.printer.print(
        html,
        printSettings.printer_name || "",
        printSettings.print_copies || 1,
      );
      if (result.success) {
        showToast("Ticket printed successfully!", "success");
        await window.db.tickets.save({ ...form, status: "printed" });
        await loadAll();
      } else {
        showToast(`Print failed: ${result.reason || "unknown error"}`, "error");
      }
    } catch (e) {
      showToast(`Print error: ${e.message}`, "error");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
      }}
    >
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

      {/* Live Weight Bar */}
      <div
        style={{
          background: "#1a1a2e",
          borderRadius: 12,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 700,
              color: "#00d4aa",
              fontFamily: "monospace",
              letterSpacing: 2,
            }}
          >
            {liveWeight.toLocaleString("en-IN")} kg
          </div>
          <div
            style={{
              fontSize: 11,
              color: isStable ? "#00d4aa" : "#ff9800",
              marginTop: 2,
            }}
          >
            {isStable ? "🟢 Stable — ready to capture" : "🟡 Fluctuating..."}
          </div>
        </div>

        {/* Capture buttons — separate for Gross and Tare */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={captureGross}
            style={S.captureBtn(isStable)}
            title="Capture current weight as GROSS"
          >
            ⬇️ Capture GROSS
          </button>
          <button
            onClick={captureTare}
            style={S.captureBtn(isStable)}
            title="Capture current weight as TARE"
          >
            ⬇️ Capture TARE
          </button>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, color: "white", fontWeight: 700 }}>
            {clock.time}
          </div>
          <div style={{ fontSize: 11, color: "#888" }}>{clock.date}</div>
        </div>
      </div>

      {/* Editing banner */}
      {isEditing && (
        <div
          style={{
            background: "#fff8e1",
            border: "1.5px solid #ff9800",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            color: "#cc7a00",
            fontWeight: 600,
          }}
        >
          ✏️ Editing Ticket #{form.ticket_no} —
          {isMissingGross &&
            " Gross weight missing. Capture Gross to complete."}
          {isMissingTare &&
            " Tare weight missing. Capture Tare or enter manually to complete."}
          {isComplete && " Both weights present. Ready to save!"}
        </div>
      )}

      {/* Body */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 12,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* ── Left: Entry Form ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {/* Ticket Info */}
          <div style={S.card}>
            <div style={S.cardTitle}>Ticket Info</div>
            <div style={S.grid3}>
              <div>
                <label style={S.label}>Ticket No.</label>
                <input
                  style={{ ...S.inputReadonly, fontWeight: 700, fontSize: 15 }}
                  value={form.ticket_no}
                  readOnly
                />
              </div>
              <div>
                <label style={S.label}>Date</label>
                <input style={S.inputReadonly} value={clock.date} readOnly />
              </div>
              <div>
                <label style={S.label}>Time</label>
                <input style={S.inputReadonly} value={clock.time} readOnly />
              </div>
            </div>
          </div>

          {/* Vehicle */}
          <div style={S.card}>
            <div style={S.cardTitle}>Vehicle Details</div>
            <div style={S.grid2}>
              <AutocompleteInput
                label="Vehicle No. *"
                value={form.vehicle_no}
                onChange={(v) => setField("vehicle_no", v.toUpperCase())}
                suggestions={vehicleNos}
                placeholder="e.g. GJ01XX1234"
              />
              <div>
                <label style={S.label}>Vehicle Type</label>
                <select
                  style={S.select}
                  value={form.vehicle_type}
                  onChange={(e) => setField("vehicle_type", e.target.value)}
                >
                  {["Truck", "Trailer", "Tractor", "Mini Truck", "Other"].map(
                    (t) => (
                      <option key={t}>{t}</option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Weights — Both visible, both capturable */}
          <div style={S.card}>
            <div style={S.cardTitle}>Weights</div>
            <div style={S.grid2}>
              {/* Gross */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 3,
                  }}
                >
                  <label style={S.label}>Gross Weight (kg)</label>
                  <button onClick={captureGross} style={S.captureBtn(isStable)}>
                    ⚡ Capture
                  </button>
                </div>
                <input
                  style={form.gross_weight ? S.inputHighlight : S.input}
                  type="number"
                  placeholder="Auto from hardware"
                  value={form.gross_weight || ""}
                  onChange={(e) =>
                    setField("gross_weight", parseFloat(e.target.value) || "")
                  }
                />
                {form.gross_date && (
                  <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>
                    {form.gross_date} {form.gross_time}
                  </div>
                )}
              </div>

              {/* Tare */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 3,
                  }}
                >
                  <label style={S.label}>Tare Weight (kg)</label>
                  <button onClick={captureTare} style={S.captureBtn(isStable)}>
                    ⚡ Capture
                  </button>
                </div>
                <input
                  style={form.tare_weight ? S.inputHighlight : S.input}
                  type="number"
                  placeholder="Auto / type manually"
                  value={form.tare_weight || ""}
                  onChange={(e) =>
                    setField("tare_weight", parseFloat(e.target.value) || "")
                  }
                />
                {form.tare_date && (
                  <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>
                    {form.tare_date} {form.tare_time}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Material & Charges */}
          <div style={S.card}>
            <div style={S.cardTitle}>Material & Charges</div>
            <div style={S.grid2}>
              <AutocompleteInput
                label="Material *"
                value={form.material_name}
                onChange={(v) => setField("material_name", v)}
                suggestions={materialNames}
                placeholder="e.g. Sand, Stone"
              />
              <div>
                <label style={S.label}>Royalty No.</label>
                <input
                  style={S.input}
                  placeholder="Optional"
                  value={form.royalty_no}
                  onChange={(e) => setField("royalty_no", e.target.value)}
                />
              </div>
              {/* Show wheel count only when charges type is per_wheel */}
              {chargesConfig?.charges_type === "per_wheel" ? (
                <div>
                  <label style={S.label}>Number of Wheels *</label>
                  <input
                    style={form.wheel_count > 0 ? S.inputHighlight : S.input}
                    type="number"
                    placeholder="e.g. 10, 12, 20"
                    value={form.wheel_count || ""}
                    onChange={(e) =>
                      setField("wheel_count", parseInt(e.target.value) || 0)
                    }
                  />
                  {chargesConfig?.charges_rate && form.wheel_count > 0 && (
                    <div
                      style={{ fontSize: 10, color: "#00a37a", marginTop: 2 }}
                    >
                      {form.wheel_count} wheels × ₹{chargesConfig.charges_rate}{" "}
                      = ₹
                      {parseInt(form.wheel_count) *
                        parseFloat(chargesConfig.charges_rate)}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={S.label}>Rate per Ton (₹)</label>
                  <input
                    style={S.input}
                    type="number"
                    placeholder="Auto from material"
                    value={form.rate_per_ton || ""}
                    onChange={(e) =>
                      setField("rate_per_ton", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              )}
              <div>
                <label style={S.label}>
                  Charges (₹) —{" "}
                  {chargesConfig?.charges_type === "per_wheel"
                    ? `₹${chargesConfig?.charges_rate || 0}/wheel`
                    : chargesConfig?.charges_type === "per_ton"
                      ? `₹${chargesConfig?.charges_rate || 0}/ton`
                      : chargesConfig?.charges_type === "flat"
                        ? "Flat rate"
                        : "Manual entry"}
                </label>
                <input
                  style={S.inputHighlight}
                  type="number"
                  placeholder="Auto"
                  value={form.charges || ""}
                  onChange={(e) =>
                    setField("charges", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </div>

          {/* Parties */}
          <div style={S.card}>
            <div style={S.cardTitle}>Parties</div>
            <div style={S.grid2}>
              <AutocompleteInput
                label="Supplier"
                value={form.supplier_name}
                onChange={(v) => setField("supplier_name", v)}
                suggestions={supplierNames}
                placeholder="Supplier name"
              />
              <AutocompleteInput
                label="Receiver"
                value={form.receiver_name}
                onChange={(v) => setField("receiver_name", v)}
                suggestions={receiverNames}
                placeholder="Receiver name"
              />
              <div>
                <label style={S.label}>Transporter</label>
                <input
                  style={S.input}
                  placeholder="Optional"
                  value={form.transporter}
                  onChange={(e) => setField("transporter", e.target.value)}
                />
              </div>
              <div>
                <label style={S.label}>Remarks</label>
                <input
                  style={S.input}
                  placeholder="Optional"
                  value={form.remarks}
                  onChange={(e) => setField("remarks", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Summary + Pending + Recent ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Weight Summary */}
          <div style={S.card}>
            <div style={S.cardTitle}>Weight Summary</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={S.weightBox("#2196f3")}>
                <div style={S.weightLabel}>GROSS (kg)</div>
                <div style={S.weightValue("#2196f3")}>
                  {form.gross_weight
                    ? Number(form.gross_weight).toLocaleString("en-IN")
                    : "—"}
                </div>
              </div>

              <div style={S.weightBox("#ff9800")}>
                <div style={S.weightLabel}>TARE (kg)</div>
                <div style={S.weightValue("#ff9800")}>
                  {form.tare_weight
                    ? Number(form.tare_weight).toLocaleString("en-IN")
                    : "—"}
                </div>
              </div>

              <div style={{ ...S.weightBox("#e94560"), borderWidth: 3 }}>
                <div style={S.weightLabel}>NET (kg)</div>
                <div style={S.weightValue("#e94560", 24)}>
                  {form.net_weight
                    ? Number(form.net_weight).toLocaleString("en-IN")
                    : "—"}
                </div>
              </div>

              <div style={S.weightBox("#00d4aa")}>
                <div style={S.weightLabel}>CHARGES (₹)</div>
                <div style={S.weightValue("#00d4aa")}>
                  {form.charges
                    ? `₹${Number(form.charges).toLocaleString("en-IN")}`
                    : "—"}
                </div>
                {chargesConfig?.charges_type &&
                  chargesConfig.charges_type !== "manual" && (
                    <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                      {chargesConfig.charges_type === "per_wheel" &&
                        `${form.wheel_count || 0} wheels × ₹${chargesConfig.charges_rate || 0}`}
                      {chargesConfig.charges_type === "per_ton" &&
                        `@ ₹${chargesConfig.charges_rate || 0}/ton`}
                      {chargesConfig.charges_type === "flat" &&
                        `Flat ₹${chargesConfig.charges_rate || 0}`}
                    </div>
                  )}
              </div>
            </div>

            {/* Status indicator */}
            <div
              style={{
                marginTop: 10,
                padding: "6px 10px",
                borderRadius: 6,
                background: isComplete ? "#f0fdf9" : "#fff8e1",
                border: `1px solid ${isComplete ? "#00d4aa" : "#ff9800"}`,
                fontSize: 11,
                fontWeight: 600,
                textAlign: "center",
                color: isComplete ? "#00a37a" : "#cc7a00",
              }}
            >
              {isComplete
                ? "✅ Complete — Ready to save & print"
                : isMissingGross
                  ? "⏳ Pending — Gross weight missing"
                  : isMissingTare
                    ? "⏳ Pending — Tare weight missing"
                    : "📝 New ticket — Enter weights"}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button
                onClick={handleClear}
                style={{
                  background: "#f0f0f0",
                  color: "#333",
                  border: "none",
                  padding: "9px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                🗑️ Clear
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  background: saving
                    ? "#ccc"
                    : isComplete
                      ? "#e94560"
                      : "#ff9800",
                  color: "white",
                  border: "none",
                  padding: "9px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving
                  ? "Saving..."
                  : isComplete
                    ? "💾 Save & Complete"
                    : "💾 Save Pending"}
              </button>
            </div>

            <button
              disabled={!isComplete || printing}
              onClick={handlePrint}
              style={{
                width: "100%",
                marginTop: 6,
                background: isComplete && !printing ? "#1a1a2e" : "#e0e0e0",
                color: isComplete && !printing ? "white" : "#aaa",
                border: "none",
                padding: "9px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: isComplete && !printing ? "pointer" : "not-allowed",
              }}
            >
              {printing ? "⏳ Printing..." : "🖨️ Print Ticket"}
            </button>

            {/* Preview button — no printer needed */}
            <button
              disabled={!isComplete}
              onClick={async () => {
                const { previewTicket } =
                  await import("../../components/TicketPrint");
                previewTicket(form, printSettings);
              }}
              style={{
                width: "100%",
                marginTop: 4,
                background: "transparent",
                color: isComplete ? "#1a1a2e" : "#aaa",
                border: `1px solid ${isComplete ? "#1a1a2e" : "#e0e0e0"}`,
                padding: "7px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                cursor: isComplete ? "pointer" : "not-allowed",
              }}
            >
              👁️ Preview Ticket
            </button>
          </div>

          {/* Tabs — Pending / Recent */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "pending", label: `⏳ Pending (${pendingTickets.length})` },
              { id: "recent", label: "📋 Recent" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  flex: 1,
                  padding: "7px",
                  borderRadius: 7,
                  border: "1.5px solid",
                  background: activeTab === t.id ? "#1a1a2e" : "white",
                  borderColor: activeTab === t.id ? "#1a1a2e" : "#e0e0e0",
                  color: activeTab === t.id ? "white" : "#333",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Pending Tickets */}
          {activeTab === "pending" && (
            <div
              style={{
                ...S.card,
                flex: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ overflowY: "auto", flex: 1 }}>
                {pendingTickets.length === 0 ? (
                  <p
                    style={{
                      color: "#ccc",
                      fontSize: 12,
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    No pending tickets
                  </p>
                ) : (
                  pendingTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => openPendingTicket(t)}
                      style={{
                        padding: "8px 10px",
                        borderBottom: "1px solid #f5f5f5",
                        cursor: "pointer",
                        borderRadius: 6,
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#fff8e1")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "white")
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <strong style={{ fontSize: 13, color: "#1a1a2e" }}>
                          #{t.ticket_no}
                        </strong>
                        <span
                          style={{
                            fontSize: 10,
                            background: "#fff8e1",
                            color: "#cc7a00",
                            padding: "1px 6px",
                            borderRadius: 99,
                            fontWeight: 600,
                          }}
                        >
                          {t.gross_weight && !t.tare_weight
                            ? "Tare missing"
                            : "Gross missing"}
                        </span>
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#666", marginTop: 2 }}
                      >
                        {t.vehicle_no} · {t.material_name || "—"}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}
                      >
                        {t.gross_weight
                          ? `Gross: ${Number(t.gross_weight).toLocaleString("en-IN")} kg`
                          : `Tare: ${Number(t.tare_weight).toLocaleString("en-IN")} kg`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "recent" && (
            <div
              style={{
                ...S.card,
                flex: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ overflowY: "auto", flex: 1 }}>
                {recentTickets.length === 0 ? (
                  <p
                    style={{
                      color: "#ccc",
                      fontSize: 12,
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    No tickets yet
                  </p>
                ) : (
                  recentTickets
                    .slice(
                      (recentPage - 1) * RECENT_PER_PAGE,
                      recentPage * RECENT_PER_PAGE,
                    )
                    .map((t) => (
                      <div
                        key={t.id}
                        style={{
                          padding: "8px 10px",
                          borderBottom: "1px solid #f5f5f5",
                          fontSize: 13,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <strong style={{ color: "#1a1a2e" }}>
                            #{t.ticket_no}
                          </strong>
                          <span
                            style={{
                              fontSize: 10,
                              padding: "1px 6px",
                              borderRadius: 99,
                              fontWeight: 600,
                              background:
                                t.status === "complete" ? "#f0fdf9" : "#fff8e1",
                              color:
                                t.status === "complete" ? "#00a37a" : "#cc7a00",
                            }}
                          >
                            {t.status === "complete" ? "Complete" : "Pending"}
                          </span>
                        </div>
                        <div
                          style={{ color: "#888", fontSize: 12, marginTop: 2 }}
                        >
                          {t.vehicle_no} · {t.material_name || "—"}
                        </div>
                        {t.net_weight > 0 && (
                          <div
                            style={{
                              color: "#e94560",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            Net: {Number(t.net_weight).toLocaleString("en-IN")}{" "}
                            kg
                            {t.charges > 0 &&
                              ` · ₹${Number(t.charges).toLocaleString("en-IN")}`}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>

              {/* Pagination */}
              {recentTickets.length > RECENT_PER_PAGE && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderTop: "1px solid #f5f5f5",
                    background: "#fafafa",
                  }}
                >
                  <button
                    onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                    disabled={recentPage === 1}
                    style={{
                      background: "none",
                      border: "none",
                      color: recentPage === 1 ? "#ccc" : "#1a1a2e",
                      cursor: recentPage === 1 ? "not-allowed" : "pointer",
                      fontSize: 18,
                      padding: "0 4px",
                    }}
                  >
                    ‹
                  </button>
                  <span style={{ fontSize: 11, color: "#888" }}>
                    {(recentPage - 1) * RECENT_PER_PAGE + 1}–
                    {Math.min(
                      recentPage * RECENT_PER_PAGE,
                      recentTickets.length,
                    )}{" "}
                    of {recentTickets.length}
                  </span>
                  <button
                    onClick={() =>
                      setRecentPage((p) =>
                        Math.min(
                          Math.ceil(recentTickets.length / RECENT_PER_PAGE),
                          p + 1,
                        ),
                      )
                    }
                    disabled={
                      recentPage >=
                      Math.ceil(recentTickets.length / RECENT_PER_PAGE)
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color:
                        recentPage >=
                        Math.ceil(recentTickets.length / RECENT_PER_PAGE)
                          ? "#ccc"
                          : "#1a1a2e",
                      cursor:
                        recentPage >=
                        Math.ceil(recentTickets.length / RECENT_PER_PAGE)
                          ? "not-allowed"
                          : "pointer",
                      fontSize: 18,
                      padding: "0 4px",
                    }}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
