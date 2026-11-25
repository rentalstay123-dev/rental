import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../constants/theme';
import { ReportsBarIcon } from './CustomIcons';

export type DrawerMenuKey =
  | 'Requests'
  | 'Deposits'
  | 'Staff'
  | 'Reports'
  | 'Policy'
  | 'Settings'
  | 'Profile';

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
    key: 'Requests',
    label: 'Requests',
    subtitle: 'Service & maintenance',
    icon: 'clipboard',
  },
  {
    key: 'Deposits',
    label: 'Deposits',
    subtitle: 'Held and refunds',
    icon: 'lock',
  },
  {
    key: 'Staff',
    label: 'Staff',
    subtitle: 'Team, shifts & salaries',
    icon: 'users',
  },
  {
    key: 'Reports',
    label: 'Reports',
    subtitle: 'Monthly profit',
    icon: 'bar-chart-2',
  },
  {
    key: 'Policy',
    label: 'Policy',
    subtitle: 'Agreements & house rules',
    icon: 'file-text',
  },
  {
    key: 'Settings',
    label: 'Settings',
    subtitle: 'Floors, rooms & configurations',
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
              <Feather name="x" size={Typography.iconSize.header} color={Palette.onPrimary} />
            </TouchableOpacity>
          </View>

          {/* Menu Items Scroll */}
          <ScrollView
            style={styles.menuScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
                  {item.key === 'Reports' ? (
                    <ReportsBarIcon size={20} color={Palette.primary} />
                  ) : (
                    <Feather name={item.icon} size={20} color={Palette.primary} />
                  )}
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={Typography.iconSize.base} color={Palette.primary} />
              </TouchableOpacity>
            ))}

            {/* Divider */}
            <View style={styles.menuDivider} />

            {/* Profile Section Header */}
            <Text style={styles.accountHeader}>PROFILE</Text>

            {/* Profile Item */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => handleItemPress('Profile')}
              activeOpacity={0.7}
            >
              <View style={styles.iconCol}>
                <Feather name="user" size={Typography.iconSize.base} color={Palette.primary} />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.menuLabel}>Profile</Text>
                <Text style={styles.menuSubtitle}>Personal details & security</Text>
              </View>
              <Feather name="chevron-right" size={Typography.iconSize.base} color={Palette.primary} />
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
              <Feather name="log-out" size={Typography.iconSize.base} color={Palette.onPrimary} style={styles.logoutIcon} />
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
    backgroundColor: Palette.backdrop,
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
    fontSize: Typography.fontSize.xxl,
    fontWeight: '700',
    color: Palette.onPrimary,
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  closeSquareButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
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
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: {
    flex: 1,
  },
  menuLabel: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
  },
  menuSubtitle: {
    fontSize: Typography.fontSize.xs,
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
    fontSize: Typography.fontSize.caption,
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
    borderRadius: Radius.sm,
    paddingVertical: 13,
    marginTop: 20,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
  },
});

