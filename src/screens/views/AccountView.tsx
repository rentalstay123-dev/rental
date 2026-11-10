import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../../constants/theme';

interface ProfileViewProps {
  onBack?: () => void;
  onLogout?: () => void;
  userEmail?: string;
}

interface ProfileModalSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  errorText?: string | null;
  children: React.ReactNode;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OW';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function maskAccountNumber(accountNumber: string): string {
  const digits = accountNumber.replace(/\s+/g, '');
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

/** Shared modal container used across Profile edit, bank, password, and logout sheets. */
function ProfileModalSheet({
  visible,
  title,
  onClose,
  errorText,
  children,
}: ProfileModalSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Close ${title}`}
            >
              <Feather name="x" size={Typography.iconSize.base} color={Palette.textSecondary} />
            </TouchableOpacity>
          </View>

          {errorText ? (
            <View style={styles.modalErrorBanner}>
              <Text style={styles.modalErrorText}>{errorText}</Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ProfileView({ onBack, onLogout, userEmail }: ProfileViewProps) {
  const [fullName, setFullName] = useState('Rajesh Sharma');
  const [email, setEmail] = useState(userEmail || 'rajesh.owner@luvora.in');
  const [phone, setPhone] = useState('+91 98450 12345');
  const [propertyName, setPropertyName] = useState('Sunrise Apartments, Mangalore');

  const [bankName, setBankName] = useState('HDFC Bank');
  const [accountHolder, setAccountHolder] = useState('Rajesh Sharma');
  const [accountNumber, setAccountNumber] = useState('50100234894590');
  const [ifscCode, setIfscCode] = useState('HDFC0001234');

  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const [modalError, setModalError] = useState<string | null>(null);

  // Edit Profile modal state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [draftName, setDraftName] = useState(fullName);
  const [draftEmail, setDraftEmail] = useState(email);
  const [draftPhone, setDraftPhone] = useState(phone);
  const [draftProperty, setDraftProperty] = useState(propertyName);

  // Edit Bank modal state
  const [showEditBank, setShowEditBank] = useState(false);
  const [draftBankName, setDraftBankName] = useState(bankName);
  const [draftAccountHolder, setDraftAccountHolder] = useState(accountHolder);
  const [draftAccountNumber, setDraftAccountNumber] = useState(accountNumber);
  const [draftIfsc, setDraftIfsc] = useState(ifscCode);

  // Change Password modal state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Logout confirm modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const openEditProfileModal = () => {
    setDraftName(fullName);
    setDraftEmail(email);
    setDraftPhone(phone);
    setDraftProperty(propertyName);
    setModalError(null);
    setShowEditProfile(true);
  };

  const handleSaveProfile = () => {
    if (!draftName.trim() || !draftEmail.trim() || !draftPhone.trim()) {
      setModalError('Name, email, and phone number are required.');
      return;
    }
    setFullName(draftName.trim());
    setEmail(draftEmail.trim());
    setPhone(draftPhone.trim());
    setPropertyName(draftProperty.trim() || 'Sunrise Apartments, Mangalore');
    setModalError(null);
    setShowEditProfile(false);
  };

  const openEditBankModal = () => {
    setDraftBankName(bankName);
    setDraftAccountHolder(accountHolder);
    setDraftAccountNumber(accountNumber);
    setDraftIfsc(ifscCode);
    setModalError(null);
    setShowEditBank(true);
  };

  const handleSaveBank = () => {
    const cleanAcct = draftAccountNumber.replace(/\s+/g, '');
    if (!draftBankName.trim() || !draftAccountHolder.trim() || cleanAcct.length < 6 || !draftIfsc.trim()) {
      setModalError('Please enter valid bank name, holder name, account number, and IFSC code.');
      return;
    }
    setBankName(draftBankName.trim());
    setAccountHolder(draftAccountHolder.trim());
    setAccountNumber(cleanAcct);
    setIfscCode(draftIfsc.trim().toUpperCase());
    setModalError(null);
    setShowEditBank(false);
  };

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setModalError(null);
    setShowChangePassword(true);
  };

  const handleSavePassword = () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setModalError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setModalError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setModalError('New password and confirmation do not match.');
      return;
    }
    setModalError(null);
    setShowChangePassword(false);
  };

  const personalRows: {
    key: string;
    icon: keyof typeof Feather.glyphMap;
    label: string;
    value: string;
  }[] = [
    { key: 'name', icon: 'user', label: 'Full Name', value: fullName },
    { key: 'email', icon: 'mail', label: 'Email Address', value: email },
    { key: 'phone', icon: 'phone', label: 'Phone Number', value: phone },
    { key: 'property', icon: 'map-pin', label: 'Property', value: propertyName },
  ];

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
              accessibilityLabel="Back to Home"
            >
              <Feather name="chevron-left" size={Typography.iconSize.base} color={Palette.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>

          {/* Identity Summary Card */}
          <View style={styles.heroCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{getInitials(fullName)}</Text>
            </View>

            <View style={styles.heroTextCol}>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {fullName}
                </Text>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>Owner</Text>
                </View>
              </View>
              <Text style={styles.heroSub} numberOfLines={1}>
                {propertyName}
              </Text>
              <Text style={styles.heroEmail} numberOfLines={1}>
                {email}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editIconButton}
              activeOpacity={0.75}
              onPress={openEditProfileModal}
              accessibilityRole="button"
              accessibilityLabel="Edit profile details"
            >
              <Feather name="edit-2" size={Typography.iconSize.sm} color={Palette.primary} />
            </TouchableOpacity>
          </View>

          {/* Personal Details Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>PERSONAL DETAILS</Text>
              <TouchableOpacity
                onPress={openEditProfileModal}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.sectionActionText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {personalRows.map((row, index) => (
              <React.Fragment key={row.key}>
                <View style={styles.detailRow}>
                  <View style={styles.iconTile}>
                    <Feather name={row.icon} size={Typography.iconSize.sm} color={Palette.primary} />
                  </View>
                  <View style={styles.detailTextCol}>
                    <Text style={styles.detailLabel}>{row.label}</Text>
                    <Text style={styles.detailValue}>{row.value}</Text>
                  </View>
                </View>
                {index < personalRows.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>

          {/* Payout Bank Account Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>PAYOUT BANK ACCOUNT</Text>
              <TouchableOpacity
                onPress={openEditBankModal}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.sectionActionText}>Update</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bankRow}>
              <View style={styles.iconTile}>
                <MaterialCommunityIcons name="bank" size={Typography.iconSize.sm} color={Palette.primary} />
              </View>
              <View style={styles.bankTextCol}>
                <View style={styles.bankTitleRow}>
                  <Text style={styles.bankName}>{bankName}</Text>
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Primary</Text>
                  </View>
                </View>
                <Text style={styles.bankMeta}>
                  {accountHolder} · A/C {maskAccountNumber(accountNumber)}
                </Text>
                <Text style={styles.bankIfsc}>IFSC {ifscCode}</Text>
              </View>
            </View>
          </View>

          {/* Security & Preferences Card */}
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionHeader, styles.sectionHeaderStandalone]}>
              SECURITY & PREFERENCES
            </Text>

            <View style={styles.preferenceRow}>
              <View style={styles.iconTile}>
                <Feather name="shield" size={Typography.iconSize.sm} color={Palette.primary} />
              </View>
              <View style={styles.preferenceTextCol}>
                <Text style={styles.preferenceTitle}>Biometric Lock</Text>
                <Text style={styles.preferenceSub}>Unlock app with Face ID or fingerprint</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ false: Palette.border, true: Palette.primary }}
                thumbColor={Palette.surface}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.preferenceRow}>
              <View style={styles.iconTile}>
                <Feather name="bell" size={Typography.iconSize.sm} color={Palette.primary} />
              </View>
              <View style={styles.preferenceTextCol}>
                <Text style={styles.preferenceTitle}>Payment Alerts</Text>
                <Text style={styles.preferenceSub}>SMS & WhatsApp collection updates</Text>
              </View>
              <Switch
                value={alertsEnabled}
                onValueChange={setAlertsEnabled}
                trackColor={{ false: Palette.border, true: Palette.primary }}
                thumbColor={Palette.surface}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.preferenceRow}
              activeOpacity={0.7}
              onPress={openPasswordModal}
              accessibilityRole="button"
              accessibilityLabel="Change Password"
            >
              <View style={styles.iconTile}>
                <Feather name="lock" size={Typography.iconSize.sm} color={Palette.primary} />
              </View>
              <View style={styles.preferenceTextCol}>
                <Text style={styles.preferenceTitle}>Change Password</Text>
                <Text style={styles.preferenceSub}>Update account login password</Text>
              </View>
              <Feather name="chevron-right" size={Typography.iconSize.base} color={Palette.primary} />
            </TouchableOpacity>
          </View>

          {/* Log Out Action */}
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.85}
            onPress={() => setShowLogoutConfirm(true)}
            accessibilityRole="button"
            accessibilityLabel="Log Out"
          >
            <Feather name="log-out" size={Typography.iconSize.sm} color={Palette.onPrimary} />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <ProfileModalSheet
        visible={showEditProfile}
        title="Edit Profile"
        onClose={() => setShowEditProfile(false)}
        errorText={modalError}
      >
        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          style={styles.inputField}
          value={draftName}
          onChangeText={setDraftName}
          placeholder="Enter full name"
          placeholderTextColor={Palette.textMuted}
        />

        <Text style={styles.inputLabel}>Email Address</Text>
        <TextInput
          style={styles.inputField}
          value={draftEmail}
          onChangeText={setDraftEmail}
          placeholder="Enter email address"
          placeholderTextColor={Palette.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={styles.inputField}
          value={draftPhone}
          onChangeText={setDraftPhone}
          placeholder="Enter phone number"
          placeholderTextColor={Palette.textMuted}
          keyboardType="phone-pad"
        />

        <Text style={styles.inputLabel}>Property Name & Location</Text>
        <TextInput
          style={styles.inputField}
          value={draftProperty}
          onChangeText={setDraftProperty}
          placeholder="e.g. Sunrise Apartments, Mangalore"
          placeholderTextColor={Palette.textMuted}
        />

        <TouchableOpacity
          style={styles.modalPrimaryBtn}
          activeOpacity={0.85}
          onPress={handleSaveProfile}
        >
          <Text style={styles.modalPrimaryBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </ProfileModalSheet>

      {/* Update Bank Account Modal */}
      <ProfileModalSheet
        visible={showEditBank}
        title="Update Payout Bank"
        onClose={() => setShowEditBank(false)}
        errorText={modalError}
      >
        <Text style={styles.inputLabel}>Bank Name</Text>
        <TextInput
          style={styles.inputField}
          value={draftBankName}
          onChangeText={setDraftBankName}
          placeholder="e.g. HDFC Bank"
          placeholderTextColor={Palette.textMuted}
        />

        <Text style={styles.inputLabel}>Account Holder Name</Text>
        <TextInput
          style={styles.inputField}
          value={draftAccountHolder}
          onChangeText={setDraftAccountHolder}
          placeholder="Enter account holder name"
          placeholderTextColor={Palette.textMuted}
        />

        <Text style={styles.inputLabel}>Account Number</Text>
        <TextInput
          style={styles.inputField}
          value={draftAccountNumber}
          onChangeText={setDraftAccountNumber}
          placeholder="Enter account number"
          placeholderTextColor={Palette.textMuted}
          keyboardType="numeric"
        />

        <Text style={styles.inputLabel}>IFSC Code</Text>
        <TextInput
          style={styles.inputField}
          value={draftIfsc}
          onChangeText={setDraftIfsc}
          placeholder="e.g. HDFC0001234"
          placeholderTextColor={Palette.textMuted}
          autoCapitalize="characters"
        />

        <TouchableOpacity
          style={styles.modalPrimaryBtn}
          activeOpacity={0.85}
          onPress={handleSaveBank}
        >
          <Text style={styles.modalPrimaryBtnText}>Save Bank Details</Text>
        </TouchableOpacity>
      </ProfileModalSheet>

      {/* Change Password Modal */}
      <ProfileModalSheet
        visible={showChangePassword}
        title="Change Password"
        onClose={() => setShowChangePassword(false)}
        errorText={modalError}
      >
        <Text style={styles.inputLabel}>Current Password</Text>
        <TextInput
          style={styles.inputField}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
          placeholderTextColor={Palette.textMuted}
          secureTextEntry
        />

        <Text style={styles.inputLabel}>New Password</Text>
        <TextInput
          style={styles.inputField}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Minimum 6 characters"
          placeholderTextColor={Palette.textMuted}
          secureTextEntry
        />

        <Text style={styles.inputLabel}>Confirm New Password</Text>
        <TextInput
          style={styles.inputField}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          placeholderTextColor={Palette.textMuted}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.modalPrimaryBtn}
          activeOpacity={0.85}
          onPress={handleSavePassword}
        >
          <Text style={styles.modalPrimaryBtnText}>Update Password</Text>
        </TouchableOpacity>
      </ProfileModalSheet>

      {/* Confirm Log Out Modal */}
      <ProfileModalSheet
        visible={showLogoutConfirm}
        title="Log Out"
        onClose={() => setShowLogoutConfirm(false)}
      >
        <Text style={styles.confirmBody}>
          Are you sure you want to log out of your Luvora owner profile?
        </Text>
        <View style={styles.confirmBtnRow}>
          <TouchableOpacity
            style={styles.confirmCancelBtn}
            activeOpacity={0.75}
            onPress={() => setShowLogoutConfirm(false)}
          >
            <Text style={styles.confirmCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmLogoutBtn}
            activeOpacity={0.85}
            onPress={() => {
              setShowLogoutConfirm(false);
              onLogout?.();
            }}
          >
            <Text style={styles.confirmLogoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ProfileModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  outerScreen: {
    flex: 1,
    minHeight: 0,
    backgroundColor: Palette.background,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
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
    marginBottom: 16,
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
    letterSpacing: 0.2,
    fontFamily: Typography.fontFamily.serif,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 5,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: Radius.pill,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitials: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Palette.onPrimary,
  },
  heroTextCol: {
    flex: 1,
    marginRight: 8,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  heroName: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    flexShrink: 1,
  },
  rolePill: {
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  rolePillText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.accentText,
  },
  heroSub: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    marginBottom: 2,
  },
  heroEmail: {
    fontSize: Typography.fontSize.caption,
    color: Palette.accentText,
    fontWeight: '600',
  },
  editIconButton: {
    width: 36,
    height: 36,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.accentText,
    letterSpacing: 0.8,
  },
  sectionHeaderStandalone: {
    marginBottom: 10,
  },
  sectionActionText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.primary,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailTextCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginBottom: 1,
  },
  detailValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Palette.text,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.divider,
    marginVertical: 4,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankTextCol: {
    flex: 1,
  },
  bankTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  bankName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  primaryBadge: {
    backgroundColor: Palette.status.active.bg,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  primaryBadgeText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.status.active.text,
  },
  bankMeta: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    marginBottom: 2,
  },
  bankIfsc: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textMuted,
    fontWeight: '600',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  preferenceTextCol: {
    flex: 1,
    marginRight: 10,
  },
  preferenceTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 1,
  },
  preferenceSub: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    borderRadius: 5,
    paddingVertical: 13,
    marginTop: 4,
  },
  logoutButtonText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
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
    maxHeight: '86%',
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
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
  modalErrorBanner: {
    backgroundColor: Palette.status.overdue.bg,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  modalErrorText: {
    color: Palette.status.overdue.text,
    fontSize: Typography.fontSize.caption,
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
  modalPrimaryBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 5,
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
  confirmBody: {
    fontSize: Typography.fontSize.base,
    color: Palette.textSecondary,
    lineHeight: Typography.lineHeight.base,
    marginBottom: 18,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmCancelText: {
    color: Palette.text,
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
  },
  confirmLogoutBtn: {
    flex: 1,
    backgroundColor: Palette.primary,
    borderRadius: 5,
    paddingVertical: 11,
    alignItems: 'center',
  },
  confirmLogoutText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
});
