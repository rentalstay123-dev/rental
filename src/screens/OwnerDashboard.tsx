import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../constants/theme';
import { AppDataProvider, useAppData } from '../context/AppDataContext';
import HamburgerDrawer, { DrawerMenuKey } from '../components/HamburgerDrawer';
import DashboardView from './views/DashboardView';
import RoomsView from './views/RoomsView';
import RentView, { RentFilter } from './views/RentView';
import MoneyView from './views/MoneyView';
import DepositsView from './views/DepositsView';
import TenantsView from './views/TenantsView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import ProfileView from './views/AccountView';
import NotificationsView from './views/NotificationsView';
import StaffView from './views/StaffView';

export type ActivePage =
  | 'Home'
  | 'Rooms'
  | 'Rent'
  | 'Accounts'
  | 'Deposits'
  | 'Residents'
  | 'Staff'
  | 'Reports'
  | 'Settings'
  | 'Profile'
  | 'Notifications';

interface OwnerDashboardProps {
  uid: string;
  onLogout?: () => void;
  userEmail?: string;
  userName?: string;
}

const FOOTER_TABS: {
  key: Extract<ActivePage, 'Home' | 'Rooms' | 'Rent' | 'Accounts' | 'Reports'>;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { key: 'Home', label: 'Home', icon: 'home' },
  { key: 'Rooms', label: 'Rooms', icon: 'grid' },
  { key: 'Rent', label: 'Rent', icon: 'credit-card' },
  { key: 'Accounts', label: 'Accounts', icon: 'dollar-sign' },
  { key: 'Reports', label: 'Reports', icon: 'bar-chart-2' },
];

