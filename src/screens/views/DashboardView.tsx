import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';

interface DashboardViewProps {
  onNavigatePage?: (
    page: 'Rooms' | 'Rent' | 'Money' | 'Accounts' | 'Notifications',
    noticeId?: string
  ) => void;
}

const PROPERTIES = [
  'Sunrise Apartments',
  'Palm Residency',
  'City Homes',
  'Green Villa',
];

interface CustomerMessage {
  id: string;
  senderName: string;
  roomNumber: string;
  phone: string;
  time: string;
  message: string;
  tag: string;
}

const CUSTOMER_MESSAGES: CustomerMessage[] = [
  {
    id: 'msg-1',
    senderName: 'Sana Khan',
    roomNumber: 'Room 104',
    phone: '+91 97400 99881',
    time: '10m ago',
    message: 'Water tap in bathroom is leaking continuously, please send plumber.',
    tag: 'Plumbing',
  },
  {
    id: 'msg-2',
    senderName: 'Sneha Patel',
    roomNumber: 'Room 202',
    phone: '+91 94480 33445',
    time: '2h ago',
    message: 'Main bedroom fan regulator is not rotating properly, needs replacement.',
    tag: 'Electrical',
  },
  {
    id: 'msg-3',
    senderName: 'Anil Rao',
    roomNumber: 'Room 101',
    phone: '+91 98450 11223',
    time: 'Today, 11:30 AM',
    message: 'Transferred October rent of ₹9,000 via UPI (Ref: 430198). Please confirm receipt.',
    tag: 'Payment',
  },
];

