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
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';

export interface PaymentsViewProps {
  onBack?: () => void;
}

export interface PaymentRecord {
  id: string;
  transactionId: string;
  residentName: string;
  roomNumber: string;
  amount: string;
  numericAmount: number;
  date: string;
  method: 'UPI' | 'Bank Transfer' | 'Cash';
  type: 'Rent' | 'Deposit' | 'Utility';
  status: 'Completed' | 'Pending' | 'Overdue';
  overdueText?: string;
  rentalPeriod?: string;
}

const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'TXN-1001',
    transactionId: 'PAY-20261004-1287',
    residentName: 'Anil Rao',
    roomNumber: 'Room 101',
    amount: '₹9,000',
    numericAmount: 9000,
    date: 'Oct 04, 2026',
    method: 'UPI',
    type: 'Rent',
    status: 'Completed',
    rentalPeriod: 'Oct 01, 2026 – Oct 31, 2026',
  },
  {
    id: 'TXN-1002',
    transactionId: 'PAY-20261003-8821',
    residentName: 'Sana Khan',
    roomNumber: 'Room 104',
    amount: '₹9,500',
    numericAmount: 9500,
    date: 'Oct 03, 2026',
    method: 'Bank Transfer',
    type: 'Rent',
    status: 'Completed',
    rentalPeriod: 'Oct 01, 2026 – Oct 31, 2026',
  },
  {
    id: 'TXN-1003',
    transactionId: 'PAY-20261002-3904',
    residentName: 'Arjun Kumar',
    roomNumber: 'Room 201',
    amount: '₹10,000',
    numericAmount: 10000,
    date: 'Oct 02, 2026',
    method: 'UPI',
    type: 'Rent',
    status: 'Pending',
    rentalPeriod: 'Oct 01, 2026 – Oct 31, 2026',
  },
  {
    id: 'TXN-1004',
    transactionId: 'PAY-20261001-4412',
    residentName: 'Sneha Patel',
    roomNumber: 'Room 202',
    amount: '₹8,000',
    numericAmount: 8000,
    date: 'Oct 01, 2026',
    method: 'Cash',
    type: 'Rent',
    status: 'Completed',
    rentalPeriod: 'Oct 01, 2026 – Oct 31, 2026',
  },
  {
    id: 'TXN-1005',
    transactionId: 'PAY-20260928-9014',
    residentName: 'Kiran Das',
    roomNumber: 'Room 103',
    amount: '₹18,000',
    numericAmount: 18000,
    date: 'Sep 28, 2026',
    method: 'Bank Transfer',
    type: 'Rent',
    status: 'Overdue',
    overdueText: 'Overdue (3 days)',
    rentalPeriod: 'Oct 01, 2026 – Oct 31, 2026',
  },
];

type FilterType = 'All' | 'Completed' | 'Pending' | 'Overdue';

