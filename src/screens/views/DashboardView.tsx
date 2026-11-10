import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../../constants/theme';
import type { RentFilter } from './RentView';

interface DashboardViewProps {
  onNavigatePage?: (
    page: 'Rooms' | 'Rent' | 'Money' | 'Accounts' | 'Notifications',
    noticeId?: string,
    rentFilter?: RentFilter
  ) => void;
}

interface PendingRentItem {
  id: string;
  roomNumber: string;
  badgeLabel: string;
  badgeType: 'overdue' | 'due';
  subtitle: string;
  amount: string;
  statusNote: string;
}

const PENDING_RENTS: PendingRentItem[] = [
  {
    id: 'rent-102',
    roomNumber: 'Room 102',
    badgeLabel: 'Overdue',
    badgeType: 'overdue',
    subtitle: 'Priya Sharma · Due Oct 15',
    amount: '₹15,000',
    statusNote: 'Pending',
  },
  {
    id: 'rent-201',
    roomNumber: 'Room 201',
    badgeLabel: 'Due',
    badgeType: 'due',
    subtitle: 'Arjun Kumar · Due Nov 1',
    amount: '₹10,000',
    statusNote: 'Upcoming',
  },
];

interface CustomerMessage {
  id: string;
  senderName: string;
  roomNumber: string;
  phone: string;
  time: string;
  message: string;
  tag: string;
}

const CUSTOMER_MESSAGES: CustomerMessage[] = [
  {
    id: 'msg-1',
    senderName: 'Sana Khan',
    roomNumber: 'Room 104',
    phone: '+91 97400 99881',
    time: '10m ago',
    message: 'Water tap in bathroom is leaking continuously, please send plumber.',
    tag: 'Plumbing',
  },
  {
    id: 'msg-2',
    senderName: 'Sneha Patel',
    roomNumber: 'Room 202',
    phone: '+91 94480 33445',
    time: '2h ago',
    message: 'Main bedroom fan regulator is not rotating properly, needs replacement.',
    tag: 'Electrical',
  },
  {
    id: 'msg-3',
    senderName: 'Anil Rao',
    roomNumber: 'Room 101',
    phone: '+91 98450 11223',
    time: 'Today, 11:30 AM',
    message: 'Transferred October rent of ₹9,000 via UPI (Ref: 430198). Please confirm receipt.',
    tag: 'Payment',
  },
];

