import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DEFAULT_STAFF_ROLES } from '../../constants/initialData';
import { Palette, Radius, Typography } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import type { StaffMember, StaffShift, StaffStatus } from '../../types/appData';
import {
  formatRupeeAmount,
  formatShortDate,
  parseRupeeAmount,
} from '../../utils/finance';

interface StaffViewProps {
  onBack?: () => void;
}

type FilterOption = 'All' | StaffStatus;

const STAFF_SHIFTS: StaffShift[] = ['Full Day', 'Morning', 'Night', 'On Call'];
const STAFF_STATUSES: StaffStatus[] = ['Active', 'On Leave'];

interface NoticeState {
  tone: 'success' | 'error';
  message: string;
}

interface StaffFormState {
  name: string;
  role: string;
  phone: string;
  salaryInput: string;
  shift: StaffShift;
  status: StaffStatus;
  joinedDate: string;
  notes: string;
}

function createEmptyFormState(): StaffFormState {
  return {
    name: '',
    role: DEFAULT_STAFF_ROLES[0] ?? 'Caretaker',
    phone: '',
    salaryInput: '',
    shift: 'Full Day',
    status: 'Active',
    joinedDate: formatShortDate(new Date()),
    notes: '',
  };
}

function createFormStateFromMember(member: StaffMember): StaffFormState {
  const numeric = member.numericSalary || parseRupeeAmount(member.salary);
  return {
    name: member.name,
    role: member.role,
    phone: member.phone,
    salaryInput: numeric > 0 ? String(numeric) : '',
    shift: member.shift,
    status: member.status,
    joinedDate: member.joinedDate,
    notes: member.notes ?? '',
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatWhatsAppDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export default function StaffView({ onBack }: StaffViewProps) {
  const {
    staff,
    upsertStaff,
    removeStaff,
    payStaffSalary,
    loadSampleStaff,
    refreshWorkspace,
  } = useAppData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterOption>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  // Add / Edit modal state
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formState, setFormState] = useState<StaffFormState>(createEmptyFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingForm, setIsSavingForm] = useState(false);

  // Pay salary modal state
  const [payingStaff, setPayingStaff] = useState<StaffMember | null>(null);
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payError, setPayError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // Delete confirmation modal state
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const stats = useMemo(() => {
    let activeCount = 0;
    let onLeaveCount = 0;
    let monthlyPayroll = 0;

    for (const member of staff) {
      const amount = member.numericSalary || parseRupeeAmount(member.salary);
      if (member.status === 'Active') {
        activeCount += 1;
        monthlyPayroll += amount;
      } else {
        onLeaveCount += 1;
      }
    }

    return {
      total: staff.length,
      activeCount,
      onLeaveCount,
      monthlyPayroll,
    };
  }, [staff]);

  const filteredStaff = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return staff.filter((member) => {
      if (statusFilter !== 'All' && member.status !== statusFilter) {
        return false;
      }
      if (!query) return true;
      return (
        member.name.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query) ||
        member.phone.toLowerCase().includes(query) ||
        member.shift.toLowerCase().includes(query)
      );
    });
  }, [staff, statusFilter, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshWorkspace();
    } catch {
      setNotice({
        tone: 'error',
        message: 'Could not refresh staff data. Showing current cached list.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setFormState(createEmptyFormState());
    setFormError(null);
    setFormModalVisible(true);
  };

  const openEditModal = (member: StaffMember) => {
    setEditingStaff(member);
    setFormState(createFormStateFromMember(member));
    setFormError(null);
    setFormModalVisible(true);
  };

  const closeFormModal = () => {
    if (isSavingForm) return;
    setFormModalVisible(false);
    setEditingStaff(null);
    setFormError(null);
  };

  const handleSaveStaff = async () => {
    const trimmedName = formState.name.trim();
    const trimmedRole = formState.role.trim();
    const trimmedPhone = formState.phone.trim();
    const numericSalary = parseRupeeAmount(formState.salaryInput);

    if (!trimmedName) {
      setFormError('Please enter the staff member name.');
      return;
    }
    if (!trimmedRole) {
      setFormError('Please select or enter a staff role.');
      return;
    }
    if (!trimmedPhone) {
      setFormError('Please enter a contact phone number.');
      return;
    }
    if (numericSalary <= 0) {
      setFormError('Please enter a valid monthly salary greater than zero.');
      return;
    }

    const trimmedNotes = formState.notes.trim();
    const trimmedJoined = formState.joinedDate.trim() || formatShortDate(new Date());

    const payload: StaffMember = {
      id: editingStaff?.id ?? `st-${Date.now()}`,
      name: trimmedName,
      role: trimmedRole,
      phone: trimmedPhone,
      numericSalary,
      salary: formatRupeeAmount(numericSalary),
      shift: formState.shift,
      status: formState.status,
      joinedDate: trimmedJoined,
      ...(editingStaff?.lastPaidDate
        ? { lastPaidDate: editingStaff.lastPaidDate }
        : {}),
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
    };

    setIsSavingForm(true);
    setFormError(null);
    try {
      await upsertStaff(payload);
      setFormModalVisible(false);
      setEditingStaff(null);
      setNotice({
        tone: 'success',
        message: editingStaff
          ? `Updated ${payload.name}'s profile.`
          : `Added ${payload.name} to your staff directory.`,
      });
    } catch {
      setFormError('Unable to save staff details right now. Please try again.');
    } finally {
      setIsSavingForm(false);
    }
  };

  const openPayModal = (member: StaffMember) => {
    const amount = member.numericSalary || parseRupeeAmount(member.salary);
    setPayingStaff(member);
    setPayAmountInput(amount > 0 ? String(amount) : '');
    setPayError(null);
  };

  const closePayModal = () => {
    if (isPaying) return;
    setPayingStaff(null);
    setPayError(null);
  };

  const handleConfirmPay = async () => {
    if (!payingStaff) return;
    const amountNum = parseRupeeAmount(payAmountInput);
    if (amountNum <= 0) {
      setPayError('Enter a valid salary payout amount greater than zero.');
      return;
    }

    setIsPaying(true);
    setPayError(null);
    try {
      await payStaffSalary(payingStaff, amountNum, new Date());
      const paidName = payingStaff.name;
      setPayingStaff(null);
      setNotice({
        tone: 'success',
        message: `Recorded ${formatRupeeAmount(amountNum)} salary payout for ${paidName} in Accounts.`,
      });
    } catch {
      setPayError('Failed to record salary payment. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  const openDeleteModal = (member: StaffMember) => {
    setDeletingStaff(member);
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeletingStaff(null);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const removedName = deletingStaff.name;
      await removeStaff(deletingStaff.id);
      setDeletingStaff(null);
      setNotice({
        tone: 'success',
        message: `Removed ${removedName} from the staff list.`,
      });
    } catch {
      setDeleteError('Unable to delete this staff member. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    try {
      await loadSampleStaff();
      setNotice({
        tone: 'success',
        message: 'Sample staff profiles loaded into your directory.',
      });
    } catch {
      setNotice({
        tone: 'error',
        message: 'Unable to load sample staff right now. Please try again.',
      });
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleCallMember = async (member: StaffMember) => {
    const cleanPhone = member.phone.replace(/[^\d+]/g, '');
    if (!cleanPhone) {
      setNotice({
        tone: 'error',
        message: `No valid phone number saved for ${member.name}.`,
      });
      return;
    }
    try {
      await Linking.openURL(`tel:${cleanPhone}`);
    } catch {
      setNotice({
        tone: 'error',
        message: `Could not open dialer for ${member.phone}.`,
      });
    }
  };

  const handleWhatsAppMember = async (member: StaffMember) => {
    const waDigits = formatWhatsAppDigits(member.phone);
    if (!waDigits) {
      setNotice({
        tone: 'error',
        message: `No valid WhatsApp number saved for ${member.name}.`,
      });
      return;
    }
    const greeting = encodeURIComponent(`Hi ${member.name},`);
    try {
      await Linking.openURL(`https://wa.me/${waDigits}?text=${greeting}`);
    } catch {
      setNotice({
        tone: 'error',
        message: `Could not open WhatsApp for ${member.phone}.`,
      });
    }
  };

  const renderStatusBadge = (status: StaffStatus) => {
    const isActive = status === 'Active';
    return (
      <View
        style={[
          styles.statusBadge,
          isActive ? styles.statusBadgeActive : styles.statusBadgeLeave,
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            isActive
              ? styles.statusBadgeTextActive
              : styles.statusBadgeTextLeave,
          ]}
        >
          {status}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Palette.primary}
            colors={[Palette.primary]}
          />
        }
      >
        <View style={styles.contentWrapper}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {onBack ? (
                <TouchableOpacity
                  onPress={onBack}
                  style={styles.backButton}
                  accessibilityRole="button"
                  accessibilityLabel="Back to home"
                >
                  <Feather
                    name="arrow-left"
                    size={Typography.iconSize.base}
                    color={Palette.text}
                  />
                </TouchableOpacity>
              ) : null}
              <View style={styles.headerTitleBlock}>
                <Text style={styles.pageTitle}>Staff</Text>
              
              </View>
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={openAddModal}
              accessibilityRole="button"
              accessibilityLabel="Add staff member"
            >
              <Text style={styles.addButtonText}>Add Staff</Text>
            </TouchableOpacity>
          </View>

          {/* Inline Notice Banner */}
          {notice ? (
            <View
              style={[
                styles.noticeBanner,
                notice.tone === 'error'
                  ? styles.noticeBannerError
                  : styles.noticeBannerSuccess,
              ]}
            >
              <Feather
                name={notice.tone === 'error' ? 'alert-circle' : 'check-circle'}
                size={Typography.iconSize.sm}
                color={
                  notice.tone === 'error'
                    ? Palette.status.overdue.text
                    : Palette.status.paid.text
                }
              />
              <Text
                style={[
                  styles.noticeText,
                  notice.tone === 'error'
                    ? styles.noticeTextError
                    : styles.noticeTextSuccess,
                ]}
              >
                {notice.message}
              </Text>
              <TouchableOpacity
                onPress={() => setNotice(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Dismiss notification"
              >
                <Feather
                  name="x"
                  size={Typography.iconSize.sm}
                  color={Palette.textSecondary}
                />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconWrap}>
                <Feather
                  name="users"
                  size={Typography.iconSize.base}
                  color={Palette.primary}
                />
              </View>
              <Text style={styles.summaryLabel}>Active Staff</Text>
              <Text style={styles.summaryValue}>{stats.activeCount}</Text>
              <Text style={styles.summaryHint}>
                {stats.onLeaveCount > 0
                  ? `${stats.onLeaveCount} on leave · ${stats.total} total`
                  : `${stats.total} total team members`}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIconWrap}>
                <Feather
                  name="credit-card"
                  size={Typography.iconSize.base}
                  color={Palette.primary}
                />
              </View>
              <Text style={styles.summaryLabel}>Monthly Payroll</Text>
              <Text style={styles.summaryValue}>
                {formatRupeeAmount(stats.monthlyPayroll)}
              </Text>
              <Text style={styles.summaryHint}>Active monthly commitment</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Feather
              name="search"
              size={Typography.iconSize.sm}
              color={Palette.textMuted}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, role, phone, or shift..."
              placeholderTextColor={Palette.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Feather
                  name="x"
                  size={Typography.iconSize.sm}
                  color={Palette.textMuted}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {(
              [
                { key: 'All', count: stats.total },
                { key: 'Active', count: stats.activeCount },
                { key: 'On Leave', count: stats.onLeaveCount },
              ] as const
            ).map((option) => {
              const selected = statusFilter === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterPill,
                    selected && styles.filterPillSelected,
                  ]}
                  onPress={() => setStatusFilter(option.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      selected && styles.filterPillTextSelected,
                    ]}
                  >
                    {option.key} ({option.count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Staff List or Empty State */}
          {staff.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Feather
                  name="users"
                  size={Typography.iconSize.lg}
                  color={Palette.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>No staff members yet</Text>
              <Text style={styles.emptyBody}>
                Add security guards, housekeeping, caretakers, and maintenance
                staff to track shifts, contacts, and monthly salary expenses.
              </Text>
              <View style={styles.emptyActions}>
                <TouchableOpacity
                  style={styles.emptyPrimaryBtn}
                  onPress={openAddModal}
                >
                  <Text style={styles.emptyPrimaryBtnText}>Add Staff</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.emptySecondaryBtn}
                  onPress={handleLoadSample}
                  disabled={isLoadingSample}
                >
                  <Text style={styles.emptySecondaryBtnText}>
                    {isLoadingSample ? 'Loading...' : 'Load Sample Staff'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : filteredStaff.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No matching staff</Text>
              <Text style={styles.emptyBody}>
                Try adjusting your search query or status filter.
              </Text>
              <TouchableOpacity
                style={styles.emptySecondaryBtn}
                onPress={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
              >
                <Text style={styles.emptySecondaryBtnText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {filteredStaff.map((member) => {
                const salaryText =
                  member.salary || formatRupeeAmount(member.numericSalary);
                return (
                  <View key={member.id} style={styles.staffCard}>
                    <View style={styles.staffTopRow}>
                      <View style={styles.staffIdentityRow}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarText}>
                            {getInitials(member.name)}
                          </Text>
                        </View>
                        <View style={styles.staffNameBlock}>
                          <Text style={styles.staffName}>{member.name}</Text>
                          <View style={styles.roleStatusRow}>
                            <Text style={styles.staffRole}>{member.role}</Text>
                            {renderStatusBadge(member.status)}
                          </View>
                        </View>
                      </View>

                      <View style={styles.salaryBox}>
                        <Text style={styles.salaryAmount}>{salaryText}</Text>
                        <Text style={styles.salaryUnit}>/ month</Text>
                      </View>
                    </View>

                    <View style={styles.metaGrid}>
                      <View style={styles.metaItem}>
                        <Feather
                          name="phone"
                          size={Typography.iconSize.sm}
                          color={Palette.textSecondary}
                        />
                        <Text style={styles.metaText}>{member.phone}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Feather
                          name="clock"
                          size={Typography.iconSize.sm}
                          color={Palette.textSecondary}
                        />
                        <Text style={styles.metaText}>{member.shift}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Feather
                          name="calendar"
                          size={Typography.iconSize.sm}
                          color={Palette.textSecondary}
                        />
                        <Text style={styles.metaText}>
                          Joined {member.joinedDate}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Feather
                          name="check-circle"
                          size={Typography.iconSize.sm}
                          color={
                            member.lastPaidDate
                              ? Palette.status.paid.text
                              : Palette.textMuted
                          }
                        />
                        <Text style={styles.metaText}>
                          {member.lastPaidDate
                            ? `Paid ${member.lastPaidDate}`
                            : 'Not paid yet'}
                        </Text>
                      </View>
                    </View>

                    {member.notes ? (
                      <Text style={styles.notesText}>{member.notes}</Text>
                    ) : null}

                    <View style={styles.divider} />

                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.secondaryActionChip}
                        onPress={() => handleCallMember(member)}
                      >
                        <Feather
                          name="phone"
                          size={Typography.iconSize.sm}
                          color={Palette.primary}
                        />
                        <Text style={styles.secondaryActionText}>Call</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryActionChip}
                        onPress={() => handleWhatsAppMember(member)}
                      >
                        <Feather
                          name="message-circle"
                          size={Typography.iconSize.sm}
                          color={Palette.status.paid.text}
                        />
                        <Text style={styles.secondaryActionText}>WhatsApp</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.paySalaryChip}
                        onPress={() => openPayModal(member)}
                      >
                        <Feather
                          name="credit-card"
                          size={Typography.iconSize.sm}
                          color={Palette.onPrimary}
                        />
                        <Text style={styles.paySalaryChipText}>Pay Salary</Text>
                      </TouchableOpacity>

                      <View style={styles.iconActionsGroup}>
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          onPress={() => openEditModal(member)}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${member.name}`}
                        >
                          <Feather
                            name="edit-2"
                            size={Typography.iconSize.sm}
                            color={Palette.textSecondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          onPress={() => openDeleteModal(member)}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${member.name}`}
                        >
                          <Feather
                            name="trash-2"
                            size={Typography.iconSize.sm}
                            color={Palette.status.overdue.text}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add / Edit Staff Modal */}
      <Modal
        visible={formModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeFormModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </Text>
              <TouchableOpacity
                onPress={closeFormModal}
                disabled={isSavingForm}
                accessibilityRole="button"
                accessibilityLabel="Close staff modal"
              >
                <Feather
                  name="x"
                  size={Typography.iconSize.base}
                  color={Palette.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBodyScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {formError ? (
                <View style={styles.modalErrorBanner}>
                  <Feather
                    name="alert-circle"
                    size={Typography.iconSize.sm}
                    color={Palette.status.overdue.text}
                  />
                  <Text style={styles.modalErrorText}>{formError}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Ramesh Naik"
                placeholderTextColor={Palette.textMuted}
                value={formState.name}
                onChangeText={(value) =>
                  setFormState((prev) => ({ ...prev, name: value }))
                }
              />

              <Text style={styles.fieldLabel}>Role *</Text>
              <View style={styles.chipWrap}>
                {DEFAULT_STAFF_ROLES.map((roleOption) => {
                  const active = formState.role === roleOption;
                  return (
                    <TouchableOpacity
                      key={roleOption}
                      style={[
                        styles.optionChip,
                        active && styles.optionChipSelected,
                      ]}
                      onPress={() =>
                        setFormState((prev) => ({ ...prev, role: roleOption }))
                      }
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          active && styles.optionChipTextSelected,
                        ]}
                      >
                        {roleOption}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Or enter a custom role"
                placeholderTextColor={Palette.textMuted}
                value={formState.role}
                onChangeText={(value) =>
                  setFormState((prev) => ({ ...prev, role: value }))
                }
              />

              <Text style={styles.fieldLabel}>Phone Number *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. +91 98765 43210"
                placeholderTextColor={Palette.textMuted}
                keyboardType="phone-pad"
                value={formState.phone}
                onChangeText={(value) =>
                  setFormState((prev) => ({ ...prev, phone: value }))
                }
              />

              <Text style={styles.fieldLabel}>Monthly Salary (₹) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 15000"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={formState.salaryInput}
                onChangeText={(value) =>
                  setFormState((prev) => ({ ...prev, salaryInput: value }))
                }
              />

              <Text style={styles.fieldLabel}>Shift</Text>
              <View style={styles.chipWrap}>
                {STAFF_SHIFTS.map((shiftOption) => {
                  const active = formState.shift === shiftOption;
                  return (
                    <TouchableOpacity
                      key={shiftOption}
                      style={[
                        styles.optionChip,
                        active && styles.optionChipSelected,
                      ]}
                      onPress={() =>
                        setFormState((prev) => ({ ...prev, shift: shiftOption }))
                      }
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          active && styles.optionChipTextSelected,
                        ]}
                      >
                        {shiftOption}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.chipWrap}>
                {STAFF_STATUSES.map((statusOption) => {
                  const active = formState.status === statusOption;
                  return (
                    <TouchableOpacity
                      key={statusOption}
                      style={[
                        styles.optionChip,
                        active && styles.optionChipSelected,
                      ]}
                      onPress={() =>
                        setFormState((prev) => ({
                          ...prev,
                          status: statusOption,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          active && styles.optionChipTextSelected,
                        ]}
                      >
                        {statusOption}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Joined Date</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 15 Jan 2025"
                placeholderTextColor={Palette.textMuted}
                value={formState.joinedDate}
                onChangeText={(value) =>
                  setFormState((prev) => ({ ...prev, joinedDate: value }))
                }
              />

              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                placeholder="Duty areas, ID verification, emergency info..."
                placeholderTextColor={Palette.textMuted}
                multiline
                value={formState.notes}
                onChangeText={(value) =>
                  setFormState((prev) => ({ ...prev, notes: value }))
                }
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closeFormModal}
                disabled={isSavingForm}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalPrimaryBtn,
                  isSavingForm && styles.btnDisabled,
                ]}
                onPress={handleSaveStaff}
                disabled={isSavingForm}
              >
                <Text style={styles.modalPrimaryText}>
                  {isSavingForm
                    ? 'Saving...'
                    : editingStaff
                    ? 'Save Changes'
                    : 'Add Staff'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Pay Salary Modal */}
      <Modal
        visible={Boolean(payingStaff)}
        transparent
        animationType="fade"
        onRequestClose={closePayModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pay Staff Salary</Text>
              <TouchableOpacity
                onPress={closePayModal}
                disabled={isPaying}
                accessibilityRole="button"
                accessibilityLabel="Close salary modal"
              >
                <Feather
                  name="x"
                  size={Typography.iconSize.base}
                  color={Palette.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              style={{ maxHeight: 420 }}
            >
              {payingStaff ? (
                <View style={styles.modalBody}>
                  {payError ? (
                    <View style={styles.modalErrorBanner}>
                      <Feather
                        name="alert-circle"
                        size={Typography.iconSize.sm}
                        color={Palette.status.overdue.text}
                      />
                      <Text style={styles.modalErrorText}>{payError}</Text>
                    </View>
                  ) : null}

                  <View style={styles.paySummaryBox}>
                    <Text style={styles.payStaffName}>{payingStaff.name}</Text>
                    <Text style={styles.payStaffMeta}>
                      {payingStaff.role} · {payingStaff.shift}
                    </Text>
                    <Text style={styles.payStaffMeta}>
                      Regular Salary:{' '}
                      {payingStaff.salary ||
                        formatRupeeAmount(payingStaff.numericSalary)}
                      {payingStaff.lastPaidDate
                        ? ` · Last paid ${payingStaff.lastPaidDate}`
                        : ''}
                    </Text>
                  </View>

                  <Text style={styles.fieldLabel}>Payout Amount (₹) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter salary amount"
                    placeholderTextColor={Palette.textMuted}
                    keyboardType="numeric"
                    value={payAmountInput}
                    onChangeText={setPayAmountInput}
                  />

                  <Text style={styles.helperCopy}>
                    Confirming records an expense under Accounts and Reports for
                    today ({formatShortDate(new Date())}) and updates this staff
                    member&apos;s last paid date.
                  </Text>
                </View>
              ) : null}

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={closePayModal}
                  disabled={isPaying}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, isPaying && styles.btnDisabled]}
                  onPress={handleConfirmPay}
                  disabled={isPaying}
                >
                  <Text style={styles.modalPrimaryText}>
                    {isPaying ? 'Recording...' : 'Confirm Payment'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={Boolean(deletingStaff)}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Remove Staff Member</Text>
              <TouchableOpacity
                onPress={closeDeleteModal}
                disabled={isDeleting}
                accessibilityRole="button"
                accessibilityLabel="Close remove confirmation"
              >
                <Feather
                  name="x"
                  size={Typography.iconSize.base}
                  color={Palette.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {deleteError ? (
                <View style={styles.modalErrorBanner}>
                  <Feather
                    name="alert-circle"
                    size={Typography.iconSize.sm}
                    color={Palette.status.overdue.text}
                  />
                  <Text style={styles.modalErrorText}>{deleteError}</Text>
                </View>
              ) : null}

              <Text style={styles.deleteConfirmText}>
                Remove{' '}
                <Text style={styles.deleteHighlight}>
                  {deletingStaff?.name}
                </Text>{' '}
                ({deletingStaff?.role}) from your staff directory? Past salary
                records in Accounts will remain intact.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closeDeleteModal}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalDangerBtn,
                  isDeleting && styles.btnDisabled,
                ]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
              >
                <Text style={styles.modalPrimaryText}>
                  {isDeleting ? 'Removing...' : 'Remove Staff'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: {
    flex: 1,
  },
  pageTitle: {
    fontFamily: Typography.fontFamily.serif,
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Palette.text,
  },
  pageSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
  },
  addButtonText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  noticeBannerSuccess: {
    backgroundColor: Palette.status.paid.bg,
    borderColor: Palette.border,
  },
  noticeBannerError: {
    backgroundColor: Palette.status.overdue.bg,
    borderColor: Palette.status.overdue.bg,
  },
  noticeText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    fontWeight: '500',
  },
  noticeTextSuccess: {
    color: Palette.status.paid.text,
  },
  noticeTextError: {
    color: Palette.status.overdue.text,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    padding: 14,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Palette.text,
    marginTop: 2,
  },
  summaryHint: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textMuted,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterPillSelected: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterPillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  filterPillTextSelected: {
    color: Palette.onPrimary,
  },
  listContainer: {
    gap: 12,
  },
  staffCard: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    padding: 14,
    gap: 10,
  },
  staffTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  staffIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.primary,
  },
  staffNameBlock: {
    flex: 1,
  },
  staffName: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
  },
  roleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  staffRole: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  statusBadgeActive: {
    backgroundColor: Palette.status.active.bg,
  },
  statusBadgeLeave: {
    backgroundColor: Palette.status.pending.bg,
  },
  statusBadgeText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
  },
  statusBadgeTextActive: {
    color: Palette.status.active.text,
  },
  statusBadgeTextLeave: {
    color: Palette.status.pending.text,
  },
  salaryBox: {
    alignItems: 'flex-end',
  },
  salaryAmount: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.accentText,
  },
  salaryUnit: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textMuted,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    rowGap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: '45%',
  },
  metaText: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
  },
  notesText: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    backgroundColor: Palette.tint,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.divider,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.background,
  },
  secondaryActionText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Palette.text,
  },
  paySalaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.primary,
  },
  paySalaryChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Palette.onPrimary,
  },
  iconActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  emptyPrimaryBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.pill,
  },
  emptyPrimaryBtnText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  emptySecondaryBtn: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.pill,
  },
  emptySecondaryBtnText: {
    color: Palette.accentText,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: Palette.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '88%',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  modalTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
  },
  modalBodyScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.status.overdue.bg,
    borderWidth: 1,
    borderColor: Palette.status.overdue.bg,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  modalErrorText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Palette.status.overdue.text,
    fontWeight: '500',
  },
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  optionChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  optionChipSelected: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  optionChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '500',
    color: Palette.textSecondary,
  },
  optionChipTextSelected: {
    color: Palette.onPrimary,
  },
  paySummaryBox: {
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    padding: 12,
    gap: 3,
  },
  payStaffName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  payStaffMeta: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
  },
  helperCopy: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textMuted,
    lineHeight: 18,
  },
  deleteConfirmText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    lineHeight: 20,
  },
  deleteHighlight: {
    fontWeight: '700',
    color: Palette.text,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.background,
  },
  modalCancelText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  modalPrimaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.sm,
    backgroundColor: Palette.primary,
  },
  modalDangerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.sm,
    backgroundColor: Palette.status.overdue.text,
  },
  modalPrimaryText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.onPrimary,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
