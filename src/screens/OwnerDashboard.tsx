import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../constants/theme';
import HamburgerDrawer, { DrawerMenuKey } from '../components/HamburgerDrawer';
import DashboardView from './views/DashboardView';
import RoomsView, { INITIAL_FLOORS, INITIAL_ROOMS, RoomItem } from './views/RoomsView';
import RentView, { RentFilter } from './views/RentView';
import MoneyView from './views/MoneyView';
import DepositsView from './views/DepositsView';
import TenantsView from './views/TenantsView';
import ReportsView from './views/ReportsView';
import SettingsView, { INITIAL_MAINTENANCE_REASONS, INITIAL_ROOM_TYPES } from './views/SettingsView';
import ProfileView from './views/AccountView';
import NotificationsView from './views/NotificationsView';

export type ActivePage =
  | 'Home'
  | 'Rooms'
  | 'Rent'
  | 'Accounts'
  | 'Deposits'
  | 'Residents'
  | 'Reports'
  | 'Settings'
  | 'Profile'
  | 'Notifications';

interface OwnerDashboardProps {
  onLogout?: () => void;
  userEmail?: string;
}

export default function OwnerDashboard({ onLogout, userEmail }: OwnerDashboardProps) {
  const insets = useSafeAreaInsets();
  const [activePage, setActivePage] = useState<ActivePage>('Home');
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | undefined>(undefined);
  const [rentFilter, setRentFilter] = useState<RentFilter>('All');
  const [rentViewKey, setRentViewKey] = useState(0);
  const [rooms, setRooms] = useState<RoomItem[]>(INITIAL_ROOMS);
  const [maintenanceReasons, setMaintenanceReasons] = useState<string[]>(INITIAL_MAINTENANCE_REASONS);
  const [roomTypes, setRoomTypes] = useState<string[]>(INITIAL_ROOM_TYPES);
  const [floors, setFloors] = useState<string[]>(INITIAL_FLOORS);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleMenuSelect = (key: DrawerMenuKey) => {
    switch (key) {
      case 'Deposits':
        setActivePage('Deposits');
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
    switch (activePage) {
      case 'Rooms':
        return (
          <RoomsView
            rooms={rooms}
            setRooms={setRooms}
            roomTypes={roomTypes}
            floors={floors}
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
      case 'Reports':
        return <ReportsView rooms={rooms} onBack={() => setActivePage('Home')} />;
      case 'Settings':
        return (
          <SettingsView
            rooms={rooms}
            onAddRoom={(newRoom) => setRooms((prev) => [...prev, newRoom])}
            onAddRooms={(newRooms) => setRooms((prev) => [...prev, ...newRooms])}
            maintenanceReasons={maintenanceReasons}
            setMaintenanceReasons={setMaintenanceReasons}
            roomTypes={roomTypes}
            setRoomTypes={setRoomTypes}
            floors={floors}
            setFloors={setFloors}
            onBack={() => setActivePage('Home')}
          />
        );
      case 'Profile':
        return (
          <ProfileView
            userEmail={userEmail}
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

        {/* Luvora Wordmark (Brand Name Only) */}
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
        </TouchableOpacity>
      </View>

      {/* Main View Area */}
      <View style={styles.contentContainer}>{renderActiveView()}</View>

      {/* Floating Bottom Navigation Bar (4-Tab Pill: Home, Rooms, Rent, Accounts) */}
      <View style={[styles.floatingNavWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.floatingNavBar} accessibilityRole="tablist">
          {/* Tab 1: Home */}
          <TouchableOpacity
            style={[styles.navTab, activePage === 'Home' && styles.navTabActive]}
            onPress={() => setActivePage('Home')}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: activePage === 'Home' }}
          >
            <Feather
              name="home"
              size={Typography.iconSize.base}
              color={activePage === 'Home' ? Palette.surface : Palette.textSecondary}
            />
            <Text
              style={[
                styles.navLabel,
                activePage === 'Home' ? styles.navLabelActive : styles.navLabelInactive,
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Rooms */}
          <TouchableOpacity
            style={[styles.navTab, activePage === 'Rooms' && styles.navTabActive]}
            onPress={() => setActivePage('Rooms')}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: activePage === 'Rooms' }}
          >
            <Feather
              name="grid"
              size={Typography.iconSize.base}
              color={activePage === 'Rooms' ? Palette.surface : Palette.textSecondary}
            />
            <Text
              style={[
                styles.navLabel,
                activePage === 'Rooms' ? styles.navLabelActive : styles.navLabelInactive,
              ]}
            >
              Rooms
            </Text>
          </TouchableOpacity>

          {/* Tab 3: Rent */}
          <TouchableOpacity
            style={[styles.navTab, activePage === 'Rent' && styles.navTabActive]}
            onPress={() => {
              setRentFilter('All');
              setRentViewKey((k) => k + 1);
              setActivePage('Rent');
            }}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: activePage === 'Rent' }}
          >
            <Feather
              name="credit-card"
              size={Typography.iconSize.base}
              color={activePage === 'Rent' ? Palette.surface : Palette.textSecondary}
            />
            <Text
              style={[
                styles.navLabel,
                activePage === 'Rent' ? styles.navLabelActive : styles.navLabelInactive,
              ]}
            >
              Rent
            </Text>
          </TouchableOpacity>

          {/* Tab 4: Accounts */}
          <TouchableOpacity
            style={[styles.navTab, activePage === 'Accounts' && styles.navTabActive]}
            onPress={() => setActivePage('Accounts')}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: activePage === 'Accounts' }}
          >
            <Feather
              name="dollar-sign"
              size={Typography.iconSize.base}
              color={
                activePage === 'Accounts' ? Palette.surface : Palette.textSecondary
              }
            />
            <Text
              style={[
                styles.navLabel,
                activePage === 'Accounts'
                  ? styles.navLabelActive
                  : styles.navLabelInactive,
              ]}
              numberOfLines={1}
            >
              Accounts
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
  contentContainer: {
    flex: 1,
    minHeight: 0,
    backgroundColor: Palette.background,
  },
  floatingNavWrapper: {
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: Palette.background,
    alignItems: 'center',
  },
  floatingNavBar: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 8,
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
    fontSize: Typography.fontSize.caption,
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
