// TicketPrint.jsx
// Generates HTML for printing tickets
// Modes: 'full' | 'data_only' | 'tractor_2copy' | 'coordinate_2copy'

export function generateTicketHTML(form, settings) {
  const mode = settings.print_mode || "full";
  if (mode === "data_only") return generateDataOnlyHTML(form, settings);
  if (mode === "tractor_2copy") return generateTractor2CopyHTML(form, settings);
  if (mode === "coordinate_2copy") return generateCoordinate2CopyHTML(form, settings);
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

// ─── MODE 4: COORDINATE 2-COPY ───────────────────────────────────────────────
// Replicates the old VB.NET coordinate-based printing, extended for two copies.
// Paper: 254mm wide × 101mm tall (10"×12", 4" cut tractor feed)
// ORIGINAL (125mm) | ✂ cut (4mm) | DUPLICATE at same Y, X + 129mm
// Pre-printed stationery has TWO header boxes side by side.
// Software fills field VALUES at absolute mm positions — no labels printed.
// Coordinates stored in settings.coordinate_positions (JSON), else use defaults.
function generateCoordinate2CopyHTML(form, settings) {
  const fontSize = parseInt(settings?.print_font_size || 10)

  // Default positions (mm from left edge of each copy).
  // Derived from Bhagwati's old LSTCoordinate table (1/100 inch × 0.254 = mm),
  // right column compressed from 152mm → 90mm to fit within 125mm copy width.
  const defaultPos = {
    ticket_no:    { x: 3,  y: 36 },
    material:     { x: 45, y: 36 },
    vehicle_no:   { x: 90, y: 36 },
    receiver:     { x: 3,  y: 43 },
    supplier:     { x: 60, y: 43 },
    charges:      { x: 90, y: 43 },
    gross_weight: { x: 3,  y: 52 },
    gross_date:   { x: 45, y: 52 },
    gross_time:   { x: 90, y: 52 },
    tare_weight:  { x: 3,  y: 60 },
    tare_date:    { x: 45, y: 60 },
    tare_time:    { x: 90, y: 60 },
    net_weight:   { x: 3,  y: 68 },
    royalty_no:   { x: 60, y: 68 },
  }

  let pos = defaultPos
  try {
    if (settings?.coordinate_positions) {
      pos = { ...defaultPos, ...JSON.parse(settings.coordinate_positions) }
    }
  } catch (_) {}

  const fields = {
    ticket_no:    esc(String(form.ticket_no || '')),
    material:     esc(String(form.material_name || '')),
    vehicle_no:   esc(String(form.vehicle_no || '')),
    receiver:     esc(String(form.receiver_name || '')),
    supplier:     esc(String(form.supplier_name || '')),
    charges:      esc(formatNum(form.charges)),
    gross_weight: esc(formatWt(form.gross_weight)),
    gross_date:   esc(String(form.gross_date || '')),
    gross_time:   esc(String(form.gross_time || '')),
    tare_weight:  esc(formatWt(form.tare_weight)),
    tare_date:    esc(String(form.tare_date || '')),
    tare_time:    esc(String(form.tare_time || '')),
    net_weight:   esc(formatWt(form.net_weight)),
    royalty_no:   esc(String(form.royalty_no || '')),
  }

  // Build positioned divs for one copy; xOffset shifts DUPLICATE right by 129mm
  const renderFields = (xOffset) =>
    Object.entries(pos)
      .filter(([key]) => fields[key])
      .map(([key, p]) =>
        `<div style="position:absolute;left:${p.x + xOffset}mm;top:${p.y}mm;` +
        `font-size:${fontSize}pt;font-weight:bold;white-space:nowrap;">${fields[key]}</div>`
      ).join('\n')

  // 125mm per copy + 4mm cut line = 129mm offset for DUPLICATE
  const COPY_W = 125
  const CUT_W  = 4
  const OFFSET  = COPY_W + CUT_W

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { margin:0; background:white; }
  @media print {
    @page { size: 254mm auto; margin:0; }
    body { margin:0; }
  }
</style>
</head>
<body>
<div id="wrap" style="position:relative;width:254mm;height:101mm;background:white;
  font-family:'Courier New',Courier,monospace;color:#000;">

  <!-- Cut line -->
  <div style="position:absolute;left:${COPY_W}mm;top:0;width:${CUT_W}mm;height:101mm;
    border-left:1px dashed #000;border-right:1px dashed #000;
    display:flex;align-items:center;justify-content:center;font-size:9pt;">✂</div>

  <!-- ORIGINAL fields -->
  ${renderFields(0)}

  <!-- DUPLICATE fields -->
  ${renderFields(OFFSET)}

</div>
</body>
</html>`
}

// ─── MODE 3: TRACTOR 2-COPY (10"×12", 4" cut, pre-printed header) ────────────
// Paper: 254mm wide × 101mm tall per form
// Layout: ORIGINAL (125mm) | ✂ cut (4mm) | DUPLICATE (125mm)
// Top: blank header space for pre-printed stationery (default 28mm)
// Bottom: data area (~73mm) printed by software
function generateTractor2CopyHTML(form, settings) {
  const headerMM = parseInt(settings?.header_space_mm || 28)
  const footer = settings?.ticket_footer ||
    "Please check weight. No responsibility accepted once carrier leaves."

  const date = form.gross_date || form.tare_date || "—"
  const time = form.gross_time || form.tare_time || "—"

  const copy = (label) => `
<div style="font-family:Arial,sans-serif;font-size:8pt;color:#000;padding:0 3mm;box-sizing:border-box;">

  <div style="height:${headerMM}mm;"></div>

  <div style="border-top:1px solid #000;"></div>

  <table style="width:100%;border-collapse:collapse;font-size:7.5pt;margin:0.5mm 0;">
    <tr>
      <td style="white-space:nowrap;padding:0.3mm 0;">No. <b>${esc(form.ticket_no)}</b></td>
      <td style="text-align:center;white-space:nowrap;padding:0.3mm 0;">${esc(date)}</td>
      <td style="text-align:right;font-weight:bold;white-space:nowrap;padding:0.3mm 0;">${label}</td>
    </tr>
    <tr>
      <td style="padding-bottom:0.4mm;white-space:nowrap;">Time: <b>${esc(time)}</b></td>
      <td></td>
      <td style="text-align:right;padding-bottom:0.4mm;font-size:7pt;">80 MT</td>
    </tr>
  </table>

  <div style="border-top:1px solid #000;"></div>

  <table style="width:100%;border-collapse:collapse;font-size:7.5pt;">
    <tr>
      <td style="width:17mm;white-space:nowrap;padding:0.4mm 0;">Sender</td>
      <td style="width:4mm;padding:0.4mm 1mm;">:</td>
      <td style="padding:0.4mm 0;"><b>${esc(form.supplier_name || "—")}</b></td>
    </tr>
    <tr>
      <td style="white-space:nowrap;padding:0.4mm 0;">Reciver</td>
      <td style="padding:0.4mm 1mm;">:</td>
      <td style="padding:0.4mm 0;"><b>${esc(form.receiver_name || "—")}</b></td>
    </tr>
    <tr>
      <td style="white-space:nowrap;padding:0.4mm 0;">Item</td>
      <td style="padding:0.4mm 1mm;">:</td>
      <td style="padding:0.4mm 0;"><b>${esc(form.material_name || "—")}</b></td>
    </tr>
    <tr>
      <td style="white-space:nowrap;padding:0.4mm 0;">Vehicle</td>
      <td style="padding:0.4mm 1mm;">:</td>
      <td style="padding:0.4mm 0;"><b>${esc(form.vehicle_no || "—")}</b></td>
      <td style="text-align:right;white-space:nowrap;padding:0.4mm 0;">Rs. <b>${formatNum(form.charges)}</b></td>
    </tr>
  </table>

  <div style="border-top:1px solid #000;"></div>

  <table style="width:100%;border-collapse:collapse;font-size:8pt;">
    <tr>
      <td style="padding:0.5mm 0;">Gross</td>
      <td style="text-align:right;padding:0.5mm 0;font-weight:bold;">${formatWt(form.gross_weight)}</td>
      <td style="padding:0.5mm 0 0.5mm 1mm;white-space:nowrap;">Kg</td>
    </tr>
    <tr>
      <td style="padding:0.3mm 0;">Tare</td>
      <td style="text-align:right;padding:0.3mm 0;font-weight:bold;">${formatWt(form.tare_weight)}</td>
      <td style="padding:0.3mm 0 0.3mm 1mm;white-space:nowrap;">Kg</td>
    </tr>
    <tr style="border-top:1px solid #000;">
      <td style="padding:0.5mm 0;font-weight:bold;">Net</td>
      <td style="text-align:right;padding:0.5mm 0;font-weight:bold;">${formatWt(form.net_weight)}</td>
      <td style="padding:0.5mm 0 0.5mm 1mm;white-space:nowrap;font-weight:bold;">Kg</td>
    </tr>
  </table>

  <div style="border-top:1px solid #000;"></div>

  <table style="width:100%;border-collapse:collapse;font-size:5.5pt;margin-top:0.5mm;">
    <tr>
      <td style="font-style:italic;">${esc(footer)}</td>
      <td style="text-align:right;white-space:nowrap;font-size:7pt;">Operator:______</td>
    </tr>
  </table>

</div>`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { margin:0; background:white; }
  @media print {
    @page { size: 254mm auto; margin:0; }
    body { margin:0; }
  }
</style>
</head>
<body>
<div id="wrap" style="display:table;width:254mm;background:white;">
  <div style="display:table-row;">

    <div style="display:table-cell;width:125mm;vertical-align:top;">
      ${copy('ORIGINAL')}
    </div>

    <div style="display:table-cell;width:4mm;vertical-align:middle;text-align:center;
      border-left:1px dashed #000;border-right:1px dashed #000;
      font-size:9pt;color:#000;">✂</div>

    <div style="display:table-cell;width:125mm;vertical-align:top;">
      ${copy('DUPLICATE')}
    </div>

  </div>
</div>
</body>
</html>`
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
