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
                    size={Typography.iconSize.header}
                    color={Palette.primary}
                  />
                </TouchableOpacity>
              ) : null}
              <Text style={styles.headerTitle}>Notification</Text>
            </View>
          </View>

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
                    <Text style={styles.noticeTitle} numberOfLines={1}>
                      {notice.title}
                    </Text>
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

