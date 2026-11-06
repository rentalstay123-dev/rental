import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';

interface RentViewProps {
  onBack?: () => void;
}

interface RoomMember {
  name: string;
  relation: string;
  phone: string;
}

interface PaymentRecord {
  id: string;
  title: string;
  amount: string;
  date: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  method?: string;
}

interface RoomRentDetail {
  id: string;
  roomNumber: string;
  tenantName: string;
  wing: string;
  monthlyRent: string;
  depositAmount: string;
  depositPaid: string;
  depositPending: string;
  rentPaidTotal: string;
  rentPendingTotal: string;
  currentStatus: 'Paid' | 'Due' | 'Overdue';
  statusBadgeText: string;
  members: RoomMember[];
  history: PaymentRecord[];
}

const ROOM_RENT_DATA: RoomRentDetail[] = [
  {
    id: '1',
    roomNumber: 'Room 101',
    tenantName: 'Anil Rao',
    wing: 'Floor 1 · East Wing',
    monthlyRent: '₹9,000',
    depositAmount: '₹20,000',
    depositPaid: '₹20,000',
    depositPending: '₹0',
    rentPaidTotal: '₹72,000',
    rentPendingTotal: '₹0',
    currentStatus: 'Paid',
    statusBadgeText: 'Paid',
    members: [
      { name: 'Anil Rao', relation: 'Primary Resident', phone: '+91 98450 11223' },
      { name: 'Kavita Rao', relation: 'Spouse', phone: '+91 98450 33445' },
    ],
    history: [
      { id: 'h1', title: 'October 2026 Rent', amount: '₹9,000', date: 'Paid Oct 2, 2026', status: 'Paid', method: 'UPI' },
      { id: 'h2', title: 'September 2026 Rent', amount: '₹9,000', date: 'Paid Sep 3, 2026', status: 'Paid', method: 'UPI' },
      { id: 'h3', title: 'Deposit', amount: '₹20,000', date: 'Paid Feb 1, 2026', status: 'Paid', method: 'Bank Transfer' },
    ],
  },
  {
    id: '2',
    roomNumber: 'Room 102',
    tenantName: 'Priya Sharma',
    wing: 'Floor 1 · West Wing',
    monthlyRent: '₹15,000',
    depositAmount: '₹30,000',
    depositPaid: '₹30,000',
    depositPending: '₹0',
    rentPaidTotal: '₹75,000',
    rentPendingTotal: '₹15,000',
    currentStatus: 'Overdue',
    statusBadgeText: 'Overdue',
    members: [
      { name: 'Priya Sharma', relation: 'Primary Resident', phone: '+91 98765 43210' },
      { name: 'Deepa Sharma', relation: 'Sister / Co-occupant', phone: '+91 98765 67890' },
    ],
    history: [
      { id: 'h4', title: 'October 2026 Rent', amount: '₹15,000', date: 'Due Oct 15, 2026', status: 'Overdue' },
      { id: 'h5', title: 'September 2026 Rent', amount: '₹15,000', date: 'Paid Sep 5, 2026', status: 'Paid', method: 'UPI' },
      { id: 'h6', title: 'August 2026 Rent', amount: '₹15,000', date: 'Paid Aug 3, 2026', status: 'Paid', method: 'UPI' },
      { id: 'h7', title: ' Deposit', amount: '₹30,000', date: 'Paid Jan 10, 2026', status: 'Paid', method: 'Bank Transfer' },
    ],
  },
  {
    id: '3',
    roomNumber: 'Room 103',
    tenantName: 'Kiran Das',
    wing: 'Floor 1 · Garden View',
    monthlyRent: '₹9,000',
    depositAmount: '₹20,000',
    depositPaid: '₹20,000',
    depositPending: '₹0',
    rentPaidTotal: '₹63,000',
    rentPendingTotal: '₹0',
    currentStatus: 'Paid',
    statusBadgeText: 'Paid',
    members: [
      { name: 'Kiran Das', relation: 'Primary Resident', phone: '+91 99000 88776' },
    ],
    history: [
      { id: 'h8', title: 'October 2026 Rent', amount: '₹9,000', date: 'Paid Oct 4, 2026', status: 'Paid', method: 'Net Banking' },
      { id: 'h9', title: 'Deposit', amount: '₹20,000', date: 'Paid Mar 1, 2026', status: 'Paid', method: 'UPI' },
    ],
  },
  {
    id: '4',
    roomNumber: 'Room 104',
    tenantName: 'Sana Khan',
    wing: 'Floor 1 · North Wing',
    monthlyRent: '₹9,500',
    depositAmount: '₹20,000',
    depositPaid: '₹20,000',
    depositPending: '₹0',
    rentPaidTotal: '₹66,500',
    rentPendingTotal: '₹0',
    currentStatus: 'Paid',
    statusBadgeText: 'Paid',
    members: [
      { name: 'Sana Khan', relation: 'Primary Resident', phone: '+91 97400 55667' },
      { name: 'Zara Khan', relation: 'Roommate', phone: '+91 97400 88990' },
    ],
    history: [
      { id: 'h10', title: 'October 2026 Rent', amount: '₹9,500', date: 'Paid Oct 1, 2026', status: 'Paid', method: 'UPI' },
      { id: 'h11', title: 'Deposit', amount: '₹20,000', date: 'Paid Feb 15, 2026', status: 'Paid', method: 'IMPS' },
    ],
  },
  {
    id: '5',
    roomNumber: 'Room 201',
    tenantName: 'Arjun Kumar',
    wing: 'Floor 2 · Corner Suite',
    monthlyRent: '₹10,000',
    depositAmount: '₹25,000',
    depositPaid: '₹20,000',
    depositPending: '₹5,000',
    rentPaidTotal: '₹50,000',
    rentPendingTotal: '₹10,000',
    currentStatus: 'Due',
    statusBadgeText: 'Due Nov 1',
    members: [
      { name: 'Arjun Kumar', relation: 'Primary Resident', phone: '+91 98860 12345' },
      { name: 'Rohan Verma', relation: 'Roommate', phone: '+91 98860 67890' },
    ],
    history: [
      { id: 'h12', title: 'November 2026 Rent', amount: '₹10,000', date: 'Due Nov 1, 2026', status: 'Pending' },
      { id: 'h13', title: 'Deposit Installment 2', amount: '₹5,000', date: 'Pending', status: 'Pending' },
      { id: 'h14', title: 'October 2026 Rent', amount: '₹10,000', date: 'Paid Oct 1, 2026', status: 'Paid', method: 'UPI' },
      { id: 'h15', title: 'Deposit Installment 1', amount: '₹20,000', date: 'Paid May 10, 2026', status: 'Paid', method: 'Cash' },
    ],
  },
];

