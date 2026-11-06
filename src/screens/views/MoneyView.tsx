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
import { Feather } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';

interface MoneyViewProps {
  onBack?: () => void;
}

export default function MoneyView({ onBack }: MoneyViewProps) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const [isAddIncomeVisible, setIsAddIncomeVisible] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');

  const [incomeList, setIncomeList] = useState([
    { id: '1', title: 'Room rent', subtitle: '9 rooms', amount: '₹85,000' },
    { id: '2', title: 'Other income', subtitle: 'Parking, laundry', amount: '₹7,000' },
  ]);

  const [isAddExpenseVisible, setIsAddExpenseVisible] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseSubtitle, setExpenseSubtitle] = useState('');

  const [expensesList, setExpensesList] = useState([
    { id: '1', title: 'Maintenance', subtitle: 'Repairs, cleaning', amount: '₹12,000' },
    { id: '2', title: 'Utilities', subtitle: 'Water, power, internet', amount: '₹8,000' },
    { id: '3', title: 'Staff & other', subtitle: 'Security, supplies', amount: '₹6,000' },
  ]);

  const totalIncome = incomeList.reduce((acc, item) => {
    const numeric = parseInt(item.amount.replace(/[^0-9]/g, ''), 10) || 0;
    return acc + numeric;
  }, 0);

  const totalExpenses = expensesList.reduce((acc, item) => {
    const numeric = parseInt(item.amount.replace(/[^0-9]/g, ''), 10) || 0;
    return acc + numeric;
  }, 0);

  const handleSaveIncome = () => {
    if (!incomeAmount.trim() || !incomeCategory.trim()) {
      Alert.alert('Required Fields', 'Please enter an income amount and category.');
      return;
    }
    const cleanNum = incomeAmount.replace(/[^0-9]/g, '');
    const formattedAmount = cleanNum
      ? `₹${Number(cleanNum).toLocaleString('en-IN')}`
      : incomeAmount.startsWith('₹') ? incomeAmount : `₹${incomeAmount}`;
    const newInc = {
      id: Date.now().toString(),
      title: incomeCategory.trim(),
      subtitle: incomeDescription.trim() || 'Additional income',
      amount: formattedAmount,
    };
    setIncomeList([newInc, ...incomeList]);
    setIncomeAmount('');
    setIncomeCategory('');
    setIncomeDescription('');
    setIsAddIncomeVisible(false);
    Alert.alert('Income Added', `${newInc.title} (${newInc.amount}) recorded successfully.`);
  };

  const handleSaveExpense = () => {
    if (!expenseTitle.trim() || !expenseAmount.trim()) {
      Alert.alert('Required Fields', 'Please enter an expense category and amount.');
      return;
    }
    const formattedAmount = expenseAmount.startsWith('₹') ? expenseAmount : `₹${expenseAmount}`;
    const newExp = {
      id: Date.now().toString(),
      title: expenseTitle.trim(),
      subtitle: expenseSubtitle.trim() || 'General property expense',
      amount: formattedAmount,
    };
    setExpensesList([newExp, ...expensesList]);
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseSubtitle('');
    setIsAddExpenseVisible(false);
    Alert.alert('Expense Added', `${newExp.title} (${newExp.amount}) recorded successfully.`);
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
      {/* Top Header with Back button and Title */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButtonCircle}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={22} color={Palette.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accounts</Text>
      </View>

      {/* 2 Top Summary Cards: Income and Expenses */}
      <View style={styles.summaryRow}>
        {/* Income Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={styles.summaryValue}>{`₹${totalIncome.toLocaleString('en-IN')}`}</Text>
          <Text style={styles.summarySub}>This month</Text>
          <View style={styles.caramelIndicator} />
        </View>

        {/* Expenses Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: Palette.text }]}>{`₹${totalExpenses.toLocaleString('en-IN')}`}</Text>
          <Text style={styles.summarySub}>This month</Text>
          <View style={[styles.caramelIndicator, { backgroundColor: Palette.primary }]} />
        </View>
      </View>

      {/* Section: Income with Add button */}
      <View style={[styles.sectionHeaderRow, { marginTop: 0 }]}>
        <Text style={styles.sectionHeading}>Income</Text>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => setIsAddIncomeVisible(true)}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardContainer}>
        {incomeList.map((inc, index) => {
          const isLast = index === incomeList.length - 1;
          return (
            <View key={inc.id}>
              <View style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemTitle}>{inc.title}</Text>
                  <Text style={styles.itemSubtitle}>{inc.subtitle}</Text>
                </View>
                <Text style={styles.itemAmount}>{inc.amount}</Text>
              </View>
              {!isLast && <View style={styles.divider} />}
            </View>
          );
        })}
      </View>

      {/* Section: Expenses with Add button */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Expenses</Text>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => setIsAddExpenseVisible(true)}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardContainer}>
        {expensesList.map((exp, index) => {
          const isLast = index === expensesList.length - 1;
          return (
            <View key={exp.id}>
              <View style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemTitle}>{exp.title}</Text>
                  <Text style={styles.itemSubtitle}>{exp.subtitle}</Text>
                </View>
                <Text style={styles.itemAmount}>{exp.amount}</Text>
              </View>
              {!isLast && <View style={styles.divider} />}
            </View>
          );
        })}
      </View>

      {/* Add Expense Modal */}
      <Modal
        visible={isAddExpenseVisible}
        transparent
        animationType="slide"
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
              <Text style={styles.inputLabel}>Expense Title / Category</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Electrical maintenance"
                placeholderTextColor={Palette.textMuted}
                value={expenseTitle}
                onChangeText={setExpenseTitle}
              />

              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 3500"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={expenseAmount}
                onChangeText={setExpenseAmount}
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
        animationType="slide"
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
              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 5000"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={incomeAmount}
                onChangeText={setIncomeAmount}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Parking, Deposit, Maintenance"
                placeholderTextColor={Palette.textMuted}
                value={incomeCategory}
                onChangeText={setIncomeCategory}
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryCard: {
    width: '48.5%',
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
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
    color: Palette.primary,
    marginBottom: 4,
  },
  summarySub: {
    fontSize: 12.5,
    color: Palette.textSecondary,
  },
  caramelIndicator: {
    height: 3,
    backgroundColor: Palette.secondary,
    borderRadius: 1.5,
    marginTop: 10,
    width: '40%',
  },
  sectionHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 12,
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
    borderRadius: 10,
  },
  addButtonText: {
    color: Palette.surface,
    fontWeight: '700',
    fontSize: 13.5,
  },
  cardContainer: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  itemLeft: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 3,
  },
  itemSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.text,
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
    marginTop: 10,
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
  saveExpenseBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  saveExpenseBtnText: {
    color: Palette.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
