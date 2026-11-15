import React, { useEffect, useState } from 'react';
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
import { useCustomerData } from '../../context/CustomerDataContext';
import RequestAdminModal from '../../components/RequestAdminModal';

interface CustomerNoticesViewProps {
  initialNoticeId?: string;
  onBack?: () => void;
}

type NoticeFilter = 'All' | 'Billing' | 'Property' | 'Maintenance';

export default function CustomerNoticesView({
  initialNoticeId,
  onBack,
}: CustomerNoticesViewProps) {
  const { data, markNoticeRead, refreshWorkspace } = useCustomerData();
  const { notices } = data;

  const [filter, setFilter] = useState<NoticeFilter>('All');
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | undefined>(initialNoticeId);
  const [refreshing, setRefreshing] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [bannerText, setBannerText] = useState<string | null>(null);

  useEffect(() => {
    if (initialNoticeId) {
      void markNoticeRead(initialNoticeId);
    }
  }, [initialNoticeId, markNoticeRead]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const filteredNotices = notices.filter((n) =>
    filter === 'All' ? true : n.category === filter
  );

  return (
    <View style={styles.outerScreen}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
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
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {onBack ? (
                <TouchableOpacity
                  style={styles.backButtonCircle}
                  onPress={onBack}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name="chevron-left"
                    size={Typography.iconSize.base}
                    color={Palette.primary}
                  />
                </TouchableOpacity>
              ) : null}
              <Text style={styles.headerTitle}>Notification</Text>
            </View>

            <TouchableOpacity
              style={styles.requestButton}
              onPress={() => setIsRequestModalOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.requestButtonText}>Request</Text>
            </TouchableOpacity>
          </View>

          {bannerText ? (
            <View style={styles.bannerCard}>
              <Feather name="check-circle" size={14} color={Palette.status.completed.text} />
              <Text style={styles.bannerText}>{bannerText}</Text>
              <TouchableOpacity onPress={() => setBannerText(null)}>
                <Text style={styles.bannerDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {(['All', 'Billing', 'Maintenance', 'Property'] as NoticeFilter[]).map((tab) => {
              const active = filter === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilter(tab)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {filteredNotices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>
                Billing reminders and property announcements will appear here.
              </Text>
            </View>
          ) : (
            filteredNotices.map((notice) => {
              const isHighlighted = selectedNoticeId === notice.id;
              return (
                <TouchableOpacity
                  key={notice.id}
                  style={[
                    styles.noticeCard,
                    !notice.isRead && styles.noticeCardUnread,
                    isHighlighted && styles.noticeCardHighlighted,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedNoticeId(notice.id);
                    void markNoticeRead(notice.id);
                  }}
                >
                  <View style={styles.noticeTopRow}>
                    <View style={styles.noticeLeftRow}>
                      <View style={styles.iconCircle}>
                        <Feather
                          name={
                            notice.category === 'Billing'
                              ? 'credit-card'
                              : notice.category === 'Maintenance'
                              ? 'tool'
                              : 'bell'
                          }
                          size={14}
                          color={Palette.primary}
                        />
                      </View>
                      <Text style={styles.noticeTitle} numberOfLines={1}>
                        {notice.title}
                      </Text>
                    </View>
                    <Text style={styles.noticeTag}>{notice.category}</Text>
                  </View>

                  <Text style={styles.noticeMessage}>{notice.message}</Text>
                  <Text style={styles.noticeTime}>{notice.timeLabel}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Quick Request Modal */}
      <RequestAdminModal
        visible={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={(reqTitle) => {
          setBannerText(`Request sent to admin: "${reqTitle}"`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerScreen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.3,
  },
  requestButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButtonText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.status.completed.bg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    marginBottom: 16,
    gap: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: Typography.fontSize.caption,
    color: Palette.status.completed.text,
    fontWeight: '600',
  },
  bannerDismiss: {
    fontSize: Typography.fontSize.caption,
    color: Palette.primary,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.text,
  },
  filterChipTextActive: {
    color: Palette.onPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    textAlign: 'center',
  },
  noticeCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  noticeCardUnread: {
    backgroundColor: Palette.tint,
  },
  noticeCardHighlighted: {
    borderColor: Palette.primary,
    borderWidth: 1.5,
  },
  noticeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  noticeLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  noticeTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
    flexShrink: 1,
  },
  noticeTag: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.primary,
  },
  noticeMessage: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    lineHeight: 19,
  },
  noticeTime: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginTop: 8,
  },
});

