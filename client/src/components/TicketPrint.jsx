// TicketPrint.jsx
// Generates HTML for printing tickets
// Two modes: 'full' (blank paper) | 'data_only' (pre-printed paper)

export function generateTicketHTML(form, settings) {
  const mode = settings.print_mode || "full";
  if (mode === "data_only") return generateDataOnlyHTML(form, settings);
  return generateFullTicketHTML(form, settings);
}

// ─── MODE 1: FULL TICKET ─────────────────────────────
function generateFullTicketHTML(form, settings) {
  const fontSize = parseInt(settings.print_font_size || "10");
  const company = settings.company_name || "YOUR COMPANY NAME";
  const address = settings.company_address || "";
  const city = settings.company_city || "";
  const contact = settings.company_contact || "";
  const footer =
    settings.ticket_footer ||
    "Please check weight. No responsibility accepted once carrier leaves.";
  const paperWidth =
    settings.print_paper === "A4"
      ? "210mm"
      : settings.print_paper === "A5"
        ? "148mm"
        : settings.print_paper === "76mm"
          ? "76mm"
          : "80mm";

  const show = {
    supplier: settings.print_show_supplier !== "false",
    receiver: settings.print_show_receiver !== "false",
    royalty: settings.print_show_royalty === "true",
    transporter: settings.print_show_transporter === "true",
    remarks: settings.print_show_remarks === "true",
    charges: settings.print_show_charges !== "false",
    vehicleType: settings.print_show_vehicle_type !== "false",
  };

  const copies = ["ORIGINAL", "DUPLICATE", "TRIPLICATE"];

  const oneCopy = (label, isLast) => `
    <div class="ticket">
      <div class="company">${esc(company)}</div>
      ${address ? `<div class="sub">${esc(address)}</div>` : ""}
      ${city || contact ? `<div class="sub">${esc([city, contact].filter(Boolean).join(" | "))}</div>` : ""}
      <div class="divider"></div>
      <div class="copy-label">** ${label} **</div>
      <div class="divider"></div>

      <table class="fields">
        <tr><td class="fl">No.</td><td class="fv"><b>${esc(form.ticket_no)}</b></td></tr>
        <tr><td class="fl">Date</td><td class="fv">${esc(form.gross_date || form.tare_date || "")} ${esc(form.gross_time || form.tare_time || "")}</td></tr>
        ${show.vehicleType ? `<tr><td class="fl">Type</td><td class="fv">${esc(form.vehicle_type || "")}</td></tr>` : ""}
        <tr><td class="fl">Vehicle</td><td class="fv"><b>${esc(form.vehicle_no || "")}</b></td></tr>
        <tr><td class="fl">Material</td><td class="fv">${esc(form.material_name || "")}</td></tr>
        ${show.supplier ? `<tr><td class="fl">Supplier</td><td class="fv">${esc(form.supplier_name || "")}</td></tr>` : ""}
        ${show.receiver ? `<tr><td class="fl">Receiver</td><td class="fv">${esc(form.receiver_name || "")}</td></tr>` : ""}
        ${show.royalty ? `<tr><td class="fl">Royalty</td><td class="fv">${esc(form.royalty_no || "")}</td></tr>` : ""}
        ${show.transporter ? `<tr><td class="fl">Transporter</td><td class="fv">${esc(form.transporter || "")}</td></tr>` : ""}
      </table>

      <div class="divider"></div>

      <table class="weights">
        <tr><td class="wl">GROSS</td><td class="wv">${formatWt(form.gross_weight)}</td><td class="wu">Kg</td></tr>
        <tr><td class="wl">TARE</td><td class="wv">${formatWt(form.tare_weight)}</td><td class="wu">Kg</td></tr>
        <tr class="net-row"><td class="wl"><b>NET</b></td><td class="wv"><b>${formatWt(form.net_weight)}</b></td><td class="wu"><b>Kg</b></td></tr>
      </table>

      ${show.charges ? `<div class="charges">Charges: <b>Rs. ${formatNum(form.charges)}</b>${form.wheel_count > 0 ? ` (${form.wheel_count} wheels)` : ""}</div>` : ""}
      ${show.remarks && form.remarks ? `<div class="charges">Remarks: ${esc(form.remarks)}</div>` : ""}

      <div class="divider"></div>
      <div class="footer">${esc(footer)}</div>
      <div class="sign">Operator Sign: ___________</div>
    </div>
    ${!isLast ? `<div class="cut-line">✂ - - - - - - - - - - cut here - - - - - - - - - - ✂</div>` : ""}
  `;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${fontSize}px;
    color: #000;
    background: #fff;
    width: ${paperWidth};
  }
  .ticket { padding: 2mm 3mm; display: flex; flex-direction: column; gap: 1px; }
  .company { text-align: center; font-weight: bold; font-size: ${fontSize + 1}px; }
  .sub { text-align: center; font-size: ${fontSize - 1}px; }
  .copy-label { text-align: center; font-weight: bold; font-size: ${fontSize}px; }
  .divider { border-top: 1px dashed #000; margin: 1px 0; }
  .fields { width: 100%; border-collapse: collapse; }
  .fields td { padding: 1px 2px; vertical-align: top; }
  .fl { font-weight: bold; white-space: nowrap; width: 30%; }
  .fv { width: 70%; }
  .weights { width: 100%; border-collapse: collapse; margin-top: 1px; }
  .weights td { padding: 1px 2px; }
  .wl { width: 35%; font-weight: bold; }
  .wv { width: 45%; text-align: right; }
  .wu { width: 20%; padding-left: 3px; }
  .net-row td { border-top: 1px dashed #000; padding-top: 1px; }
  .charges { margin: 1px 0; }
  .footer { font-size: ${fontSize - 2}px; text-align: center; font-style: italic; margin: 2px 0; }
  .sign { margin-top: 3px; }
  .cut-line {
    text-align: center;
    font-size: ${fontSize - 2}px;
    margin: 4px 0;
    border-top: 1px dashed #999;
    border-bottom: 1px dashed #999;
    padding: 2px 0;
  }
</style>
</head>
<body>
  ${copies.map((label, i) => oneCopy(label, i === copies.length - 1)).join("\n")}
</body>
</html>`;
}

// ─── MODE 2: DATA ONLY ───────────────────────────────
function generateDataOnlyHTML(form, settings) {
  const fontSize = parseInt(settings.print_font_size || "11");

  // Default positions — client adjusts in Settings if needed
  const pos = {
    ticket_no: { top: 28, left: 35 },
    date: { top: 28, left: 120 },
    time: { top: 33, left: 120 },
    vehicle_no: { top: 38, left: 35 },
    material: { top: 43, left: 35 },
    supplier: { top: 48, left: 35 },
    receiver: { top: 53, left: 35 },
    gross: { top: 68, left: 80 },
    tare: { top: 73, left: 80 },
    net: { top: 78, left: 80 },
    charges: { top: 83, left: 80 },
  };

  const f = (key, val) => {
    const p = pos[key];
    if (!p) return "";
    return `<div style="position:absolute;top:${p.top}mm;left:${p.left}mm;font-weight:bold">${esc(String(val || ""))}</div>`;
  };

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${fontSize}px;
    color: #000;
    background: transparent;
    position: relative;
    margin: 0; padding: 0;
  }
</style>
</head>
<body>
  ${f("ticket_no", form.ticket_no)}
  ${f("date", form.gross_date || form.tare_date || "")}
  ${f("time", form.gross_time || form.tare_time || "")}
  ${f("vehicle_no", form.vehicle_no)}
  ${f("material", form.material_name)}
  ${f("supplier", form.supplier_name)}
  ${f("receiver", form.receiver_name)}
  ${f("gross", formatWt(form.gross_weight))}
  ${f("tare", formatWt(form.tare_weight))}
  ${f("net", formatWt(form.net_weight))}
  ${f("charges", formatNum(form.charges))}
</body>
</html>`;
}

// ─── Helpers ─────────────────────────────────────────

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatWt(val) {
  if (val === "" || val === null || val === undefined) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}

function formatNum(val) {
  if (!val || val === 0 || val === "0") return "0";
  const n = parseFloat(val);
  if (isNaN(n)) return "0";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

// Preview in browser window (no printer needed)
export function previewTicket(form, settings) {
  const html = generateTicketHTML(form, settings);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "width=1100,height=700");
  if (w) setTimeout(() => URL.revokeObjectURL(url), 5000);
}
