import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { formatRupeeAmount } from '../../utils/finance';
import type { RentFilter } from './RentView';

const netProfitBg = require('../../../assets/net-profit-bg.png');

interface DashboardViewProps {
  onNavigatePage?: (
    page: 'Rooms' | 'Rent' | 'Money' | 'Accounts' | 'Notifications' | 'Requests',
    noticeId?: string,
    rentFilter?: RentFilter,
    options?: { openCreateModal?: boolean }
  ) => void;
}

export default function DashboardView({ onNavigatePage }: DashboardViewProps) {
  const {
    profile,
    rentList,
    notifications,
    dashboardMetrics,
    refreshWorkspace,
  } = useAppData();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const pendingRents = rentList.filter(
    (item) => item.currentStatus === 'Due' || item.currentStatus === 'Overdue'
  );
  const customerMessages = notifications.filter((n) => n.type === 'customer');

  const firstName = profile.fullName.trim().split(/\s+/)[0];
  const growthLabel =
    dashboardMetrics.growthPct !== null
      ? `${dashboardMetrics.growthPct >= 0 ? '+' : ''}${dashboardMetrics.growthPct}% mo`
      : 'This month';
  const isNegativeGrowth =
    dashboardMetrics.growthPct !== null && dashboardMetrics.growthPct < 0;

  return (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
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
        <Text style={styles.welcomeTitle}>
          {firstName ? `Welcome, ${firstName}` : 'Welcome'}
        </Text>

        {/* Hero Card: Net profit */}
        <TouchableOpacity
          style={styles.profitCard}
          activeOpacity={0.85}
          onPress={() => onNavigatePage && onNavigatePage('Accounts')}
          accessibilityRole="button"
          accessibilityLabel={`Net profit ${dashboardMetrics.monthLabel} ${formatRupeeAmount(
            dashboardMetrics.netProfit
          )}, view accounts`}
        >
          <Image
            source={netProfitBg}
            style={styles.profitCardBgImage}
            resizeMode="cover"
          />
          <View style={styles.profitCardContent}>
            <View style={styles.profitHeaderRow}>
              <Text style={styles.profitHeader}>Net Income · {dashboardMetrics.monthLabel}</Text>
              <View style={styles.profitBadge}>
                <Text
                  style={[
                    styles.profitBadgeText,
                    isNegativeGrowth && { color: Palette.status.overdue.text },
                  ]}
                >
                  {growthLabel}
                </Text>
              </View>
            </View>
            <Text style={styles.profitAmount}>
              {formatRupeeAmount(dashboardMetrics.netProfit)}
            </Text>
            <Text style={styles.profitBreakdown}>
              Income {formatRupeeAmount(dashboardMetrics.totalIncome)}  ·  Expenses{' '}
              {formatRupeeAmount(dashboardMetrics.totalExpenses)}
            </Text>
            <View
              style={styles.profitTrack}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Net profit margin: ${dashboardMetrics.marginPct}% of total income`}
              accessibilityValue={{ min: 0, max: 100, now: dashboardMetrics.marginPct }}
            >
              <View style={[styles.profitFill, { width: `${dashboardMetrics.marginPct}%` }]} />
            </View>
            
          </View>
        </TouchableOpacity>

        {/* 2-Column Metric Cards */}
        <View style={styles.metricRow}>
          {/* Rooms occupied */}
          <View style={styles.metricCol}>
            <Text style={styles.metricHeading}>Rooms occupied</Text>
            <TouchableOpacity
              style={styles.metricCard}
              activeOpacity={0.85}
              onPress={() => onNavigatePage && onNavigatePage('Rooms')}
              accessibilityRole="button"
              accessibilityLabel={`Rooms occupied ${dashboardMetrics.occupiedRooms} of ${dashboardMetrics.totalRooms}, ${dashboardMetrics.vacantRooms} vacant, view rooms`}
            >
              <Text style={styles.metricValue}>
                {dashboardMetrics.occupiedRooms} / {dashboardMetrics.totalRooms}
              </Text>
              <Text style={styles.metricSubtext}>{dashboardMetrics.vacantRooms} vacant</Text>
            </TouchableOpacity>
          </View>

          {/* Rent pending */}
          <View style={styles.metricCol}>
            <Text style={styles.metricHeading}>Rent pending</Text>
            <TouchableOpacity
              style={styles.metricCard}
              activeOpacity={0.85}
              onPress={() => onNavigatePage && onNavigatePage('Rent', undefined, 'Due')}
              accessibilityRole="button"
              accessibilityLabel={`Rent pending ${formatRupeeAmount(
                dashboardMetrics.pendingRentTotal
              )}, ${dashboardMetrics.pendingRoomsCount} rooms due, view rent`}
            >
              <Text style={[styles.metricValue, { color: Palette.primary }]}>
                {formatRupeeAmount(dashboardMetrics.pendingRentTotal)}
              </Text>
              <Text style={styles.metricSubtext}>
                {dashboardMetrics.pendingRoomsCount}{' '}
                {dashboardMetrics.pendingRoomsCount === 1 ? 'room' : 'rooms'} due
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Rent Due */}
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
          {pendingRents.length === 0 ? (
            <View style={styles.emptyCardRow}>
              <Text style={styles.emptyCardText}>All occupied rooms are paid up for now.</Text>
            </View>
          ) : (
            pendingRents.map((item, index) => {
              const isLast = index === pendingRents.length - 1;
              const isOverdue = item.currentStatus === 'Overdue';
              const badgeLabel = isOverdue ? 'Overdue' : 'Due';
              const statusNote = isOverdue ? 'Pending' : 'Upcoming';
              return (
                <React.Fragment key={item.id}>
                  <TouchableOpacity
                    style={styles.pendingItemRow}
                    activeOpacity={0.7}
                    onPress={() => onNavigatePage && onNavigatePage('Rent', undefined, 'Due')}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.roomNumber}, ${item.tenantName}, ${badgeLabel}, ${item.monthlyRent} ${statusNote}`}
                  >
                    <View style={styles.pendingLeftCol}>
                      <View style={styles.roomBadgeRow}>
                        <Text style={styles.pendingRoomNumber}>{item.roomNumber}</Text>
                        <View style={isOverdue ? styles.overdueBadge : styles.dueBadge}>
                          <Text
                            style={isOverdue ? styles.overdueBadgeText : styles.dueBadgeText}
                          >
                            {badgeLabel}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.pendingTenantText}>
                        {item.tenantName}
                      </Text>
                    </View>
                    <View style={styles.rowRightAction}>
                      <View style={styles.pendingRightCol}>
                        <Text style={styles.pendingAmount}>{item.monthlyRent}</Text>
                        <Text style={styles.pendingSubInfo}>{statusNote}</Text>
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
            })
          )}
        </View>

        {/* Section: Service Requests */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Service Requests</Text>
          <View style={styles.sectionActionRow}>
            <TouchableOpacity
              style={styles.headerRequestButton}
              activeOpacity={0.7}
              onPress={() =>
                onNavigatePage &&
                onNavigatePage('Requests', undefined, undefined, { openCreateModal: true })
              }
              accessibilityRole="button"
              accessibilityLabel="Request"
            >
              <Text style={styles.headerRequestButtonText}>Request</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardContainer}>
          {customerMessages.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCardRow}
              activeOpacity={0.7}
              onPress={() => onNavigatePage && onNavigatePage('Requests')}
            >
              <Text style={styles.emptyCardText}>
                No active service requests. Tap to open Requests.
              </Text>
            </TouchableOpacity>
          ) : (
            customerMessages.slice(0, 5).map((msg, index) => {
              const isLast = index === Math.min(customerMessages.length, 5) - 1;
              return (
                <React.Fragment key={msg.id}>
                  <TouchableOpacity
                    style={styles.messageItem}
                    activeOpacity={0.7}
                    onPress={() => onNavigatePage && onNavigatePage('Requests', msg.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${msg.senderName || 'Resident'}, ${msg.roomNumber || ''}, ${msg.tag}, open message`}
                  >
                    <Text style={styles.messageSenderTitle} numberOfLines={1}>
                      {msg.senderName ? `${msg.senderName} · ${msg.roomNumber || ''}` : msg.title}
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
            })
          )}
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
    backgroundColor: Palette.iconBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  profitCardBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  profitCardContent: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 20,
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
  metricCol: {
    width: '48.5%',
  },
  metricHeading: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  metricCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
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
    fontSize: Typography.fontSize.viewAll,
    fontWeight: '700',
    color: Palette.primary,
    textDecorationLine: 'underline',
    textDecorationColor: Palette.primary,
  },
  cardContainer: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  emptyCardRow: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
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
  sectionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  headerRequestButtonText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.onPrimary,
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
  divider: {
    height: 1,
    backgroundColor: Palette.border,
  },
});
