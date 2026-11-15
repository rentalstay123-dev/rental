import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Palette, Radius, Typography } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import type { RoomItem } from '../../types/appData';
import { buildDynamicReports } from '../../utils/finance';
import {
  buildOccupancyStats,
  buildRentalIncomeHtmlReport,
  buildRentalIncomePdfBytes,
  buildReportRoomRows,
  ReportCadence,
  ReportPeriodData,
} from '../../utils/rentalReportPdf';

interface ReportsViewProps {
  onBack?: () => void;
  rooms?: RoomItem[];
}

interface WebDownloadEnv {
  Blob?: new (parts: (string | Uint8Array)[], options: { type: string }) => unknown;
  URL?: {
    createObjectURL: (blob: unknown) => string;
    revokeObjectURL: (url: string) => void;
  };
  document?: {
    createElement: (tag: string) => {
      href: string;
      download: string;
      style: { display: string };
      click: () => void;
      remove: () => void;
    };
    body?: {
      appendChild: (node: unknown) => void;
    };
  };
}

function triggerWebFileDownload(
  filename: string,
  mimeType: string,
  content: string | Uint8Array
): boolean {
  const webEnv = globalThis as unknown as WebDownloadEnv;
  if (!webEnv.Blob || !webEnv.URL || !webEnv.document?.body) return false;
  const blob = new webEnv.Blob([content], { type: mimeType });
  const objectUrl = webEnv.URL.createObjectURL(blob);
  const link = webEnv.document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';
  webEnv.document.body.appendChild(link);
  link.click();
  link.remove();
  webEnv.URL.revokeObjectURL(objectUrl);
  return true;
}

