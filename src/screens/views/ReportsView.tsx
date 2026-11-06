import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';

interface ReportsViewProps {
  onBack?: () => void;
}

export default function ReportsView({ onBack }: ReportsViewProps) {
  const [selectedMonth, setSelectedMonth] = useState('October 2026');

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const months = ['August 2026', 'September 2026', 'October 2026'];

  const monthlyHistory = [
    { month: 'Jul', income: 80, expense: 22, profit: 58 },
    { month: 'Aug', income: 85, expense: 24, profit: 61 },
    { month: 'Sep', income: 88, expense: 25, profit: 63 },
    { month: 'Oct', income: 92, expense: 26, profit: 66 },
  ];

  return (
    <View style={styles.outerScreen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000000"
            colors={['#000000']}
          />
        }
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButtonCircle}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-left" size={22} color={Palette.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Financial Reports</Text>
          </View>

          <TouchableOpacity
            style={styles.exportButton}
            activeOpacity={0.8}
            onPress={() => Alert.alert('Export Report', 'Generating financial PDF statement for October 2026...')}
          >
            <Feather name="download" size={15} color={Palette.surface} style={{ marginRight: 4 }} />
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Month Filter Selector */}
        <View style={styles.monthSelectorRow}>
          {months.map((m) => {
            const isActive = selectedMonth === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.monthChip, isActive && styles.monthChipActive]}
                onPress={() => setSelectedMonth(m)}
                activeOpacity={0.7}
              >
                <Text style={[styles.monthChipText, isActive && styles.monthChipTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Primary Profit Card */}
        <View style={styles.mainCard}>
          <Text style={styles.cardSubtitle}>Net Operating Profit · {selectedMonth}</Text>
          <Text style={styles.profitHighlight}>₹66,000</Text>

          <View style={styles.statsSplit}>
            <View style={styles.splitCol}>
              <Text style={styles.splitLabel}>Total Inflow</Text>
              <Text style={styles.splitValInflow}>₹92,000</Text>
            </View>
            <View style={styles.splitDivider} />
            <View style={styles.splitCol}>
              <Text style={styles.splitLabel}>Total Outflow</Text>
              <Text style={styles.splitValOutflow}>₹26,000</Text>
            </View>
            <View style={styles.splitDivider} />
            <View style={styles.splitCol}>
              <Text style={styles.splitLabel}>Profit Margin</Text>
              <Text style={styles.splitValMargin}>71.7%</Text>
            </View>
          </View>
        </View>

        {/* Monthly Trend Bar Comparison */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Income vs Expense Trend</Text>
          <Text style={styles.sectionSubtitle}>Last 4 months in thousands (₹)</Text>

          <View style={styles.barsContainer}>
            {monthlyHistory.map((item) => (
              <View key={item.month} style={styles.barGroup}>
                <View style={styles.barPair}>
                  {/* Income bar (Coffee Brown) */}
                  <View
                    style={[
                      styles.singleBar,
                      { height: item.income * 1.3, backgroundColor: Palette.primary },
                    ]}
                  />
                  {/* Expense bar (Caramel) */}
                  <View
                    style={[
                      styles.singleBar,
                      { height: item.expense * 1.3, backgroundColor: Palette.secondary },
                    ]}
                  />
                </View>
                <Text style={styles.barMonthLabel}>{item.month}</Text>
              </View>
            ))}
          </View>

          {/* Legend */}
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

        {/* Operational Highlights */}
        <View style={styles.operationalCard}>
          <Text style={styles.sectionTitle}>Operational Performance</Text>
          
          <View style={styles.opRow}>
            <View style={styles.opIconBox}>
              <Feather name="pie-chart" size={18} color={Palette.primary} />
            </View>
            <View style={styles.opTextCol}>
              <Text style={styles.opTitle}>Occupancy Rate</Text>
              <Text style={styles.opSub}>9 of 12 rooms leased</Text>
            </View>
            <Text style={styles.opMetric}>75%</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.opRow}>
            <View style={styles.opIconBox}>
              <Feather name="check-circle" size={18} color={Palette.primary} />
            </View>
            <View style={styles.opTextCol}>
              <Text style={styles.opTitle}>Collection Efficiency</Text>
              <Text style={styles.opSub}>₹85,000 collected on time</Text>
            </View>
            <Text style={styles.opMetric}>77.3%</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.opRow}>
            <View style={styles.opIconBox}>
              <Feather name="tool" size={18} color={Palette.primary} />
            </View>
            <View style={styles.opTextCol}>
              <Text style={styles.opTitle}>Maintenance Resolution</Text>
              <Text style={styles.opSub}>5 of 7 tasks resolved</Text>
            </View>
            <Text style={styles.opMetric}>71.4%</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerScreen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 110,
    backgroundColor: Palette.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Palette.text,
    letterSpacing: 0.3,
    ...Platform.select({
      ios: { fontFamily: 'Georgia' },
      android: { fontFamily: 'serif' },
      default: { fontFamily: 'serif' },
    }),
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  exportButtonText: {
    color: Palette.surface,
    fontWeight: '700',
    fontSize: 13.5,
  },
  monthSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  monthChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  monthChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  monthChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.text,
  },
  monthChipTextActive: {
    color: Palette.surface,
  },
  mainCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  profitHighlight: {
    fontSize: 34,
    fontWeight: '800',
    color: Palette.primary,
    marginBottom: 16,
  },
  statsSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  splitCol: {
    flex: 1,
  },
  splitLabel: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    marginBottom: 4,
  },
  splitValInflow: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.status.paid.text,
  },
  splitValOutflow: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.status.overdue.text,
  },
  splitValMargin: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
  },
  splitDivider: {
    width: 1,
    backgroundColor: Palette.border,
    marginHorizontal: 10,
  },
  chartCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginBottom: 20,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 130,
    paddingBottom: 10,
  },
  barGroup: {
    alignItems: 'center',
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  singleBar: {
    width: 14,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barMonthLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginTop: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  operationalCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  opRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  opIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    marginRight: 12,
  },
  opTextCol: {
    flex: 1,
  },
  opTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Palette.text,
  },
  opSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  opMetric: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.text,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
  },
});