export default function DashboardView({ onNavigatePage }: DashboardViewProps) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Palette.primary}
          colors={[Palette.primary]}
        />
      }
    >
      <View style={styles.contentWrapper}>
        {/* Welcome back */}
        <Text style={styles.welcomeTitle}>Welcome back</Text>

        {/* Hero Card: Net profit · October (White summary card with Coffee Brown highlight & Profit Margin bar) */}
        <TouchableOpacity
          style={styles.profitCard}
          activeOpacity={0.85}
          onPress={() => onNavigatePage && onNavigatePage('Accounts')}
          accessibilityRole="button"
          accessibilityLabel="Net profit October ₹66,000, view accounts"
        >
          <View style={styles.profitHeaderRow}>
            <Text style={styles.profitHeader}>Net profit · October</Text>
            <View style={styles.profitBadge}>
              <Text style={styles.profitBadgeText}>+12% mo</Text>
            </View>
          </View>
          <Text style={styles.profitAmount}>₹66,000</Text>
          <Text style={styles.profitBreakdown}>Income ₹92,000  ·  Expenses ₹26,000</Text>
          <View
            style={styles.profitTrack}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Net profit margin: 72% of total income"
            accessibilityValue={{ min: 0, max: 100, now: 72 }}
          >
            <View style={styles.profitFill} />
          </View>
          <Text style={styles.profitScaleText}>72% net margin of total income</Text>
        </TouchableOpacity>

        {/* 2-Column Metric Cards */}
        <View style={styles.metricRow}>
          {/* Rooms occupied */}
          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.85}
            onPress={() => onNavigatePage && onNavigatePage('Rooms')}
            accessibilityRole="button"
            accessibilityLabel="Rooms occupied 9 of 12, 3 vacant, view rooms"
          >
            <Text style={styles.metricLabel}>Rooms occupied</Text>
            <Text style={styles.metricValue}>9 / 12</Text>
            <Text style={styles.metricSubtext}>3 vacant</Text>
          </TouchableOpacity>

          {/* Rent pending */}
          <TouchableOpacity
            style={styles.metricCard}
            activeOpacity={0.85}
            onPress={() => onNavigatePage && onNavigatePage('Rent', undefined, 'Due')}
            accessibilityRole="button"
            accessibilityLabel="Rent pending ₹25,000, 2 rooms due, view rent"
          >
            <Text style={styles.metricLabel}>Rent pending</Text>
            <Text style={[styles.metricValue, { color: Palette.primary }]}>₹25,000</Text>
            <Text style={styles.metricSubtext}>2 rooms due</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Rent Due*/}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Rent Due</Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => onNavigatePage && onNavigatePage('Rent', undefined, 'Due')}
            accessibilityRole="button"
            accessibilityLabel="View all Rent Due"
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Feather
              name="chevron-right"
              size={Typography.iconSize.sm}
              color={Palette.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardContainer}>
          {PENDING_RENTS.map((item, index) => {
            const isLast = index === PENDING_RENTS.length - 1;
            const isOverdue = item.badgeType === 'overdue';
            return (
              <React.Fragment key={item.id}>
                <TouchableOpacity
                  style={styles.pendingItemRow}
                  activeOpacity={0.7}
                  onPress={() => onNavigatePage && onNavigatePage('Rent', undefined, 'Due')}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.roomNumber}, ${item.subtitle}, ${item.badgeLabel}, ${item.amount} ${item.statusNote}`}
                >
                  <View style={styles.pendingLeftCol}>
                    <View style={styles.roomBadgeRow}>
                      <Text style={styles.pendingRoomNumber}>{item.roomNumber}</Text>
                      <View style={isOverdue ? styles.overdueBadge : styles.dueBadge}>
                        <Text
                          style={isOverdue ? styles.overdueBadgeText : styles.dueBadgeText}
                        >
                          {item.badgeLabel}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.pendingTenantText}>{item.subtitle}</Text>
                  </View>
                  <View style={styles.rowRightAction}>
                    <View style={styles.pendingRightCol}>
                      <Text style={styles.pendingAmount}>{item.amount}</Text>
                      <Text style={styles.pendingSubInfo}>{item.statusNote}</Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={Typography.iconSize.sm}
                      color={Palette.primary}
                    />
                  </View>
                </TouchableOpacity>
                {!isLast && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* Section: Service Requests */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Service Requests</Text>
          <Text style={styles.messageCountText}>{CUSTOMER_MESSAGES.length} new</Text>
        </View>

        <View style={styles.cardContainer}>
          {CUSTOMER_MESSAGES.map((msg, index) => {
            const isLast = index === CUSTOMER_MESSAGES.length - 1;
            return (
              <React.Fragment key={msg.id}>
                <TouchableOpacity
                  style={styles.messageItem}
                  activeOpacity={0.7}
                  onPress={() => onNavigatePage && onNavigatePage('Notifications', msg.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${msg.senderName}, ${msg.roomNumber}, ${msg.tag}, open message`}
                >
                  <Text style={styles.messageSenderTitle}>
                    {msg.senderName} · {msg.roomNumber}
                  </Text>

                  <View style={styles.messageRightRow}>
                    <Text style={styles.singleWordTag}>{msg.tag}</Text>
                    <Feather
                      name="chevron-right"
                      size={Typography.iconSize.sm}
                      color={Palette.primary}
                    />
                  </View>
                </TouchableOpacity>
                {!isLast && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: Palette.background,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  welcomeTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  profitCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  profitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitHeader: {
    fontSize: Typography.fontSize.base,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  profitBadge: {
    paddingVertical: 2,
  },
  profitBadgeText: {
    color: Palette.status.active.text,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  profitAmount: {
    fontSize: Typography.fontSize.hero,
    fontWeight: '800',
    color: Palette.primary,
    marginVertical: 6,
    letterSpacing: -0.5,
  },
  profitBreakdown: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  profitTrack: {
    width: '100%',
    height: 6,
    backgroundColor: Palette.border,
    borderRadius: Radius.xs,
    overflow: 'hidden',
    marginTop: 14,
  },
  profitFill: {
    width: '72%',
    height: '100%',
    backgroundColor: Palette.primary,
    borderRadius: Radius.xs,
  },
  profitScaleText: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginTop: 6,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: Palette.surface,
    borderRadius: 5,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  metricLabel: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '400',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  viewAllText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.primary,
  },
  cardContainer: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  pendingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pendingLeftCol: {
    flex: 1,
    marginRight: 12,
  },
  rowRightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roomBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pendingRoomNumber: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    marginRight: 8,
  },
  pendingTenantText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
  },
  pendingRightCol: {
    alignItems: 'flex-end',
  },
  pendingAmount: {
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
    color: Palette.primary,
    marginBottom: 2,
  },
  pendingSubInfo: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  messageCountText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.primary,
  },
  messageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  messageSenderTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    flexShrink: 1,
    marginRight: 12,
  },
  messageRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  singleWordTag: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.primary,
  },
  overdueBadge: {
    paddingVertical: 1,
  },
  overdueBadgeText: {
    color: Palette.status.overdue.text,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  dueBadge: {
    paddingVertical: 1,
  },
  dueBadgeText: {
    color: Palette.status.due.text,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  openBadge: {
    paddingVertical: 1,
  },
  openBadgeText: {
    color: Palette.status.pending.text,
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
  },
});
