import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getSupabaseAuthErrorMessage } from '../config/supabase';
import {
  fetchUserRole,
  initializeCustomerProfile,
  initializeRegisteredUserProfile,
} from '../services/supabaseService';
import type { UserRole } from '../types/appData';
import LuvoraLogo from '../components/LuvoraLogo';
import { Palette, Radius, Typography } from '../constants/theme';

interface LoginScreenProps {
  onAuthHoldChange?: (holding: boolean) => void;
  onLoginSuccess?: (user: { uid: string; email: string; displayName?: string; role: UserRole }) => void;
}

export default function LoginScreen({ onAuthHoldChange, onLoginSuccess }: LoginScreenProps) {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Modals for Forgot Password and Registration
  const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [regRole, setRegRole] = useState<UserRole>('owner');
  const [forgotEmail, setForgotEmail] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regProperty, setRegProperty] = useState('');
  const [regRoomNumber, setRegRoomNumber] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const resolveAccountRole = async (uid: string): Promise<UserRole> => {
    try {
      const remoteRole = await fetchUserRole(uid);
      if (remoteRole) return remoteRole;
    } catch {
      // Fallback to local cache when offline
    }
    try {
      const cached = await AsyncStorage.getItem(`@luvora_role_${uid}`);
      if (cached === 'owner' || cached === 'customer' || cached === 'admin') {
        return cached === 'admin' ? 'owner' : (cached as UserRole);
      }
    } catch {
      // Ignore storage read errors
    }
    throw new Error('Your account role is not available. Please contact support.');
  };

  const handleSignIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setAuthError('Please enter your email and password.');
      return;
    }

    setAuthError(null);
    setAuthSuccess(null);
    setIsLoading(true);
    onAuthHoldChange?.(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Authentication failed. No user record returned.');
      }

      const uid = data.user.id;
      const finalRole = await resolveAccountRole(uid);

      try {
        await AsyncStorage.setItem(`@luvora_role_${uid}`, finalRole);
      } catch {
        // Ignore storage error
      }

      const metaName =
        (data.user.user_metadata?.displayName as string | undefined) ||
        (data.user.user_metadata?.full_name as string | undefined);

      onLoginSuccess?.({
        uid,
        email: data.user.email ?? trimmedEmail,
        displayName: metaName,
        role: finalRole,
      });
      onAuthHoldChange?.(false);
    } catch (error) {
      onAuthHoldChange?.(false);
      setAuthError(getSupabaseAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const closeForgotModal = () => {
    if (!isModalLoading) {
      setIsForgotModalVisible(false);
    }
  };

  const closeRegisterModal = () => {
    if (!isModalLoading) {
      setIsRegisterModalVisible(false);
    }
  };

  const openForgotModal = () => {
    setForgotEmail(email.trim());
    setModalError(null);
    setIsForgotModalVisible(true);
  };

  const openRegisterModal = () => {
    setModalError(null);
    setIsRegisterModalVisible(true);
  };

  const handleSendResetEmail = async () => {
    const trimmedEmail = forgotEmail.trim();
    if (!trimmedEmail) {
      setModalError('Please enter your registered email address.');
      return;
    }

    setModalError(null);
    setIsModalLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (error) throw error;
      setIsForgotModalVisible(false);
      setAuthError(null);
      setAuthSuccess(
        `Password reset instructions sent to ${trimmedEmail}. Check your inbox or spam folder.`
      );
      if (Platform.OS !== 'web') {
        Alert.alert(
          'Reset Link Sent',
          `Password reset instructions have been dispatched to ${trimmedEmail}.`
        );
      }
    } catch (error) {
      setModalError(getSupabaseAuthErrorMessage(error, 'Could not send reset email.'));
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim();

    if (!trimmedName || !trimmedEmail || !regPassword) {
      setModalError('Please fill in your name, email, and password.');
      return;
    }
    if (regPassword.length < 6) {
      setModalError('Password must be at least 6 characters long.');
      return;
    }

    setModalError(null);
    setIsModalLoading(true);
    onAuthHoldChange?.(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: regPassword,
        options: {
          data: {
            displayName: trimmedName,
            role: regRole,
            propertyName: regProperty.trim(),
            roomNumber: regRoomNumber.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      const user = data.user;
      if (!user) {
        throw new Error('Registration failed. Please check your credentials.');
      }

      if (!data.session) {
        throw new Error('Registration succeeded, but email confirmation is required before you can sign in.');
      }

      const uid = user.id;
      if (regRole === 'customer') {
        await initializeCustomerProfile(uid, {
          email: user.email ?? trimmedEmail,
          fullName: trimmedName,
          roomNumber: regRoomNumber.trim(),
          propertyName: regProperty.trim(),
        });
      } else {
        await initializeRegisteredUserProfile(uid, {
          email: user.email ?? trimmedEmail,
          fullName: trimmedName,
          propertyName: regProperty.trim(),
        });
      }
      setIsRegisterModalVisible(false);
      onLoginSuccess?.({
        uid,
        email: user.email ?? trimmedEmail,
        displayName: trimmedName,
        role: regRole,
      });
      onAuthHoldChange?.(false);
    } catch (error) {
      onAuthHoldChange?.(false);
      setModalError(getSupabaseAuthErrorMessage(error, 'Could not create account.'));
    } finally {
      setIsModalLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Brand Header */}
          <View style={styles.headerSection}>
            <LuvoraLogo size={120} />
          </View>

          {/* Form Card */}
          <View style={styles.cardContainer}>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to your Luvora account</Text>

            {authError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{authError}</Text>
              </View>
            ) : null}

            {authSuccess ? (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>{authSuccess}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email address</Text>
              <View
                style={[
                  styles.inputContainer,
                  isEmailFocused && styles.inputContainerFocused,
                ]}
              >
                <Feather
                  name="mail"
                  size={Typography.iconSize.base}
                  color={Palette.primary}
                  style={styles.leftIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email address"
                  placeholderTextColor={Palette.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Email address"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (authError) setAuthError(null);
                  }}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                />
              </View>
            </View>

            {/* Password Field & Recovery Link */}
            <View style={styles.passwordGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  isPasswordFocused && styles.inputContainerFocused,
                ]}
              >
                <Feather
                  name="lock"
                  size={Typography.iconSize.base}
                  color={Palette.primary}
                  style={styles.leftIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor={Palette.textMuted}
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Password"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (authError) setAuthError(null);
                  }}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                >
                  <Feather
                    name={isPasswordVisible ? 'eye-off' : 'eye'}
                    size={Typography.iconSize.base}
                    color={Palette.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link grouped directly under password input */}
              <TouchableOpacity
                onPress={openForgotModal}
                style={styles.forgotPasswordButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
              onPress={handleSignIn}
              activeOpacity={0.88}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              {isLoading ? (
                <ActivityIndicator color={Palette.surface} size="small" />
              ) : (
                <View style={styles.signInButtonContent}>
                  <Text style={styles.signInButtonText}>Sign in</Text>
                  <Feather
                    name="arrow-right"
                    size={Typography.iconSize.base}
                    color={Palette.surface}
                    style={styles.signInButtonArrow}
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Don't have an account? Create account */}
            <View style={styles.createAccountRow}>
              <Text style={styles.noAccountText}>{"Don't have an account? "}</Text>
              <TouchableOpacity onPress={openRegisterModal} activeOpacity={0.7}>
                <Text style={styles.createAccountText}>Create account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={isForgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeForgotModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={closeForgotModal}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={closeForgotModal} disabled={isModalLoading}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Enter your email address and we will send you password reset instructions.
            </Text>

            {modalError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{modalError}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Registered email</Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="Enter your registered email address"
              placeholderTextColor={Palette.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={forgotEmail}
              onChangeText={(value) => {
                setForgotEmail(value);
                if (modalError) setModalError(null);
              }}
            />

            <TouchableOpacity
              style={[styles.modalPrimaryBtn, isModalLoading && styles.signInButtonDisabled]}
              onPress={handleSendResetEmail}
              activeOpacity={0.85}
              disabled={isModalLoading}
            >
              {isModalLoading ? (
                <ActivityIndicator color={Palette.surface} size="small" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Registration Modal */}
      <Modal
        visible={isRegisterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRegisterModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={closeRegisterModal}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Create Account</Text>
              <TouchableOpacity onPress={closeRegisterModal} disabled={isModalLoading}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {regRole === 'customer'
                ? 'Register as a resident / customer on Luvora.'
                : 'Register as a property owner or manager on Luvora.'}
            </Text>

            <View style={styles.roleSwitchContainer}>
              {(['owner', 'customer'] as UserRole[]).map((roleOption) => {
                const isActive = regRole === roleOption;
                return (
                  <TouchableOpacity
                    key={roleOption}
                    style={[styles.roleSwitchTab, isActive && styles.roleSwitchTabActive]}
                    onPress={() => {
                      setRegRole(roleOption);
                      if (modalError) setModalError(null);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.roleSwitchText,
                        isActive && styles.roleSwitchTextActive,
                      ]}
                    >
                      {roleOption === 'owner' ? 'Owner / Admin' : 'Customer'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {modalError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{modalError}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="Enter your full name"
              placeholderTextColor={Palette.textMuted}
              value={regName}
              onChangeText={(value) => {
                setRegName(value);
                if (modalError) setModalError(null);
              }}
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="Enter your email address"
              placeholderTextColor={Palette.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={regEmail}
              onChangeText={(value) => {
                setRegEmail(value);
                if (modalError) setModalError(null);
              }}
            />

            {regRole === 'customer' ? (
              <>
                <Text style={styles.inputLabel}>Room Number</Text>
                <TextInput
                  style={styles.modalInputField}
                  placeholder="e.g. Room 102"
                  placeholderTextColor={Palette.textMuted}
                  value={regRoomNumber}
                  onChangeText={setRegRoomNumber}
                />
              </>
            ) : null}

            <Text style={styles.inputLabel}>
              {regRole === 'customer' ? 'Property Name (Optional)' : 'Primary Property Name'}
            </Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="e.g. Sunrise Apartments"
              placeholderTextColor={Palette.textMuted}
              value={regProperty}
              onChangeText={setRegProperty}
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="Minimum 6 characters"
              placeholderTextColor={Palette.textMuted}
              secureTextEntry
              value={regPassword}
              onChangeText={(value) => {
                setRegPassword(value);
                if (modalError) setModalError(null);
              }}
            />

            <TouchableOpacity
              style={[styles.modalPrimaryBtn, isModalLoading && styles.signInButtonDisabled]}
              onPress={handleRegisterSubmit}
              activeOpacity={0.85}
              disabled={isModalLoading}
            >
              {isModalLoading ? (
                <ActivityIndicator color={Palette.surface} size="small" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Register Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 22,
    paddingVertical: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  welcomeTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '800',
    color: Palette.text,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  roleSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: Palette.tint,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 4,
    marginBottom: 18,
  },
  roleSwitchTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleSwitchTabActive: {
    backgroundColor: Palette.primary,
  },
  roleSwitchText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  roleSwitchTextActive: {
    color: Palette.onPrimary,
  },
  welcomeSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  passwordGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    backgroundColor: Palette.surface,
    paddingHorizontal: 14,
  },
  inputContainerFocused: {
    borderColor: Palette.primary,
  },
  leftIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    paddingVertical: 0,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.primary,
  },
  signInButton: {
    height: 50,
    backgroundColor: Palette.primary,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButtonDisabled: {
    opacity: 0.75,
  },
  signInButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: Palette.surface,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    marginRight: 8,
  },
  signInButtonArrow: {
    marginTop: 1,
  },
  createAccountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  noAccountText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
  },
  createAccountText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Palette.backdrop,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 22,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Palette.text,
  },
  modalSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInputField: {
    height: 48,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    backgroundColor: Palette.surface,
    paddingHorizontal: 14,
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    marginBottom: 14,
  },
  errorBanner: {
    backgroundColor: Palette.status.overdue.bg,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    color: Palette.status.overdue.text,
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    lineHeight: 18,
  },
  successBanner: {
    backgroundColor: Palette.status.paid.bg,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  successBannerText: {
    color: Palette.status.paid.text,
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    lineHeight: 18,
  },
  modalPrimaryBtn: {
    backgroundColor: Palette.primary,
    borderRadius: Radius.sm,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    color: Palette.surface,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
  },
});
