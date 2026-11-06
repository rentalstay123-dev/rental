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
import LuvoraLogo from '../components/LuvoraLogo';
import { Palette } from '../constants/theme';

interface LoginScreenProps {
  onLoginSuccess?: (user: { email: string; role: string }) => void;
}

export const OWNER_CREDENTIALS = {
  email: 'owner@luvora.com',
  password: 'password123',
};

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('owner@luvora.com');
  const [password, setPassword] = useState('password123');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Modals for Forgot Password and Registration
  const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('owner@luvora.com');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regProperty, setRegProperty] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleSignIn = () => {
    if (!email.trim() || !password) {
      Alert.alert('Required Fields', 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (
        email.trim().toLowerCase() === OWNER_CREDENTIALS.email.toLowerCase() &&
        password === OWNER_CREDENTIALS.password
      ) {
        if (onLoginSuccess) {
          onLoginSuccess({ email: email.trim(), role: 'owner' });
        }
      } else {
        Alert.alert(
          'Invalid Credentials',
          'Demo Owner Credentials:\nID: ' + OWNER_CREDENTIALS.email + '\nPassword: ' + OWNER_CREDENTIALS.password,
          [
            {
              text: 'Auto-fill & Login',
              onPress: () => {
                setEmail(OWNER_CREDENTIALS.email);
                setPassword(OWNER_CREDENTIALS.password);
                if (onLoginSuccess) {
                  onLoginSuccess({ email: OWNER_CREDENTIALS.email, role: 'owner' });
                }
              },
            },
            { text: 'Try Again' },
          ]
        );
      }
    }, 600);
  };

  const handleSendResetEmail = () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Required', 'Please enter your registered email address.');
      return;
    }
    setIsForgotModalVisible(false);
    Alert.alert(
      'Reset Link Sent',
      `Password reset instructions have been dispatched to ${forgotEmail.trim()}.\n\nDemo Credentials:\nID: ${OWNER_CREDENTIALS.email}\nPassword: ${OWNER_CREDENTIALS.password}`
    );
  };

  const handleRegisterSubmit = () => {
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      Alert.alert('Required Fields', 'Please fill in your name, email, and password.');
      return;
    }
    setIsRegisterModalVisible(false);
    Alert.alert(
      'Account Created',
      `Welcome to Luvora, ${regName.trim()}! You can now log in using ${regEmail.trim()}.`
    );
    setEmail(regEmail.trim());
    setPassword(regPassword);
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
            <Text style={styles.welcomeSubtitle}>Sign in to manage your rental properties</Text>

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
                  size={18}
                  color={isEmailFocused ? Palette.primary : Palette.textSecondary}
                  style={styles.leftIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="you@example.com"
                  placeholderTextColor={Palette.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  isPasswordFocused && styles.inputContainerFocused,
                ]}
              >
                <Feather
                  name="lock"
                  size={18}
                  color={isPasswordFocused ? Palette.primary : Palette.textSecondary}
                  style={styles.leftIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor={Palette.textMuted}
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={isPasswordVisible ? 'eye-off' : 'eye'}
                    size={18}
                    color={Palette.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={() => setIsForgotModalVisible(true)}
              style={styles.forgotPasswordButton}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
              onPress={handleSignIn}
              activeOpacity={0.88}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Palette.surface} size="small" />
              ) : (
                <View style={styles.signInButtonContent}>
                  <Text style={styles.signInButtonText}>Sign in</Text>
                  <Feather
                    name="arrow-right"
                    size={18}
                    color={Palette.surface}
                    style={styles.signInButtonArrow}
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Don't have an account? Create account */}
            <View style={styles.createAccountRow}>
              <Text style={styles.noAccountText}>{"Don't have an account? "}</Text>
              <TouchableOpacity onPress={() => setIsRegisterModalVisible(true)} activeOpacity={0.7}>
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
        onRequestClose={() => setIsForgotModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsForgotModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={() => setIsForgotModalVisible(false)}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Enter your email address and we will send you password reset instructions.
            </Text>

            <Text style={styles.inputLabel}>Registered email</Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="you@example.com"
              placeholderTextColor={Palette.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={forgotEmail}
              onChangeText={setForgotEmail}
            />

            <View style={styles.demoCredentialsBox}>
              <Text style={styles.demoBoxTitle}>Demo Owner Credentials</Text>
              <Text style={styles.demoBoxText}>Email: {OWNER_CREDENTIALS.email}</Text>
              <Text style={styles.demoBoxText}>Password: {OWNER_CREDENTIALS.password}</Text>
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={handleSendResetEmail}
              activeOpacity={0.85}
            >
              <Text style={styles.modalPrimaryBtnText}>Send Reset Link</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Registration Modal */}
      <Modal
        visible={isRegisterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRegisterModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsRegisterModalVisible(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Create Account</Text>
              <TouchableOpacity onPress={() => setIsRegisterModalVisible(false)}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Register as a property owner or manager on Luvora.
            </Text>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="e.g. Rajesh Sharma"
              placeholderTextColor={Palette.textMuted}
              value={regName}
              onChangeText={setRegName}
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.modalInputField}
              placeholder="e.g. owner@luvora.com"
              placeholderTextColor={Palette.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={regEmail}
              onChangeText={setRegEmail}
            />

            <Text style={styles.inputLabel}>Primary Property Name</Text>
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
              placeholder="Create a strong password"
              placeholderTextColor={Palette.textMuted}
              secureTextEntry
              value={regPassword}
              onChangeText={setRegPassword}
            />

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={handleRegisterSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.modalPrimaryBtnText}>Register Account</Text>
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
    backgroundColor: Palette.surface,
    borderRadius: 16,
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
    fontSize: 26,
    fontWeight: '800',
    color: Palette.text,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 13.5,
    color: Palette.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13.5,
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
    borderRadius: 10,
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
    fontSize: 15,
    color: Palette.text,
    paddingVertical: 0,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 22,
  },
  forgotPasswordText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Palette.primary,
  },
  signInButton: {
    height: 50,
    backgroundColor: Palette.primary,
    borderRadius: 10,
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
    fontSize: 15.5,
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
    fontSize: 13.5,
    color: Palette.textSecondary,
  },
  createAccountText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(46, 39, 34, 0.4)',
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
    backgroundColor: Palette.surface,
    borderRadius: 16,
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
    fontSize: 20,
    fontWeight: '800',
    color: Palette.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInputField: {
    height: 48,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    backgroundColor: Palette.surface,
    paddingHorizontal: 14,
    fontSize: 14.5,
    color: Palette.text,
    marginBottom: 14,
  },
  demoCredentialsBox: {
    backgroundColor: Palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
    marginBottom: 16,
  },
  demoBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
    marginBottom: 4,
  },
  demoBoxText: {
    fontSize: 12,
    color: Palette.text,
    marginTop: 2,
  },
  modalPrimaryBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    color: Palette.surface,
    fontSize: 15,
    fontWeight: '700',
  },
});
