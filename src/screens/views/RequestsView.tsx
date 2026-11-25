import React, { useEffect, useMemo, useState } from 'react';
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
import { Palette, Typography } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import type {
  NotificationItem,
  ServiceRequestStatus,
} from '../../types/appData';

interface RequestsViewProps {
  initialRequestId?: string;
  onBack?: () => void;
}

type RequestFilter = 'All' | 'Open' | 'In Progress' | 'Resolved';

export default function RequestsView({ initialRequestId, onBack }: RequestsViewProps) {
  const {
    notifications,
    rooms,
    staff,
    addNotification,
    updateNotification,
    markNotificationRead,
    refreshWorkspace,
  } = useAppData();

  const [filter, setFilter] = useState<RequestFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | undefined>(initialRequestId);

  // New Request Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>(['All']);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [descInput, setDescInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Request Details Modal State
  const [selectedRequestModal, setSelectedRequestModal] = useState<NotificationItem | null>(null);

  useEffect(() => {
    if (initialRequestId) {
      void markNotificationRead(initialRequestId);
    }
  }, [initialRequestId, markNotificationRead]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  // All service/customer requests
  const allRequests = useMemo(() => {
    return notifications.filter((n) => n.type === 'customer');
  }, [notifications]);

  // Counts for tabs
  const openCount = useMemo(() => allRequests.filter((r) => (r.status || 'Open') === 'Open').length, [allRequests]);
  const inProgressCount = useMemo(() => allRequests.filter((r) => r.status === 'In Progress').length, [allRequests]);
  const resolvedCount = useMemo(() => allRequests.filter((r) => r.status === 'Resolved').length, [allRequests]);

  // Filtered and searched requests
  const filteredRequests = useMemo(() => {
    return allRequests.filter((item) => {
      const itemStatus: ServiceRequestStatus = item.status || 'Open';

      // Status filter
      if (filter !== 'All' && itemStatus !== filter) {
        return false;
      }

      // Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchSender = (item.senderName || '').toLowerCase().includes(q);
        const matchRoom = (item.roomNumber || '').toLowerCase().includes(q);
        const matchTag = (item.tag || '').toLowerCase().includes(q);
        const matchMsg = (item.message || '').toLowerCase().includes(q);
        const matchStaff = (item.assignedStaff || '').toLowerCase().includes(q);
        return matchTitle || matchSender || matchRoom || matchTag || matchMsg || matchStaff;
      }

      return true;
    });
  }, [allRequests, filter, searchQuery]);

  const handleCall = (phone?: string, _name?: string) => {
    if (!phone) return;
    const digits = phone.replace(/[^\d+]/g, '');
    void Linking.openURL(`tel:${digits}`).catch(() => {});
  };

  const handleWhatsApp = (phone?: string, _name?: string) => {
    if (!phone) return;
    const digits = phone.replace(/[^\d]/g, '');
    void Linking.openURL(`https://wa.me/${digits}`).catch(() => {});
  };

  const handleOpenCreateModal = () => {
    setSelectedRooms(['All']);
    setIsRoomDropdownOpen(false);
    setRoomSearchQuery('');
    setDescInput('');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const toggleRoomSelection = (roomNum: string) => {
    setSelectedRooms((prev) => {
      const cleaned = prev.filter((r) => r !== 'All' && r !== 'Due Room');
      if (cleaned.includes(roomNum)) {
        return cleaned.filter((r) => r !== roomNum);
      } else {
        return [...cleaned, roomNum];
      }
    });
  };

  const isRoomSelected = (roomNum: string) => {
    return (
      selectedRooms.includes(roomNum) ||
      selectedRooms.includes(roomNum.replace(/^Room\s+/i, '')) ||
      selectedRooms.includes(`Room ${roomNum.replace(/^Room\s+/i, '')}`)
    );
  };

  const handleCreateRequest = async () => {
    const message = descInput.trim();

    if (!message) {
      setFormError('Please enter a description for the request.');
      return;
    }

    if (selectedRooms.length === 0) {
      setFormError('Please select at least one room.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      if (selectedRooms.includes('All')) {
        await addNotification({
          type: 'customer',
          senderName: 'Notice',
          roomNumber: 'All Rooms',
          tag: 'General',
          message,
          priority: 'Normal',
          status: 'Open',
        });
      } else if (selectedRooms.includes('Due Room')) {
        await addNotification({
          type: 'customer',
          senderName: 'Rent Reminder',
          roomNumber: 'Due Rooms',
          tag: 'Rent Due',
          message,
          priority: 'Urgent',
          status: 'Open',
        });
      } else {
        for (let i = 0; i < selectedRooms.length; i++) {
          const roomOption = selectedRooms[i];
          const matchedRoom = rooms.find(
            (r) =>
              r.roomNumber === roomOption ||
              r.roomNumber === `Room ${roomOption}` ||
              `Room ${r.roomNumber}` === roomOption ||
              r.roomNumber.replace(/[^0-9]/g, '') === roomOption.replace(/[^0-9]/g, '')
          );
          const primary = matchedRoom?.members?.[0];
          const sender = primary?.name || 'Resident';
          const phone = primary?.phone;
          const roomNum = roomOption.startsWith('Room')
            ? roomOption
            : `Room ${roomOption}`;
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

          if (i < selectedRooms.length - 1) {
            await new Promise((r) => setTimeout(r, 15));
          }
        }
      }

      setIsCreateModalOpen(false);
      setDescInput('');
      setRoomSearchQuery('');
      setSelectedRooms(['All']);
    } catch {
      setFormError('Failed to save request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (
    requestId: string,
    newStatus: ServiceRequestStatus
  ) => {
    await updateNotification(requestId, { status: newStatus });
    if (selectedRequestModal && selectedRequestModal.id === requestId) {
      setSelectedRequestModal({
        ...selectedRequestModal,
        status: newStatus,
      });
    }
  };

  const handleAssignStaff = async (requestId: string, staffName: string) => {
    await updateNotification(requestId, { assignedStaff: staffName });
    if (selectedRequestModal && selectedRequestModal.id === requestId) {
      setSelectedRequestModal({
        ...selectedRequestModal,
        assignedStaff: staffName,
      });
    }
  };

  const dueRoomsList = rooms.filter((r) => r.status === 'Rent due');

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
            <Text style={styles.headerTitle}>Requests</Text>
          </View>

          {/* Request Action Row - between Requests header and Search Bar */}
          <View style={styles.requestActionRow}>
            <TouchableOpacity
              style={styles.requestHeaderButton}
              onPress={handleOpenCreateModal}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Create Request"
            >
              <Text style={styles.requestHeaderButtonText}>Request</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarBox}>
            <Feather name="search" size={Typography.iconSize.sm} color={Palette.primary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by room, resident, or tag..."
              placeholderTextColor={Palette.textMuted}
              accessibilityLabel="Search requests"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Feather name="x" size={Typography.iconSize.sm} color={Palette.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Status Pills */}
          <View style={styles.filterRow}>
            {(['All', 'Open', 'In Progress', 'Resolved'] as const).map((tab) => {
              const isActive = filter === tab;
              const count =
                tab === 'All'
                  ? allRequests.length
                  : tab === 'Open'
                  ? openCount
                  : tab === 'In Progress'
                  ? inProgressCount
                  : resolvedCount;

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

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather
                name="clipboard"
                size={Typography.iconSize.lg}
                color={Palette.primary}
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.emptyTitle}>No service requests found</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? 'No requests match your search criteria.'
                  : filter === 'Open'
                  ? 'No pending open requests.'
                  : filter === 'In Progress'
                  ? 'No requests currently in progress.'
                  : filter === 'Resolved'
                  ? 'No resolved requests yet.'
                  : 'Tap "Request" above to send a service request to rooms.'}
              </Text>

              <TouchableOpacity
                style={[styles.requestHeaderButton, { marginTop: 16 }]}
                onPress={handleOpenCreateModal}
                activeOpacity={0.8}
              >
                <Text style={styles.requestHeaderButtonText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredRequests.map((item) => {
              const isHighlighted = item.id === selectedRequestId;
              const reqStatus: ServiceRequestStatus = item.status || 'Open';
              const isUrgent = item.priority === 'Urgent';

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
                    setSelectedRequestId(item.id);
                    void markNotificationRead(item.id);
                  }}
                >
                  {/* Top Row: Icon/Sender, Tag & Status, Time */}
                  <View style={styles.noticeTopRow}>
                    <View style={styles.noticeSenderRow}>
                      <View style={styles.customerIconBox}>
                        <Feather
                          name="tool"
                          size={Typography.iconSize.sm}
                          color={Palette.primary}
                        />
                      </View>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.noticeTitle} numberOfLines={1}>
                          {item.senderName ? `${item.senderName} · ${item.roomNumber || ''}` : item.title}
                        </Text>
                        {item.assignedStaff ? (
                          <View style={styles.assignedBadgeRow}>
                            <Feather name="user-check" size={11} color={Palette.primary} />
                            <Text style={styles.assignedStaffSubtext} numberOfLines={1}>
                              {item.assignedStaff}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.noticeRightRow}>
                      {isUrgent && (
                        <View style={styles.priorityBadgeUrgent}>
                          <Text style={styles.priorityBadgeText}>Urgent</Text>
                        </View>
                      )}
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
                      <Text style={styles.singleWordTag}>{item.tag}</Text>
                      <Text style={styles.noticeTime}>{item.time}</Text>
                    </View>
                  </View>

                  {/* Message Content */}
                  <Text style={styles.noticeMessage}>{item.message}</Text>

                  {/* Action Chips */}
                  <View style={styles.actionChipRow}>
                    {/* Manage Details Button */}
                    <TouchableOpacity
                      style={[styles.actionChip, styles.actionChipPrimary]}
                      onPress={() => setSelectedRequestModal(item)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="View or manage request"
                    >
                      <Feather
                        name="sliders"
                        size={Typography.iconSize.sm}
                        color={Palette.primary}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[styles.actionChipText, { color: Palette.primary, fontWeight: '700' }]}>
                        Manage
                      </Text>
                    </TouchableOpacity>

                    {/* Quick status progress button */}
                    {reqStatus === 'Open' ? (
                      <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() => void handleUpdateStatus(item.id, 'In Progress')}
                        activeOpacity={0.7}
                      >
                        <Feather name="play" size={Typography.iconSize.sm} color="#1E40AF" style={{ marginRight: 4 }} />
                        <Text style={[styles.actionChipText, { color: '#1E40AF' }]}>Start</Text>
                      </TouchableOpacity>
                    ) : reqStatus === 'In Progress' ? (
                      <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() => void handleUpdateStatus(item.id, 'Resolved')}
                        activeOpacity={0.7}
                      >
                        <Feather name="check" size={Typography.iconSize.sm} color="#315B32" style={{ marginRight: 4 }} />
                        <Text style={[styles.actionChipText, { color: '#315B32' }]}>Resolve</Text>
                      </TouchableOpacity>
                    ) : null}

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
                <Text style={styles.modalTitle}>Request</Text>
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
              {/* 1st: Select Room (Multiple Select Dropdown) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.fieldLabel}>Select Room(s) *</Text>
                {selectedRooms.length > 0 && !selectedRooms.includes('All') && !selectedRooms.includes('Due Room') && (
                  <Text style={styles.selectionCountLabel}>
                    {selectedRooms.length} room{selectedRooms.length > 1 ? 's' : ''} selected
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setIsRoomDropdownOpen((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Feather
                    name={
                      selectedRooms.includes('All')
                        ? 'users'
                        : selectedRooms.includes('Due Room')
                        ? 'alert-circle'
                        : selectedRooms.length > 1
                        ? 'check-square'
                        : selectedRooms.length === 1
                        ? 'home'
                        : 'square'
                    }
                    size={16}
                    color={
                      selectedRooms.includes('Due Room')
                        ? Palette.status.overdue.text
                        : selectedRooms.length > 0
                        ? Palette.primary
                        : Palette.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.dropdownSelectorText,
                      selectedRooms.length === 0 && { color: Palette.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedRooms.length === 0
                      ? 'Select room(s)...'
                      : selectedRooms.includes('All')
                      ? 'All Rooms'
                      : selectedRooms.includes('Due Room')
                      ? 'Due Rooms'
                      : selectedRooms.length === 1
                      ? selectedRooms[0]
                      : `${selectedRooms.length} Rooms Selected`}
                  </Text>
                  {selectedRooms.includes('Due Room') && (
                    <View style={styles.dropdownDueBadge}>
                      <Text style={styles.dropdownDueBadgeText}>{dueRoomsList.length} Due</Text>
                    </View>
                  )}
                  {selectedRooms.includes('All') && (
                    <View style={styles.dropdownAllBadge}>
                      <Text style={styles.dropdownAllBadgeText}>{rooms.length} Rooms</Text>
                    </View>
                  )}
                </View>
                <Feather
                  name={isRoomDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={Typography.iconSize.base}
                  color={Palette.accentText}
                />
              </TouchableOpacity>

              {/* Selected Room Tag Chips */}
              {selectedRooms.length > 0 &&
                !selectedRooms.includes('All') &&
                !selectedRooms.includes('Due Room') && (
                  <View style={styles.selectedChipsContainer}>
                    {selectedRooms.map((rNum) => (
                      <View key={rNum} style={styles.selectedRoomChip}>
                        <Text style={styles.selectedRoomChipText}>{rNum}</Text>
                        <TouchableOpacity
                          onPress={() =>
                            setSelectedRooms((prev) => prev.filter((r) => r !== rNum))
                          }
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Feather name="x" size={12} color={Palette.primary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

              {isRoomDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  {/* Quick Preset Buttons */}
                  <View style={styles.dropdownQuickActions}>
                    <TouchableOpacity
                      style={[
                        styles.quickActionBtn,
                        selectedRooms.includes('All') && styles.quickActionBtnActive,
                      ]}
                      onPress={() => setSelectedRooms(['All'])}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.quickActionBtnText,
                          selectedRooms.includes('All') && styles.quickActionBtnTextActive,
                        ]}
                      >
                        All Rooms
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.quickActionBtn,
                        selectedRooms.includes('Due Room') && styles.quickActionBtnActive,
                      ]}
                      onPress={() => setSelectedRooms(['Due Room'])}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.quickActionBtnText,
                          selectedRooms.includes('Due Room') && styles.quickActionBtnTextActive,
                        ]}
                      >
                        Due Rooms ({dueRoomsList.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickActionBtn}
                      onPress={() => setSelectedRooms([])}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.quickActionBtnText, { color: Palette.textSecondary }]}>
                        Clear
                      </Text>
                    </TouchableOpacity>
                  </View>

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
                          selectedRooms.includes('All') && styles.dropdownItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedRooms(['All']);
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Feather
                            name={selectedRooms.includes('All') ? 'check-square' : 'square'}
                            size={16}
                            color={selectedRooms.includes('All') ? Palette.primary : Palette.textMuted}
                          />
                          <Feather name="users" size={14} color={Palette.primary} />
                          <Text
                            style={[
                              styles.dropdownItemText,
                              selectedRooms.includes('All') && styles.dropdownItemTextSelected,
                            ]}
                          >
                            All (All Rooms)
                          </Text>
                        </View>
                        {selectedRooms.includes('All') && (
                          <Feather name="check" size={16} color={Palette.primary} />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Due Room */}
                    {(!roomSearchQuery.trim() ||
                      'due'.includes(roomSearchQuery.trim().toLowerCase()) ||
                      'due room'.includes(roomSearchQuery.trim().toLowerCase()) ||
                      'due rooms'.includes(roomSearchQuery.trim().toLowerCase())) && (
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          selectedRooms.includes('Due Room') && styles.dropdownItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedRooms(['Due Room']);
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            flex: 1,
                          }}
                        >
                          <Feather
                            name={selectedRooms.includes('Due Room') ? 'check-square' : 'square'}
                            size={16}
                            color={
                              selectedRooms.includes('Due Room')
                                ? Palette.status.overdue.text
                                : Palette.textMuted
                            }
                          />
                          <Feather
                            name="alert-circle"
                            size={14}
                            color={Palette.status.overdue.text}
                          />
                          <Text
                            style={[
                              styles.dropdownItemText,
                              selectedRooms.includes('Due Room') &&
                                styles.dropdownItemTextSelected,
                            ]}
                          >
                            Due Room ({dueRoomsList.length} Due)
                          </Text>
                          <View style={styles.dropdownDueBadge}>
                            <Text style={styles.dropdownDueBadgeText}>Due</Text>
                          </View>
                        </View>
                        {selectedRooms.includes('Due Room') && (
                          <Feather name="check" size={16} color={Palette.primary} />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Room List with instant search & multiple selection */}
                    {rooms
                      .filter((r) => {
                        const q = roomSearchQuery.trim().toLowerCase();
                        if (!q) return true;
                        const matchNum = r.roomNumber.toLowerCase().includes(q);
                        const matchMember =
                          r.members &&
                          r.members.some((m) => m.name.toLowerCase().includes(q));
                        const matchStatus = r.status.toLowerCase().includes(q);
                        return matchNum || matchMember || matchStatus;
                      })
                      .map((room) => {
                        const roomLabel = room.roomNumber.startsWith('Room')
                          ? room.roomNumber
                          : `Room ${room.roomNumber}`;
                        const isSelected = isRoomSelected(roomLabel);
                        const isDue = room.status === 'Rent due';
                        const primaryMember = room.members?.[0]?.name;

                        return (
                          <TouchableOpacity
                            key={room.id}
                            style={[
                              styles.dropdownItem,
                              isSelected && styles.dropdownItemSelected,
                            ]}
                            onPress={() => toggleRoomSelection(roomLabel)}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                flex: 1,
                              }}
                            >
                              <Feather
                                name={isSelected ? 'check-square' : 'square'}
                                size={16}
                                color={isSelected ? Palette.primary : Palette.textMuted}
                              />
                              <Feather
                                name="home"
                                size={14}
                                color={
                                  isDue
                                    ? Palette.status.overdue.text
                                    : Palette.textSecondary
                                }
                              />
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    isSelected && styles.dropdownItemTextSelected,
                                  ]}
                                >
                                  {roomLabel}
                                  {primaryMember ? ` · ${primaryMember}` : ''}
                                </Text>
                              </View>
                              {isDue && (
                                <View style={styles.dropdownDueBadge}>
                                  <Text style={styles.dropdownDueBadgeText}>Due</Text>
                                </View>
                              )}
                            </View>
                            {isSelected && (
                              <Feather name="check" size={16} color={Palette.primary} />
                            )}
                          </TouchableOpacity>
                        );
                      })}

                    {rooms.filter((r) => {
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

                  {/* Done Button to close dropdown */}
                  <TouchableOpacity
                    style={styles.dropdownDoneBtn}
                    onPress={() => {
                      setIsRoomDropdownOpen(false);
                      setRoomSearchQuery('');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.dropdownDoneBtnText}>
                      Done (
                      {selectedRooms.includes('All')
                        ? 'All Rooms'
                        : selectedRooms.includes('Due Room')
                        ? `Due Rooms (${dueRoomsList.length})`
                        : `${selectedRooms.length} Selected`}
                      )
                    </Text>
                  </TouchableOpacity>
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

                  {selectedRequestModal.roomNumber ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Room</Text>
                      <Text style={styles.detailValue}>{selectedRequestModal.roomNumber}</Text>
                    </View>
                  ) : null}

                  {selectedRequestModal.phone ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone</Text>
                      <Text style={styles.detailValue}>{selectedRequestModal.phone}</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Priority</Text>
                    <View
                      style={[
                        styles.priorityPill,
                        selectedRequestModal.priority === 'Urgent'
                          ? styles.priorityUrgent
                          : styles.priorityNormal,
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityPillText,
                          selectedRequestModal.priority === 'Urgent'
                            ? styles.priorityUrgentText
                            : styles.priorityNormalText,
                        ]}
                      >
                        {selectedRequestModal.priority || 'Normal'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>{selectedRequestModal.time}</Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.fieldLabel}>Description</Text>
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>{selectedRequestModal.message}</Text>
                </View>

                {/* Status Switcher */}
                <Text style={styles.fieldLabel}>Status</Text>
                <View style={styles.statusToggleRow}>
                  {(['Open', 'In Progress', 'Resolved'] as const).map((st) => {
                    const isStActive = (selectedRequestModal.status || 'Open') === st;
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
                        onPress={() => void handleUpdateStatus(selectedRequestModal.id, st)}
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

                {/* Direct Contact Actions */}
                {selectedRequestModal.phone ? (
                  <View style={styles.contactActionsRow}>
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

              <View style={styles.modalActionRow}>
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
    alignItems: 'center',
    marginBottom: 8,
  },
  requestActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
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
  requestHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 5,
  },
  requestHeaderButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.onPrimary,
  },

  // Search Bar
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    marginLeft: 8,
    padding: 0,
  },

  // Filter Row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
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

  // Cards
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
  },
  noticeCardHighlighted: {
    borderColor: Palette.primary,
    backgroundColor: Palette.tint,
  },
  noticeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  noticeSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  customerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  assignedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  assignedStaffSubtext: {
    fontSize: Typography.fontSize.xs,
    color: Palette.primary,
    fontWeight: '600',
  },
  noticeRightRow: {
    alignItems: 'flex-end',
    gap: 4,
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
  priorityBadgeUrgent: {
    backgroundColor: '#F9DEDC',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: '#A52A25',
  },
  priorityBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#A52A25',
    textTransform: 'uppercase',
  },
  statusMiniBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusBadgeOpen: {
    backgroundColor: '#FCE9C9',
  },
  statusBadgeProgress: {
    backgroundColor: '#EBF3FE',
  },
  statusBadgeResolved: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  statusMiniBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusTextOpen: {
    color: '#80500D',
  },
  statusTextProgress: {
    color: '#1E40AF',
  },
  statusTextResolved: {
    color: '#315B32',
  },
  noticeMessage: {
    fontSize: Typography.fontSize.caption,
    color: Palette.text,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
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
    color: Palette.text,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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

  // Modal Shared
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.backdrop,
  },
  createModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Palette.surface,
    borderRadius: 5,
    padding: 18,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  modalIconBox: {
    width: 32,
    height: 32,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Palette.text,
  },
  modalSub: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.textSecondary,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Typography.fontSize.base,
    color: Palette.text,
  },
  textArea: {
    minHeight: 90,
  },
  errorText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.status.overdue.text,
    marginTop: 6,
    fontWeight: '600',
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: Palette.primary,
    paddingVertical: 11,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.onPrimary,
  },

  // Room Dropdown
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownSelectorText: {
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    fontWeight: '600',
  },
  dropdownDueBadge: {
    backgroundColor: '#F9DEDC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  dropdownDueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.status.overdue.text,
  },
  selectionCountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  dropdownAllBadge: {
    backgroundColor: Palette.iconBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  dropdownAllBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.primary,
  },
  selectedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  selectedRoomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  selectedRoomChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.primary,
  },
  dropdownQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    backgroundColor: Palette.tint,
  },
  quickActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  quickActionBtnActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  quickActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  quickActionBtnTextActive: {
    color: Palette.onPrimary,
  },
  dropdownDoneBtn: {
    backgroundColor: Palette.primary,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    marginVertical: 8,
    borderRadius: 5,
  },
  dropdownDoneBtnText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
  },
  dropdownMenu: {
    marginTop: 6,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  dropdownSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    backgroundColor: Palette.tint,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: Typography.fontSize.caption,
    color: Palette.text,
    padding: 0,
  },
  dropdownScroll: {
    maxHeight: 180,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  dropdownItemSelected: {
    backgroundColor: Palette.tint,
  },
  dropdownItemText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.text,
  },
  dropdownItemTextSelected: {
    color: Palette.primary,
    fontWeight: '700',
  },
  dropdownEmptyState: {
    padding: 14,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textMuted,
  },

  // Details Modal
  detailInfoBox: {
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.text,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityUrgent: {
    backgroundColor: '#F9DEDC',
  },
  priorityNormal: {
    backgroundColor: Palette.iconBg,
  },
  priorityPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  priorityUrgentText: {
    color: '#A52A25',
  },
  priorityNormalText: {
    color: Palette.primary,
  },
  messageBox: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.text,
    lineHeight: 18,
  },
  statusToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statusToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
  },
  statusOpenActive: {
    backgroundColor: '#FCE9C9',
    borderColor: '#80500D',
  },
  statusProgressActive: {
    backgroundColor: '#EBF3FE',
    borderColor: '#1E40AF',
  },
  statusResolvedActive: {
    backgroundColor: '#E5F0DF',
    borderColor: '#315B32',
  },
  statusToggleText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  statusOpenTextActive: {
    color: '#80500D',
    fontWeight: '700',
  },
  statusProgressTextActive: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  statusResolvedTextActive: {
    color: '#315B32',
    fontWeight: '700',
  },
  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
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
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  contactActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
});
