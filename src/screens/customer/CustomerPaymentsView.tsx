import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Palette, Radius, Typography } from '../../constants/theme';
import { useCustomerData } from '../../context/CustomerDataContext';
import type { PaymentMode, PaymentRecord, RentFilter } from '../../types/appData';
import { formatRupeeAmount, MONTHS_FULL, parseRupeeAmount } from '../../utils/finance';

const ACCOUNTS_CARD_BG = require('../../../assets/accounts-card-bg.jpg');

interface CustomerPaymentsViewProps {
  onBack?: () => void;
  showBackButton?: boolean;
  initialOpenPayModal?: boolean;
}

const PAYMENT_MODES: PaymentMode[] = ['UPI', 'Bank Transfer', 'Net Banking', 'Cash'];

function getStatusColors(status: string) {
  if (status === 'Paid' || status === 'Held') return Palette.status.paid;
  if (status === 'Overdue') return Palette.status.overdue;
  return Palette.status.due;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function CustomerPaymentsView({
  onBack,
  showBackButton = false,
  initialOpenPayModal = false,
}: CustomerPaymentsViewProps) {
  const { data, payRent, payDeposit, refreshWorkspace } = useCustomerData();
  const { room, rentMeta, deposit, profile, ownerContact } = data;

  const isDue = rentMeta.currentStatus === 'Due' || rentMeta.currentStatus === 'Overdue';
  const baseRentNum = parseRupeeAmount(room.monthlyRent);
  const maintNum = parseRupeeAmount(rentMeta.maintenanceAmount);
  const advanceNum = parseRupeeAmount(rentMeta.advancePayment);
  const totalDueNum = isDue ? Math.max(0, baseRentNum + maintNum - advanceNum) : 0;

  const isDepositPaid = deposit.status === 'Held' || deposit.status === 'Paid';
  const depositNumeric = parseRupeeAmount(room.depositAmount || deposit.amount);

  const [filter, setFilter] = useState<RentFilter>('All');
  const [refreshing, setRefreshing] = useState(false);

  // Pay Modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(() => Boolean(initialOpenPayModal && isDue));
  const [payTarget, setPayTarget] = useState<'rent' | 'deposit' | 'advance'>('rent');
  const [payAmountInput, setPayAmountInput] = useState(() =>
    String(totalDueNum > 0 ? totalDueNum : baseRentNum + maintNum)
  );
  const [selectedMode, setSelectedMode] = useState<PaymentMode>('UPI');
  const [referenceNote, setReferenceNote] = useState('');
  const [payError, setPayError] = useState<string | null>(null);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Receipt Modal state
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);

  const openPayRentModal = React.useCallback(() => {
    setPayTarget('rent');
    const defaultAmt = totalDueNum > 0 ? totalDueNum : baseRentNum + maintNum;
    setPayAmountInput(String(defaultAmt));
    setSelectedMode('UPI');
    setReferenceNote('');
    setPayError(null);
    setIsPayModalOpen(true);
  }, [totalDueNum, baseRentNum, maintNum]);

  const openPayAdvanceModal = React.useCallback(() => {
    setPayTarget('advance');
    const defaultAmt = baseRentNum + maintNum;
    setPayAmountInput(String(defaultAmt));
    setSelectedMode('UPI');
    setReferenceNote('');
    setPayError(null);
    setIsPayModalOpen(true);
  }, [baseRentNum, maintNum]);

  const openPayDepositModal = React.useCallback(() => {
    setPayTarget('deposit');
    const defaultAmt = depositNumeric > 0 ? depositNumeric : 30000;
    setPayAmountInput(String(defaultAmt));
    setSelectedMode('UPI');
    setReferenceNote('');
    setPayError(null);
    setIsPayModalOpen(true);
  }, [depositNumeric]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const handleConfirmPay = async () => {
    const numeric = parseRupeeAmount(payAmountInput);
    if (numeric <= 0) {
      setPayError('Please enter a valid payment amount.');
      return;
    }
    setPayError(null);
    setIsSubmittingPay(true);
    try {
      const isDeposit = payTarget === 'deposit';
      const isAdvance = payTarget === 'advance';
      const record = isDeposit
        ? await payDeposit({
            paidNum: numeric,
            mode: selectedMode,
            referenceNote,
          })
        : await payRent({
            paidNum: numeric,
            mode: selectedMode,
            referenceNote:
              referenceNote.trim() || (isAdvance ? 'Advance Rent' : undefined),
          });
      setIsPayModalOpen(false);
      setSelectedReceipt(record);
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleShareReceipt = async (record: PaymentRecord) => {
    try {
      const html = `
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 32px; color: #17121D;">
            <h1 style="color: #4B0082; margin-bottom: 4px;">Luvora Rent Receipt</h1>
            <p style="color: #000000; margin-top: 0;">${escapeHtml(profile.propertyName)}</p>
            <hr style="border: none; border-top: 1px solid #E6DFEC; margin: 20px 0;" />
            <p><strong>Receipt ID:</strong> ${escapeHtml(record.id)}</p>
            <p><strong>Resident:</strong> ${escapeHtml(profile.fullName)}</p>
            <p><strong>Room:</strong> ${escapeHtml(room.roomNumber)} (${escapeHtml(room.type)})</p>
            <p><strong>Description:</strong> ${escapeHtml(record.title)}</p>
            <p><strong>Amount Paid:</strong> ${escapeHtml(record.amount)}</p>
            <p><strong>Payment Date:</strong> ${escapeHtml(record.date)}</p>
            <p><strong>Method:</strong> ${escapeHtml(record.method || 'UPI')}</p>
            <p><strong>Status:</strong> ${escapeHtml(record.status)}</p>
            <hr style="border: none; border-top: 1px solid #E6DFEC; margin: 20px 0;" />
            <p style="color: #000000; font-size: 12px;">Received by ${escapeHtml(ownerContact.name)} (${escapeHtml(ownerContact.email)})</p>
          </body>
        </html>
      `;
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
        }
      }
    } catch {
      // Ignore or handled silently
    }
  };

  const currentMonthName = MONTHS_FULL[new Date().getMonth()];
  const rentStatusColors = getStatusColors(rentMeta.currentStatus);
  const depositStatusColors = getStatusColors(deposit.status);

  const showDueRow = isDue && (filter === 'All' || filter === 'Due');
  const showDepositDueRow = !isDepositPaid && (filter === 'All' || filter === 'Due');
  const filteredHistory =
    filter === 'Due' ? [] : rentMeta.history;

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
          {/* Header Row */}
          <View style={styles.headerRow}>
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
            <Text style={styles.headerTitle}>Payments</Text>
          </View>

          {/* Current Month Rent Summary Card matching Admin style */}
          <View style={styles.summaryCard}>
            <Image
              source={ACCOUNTS_CARD_BG}
              style={styles.summaryCardBgImage}
              resizeMode="stretch"
            />
            <View style={styles.summaryCardContent}>
              <View style={styles.summaryTopRow}>
                <View>
                  <Text style={styles.summaryOverline}>
                    {currentMonthName.toUpperCase()} RENT BILL
                  </Text>
                  <Text style={styles.summaryAmount}>
                    {isDue ? formatRupeeAmount(totalDueNum) : '₹0 due'}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={[styles.statusBadgeText, { color: rentStatusColors.text }]}>
                    {rentMeta.statusBadgeText}
                  </Text>
                </View>
              </View>

              <View style={styles.breakdownBox}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Base Monthly Rent</Text>
                  <Text style={styles.breakdownVal}>{room.monthlyRent}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Maintenance Charges</Text>
                  <Text style={styles.breakdownVal}>{rentMeta.maintenanceAmount}</Text>
                </View>
                {advanceNum > 0 ? (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Advance Credit</Text>
                    <Text style={[styles.breakdownVal, { color: Palette.status.paid.text }]}>
                      -{rentMeta.advancePayment}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.divider} />
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownTotalLabel}>Next / Current Due Date</Text>
                  <Text style={styles.breakdownTotalVal}>{rentMeta.dueDate}</Text>
                </View>
              </View>

              {isDue ? (
                <TouchableOpacity
                  style={styles.payNowButton}
                  activeOpacity={0.85}
                  onPress={openPayRentModal}
                >
                  <Feather name="credit-card" size={16} color={Palette.onPrimary} />
                  <Text style={styles.payNowButtonText}>
                    Pay {formatRupeeAmount(totalDueNum)} Now
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.clearRentSection}>
                  <View style={styles.paidNoteRow}>
                    <Feather name="check-circle" size={15} color={Palette.status.paid.text} />
                    <Text style={styles.paidNoteText}>
                      All dues cleared. Next bill cycles on {rentMeta.dueDate}.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.payAdvanceButton}
                    activeOpacity={0.85}
                    onPress={openPayAdvanceModal}
                  >
                    <Feather name="credit-card" size={15} color={Palette.onPrimary} />
                    <Text style={styles.payAdvanceButtonText}>Advance Pay</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Security Deposit Card */}
          <View style={styles.depositCard}>
            <View style={styles.depositTopRow}>
              <View style={styles.depositTextCol}>
                <Text style={styles.depositTitle}>Security Deposit</Text>
                <Text style={styles.depositSub}>
                  {isDepositPaid
                    ? `Received ${deposit.dateReceived || 'on file'} · ${deposit.paymentMode || 'UPI'}`
                    : 'Refundable move-in deposit · Payment pending'}
                </Text>
              </View>
              <View style={styles.depositRightCol}>
                <Text style={styles.depositAmount}>{deposit.amount}</Text>
                <View style={styles.miniBadge}>
                  <Text
                    style={[
                      styles.miniBadgeText,
                      { color: isDepositPaid ? depositStatusColors.text : Palette.status.due.text },
                    ]}
                  >
                    {isDepositPaid ? deposit.status : 'Due'}
                  </Text>
                </View>
              </View>
            </View>

            {!isDepositPaid ? (
              <View style={styles.depositActionRow}>
                <TouchableOpacity
                  style={styles.payDepositButton}
                  activeOpacity={0.85}
                  onPress={openPayDepositModal}
                >
                  <Feather name="credit-card" size={15} color={Palette.onPrimary} />
                  <Text style={styles.payDepositButtonText}>
                    Pay Deposit {deposit.amount} Now
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {(['All', 'Paid', 'Due'] as RentFilter[]).map((tab) => {
              const isActive = filter === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilter(tab)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Payment Ledger */}
          <Text style={styles.sectionTitle}>Payment Ledger</Text>
          <View style={styles.cardContainer}>
            {showDueRow ? (
              <>
                <TouchableOpacity
                  style={styles.ledgerRow}
                  activeOpacity={0.75}
                  onPress={openPayRentModal}
                >
                  <View style={styles.ledgerLeftCol}>
                    <View style={styles.ledgerTitleRow}>
                      <Text style={styles.ledgerTitle}>{currentMonthName} Rent Bill</Text>
                      <View style={styles.miniBadge}>
                        <Text
                          style={[
                            styles.miniBadgeText,
                            { color: rentStatusColors.text },
                          ]}
                        >
                          {rentMeta.currentStatus}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.ledgerSub}>
                      Due {rentMeta.dueDate} · Tap to pay
                    </Text>
                  </View>
                  <View style={styles.ledgerRightCol}>
                    <Text style={styles.ledgerAmount}>
                      {formatRupeeAmount(totalDueNum)}
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={Typography.iconSize.sm}
                      color={Palette.primary}
                    />
                  </View>
                </TouchableOpacity>
                {(showDepositDueRow || filteredHistory.length > 0) ? (
                  <View style={styles.divider} />
                ) : null}
              </>
            ) : null}

            {showDepositDueRow ? (
              <>
                <TouchableOpacity
                  style={styles.ledgerRow}
                  activeOpacity={0.75}
                  onPress={openPayDepositModal}
                >
                  <View style={styles.ledgerLeftCol}>
                    <View style={styles.ledgerTitleRow}>
                      <Text style={styles.ledgerTitle}>Security Deposit</Text>
                      <View style={styles.miniBadge}>
                        <Text
                          style={[
                            styles.miniBadgeText,
                            { color: Palette.status.due.text },
                          ]}
                        >
                          Due
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.ledgerSub}>
                      Refundable move-in deposit · Tap to pay
                    </Text>
                  </View>
                  <View style={styles.ledgerRightCol}>
                    <Text style={styles.ledgerAmount}>{deposit.amount}</Text>
                    <Feather
                      name="chevron-right"
                      size={Typography.iconSize.sm}
                      color={Palette.primary}
                    />
                  </View>
                </TouchableOpacity>
                {filteredHistory.length > 0 ? <View style={styles.divider} /> : null}
              </>
            ) : null}

            {!showDueRow && !showDepositDueRow && filteredHistory.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>
                  {filter === 'Due'
                    ? 'No pending dues!'
                    : 'No payment records found.'}
                </Text>
              </View>
            ) : (
              filteredHistory.map((item, idx) => {
                const isLast = idx === filteredHistory.length - 1;
                return (
                  <React.Fragment key={item.id}>
                    <TouchableOpacity
                      style={styles.ledgerRow}
                      activeOpacity={0.75}
                      onPress={() => setSelectedReceipt(item)}
                    >
                      <View style={styles.ledgerLeftCol}>
                        <View style={styles.ledgerTitleRow}>
                          <Text style={styles.ledgerTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <View style={styles.miniBadge}>
                            <Text
                              style={[
                                styles.miniBadgeText,
                                { color: Palette.status.paid.text },
                              ]}
                            >
                              {item.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.ledgerSub}>
                          {item.date} · {item.method || 'UPI'}
                        </Text>
                      </View>
                      <View style={styles.ledgerRightCol}>
                        <Text style={styles.ledgerAmount}>{item.amount}</Text>
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
        </View>
      </ScrollView>

      {/* Pay Rent Modal */}
      <Modal
        visible={isPayModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmittingPay) setIsPayModalOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              if (!isSubmittingPay) setIsPayModalOpen(false);
            }}
          >
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {payTarget === 'deposit'
                  ? 'Pay Deposit'
                  : payTarget === 'advance'
                  ? 'Advance Pay'
                  : 'Pay Monthly Rent'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (!isSubmittingPay) setIsPayModalOpen(false);
                }}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={Typography.iconSize.base} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            {payTarget !== 'deposit' && payTarget !== 'advance' ? (
              <View style={styles.modalOwnerBox}>
                <Text style={styles.modalOwnerTitle}>
                  Pay to: {ownerContact.accountHolder} ({ownerContact.bankName})
                </Text>
                <Text style={styles.modalOwnerSub}>UPI: {ownerContact.upiId}</Text>
              </View>
            ) : null}

            {payError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{payError}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.inputField}
              keyboardType="numeric"
              value={payAmountInput}
              onChangeText={(val) => {
                setPayAmountInput(val.replace(/[^0-9]/g, ''));
                if (payError) setPayError(null);
              }}
              placeholder="e.g. 15000"
              placeholderTextColor={Palette.textMuted}
            />

            <Text style={styles.inputLabel}>Payment Mode</Text>
            <View style={styles.modeWrap}>
              {PAYMENT_MODES.map((mode) => {
                const active = selectedMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.modeChip, active && styles.modeChipActive]}
                    onPress={() => setSelectedMode(mode)}
                  >
                    <Text
                      style={[
                        styles.modeChipText,
                        active && styles.modeChipTextActive,
                      ]}
                    >
                      {mode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Transaction Reference</Text>
            <TextInput
              style={styles.inputField}
              value={referenceNote}
              onChangeText={setReferenceNote}
              placeholder="e.g. UTR / UPI Ref 430198"
              placeholderTextColor={Palette.textMuted}
            />

            <TouchableOpacity
              style={[styles.modalPrimaryBtn, isSubmittingPay && { opacity: 0.7 }]}
              onPress={() => void handleConfirmPay()}
              disabled={isSubmittingPay}
              activeOpacity={0.85}
            >
              <Text style={styles.modalPrimaryBtnText}>
                {isSubmittingPay
                  ? 'Processing...'
                  : payTarget === 'deposit'
                  ? 'Confirm'
                  : payTarget === 'advance'
                  ? 'Confirm'
                  : 'Confirm Payment'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment Receipt Modal */}
      <Modal
        visible={Boolean(selectedReceipt)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReceipt(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setSelectedReceipt(null)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          {selectedReceipt ? (
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Payment Receipt</Text>
                <TouchableOpacity
                  onPress={() => setSelectedReceipt(null)}
                  style={styles.modalCloseBtn}
                >
                  <Feather name="x" size={Typography.iconSize.base} color={Palette.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.receiptHero}>
                <View style={styles.receiptIconCircle}>
                  <Feather name="check" size={22} color={Palette.status.paid.text} />
                </View>
                <Text style={styles.receiptAmount}>{selectedReceipt.amount}</Text>
                <Text style={styles.receiptTitle}>{selectedReceipt.title}</Text>
              </View>

              <View style={styles.receiptTable}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Resident</Text>
                  <Text style={styles.receiptValue}>{profile.fullName}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Room</Text>
                  <Text style={styles.receiptValue}>{room.roomNumber}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Date</Text>
                  <Text style={styles.receiptValue}>{selectedReceipt.date}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Payment Method</Text>
                  <Text style={styles.receiptValue}>{selectedReceipt.method || 'UPI'}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Receipt ID</Text>
                  <Text style={styles.receiptValue}>{selectedReceipt.id}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => void handleShareReceipt(selectedReceipt)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalPrimaryBtnText}>Receipt</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
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
    marginBottom: 16,
  },
  backButtonCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.3,
  },
  summaryCard: {
    backgroundColor: Palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  summaryCardBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  summaryCardContent: {
    width: '100%',
    padding: 18,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryOverline: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.accentText,
    letterSpacing: 0.7,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.primary,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  statusBadge: {
    paddingVertical: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  breakdownBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  breakdownLabel: {
    fontSize: 11,
    color: Palette.textSecondary,
  },
  breakdownVal: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.text,
  },
  breakdownTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.text,
  },
  breakdownTotalVal: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.primary,
  },
  payNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    marginTop: 14,
  },
  payNowButtonText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
  paidNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paidNoteText: {
    fontSize: 10,
    color: Palette.status.paid.text,
    fontWeight: '600',
  },
  clearRentSection: {
    marginTop: 14,
    gap: 12,
  },
  payAdvanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    borderRadius: Radius.sm,
    paddingVertical: 12,
  },
  payAdvanceButtonText: {
    color: Palette.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  depositCard: {
    backgroundColor: Palette.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 16,
  },
  depositTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  depositTextCol: {
    flex: 1,
  },
  depositTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.text,
  },
  depositSub: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  depositRightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  depositAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.primary,
  },
  depositActionRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  payDepositButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    borderRadius: Radius.sm,
    paddingVertical: 10,
  },
  payDepositButtonText: {
    color: Palette.onPrimary,
    fontSize:12,
    fontWeight: '700',
  },
  miniBadge: {
    paddingVertical: 1,
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 5,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.text,
  },
  filterChipTextActive: {
    color: Palette.onPrimary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  cardContainer: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  ledgerLeftCol: {
    flex: 1,
    marginRight: 10,
  },
  ledgerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  ledgerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.text,
    flexShrink: 1,
  },
  ledgerSub: {
    fontSize: 11,
    color: Palette.textSecondary,
  },
  ledgerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ledgerAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.primary,
  },
  emptyRow: {
    paddingVertical: 22,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.divider,
    marginVertical: 6,
  },
  modalOverlay: {
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
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Palette.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 5,
    backgroundColor: Palette.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOwnerBox: {
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 12,
    marginBottom: 14,
  },
  modalOwnerTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
  },
  modalOwnerSub: {
    fontSize: Typography.fontSize.xs,
    color: Palette.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: Palette.status.overdue.bg,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorBannerText: {
    color: Palette.status.overdue.text,
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    marginBottom: 12,
  },
  modeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  modeChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  modeChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.text,
  },
  modeChipTextActive: {
    color: Palette.onPrimary,
  },
  modalPrimaryBtn: {
    backgroundColor: Palette.primary,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalPrimaryBtnText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
  receiptHero: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  receiptIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: Palette.status.paid.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  receiptAmount: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    color: Palette.primary,
  },
  receiptTitle: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  receiptTable: {
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 12,
    marginBottom: 14,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  receiptLabel: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
  },
  receiptValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.text,
  },
});