function OwnerDashboardContent({ onLogout }: { onLogout?: () => void }) {
  const insets = useSafeAreaInsets();
  const [activePage, setActivePage] = useState<ActivePage>('Home');
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | undefined>(undefined);
  const [rentFilter, setRentFilter] = useState<RentFilter>('All');
  const [rentViewKey, setRentViewKey] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const {
    rooms,
    setRoomsList,
    addRooms,
    upsertSingleRoom,
    settings,
    setFloors,
    setRoomTypes,
    setMaintenanceReasons,
    notifications,
    isInitialLoading,
    syncError,
    dismissSyncError,
  } = useAppData();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMenuSelect = (key: DrawerMenuKey) => {
    switch (key) {
      case 'Deposits':
        setActivePage('Deposits');
        break;
      case 'Staff':
        setActivePage('Staff');
        break;
      case 'Reports':
        setActivePage('Reports');
        break;
      case 'Settings':
        setActivePage('Settings');
        break;
      case 'Profile':
        setActivePage('Profile');
        break;
      default:
        break;
    }
  };

  const renderActiveView = () => {
    if (isInitialLoading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={styles.loadingLabel}>Loading your workspace...</Text>
        </View>
      );
    }

    switch (activePage) {
      case 'Rooms':
        return (
          <RoomsView
            rooms={rooms}
            setRooms={setRoomsList}
            roomTypes={settings.roomTypes}
            floors={settings.floors}
            onBack={() => setActivePage('Home')}
          />
        );
      case 'Rent':
        return (
          <RentView
            key={rentViewKey}
            initialFilter={rentFilter}
            onBack={() => setActivePage('Home')}
          />
        );
      case 'Accounts':
        return <MoneyView onBack={() => setActivePage('Home')} />;
      case 'Deposits':
        return <DepositsView rooms={rooms} onBack={() => setActivePage('Home')} />;
      case 'Residents':
        return <TenantsView onBack={() => setActivePage('Home')} />;
      case 'Staff':
        return <StaffView onBack={() => setActivePage('Home')} />;
      case 'Reports':
        return <ReportsView rooms={rooms} onBack={() => setActivePage('Home')} />;
      case 'Settings':
        return (
          <SettingsView
            rooms={rooms}
            onAddRoom={(newRoom) => void upsertSingleRoom(newRoom)}
            onAddRooms={(newRooms) => void addRooms(newRooms)}
            maintenanceReasons={settings.maintenanceReasons}
            setMaintenanceReasons={setMaintenanceReasons}
            roomTypes={settings.roomTypes}
            setRoomTypes={setRoomTypes}
            floors={settings.floors}
            setFloors={setFloors}
            onBack={() => setActivePage('Home')}
          />
        );
      case 'Profile':
        return (
          <ProfileView
            onBack={() => setActivePage('Home')}
            onLogout={onLogout}
          />
        );
      case 'Notifications':
        return (
          <NotificationsView
            initialNoticeId={selectedNoticeId}
            onBack={() => setActivePage('Home')}
          />
        );
      case 'Home':
      default:
        return (
          <DashboardView
            onNavigatePage={(page, noticeId, nextRentFilter) => {
              if (page === 'Rooms') setActivePage('Rooms');
              else if (page === 'Rent') {
                setRentFilter(nextRentFilter ?? 'All');
                setRentViewKey((k) => k + 1);
                setActivePage('Rent');
              } else if (page === 'Money' || page === 'Accounts') setActivePage('Accounts');
              else if (page === 'Notifications') {
                setSelectedNoticeId(noticeId);
                setActivePage('Notifications');
              }
            }}
          />
        );
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Global Top Header shown across all pages */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          onPress={() => setIsDrawerOpen(true)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerIconButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Feather name="menu" size={Typography.iconSize.base} color={Palette.onPrimary} />
        </TouchableOpacity>

        {/* Luvora Wordmark */}
        <View style={styles.headerBrandContainer}>
          <Text style={styles.headerLogoText}>Luvora</Text>
        </View>

        {/* Notification Bell */}
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerIconButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => {
            setSelectedNoticeId(undefined);
            setActivePage('Notifications');
          }}
        >
          <Feather name="bell" size={Typography.iconSize.base} color={Palette.onPrimary} />
          {unreadCount > 0 ? <View style={styles.unreadDot} /> : null}
        </TouchableOpacity>
      </View>

      {syncError ? (
        <View style={styles.syncErrorBar}>
          <Text style={styles.syncErrorText} numberOfLines={2}>
            {syncError}
          </Text>
          <TouchableOpacity onPress={dismissSyncError} style={styles.syncDismissBtn}>
            <Text style={styles.syncDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Main View Area with Keyboard Avoiding */}
      <KeyboardAvoidingView
        style={styles.contentContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderActiveView()}
      </KeyboardAvoidingView>

      {/* Floating Bottom Navigation Bar (5-Tab Pill: Home, Rooms, Rent, Accounts, Reports) */}
      {!isKeyboardVisible && (
        <View style={[styles.floatingNavWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.floatingNavBar} accessibilityRole="tablist">
            {FOOTER_TABS.map((tab) => {
              const isActive = activePage === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.navTab, isActive && styles.navTabActive]}
                  onPress={() => {
                    if (tab.key === 'Rent') {
                      setRentFilter('All');
                      setRentViewKey((k) => k + 1);
                    }
                    setActivePage(tab.key);
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Feather
                    name={tab.icon}
                    size={Typography.iconSize.base}
                    color={isActive ? Palette.surface : Palette.textSecondary}
                  />
                  <Text
                    style={[
                      styles.navLabel,
                      isActive ? styles.navLabelActive : styles.navLabelInactive,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Hamburger Drawer */}
      <HamburgerDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectMenu={handleMenuSelect}
        onLogout={() => onLogout && onLogout()}
      />
    </View>
  );
}

export default function OwnerDashboard({ uid, onLogout, userEmail, userName }: OwnerDashboardProps) {
  return (
    <AppDataProvider uid={uid} userEmail={userEmail} userName={userName}>
      <OwnerDashboardContent onLogout={onLogout} />
    </AppDataProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: Palette.primary,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Palette.status.pending.bg,
    borderWidth: 1,
    borderColor: Palette.primary,
  },
  headerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoText: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '800',
    color: Palette.onPrimary,
    letterSpacing: 0.5,
    fontFamily: Typography.fontFamily.serif,
  },
  syncErrorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.status.pending.bg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    gap: 10,
  },
  syncErrorText: {
    flex: 1,
    fontSize: Typography.fontSize.caption,
    color: Palette.status.pending.text,
    fontWeight: '600',
  },
  syncDismissBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syncDismissText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.primary,
    fontWeight: '700',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingLabel: {
    fontSize: Typography.fontSize.base,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    minHeight: 0,
    backgroundColor: Palette.background,
  },
  floatingNavWrapper: {
    paddingHorizontal: 14,
    paddingTop: 8,
    backgroundColor: Palette.background,
    alignItems: 'center',
  },
  floatingNavBar: {
    width: '100%',
    maxWidth: 540,
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  navTab: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: 2,
  },
  navTabActive: {
    backgroundColor: Palette.primary,
  },
  navLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  navLabelActive: {
    color: Palette.surface,
    fontWeight: '700',
  },
  navLabelInactive: {
    color: Palette.textSecondary,
    fontWeight: '600',
  },
});
