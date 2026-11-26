import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../../constants/theme';
import { useCustomerData } from '../../context/CustomerDataContext';
import { formatRupeeAmount, MONTHS_FULL, parseRupeeAmount } from '../../utils/finance';

const netProfitBg = require('../../../assets/net-profit-bg.png');

export type CustomerPageKey =
  | 'Home'
  | 'Room'
  | 'Payments'
  | 'Requests'
  | 'Notices'
  | 'RulesAndDocs'
  | 'Profile';

interface CustomerHomeViewProps {
  onNavigatePage?: (
    page: CustomerPageKey,
    options?: { openPayModal?: boolean; openNewRequestModal?: boolean; noticeId?: string }
  ) => void;
}

function getRentStatusColors(status: string) {
  if (status === 'Paid') return Palette.status.paid;
  if (status === 'Overdue') return Palette.status.overdue;
  return Palette.status.due;
}

export default function CustomerHomeView({ onNavigatePage }: CustomerHomeViewProps) {
  const { data, refreshWorkspace } = useCustomerData();
  const { profile, room, rentMeta, deposit, notices, requests, ownerContact, leaseInfo } = data;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const firstName = profile.fullName.trim().split(/\s+/)[0] || 'Resident';
  const currentMonthName = MONTHS_FULL[new Date().getMonth()];
  const isDue = rentMeta.currentStatus === 'Due' || rentMeta.currentStatus === 'Overdue';
  const rentNumeric = parseRupeeAmount(room.monthlyRent);
  const maintNumeric = parseRupeeAmount(rentMeta.maintenanceAmount);
  const advanceNumeric = parseRupeeAmount(rentMeta.advancePayment);
  const totalDue = isDue ? Math.max(0, rentNumeric + maintNumeric - advanceNumeric) : 0;

  const statusColors = getRentStatusColors(rentMeta.currentStatus);
  const leasePct =
    leaseInfo.totalMonths > 0
      ? Math.min(100, Math.max(0, Math.round((leaseInfo.completedMonths / leaseInfo.totalMonths) * 100)))
      : 0;

  const latestNotice = notices[0];
  const latestRequest = requests[0];

  const handleCallOwner = () => {
    const digits = ownerContact.phone.replace(/[^\d+]/g, '');
    if (!digits) return;
    void Linking.openURL(`tel:${digits}`).catch(() => { });
  };

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
        {/* Welcome Header */}
        <View style={styles.welcomeHeaderRow}>
          <View style={styles.welcomeTextCol}>
            <Text style={styles.welcomeTitle}>Welcome, {firstName}</Text>
          </View>
        </View>

        {/* Hero Card: Rent & Lease Status matching Admin style */}
        <View style={styles.profitCard}>
          <Image
            source={netProfitBg}
            style={styles.profitCardBgImage}
            resizeMode="cover"
          />
          <View style={styles.profitCardContent}>
            <View style={styles.profitHeaderRow}>
              <Text style={styles.profitHeader}>Rent status · {currentMonthName}</Text>
              <View style={styles.statusBadge}>
                <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                  {rentMeta.statusBadgeText}
                </Text>
              </View>
            </View>

            <Text style={styles.profitAmount}>
              {isDue ? formatRupeeAmount(totalDue) : '₹0 due'}
            </Text>

            <Text style={styles.profitBreakdown}>
              Rent {room.monthlyRent}  ·  Maint. {rentMeta.maintenanceAmount}
              {advanceNumeric > 0 ? `  ·  Adv. ${rentMeta.advancePayment}` : ''}
            </Text>

            <View
              style={styles.profitTrack}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`Lease progress: ${leasePct}% completed`}
              accessibilityValue={{ min: 0, max: 100, now: leasePct }}
            >
              <View style={[styles.profitFill, { width: `${leasePct}%` }]} />
            </View>
            <Text style={styles.profitScaleText}>
              Lease month {leaseInfo.completedMonths} of {leaseInfo.totalMonths} · Due {rentMeta.dueDate}
            </Text>

            <View style={styles.heroActionRow}>
              {isDue ? (
                <TouchableOpacity
                  style={styles.primaryCtaBtn}
                  activeOpacity={0.85}
                  onPress={() => onNavigatePage?.('Payments', { openPayModal: true })}
                  accessibilityRole="button"
                  accessibilityLabel="Pay rent now"
                >
                  <Feather name="credit-card" size={16} color={Palette.onPrimary} />
                  <Text style={styles.primaryCtaText}>Pay Rent Now</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.secondaryCtaBtn}
                  activeOpacity={0.85}
                  onPress={() => onNavigatePage?.('Payments')}
                  accessibilityRole="button"
                  accessibilityLabel="View payment receipts"
                >
                  <Feather name="file-text" size={16} color={Palette.primary} />
                  <Text style={styles.secondaryCtaText}>View Receipts & Ledger</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* 2-Column Metric Cards matching Admin Dashboard */}
        <View style={styles.metricRow}>
          <View style={styles.metricCol}>
            <Text style={styles.metricHeading}>Security deposit</Text>
            <TouchableOpacity
              style={styles.metricCard}
              activeOpacity={0.85}
              onPress={() => onNavigatePage?.('Payments')}
              accessibilityRole="button"
              accessibilityLabel={`Security deposit ${deposit.amount}, ${deposit.status}`}
            >
              <Text style={styles.metricValue}>{deposit.amount}</Text>
              <Text
                style={[
                  styles.metricSubtext,
                  deposit.status !== 'Held' &&
                  deposit.status !== 'Paid' && { color: Palette.status.due.text, fontWeight: '700' },
                ]}
              >
                {deposit.status === 'Held' || deposit.status === 'Paid'
                  ? 'Held · Refundable'
                  : 'Due · Tap to pay'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metricCol}>
            <Text style={styles.metricHeading}>Assigned room</Text>
            <TouchableOpacity
              style={styles.metricCard}
              activeOpacity={0.85}
              onPress={() => onNavigatePage?.('Room')}
              accessibilityRole="button"
              accessibilityLabel={`Room ${room.roomNumber}, ${room.type}`}
            >
              <Text style={[styles.metricValue, { color: Palette.primary }]}>
                {room.roomNumber}
              </Text>
              <Text style={styles.metricSubtext}>
                {room.type} · {room.wing}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Upcoming & Recent Payments */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Rent & Payments</Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => onNavigatePage?.('Payments')}
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
          {isDue ? (
            <>
              <TouchableOpacity
                style={styles.listRow}
                activeOpacity={0.7}
                onPress={() => onNavigatePage?.('Payments', { openPayModal: true })}
              >
                <View style={styles.listLeftCol}>
                  <View style={styles.titleBadgeRow}>
                    <Text style={styles.rowTitle}>{currentMonthName} Bill</Text>
                    <Text
                      style={[
                        styles.inlineStatusText,
                        {
                          color:
                            rentMeta.currentStatus === 'Overdue'
                              ? Palette.status.overdue.text
                              : Palette.status.due.text,
                        },
                      ]}
                    >
                      {rentMeta.currentStatus}
                    </Text>
                  </View>
                  <Text style={styles.rowSub}>
                    Due {rentMeta.dueDate} · Tap to pay
                  </Text>
                </View>
                <View style={styles.rowRightAction}>
                  <View style={styles.rowRightCol}>
                    <Text style={styles.rowAmount}>{formatRupeeAmount(totalDue)}</Text>
                    <Text style={styles.rowRightSub}>Pending</Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={Typography.iconSize.sm}
                    color={Palette.primary}
                  />
                </View>
              </TouchableOpacity>
              {rentMeta.history.length > 0 ? <View style={styles.divider} /> : null}
            </>
          ) : null}

          {rentMeta.history.length === 0 && !isDue ? (
            <View style={styles.emptyCardRow}>
              <Text style={styles.emptyCardText}>No payment records yet.</Text>
            </View>
          ) : (
            rentMeta.history.slice(0, 3).map((item, idx) => {
              const sliceLen = Math.min(rentMeta.history.length, 3);
              const isLast = idx === sliceLen - 1;
              return (
                <React.Fragment key={item.id}>
                  <TouchableOpacity
                    style={styles.listRow}
                    activeOpacity={0.7}
                    onPress={() => onNavigatePage?.('Payments')}
                  >
                    <View style={styles.listLeftCol}>
                      <View style={styles.titleBadgeRow}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text
                          style={[
                            styles.inlineStatusText,
                            { color: Palette.status.paid.text },
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                      <Text style={styles.rowSub}>
                        {item.date} · {item.method || 'UPI'}
                      </Text>
                    </View>
                    <View style={styles.rowRightAction}>
                      <View style={styles.rowRightCol}>
                        <Text style={styles.rowAmount}>{item.amount}</Text>
                        <Text style={styles.rowRightSub}>Receipt</Text>
                      </View>
                      <Feather
                        name="chevron-right"
                        size={Typography.iconSize.sm}
                        color={Palette.primary}
                      />
                    </View>
                  </TouchableOpacity>
                  {!isLast ? <View style={styles.divider} /> : null}
                </React.Fragment>
              );
            })
          )}
        </View>

        {/* Section: Announcements & Quick Contact */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Notification</Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => onNavigatePage?.('Notices')}
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
          {latestNotice ? (
            <>
              <TouchableOpacity
                style={styles.compactRow}
                activeOpacity={0.7}
                onPress={() => onNavigatePage?.('Notices', { noticeId: latestNotice.id })}
              >
                <View style={styles.centeredTextCol}>
                  <Text style={[styles.compactTitle, styles.centeredText]} numberOfLines={1}>
                    {latestNotice.title}
                  </Text>
                  <Text style={[styles.rowSub, styles.centeredText]} numberOfLines={1}>
                    {latestNotice.message}
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={Typography.iconSize.sm}
                  color={Palette.primary}
                />
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          ) : null}

          <View style={styles.supportRow}>
            <View style={styles.centeredTextCol}>
              <Text
                style={[
                  styles.compactTitle,
                  styles.centeredText,
                  !ownerContact.phone && { marginBottom: 0 },
                ]}
                numberOfLines={1}
              >
                {ownerContact.name} · Property Owner
              </Text>
              {ownerContact.phone ? (
                <Text style={[styles.rowSub, styles.centeredText]} numberOfLines={1}>
                  {ownerContact.phone}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.callChip}
              activeOpacity={0.8}
              onPress={handleCallOwner}
            >
              <Feather name="phone" size={13} color={Palette.primary} />
              <Text style={styles.callChipText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Service Requests */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Service Requests</Text>
          <TouchableOpacity
            style={styles.headerRequestButton}
            activeOpacity={0.85}
            onPress={() => onNavigatePage?.('Requests', { openNewRequestModal: true })}
          >
            <Text style={styles.headerRequestButtonText}>Request</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardContainer}>
          {latestRequest ? (
            <>
              <TouchableOpacity
                style={styles.compactRow}
                activeOpacity={0.7}
                onPress={() => onNavigatePage?.('Requests')}
              >
                <View style={styles.centeredTextCol}>
                  <View style={[styles.titleBadgeRow, { justifyContent: 'center' }]}>
                    <Text style={[styles.compactTitle, styles.centeredText]} numberOfLines={1}>
                      {latestRequest.title}
                    </Text>
                    <Text
                      style={[
                        styles.inlineStatusText,
                        {
                          color:
                            latestRequest.status === 'Resolved'
                              ? Palette.status.paid.text
                              : latestRequest.status === 'In Progress'
                                ? Palette.primary
                                : Palette.status.due.text,
                        },
                      ]}
                    >
                      {latestRequest.status}
                    </Text>
                  </View>
                  <Text style={[styles.rowSub, styles.centeredText]} numberOfLines={1}>
                    {latestRequest.roomNumber || room.roomNumber} · {latestRequest.category} · {latestRequest.timeLabel}
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={Typography.iconSize.sm}
                  color={Palette.primary}
                />
              </TouchableOpacity>
              <View style={styles.divider} />
            </>
          ) : null}

          <TouchableOpacity
            style={styles.supportRow}
            activeOpacity={0.7}
            onPress={() => onNavigatePage?.('Requests', { openNewRequestModal: true })}
          >
            <View style={styles.centeredTextCol}>
              <Text style={[styles.compactTitle, styles.centeredText]} numberOfLines={1}>
                Need Help or Maintenance?
              </Text>
              <Text style={[styles.rowSub, styles.centeredText]} numberOfLines={1}>
                Tap to submit a new service request
              </Text>
            </View>
            <View style={styles.callChip}>
              <Feather name="plus" size={13} color={Palette.primary} />
              <Text style={styles.callChipText}>New</Text>
            </View>
          </TouchableOpacity>
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
  welcomeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  welcomeTextCol: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.3,
  },
  welcomeSub: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roomChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.primary,
  },
  profitCard: {
    backgroundColor: '#E0D2F7',
    borderRadius: 12,
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
  statusBadge: {
    paddingVertical: 1,
  },
  statusBadgeText: {
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
    backgroundColor: 'rgba(75, 0, 130, 0.15)',
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
  heroActionRow: {
    marginTop: 16,
  },
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    borderRadius: Radius.sm,
    paddingVertical: 11,
  },
  primaryCtaText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
  secondaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingVertical: 10,
  },
  secondaryCtaText: {
    color: Palette.primary,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
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
    fontSize: 14,
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

  metricLabel: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '400',
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
    fontSize: 10,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
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
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
    textDecorationLine: 'underline',
    textDecorationColor: Palette.primary,
  },
  actionLinkText: {
    fontSize: Typography.fontSize.viewAll,
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
  emptyCardRow: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  listLeftCol: {
    flex: 1,
    marginRight: 12,
  },
  centeredTextCol: {
    flex: 1,
    marginRight: 12,
    alignItems: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rowTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    flexShrink: 1,
  },
  inlineStatusText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
  },
  rowRightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowRightCol: {
    alignItems: 'flex-end',
  },
  rowAmount: {
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
    color: Palette.primary,
    marginBottom: 2,
  },
  rowRightSub: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  compactTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 2,
  },
  compactRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  singleWordTag: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  callChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  callChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
  },
});