export default function RentView({ onBack }: RentViewProps) {
  const [filter, setFilter] = useState<'All' | 'Paid' | 'Due'>('All');
  const [selectedRoom, setSelectedRoom] = useState<RoomRentDetail | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleDownloadPaymentHistory = (room: RoomRentDetail) => {
    const dateStr = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    let statement = `==========================================================\n`;
    statement += `              LUVORA - PAYMENT HISTORY STATEMENT          \n`;
    statement += `==========================================================\n`;
    statement += `Generated On   : ${dateStr}\n`;
    statement += `Room Number    : ${room.roomNumber}\n`;
    statement += `Tenant / Lead  : ${room.tenantName}\n`;
    statement += `Wing / Floor   : ${room.wing}\n`;
    statement += `Monthly Rent   : ${room.monthlyRent}\n`;
    statement += `Total Rent Paid: ${room.rentPaidTotal}\n`;
    statement += `Rent Pending   : ${room.rentPendingTotal}\n`;
    statement += `Deposit Amount : ${room.depositAmount} (Paid: ${room.depositPaid}, Pending: ${room.depositPending})\n`;
    statement += `Current Status : ${room.statusBadgeText}\n`;
    statement += `----------------------------------------------------------\n`;
    statement += `OCCUPANTS / MEMBERS:\n`;
    room.members.forEach((m, idx) => {
      statement += ` ${idx + 1}. ${m.name} (${m.relation}) - Phone: ${m.phone}\n`;
    });
    statement += `----------------------------------------------------------\n`;
    statement += `TRANSACTION HISTORY:\n`;
    statement += `Title                   | Amount     | Date / Method        | Status\n`;
    statement += `----------------------------------------------------------\n`;
    room.history.forEach((rec) => {
      const titlePadded = rec.title.padEnd(23, ' ');
      const amountPadded = rec.amount.padEnd(10, ' ');
      const methodStr = `${rec.date}${rec.method ? ' • ' + rec.method : ''}`.padEnd(20, ' ');
      statement += `${titlePadded} | ${amountPadded} | ${methodStr} | ${rec.status}\n`;
    });
    statement += `==========================================================\n`;
    statement += `Summary: Total Records: ${room.history.length}\n`;
    statement += `Luvora Property Management • All Rights Reserved\n`;

    const fileName = `${room.roomNumber.replace(/\s+/g, '_')}_Payment_History.txt`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const blob = new Blob([statement], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert(
          'Download Complete',
          `Overall payment history for ${room.roomNumber} has been downloaded as "${fileName}".`
        );
        return;
      } catch (err) {
        console.error('Download error:', err);
      }
    }

    Alert.alert(
      'Download Complete',
      `Overall payment history for ${room.roomNumber} (${room.tenantName}) has been downloaded successfully.\n\nFile: ${fileName}`
    );
  };

  const filteredList = ROOM_RENT_DATA.filter((item) => {
    if (filter === 'All') return true;
    if (filter === 'Paid') return item.currentStatus === 'Paid';
    if (filter === 'Due') return item.currentStatus === 'Due' || item.currentStatus === 'Overdue';
    return true;
  });

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
      {/* Top Header with Back button and Title */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButtonCircle}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rent</Text>
      </View>

      {/* Hero Collection Card */}
      <View style={styles.collectionCard}>
        <Text style={styles.collectionLabel}>October · Collected</Text>
        <Text style={styles.collectionAmount}>₹85,000</Text>

        {/* Progress Bar (77% Collected) */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: '77%' }]} />
        </View>

        <Text style={styles.pendingSubtext}>₹25,000 pending of ₹1,10,000</Text>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        {(['All', 'Paid', 'Due'] as const).map((tab) => {
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

      {/* Rooms List Card */}
      <View style={styles.ledgerCard}>
        {filteredList.map((room, index) => {
          const isLast = index === filteredList.length - 1;
          return (
            <View key={room.id}>
              <TouchableOpacity
                style={styles.ledgerRow}
                activeOpacity={0.7}
                onPress={() => setSelectedRoom(room)}
              >
                <View style={styles.tenantInfoCol}>
                  <Text style={styles.roomHeadingText}>{room.roomNumber}</Text>
                  <Text style={styles.tenantRoomText}>{room.tenantName} · {room.wing}</Text>
                </View>

                <View style={styles.amountBadgeCol}>
                  <Text style={styles.amountText}>{room.monthlyRent}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      room.currentStatus === 'Paid'
                        ? styles.paidBadge
                        : room.currentStatus === 'Overdue'
                        ? styles.overdueBadge
                        : styles.dueBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        room.currentStatus === 'Paid'
                          ? styles.paidText
                          : room.currentStatus === 'Overdue'
                          ? styles.overdueText
                          : styles.dueText,
                      ]}
                    >
                      {room.statusBadgeText}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {!isLast && <View style={styles.divider} />}
            </View>
          );
        })}
      </View>

      {/* Full Room & Member Rent Details Modal */}
      {selectedRoom && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedRoom(null)}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => setSelectedRoom(null)}>
              <View style={styles.modalBackdrop} />
            </TouchableWithoutFeedback>

            <View style={styles.modalSheet}>
              {/* Modal Drag Header */}
              <View style={styles.modalDragHandle} />

              <View style={styles.modalTopRow}>
                <View>
                  <Text style={styles.modalRoomTitle}>{selectedRoom.roomNumber}</Text>
                  <Text style={styles.modalWingSub}>{selectedRoom.wing}</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedRoom(null)}
                >
                  <Feather name="x" size={20} color="#374151" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                {/* 1. Room Members / Occupants */}
                <Text style={styles.modalSectionHeading}>Room Members</Text>
                <View style={styles.membersCard}>
                  {selectedRoom.members.map((m, idx) => (
                    <View key={idx} style={[styles.memberItem, idx > 0 && styles.memberBorderTop]}>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        <Text style={styles.memberRelation}>{m.relation} · {m.phone}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.callIconBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => Alert.alert('Contact', `Calling ${m.name} (${m.phone})`)}
                      >
                        <Feather name="phone" size={18} color="#8D5B28" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* 2. Rent & Deposit Financial Breakdown */}
                <Text style={styles.modalSectionHeading}>Rent & Deposit Status</Text>
                <View style={styles.financeGrid}>
                  {/* Monthly Rent Card */}
                  <View style={styles.financeBox}>
                    <Text style={styles.financeBoxLabel}>Monthly Rent</Text>
                    <Text style={styles.financeBoxMain}>{selectedRoom.monthlyRent}</Text>
                    <Text style={styles.financeBoxSub}>
                      Paid: {selectedRoom.rentPaidTotal}
                    </Text>
                    <Text style={[styles.financeBoxSub, { color: selectedRoom.rentPendingTotal !== '₹0' ? '#DC2626' : '#15803D', fontWeight: '700' }]}>
                      Pending: {selectedRoom.rentPendingTotal}
                    </Text>
                  </View>

                  {/* Deposit Card */}
                  <View style={styles.financeBox}>
                    <Text style={styles.financeBoxLabel}>Deposit</Text>
                    <Text style={styles.financeBoxMain}>{selectedRoom.depositAmount}</Text>
                    <Text style={styles.financeBoxSub}>
                      Paid: {selectedRoom.depositPaid}
                    </Text>
                    <Text style={[styles.financeBoxSub, { color: selectedRoom.depositPending !== '₹0' ? '#DC2626' : '#15803D', fontWeight: '700' }]}>
                      Pending: {selectedRoom.depositPending}
                    </Text>
                  </View>
                </View>

                {/* 3. Payment History Ledger */}
                <Text style={styles.modalSectionHeading}>Payment History</Text>
                <View style={styles.historyCard}>
                  {selectedRoom.history.map((record, index) => (
                    <View key={record.id} style={[styles.historyRow, index > 0 && styles.historyRowBorder]}>
                      <View style={styles.historyLeft}>
                        <Text style={styles.historyTitle}>{record.title}</Text>
                        <Text style={styles.historyDate}>
                          {record.date} {record.method ? `• ${record.method}` : ''}
                        </Text>
                      </View>
                      <View style={styles.historyRight}>
                        <Text style={styles.historyAmount}>{record.amount}</Text>
                        <View
                          style={[
                            styles.historyBadge,
                            record.status === 'Paid'
                              ? styles.paidBadge
                              : record.status === 'Overdue'
                              ? styles.overdueBadge
                              : styles.dueBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.historyBadgeText,
                              record.status === 'Paid'
                                ? styles.paidText
                                : record.status === 'Overdue'
                                ? styles.overdueText
                                : styles.dueText,
                            ]}
                          >
                            {record.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Modal Action Buttons */}
                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={styles.reminderBtn}
                    onPress={() => {
                      Alert.alert('Rent Reminder', `Reminder notification sent to ${selectedRoom.tenantName}`);
                    }}
                  >
                    <Feather name="bell" size={16} color="#8D5B28" style={{ marginRight: 6 }} />
                    <Text style={styles.reminderBtnText}>Remind</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.recordPaymentBtn}
                    onPress={() => {
                      handleDownloadPaymentHistory(selectedRoom);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.recordPaymentBtnText}>Record Payment</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 110,
    backgroundColor: Palette.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  collectionCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  collectionLabel: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  collectionAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: Palette.primary,
    marginBottom: 12,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: Palette.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Palette.primary,
    borderRadius: 5,
  },
  pendingSubtext: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  filterPill: {
    backgroundColor: Palette.surface,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 9,
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
  ledgerCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  tenantInfoCol: {
    flex: 1,
  },
  roomHeadingText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 3,
  },
  tenantRoomText: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  amountBadgeCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  paidBadge: {
    backgroundColor: 'transparent',
  },
  overdueBadge: {
    backgroundColor: 'transparent',
  },
  dueBadge: {
    backgroundColor: 'transparent',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  paidText: {
    color: Palette.status.paid.text,
  },
  overdueText: {
    color: Palette.status.overdue.text,
  },
  dueText: {
    color: Palette.status.due.text,
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
  modalSheet: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Palette.border,
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  modalRoomTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.text,
  },
  modalWingSub: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    marginBottom: 10,
  },
  modalSectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
    marginTop: 14,
    marginBottom: 8,
  },
  membersCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  memberBorderTop: {
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.text,
  },
  memberRelation: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  callIconBtn: {
    padding: 4,
    backgroundColor: 'transparent',
  },
  financeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financeBox: {
    width: '48.5%',
    backgroundColor: Palette.surface,
    borderRadius: 5,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  financeBoxLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  financeBoxMain: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 4,
  },
  financeBoxSub: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  historyCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  historyRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  historyLeft: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.text,
  },
  historyDate: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 3,
  },
  historyBadge: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  reminderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
    borderRadius: 5,
    paddingVertical: 13,
    marginRight: 10,
  },
  reminderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.primary,
  },
  recordPaymentBtn: {
    flex: 1.4,
    backgroundColor: Palette.primary,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  recordPaymentBtnText: {
    color: Palette.surface,
    fontSize: 14,
    fontWeight: '700',
  },
});
