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
import { Palette, Radius, Typography } from '../../constants/theme';

export interface NotificationItem {
  id: string;
  type: 'customer' | 'system';
  title: string;
  roomNumber?: string;
  senderName?: string;
  phone?: string;
  tag: string;
  message: string;
  time: string;
  isRead?: boolean;
}

export const INITIAL_NOTICES: NotificationItem[] = [
  {
    id: 'msg-1',
    type: 'customer',
    title: 'Sana Khan · Room 104',
    senderName: 'Sana Khan',
    roomNumber: 'Room 104',
    phone: '+91 97400 99881',
    tag: 'Plumbing',
    message: 'Water tap in bathroom is leaking continuously, please send plumber today.',
    time: '10m ago',
    isRead: false,
  },
  {
    id: 'msg-2',
    type: 'customer',
    title: 'Sneha Patel · Room 202',
    senderName: 'Sneha Patel',
    roomNumber: 'Room 202',
    phone: '+91 94480 33445',
    tag: 'Electrical',
    message: 'Main bedroom fan regulator is not rotating properly, needs replacement.',
    time: '2h ago',
    isRead: false,
  },
  {
    id: 'msg-3',
    type: 'customer',
    title: 'Anil Rao · Room 101',
    senderName: 'Anil Rao',
    roomNumber: 'Room 101',
    phone: '+91 98450 11223',
    tag: 'Payment',
    message: 'Transferred October rent of ₹9,000 via UPI (Ref: 430198). Please confirm receipt.',
    time: 'Today, 11:30 AM',
    isRead: false,
  },
  {
    id: 'sys-1',
    type: 'system',
    title: 'Priya Sharma · Room 102',
    roomNumber: 'Room 102',
    senderName: 'Priya Sharma',
    phone: '+91 98765 43210',
    tag: 'Overdue',
    message: 'Monthly rent of ₹15,000 is overdue since October 15. Reminder sent.',
    time: 'Yesterday',
    isRead: true,
  },
  {
    id: 'sys-2',
    type: 'system',
    title: 'Arjun Kumar · Room 201',
    roomNumber: 'Room 201',
    senderName: 'Arjun Kumar',
    phone: '+91 99001 22334',
    tag: 'Upcoming',
    message: 'Monthly rent of ₹10,000 is scheduled for collection on November 1.',
    time: 'Oct 28',
    isRead: true,
  },
];

interface NotificationsViewProps {
  initialNoticeId?: string;
  onBack?: () => void;
}

export default function NotificationsView({ initialNoticeId, onBack }: NotificationsViewProps) {
  const [notices, setNotices] = useState<NotificationItem[]>(INITIAL_NOTICES);
  const [filter, setFilter] = useState<'All' | 'Customer' | 'System'>('All');
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | undefined>(initialNoticeId);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const filteredNotices = notices.filter((n) => {
    if (filter === 'All') return true;
    if (filter === 'Customer') return n.type === 'customer';
    if (filter === 'System') return n.type === 'system';
    return true;
  });

  const handleAction = (item: NotificationItem) => {
    if (item.type === 'customer' && item.phone) {
      Alert.alert(
        item.title,
        `"${item.message}"\n\nContact: ${item.phone}`,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Call Customer',
            onPress: () => Alert.alert('Dialing', `Calling ${item.senderName} at ${item.phone}`),
          },
          {
            text: 'WhatsApp',
            onPress: () => Alert.alert('WhatsApp', `Opening chat with ${item.senderName}`),
          },
        ]
      );
    } else {
      Alert.alert(item.title, item.message);
    }
  };

  const handleClearNotices = () => {
    if (notices.length === 0) {
      Alert.alert('Notifications', 'No notifications to clear.');
      return;
    }
    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setNotices([]);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.outerScreen}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
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
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButtonCircle}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-left" size={Typography.iconSize.base} color={Palette.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearNotices}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['All', 'Customer', 'System'] as const).map((tab) => {
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

        {/* Notices List */}
        {filteredNotices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="bell" size={Typography.iconSize.lg} color={Palette.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySub}>All caught up! New updates will appear here.</Text>
          </View>
        ) : (
          filteredNotices.map((item) => {
            const isHighlighted = item.id === selectedNoticeId;
            const isCustomer = item.type === 'customer';

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.noticeCard,
                  isHighlighted && styles.noticeCardHighlighted,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedNoticeId(item.id);
                  handleAction(item);
                }}
              >
                {/* Top Row: Icon/Sender, Tag, Time */}
                <View style={styles.noticeTopRow}>
                  <View style={styles.noticeSenderRow}>
                    <View style={[styles.typeIconBox, isCustomer ? styles.customerIconBox : styles.systemIconBox]}>
                      <Feather
                        name={isCustomer ? 'message-circle' : 'bell'}
                        size={Typography.iconSize.sm}
                        color={Palette.primary}
                      />
                    </View>
                    <Text style={styles.noticeTitle}>{item.title}</Text>
                  </View>

                  <View style={styles.noticeRightRow}>
                    <Text style={styles.singleWordTag}>{item.tag}</Text>
                    <Text style={styles.noticeTime}>{item.time}</Text>
                  </View>
                </View>

                {/* Message Content */}
                <Text style={styles.noticeMessage}>
                  {item.message}
                </Text>

                {/* Quick Action Chips for customer message */}
                {isCustomer && (
                  <View style={styles.actionChipRow}>
                    <TouchableOpacity
                      style={styles.actionChip}
                      onPress={() => Alert.alert('Call', `Dialing ${item.senderName} (${item.phone})`)}
                    >
                      <Feather name="phone" size={Typography.iconSize.sm} color={Palette.accentText} style={{ marginRight: 4 }} />
                      <Text style={styles.actionChipText}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionChip}
                      onPress={() => Alert.alert('WhatsApp', `Opening WhatsApp for ${item.senderName}`)}
                    >
                      <Feather name="message-circle" size={Typography.iconSize.sm} color={Palette.status.active.text} style={{ marginRight: 4 }} />
                      <Text style={[styles.actionChipText, { color: Palette.status.active.text }]}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
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
    paddingBottom: 24,
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
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '700',
    color: Palette.text,
    letterSpacing: 0.3,
    ...Platform.select({
      ios: { fontFamily: 'Georgia' },
      android: { fontFamily: 'serif' },
      default: { fontFamily: 'serif' },
    }),
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Palette.accentText,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
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
  noticeCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  noticeCardHighlighted: {
    borderColor: Palette.accentText,
    borderWidth: 1.5,
    backgroundColor: Palette.surface,
  },
  noticeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noticeSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  typeIconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  customerIconBox: {
    backgroundColor: Palette.iconBg,
  },
  systemIconBox: {
    backgroundColor: Palette.iconBg,
  },
  noticeTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  noticeRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  singleWordTag: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.accentText,
  },
  noticeTime: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
  },
  noticeMessage: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    lineHeight: 19,
    marginTop: 2,
  },
  actionChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.iconBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  actionChipText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.accentText,
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
});

