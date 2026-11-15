import type { ReportCadence, ReportPeriodData } from '../utils/rentalReportPdf';
import type {
  ResolvedRoomRent,
  RoomItem,
  RoomRentMeta,
  RoomRentStatus,
  TransactionItem,
} from '../types/appData';

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function parseRupeeAmount(raw: string): number {
  return parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
}

export function formatRupeeAmount(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}₹${Math.abs(rounded).toLocaleString('en-IN')}`;
}

export function formatShortDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS_SHORT[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function toIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Converts 'DD Mon YYYY' (e.g. '11 Nov 2026') to 'YYYY-MM-DD'. */
export function parseShortDateToIso(shortDate: string, fallback: Date = new Date()): string {
  const match = shortDate.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) return toIsoDate(fallback);
  const day = parseInt(match[1], 10);
  const monthIdx = MONTHS_SHORT.findIndex(
    (m) => m.toLowerCase() === match[2].toLowerCase()
  );
  const year = parseInt(match[3], 10);
  if (monthIdx === -1 || Number.isNaN(day) || Number.isNaN(year)) {
    return toIsoDate(fallback);
  }
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function extractCycleDayNumber(rentCycleDay?: string): number {
  const match = rentCycleDay?.match(/(\d{1,2})/);
  if (!match) return 1;
  const day = parseInt(match[1], 10);
  if (Number.isNaN(day) || day < 1 || day > 28) return 1;
  return day;
}

export function getDefaultDueDateLabel(
  referenceDate: Date = new Date(),
  rentCycleDay?: string
): string {
  const day = extractCycleDayNumber(rentCycleDay);
  return `${day} ${MONTHS_SHORT[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`;
}

export function sortRoomsByNumber(a: RoomItem, b: RoomItem): number {
  const numA = parseInt(a.roomNumber.replace(/[^0-9]/g, ''), 10);
  const numB = parseInt(b.roomNumber.replace(/[^0-9]/g, ''), 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
    return numA - numB;
  }
  return a.roomNumber.localeCompare(b.roomNumber);
}

/** Combines live Rooms state with persisted rent metadata into the Rent ledger list. */
export function deriveRoomRentList(
  rooms: RoomItem[],
  rentMetaByRoomId: Record<string, RoomRentMeta>,
  defaultCycle = 'Monthly',
  rentCycleDay?: string,
  referenceDate: Date = new Date()
): ResolvedRoomRent[] {
  const cycleDayNum = extractCycleDayNumber(rentCycleDay);
  const defaultDue = getDefaultDueDateLabel(referenceDate, rentCycleDay);

  return [...rooms]
    .filter((room) => room.status !== 'Vacant' || (rentMetaByRoomId[room.id]?.history.length ?? 0) > 0)
    .sort(sortRoomsByNumber)
    .map((room) => {
      const meta = rentMetaByRoomId[room.id];
      const primaryResident = room.members[0]?.name || (room.status === 'Vacant' ? 'Vacant' : 'Resident');
      const numericRent = parseRupeeAmount(room.monthlyRent);

      let currentStatus: RoomRentStatus;
      let statusBadgeText: string;

      if (meta) {
        currentStatus = meta.currentStatus;
        statusBadgeText = meta.statusBadgeText;
      } else if (room.status === 'Rent due') {
        currentStatus = 'Due';
        statusBadgeText = `Due ${MONTHS_SHORT[referenceDate.getMonth()]} ${cycleDayNum}`;
      } else {
        currentStatus = 'Paid';
        statusBadgeText = 'Paid';
      }

      // Sync room.status overrides if room was explicitly marked Rent due while meta was unset
      if (room.status === 'Rent due' && currentStatus === 'Paid' && !meta) {
        currentStatus = 'Due';
        statusBadgeText = `Due ${MONTHS_SHORT[referenceDate.getMonth()]} ${cycleDayNum}`;
      }

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        tenantName: primaryResident,
        wing: room.wing,
        maintenanceAmount: meta?.maintenanceAmount ?? '₹2,000',
        monthlyRent: formatRupeeAmount(numericRent),
        numericFullRent: numericRent,
        advancePayment: meta?.advancePayment ?? '₹0',
        dueDate: meta?.dueDate ?? defaultDue,
        paymentCycle: meta?.paymentCycle ?? defaultCycle,
        currentStatus,
        statusBadgeText,
        history: meta?.history ?? [],
      };
    });
}

function isRentIncome(tx: TransactionItem): boolean {
  const lower = tx.title.toLowerCase();
  return lower.includes('rent');
}

function classifyExpenseCategory(tx: TransactionItem): 'repairs' | 'utilities' | 'staff' {
  const combined = `${tx.title} ${tx.subtitle}`.toLowerCase();
  if (
    combined.includes('utilit') ||
    combined.includes('water') ||
    combined.includes('power') ||
    combined.includes('electric') ||
    combined.includes('internet') ||
    combined.includes('wifi')
  ) {
    return 'utilities';
  }
  if (
    combined.includes('staff') ||
    combined.includes('security') ||
    combined.includes('salary') ||
    combined.includes('housekeep') ||
    combined.includes('suppl')
  ) {
    return 'staff';
  }
  return 'repairs';
}

function aggregateTransactionsIntoPeriod(
  id: string,
  label: string,
  fullTitle: string,
  shortLabel: string,
  asOfDate: string,
  txs: TransactionItem[],
  rooms: RoomItem[],
  pendingAmountNum: number,
  collectedRoomsText?: string
): ReportPeriodData {
  let rentRevenue = 0;
  let maintenanceCollected = 0;
  let repairsExpense = 0;
  let utilitiesExpense = 0;
  let staffExpense = 0;

  for (const tx of txs) {
    if (tx.kind === 'income') {
      if (isRentIncome(tx)) {
        rentRevenue += tx.numericAmount;
      } else {
        maintenanceCollected += tx.numericAmount;
      }
    } else {
      const cat = classifyExpenseCategory(tx);
      if (cat === 'utilities') utilitiesExpense += tx.numericAmount;
      else if (cat === 'staff') staffExpense += tx.numericAmount;
      else repairsExpense += tx.numericAmount;
    }
  }

  const totalInflow = rentRevenue + maintenanceCollected;
  const totalOutflow = repairsExpense + utilitiesExpense + staffExpense;
  const netProfit = totalInflow - totalOutflow;
  const marginPct = totalInflow > 0 ? ((netProfit / totalInflow) * 100).toFixed(1) : '0.0';

  const totalRooms = Math.max(rooms.length, 0);
  const occupiedRooms = rooms.filter((r) => r.status !== 'Vacant').length;
  const occPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const expectedCollectionBase = totalInflow + pendingAmountNum;
  const collectionPct =
    expectedCollectionBase > 0
      ? ((totalInflow / expectedCollectionBase) * 100).toFixed(1)
      : '0.0';

  return {
    id,
    label,
    fullTitle,
    shortLabel,
    asOfDate,
    netProfit: formatRupeeAmount(netProfit),
    totalInflow: formatRupeeAmount(totalInflow),
    totalOutflow: formatRupeeAmount(totalOutflow),
    profitMargin: `${marginPct}%`,
    rentRevenue: formatRupeeAmount(rentRevenue),
    maintenanceCollected: formatRupeeAmount(maintenanceCollected),
    repairsExpense: formatRupeeAmount(repairsExpense),
    utilitiesExpense: formatRupeeAmount(utilitiesExpense),
    staffExpense: formatRupeeAmount(staffExpense),
    occupancyText: `${occupiedRooms} / ${totalRooms} Rooms (${occPct}%)`,
    collectionText: collectedRoomsText ?? `${formatRupeeAmount(totalInflow)} (${collectionPct}%)`,
    pendingText: formatRupeeAmount(pendingAmountNum),
    chartIncomeK: Number((totalInflow / 1000).toFixed(1)),
    chartExpenseK: Number((totalOutflow / 1000).toFixed(1)),
  };
}

/** Builds live Weekly, Monthly, and Yearly report periods from real transactions, rooms, and rent ledger. */
export function buildDynamicReports(
  cadence: ReportCadence,
  transactions: TransactionItem[],
  rooms: RoomItem[],
  rentList: ResolvedRoomRent[],
  now: Date = new Date()
): ReportPeriodData[] {
  const currentPendingNum = rentList
    .filter((r) => r.currentStatus === 'Due' || r.currentStatus === 'Overdue')
    .reduce((sum, r) => sum + r.numericFullRent, 0);

  if (cadence === 'Weekly') {
    const weeks: ReportPeriodData[] = [];
    for (let w = 3; w >= 0; w -= 1) {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - w * 7);
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);
      const startIso = toIsoDate(start);
      const endIso = toIsoDate(end);

      const windowTxs = transactions.filter(
        (tx) => tx.dateIso >= startIso && tx.dateIso <= endIso
      );
      const startLbl = `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()}`;
      const endLbl =
        start.getMonth() === end.getMonth()
          ? `${end.getDate()}`
          : `${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}`;

      const paidCount = new Set(
        windowTxs.filter((tx) => tx.kind === 'income' && tx.roomId).map((tx) => tx.roomId)
      ).size;

      weeks.push(
        aggregateTransactionsIntoPeriod(
          `week-${startIso}`,
          `${startLbl}–${endLbl}`,
          `${startLbl} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`,
          startLbl,
          formatShortDate(end),
          windowTxs,
          rooms,
          w === 0 ? currentPendingNum : 0,
          paidCount > 0 ? `${paidCount} ${paidCount === 1 ? 'Room' : 'Rooms'} Collected` : undefined
        )
      );
    }
    return weeks;
  }

  if (cadence === 'Yearly') {
    const currentYear = now.getFullYear();
    const years: ReportPeriodData[] = [];
    for (let y = currentYear - 2; y <= currentYear; y += 1) {
      const prefix = `${y}-`;
      const yearTxs = transactions.filter((tx) => tx.dateIso.startsWith(prefix));
      const isCurrentYear = y === currentYear;
      const endDate = isCurrentYear ? now : new Date(y, 11, 31);

      years.push(
        aggregateTransactionsIntoPeriod(
          `year-${y}`,
          `${y}`,
          isCurrentYear ? `Jan 1 – ${formatShortDate(now)}` : `Year ${y} (Jan – Dec)`,
          `${y}`,
          formatShortDate(endDate),
          yearTxs,
          rooms,
          isCurrentYear ? currentPendingNum : 0
        )
      );
    }
    return years;
  }

  // Monthly (last 4 months including current month)
  const months: ReportPeriodData[] = [];
  for (let m = 3; m >= 0; m -= 1) {
    const target = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const y = target.getFullYear();
    const monthIdx = target.getMonth();
    const prefix = `${y}-${String(monthIdx + 1).padStart(2, '0')}`;
    const monthTxs = transactions.filter((tx) => tx.dateIso.startsWith(prefix));
    const isCurrentMonth = m === 0;
    const endDate = isCurrentMonth ? now : new Date(y, monthIdx + 1, 0);

    months.push(
      aggregateTransactionsIntoPeriod(
        `month-${prefix}`,
        isCurrentMonth
          ? `${MONTHS_SHORT[monthIdx]} 1–${now.getDate()}`
          : `${MONTHS_FULL[monthIdx]} ${y}`,
        isCurrentMonth
          ? `${MONTHS_SHORT[monthIdx]} 1 – ${formatShortDate(now)}`
          : `${MONTHS_FULL[monthIdx]} ${y}`,
        MONTHS_SHORT[monthIdx],
        formatShortDate(endDate),
        monthTxs,
        rooms,
        isCurrentMonth ? currentPendingNum : 0
      )
    );
  }
  return months;
}

export interface DashboardMetrics {
  monthLabel: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  marginPct: number;
  growthPct: number | null;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  pendingRentTotal: number;
  pendingRoomsCount: number;
}

export function computeDashboardMetrics(
  rooms: RoomItem[],
  rentList: ResolvedRoomRent[],
  transactions: TransactionItem[],
  now: Date = new Date()
): DashboardMetrics {
  const currPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevPrefix = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  let totalIncome = 0;
  let totalExpenses = 0;
  let prevIncome = 0;
  let prevExpenses = 0;

  for (const tx of transactions) {
    if (tx.dateIso.startsWith(currPrefix)) {
      if (tx.kind === 'income') totalIncome += tx.numericAmount;
      else totalExpenses += tx.numericAmount;
    } else if (tx.dateIso.startsWith(prevPrefix)) {
      if (tx.kind === 'income') prevIncome += tx.numericAmount;
      else prevExpenses += tx.numericAmount;
    }
  }

  const netProfit = totalIncome - totalExpenses;
  const marginPct =
    totalIncome > 0 ? Math.max(0, Math.min(100, Math.round((netProfit / totalIncome) * 100))) : 0;

  const prevNet = prevIncome - prevExpenses;
  const growthPct =
    prevNet > 0 ? Math.round(((netProfit - prevNet) / prevNet) * 100) : null;

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status !== 'Vacant').length;
  const vacantRooms = rooms.filter((r) => r.status === 'Vacant').length;

  const pendingItems = rentList.filter(
    (r) => r.currentStatus === 'Due' || r.currentStatus === 'Overdue'
  );
  const pendingRentTotal = pendingItems.reduce((sum, r) => sum + r.numericFullRent, 0);

  return {
    monthLabel: MONTHS_FULL[now.getMonth()],
    totalIncome,
    totalExpenses,
    netProfit,
    marginPct,
    growthPct,
    totalRooms,
    occupiedRooms,
    vacantRooms,
    pendingRentTotal,
    pendingRoomsCount: pendingItems.length,
  };
}
