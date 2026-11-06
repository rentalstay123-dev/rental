import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '../constants/theme';
import HamburgerDrawer, { DrawerMenuKey } from '../components/HamburgerDrawer';
import DashboardView from './views/DashboardView';
import RoomsView, { INITIAL_ROOMS, RoomItem } from './views/RoomsView';
import RentView from './views/RentView';
import MoneyView from './views/MoneyView';
import PartnersView from './views/PartnersView';
import MaintenanceView from './views/MaintenanceView';
import DepositsView from './views/DepositsView';
import TenantsView from './views/TenantsView';
import ReportsView from './views/ReportsView';
import SettingsView, { INITIAL_APARTMENTS, ApartmentItem, INITIAL_MAINTENANCE_REASONS } from './views/SettingsView';
import AccountView from './views/AccountView';
import PaymentsView from './views/PaymentsView';
import NotificationsView from './views/NotificationsView';

export type ActivePage =
  | 'Home'
  | 'Rooms'
  | 'Rent'
  | 'Accounts'
  | 'Partners'
  | 'Maintenance'
  | 'Deposits'
  | 'Residents'
  | 'Reports'
  | 'Settings'
  | 'Account'
  | 'Payments'
  | 'Notifications';

interface OwnerDashboardProps {
  onLogout?: () => void;
  userEmail?: string;
}

export default function OwnerDashboard({ onLogout, userEmail }: OwnerDashboardProps) {
  const insets = useSafeAreaInsets();
  const [activePage, setActivePage] = useState<ActivePage>('Home');
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | undefined>(undefined);
  const [rooms, setRooms] = useState<RoomItem[]>(INITIAL_ROOMS);
  const [apartments, setApartments] = useState<ApartmentItem[]>(INITIAL_APARTMENTS);
  const [maintenanceReasons, setMaintenanceReasons] = useState<string[]>(INITIAL_MAINTENANCE_REASONS);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleMenuSelect = (key: DrawerMenuKey) => {
    switch (key) {
      case 'Partners':
        setActivePage('Partners');
        break;
      case 'Maintenance':
        setActivePage('Maintenance');
        break;
      case 'Deposits':
        setActivePage('Deposits');
        break;
      case 'Payments':
        setActivePage('Payments');
        break;
      case 'Reports':
        setActivePage('Reports');
        break;
      case 'Settings':
        setActivePage('Settings');
        break;
      case 'Account':
        setActivePage('Account');
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
            onBack={() => setActivePage('Home')}
          />
        );
      case 'Rent':
        return <RentView onBack={() => setActivePage('Home')} />;
      case 'Accounts':
        return <MoneyView onBack={() => setActivePage('Home')} />;
      case 'Partners':
        return (
          <PartnersView
            apartments={apartments}
            onBack={() => setActivePage('Home')}
          />
        );
      case 'Maintenance':
        return (
          <MaintenanceView
            rooms={rooms}
            maintenanceReasons={maintenanceReasons}
            onBack={() => setActivePage('Home')}
          />
        );
      case 'Deposits':
        return <DepositsView onBack={() => setActivePage('Home')} />;
      case 'Residents':
        return <TenantsView onBack={() => setActivePage('Home')} />;
      case 'Reports':
        return <ReportsView onBack={() => setActivePage('Home')} />;
      case 'Settings':
        return (
          <SettingsView
            rooms={rooms}
            onAddRoom={(newRoom) => setRooms((prev) => [newRoom, ...prev])}
            apartments={apartments}
            setApartments={setApartments}
            maintenanceReasons={maintenanceReasons}
            setMaintenanceReasons={setMaintenanceReasons}
            onBack={() => setActivePage('Home')}
          />
        );
      case 'Account':
        return (
          <AccountView
            userEmail={userEmail}
            onBack={() => setActivePage('Home')}
            onLogout={onLogout}
          />
        );
      case 'Payments':
        return <PaymentsView onBack={() => setActivePage('Home')} />;
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
            onNavigatePage={(page, noticeId) => {
              if (page === 'Rooms') setActivePage('Rooms');
              else if (page === 'Rent') setActivePage('Rent');
              else if (page === 'Money' || page === 'Accounts') setActivePage('Accounts');
              else if (page === 'Notifications') {
                setSelectedNoticeId(noticeId);
                setActivePage('Notifications');
              }
            }}
          />
        );
    }
  };

  const isSubPage = activePage !== 'Home';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top Header shown on Home */}
      {!isSubPage && (
        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => setIsDrawerOpen(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.headerIconButton}
            activeOpacity={0.7}
          >
            <Feather name="menu" size={24} color={Palette.text} />
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
            onPress={() => {
              setSelectedNoticeId(undefined);
              setActivePage('Notifications');
            }}
          >
            <Feather name="bell" size={22} color={Palette.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main View Area */}
      <View style={styles.contentContainer}>{renderActiveView()}</View>

      {/* Floating Bottom Navigation Bar (4-Tab Pill: Home, Rooms, Rent, Income & Exp) */}
      <View style={[styles.floatingNavWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.floatingNavBar}>
          {/* Tab 1: Home */}
          <TouchableOpacity
            style={[styles.navTab, activePage === 'Home' && styles.navTabActive]}
            onPress={() => setActivePage('Home')}
            activeOpacity={0.85}
          >
            <Feather
              name="home"
              size={19}
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
          >
            <MaterialCommunityIcons
              name="door-open"
              size={20}
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
            onPress={() => setActivePage('Rent')}
            activeOpacity={0.85}
          >
            <Feather
              name="credit-card"
              size={18}
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
          >
            <Feather
              name="dollar-sign"
              size={19}
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
    paddingVertical: 12,
    backgroundColor: Palette.background,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
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
    fontSize: 26,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: 0.5,
    ...Platform.select({
      ios: { fontFamily: 'Georgia' },
      android: { fontFamily: 'serif' },
      default: { fontFamily: 'serif' },
    }),
  },
  contentContainer: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  floatingNavWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  floatingNavBar: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    borderRadius: 36,
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
    borderRadius: 24,
    paddingHorizontal: 2,
  },
  navTabActive: {
    backgroundColor: Palette.primary,
  },
  navLabel: {
    fontSize: 10.5,
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