export default function PaymentsView({ onBack }: PaymentsViewProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>(INITIAL_PAYMENTS);
  const [filter, setFilter] = useState<FilterType>('All');
  const [selectedMonth, setSelectedMonth] = useState('October 2026');
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected payment for Details screen
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  // Add Payment Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRoom, setNewRoom] = useState('Room 101');
  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [newStatus, setNewStatus] = useState<'Completed' | 'Pending'>('Completed');

  // Pull to refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  }, []);

  // Filtered payments
  const filteredPayments = payments.filter((item) => {
    const matchesFilter = filter === 'All' ? true : item.status === filter;
    const matchesSearch = searchQuery.trim() === ''
      ? true
      : item.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.transactionId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate dynamic stats
  const totalCollectedNum = payments
    .filter((p) => p.status === 'Completed')
    .reduce((sum, p) => sum + p.numericAmount, 0);

  const totalPendingNum = payments
    .filter((p) => p.status === 'Pending')
    .reduce((sum, p) => sum + p.numericAmount, 0);

  const completedCount = payments.filter((p) => p.status === 'Completed').length;
  const pendingCount = payments.filter((p) => p.status === 'Pending').length;
  const overdueCount = payments.filter((p) => p.status === 'Overdue').length;

  const handleRecordPayment = () => {
    if (!newName.trim() || !newAmount.trim()) {
      Alert.alert('Required', 'Please enter resident name and amount.');
      return;
    }
    const parsedAmount = parseInt(newAmount.replace(/[^0-9]/g, ''), 10) || 0;
    const newTxn: PaymentRecord = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionId: `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      residentName: newName.trim(),
      roomNumber: newRoom.trim() || 'Room 101',
      amount: `₹${parsedAmount.toLocaleString('en-IN')}`,
      numericAmount: parsedAmount,
      date: 'Today',
      method: newMethod,
      type: 'Rent',
      status: newStatus,
      rentalPeriod: 'Oct 01, 2026 – Oct 31, 2026',
    };
    setPayments([newTxn, ...payments]);
    setNewName('');
    setNewAmount('');
    setIsAddModalOpen(false);
    Alert.alert('Payment Recorded', `Payment of ${newTxn.amount} by ${newTxn.residentName} recorded successfully.`);
  };

  const handleDownloadReceipt = (payment: PaymentRecord) => {
    const content = `================================================
           LUVORA RESIDENTIAL PROPERTY
                 PAYMENT RECEIPT
================================================
Transaction ID : ${payment.transactionId}
Payment Date   : ${payment.date}
Resident Name  : ${payment.residentName}
Room Number    : ${payment.roomNumber}
Payment Method : ${payment.method}
Rental Period  : ${payment.rentalPeriod || 'Oct 01, 2026 – Oct 31, 2026'}
------------------------------------------------
PAYMENT BREAKDOWN:
Rent (${payment.roomNumber}) : ${payment.amount}
------------------------------------------------
TOTAL PAID     : ${payment.amount}
Payment Status : ${payment.status}
================================================
Thank you for your timely payment!
Luvora Property Management
`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const element = document.createElement('a');
        const file = new Blob([content], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${payment.residentName.replace(/\s+/g, '_')}_Receipt.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        Alert.alert('Receipt Downloaded', `Receipt saved for ${payment.residentName}.`);
      } catch {
        Alert.alert('Payment Receipt', content);
      }
    } else {
      Alert.alert('Payment Receipt', content);
    }
  };

  const handleSendReceipt = (payment: PaymentRecord) => {
    Alert.alert(
      'Send Receipt',
      `Send payment receipt of ${payment.amount} to ${payment.residentName} (${payment.roomNumber})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send via WhatsApp',
          onPress: () => Alert.alert('Sent', `Receipt sent to ${payment.residentName} via WhatsApp.`),
        },
        {
          text: 'Send via Email',
          onPress: () => Alert.alert('Sent', `Receipt sent to ${payment.residentName} via Email.`),
        },
      ]
    );
  };

  const handleExportReport = () => {
    const reportContent = `================================================
           LUVORA RESIDENTIAL PROPERTY
             ${selectedMonth.toUpperCase()} REPORT
================================================
Total Collected : ₹${totalCollectedNum.toLocaleString('en-IN')}
Pending Amount  : ₹${totalPendingNum.toLocaleString('en-IN')}
Total Records   : ${payments.length}
------------------------------------------------
TRANSACTIONS LIST:
${payments
  .map(
    (p, i) =>
      `${i + 1}. ${p.residentName} (${p.roomNumber}) - ${p.amount} [${p.status}] via ${p.method} on ${p.date} (${p.transactionId})`
  )
  .join('\n')}
================================================
`;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const element = document.createElement('a');
        const file = new Blob([reportContent], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${selectedMonth.replace(/\s+/g, '_')}_Payment_Report.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        Alert.alert('Report Exported', 'Payment statement saved to your downloads.');
      } catch {
        Alert.alert('Payment Report', reportContent);
      }
    } else {
      Alert.alert('Payment Report', reportContent);
    }
  };

  const handlePaymentReminder = () => {
    const unpaid = payments.filter((p) => p.status === 'Pending' || p.status === 'Overdue');
    if (unpaid.length === 0) {
      Alert.alert('Payment Reminder', 'All residents have cleared their payments.');
      return;
    }
    Alert.alert(
      'Payment Reminders',
      `Send payment reminders to ${unpaid.length} residents with pending or overdue rent (${unpaid.map((p) => p.residentName).join(', ')})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reminders',
          onPress: () => {
            Alert.alert('Reminders Sent', `Payment reminder notifications sent to ${unpaid.length} residents.`);
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------
  // DETAIL VIEW (Reproduces Image 2 pixel-by-pixel)
  // -------------------------------------------------------------
  if (selectedPayment) {
    const isCompleted = selectedPayment.status === 'Completed';
    const isPending = selectedPayment.status === 'Pending';
    const isOverdue = selectedPayment.status === 'Overdue';

    return (
      <View style={styles.outerScreen}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailContainer}
        >
          {/* Header */}
          <View style={styles.detailHeader}>
            <TouchableOpacity
              style={styles.backButtonCircle}
              onPress={() => setSelectedPayment(null)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="arrow-left" size={20} color={Palette.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailHeaderTitle}>Payment Details</Text>
              <Text style={styles.detailHeaderSub}>Apartment Rentals</Text>
            </View>
          </View>

          {/* White Card holding all details */}
          <View style={styles.detailCard}>
            {/* Hero Row: Resident / Room / Method on left, Amount / Status on right */}
            <View style={styles.detailHeroRow}>
              <View style={styles.detailHeroLeft}>
                <Text style={styles.detailHeroName}>{selectedPayment.residentName}</Text>
                <Text style={styles.detailHeroRoom}>{selectedPayment.roomNumber}</Text>
                <Text style={styles.detailHeroMethod}>{selectedPayment.method}</Text>
              </View>

              <View style={styles.detailHeroDivider} />

              <View style={styles.detailHeroRight}>
                <Text style={styles.detailHeroAmount}>{selectedPayment.amount}</Text>
                <Text
                  style={[
                    styles.detailHeroStatus,
                    isCompleted && styles.statusCompleted,
                    isPending && styles.statusPending,
                    isOverdue && styles.statusOverdue,
                  ]}
                >
                  {selectedPayment.status}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Section: Payment Information */}
            <Text style={styles.detailSectionTitle}>Payment Information</Text>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>Payment Date</Text>
              <Text style={styles.detailInfoValue}>{selectedPayment.date}</Text>
            </View>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>Transaction ID</Text>
              <Text style={styles.detailInfoValue}>{selectedPayment.transactionId}</Text>
            </View>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>Payment Method</Text>
              <Text style={styles.detailInfoValue}>{selectedPayment.method}</Text>
            </View>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>Status</Text>
              <Text
                style={[
                  styles.detailInfoValue,
                  isCompleted && styles.statusCompleted,
                  isPending && styles.statusPending,
                  isOverdue && styles.statusOverdue,
                ]}
              >
                {selectedPayment.status}
              </Text>
            </View>

            <View style={styles.cardDivider} />

            {/* Section: Payment Breakdown */}
            <Text style={styles.detailSectionTitle}>Payment Breakdown</Text>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>Rent ({selectedPayment.roomNumber})</Text>
              <Text style={styles.detailInfoValue}>{selectedPayment.amount}</Text>
            </View>
            <View style={[styles.detailInfoRow, { marginTop: 4 }]}>
              <Text style={[styles.detailInfoLabel, { fontWeight: '700', color: Palette.text }]}>Total Paid</Text>
              <Text style={[styles.detailInfoValue, { fontWeight: '800', color: Palette.text }]}>{selectedPayment.amount}</Text>
            </View>

            <View style={styles.cardDivider} />

            {/* Section: Rental Period */}
            <Text style={styles.detailSectionTitle}>Rental Period</Text>
            <View style={styles.detailInfoRow}>
              <Text style={styles.detailInfoLabel}>
                {selectedPayment.rentalPeriod || 'Oct 01, 2026 – Oct 31, 2026'}
              </Text>
              <Text style={[styles.detailInfoValue, { color: Palette.primary, fontWeight: '700' }]}>Monthly</Text>
            </View>
          </View>

          {/* Bottom Dual Action Buttons */}
          <View style={styles.detailActionRow}>
            <TouchableOpacity
              style={styles.sendReceiptBtn}
              activeOpacity={0.8}
              onPress={() => handleSendReceipt(selectedPayment)}
            >
              <Text style={styles.sendReceiptBtnText}>Send Receipt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.downloadReceiptBtn}
              activeOpacity={0.85}
              onPress={() => handleDownloadReceipt(selectedPayment)}
            >
              <Text style={styles.downloadReceiptBtnText}>Download Receipt</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // -------------------------------------------------------------
  // MAIN PAYMENTS VIEW (Reproduces Image 1 pixel-by-pixel)
  // -------------------------------------------------------------
  return (
    <View style={styles.outerScreen}>
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
        {/* Top Header Row with Circle Back, Title + Subtitle, Search, Calendar, + Record */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeftCol}>
            <TouchableOpacity
              style={styles.backButtonCircle}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-left" size={22} color={Palette.text} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Payments</Text>
              <Text style={styles.headerSubtitle}>Apartment Rentals</Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.headerIconCircle}
              onPress={() => setIsSearchOpen(!isSearchOpen)}
              activeOpacity={0.7}
            >
              <Feather name="search" size={17} color={Palette.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconCircle}
              onPress={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
              activeOpacity={0.7}
            >
              <Feather name="calendar" size={17} color={Palette.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.recordPillBtn}
              activeOpacity={0.85}
              onPress={() => setIsAddModalOpen(true)}
            >
              <Text style={styles.recordPillText}>+ Record</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar Input (when toggled) */}
        {isSearchOpen && (
          <View style={styles.searchBarContainer}>
            <Feather name="search" size={16} color={Palette.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search resident, room, or ID..."
              placeholderTextColor={Palette.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={16} color={Palette.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Month Selector dropdown if opened */}
        {isMonthPickerOpen && (
          <View style={styles.monthDropdown}>
            {['October 2026', 'September 2026', 'August 2026'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.monthOption, selectedMonth === m && styles.monthOptionSelected]}
                onPress={() => {
                  setSelectedMonth(m);
                  setIsMonthPickerOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.monthOptionText,
                    selectedMonth === m && styles.monthOptionTextSelected,
                  ]}
                >
                  {m}
                </Text>
                {selectedMonth === m && (
                  <Feather name="check" size={16} color={Palette.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Top Summary Card: Total Collected, growth pill, 3-column stats */}
        <View style={styles.summaryCard}>
          <TouchableOpacity
            style={styles.summaryMonthToggle}
            activeOpacity={0.7}
            onPress={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
          >
            <Text style={styles.summaryMonthText}>Total Collected · {selectedMonth}</Text>
            <Feather name="chevron-down" size={15} color={Palette.textSecondary} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <Text style={styles.summaryLargeAmount}>₹85,000</Text>

          <View style={styles.growthBadgeRow}>
            <Feather name="arrow-up-right" size={14} color="#16A34A" style={{ marginRight: 3 }} />
            <Text style={styles.growthBadgeText}>+12% from September (₹76,000)</Text>
          </View>

          <View style={styles.summaryStatsDivider} />

          {/* 3-column stats */}
          <View style={styles.statsThreeColRow}>
            <View style={styles.statCol}>
              <Text style={styles.statColAmount}>₹85,000</Text>
              <Text style={styles.statColLabel}>Collected</Text>
            </View>

            <View style={styles.statColDivider} />

            <View style={styles.statCol}>
              <Text style={styles.statColAmount}>₹10,000</Text>
              <Text style={styles.statColLabel}>Pending</Text>
            </View>

            <View style={styles.statColDivider} />

            <View style={styles.statCol}>
              <Text style={styles.statColAmount}>{payments.length}</Text>
              <Text style={styles.statColLabel}>Transactions</Text>
            </View>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'All' && styles.filterPillActive]}
            onPress={() => setFilter('All')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, filter === 'All' && styles.filterPillTextActive]}>
              All ({payments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'Completed' && styles.filterPillActive]}
            onPress={() => setFilter('Completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, filter === 'Completed' && styles.filterPillTextActive]}>
              Completed ({completedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'Pending' && styles.filterPillActive]}
            onPress={() => setFilter('Pending')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, filter === 'Pending' && styles.filterPillTextActive]}>
              Pending ({pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'Overdue' && styles.filterPillActive]}
            onPress={() => setFilter('Overdue')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, filter === 'Overdue' && styles.filterPillTextActive]}>
              Overdue ({overdueCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transactions List: Each transaction is an individual card */}
        <View style={styles.transactionsListContainer}>
          {filteredPayments.map((item) => {
            const isCompleted = item.status === 'Completed';
            const isPending = item.status === 'Pending';
            const isOverdue = item.status === 'Overdue';

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.transactionCard}
                activeOpacity={0.75}
                onPress={() => setSelectedPayment(item)}
              >
                <View style={styles.cardLeftCol}>
                  <Text style={styles.residentNameText}>{item.residentName}</Text>
                  <Text style={styles.roomMethodText}>
                    {item.roomNumber} · {item.method}
                  </Text>
                  <Text style={styles.dateText}>{item.date}</Text>
                </View>

                <View style={styles.cardRightCol}>
                  <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                    <Text style={styles.amountText}>{item.amount}</Text>
                    <Text
                      style={[
                        styles.statusText,
                        isCompleted && styles.statusCompleted,
                        isPending && styles.statusPending,
                        isOverdue && styles.statusOverdue,
                      ]}
                    >
                      {item.overdueText || item.status}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={17} color={Palette.secondary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom 4 Quick Action Cards (Add Payment, Generate Receipt, Payment Reminder, Export Report) */}
        <View style={styles.bottomQuickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionCard}
            activeOpacity={0.7}
            onPress={() => setIsAddModalOpen(true)}
          >
            <View style={styles.quickActionIconBox}>
              <MaterialCommunityIcons name="credit-card-plus-outline" size={24} color={Palette.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Add Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            activeOpacity={0.7}
            onPress={() => {
              if (payments.length > 0) {
                setSelectedPayment(payments[0]);
              }
            }}
          >
            <View style={styles.quickActionIconBox}>
              <Feather name="file-text" size={22} color={Palette.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Generate Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            activeOpacity={0.7}
            onPress={handlePaymentReminder}
          >
            <View style={styles.quickActionIconBox}>
              <Feather name="bell" size={22} color={Palette.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Payment Reminder</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            activeOpacity={0.7}
            onPress={handleExportReport}
          >
            <View style={styles.quickActionIconBox}>
              <Feather name="download" size={22} color={Palette.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Export Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Record Payment Modal with Keyboard Scrolling */}
      <Modal visible={isAddModalOpen} transparent animationType="slide" onRequestClose={() => setIsAddModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsAddModalOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <Text style={styles.inputLabel}>Resident Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Anil Rao"
                placeholderTextColor={Palette.textMuted}
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.inputLabel}>Room Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Room 101"
                placeholderTextColor={Palette.textMuted}
                value={newRoom}
                onChangeText={setNewRoom}
              />

              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 9000"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={newAmount}
                onChangeText={setNewAmount}
              />

              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.methodPillRow}>
                {(['UPI', 'Bank Transfer', 'Cash'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.methodChip, newMethod === m && styles.methodChipActive]}
                    onPress={() => setNewMethod(m)}
                  >
                    <Text style={[styles.methodChipText, newMethod === m && styles.methodChipTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Payment Status</Text>
              <View style={styles.methodPillRow}>
                {(['Completed', 'Pending'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.methodChip, newStatus === st && styles.methodChipActive]}
                    onPress={() => setNewStatus(st)}
                  >
                    <Text style={[styles.methodChipText, newStatus === st && styles.methodChipTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.savePaymentBtn}
                onPress={handleRecordPayment}
                activeOpacity={0.85}
              >
                <Text style={styles.savePaymentBtnText}>Save Payment</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerScreen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
    backgroundColor: Palette.background,
  },

  // Header Row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: 0.2,
    ...Platform.select({
      ios: { fontFamily: 'Georgia' },
      android: { fontFamily: 'serif' },
      default: { fontFamily: 'serif' },
    }),
  },
  headerSubtitle: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  recordPillBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  recordPillText: {
    color: Palette.surface,
    fontWeight: '700',
    fontSize: 13,
  },

  // Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.text,
  },

  // Month Selector
  monthDropdown: {
    backgroundColor: Palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 8,
    marginBottom: 14,
  },
  monthOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  monthOptionSelected: {
    backgroundColor: Palette.background,
  },
  monthOptionText: {
    fontSize: 13.5,
    color: Palette.text,
    fontWeight: '600',
  },
  monthOptionTextSelected: {
    color: Palette.primary,
    fontWeight: '700',
  },

  // Top Summary Card
  summaryCard: {
    backgroundColor: Palette.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryMonthToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryMonthText: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  summaryLargeAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: Palette.primary,
    marginBottom: 4,
  },
  growthBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  growthBadgeText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#16A34A',
  },
  summaryStatsDivider: {
    height: 1,
    backgroundColor: Palette.border,
    marginBottom: 14,
  },
  statsThreeColRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statColAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 2,
  },
  statColLabel: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  statColDivider: {
    width: 1,
    height: 28,
    backgroundColor: Palette.border,
  },

  // Filter Pills Row
  filterPillsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterPillActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.text,
  },
  filterPillTextActive: {
    color: Palette.surface,
    fontWeight: '700',
  },

  // Transaction Cards List
  transactionsListContainer: {
    marginBottom: 20,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardLeftCol: {
    flex: 1,
  },
  residentNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 2,
  },
  roomMethodText: {
    fontSize: 12.5,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 11.5,
    color: Palette.textMuted,
  },
  cardRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusCompleted: {
    color: '#16A34A',
  },
  statusPending: {
    color: '#D97706',
  },
  statusOverdue: {
    color: '#DC2626',
  },

  // Bottom 4 Quick Action Cards
  bottomQuickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  quickActionIconBox: {
    marginBottom: 6,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Palette.text,
    textAlign: 'center',
  },

  // -------------------------------------------------------------
  // DETAILS SCREEN STYLES (Image 2)
  // -------------------------------------------------------------
  detailContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
    backgroundColor: Palette.background,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.text,
    ...Platform.select({
      ios: { fontFamily: 'Georgia' },
      android: { fontFamily: 'serif' },
      default: { fontFamily: 'serif' },
    }),
  },
  detailHeaderSub: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  detailCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 20,
  },
  detailHeroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailHeroLeft: {
    flex: 1,
  },
  detailHeroName: {
    fontSize: 19,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 2,
  },
  detailHeroRoom: {
    fontSize: 13.5,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  detailHeroMethod: {
    fontSize: 12.5,
    color: Palette.textSecondary,
    marginTop: 1,
  },
  detailHeroDivider: {
    width: 1,
    height: 48,
    backgroundColor: Palette.border,
    marginHorizontal: 16,
  },
  detailHeroRight: {
    alignItems: 'flex-end',
  },
  detailHeroAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 3,
  },
  detailHeroStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: 16,
  },
  detailSectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 10,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailInfoLabel: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  detailInfoValue: {
    fontSize: 13,
    color: Palette.text,
    fontWeight: '600',
  },
  detailActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  sendReceiptBtn: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendReceiptBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Palette.text,
  },
  downloadReceiptBtn: {
    flex: 1,
    backgroundColor: Palette.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  downloadReceiptBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Palette.surface,
  },

  // Modal Styles
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
  modalCard: {
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Palette.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.text,
  },
  methodPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    backgroundColor: Palette.surface,
  },
  methodChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  methodChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.text,
  },
  methodChipTextActive: {
    color: Palette.surface,
    fontWeight: '700',
  },
  savePaymentBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  savePaymentBtnText: {
    color: Palette.surface,
    fontSize: 15,
    fontWeight: '700',
  },
});
