import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, Typography } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import type { NotificationItem } from '../../types/appData';

export type { NotificationItem };

interface NotificationsViewProps {
  initialNoticeId?: string;
  onBack?: () => void;
}

export default function NotificationsView({ initialNoticeId, onBack }: NotificationsViewProps) {
  const {
    notifications: notices,
    markNotificationRead,
    clearNotifications,
    refreshWorkspace,
  } = useAppData();

  const [filter, setFilter] = useState<'All' | 'Unread'>('All');
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | undefined>(initialNoticeId);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialNoticeId) {
      void markNotificationRead(initialNoticeId);
    }
  }, [initialNoticeId, markNotificationRead]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  // System and administrative notifications
  const systemNotices = useMemo(() => {
    return notices.filter((n) => n.type === 'system');
  }, [notices]);

  const filteredNotices = useMemo(() => {
    if (filter === 'Unread') {
      return systemNotices.filter((n) => !n.isRead);
    }
    return systemNotices;
  }, [systemNotices, filter]);

  const unreadCount = useMemo(() => {
    return systemNotices.filter((n) => !n.isRead).length;
  }, [systemNotices]);

  return (
    <KeyboardAvoidingView
      style={styles.outerScreen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          {/* Header Row without Request button */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backButtonCircle}
                onPress={onBack}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Feather name="chevron-left" size={Typography.iconSize.header} color={Palette.primary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            <View style={styles.headerRightActions}>
              {systemNotices.length > 0 ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setShowClearConfirm(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Clear notifications"
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {statusNotice ? (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeBannerText}>{statusNotice}</Text>
              <TouchableOpacity onPress={() => setStatusNotice(null)}>
                <Text style={styles.noticeDismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {(['All', 'Unread'] as const).map((tab) => {
              const isActive = filter === tab;
              const count = tab === 'All' ? systemNotices.length : unreadCount;

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilter(tab)}
                  activeOpacity={0.7}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {tab} {count > 0 ? `(${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Notices List */}
          {filteredNotices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather
                name="bell"
                size={Typography.iconSize.lg}
                color={Palette.primary}
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySub}>
                {filter === 'Unread'
                  ? 'All notifications have been read.'
                  : 'All caught up! System updates and announcements will appear here.'}
              </Text>
            </View>
          ) : (
            filteredNotices.map((item) => {
              const isHighlighted = item.id === selectedNoticeId;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.noticeCard,
                    !item.isRead && styles.noticeCardUnread,
                    isHighlighted && styles.noticeCardHighlighted,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setSelectedNoticeId(item.id);
                    void markNotificationRead(item.id);
                  }}
                >
                  {/* Top Row: Title, Tag & Time */}
                  <View style={styles.noticeTopRow}>
                    <View style={styles.noticeSenderRow}>
                      <Text style={styles.noticeTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>

                    <View style={styles.noticeRightRow}>
                      <Text style={styles.singleWordTag}>{item.tag}</Text>
                      <Text style={styles.noticeTime}>{item.time}</Text>
                    </View>
                  </View>

                  {/* Message Content */}
                  <Text style={styles.noticeMessage}>{item.message}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Clear Confirmation Modal */}
      <Modal
        visible={showClearConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowClearConfirm(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Clear Notifications</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to clear all notifications?
            </Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowClearConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={() => {
                  setShowClearConfirm(false);
                  void clearNotifications();
                  setStatusNotice('Notifications cleared.');
                }}
              >
                <Text style={styles.confirmDeleteText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: Palette.background,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Palette.accentText,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 10,
  },
  noticeBannerText: {
    flex: 1,
    fontSize: Typography.fontSize.caption,
    color: Palette.text,
    fontWeight: '600',
  },
  noticeDismissText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.primary,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterChipText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  filterChipTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  noticeCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginBottom: 12,
  },
  noticeCardUnread: {
    borderColor: Palette.border,
    backgroundColor: Palette.tint,
  },
  noticeCardHighlighted: {
    borderColor: Palette.primary,
    backgroundColor: Palette.tint,
  },
  noticeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  noticeSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  noticeTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  noticeRightRow: {
    alignItems: 'flex-end',
    gap: 2,
  },
  singleWordTag: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noticeTime: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textMuted,
  },
  noticeMessage: {
    fontSize: Typography.fontSize.caption,
    color: Palette.text,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  confirmOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.backdrop,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Palette.surface,
    borderRadius: 5,
    padding: 18,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  confirmTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  confirmCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  confirmCancelText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  confirmDeleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: Palette.status.overdue.text,
  },
  confirmDeleteText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
});
