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
import { RoomsBedIcon } from './CustomIcons';

export type CustomerDrawerMenuKey =
  | 'Room'
  | 'Payments'
  | 'Requests'
  | 'Notices'
  | 'RulesAndDocs'
  | 'Profile';

interface MenuItemConfig {
  key: CustomerDrawerMenuKey;
  label: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
}

const PRIMARY_MENU_ITEMS: MenuItemConfig[] = [
  {
    key: 'Room',
    label: 'Room',
    subtitle: 'Room details & lease',
    icon: 'key',
  },
  {
    key: 'Payments',
    label: 'Payments',
    subtitle: 'Rent history & dues',
    icon: 'credit-card',
  },
  {
    key: 'Requests',
    label: 'Requests',
    subtitle: 'Service & maintenance',
    icon: 'tool',
  },
  {
    key: 'Notices',
    label: 'Notification',
    subtitle: 'Announcements & alerts',
    icon: 'bell',
  },
  {
    key: 'RulesAndDocs',
    label: 'Policy',
    subtitle: 'Property rules & agreement',
    icon: 'file-text',
  },
];

interface CustomerDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSelectMenu: (key: CustomerDrawerMenuKey) => void;
  onLogout: () => void;
  roomNumber?: string;
}

export default function CustomerDrawer({
  visible,
  onClose,
  onSelectMenu,
  onLogout,
  roomNumber,
}: CustomerDrawerProps) {
  const insets = useSafeAreaInsets();

  const handleItemPress = (key: CustomerDrawerMenuKey) => {
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
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.drawerPanel}>
          {/* Header Banner */}
          <View style={[styles.headerBanner, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
            <View style={styles.brandRow}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <View style={styles.brandTextCol}>
                <Text style={styles.brandTitle}>Luvora</Text>
                {roomNumber ? (
                  <Text style={styles.brandSub}>{roomNumber}</Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeSquareButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >
              <Feather name="x" size={Typography.iconSize.header} color={Palette.onPrimary} />
            </TouchableOpacity>
          </View>

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
                  {item.key === 'Room' ? (
                    <RoomsBedIcon size={22} color={Palette.primary} />
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

            <View style={styles.menuDivider} />

            <Text style={styles.accountHeader}>ACCOUNT</Text>

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

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                onClose();
                onLogout();
              }}
              activeOpacity={0.85}
            >
              <Feather
                name="log-out"
                size={Typography.iconSize.base}
                color={Palette.onPrimary}
                style={styles.logoutIcon}
              />
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
  brandTextCol: {
    marginLeft: 10,
  },
  brandTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '700',
    color: Palette.onPrimary,
    letterSpacing: 0.5,
  },
  brandSub: {
    fontSize: Typography.fontSize.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    marginTop: -2,
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
    marginVertical: 14,
  },
  accountHeader: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
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

