import type { ResolvedRoomRent, RoomItem } from '../types/appData';

export type ReportCadence = 'Weekly' | 'Monthly' | 'Yearly';

export interface ReportPeriodData {
  id: string;
  label: string;
  fullTitle: string;
  shortLabel: string;
  asOfDate: string;
  netProfit: string;
  totalInflow: string;
  totalOutflow: string;
  profitMargin: string;
  rentRevenue: string;
  maintenanceCollected: string;
  repairsExpense: string;
  utilitiesExpense: string;
  staffExpense: string;
  occupancyText: string;
  collectionText: string;
  pendingText: string;
  chartIncomeK: number;
  chartExpenseK: number;
}

export interface ReportRoomRow {
  room: string;
  tenant: string;
  rentDue: string;
  received: string;
  status: 'Paid' | 'Pending' | 'Vacant';
}

export interface ReportOccupancyStats {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  occupiedPct: string;
  vacantPct: string;
}

export function buildOccupancyStats(rooms: RoomItem[]): ReportOccupancyStats {
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status !== 'Vacant').length;
  const vacantRooms = Math.max(0, totalRooms - occupiedRooms);
  const denom = Math.max(totalRooms, 1);
  return {
    totalRooms,
    occupiedRooms,
    vacantRooms,
    occupiedPct: totalRooms > 0 ? ((occupiedRooms / denom) * 100).toFixed(1) : '0.0',
    vacantPct: totalRooms > 0 ? ((vacantRooms / denom) * 100).toFixed(1) : '0.0',
  };
}

export function buildReportRoomRows(
  rooms: RoomItem[],
  rentList?: ResolvedRoomRent[]
): ReportRoomRow[] {
  const rentById = new Map((rentList ?? []).map((item) => [item.id, item]));
  return rooms.slice(0, 12).map((r) => {
    const cleanRent = r.monthlyRent.replace(/^₹\s*/, 'Rs. ');
    const isVacant = r.status === 'Vacant';
    const rentEntry = rentById.get(r.id);
    const isDue = rentEntry
      ? rentEntry.currentStatus === 'Due' || rentEntry.currentStatus === 'Overdue'
      : r.status === 'Rent due';
    return {
      room: r.roomNumber,
      tenant: isVacant ? 'Vacant Unit' : rentEntry?.tenantName || r.members[0]?.name || 'Resident',
      rentDue: cleanRent,
      received: isVacant || isDue ? 'Rs. 0' : cleanRent,
      status: isVacant ? 'Vacant' : isDue ? 'Pending' : 'Paid',
    };
  });
}

