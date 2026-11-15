import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../constants/theme';
import { CustomerDataProvider, useCustomerData } from '../context/CustomerDataContext';
import CustomerDrawer, { CustomerDrawerMenuKey } from '../components/CustomerDrawer';
import CustomerHomeView, { CustomerPageKey } from './customer/CustomerHomeView';
import CustomerRoomView from './customer/CustomerRoomView';
import CustomerPaymentsView from './customer/CustomerPaymentsView';
import CustomerRequestsView from './customer/CustomerRequestsView';
import CustomerNoticesView from './customer/CustomerNoticesView';
import CustomerProfileView from './customer/CustomerProfileView';

interface CustomerDashboardProps {
  uid: string;
  onLogout?: () => void;
  userEmail?: string;
  userName?: string;
}

const FOOTER_TABS: {
  key: Extract<CustomerPageKey, 'Home' | 'Room' | 'Payments' | 'Profile'>;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { key: 'Home', label: 'Home', icon: 'home' },
  { key: 'Room', label: 'Room', icon: 'key' },
  { key: 'Payments', label: 'Payments', icon: 'credit-card' },
  { key: 'Profile', label: 'Profile', icon: 'user' },
];

function CustomerDashboardContent({ onLogout }: { onLogout?: () => void }) {
  const insets = useSafeAreaInsets();
  const [activePage, setActivePage] = useState<CustomerPageKey>('Home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [selectedNoticeId, setSelectedNoticeId] = useState<string | undefined>(undefined);
  const [payModalTriggerKey, setPayModalTriggerKey] = useState(0);
  const [shouldOpenPayModal, setShouldOpenPayModal] = useState(false);
  const [reqModalTriggerKey, setReqModalTriggerKey] = useState(0);
  const [shouldOpenNewReqModal, setShouldOpenNewReqModal] = useState(false);

  const { data, isInitialLoading, syncError, dismissSyncError } = useCustomerData();
  const unreadCount = data.notices.filter((n) => !n.isRead).length;

  const navigateToTab = (tabKey: CustomerPageKey) => {
    if (tabKey !== 'Payments') setShouldOpenPayModal(false);
    if (tabKey !== 'Requests') setShouldOpenNewReqModal(false);
    setActivePage(tabKey);
  };

  const handleMenuSelect = (key: CustomerDrawerMenuKey) => {
    navigateToTab(key);
  };

  const renderActiveView = () => {
    if (isInitialLoading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={styles.loadingLabel}>Loading your resident portal...</Text>
        </View>
      );
    }

    switch (activePage) {
      case 'Room':
        return (
          <CustomerRoomView
            showBackButton
            onBack={() => navigateToTab('Home')}
          />
        );
      case 'Payments':
        return (
          <CustomerPaymentsView
            key={payModalTriggerKey}
            showBackButton
            initialOpenPayModal={shouldOpenPayModal}
            onBack={() => navigateToTab('Home')}
          />
        );
      case 'Requests':
        return (
          <CustomerRequestsView
            key={reqModalTriggerKey}
            showBackButton
            initialOpenNewModal={shouldOpenNewReqModal}
            onBack={() => navigateToTab('Home')}
          />
        );
      case 'Notices':
        return (
          <CustomerNoticesView
            initialNoticeId={selectedNoticeId}
            onBack={() => navigateToTab('Home')}
          />
        );
      case 'Profile':
        return (
          <CustomerProfileView
            showBackButton
            onBack={() => navigateToTab('Home')}
            onLogout={onLogout}
          />
        );
      case 'Home':
      default:
        return (
          <CustomerHomeView
            onNavigatePage={(page, options) => {
              if (page === 'Payments') {
                setShouldOpenPayModal(Boolean(options?.openPayModal));
                setPayModalTriggerKey((k) => k + 1);
                setActivePage('Payments');
              } else if (page === 'Requests') {
                setShouldOpenNewReqModal(Boolean(options?.openNewRequestModal));
                setReqModalTriggerKey((k) => k + 1);
                setActivePage('Requests');
              } else if (page === 'Notices') {
                setSelectedNoticeId(options?.noticeId);
                setActivePage('Notices');
              } else {
                setActivePage(page);
              }
            }}
          />
        );
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Global Top Header matching Owner Admin */}
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

        <View style={styles.headerBrandContainer}>
          <Text style={styles.headerLogoText}>Luvora</Text>
        </View>

        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerIconButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Notification"
          onPress={() => {
            setSelectedNoticeId(undefined);
            navigateToTab('Notices');
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

      {/* Main View Area */}
      <View style={styles.contentContainer}>{renderActiveView()}</View>

      {/* Floating Bottom Navigation Bar (5-Tab Pill matching Owner Admin) */}
      <View style={[styles.floatingNavWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.floatingNavBar} accessibilityRole="tablist">
          {FOOTER_TABS.map((tab) => {
            const isActive = activePage === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.navTab, isActive && styles.navTabActive]}
                onPress={() => navigateToTab(tab.key)}
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

      {/* Customer Hamburger Drawer */}
      <CustomerDrawer
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectMenu={handleMenuSelect}
        onLogout={() => onLogout?.()}
        roomNumber={data.room.roomNumber}
      />
    </View>
  );
}

export default function CustomerDashboard({
  uid,
  onLogout,
  userEmail,
  userName,
}: CustomerDashboardProps) {
  return (
    <CustomerDataProvider uid={uid} userEmail={userEmail} userName={userName}>
      <CustomerDashboardContent onLogout={onLogout} />
    </CustomerDataProvider>
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

