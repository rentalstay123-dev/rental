import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';

interface PartnerAgency {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  managedUnits: number;
  commission: string;
  status: 'Active' | 'Inactive';
  performance: string;
}

const PARTNERS_DATA: PartnerAgency[] = [
  {
    id: '1',
    name: 'City Homes Realty',
    contactPerson: 'Vikram Seth',
    phone: '+91 98765 43210',
    email: 'vikram@cityhomes.in',
    managedUnits: 2,
    commission: '8% / mo',
    status: 'Active',
    performance: '98% on-time collections',
  },
  {
    id: '2',
    name: 'Coastal Property Managers',
    contactPerson: 'Anita Rao',
    phone: '+91 98450 12345',
    email: 'anita@coastalpm.com',
    managedUnits: 1,
    commission: '10% / mo',
    status: 'Active',
    performance: '100% occupancy rate',
  },
  {
    id: '3',
    name: 'Elite Estate Advisors',
    contactPerson: 'Ramesh Nayak',
    phone: '+91 99000 55443',
    email: 'ramesh@eliteestate.com',
    managedUnits: 1,
    commission: '7% / mo',
    status: 'Inactive',
    performance: 'Contract under renewal',
  },
];

export default function PartnerView() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Partner Agencies</Text>
          <Text style={styles.subTitle}>3 Registered • 2 Active • 1 Inactive</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => Alert.alert('Add Partner', 'Register new partner agency')}
        >
          <Feather name="user-plus" size={17} color={Palette.surface} />
          <Text style={styles.addButtonText}>Add Partner</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>3</Text>
          <Text style={styles.statLbl}>Total Partners</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: Palette.status.active.text }]}>2</Text>
          <Text style={styles.statLbl}>Active</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: Palette.status.pending.text }]}>1</Text>
          <Text style={styles.statLbl}>Inactive</Text>
        </View>
      </View>

      {/* Partners List */}
      {PARTNERS_DATA.map((partner) => (
        <View key={partner.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.agencyIcon}>
              <MaterialCommunityIcons name="office-building" size={24} color={Palette.primary} />
            </View>
            <View style={styles.agencyDetails}>
              <Text style={styles.agencyName}>{partner.name}</Text>
              <Text style={styles.contactName}>{partner.contactPerson} • Manager</Text>
            </View>
            <View
              style={[
                styles.badge,
                partner.status === 'Active' ? styles.activeBadge : styles.inactiveBadge,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  partner.status === 'Active' ? styles.activeText : styles.inactiveText,
                ]}
              >
                {partner.status}
              </Text>
            </View>
          </View>

          <View style={styles.gridInfo}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLbl}>Units Managed</Text>
              <Text style={styles.gridVal}>{partner.managedUnits} Properties</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLbl}>Commission</Text>
              <Text style={styles.gridVal}>{partner.commission}</Text>
            </View>
          </View>

          <View style={styles.perfRow}>
            <Feather name="award" size={14} color={Palette.primary} />
            <Text style={styles.perfText}>{partner.performance}</Text>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => Alert.alert('Contact', `Calling ${partner.contactPerson} (${partner.phone})`)}
            >
              <Feather name="phone" size={14} color={Palette.text} style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnOutlineText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={() => Alert.alert('Email', `Emailing ${partner.email}`)}
            >
              <Feather name="mail" size={14} color={Palette.text} style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnOutlineText}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnFilled}
              onPress={() => Alert.alert(partner.name, 'Viewing assigned contracts')}
            >
              <Text style={styles.actionBtnFilledText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 30,
    backgroundColor: Palette.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Palette.text,
  },
  subTitle: {
    fontSize: 13,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addButtonText: {
    color: Palette.surface,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.text,
  },
  statLbl: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agencyIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  agencyDetails: {
    flex: 1,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
  },
  contactName: {
    fontSize: 12.5,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: Palette.status.active.bg,
  },
  inactiveBadge: {
    backgroundColor: Palette.status.vacant.bg,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeText: {
    color: Palette.status.active.text,
  },
  inactiveText: {
    color: Palette.status.vacant.text,
  },
  gridInfo: {
    flexDirection: 'row',
    backgroundColor: Palette.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  gridItem: {
    flex: 1,
  },
  gridLbl: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginBottom: 2,
  },
  gridVal: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.text,
  },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 14,
  },
  perfText: {
    fontSize: 12,
    color: Palette.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingTop: 12,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 8,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: Palette.surface,
  },
  actionBtnOutlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  actionBtnFilled: {
    flex: 1.2,
    backgroundColor: Palette.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionBtnFilledText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.surface,
  },
});
