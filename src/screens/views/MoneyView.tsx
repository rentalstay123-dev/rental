import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  RefreshControl,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, Typography } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import type { TransactionItem } from '../../types/appData';
import { formatRupeeAmount, MONTHS_FULL, parseRupeeAmount } from '../../utils/finance';
import PeriodicDetailsModal from '../../components/PeriodicDetailsModal';

const ACCOUNTS_CARD_BG = require('../../../assets/accounts-card-bg.jpg');

interface MoneyViewProps {
  onBack?: () => void;
}

export default function MoneyView({ onBack }: MoneyViewProps) {
  const { transactions, addTransaction, removeTransaction, refreshWorkspace } = useAppData();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const [scope, setScope] = useState<'This Month' | 'All'>('This Month');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<TransactionItem | null>(null);
  const [isPeriodicModalOpen, setIsPeriodicModalOpen] = useState(false);

  const [isAddIncomeVisible, setIsAddIncomeVisible] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');

  const [isAddExpenseVisible, setIsAddExpenseVisible] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseSubtitle, setExpenseSubtitle] = useState('');

  const now = new Date();
  const currMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currMonthLabel = MONTHS_FULL[now.getMonth()];

  const visibleTransactions =
    scope === 'This Month'
      ? transactions.filter((tx) => tx.dateIso.startsWith(currMonthPrefix))
      : transactions;

  const incomeList = visibleTransactions.filter((tx) => tx.kind === 'income');
  const expensesList = visibleTransactions.filter((tx) => tx.kind === 'expense');

  const totalIncome = incomeList.reduce((acc, item) => acc + item.numericAmount, 0);
  const totalExpenses = expensesList.reduce((acc, item) => acc + item.numericAmount, 0);

  const handleSaveIncome = async () => {
    const num = parseRupeeAmount(incomeAmount);
    if (num <= 0 || !incomeCategory.trim()) {
      setModalError('Please enter a valid income amount and category.');
      return;
    }

    const title = incomeCategory.trim();
    const subtitle = incomeDescription.trim() || 'Additional income';

    setModalError(null);
    setIncomeAmount('');
    setIncomeCategory('');
    setIncomeDescription('');
    setIsAddIncomeVisible(false);

    await addTransaction({
      kind: 'income',
      title,
      subtitle,
      numericAmount: num,
    });
    setStatusNotice(`${title} (${formatRupeeAmount(num)}) added to income.`);
  };

  const handleSaveExpense = async () => {
    const num = parseRupeeAmount(expenseAmount);
    if (!expenseTitle.trim() || num <= 0) {
      setModalError('Please enter an expense title and valid amount.');
      return;
    }

    const title = expenseTitle.trim();
    const subtitle = expenseSubtitle.trim() || 'General property expense';

    setModalError(null);
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseSubtitle('');
    setIsAddExpenseVisible(false);

    await addTransaction({
      kind: 'expense',
      title,
      subtitle,
      numericAmount: num,
    });
    setStatusNotice(`${title} (${formatRupeeAmount(num)}) recorded as expense.`);
  };

  return (
    <View style={{ flex: 1 }}>
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
          {/* Top Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButtonCircle}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
            >
              <Feather name="chevron-left" size={Typography.iconSize.header} color={Palette.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Accounts</Text>
          </View>

          {/* Periodic Details Action Row - between Accounts and This Month */}
          <View style={styles.periodicActionRow}>
            <TouchableOpacity
              style={styles.periodicDetailsBtn}
              onPress={() => setIsPeriodicModalOpen(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Periodic Details"
            >
              <Text style={styles.periodicDetailsBtnText}>Periodic Details</Text>
            </TouchableOpacity>
          </View>

          {/* Period Filter Pills */}
          <View style={styles.scopePillRow}>
            {(['This Month', 'All'] as const).map((tab) => {
              const active = scope === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.scopeChip, active && styles.scopeChipActive]}
                  onPress={() => setScope(tab)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.scopeChipText, active && styles.scopeChipTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {statusNotice ? (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeBannerText}>{statusNotice}</Text>
              <TouchableOpacity onPress={() => setStatusNotice(null)}>
                <Text style={styles.noticeDismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* 2 Top Summary Cards: Income and Expenses */}
          <View style={styles.summaryRow}>
            {/* Income Card */}
            <View style={styles.summaryCard}>
              <Image
                source={ACCOUNTS_CARD_BG}
                resizeMode="cover"
                style={styles.summaryCardBgImage}
              />
              <View style={styles.summaryCardContent}>
                <Text style={styles.summaryLabel}>Income</Text>
                <Text style={styles.summaryValue}>{formatRupeeAmount(totalIncome)}</Text>
                <Text style={styles.summarySub}>
                  {scope === 'This Month' ? currMonthLabel : 'All recorded'}
                </Text>
                <View style={styles.caramelIndicator} />
              </View>
            </View>

            {/* Expenses Card */}
            <View style={styles.summaryCard}>
              <Image
                source={ACCOUNTS_CARD_BG}
                resizeMode="cover"
                style={styles.summaryCardBgImage}
              />
              <View style={styles.summaryCardContent}>
                <Text style={styles.summaryLabel}>Expenses</Text>
                <Text style={[styles.summaryValue, { color: Palette.text }]}>
                  {formatRupeeAmount(totalExpenses)}
                </Text>
                <Text style={styles.summarySub}>
                  {scope === 'This Month' ? currMonthLabel : 'All recorded'}
                </Text>
                <View style={[styles.caramelIndicator, { backgroundColor: Palette.primary }]} />
              </View>
            </View>
          </View>

          {/* Section: Income with Add button */}
          <View style={[styles.sectionHeaderRow, { marginTop: 0 }]}>
            <Text style={styles.sectionHeading}>Income </Text>
            <TouchableOpacity
              style={styles.addButton}
              activeOpacity={0.8}
              onPress={() => {
                setModalError(null);
                setIsAddIncomeVisible(true);
              }}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardContainer}>
            {incomeList.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No income entries for this period.</Text>
              </View>
            ) : (
              incomeList.map((inc, index) => {
                const isLast = index === incomeList.length - 1;
                return (
                  <View key={inc.id}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemLeft}>
                        <Text style={styles.itemTitle}>{inc.title}</Text>
                        <Text style={styles.itemSubtitle}>
                          {inc.subtitle} · {inc.date}
                        </Text>
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={styles.itemAmount}>{inc.amount}</Text>
                        <TouchableOpacity
                          onPress={() => setConfirmDeleteTx(inc)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={styles.deleteBtn}
                        >
                          <Feather name="trash-2" size={14} color={Palette.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {!isLast && <View style={styles.divider} />}
                  </View>
                );
              })
            )}
          </View>

          {/* Section: Expenses with Add button */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Expenses </Text>
            <TouchableOpacity
              style={styles.addButton}
              activeOpacity={0.8}
              onPress={() => {
                setModalError(null);
                setIsAddExpenseVisible(true);
              }}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardContainer}>
            {expensesList.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No expense entries for this period.</Text>
              </View>
            ) : (
              expensesList.map((exp, index) => {
                const isLast = index === expensesList.length - 1;
                return (
                  <View key={exp.id}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemLeft}>
                        <Text style={styles.itemTitle}>{exp.title}</Text>
                        <Text style={styles.itemSubtitle}>
                          {exp.subtitle} · {exp.date}
                        </Text>
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={styles.itemAmount}>{exp.amount}</Text>
                        <TouchableOpacity
                          onPress={() => setConfirmDeleteTx(exp)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={styles.deleteBtn}
                        >
                          <Feather name="trash-2" size={14} color={Palette.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {!isLast && <View style={styles.divider} />}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal
        visible={isAddExpenseVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddExpenseVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsAddExpenseVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Expense</Text>
              <TouchableOpacity onPress={() => setIsAddExpenseVisible(false)}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {modalError ? (
                <View style={styles.modalErrorBanner}>
                  <Text style={styles.modalErrorText}>{modalError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Expense Title / Category</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Electrical maintenance"
                placeholderTextColor={Palette.textMuted}
                value={expenseTitle}
                onChangeText={(txt) => {
                  setExpenseTitle(txt);
                  if (modalError) setModalError(null);
                }}
              />

              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 3500"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={expenseAmount}
                onChangeText={(txt) => {
                  setExpenseAmount(txt);
                  if (modalError) setModalError(null);
                }}
              />

              <Text style={styles.inputLabel}>Description / Notes</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Common corridor wiring repair"
                placeholderTextColor={Palette.textMuted}
                value={expenseSubtitle}
                onChangeText={setExpenseSubtitle}
              />

              <TouchableOpacity
                style={styles.saveExpenseBtn}
                onPress={handleSaveExpense}
                activeOpacity={0.85}
              >
                <Text style={styles.saveExpenseBtnText}>Save Expense</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Income Modal */}
      <Modal
        visible={isAddIncomeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddIncomeVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsAddIncomeVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Income</Text>
              <TouchableOpacity onPress={() => setIsAddIncomeVisible(false)}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {modalError ? (
                <View style={styles.modalErrorBanner}>
                  <Text style={styles.modalErrorText}>{modalError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 5000"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={incomeAmount}
                onChangeText={(txt) => {
                  setIncomeAmount(txt);
                  if (modalError) setModalError(null);
                }}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Parking, Deposit, Maintenance"
                placeholderTextColor={Palette.textMuted}
                value={incomeCategory}
                onChangeText={(txt) => {
                  setIncomeCategory(txt);
                  if (modalError) setModalError(null);
                }}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Covered car parking for Room 201"
                placeholderTextColor={Palette.textMuted}
                value={incomeDescription}
                onChangeText={setIncomeDescription}
              />

              <TouchableOpacity
                style={styles.saveExpenseBtn}
                onPress={handleSaveIncome}
                activeOpacity={0.85}
              >
                <Text style={styles.saveExpenseBtnText}>Save Income</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={confirmDeleteTx !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteTx(null)}
      >
        <View style={styles.confirmOverlay}>
          <TouchableWithoutFeedback onPress={() => setConfirmDeleteTx(null)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete Entry</Text>
            <Text style={styles.confirmMessage}>
              Remove {confirmDeleteTx?.title} ({confirmDeleteTx?.amount}) from accounts?
            </Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmDeleteTx(null)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={() => {
                  if (confirmDeleteTx) {
                    void removeTransaction(confirmDeleteTx.id);
                  }
                  setConfirmDeleteTx(null);
                }}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Rental Periodic Details Modal */}
      <PeriodicDetailsModal
        visible={isPeriodicModalOpen}
        onClose={() => setIsPeriodicModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  periodicActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  periodicDetailsBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 5,
  },
  periodicDetailsBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.onPrimary,
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
  scopePillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  scopeChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 5,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  scopeChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  scopeChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  scopeChipTextActive: {
    color: Palette.onPrimary,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    width: '48.5%',
    backgroundColor: Palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
    position: 'relative',
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
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '600',
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Palette.accentText,
    marginBottom: 2,
    lineHeight: 22,
  },
  summarySub: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    lineHeight: 12,
  },
  caramelIndicator: {
    height: 2.5,
    backgroundColor: Palette.primary,
    borderRadius: 2,
    marginTop: 6,
    width: '35%',
  },
  sectionHeading: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 5,
  },
  addButtonText: {
    color: Palette.onPrimary,
    fontWeight: '700',
    fontSize: Typography.fontSize.sm,
  },
  cardContainer: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  emptyRow: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  itemLeft: {
    flex: 1,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    padding: 4,
  },
  itemTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 3,
  },
  itemSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
  },
  itemAmount: {
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
    color: Palette.text,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.divider,
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
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Palette.text,
  },
  modalErrorBanner: {
    backgroundColor: Palette.status.overdue.bg,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  modalErrorText: {
    color: Palette.status.overdue.text,
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 6,
    marginTop: 10,
  },
  inputField: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: Typography.fontSize.base,
    color: Palette.text,
  },
  saveExpenseBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 5,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  saveExpenseBtnText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
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
    borderRadius: 5,
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
    borderRadius: 5,
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
    borderRadius: 5,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
});
