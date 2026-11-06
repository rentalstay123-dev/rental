import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../constants/theme';

export type DrawerMenuKey =
  | 'Partners'
  | 'Maintenance'
  | 'Deposits'
  | 'Payments'
  | 'Reports'
  | 'Settings'
  | 'Account';

interface HamburgerDrawerProps {
  visible: boolean;
  onClose: () => void;
  currentPage?: string;
  onSelectMenu: (key: DrawerMenuKey) => void;
  onLogout: () => void;
}

interface MenuItemConfig {
  key: DrawerMenuKey;
  label: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
}

const PRIMARY_MENU_ITEMS: MenuItemConfig[] = [
  {
    key: 'Partners',
    label: 'Partners',
    subtitle: 'Shares and payouts',
    icon: 'users',
  },
  {
    key: 'Maintenance',
    label: 'Maintenance',
    subtitle: 'Repair requests',
    icon: 'tool',
  },
  {
    key: 'Deposits',
    label: 'Deposits',
    subtitle: 'Held and refunds',
    icon: 'lock',
  },
  {
    key: 'Payments',
    label: 'Payments',
    subtitle: 'Rent and transactions',
    icon: 'credit-card',
  },
  {
    key: 'Reports',
    label: 'Reports',
    subtitle: 'Monthly profit',
    icon: 'bar-chart-2',
  },
  {
    key: 'Settings',
    label: 'Settings',
    subtitle: 'Account and apartment',
    icon: 'settings',
  },
];

export default function HamburgerDrawer({
  visible,
  onClose,
  onSelectMenu,
  onLogout,
}: HamburgerDrawerProps) {
  const insets = useSafeAreaInsets();

  const handleItemPress = (key: DrawerMenuKey) => {
    onSelectMenu(key);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop tap to dismiss */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Drawer Panel */}
        <View style={styles.drawerPanel}>
          {/* Header Banner */}
          <View style={[styles.headerBanner, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
            <View style={styles.brandRow}>
              {/* Clean emblem */}
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.brandTitle}>Luvora</Text>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeSquareButton}
              activeOpacity={0.7}
            >
              <Feather name="x" size={18} color={Palette.surface} />
            </TouchableOpacity>
          </View>

          {/* Menu Items Scroll */}
          <ScrollView
            style={styles.menuScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.menuScrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 20 },
            ]}
          >
            {PRIMARY_MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.menuRow}
                onPress={() => handleItemPress(item.key)}
                activeOpacity={0.7}
              >
                <View style={styles.iconCol}>
                  <Feather name={item.icon} size={20} color={Palette.primary} />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={Palette.secondary} />
              </TouchableOpacity>
            ))}

            {/* Divider */}
            <View style={styles.menuDivider} />

            {/* Account Section Header */}
            <Text style={styles.accountHeader}>ACCOUNT</Text>

            {/* Account Item */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => handleItemPress('Account')}
              activeOpacity={0.7}
            >
              <View style={styles.iconCol}>
                <Feather name="user" size={20} color={Palette.primary} />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.menuLabel}>Account & Profile</Text>
                <Text style={styles.menuSubtitle}>Profile and preferences</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Palette.secondary} />
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                onClose();
                onLogout();
              }}
              activeOpacity={0.85}
            >
              <Feather name="log-out" size={18} color={Palette.surface} style={styles.logoutIcon} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(46, 39, 34, 0.45)',
  },
  drawerPanel: {
    width: '84%',
    maxWidth: 330,
    backgroundColor: Palette.background,
    height: '100%',
    paddingHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 16,
  },
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.primary,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 32,
    height: 26,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Palette.surface,
    marginLeft: 10,
    letterSpacing: 0.5,
    ...Platform.select({
      ios: { fontFamily: 'Georgia' },
      android: { fontFamily: 'serif' },
      default: { fontFamily: 'serif' },
    }),
  },
  closeSquareButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  menuScroll: {
    flex: 1,
    paddingHorizontal: 18,
    backgroundColor: Palette.background,
  },
  menuScrollContent: {
    paddingTop: 14,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  iconCol: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
  },
  menuSubtitle: {
    fontSize: 12.5,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Palette.border,
    marginTop: 10,
    marginBottom: 16,
  },
  accountHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
    letterSpacing: 0.8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 20,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: Palette.surface,
    fontSize: 15,
    fontWeight: '700',
  },
});

