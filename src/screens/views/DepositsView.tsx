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

interface DepositsViewProps {
  onBack?: () => void;
}

interface DepositItem {
  id: string;
  residentName: string;
  roomNumber: string;
  amount: string;
  dateReceived: string;
  status: 'Held' | 'Refund Due' | 'Refunded';
}

const INITIAL_DEPOSITS: DepositItem[] = [
  {
    id: '1',
    residentName: 'Anil Rao',
    roomNumber: 'Room 101',
    amount: '₹18,000',
    dateReceived: 'Jan 15, 2026',
    status: 'Held',
  },
  {
    id: '2',
    residentName: 'Priya Sharma',
    roomNumber: 'Room 102',
    amount: '₹18,000',
    dateReceived: 'Mar 01, 2026',
    status: 'Refund Due',
  },
  {
    id: '3',
    residentName: 'Kiran Das',
    roomNumber: 'Room 103',
    amount: '₹18,000',
    dateReceived: 'Feb 10, 2026',
    status: 'Held',
  },
  {
    id: '4',
    residentName: 'Sana Khan',
    roomNumber: 'Room 104',
    amount: '₹19,000',
    dateReceived: 'Apr 05, 2026',
    status: 'Held',
  },
  {
    id: '5',
    residentName: 'Arjun Kumar',
    roomNumber: 'Room 201',
    amount: '₹20,000',
    dateReceived: 'May 12, 2026',
    status: 'Held',
  },
  {
    id: '6',
    residentName: 'Sneha Patel',
    roomNumber: 'Room 202',
    amount: '₹16,000',
    dateReceived: 'Jun 20, 2026',
    status: 'Held',
  },
  {
    id: '7',
    residentName: 'Rahul Verma',
    roomNumber: 'Room 203',
    amount: '₹16,000',
    dateReceived: 'Jul 01, 2026',
    status: 'Held',
  },
];

export default function DepositsView({ onBack }: DepositsViewProps) {
  const [deposits, setDeposits] = useState<DepositItem[]>(INITIAL_DEPOSITS);
  const [filter, setFilter] = useState<'All' | 'Held' | 'Refund Due'>('All');

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const filteredDeposits = deposits.filter((d) => {
    if (filter === 'All') return true;
    return d.status === filter;
  });

  const handleDepositAction = (item: DepositItem) => {
    if (item.status === 'Refund Due') {
      Alert.alert(
        'Process Refund',
        `Initiate refund of ${item.amount} to ${item.residentName} (${item.roomNumber})?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Refund via UPI/Bank',
            onPress: () => {
              setDeposits(
                deposits.map((d) =>
                  d.id === item.id ? { ...d, status: 'Refunded' } : d
                )
              );
              Alert.alert('Refund Completed', `Refund of ${item.amount} marked as sent.`);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        item.residentName,
        `Deposit: ${item.amount}\nRoom: ${item.roomNumber}\nReceived on: ${item.dateReceived}\nStatus: ${item.status}`
      );
    }
  };

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
            <Text style={styles.headerTitle}>Deposits</Text>
          </View>
        </View>

        {/* Summary Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Held</Text>
            <Text style={styles.metricValue}>₹1,25,000</Text>
            <Text style={styles.metricSub}>9 security deposits</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Pending Refunds</Text>
            <Text style={[styles.metricValue, { color: Palette.status.pending.text }]}>₹18,000</Text>
            <Text style={styles.metricSub}>1 resident vacating</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['All', 'Held', 'Refund Due'] as const).map((tab) => {
            const isActive = filter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Deposit Items List */}
        <View style={styles.listCard}>
          {filteredDeposits.map((item, index) => {
            const isDue = item.status === 'Refund Due';
            const isRefunded = item.status === 'Refunded';
            return (
              <React.Fragment key={item.id}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.depositRow}
                  activeOpacity={0.7}
                  onPress={() => handleDepositAction(item)}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.residentName}>{item.residentName}</Text>
                    <Text style={styles.roomSubtitle}>
                      {item.roomNumber} · Received {item.dateReceived}
                    </Text>
                  </View>

                  <View style={styles.rowRight}>
                    <Text style={styles.depositAmount}>{item.amount}</Text>
                    <View
                      style={[
                        styles.badge,
                        isDue
                          ? styles.badgeDue
                          : isRefunded
                          ? styles.badgeVacant
                          : styles.badgeHeld,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          isDue
                            ? styles.badgeTextDue
                            : isRefunded
                            ? styles.badgeTextVacant
                            : styles.badgeTextHeld,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
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
    marginBottom: 20,
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
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  metricLabel: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 4,
  },
  metricSub: {
    fontSize: 11.5,
    color: Palette.textSecondary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  filterChipTextActive: {
    color: Palette.surface,
  },
  listCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowLeft: {
    flex: 1,
  },
  residentName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 3,
  },
  roomSubtitle: {
    fontSize: 12.5,
    color: Palette.textSecondary,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  depositAmount: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  badgeHeld: {
    backgroundColor: 'transparent',
  },
  badgeDue: {
    backgroundColor: 'transparent',
  },
  badgeVacant: {
    backgroundColor: 'transparent',
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  badgeTextHeld: {
    color: Palette.status.paid.text,
  },
  badgeTextDue: {
    color: Palette.status.pending.text,
  },
  badgeTextVacant: {
    color: Palette.status.vacant.text,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
  },
});

