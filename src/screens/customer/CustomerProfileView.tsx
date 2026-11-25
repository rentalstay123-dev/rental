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
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { auth, getFirebaseAuthErrorMessage } from '../../config/firebase';
import { Palette, Typography } from '../../constants/theme';
import { useCustomerData } from '../../context/CustomerDataContext';

interface CustomerProfileViewProps {
  onBack?: () => void;
  showBackButton?: boolean;
  onLogout?: () => void;
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
  if (parts.length === 0) return 'RS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

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

export default function CustomerProfileView({
  onBack,
  showBackButton = false,
  onLogout,
}: CustomerProfileViewProps) {
  const { data, updateCustomerProfile, refreshWorkspace } = useCustomerData();
  const { profile, room } = data;

  const [refreshing, setRefreshing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit Profile Modal
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [draftName, setDraftName] = useState(profile.fullName);
  const [draftPhone, setDraftPhone] = useState(profile.phone);
  const [draftEmergencyName, setDraftEmergencyName] = useState(profile.emergencyContactName);
  const [draftEmergencyPhone, setDraftEmergencyPhone] = useState(profile.emergencyContactPhone);

  // Change Password Modal
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Logout Confirm Modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const openEditProfileModal = () => {
    setDraftName(profile.fullName);
    setDraftPhone(profile.phone);
    setDraftEmergencyName(profile.emergencyContactName);
    setDraftEmergencyPhone(profile.emergencyContactPhone);
    setModalError(null);
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!draftName.trim() || !draftPhone.trim()) {
      setModalError('Full name and phone number are required.');
      return;
    }
    const nextName = draftName.trim();
    if (auth.currentUser && nextName !== auth.currentUser.displayName) {
      try {
        await updateProfile(auth.currentUser, { displayName: nextName });
      } catch (error) {
        setModalError(getFirebaseAuthErrorMessage(error, 'Could not update profile name.'));
        return;
      }
    }
    setModalError(null);
    setShowEditProfile(false);
    void updateCustomerProfile({
      fullName: nextName,
      phone: draftPhone.trim(),
      emergencyContactName: draftEmergencyName.trim() || profile.emergencyContactName,
      emergencyContactPhone: draftEmergencyPhone.trim() || profile.emergencyContactPhone,
    });
  };

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setModalError(null);
    setShowChangePassword(true);
  };

  const handleSavePassword = async () => {
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

    const user = auth.currentUser;
    if (!user || !user.email) {
      setModalError('No signed-in email account found.');
      return;
    }

    setModalError(null);
    setIsUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setShowChangePassword(false);
    } catch (error) {
      setModalError(getFirebaseAuthErrorMessage(error, 'Could not update password.'));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const personalRows: {
    key: string;
    icon: keyof typeof Feather.glyphMap;
    label: string;
    value: string;
  }[] = [
    { key: 'name', icon: 'user', label: 'Full Name', value: profile.fullName },
    { key: 'email', icon: 'mail', label: 'Email Address', value: profile.email },
    { key: 'phone', icon: 'phone', label: 'Phone Number', value: profile.phone },
    {
      key: 'emergency',
      icon: 'alert-circle',
      label: 'Emergency Contact',
      value: `${profile.emergencyContactName} · ${profile.emergencyContactPhone}`,
    },
    {
      key: 'room',
      icon: 'map-pin',
      label: 'Unit & Property',
      value: `${room.roomNumber} · ${profile.propertyName}`,
    },
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
            <Text style={styles.headerTitle}>Profile</Text>
          </View>

          {/* Identity Summary Card */}
          <View style={styles.heroCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{getInitials(profile.fullName)}</Text>
            </View>

            <View style={styles.heroTextCol}>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {profile.fullName}
                </Text>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>Resident</Text>
                </View>
              </View>
              <Text style={styles.heroSub} numberOfLines={1}>
                {room.roomNumber} · {profile.propertyName}
              </Text>
              <Text style={styles.heroEmail} numberOfLines={1}>
                {profile.email}
              </Text>
            </View>
          </View>

          {/* Personal Details Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>PERSONAL DETAILS</Text>
              <TouchableOpacity onPress={openEditProfileModal} activeOpacity={0.7}>
                <Text style={styles.sectionActionText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {personalRows.map((item, idx) => (
              <React.Fragment key={item.key}>
                <View style={styles.detailRow}>
                  <View style={styles.iconTile}>
                    <Feather name={item.icon} size={16} color={Palette.primary} />
                  </View>
                  <View style={styles.detailTextCol}>
                    <Text style={styles.detailLabel}>{item.label}</Text>
                    <Text style={styles.detailValue}>{item.value}</Text>
                  </View>
                </View>
                {idx < personalRows.length - 1 ? <View style={styles.divider} /> : null}
              </React.Fragment>
            ))}
          </View>

          {/* Preferences & Security Card */}
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionHeader, styles.sectionHeaderStandalone]}>
              PREFERENCES & SECURITY
            </Text>

            <View style={styles.preferenceRow}>
              <View style={styles.iconTile}>
                <Feather name="bell" size={16} color={Palette.primary} />
              </View>
              <View style={styles.preferenceTextCol}>
                <Text style={styles.preferenceTitle}>Rent & Notice Alerts</Text>
                <Text style={styles.preferenceSub}>
                  Receive due date reminders and maintenance updates
                </Text>
              </View>
              <Switch
                value={profile.alertsEnabled}
                onValueChange={(next) => void updateCustomerProfile({ alertsEnabled: next })}
                trackColor={{ false: Palette.border, true: Palette.primary }}
                thumbColor={Palette.surface}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.preferenceRow}
              onPress={openPasswordModal}
              activeOpacity={0.7}
            >
              <View style={styles.iconTile}>
                <Feather name="key" size={16} color={Palette.primary} />
              </View>
              <View style={styles.preferenceTextCol}>
                <Text style={styles.preferenceTitle}>Change Password</Text>
                <Text style={styles.preferenceSub}>Update your account login credentials</Text>
              </View>
              <Feather
                name="chevron-right"
                size={Typography.iconSize.base}
                color={Palette.primary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setShowLogoutConfirm(true)}
            activeOpacity={0.85}
          >
            <Feather
              name="log-out"
              size={Typography.iconSize.base}
              color={Palette.onPrimary}
            />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <ProfileModalSheet
        visible={showEditProfile}
        title="Edit Personal Details"
        onClose={() => setShowEditProfile(false)}
        errorText={modalError}
      >
        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          style={styles.inputField}
          value={draftName}
          onChangeText={(val) => {
            setDraftName(val);
            if (modalError) setModalError(null);
          }}
          placeholder="Your full name"
          placeholderTextColor={Palette.textMuted}
        />

        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={styles.inputField}
          value={draftPhone}
          onChangeText={(val) => {
            setDraftPhone(val);
            if (modalError) setModalError(null);
          }}
          keyboardType="phone-pad"
          placeholder="+91 98765 43210"
          placeholderTextColor={Palette.textMuted}
        />

