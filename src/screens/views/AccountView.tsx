import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';

interface AccountViewProps {
  onBack?: () => void;
  onLogout?: () => void;
  userEmail?: string;
}

export default function AccountView({ onBack, onLogout, userEmail }: AccountViewProps) {
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

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
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButtonCircle}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-left" size={22} color={Palette.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Account & Profile</Text>
          </View>
        </View>

        {/* Profile Identity Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>RS</Text>
          </View>
          <View style={styles.profileTextCol}>
            <Text style={styles.profileName}>Rajesh Sharma</Text>
            <Text style={styles.profileRole}>Owner · Sunrise Apartments</Text>
            <Text style={styles.profileEmail}>{userEmail || 'rajesh.owner@luvora.in'}</Text>
          </View>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => Alert.alert('Edit Profile', 'Edit personal contact info.')}
          >
            <Feather name="edit-2" size={16} color={Palette.primary} />
          </TouchableOpacity>
        </View>

        {/* Bank & Payouts Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>PAYOUT BANK ACCOUNT</Text>

          <View style={styles.bankRow}>
            <View style={styles.bankIconBox}>
              <MaterialCommunityIcons name="bank" size={20} color={Palette.primary} />
            </View>
            <View style={styles.bankTextCol}>
              <Text style={styles.bankName}>HDFC Bank</Text>
              <Text style={styles.bankSub}>A/C •••• 4590 · IFSC HDFC0001234</Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Primary</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => Alert.alert('Bank Account', 'Change or add secondary payout bank account.')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Update Bank Details</Text>
          </TouchableOpacity>
        </View>

        {/* Security & Access Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>SECURITY & ACCESS</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchTitle}>Face ID / Biometric Login</Text>
              <Text style={styles.switchSub}>Unlock app instantly with biometric check</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: Palette.border, true: Palette.primary }}
              thumbColor={Palette.surface}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchTitle}>Instant SMS / WhatsApp Alerts</Text>
              <Text style={styles.switchSub}>Receive rent collection & payment notifications</Text>
            </View>
            <Switch
              value={smsAlertsEnabled}
              onValueChange={setSmsAlertsEnabled}
              trackColor={{ false: Palette.border, true: Palette.primary }}
              thumbColor={Palette.surface}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Alert.alert('Change Password', 'An email verification link has been sent.')}
            activeOpacity={0.7}
          >
            <Feather name="lock" size={17} color={Palette.text} style={{ marginRight: 12 }} />
            <Text style={styles.linkRowText}>Change Password</Text>
            <Feather name="chevron-right" size={18} color={Palette.secondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert('Logout', 'Are you sure you want to log out from Luvora?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Logout',
                style: 'destructive',
                onPress: () => onLogout && onLogout(),
              },
            ]);
          }}
          activeOpacity={0.85}
        >
          <Feather name="log-out" size={18} color={Palette.surface} style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerScreen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 110,
    backgroundColor: Palette.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.surface,
  },
  profileTextCol: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: Palette.primary,
    fontWeight: '500',
  },
  editProfileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  sectionCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  bankIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    marginRight: 12,
  },
  bankTextCol: {
    flex: 1,
  },
  bankName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
  },
  bankSub: {
    fontSize: 12.5,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: Palette.status.active.bg,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: Palette.status.active.text,
    fontSize: 11,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchTextCol: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: Palette.text,
    marginBottom: 2,
  },
  switchSub: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  linkRowText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: Palette.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 10,
  },
  logoutButtonText: {
    color: Palette.surface,
    fontSize: 15,
    fontWeight: '700',
  },
});