function toPdfCurrency(val: string): string {
  return val.replace(/₹\s*/g, 'Rs. ');
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPlainTextReport(
  cadence: ReportCadence,
  data: ReportPeriodData,
  occupancy: ReportOccupancyStats
): string {
  return [
    'LUVORA RENTAL MANAGEMENT - RENTAL INCOME REPORT',
    `Reporting period: ${data.fullTitle} (As of ${data.asOfDate})`,
    '========================================',
    '1. EXECUTIVE SUMMARY',
    `Total Rooms       : ${occupancy.totalRooms}`,
    `Occupied Rooms    : ${occupancy.occupiedRooms}`,
    `Rent Billed       : ${toPdfCurrency(data.totalInflow)}`,
    `Rent Collected    : ${toPdfCurrency(data.rentRevenue)}`,
    `Net Profit        : ${toPdfCurrency(data.netProfit)} (${data.profitMargin})`,
    '',
    '2. RENT COLLECTION SUMMARY',
    `Total Inflow      : ${toPdfCurrency(data.totalInflow)}`,
    `Total Outflow     : ${toPdfCurrency(data.totalOutflow)}`,
    `Pending Dues      : ${toPdfCurrency(data.pendingText)}`,
    '',
    '3. OCCUPANCY OVERVIEW',
    `Occupied          : ${occupancy.occupiedRooms} (${occupancy.occupiedPct}%)`,
    `Vacant            : ${occupancy.vacantRooms} (${occupancy.vacantPct}%)`,
    '========================================',
  ].join('\n');
}

export function buildCsvReport(cadence: ReportCadence, data: ReportPeriodData): string {
  return [
    'Report Type,Period,As Of Date,Metric,Value',
    `"${cadence}","${data.fullTitle}","${data.asOfDate}","Rent Revenue","${data.rentRevenue}"`,
    `"${cadence}","${data.fullTitle}","${data.asOfDate}","Maintenance Collected","${data.maintenanceCollected}"`,
    `"${cadence}","${data.fullTitle}","${data.asOfDate}","Total Inflow","${data.totalInflow}"`,
    `"${cadence}","${data.fullTitle}","${data.asOfDate}","Repairs & Maintenance","${data.repairsExpense}"`,
    `"${cadence}","${data.fullTitle}","${data.asOfDate}","Utilities & Power","${data.utilitiesExpense}"`,
    `"${cadence}","${data.fullTitle}","${data.asOfDate}","Housekeeping & Staff","${data.staffExpense}"`,
    `"${cadence}","${data.fullTitle}","${data.asOfDate}","Total Outflow","${data.totalOutflow}"`,
    `"${cadence}","${data.fullTitle}","${data.asOfDate}","Net Operating Profit","${data.netProfit}"`,
    `"${cadence}","${data.fullTitle}","${data.asOfDate}","Profit Margin","${data.profitMargin}"`,
    `"${cadence}","${data.fullTitle}","${data.asOfDate}","Occupancy","${data.occupancyText}"`,
    `"${cadence}","${data.fullTitle}","${data.asOfDate}","Collected","${data.collectionText}"`,
    `"${cadence}","${data.fullTitle}","${data.asOfDate}","Pending Dues","${data.pendingText}"`,
  ].join('\n');
}

/** Generates the 2-page A4 HTML template matching the sample Rental Income Report PDF layout. */
export function buildRentalIncomeHtmlReport(
  cadence: ReportCadence,
  data: ReportPeriodData,
  roomRows: ReportRoomRow[],
  occupancy: ReportOccupancyStats
): string {
  const billedStr = toPdfCurrency(data.totalInflow);
  const collectedStr = toPdfCurrency(data.rentRevenue);
  const outflowStr = toPdfCurrency(data.totalOutflow);
  const netProfitStr = toPdfCurrency(data.netProfit);
  const pendingStr = toPdfCurrency(data.pendingText);
  const repairsStr = toPdfCurrency(data.repairsExpense);

  const roomRowsHtml = roomRows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.room)}</td>
        <td>${escapeHtml(row.tenant)}</td>
        <td class="num">${escapeHtml(row.rentDue)}</td>
        <td class="num">${escapeHtml(row.received)}</td>
        <td>${escapeHtml(row.status)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Luvora ${escapeHtml(cadence)} Rental Income Report</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #17121D; margin: 0; padding: 0; font-size: 11px; line-height: 1.45; }
  .page { page-break-after: always; min-height: 256mm; display: flex; flex-direction: column; justify-content: space-between; }
  .page:last-child { page-break-after: auto; }
  .top-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1.5px solid #17121D; padding-bottom: 10px; margin-bottom: 18px; }
  .brand-title { font-size: 24px; font-weight: 700; color: #17121D; line-height: 1; }
  .brand-sub { font-size: 9px; font-weight: 700; color: #000000; letter-spacing: 1.1px; margin-top: 4px; }
  .report-meta { text-align: right; }
  .report-type { font-size: 11px; font-weight: 700; color: #17121D; letter-spacing: 0.4px; }
  .report-period { font-size: 10px; color: #000000; margin-top: 2px; }
  h2 { font-size: 13.5px; font-weight: 700; color: #17121D; margin: 18px 0 6px; }
  p { margin: 0 0 10px; color: #000000; font-size: 10.5px; }
  .kpi-grid { display: table; width: 100%; border: 1px solid #D4D4D8; background: #F7F7F8; margin-bottom: 6px; table-layout: fixed; }
  .kpi-cell { display: table-cell; padding: 10px 12px; border-right: 1px solid #E4E4E7; vertical-align: top; }
  .kpi-cell:last-child { border-right: none; }
  .kpi-label { font-size: 8px; font-weight: 700; color: #000000; letter-spacing: 0.5px; margin-bottom: 4px; text-transform: uppercase; }
  .kpi-val { font-size: 15px; font-weight: 700; color: #17121D; }
  table.data { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.data th { background: #17121D; color: #F8F5FC; text-align: left; padding: 7px 9px; font-size: 10px; font-weight: 700; }
  table.data th.num, table.data td.num { text-align: right; }
  table.data td { padding: 6.5px 9px; border-bottom: 1px solid #E5E7EB; font-size: 10px; color: #17121D; }
  table.data tr:nth-child(even) td { background: #F8F8FA; }
  table.data tr.total-row td { font-weight: 700; background: #F8F5FC; border-bottom: 1.5px solid #17121D; }
  .table-note { font-size: 9px; color: #000000; margin-top: 6px; }
  ul.actions { margin: 8px 0 16px; padding-left: 16px; color: #000000; }
  ul.actions li { margin-bottom: 8px; font-size: 10.5px; }
  .signatures { display: table; width: 100%; margin-top: 34px; table-layout: fixed; }
  .sig-col { display: table-cell; width: 50%; padding-right: 28px; vertical-align: top; }
  .sig-title { font-size: 10.5px; font-weight: 700; color: #17121D; margin-bottom: 28px; }
  .sig-line { border-top: 1px solid #17121D; padding-top: 5px; font-size: 9.5px; color: #000000; width: 210px; }
  .page-footer { display: flex; justify-content: space-between; border-top: 1px solid #D4D4D8; padding-top: 8px; margin-top: 18px; font-size: 9px; color: #000000; }
</style>
</head>
<body>
  <div class="page">
    <div>
      <div class="top-header">
        <div>
          <div class="brand-title">Luvora</div>
          <div class="brand-sub">RENTAL MANAGEMENT</div>
        </div>
        <div class="report-meta">
          <div class="report-type">RENTAL INCOME REPORT</div>
          <div class="report-period">Reporting period: ${escapeHtml(data.fullTitle)}</div>
        </div>
      </div>

      <h2>1. Executive Summary</h2>
      <p>This report summarises ${escapeHtml(cadence.toLowerCase())} rental performance for ${escapeHtml(data.fullTitle)} (till ${escapeHtml(data.asOfDate)}). It covers occupancy, rent billed, payments received, expenses and room accounts.</p>

      <div class="kpi-grid">
        <div class="kpi-cell"><div class="kpi-label">TOTAL ROOMS</div><div class="kpi-val">${occupancy.totalRooms}</div></div>
        <div class="kpi-cell"><div class="kpi-label">OCCUPIED ROOMS</div><div class="kpi-val">${occupancy.occupiedRooms}</div></div>
        <div class="kpi-cell"><div class="kpi-label">RENT BILLED</div><div class="kpi-val">${escapeHtml(billedStr)}</div></div>
        <div class="kpi-cell"><div class="kpi-label">RENT COLLECTED</div><div class="kpi-val">${escapeHtml(collectedStr)}</div></div>
      </div>

      <h2>2. Rent Collection Summary</h2>
      <p>Total inflow was ${escapeHtml(billedStr)} with ${escapeHtml(outflowStr)} in operating expenses, resulting in ${escapeHtml(netProfitStr)} net operating profit (${escapeHtml(data.profitMargin)} margin).</p>
      <table class="data">
        <thead>
          <tr><th>Description</th><th class="num">Amount</th><th class="num">Share</th></tr>
        </thead>
        <tbody>
          <tr><td>Total rent billed / inflow</td><td class="num">${escapeHtml(billedStr)}</td><td class="num">100.0%</td></tr>
          <tr><td>Rent collected</td><td class="num">${escapeHtml(collectedStr)}</td><td class="num">${escapeHtml(data.profitMargin)}</td></tr>
          <tr><td>Operating expenses</td><td class="num">${escapeHtml(outflowStr)}</td><td class="num">Outflow</td></tr>
          <tr class="total-row"><td>Net operating profit</td><td class="num">${escapeHtml(netProfitStr)}</td><td class="num">${escapeHtml(data.profitMargin)}</td></tr>
        </tbody>
      </table>

      <h2>3. Room-wise Payment Details</h2>
      <table class="data">
        <thead>
          <tr><th>Room</th><th>Tenant</th><th class="num">Rent due</th><th class="num">Received</th><th>Status</th></tr>
        </thead>
        <tbody>${roomRowsHtml}</tbody>
      </table>
      <div class="table-note">Note: Shows room accounts as of ${escapeHtml(data.asOfDate)} for ${escapeHtml(cadence.toLowerCase())} reporting.</div>

      <h2>4. Occupancy Overview</h2>
      <table class="data">
        <thead>
          <tr><th>Room status</th><th class="num">Count</th><th class="num">Percentage</th></tr>
        </thead>
        <tbody>
          <tr><td>Occupied</td><td class="num">${occupancy.occupiedRooms}</td><td class="num">${occupancy.occupiedPct}%</td></tr>
          <tr><td>Vacant</td><td class="num">${occupancy.vacantRooms}</td><td class="num">${occupancy.vacantPct}%</td></tr>
          <tr class="total-row"><td>Total</td><td class="num">${occupancy.totalRooms}</td><td class="num">100.0%</td></tr>
        </tbody>
      </table>
    </div>
    <div class="page-footer">
      <span>Luvora Rental Management | ${escapeHtml(cadence)} report (Till ${escapeHtml(data.asOfDate)})</span>
      <span>Page 1</span>
    </div>
  </div>

  <div class="page">
    <div>
      <h2>5. Observations and Recommended Actions</h2>
      <ul class="actions">
        <li><strong>Follow up on outstanding dues:</strong> Contact tenants with pending balances (${escapeHtml(pendingStr)}) and record expected payment dates.</li>
        <li><strong>Review vacant rooms:</strong> Confirm availability, maintenance readiness and listing status for the ${occupancy.vacantRooms} vacant room(s).</li>
        <li><strong>Reconcile receipts:</strong> Match recorded UPI, cash and bank payments against statements before closing as of ${escapeHtml(data.asOfDate)}.</li>
        <li><strong>Review expenses:</strong> Track repairs and maintenance (${escapeHtml(repairsStr)}) separately from standard monthly rent receipts.</li>
      </ul>

      <h2>6. Report Notes</h2>
      <p>Prepared for internal rental-management review covering ${escapeHtml(data.fullTitle)} up to ${escapeHtml(data.asOfDate)}. Verify all pending receipts and deposit adjustments prior to external sharing.</p>

      <div class="signatures">
        <div class="sig-col">
          <div class="sig-title">Prepared by</div>
          <div class="sig-line">Name / Date</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Reviewed by</div>
          <div class="sig-line">Name / Date</div>
        </div>
      </div>
    </div>
    <div class="page-footer">
      <span>Luvora Rental Management | ${escapeHtml(cadence)} report (Till ${escapeHtml(data.asOfDate)})</span>
      <span>Page 2</span>
    </div>
  </div>
</body>
</html>`;
}

// --- Pure-TypeScript Vector PDF Generator for Instant Web .pdf Download ---

function sanitizePdfText(raw: string): string {
  return toPdfCurrency(raw)
    .replace(/[–—]/g, '-')
    .replace(/·/g, '|')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function estimateTextWidth(text: string, fontSize: number, bold: boolean): number {
  let units = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === ' ' || ch === '.' || ch === ',' || ch === ':' || ch === '|') units += 0.28;
    else if (ch >= '0' && ch <= '9') units += 0.56;
    else if (ch >= 'A' && ch <= 'Z') units += 0.67;
    else units += 0.50;
  }
  return units * fontSize * (bold ? 1.06 : 1.0);
}

class PdfCanvas {
  private ops: string[] = [];

  rectFill(x: number, top: number, w: number, h: number, r: number, g: number, b: number) {
    const pdfY = 842 - top - h;
    this.ops.push(`${r} ${g} ${b} rg ${x.toFixed(1)} ${pdfY.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
  }

  rectStroke(x: number, top: number, w: number, h: number, r: number, g: number, b: number, lw = 0.75) {
    const pdfY = 842 - top - h;
    this.ops.push(`${lw} w ${r} ${g} ${b} RG ${x.toFixed(1)} ${pdfY.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S`);
  }

  line(x1: number, top1: number, x2: number, top2: number, r: number, g: number, b: number, lw = 0.75) {
    const y1 = 842 - top1;
    const y2 = 842 - top2;
    this.ops.push(`${lw} w ${r} ${g} ${b} RG ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
  }

  text(
    str: string,
    x: number,
    top: number,
    size: number,
    bold: boolean,
    r: number,
    g: number,
    b: number,
    align: 'left' | 'right' = 'left'
  ) {
    const clean = toPdfCurrency(str).replace(/[–—]/g, '-').replace(/·/g, '|');
    const drawX =
      align === 'right' ? x - estimateTextWidth(clean, size, bold) : x;
    const pdfY = 842 - top;
    const fontKey = bold ? 'F2' : 'F1';
    this.ops.push(
      `BT /${fontKey} ${size} Tf ${r} ${g} ${b} rg 1 0 0 1 ${drawX.toFixed(1)} ${pdfY.toFixed(1)} Tm (${sanitizePdfText(clean)}) Tj ET`
    );
  }

  bulletText(str: string, x: number, top: number, size: number) {
    const pdfY = 842 - top;
    this.ops.push(
      `BT /F1 ${size} Tf 0.13 0.13 0.15 rg 1 0 0 1 ${x.toFixed(1)} ${pdfY.toFixed(1)} Tm (\\225  ${sanitizePdfText(str)}) Tj ET`
    );
  }

  toStream(): string {
    return this.ops.join('\n');
  }
}

/** Builds a valid 2-page A4 %PDF-1.4 binary matching the Rental Income Report layout for direct Web download. */
export function buildRentalIncomePdfBytes(
  cadence: ReportCadence,
  data: ReportPeriodData,
  roomRows: ReportRoomRow[],
  occupancy: ReportOccupancyStats
): Uint8Array {
  const p1 = new PdfCanvas();

  // Page 1 Header
  p1.text('Luvora', 42, 60, 22, true, 0.09, 0.07, 0.11);
  p1.text('RENTAL MANAGEMENT', 42, 74, 8.5, true, 0.41, 0.38, 0.44);
  p1.text('RENTAL INCOME REPORT', 553, 56, 10.5, true, 0.09, 0.07, 0.11, 'right');
  p1.text(`Reporting period: ${data.fullTitle}`, 553, 70, 9, false, 0.41, 0.38, 0.44, 'right');
  p1.line(42, 84, 553, 84, 0.09, 0.07, 0.11, 1.5);

  // 1. Executive Summary
  p1.text('1. Executive Summary', 42, 108, 12.5, true, 0.09, 0.07, 0.11);
  p1.text(
    `This report summarises ${cadence.toLowerCase()} rental performance for ${data.fullTitle} (till ${data.asOfDate}).`,
    42,
    125,
    9.5,
    false,
    0.27,
    0.27,
    0.3
  );
  p1.text(
    'It covers occupancy, rent billed, payments received, expenses and room accounts.',
    42,
    138,
    9.5,
    false,
    0.27,
    0.27,
    0.3
  );

  // 4-Column KPI Grid
  const kpiTop = 152;
  const kpiH = 50;
  const colW = 511 / 4;
  p1.rectFill(42, kpiTop, 511, kpiH, 0.96, 0.96, 0.97);
  p1.rectStroke(42, kpiTop, 511, kpiH, 0.82, 0.82, 0.85, 0.75);
  for (let i = 1; i < 4; i += 1) {
    const vx = 42 + colW * i;
    p1.line(vx, kpiTop, vx, kpiTop + kpiH, 0.86, 0.86, 0.89, 0.75);
  }
  const kpis = [
    { label: 'TOTAL ROOMS', val: String(occupancy.totalRooms) },
    { label: 'OCCUPIED ROOMS', val: String(occupancy.occupiedRooms) },
    { label: 'RENT BILLED', val: toPdfCurrency(data.totalInflow) },
    { label: 'RENT COLLECTED', val: toPdfCurrency(data.rentRevenue) },
  ];
  kpis.forEach((k, idx) => {
    const cx = 42 + colW * idx + 10;
    p1.text(k.label, cx, kpiTop + 16, 7.5, true, 0.41, 0.38, 0.44);
    p1.text(k.val, cx, kpiTop + 37, 13.5, true, 0.09, 0.07, 0.11);
  });

  // 2. Rent Collection Summary
  p1.text('2. Rent Collection Summary', 42, 228, 12.5, true, 0.09, 0.07, 0.11);
  p1.text(
    `Total inflow: ${data.totalInflow}  |  Outflow: ${data.totalOutflow}  |  Net profit: ${data.netProfit} (${data.profitMargin})`,
    42,
    244,
    9.5,
    false,
    0.27,
    0.27,
    0.3
  );

  let ty = 258;
  p1.rectFill(42, ty, 511, 21, 0.09, 0.07, 0.11);
  p1.text('Description', 50, ty + 14, 9.5, true, 1, 1, 1);
  p1.text('Amount', 420, ty + 14, 9.5, true, 1, 1, 1, 'right');
  p1.text('Share', 543, ty + 14, 9.5, true, 1, 1, 1, 'right');
  ty += 21;

  const summaryRows = [
    { desc: 'Total rent billed / inflow', amt: data.totalInflow, share: '100.0%', bold: false },
    { desc: 'Rent collected', amt: data.rentRevenue, share: data.profitMargin, bold: false },
    { desc: 'Operating expenses', amt: data.totalOutflow, share: 'Outflow', bold: false },
    { desc: 'Net operating profit', amt: data.netProfit, share: data.profitMargin, bold: true },
  ];
  summaryRows.forEach((row, idx) => {
    if (idx % 2 === 1 && !row.bold) p1.rectFill(42, ty, 511, 21, 0.97, 0.97, 0.98);
    p1.text(row.desc, 50, ty + 14, 9.5, row.bold, 0.09, 0.07, 0.11);
    p1.text(row.amt, 420, ty + 14, 9.5, row.bold, 0.09, 0.07, 0.11, 'right');
    p1.text(row.share, 543, ty + 14, 9.5, row.bold, 0.09, 0.07, 0.11, 'right');
    ty += 21;
    p1.line(42, ty, 553, ty, row.bold ? 0.09 : 0.88, row.bold ? 0.07 : 0.88, row.bold ? 0.11 : 0.9, row.bold ? 1.2 : 0.6);
  });

  // 3. Room-wise Payment Details
  p1.text('3. Room-wise Payment Details', 42, 392, 12.5, true, 0.09, 0.07, 0.11);
  let ry = 406;
  p1.rectFill(42, ry, 511, 21, 0.09, 0.07, 0.11);
  p1.text('Room', 50, ry + 14, 9.5, true, 1, 1, 1);
  p1.text('Tenant', 120, ry + 14, 9.5, true, 1, 1, 1);
  p1.text('Rent due', 350, ry + 14, 9.5, true, 1, 1, 1, 'right');
  p1.text('Received', 448, ry + 14, 9.5, true, 1, 1, 1, 'right');
  p1.text('Status', 468, ry + 14, 9.5, true, 1, 1, 1);
  ry += 21;

  roomRows.forEach((row, idx) => {
    if (idx % 2 === 1) p1.rectFill(42, ry, 511, 20, 0.97, 0.97, 0.98);
    p1.text(row.room, 50, ry + 13.5, 9, false, 0.09, 0.07, 0.11);
    p1.text(row.tenant, 120, ry + 13.5, 9, false, 0.09, 0.07, 0.11);
    p1.text(row.rentDue, 350, ry + 13.5, 9, false, 0.09, 0.07, 0.11, 'right');
    p1.text(row.received, 448, ry + 13.5, 9, false, 0.09, 0.07, 0.11, 'right');
    p1.text(row.status, 468, ry + 13.5, 9, false, 0.09, 0.07, 0.11);
    ry += 20;
    p1.line(42, ry, 553, ry, 0.88, 0.88, 0.9, 0.6);
  });

  p1.text(
    `Note: Shows room accounts as of ${data.asOfDate} for ${cadence.toLowerCase()} reporting.`,
    42,
    ry + 14,
    8.5,
    false,
    0.41,
    0.38,
    0.44
  );

  // 4. Occupancy Overview
  const occHeadingTop = Math.max(ry + 40, 628);
  p1.text('4. Occupancy Overview', 42, occHeadingTop, 12.5, true, 0.09, 0.07, 0.11);
  let oy = occHeadingTop + 14;
  p1.rectFill(42, oy, 511, 21, 0.09, 0.07, 0.11);
  p1.text('Room status', 50, oy + 14, 9.5, true, 1, 1, 1);
  p1.text('Count', 415, oy + 14, 9.5, true, 1, 1, 1, 'right');
  p1.text('Percentage', 543, oy + 14, 9.5, true, 1, 1, 1, 'right');
  oy += 21;

  const occRows = [
    { label: 'Occupied', count: String(occupancy.occupiedRooms), pct: `${occupancy.occupiedPct}%`, bold: false },
    { label: 'Vacant', count: String(occupancy.vacantRooms), pct: `${occupancy.vacantPct}%`, bold: false },
    { label: 'Total', count: String(occupancy.totalRooms), pct: '100.0%', bold: true },
  ];
  occRows.forEach((row, idx) => {
    if (idx % 2 === 1 && !row.bold) p1.rectFill(42, oy, 511, 21, 0.97, 0.97, 0.98);
    p1.text(row.label, 50, oy + 14, 9.5, row.bold, 0.09, 0.07, 0.11);
    p1.text(row.count, 415, oy + 14, 9.5, row.bold, 0.09, 0.07, 0.11, 'right');
    p1.text(row.pct, 543, oy + 14, 9.5, row.bold, 0.09, 0.07, 0.11, 'right');
    oy += 21;
    p1.line(42, oy, 553, oy, row.bold ? 0.09 : 0.88, row.bold ? 0.07 : 0.88, row.bold ? 0.11 : 0.9, row.bold ? 1.2 : 0.6);
  });

  // Page 1 Footer
  p1.line(42, 796, 553, 796, 0.82, 0.82, 0.85, 0.75);
  p1.text(`Luvora Rental Management | ${cadence} report (Till ${data.asOfDate})`, 42, 812, 8.5, false, 0.41, 0.38, 0.44);
  p1.text('Page 1', 553, 812, 8.5, false, 0.41, 0.38, 0.44, 'right');

  // Page 2
  const p2 = new PdfCanvas();
  p2.text('5. Observations and Recommended Actions', 42, 62, 12.5, true, 0.09, 0.07, 0.11);
  p2.bulletText(
    `Follow up on outstanding dues (${data.pendingText}): Contact tenants with unpaid balances.`,
    46,
    86,
    9.5
  );
  p2.bulletText(
    `Review vacant rooms: Confirm readiness and listing status for ${occupancy.vacantRooms} vacant room(s).`,
    46,
    106,
    9.5
  );
  p2.bulletText(
    `Reconcile receipts: Match UPI, cash and bank statements before closing as of ${data.asOfDate}.`,
    46,
    126,
    9.5
  );
  p2.bulletText(
    `Review expenses: Audit maintenance repairs (${data.repairsExpense}) separately from rent receipts.`,
    46,
    146,
    9.5
  );

  p2.text('6. Report Notes', 42, 190, 12.5, true, 0.09, 0.07, 0.11);
  p2.text(
    `Prepared for internal rental-management review covering ${data.fullTitle} up to ${data.asOfDate}.`,
    42,
    210,
    9.5,
    false,
    0.27,
    0.27,
    0.3
  );
  p2.text(
    'Verify pending receipts and deposit adjustments prior to sharing externally.',
    42,
    224,
    9.5,
    false,
    0.27,
    0.27,
    0.3
  );

  p2.text('Prepared by', 42, 272, 10, true, 0.09, 0.07, 0.11);
  p2.line(42, 308, 222, 308, 0.09, 0.07, 0.11, 0.9);
  p2.text('Name / Date', 42, 322, 9, false, 0.41, 0.38, 0.44);

  p2.text('Reviewed by', 310, 272, 10, true, 0.09, 0.07, 0.11);
  p2.line(310, 308, 490, 308, 0.09, 0.07, 0.11, 0.9);
  p2.text('Name / Date', 310, 322, 9, false, 0.41, 0.38, 0.44);

  p2.line(42, 796, 553, 796, 0.82, 0.82, 0.85, 0.75);
  p2.text(`Luvora Rental Management | ${cadence} report (Till ${data.asOfDate})`, 42, 812, 8.5, false, 0.41, 0.38, 0.44);
  p2.text('Page 2', 553, 812, 8.5, false, 0.41, 0.38, 0.44, 'right');

  const s1 = p1.toStream();
  const s2 = p2.toStream();

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 7 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 8 0 R >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
    `7 0 obj\n<< /Length ${s1.length} >>\nstream\n${s1}\nendstream\nendobj\n`,
    `8 0 obj\n<< /Length ${s2.length} >>\nstream\n${s2}\nendstream\nendobj\n`,
  ];

  let doc = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(doc.length);
    doc += obj;
  }

  const xrefOffset = doc.length;
  doc += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    doc += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  doc += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const bytes = new Uint8Array(doc.length);
  for (let i = 0; i < doc.length; i += 1) {
    bytes[i] = doc.charCodeAt(i) & 0xff;
  }
  return bytes;
}