        <Text style={styles.inputLabel}>Emergency Contact Name</Text>
        <TextInput
          style={styles.inputField}
          value={draftEmergencyName}
          onChangeText={setDraftEmergencyName}
          placeholder="Contact person"
          placeholderTextColor={Palette.textMuted}
        />

        <Text style={styles.inputLabel}>Emergency Contact Phone</Text>
        <TextInput
          style={styles.inputField}
          value={draftEmergencyPhone}
          onChangeText={setDraftEmergencyPhone}
          keyboardType="phone-pad"
          placeholder="+91 98765 67890"
          placeholderTextColor={Palette.textMuted}
        />

        <TouchableOpacity
          style={styles.modalPrimaryBtn}
          onPress={() => void handleSaveProfile()}
          activeOpacity={0.85}
        >
          <Text style={styles.modalPrimaryBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </ProfileModalSheet>

      {/* Change Password Modal */}
      <ProfileModalSheet
        visible={showChangePassword}
        title="Change Password"
        onClose={() => {
          if (!isUpdatingPassword) setShowChangePassword(false);
        }}
        errorText={modalError}
      >
        <Text style={styles.inputLabel}>Current Password</Text>
        <TextInput
          style={styles.inputField}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="Enter current password"
          placeholderTextColor={Palette.textMuted}
        />

        <Text style={styles.inputLabel}>New Password</Text>
        <TextInput
          style={styles.inputField}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="Minimum 6 characters"
          placeholderTextColor={Palette.textMuted}
        />

        <Text style={styles.inputLabel}>Confirm New Password</Text>
        <TextInput
          style={styles.inputField}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Re-enter new password"
          placeholderTextColor={Palette.textMuted}
        />

        <TouchableOpacity
          style={[styles.modalPrimaryBtn, isUpdatingPassword && { opacity: 0.7 }]}
          onPress={() => void handleSavePassword()}
          disabled={isUpdatingPassword}
          activeOpacity={0.85}
        >
          {isUpdatingPassword ? (
            <ActivityIndicator color={Palette.onPrimary} size="small" />
          ) : (
            <Text style={styles.modalPrimaryBtnText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </ProfileModalSheet>

      {/* Logout Confirm Modal */}
      <ProfileModalSheet
        visible={showLogoutConfirm}
        title="Sign Out"
        onClose={() => setShowLogoutConfirm(false)}
      >
        <Text style={styles.confirmBody}>
          Are you sure you want to sign out from your resident portal?
        </Text>
        <View style={styles.confirmBtnRow}>
          <TouchableOpacity
            style={styles.confirmCancelBtn}
            onPress={() => setShowLogoutConfirm(false)}
          >
            <Text style={styles.confirmCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmLogoutBtn}
            onPress={() => {
              setShowLogoutConfirm(false);
              onLogout?.();
            }}
          >
            <Text style={styles.confirmLogoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ProfileModalSheet>
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
    fontSize: Typography.fontSize.xxl,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.3,
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
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitials: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Palette.primary,
  },
  heroTextCol: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  heroName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Palette.text,
    flexShrink: 1,
  },
  rolePill: {
    paddingVertical: 1,
  },
  rolePillText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.primary,
  },
  heroSub: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  heroEmail: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textMuted,
    marginTop: 2,
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