export default function DashboardView({ onNavigatePage }: DashboardViewProps) {
  const [selectedProperty, setSelectedProperty] = useState('Sunrise Apartments');
  const [showPropertyMenu, setShowPropertyMenu] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handlePropertySelect = (prop: string) => {
    setSelectedProperty(prop);
    setShowPropertyMenu(false);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#000000"
          colors={['#000000']}
        />
      }
    >
      {/* Welcome back */}
      <Text style={styles.welcomeTitle}>Welcome back</Text>

      {/* Property Selector Dropdown Pill */}
      <View style={styles.dropdownWrapper}>
        <TouchableOpacity
          style={styles.propertyPill}
          activeOpacity={0.8}
          onPress={() => setShowPropertyMenu(!showPropertyMenu)}
        >
          <Text style={styles.propertyPillText}>{selectedProperty}</Text>
          <Feather
            name={showPropertyMenu ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Palette.text}
            style={styles.dropdownIcon}
          />
        </TouchableOpacity>

        {/* Dropdown Options */}
        {showPropertyMenu && (
          <View style={styles.dropdownMenu}>
            {PROPERTIES.map((prop) => (
              <TouchableOpacity
                key={prop}
                style={[
                  styles.dropdownMenuItem,
                  prop === selectedProperty && styles.dropdownMenuItemActive,
                ]}
                onPress={() => handlePropertySelect(prop)}
              >
                <Text
                  style={[
                    styles.dropdownMenuText,
                    prop === selectedProperty && styles.dropdownMenuTextActive,
                  ]}
                >
                  {prop}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Hero Card: Net profit · October (White summary card with Coffee Brown highlight & Caramel accent) */}
      <TouchableOpacity
        style={styles.profitCard}
        activeOpacity={0.85}
        onPress={() => onNavigatePage && onNavigatePage('Accounts')}
      >
        <View style={styles.profitHeaderRow}>
          <Text style={styles.profitHeader}>Net profit · October</Text>
          <View style={styles.profitBadge}>
            <Text style={styles.profitBadgeText}>+12% mo</Text>
          </View>
        </View>
        <Text style={styles.profitAmount}>₹66,000</Text>
        <Text style={styles.profitBreakdown}>Income ₹92,000  ·  Expenses ₹26,000</Text>
        <View style={styles.caramelAccentLine} />
      </TouchableOpacity>

      {/* 2-Column Metric Cards */}
      <View style={styles.metricRow}>
        {/* Rooms occupied */}
        <TouchableOpacity
          style={styles.metricCard}
          activeOpacity={0.85}
          onPress={() => onNavigatePage && onNavigatePage('Rooms')}
        >
          <Text style={styles.metricLabel}>Rooms occupied</Text>
          <Text style={styles.metricValue}>9 / 12</Text>
          <Text style={styles.metricSubtext}>3 vacant</Text>
        </TouchableOpacity>

        {/* Rent pending */}
        <TouchableOpacity
          style={styles.metricCard}
          activeOpacity={0.85}
          onPress={() => onNavigatePage && onNavigatePage('Rent')}
        >
          <Text style={styles.metricLabel}>Rent pending</Text>
          <Text style={[styles.metricValue, { color: Palette.primary }]}>₹25,000</Text>
          <Text style={styles.metricSubtext}>2 rooms due</Text>
        </TouchableOpacity>
      </View>

      {/* Section: Pending Room Rents */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Pending room rents</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigatePage && onNavigatePage('Rent')}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardContainer}>
        {/* Pending Room 102 */}
        <TouchableOpacity
          style={styles.pendingItemRow}
          activeOpacity={0.7}
          onPress={() => onNavigatePage && onNavigatePage('Rent')}
        >
          <View style={styles.pendingLeftCol}>
            <View style={styles.roomBadgeRow}>
              <Text style={styles.pendingRoomNumber}>Room 102</Text>
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueBadgeText}>Overdue</Text>
              </View>
            </View>
            <Text style={styles.pendingTenantText}>Priya Sharma · Due Oct 15</Text>
          </View>
          <View style={styles.pendingRightCol}>
            <Text style={styles.pendingAmount}>₹15,000</Text>
            <Text style={styles.pendingSubInfo}>Pending</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Pending Room 201 */}
        <TouchableOpacity
          style={styles.pendingItemRow}
          activeOpacity={0.7}
          onPress={() => onNavigatePage && onNavigatePage('Rent')}
        >
          <View style={styles.pendingLeftCol}>
            <View style={styles.roomBadgeRow}>
              <Text style={styles.pendingRoomNumber}>Room 201</Text>
              <View style={styles.dueBadge}>
                <Text style={styles.dueBadgeText}>Due</Text>
              </View>
            </View>
            <Text style={styles.pendingTenantText}>Arjun Kumar · Due Nov 1</Text>
          </View>
          <View style={styles.pendingRightCol}>
            <Text style={styles.pendingAmount}>₹10,000</Text>
            <Text style={styles.pendingSubInfo}>Upcoming</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Section: Customer messages */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Customer messages</Text>
        <Text style={styles.messageCountText}>{CUSTOMER_MESSAGES.length} new</Text>
      </View>

      <View style={styles.cardContainer}>
        {CUSTOMER_MESSAGES.map((msg, index) => {
          const isLast = index === CUSTOMER_MESSAGES.length - 1;
          return (
            <React.Fragment key={msg.id}>
              <TouchableOpacity
                style={styles.messageItem}
                activeOpacity={0.7}
                onPress={() => onNavigatePage && onNavigatePage('Notifications', msg.id)}
              >
                <Text style={styles.messageSenderTitle}>
                  {msg.senderName} · {msg.roomNumber}
                </Text>

                <Text style={styles.singleWordTag}>{msg.tag}</Text>
              </TouchableOpacity>
              {!isLast && <View style={styles.divider} />}
            </React.Fragment>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 110,
    backgroundColor: Palette.background,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 16,
  },
  propertyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Palette.surface,
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  propertyPillText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: Palette.text,
    marginRight: 6,
  },
  dropdownIcon: {
    marginTop: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  dropdownMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.background,
  },
  dropdownMenuItemActive: {
    backgroundColor: Palette.background,
  },
  dropdownMenuText: {
    fontSize: 14,
    color: Palette.text,
    fontWeight: '500',
  },
  dropdownMenuTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  profitCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  profitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitHeader: {
    fontSize: 14,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  profitBadge: {
    paddingVertical: 2,
  },
  profitBadgeText: {
    color: Palette.status.active.text,
    fontSize: 12.5,
    fontWeight: '700',
  },
  profitAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: Palette.primary,
    marginVertical: 6,
    letterSpacing: -0.5,
  },
  profitBreakdown: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  caramelAccentLine: {
    height: 3,
    backgroundColor: Palette.secondary,
    borderRadius: 1.5,
    marginTop: 14,
    width: '35%',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: Palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  metricLabel: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '400',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
  },
  cardContainer: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  pendingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pendingLeftCol: {
    flex: 1,
  },
  roomBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pendingRoomNumber: {
    fontSize: 15.5,
    fontWeight: '700',
    color: Palette.text,
    marginRight: 8,
  },
  pendingTenantText: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  pendingRightCol: {
    alignItems: 'flex-end',
  },
  pendingAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.primary,
    marginBottom: 2,
  },
  pendingSubInfo: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  messageCountText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.primary,
  },
  messageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  messageSenderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
  },
  messageRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  singleWordTag: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.primary,
  },
  overdueBadge: {
    paddingVertical: 1,
  },
  overdueBadgeText: {
    color: Palette.status.overdue.text,
    fontSize: 12,
    fontWeight: '700',
  },
  dueBadge: {
    paddingVertical: 1,
  },
  dueBadgeText: {
    color: Palette.status.due.text,
    fontSize: 12,
    fontWeight: '700',
  },
  openBadge: {
    paddingVertical: 1,
  },
  openBadgeText: {
    color: Palette.status.pending.text,
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
  },
});