export default function ReportsView({ onBack, rooms: propRooms }: ReportsViewProps) {
  const {
    rooms: contextRooms,
    rentList,
    transactions,
    refreshWorkspace,
  } = useAppData();

  const sourceRooms = propRooms ?? contextRooms;
  const occupancyStats = buildOccupancyStats(sourceRooms);
  const roomRows = buildReportRoomRows(sourceRooms, rentList);

  const [cadence, setCadence] = useState<ReportCadence>('Monthly');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [downloadingTarget, setDownloadingTarget] = useState<ReportCadence | 'export' | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const weeklyReports = React.useMemo(
    () => buildDynamicReports('Weekly', transactions, sourceRooms, rentList),
    [transactions, sourceRooms, rentList]
  );
  const monthlyReports = React.useMemo(
    () => buildDynamicReports('Monthly', transactions, sourceRooms, rentList),
    [transactions, sourceRooms, rentList]
  );
  const yearlyReports = React.useMemo(
    () => buildDynamicReports('Yearly', transactions, sourceRooms, rentList),
    [transactions, sourceRooms, rentList]
  );

  const getPeriodList = (targetCadence: ReportCadence): ReportPeriodData[] => {
    if (targetCadence === 'Weekly') return weeklyReports;
    if (targetCadence === 'Yearly') return yearlyReports;
    return monthlyReports;
  };

  const periodList = getPeriodList(cadence);
  const activePeriod =
    periodList.find((p) => p.id === selectedPeriodId) ?? periodList[periodList.length - 1];

  const maxChartValue = Math.max(
    10,
    ...periodList.map((p) => Math.max(p.chartIncomeK, p.chartExpenseK) * 1.15)
  );
  const chartScale = 100 / maxChartValue;

  const handleSwitchCadence = (nextCadence: ReportCadence) => {
    setCadence(nextCadence);
    const nextList = getPeriodList(nextCadence);
    setSelectedPeriodId(nextList[nextList.length - 1].id);
  };

  const handleDownloadPdf = async (
    targetCadence: ReportCadence,
    triggerSource: ReportCadence | 'export' = targetCadence
  ) => {
    if (downloadingTarget !== null) return;
    setDownloadingTarget(triggerSource);
    const targetList = getPeriodList(targetCadence);
    const targetPeriod =
      targetCadence === cadence ? activePeriod : targetList[targetList.length - 1];
    const safeName = targetPeriod.id.replace(/[^a-z0-9-_]/gi, '_');
    const pdfFileName = `Luvora_Rental_Income_Report_${targetCadence}_${safeName}.pdf`;

    try {
      if (Platform.OS === 'web') {
        const pdfBytes = buildRentalIncomePdfBytes(
          targetCadence,
          targetPeriod,
          roomRows,
          occupancyStats
        );
        const downloaded = triggerWebFileDownload(
          pdfFileName,
          'application/pdf',
          pdfBytes
        );
        if (downloaded) return;
      }

      const html = buildRentalIncomeHtmlReport(
        targetCadence,
        targetPeriod,
        roomRows,
        occupancyStats
      );
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Save ${targetCadence} Rental Income Report (PDF)`,
        });
      }
    } finally {
      setDownloadingTarget(null);
    }
  };

  return (
    <View style={styles.outerScreen}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Palette.accentText}
            colors={[Palette.accentText]}
          />
        }
      >
        <View style={styles.contentWrapper}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButtonCircle}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
            >
              <Feather name="chevron-left" size={Typography.iconSize.base} color={Palette.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reports</Text>
          </View>

          {/* Top Export Action Row */}
          <View style={styles.exportActionRow}>
            <TouchableOpacity
              style={styles.exportTopBtn}
              activeOpacity={0.85}
              onPress={() => handleDownloadPdf(cadence, 'export')}
              disabled={downloadingTarget !== null}
              accessibilityRole="button"
              accessibilityLabel={`Export ${cadence} PDF report`}
            >
              {downloadingTarget === 'export' ? (
                <ActivityIndicator size="small" color={Palette.onPrimary} />
              ) : (
                <Feather name="share" size={Typography.iconSize.sm} color={Palette.onPrimary} />
              )}
              <Text style={styles.exportTopBtnText}>Export</Text>
            </TouchableOpacity>
          </View>

          {/* Period Selector Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodChipsContainer}
          >
            {periodList.map((item) => {
              const isActive = item.id === activePeriod.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.periodChip, isActive && styles.periodChipActive]}
                  onPress={() => setSelectedPeriodId(item.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.periodChipText, isActive && styles.periodChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Summary Overview Card */}
          <View style={styles.mainCard}>
            <Text style={styles.cardSubtitle}>
              Net Operating Profit · {activePeriod.fullTitle}
            </Text>
            <Text style={styles.profitHighlight}>{activePeriod.netProfit}</Text>

            <View style={styles.statsSplit}>
              <View style={styles.splitCol}>
                <Text style={styles.splitLabel}>Total Inflow</Text>
                <Text style={styles.splitValInflow}>{activePeriod.totalInflow}</Text>
              </View>
              <View style={styles.splitDivider} />
              <View style={styles.splitCol}>
                <Text style={styles.splitLabel}>Total Outflow</Text>
                <Text style={styles.splitValOutflow}>{activePeriod.totalOutflow}</Text>
              </View>
              <View style={styles.splitDivider} />
              <View style={styles.splitCol}>
                <Text style={styles.splitLabel}>Profit Margin</Text>
                <Text style={styles.splitValMargin}>{activePeriod.profitMargin}</Text>
              </View>
            </View>
          </View>

          {/* Income vs Expense Bar Trend */}
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>
              {cadence === 'Weekly'
                ? 'Weekly Trend'
                : cadence === 'Yearly'
                  ? 'Yearly Trend'
                  : 'Monthly Trend'}
            </Text>
            <Text style={styles.sectionSubtitle}>Income vs Expense in thousands (₹)</Text>

            <View style={styles.barsContainer}>
              {periodList.map((item) => (
                <View key={item.id} style={styles.barGroup}>
                  <View style={styles.barPair}>
                    <View
                      style={[
                        styles.singleBar,
                        {
                          height: Math.max(12, item.chartIncomeK * chartScale),
                          backgroundColor: Palette.primary,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.singleBar,
                        {
                          height: Math.max(8, item.chartExpenseK * chartScale),
                          backgroundColor: Palette.secondary,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.barLabel,
                      item.id === activePeriod.id && styles.barLabelActive,
                    ]}
                  >
                    {item.shortLabel}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Palette.primary }]} />
                <Text style={styles.legendText}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Palette.secondary }]} />
                <Text style={styles.legendText}>Expense</Text>
              </View>
            </View>
          </View>

          {/* Stacked Report Bars: Weekly, Monthly, Yearly (one after another with right-side download icon) */}
          <View style={styles.cadenceStack}>
            {(['Weekly', 'Monthly', 'Yearly'] as const).map((tab) => {
              const isSelected = cadence === tab;
              const isDownloading = downloadingTarget === tab;
              const tabList = getPeriodList(tab);
              const tabPeriod = isSelected ? activePeriod : tabList[tabList.length - 1];

              return (
                <View
                  key={tab}
                  style={[styles.cadenceBar, isSelected && styles.cadenceBarActive]}
                >
                  <TouchableOpacity
                    style={styles.cadenceBarMain}
                    activeOpacity={0.75}
                    onPress={() => handleSwitchCadence(tab)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`View ${tab} report`}
                  >
                    <Text
                      style={[
                        styles.cadenceBarTitle,
                        isSelected && styles.cadenceBarTitleActive,
                      ]}
                    >
                      {tab} Report
                    </Text>
                    <Text style={styles.cadenceBarSubtitle}>{tabPeriod.fullTitle}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.cadenceDownloadBtn,
                      isSelected && styles.cadenceDownloadBtnActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleDownloadPdf(tab)}
                    disabled={downloadingTarget !== null}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Download ${tab} PDF report`}
                  >
                    {isDownloading ? (
                      <ActivityIndicator
                        size="small"
                        color={isSelected ? Palette.onPrimary : Palette.primary}
                      />
                    ) : (
                      <Feather
                        name="download"
                        size={Typography.iconSize.base}
                        color={isSelected ? Palette.onPrimary : Palette.primary}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerScreen: {
    flex: 1,
    minHeight: 0,
    backgroundColor: Palette.background,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: Palette.background,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButtonCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '700',
    color: Palette.text,
    letterSpacing: 0.2,
    fontFamily: Typography.fontFamily.serif,
  },
  exportActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  exportTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exportTopBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  periodChipsContainer: {
    gap: 8,
    paddingBottom: 14,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  periodChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  periodChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  periodChipTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  mainCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  cardSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  profitHighlight: {
    fontSize: 32,
    fontWeight: '800',
    color: Palette.primary,
    marginBottom: 16,
  },
  statsSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  splitCol: {
    flex: 1,
  },
  splitLabel: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginBottom: 4,
  },
  splitValInflow: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.status.paid.text,
  },
  splitValOutflow: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.status.overdue.text,
  },
  splitValMargin: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  splitDivider: {
    width: 1,
    backgroundColor: Palette.divider,
    marginHorizontal: 10,
  },
  chartCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginBottom: 18,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 126,
    paddingBottom: 8,
  },
  barGroup: {
    alignItems: 'center',
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  singleBar: {
    width: 16,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barLabel: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginTop: 8,
  },
  barLabelActive: {
    color: Palette.primary,
    fontWeight: '800',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    marginRight: 6,
  },
  legendText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  cadenceStack: {
    gap: 10,
    marginBottom: 14,
  },
  cadenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  cadenceBarActive: {
    backgroundColor: Palette.tint,
    borderColor: Palette.primary,
  },
  cadenceBarMain: {
    flex: 1,
  },
  cadenceBarTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 2,
  },
  cadenceBarTitleActive: {
    color: Palette.primary,
  },
  cadenceBarSubtitle: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  cadenceDownloadBtn: {
    width: 38,
    height: 38,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cadenceDownloadBtnActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
});
