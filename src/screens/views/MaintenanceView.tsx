import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';
import { RoomItem } from './RoomsView';
import { INITIAL_MAINTENANCE_REASONS } from './SettingsView';

export interface MaintenanceViewProps {
  onBack?: () => void;
  rooms?: RoomItem[];
  maintenanceReasons?: string[];
}

export interface TicketItem {
  id: string;
  title: string;
  dateCost: string;
  status: 'Open' | 'In progress' | 'Done';
}

const INITIAL_TICKETS: TicketItem[] = [
  {
    id: '1',
    title: 'Room 104 · Plumbing',
    dateCost: 'Oct 11 · ₹2,500',
    status: 'Open',
  },
  {
    id: '2',
    title: 'Room 301 · Fan repair',
    dateCost: 'Oct 9 · ₹800',
    status: 'In progress',
  },
  {
    id: '3',
    title: 'Common · Lift service',
    dateCost: 'Oct 5 · ₹6,000',
    status: 'Done',
  },
  {
    id: '4',
    title: 'Room 202 · Paint',
    dateCost: 'Oct 2 · ₹2,700',
    status: 'Done',
  },
];

export default function MaintenanceView({
  onBack,
  rooms,
  maintenanceReasons: propReasons,
}: MaintenanceViewProps) {
  const [tickets, setTickets] = useState<TicketItem[]>(INITIAL_TICKETS);
  const [filter, setFilter] = useState<'All' | 'Open' | 'Done'>('All');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const availableReasons = propReasons && propReasons.length > 0 ? propReasons : INITIAL_MAINTENANCE_REASONS;

  const roomOptions = [
    ...(rooms && rooms.length > 0
      ? rooms.map((r) => r.roomNumber)
      : ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 201', 'Room 202', 'Room 204']),
    'Common Area',
  ];

  const [selectedRoom, setSelectedRoom] = useState(roomOptions[0]);
  const [selectedReason, setSelectedReason] = useState(availableReasons[0] || 'Plumbing');
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false);
  const [newCost, setNewCost] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const filteredTickets = tickets.filter((t) => {
    if (filter === 'All') return true;
    if (filter === 'Open') return t.status === 'Open' || t.status === 'In progress';
    if (filter === 'Done') return t.status === 'Done';
    return true;
  });

  const handleCreateTicket = () => {
    const formattedCost = newCost.trim()
      ? (newCost.startsWith('₹') ? newCost : `₹${newCost}`)
      : '₹1,500';

    const titlePrefix = selectedRoom.startsWith('Room') || selectedRoom.startsWith('Common')
      ? selectedRoom
      : `Room ${selectedRoom}`;

    const ticketTitle = additionalNote.trim()
      ? `${titlePrefix} · ${selectedReason} (${additionalNote.trim()})`
      : `${titlePrefix} · ${selectedReason}`;

    const newTicket: TicketItem = {
      id: Date.now().toString(),
      title: ticketTitle,
      dateCost: `Today · ${formattedCost}`,
      status: 'Open',
    };
    setTickets([newTicket, ...tickets]);
    setNewCost('');
    setAdditionalNote('');
    setIsRoomDropdownOpen(false);
    setIsReasonDropdownOpen(false);
    setIsAddModalVisible(false);
    Alert.alert('Request Created', `${newTicket.title} has been logged.`);
  };

  return (
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
      {/* Top Header Row with Circular Back, Title, and Add Button */}
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
          <Text style={styles.headerTitle}>Maintenance</Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* 2 Summary Cards */}
      <View style={styles.summaryRow}>
        {/* Card 1: Open */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Open</Text>
          <Text style={[styles.summaryValue, { color: Palette.primary }]}>2</Text>
          <Text style={styles.summarySub}>Need action</Text>
        </View>

        {/* Card 2: Cost this month */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Cost this month</Text>
          <Text style={styles.summaryValue}>₹12,000</Text>
          <Text style={styles.summarySub}>5 completed</Text>
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        {(['All', 'Open', 'Done'] as const).map((tab) => {
          const isActive = filter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setFilter(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tickets Card Container */}
      <View style={styles.ticketsCard}>
        {filteredTickets.map((ticket, index) => {
          const isLast = index === filteredTickets.length - 1;
          const isOpen = ticket.status === 'Open';
          const isInProgress = ticket.status === 'In progress';
          const isDone = ticket.status === 'Done';

          return (
            <View key={ticket.id}>
              <TouchableOpacity
                style={styles.ticketItem}
                activeOpacity={0.7}
                onPress={() =>
                  Alert.alert(ticket.title, `${ticket.dateCost}\nStatus: ${ticket.status}`)
                }
              >
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketTitle}>{ticket.title}</Text>
                  <Text style={styles.ticketDateCost}>{ticket.dateCost}</Text>
                </View>

                <View style={styles.ticketRight}>
                  <View
                    style={[
                      styles.badge,
                      (isOpen || isInProgress) && styles.openBadge,
                      isDone && styles.doneBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        (isOpen || isInProgress) && styles.openBadgeText,
                        isDone && styles.doneBadgeText,
                      ]}
                    >
                      {ticket.status}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Palette.secondary} style={styles.chevron} />
                </View>
              </TouchableOpacity>

              {!isLast && <View style={styles.divider} />}
            </View>
          );
        })}
      </View>

      {/* Add Maintenance Request Modal */}
      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setIsRoomDropdownOpen(false);
          setIsReasonDropdownOpen(false);
          setIsAddModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => {
            setIsRoomDropdownOpen(false);
            setIsReasonDropdownOpen(false);
            setIsAddModalVisible(false);
          }}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Maintenance Task</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* Room Dropdown */}
              <Text style={styles.inputLabel}>Room / Location</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                activeOpacity={0.7}
                onPress={() => {
                  setIsReasonDropdownOpen(false);
                  setIsRoomDropdownOpen((prev) => !prev);
                }}
              >
                <Text style={styles.dropdownSelectorText}>{selectedRoom}</Text>
                <Feather
                  name={isRoomDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Palette.textSecondary}
                />
              </TouchableOpacity>

              {isRoomDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <ScrollView
                    style={styles.dropdownScroll}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
                    {roomOptions.map((rm) => {
                      const isSelected = selectedRoom === rm;
                      return (
                        <TouchableOpacity
                          key={rm}
                          style={[
                            styles.dropdownItem,
                            isSelected && styles.dropdownItemSelected,
                          ]}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedRoom(rm);
                            setIsRoomDropdownOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isSelected && styles.dropdownItemTextSelected,
                            ]}
                          >
                            {rm}
                          </Text>
                          {isSelected && (
                            <Feather name="check" size={16} color={Palette.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Reason Dropdown */}
              <Text style={styles.inputLabel}>Reason / Issue</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                activeOpacity={0.7}
                onPress={() => {
                  setIsRoomDropdownOpen(false);
                  setIsReasonDropdownOpen((prev) => !prev);
                }}
              >
                <Text style={styles.dropdownSelectorText}>{selectedReason}</Text>
                <Feather
                  name={isReasonDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Palette.textSecondary}
                />
              </TouchableOpacity>

              {isReasonDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <ScrollView
                    style={styles.dropdownScroll}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
                    {availableReasons.map((rsn) => {
                      const isSelected = selectedReason === rsn;
                      return (
                        <TouchableOpacity
                          key={rsn}
                          style={[
                            styles.dropdownItem,
                            isSelected && styles.dropdownItemSelected,
                          ]}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedReason(rsn);
                            setIsReasonDropdownOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isSelected && styles.dropdownItemTextSelected,
                            ]}
                          >
                            {rsn}
                          </Text>
                          {isSelected && (
                            <Feather name="check" size={16} color={Palette.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Estimated Cost */}
              <Text style={styles.inputLabel}>Estimated Cost (₹)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 1200"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={newCost}
                onChangeText={setNewCost}
              />

              {/* Additional Note */}
              <Text style={styles.inputLabel}>Note (Optional)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Tap leaking under bathroom sink"
                placeholderTextColor={Palette.textMuted}
                value={additionalNote}
                onChangeText={setAdditionalNote}
              />

              <TouchableOpacity
                style={styles.createTaskBtn}
                onPress={handleCreateTicket}
                activeOpacity={0.85}
              >
                <Text style={styles.createTaskBtnText}>Create Task</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 100,
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
  addButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addButtonText: {
    color: Palette.surface,
    fontWeight: '700',
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  summaryCard: {
    width: '48.5%',
    backgroundColor: Palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  summaryLabel: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 4,
  },
  summarySub: {
    fontSize: 12.5,
    color: Palette.textSecondary,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  filterPill: {
    backgroundColor: Palette.surface,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterPillActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterPillText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  filterPillTextActive: {
    color: Palette.surface,
    fontWeight: '700',
  },
  ticketsCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  ticketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  ticketInfo: {
    flex: 1,
    marginRight: 10,
  },
  ticketTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 3,
  },
  ticketDateCost: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  ticketRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  openBadge: {
    backgroundColor: 'transparent',
  },
  doneBadge: {
    backgroundColor: 'transparent',
  },
  badgeText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  openBadgeText: {
    color: Palette.status.pending.text,
  },
  doneBadgeText: {
    color: Palette.status.completed.text,
  },
  chevron: {
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(46, 39, 34, 0.45)',
  },
  modalContent: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.text,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 6,
    marginTop: 12,
  },
  inputField: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Palette.text,
  },
  dropdownSelector: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dropdownSelectorText: {
    fontSize: 14.5,
    color: Palette.text,
    fontWeight: '500',
  },
  dropdownMenu: {
    marginTop: 2,
    marginBottom: 6,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 140,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  dropdownItemSelected: {
    backgroundColor: Palette.background,
  },
  dropdownItemText: {
    fontSize: 13.5,
    color: Palette.text,
    fontWeight: '600',
  },
  dropdownItemTextSelected: {
    color: Palette.primary,
    fontWeight: '700',
  },
  createTaskBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  createTaskBtnText: {
    color: Palette.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
