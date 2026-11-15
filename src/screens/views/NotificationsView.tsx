import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Linking,
  RefreshControl,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import type {
  NotificationItem,
  ServiceRequestStatus,
} from '../../types/appData';

export type { NotificationItem };

interface NotificationsViewProps {
  initialNoticeId?: string;
  onBack?: () => void;
}

export default function NotificationsView({ initialNoticeId, onBack }: NotificationsViewProps) {
  const {
    notifications: notices,
    rooms,
    staff,
    addNotification,
    updateNotification,
    markNotificationRead,
    clearNotifications,
    refreshWorkspace,
  } = useAppData();

  const [filter, setFilter] = useState<'All' | 'Request' | 'System'>('All');
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | undefined>(initialNoticeId);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // New Request Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [selectedRoomOption, setSelectedRoomOption] = useState('All');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [descInput, setDescInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Request Details Modal State
  const [selectedRequestModal, setSelectedRequestModal] = useState<NotificationItem | null>(null);

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

  const filteredNotices = notices.filter((n) => {
    if (filter === 'All') return true;
    if (filter === 'Request') return n.type === 'customer';
    if (filter === 'System') return n.type === 'system';
    return true;
  });

  const handleCall = (phone?: string, name?: string) => {
    if (!phone) return;
    const digits = phone.replace(/[^\d+]/g, '');
    void Linking.openURL(`tel:${digits}`).catch(() => {
      setStatusNotice(`Call ${name || 'Resident'}: ${phone}`);
    });
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    if (!phone) return;
    const digits = phone.replace(/[^\d]/g, '');
    void Linking.openURL(`https://wa.me/${digits}`).catch(() => {
      setStatusNotice(`WhatsApp ${name || 'Resident'}: ${phone}`);
    });
  };

  const dueRoomsList = rooms.filter((r) => r.status === 'Rent due');

  const handleOpenCreateModal = () => {
    setSelectedRoomOption('All');
    setIsRoomDropdownOpen(false);
    setRoomSearchQuery('');
    setDescInput('');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateRequest = async () => {
    const message = descInput.trim();

    if (!message) {
      setFormError('Please enter a description for the request.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      if (selectedRoomOption === 'All') {
        await addNotification({
          type: 'customer',
          senderName: 'Notice',
          roomNumber: 'All Rooms',
          tag: 'General',
          message,
          priority: 'Normal',
          status: 'Open',
        });
        setStatusNotice('Request created for All Rooms.');
      } else if (selectedRoomOption === 'Due Room') {
        await addNotification({
          type: 'customer',
          senderName: 'Rent Reminder',
          roomNumber: 'Due Rooms',
          tag: 'Rent Due',
          message,
          priority: 'Urgent',
          status: 'Open',
        });
        setStatusNotice('Request created for Due Rooms.');
      } else {
        const matchedRoom = rooms.find(
          (r) =>
            r.roomNumber === selectedRoomOption ||
            r.roomNumber === `Room ${selectedRoomOption}` ||
            `Room ${r.roomNumber}` === selectedRoomOption
        );
        const primary = matchedRoom?.members?.[0];
        const sender = primary?.name || 'Resident';
        const phone = primary?.phone;
        const roomNum = selectedRoomOption.startsWith('Room')
          ? selectedRoomOption
          : `Room ${selectedRoomOption}`;
        const isRentDue = matchedRoom?.status === 'Rent due';

        await addNotification({
          type: 'customer',
          senderName: sender,
          roomNumber: roomNum,
          phone,
          tag: isRentDue ? 'Rent Due' : 'Request',
          message,
          priority: isRentDue ? 'Urgent' : 'Normal',
          status: 'Open',
        });
        setStatusNotice(`Request created for ${roomNum}.`);
      }

      setIsCreateModalOpen(false);
      setDescInput('');
      setRoomSearchQuery('');
      setSelectedRoomOption('All');
    } catch {
      setFormError('Failed to save request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateModalStatus = async (
    noticeId: string,
    newStatus: ServiceRequestStatus
  ) => {
    await updateNotification(noticeId, { status: newStatus });
    if (selectedRequestModal && selectedRequestModal.id === noticeId) {
      setSelectedRequestModal({
        ...selectedRequestModal,
        status: newStatus,
      });
    }
    setStatusNotice(`Request marked as ${newStatus}.`);
  };

  const handleAssignStaff = async (noticeId: string, staffName: string) => {
    await updateNotification(noticeId, { assignedStaff: staffName });
    if (selectedRequestModal && selectedRequestModal.id === noticeId) {
      setSelectedRequestModal({
        ...selectedRequestModal,
        assignedStaff: staffName,
      });
    }
    setStatusNotice(`Assigned to ${staffName}.`);
  };

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
          {/* Header Row */}
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
                <Feather name="chevron-left" size={Typography.iconSize.base} color={Palette.primary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Notifications</Text>
            </View>

            <View style={styles.headerRightActions}>
              {/* "Request" Button - positioned bit down, without + icon */}
              <TouchableOpacity
                style={styles.requestHeaderButton}
                onPress={handleOpenCreateModal}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Create Request"
              >
                <Text style={styles.requestHeaderButtonText}>Request</Text>
              </TouchableOpacity>

              {notices.length > 0 ? (
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

          {/* Filter Pills with "Request" tab */}
          <View style={styles.filterRow}>
            {(['All', 'Request', 'System'] as const).map((tab) => {
              const isActive = filter === tab;
              const count =
                tab === 'All'
                  ? notices.length
                  : tab === 'Request'
                  ? notices.filter((n) => n.type === 'customer').length
                  : notices.filter((n) => n.type === 'system').length;

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
                {filter === 'Request'
                  ? 'No service requests found. Tap "Request" to log a new request.'
                  : 'All caught up! New updates will appear here.'}
              </Text>

              {filter === 'Request' ? (
                <TouchableOpacity
                  style={[styles.requestHeaderButton, { marginTop: 16 }]}
                  onPress={handleOpenCreateModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.requestHeaderButtonText}>Send</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            filteredNotices.map((item) => {
              const isHighlighted = item.id === selectedNoticeId;
              const isCustomer = item.type === 'customer';
              const reqStatus: ServiceRequestStatus = item.status || 'Open';

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
                  {/* Top Row: Icon/Sender, Tag & Status, Time */}
                  <View style={styles.noticeTopRow}>
                    <View style={styles.noticeSenderRow}>
                      <View
                        style={[
                          styles.typeIconBox,
                          isCustomer ? styles.customerIconBox : styles.systemIconBox,
                        ]}
                      >
                        <Feather
                          name={isCustomer ? 'tool' : 'bell'}
                          size={Typography.iconSize.sm}
                          color={Palette.primary}
                        />
                      </View>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.noticeTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {item.assignedStaff ? (
                          <Text style={styles.assignedStaffSubtext} numberOfLines={1}>
                            Assigned: {item.assignedStaff}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.noticeRightRow}>
                      {isCustomer ? (
                        <View
                          style={[
                            styles.statusMiniBadge,
                            reqStatus === 'Resolved'
                              ? styles.statusBadgeResolved
                              : reqStatus === 'In Progress'
                              ? styles.statusBadgeProgress
                              : styles.statusBadgeOpen,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusMiniBadgeText,
                              reqStatus === 'Resolved'
                                ? styles.statusTextResolved
                                : reqStatus === 'In Progress'
                                ? styles.statusTextProgress
                                : styles.statusTextOpen,
                            ]}
                          >
                            {reqStatus}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.singleWordTag}>{item.tag}</Text>
                      <Text style={styles.noticeTime}>{item.time}</Text>
                    </View>
                  </View>

                  {/* Message Content */}
                  <Text style={styles.noticeMessage}>{item.message}</Text>

                  {/* Action Chips: includes the Request button */}
                  <View style={styles.actionChipRow}>
                    {/* Dedicated Request Button */}
                    <TouchableOpacity
                      style={[styles.actionChip, styles.actionChipPrimary]}
                      onPress={() => setSelectedRequestModal(item)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="View or manage request"
                    >
                      <Feather
                        name="clipboard"
                        size={Typography.iconSize.sm}
                        color={Palette.primary}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[styles.actionChipText, { color: Palette.primary, fontWeight: '700' }]}>
                        Request
                      </Text>
                    </TouchableOpacity>

                    {item.phone ? (
                      <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() => handleCall(item.phone, item.senderName)}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name="phone"
                          size={Typography.iconSize.sm}
                          color={Palette.accentText}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.actionChipText}>Call</Text>
                      </TouchableOpacity>
                    ) : null}

                    {item.phone ? (
                      <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() => handleWhatsApp(item.phone, item.senderName)}
                        activeOpacity={0.7}
                      >
                        <Feather
                          name="message-circle"
                          size={Typography.iconSize.sm}
                          color={Palette.status.active.text}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.actionChipText, { color: Palette.status.active.text }]}>
                          WhatsApp
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
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
                }}
              >
                <Text style={styles.confirmDeleteText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Service Request Modal */}
      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmitting) setIsCreateModalOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              if (!isSubmitting) setIsCreateModalOpen(false);
            }}
          >
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.createModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalIconBox}>
                  <Feather name="clipboard" size={18} color={Palette.primary} />
                </View>
                <Text style={styles.modalTitle}>New Request</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!isSubmitting) setIsCreateModalOpen(false);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 460 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              nestedScrollEnabled
            >
              {/* 1st: Select Room (Dropdown) */}
              <Text style={styles.fieldLabel}>Select Room</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setIsRoomDropdownOpen((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Feather
                    name={
                      selectedRoomOption === 'All'
                        ? 'users'
                        : selectedRoomOption === 'Due Room'
                        ? 'alert-circle'
                        : 'home'
                    }
                    size={16}
                    color={
                      selectedRoomOption === 'Due Room'
                        ? Palette.status.overdue.text
                        : Palette.primary
                    }
                  />
                  <Text style={styles.dropdownSelectorText} numberOfLines={1}>
                    {selectedRoomOption}
                  </Text>
                  {selectedRoomOption === 'Due Room' && (
                    <View style={styles.dropdownDueBadge}>
                      <Text style={styles.dropdownDueBadgeText}>Due</Text>
                    </View>
                  )}
                </View>
                <Feather
                  name={isRoomDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={Typography.iconSize.base}
                  color={Palette.accentText}
                />
              </TouchableOpacity>

              {isRoomDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  {/* Search Bar in Select Room */}
                  <View style={styles.dropdownSearchContainer}>
                    <Feather
                      name="search"
                      size={14}
                      color={Palette.accentText}
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={styles.dropdownSearchInput}
                      placeholder="Search room or resident..."
                      placeholderTextColor={Palette.textMuted}
                      value={roomSearchQuery}
                      onChangeText={setRoomSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {roomSearchQuery.trim().length > 0 && (
                      <TouchableOpacity
                        onPress={() => setRoomSearchQuery('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="x" size={14} color={Palette.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <ScrollView
                    style={styles.dropdownScroll}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {/* All (Default) */}
                    {(!roomSearchQuery.trim() ||
                      'all'.includes(roomSearchQuery.trim().toLowerCase()) ||
                      'all rooms'.includes(roomSearchQuery.trim().toLowerCase())) && (
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          selectedRoomOption === 'All' && styles.dropdownItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedRoomOption('All');
                          setIsRoomDropdownOpen(false);
                          setRoomSearchQuery('');
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.dropdownItemText,
                              selectedRoomOption === 'All' && styles.dropdownItemTextSelected,
                            ]}
                          >
                            All
                          </Text>
                          <Text style={styles.dropdownItemSub}>All rooms & residents</Text>
                        </View>
                        {selectedRoomOption === 'All' && (
                          <Feather name="check" size={Typography.iconSize.sm} color={Palette.primary} />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Due Room */}
                    {(!roomSearchQuery.trim() ||
                      'due'.includes(roomSearchQuery.trim().toLowerCase()) ||
                      'due room'.includes(roomSearchQuery.trim().toLowerCase()) ||
                      'due rooms'.includes(roomSearchQuery.trim().toLowerCase()) ||
                      'pending'.includes(roomSearchQuery.trim().toLowerCase())) && (
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          selectedRoomOption === 'Due Room' && styles.dropdownItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedRoomOption('Due Room');
                          setIsRoomDropdownOpen(false);
                          setRoomSearchQuery('');
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                selectedRoomOption === 'Due Room' && styles.dropdownItemTextSelected,
                              ]}
                            >
                              Due Room
                            </Text>
                            <View style={styles.dropdownDueBadge}>
                              <Text style={styles.dropdownDueBadgeText}>Due</Text>
                            </View>
                          </View>
                          <Text style={styles.dropdownItemSub}>
                            {dueRoomsList.length > 0
                              ? `${dueRoomsList.length} ${dueRoomsList.length === 1 ? 'room' : 'rooms'} with pending rent`
                              : 'Rooms with pending rent'}
                          </Text>
                        </View>
                        {selectedRoomOption === 'Due Room' && (
                          <Feather name="check" size={Typography.iconSize.sm} color={Palette.primary} />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Individual Rooms */}
                    {rooms
                      .filter((r) => {
                        const q = roomSearchQuery.trim().toLowerCase();
                        if (!q) return true;
                        const matchNum = r.roomNumber.toLowerCase().includes(q);
                        const matchMember =
                          r.members &&
                          r.members.some(
                            (m) =>
                              m.name.toLowerCase().includes(q) ||
                              (m.phone && m.phone.toLowerCase().includes(q))
                          );
                        const matchStatus = r.status.toLowerCase().includes(q);
                        return matchNum || matchMember || matchStatus;
                      })
                      .map((r) => {
                        const isSel = selectedRoomOption === r.roomNumber;
                        const occupant =
                          r.members && r.members.length > 0
                            ? r.members[0].name
                            : r.status;
                        const isDue = r.status === 'Rent due';

                        return (
                          <TouchableOpacity
                            key={r.id}
                            style={[
                              styles.dropdownItem,
                              isSel && styles.dropdownItemSelected,
                            ]}
                            onPress={() => {
                              setSelectedRoomOption(r.roomNumber);
                              setIsRoomDropdownOpen(false);
                              setRoomSearchQuery('');
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    isSel && styles.dropdownItemTextSelected,
                                  ]}
                                >
                                  {r.roomNumber}
                                </Text>
                                {isDue && (
                                  <View style={styles.dropdownDueBadge}>
                                    <Text style={styles.dropdownDueBadgeText}>Due</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.dropdownItemSub}>{occupant}</Text>
                            </View>
                            {isSel && (
                              <Feather name="check" size={Typography.iconSize.sm} color={Palette.primary} />
                            )}
                          </TouchableOpacity>
                        );
                      })}

                    {Boolean(roomSearchQuery.trim()) &&
                      !'all'.includes(roomSearchQuery.trim().toLowerCase()) &&
                      !'all rooms'.includes(roomSearchQuery.trim().toLowerCase()) &&
                      !'due'.includes(roomSearchQuery.trim().toLowerCase()) &&
                      !'due room'.includes(roomSearchQuery.trim().toLowerCase()) &&
                      !'due rooms'.includes(roomSearchQuery.trim().toLowerCase()) &&
                      rooms.filter((r) => {
                        const q = roomSearchQuery.trim().toLowerCase();
                        const matchNum = r.roomNumber.toLowerCase().includes(q);
                        const matchMember =
                          r.members &&
                          r.members.some((m) => m.name.toLowerCase().includes(q));
                        const matchStatus = r.status.toLowerCase().includes(q);
                        return matchNum || matchMember || matchStatus;
                      }).length === 0 && (
                        <View style={styles.dropdownEmptyState}>
                          <Text style={styles.dropdownEmptyText}>No matching rooms found</Text>
                        </View>
                      )}
                  </ScrollView>
                </View>
              )}

              {/* 2nd: Description */}
              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={descInput}
                onChangeText={setDescInput}
                placeholder="Enter description..."
                placeholderTextColor={Palette.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSubmitting}
              />

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => void handleCreateRequest()}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={Palette.onPrimary} />
                ) : (
                  <Text style={styles.submitBtnText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Request Details & Action Modal */}
      <Modal
        visible={Boolean(selectedRequestModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedRequestModal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setSelectedRequestModal(null)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          {selectedRequestModal ? (
            <View style={styles.createModalCard}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.modalIconBox}>
                    <Feather name="clipboard" size={18} color={Palette.primary} />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Request Details</Text>
                    <Text style={styles.modalSub}>{selectedRequestModal.tag}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedRequestModal(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={20} color={Palette.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                style={{ maxHeight: 420 }}
              >
                {/* Resident & Room Info */}
                <View style={styles.detailInfoBox}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Requester</Text>
                    <Text style={styles.detailValue}>
                      {selectedRequestModal.senderName || selectedRequestModal.title}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Room</Text>
                    <Text style={styles.detailValue}>
                      {selectedRequestModal.roomNumber || 'Not specified'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>{selectedRequestModal.time}</Text>
                  </View>
                  {selectedRequestModal.assignedStaff ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Assigned Staff</Text>
                      <Text style={[styles.detailValue, { color: Palette.primary }]}>
                        {selectedRequestModal.assignedStaff}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Issue Description */}
                <Text style={styles.fieldLabel}>Issue Description</Text>
                <View style={styles.messageBox}>
                  <Text style={styles.messageBoxText}>{selectedRequestModal.message}</Text>
                </View>

                {/* Status Toggle */}
                <Text style={styles.fieldLabel}>Update Status</Text>
                <View style={styles.priorityRow}>
                  {(['Open', 'In Progress', 'Resolved'] as const).map((st) => {
                    const currentSt = selectedRequestModal.status || 'Open';
                    const isStActive = currentSt === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.statusToggleBtn,
                          isStActive &&
                            (st === 'Resolved'
                              ? styles.statusResolvedActive
                              : st === 'In Progress'
                              ? styles.statusProgressActive
                              : styles.statusOpenActive),
                        ]}
                        onPress={() => void handleUpdateModalStatus(selectedRequestModal.id, st)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.statusToggleText,
                            isStActive &&
                              (st === 'Resolved'
                                ? styles.statusResolvedTextActive
                                : st === 'In Progress'
                                ? styles.statusProgressTextActive
                                : styles.statusOpenTextActive),
                          ]}
                        >
                          {st}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Assign to Staff */}
                {staff.length > 0 ? (
                  <>
                    <Text style={styles.fieldLabel}>Assign to Staff</Text>
                    <View style={styles.categoriesWrap}>
                      {staff.map((s) => {
                        const isAssigned = selectedRequestModal.assignedStaff === s.name;
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={[
                              styles.categoryChip,
                              isAssigned && styles.categoryChipActive,
                            ]}
                            onPress={() => void handleAssignStaff(selectedRequestModal.id, s.name)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.categoryChipText,
                                isAssigned && styles.categoryChipTextActive,
                              ]}
                            >
                              {s.name} ({s.role})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                {/* Contact Resident Buttons */}
                {selectedRequestModal.phone ? (
                  <View style={[styles.actionChipRow, { marginTop: 16, borderTopWidth: 0 }]}>
                    <TouchableOpacity
                      style={[styles.actionChip, { flex: 1, justifyContent: 'center' }]}
                      onPress={() =>
                        handleCall(
                          selectedRequestModal.phone,
                          selectedRequestModal.senderName
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Feather
                        name="phone"
                        size={15}
                        color={Palette.accentText}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.actionChipText}>Call Resident</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionChip, { flex: 1, justifyContent: 'center' }]}
                      onPress={() =>
                        handleWhatsApp(
                          selectedRequestModal.phone,
                          selectedRequestModal.senderName
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Feather
                        name="message-circle"
                        size={15}
                        color={Palette.status.active.text}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.actionChipText,
                          { color: Palette.status.active.text },
                        ]}
                      >
                        WhatsApp
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </ScrollView>

              <View style={[styles.modalActionRow, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={[styles.submitBtn, { flex: 1 }]}
                  onPress={() => setSelectedRequestModal(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
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
    paddingTop: 10,
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
    fontWeight: '700',
    color: Palette.text,
    letterSpacing: 0.3,
    ...Platform.select({
      ios: { fontFamily: 'Georgia' },
      android: { fontFamily: 'serif' },
      default: { fontFamily: 'serif' },
    }),
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
  },
  requestHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 5,
    marginTop: 14,
  },
  requestHeaderButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 14,
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
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
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
  noticeCardUnread: {
    backgroundColor: Palette.tint,
  },
  noticeCardHighlighted: {
    borderColor: Palette.accentText,
    borderWidth: 1.5,
  },
  noticeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noticeSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  typeIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
    flexShrink: 1,
  },
  assignedStaffSubtext: {
    fontSize: Typography.fontSize.caption,
    color: Palette.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  noticeRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  statusMiniBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  statusBadgeOpen: {
    backgroundColor: Palette.status.pending.bg,
  },
  statusBadgeProgress: {
    backgroundColor: Palette.iconBg,
  },
  statusBadgeResolved: {
    backgroundColor: Palette.status.paid.bg,
  },
  statusMiniBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextOpen: {
    color: Palette.status.pending.text,
  },
  statusTextProgress: {
    color: Palette.primary,
  },
  statusTextResolved: {
    color: Palette.status.paid.text,
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
    flexWrap: 'wrap',
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
  actionChipPrimary: {
    backgroundColor: Palette.tint,
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
    lineHeight: 19,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.backdrop,
  },
  confirmOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  confirmTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: Typography.fontSize.base,
    color: Palette.textSecondary,
    marginBottom: 18,
    lineHeight: 20,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Palette.text,
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: Palette.status.overdue.text,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  createModalCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  modalIconBox: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
  },
  modalSub: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
    marginTop: 12,
    marginBottom: 6,
  },
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  dropdownSelectorText: {
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    fontWeight: '600',
  },
  dropdownMenu: {
    marginTop: 2,
    marginBottom: 10,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    overflow: 'hidden',
    shadowColor: Palette.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 180,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  dropdownItemSelected: {
    backgroundColor: Palette.tint,
  },
  dropdownItemText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    fontWeight: '600',
  },
  dropdownItemTextSelected: {
    color: Palette.primary,
    fontWeight: '700',
  },
  dropdownItemSub: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  dropdownDueBadge: {
    backgroundColor: Palette.status.overdue.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  dropdownDueBadgeText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.status.overdue.text,
  },
  dropdownSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    backgroundColor: Palette.iconBg,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    padding: 0,
  },
  dropdownEmptyState: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownEmptyText: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    fontStyle: 'italic',
  },
  horizontalChipsRow: {
    gap: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  roomChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  roomChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  roomChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Palette.text,
  },
  roomChipTextActive: {
    color: Palette.onPrimary,
  },
  inputTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    backgroundColor: Palette.surface,
  },
  textArea: {
    minHeight: 70,
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  categoryChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  categoryChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Palette.text,
  },
  categoryChipTextActive: {
    color: Palette.onPrimary,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    backgroundColor: Palette.surface,
  },
  priorityChipNormalActive: {
    backgroundColor: Palette.tint,
    borderColor: Palette.primary,
  },
  priorityChipUrgentActive: {
    backgroundColor: Palette.status.overdue.bg,
    borderColor: Palette.status.overdue.text,
  },
  priorityChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.text,
  },
  priorityChipNormalTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  priorityChipUrgentTextActive: {
    color: Palette.status.overdue.text,
    fontWeight: '700',
  },
  errorText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.status.overdue.text,
    marginTop: 8,
    fontWeight: '600',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingVertical: 11,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Palette.text,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: Palette.primary,
    borderRadius: 5,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  detailInfoBox: {
    backgroundColor: Palette.tint,
    borderRadius: 5,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 10,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    fontWeight: '700',
  },
  messageBox: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 12,
    marginBottom: 8,
  },
  messageBoxText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    lineHeight: 20,
  },
  statusToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    backgroundColor: Palette.surface,
  },
  statusToggleText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Palette.text,
  },
  statusOpenActive: {
    backgroundColor: Palette.status.pending.bg,
    borderColor: Palette.status.pending.text,
  },
  statusOpenTextActive: {
    color: Palette.status.pending.text,
    fontWeight: '700',
  },
  statusProgressActive: {
    backgroundColor: Palette.iconBg,
    borderColor: Palette.primary,
  },
  statusProgressTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  statusResolvedActive: {
    backgroundColor: Palette.status.paid.bg,
    borderColor: Palette.status.paid.text,
  },
  statusResolvedTextActive: {
    color: Palette.status.paid.text,
    fontWeight: '700',
  },
});
