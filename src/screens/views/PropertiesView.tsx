import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';

interface PropertyItem {
  id: string;
  name: string;
  location: string;
  type: string;
  status: 'Occupied' | 'Vacant';
  tenant?: string;
  rent: string;
  nextDue?: string;
  image: string;
}

const PROPERTIES_DATA: PropertyItem[] = [
  {
    id: '1',
    name: 'Sunrise Apartments – A1',
    location: 'Mangalore, Karnataka',
    type: '2 BHK Luxury Apartment',
    status: 'Occupied',
    tenant: 'Arjun Kumar',
    rent: '₹25,000',
    nextDue: 'Nov 1, 2026',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=300&q=80',
  },
  {
    id: '2',
    name: 'Palm Residency – B2',
    location: 'Kadri, Mangalore',
    type: '3 BHK Sea View Flat',
    status: 'Occupied',
    tenant: 'Priya Sharma',
    rent: '₹20,000',
    nextDue: 'Oct 15, 2026',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=300&q=80',
  },
  {
    id: '3',
    name: 'City Homes – C1',
    location: 'Manipal, Udupi',
    type: '2 BHK Studio Suite',
    status: 'Occupied',
    tenant: 'Rahul Kumar',
    rent: '₹25,000',
    nextDue: 'Nov 1, 2026',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80',
  },
  {
    id: '4',
    name: 'Green Villa – V4',
    location: 'Bejai, Mangalore',
    type: '4 BHK Duplex Villa',
    status: 'Vacant',
    rent: '₹40,000',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300&q=80',
  },
];

export default function PropertiesView() {
  const [filter, setFilter] = useState<'All' | 'Occupied' | 'Vacant'>('All');
  const [search, setSearch] = useState('');

  const filteredProperties = PROPERTIES_DATA.filter((p) => {
    const matchesFilter = filter === 'All' ? true : p.status === filter;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase()) ||
      (p.tenant && p.tenant.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>My Properties</Text>
          <Text style={styles.subTitle}>4 Units Total • 3 Occupied</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => Alert.alert('Add Property', 'Open Add Property modal.')}
        >
          <Feather name="plus" size={18} color={Palette.surface} />
          <Text style={styles.addButtonText}>Add Unit</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color={Palette.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search properties or residents..."
          placeholderTextColor={Palette.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={16} color={Palette.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['All', 'Occupied', 'Vacant'] as const).map((tab) => {
          const count = tab === 'All' ? 4 : tab === 'Occupied' ? 3 : 1;
          const isActive = filter === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setFilter(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Property Cards List */}
      {filteredProperties.map((prop) => (
        <View key={prop.id} style={styles.card}>
          <Image source={{ uri: prop.image }} style={styles.cardImage} />
          <View style={styles.cardBody}>
            <View style={styles.cardTopRow}>
              <View style={styles.nameLocation}>
                <Text style={styles.propertyName}>{prop.name}</Text>
                <Text style={styles.propertyLocation}>{prop.location}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  prop.status === 'Occupied' ? styles.occupiedBadge : styles.vacantBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    prop.status === 'Occupied' ? styles.occupiedText : styles.vacantText,
                  ]}
                >
                  {prop.status}
                </Text>
              </View>
            </View>

            <Text style={styles.propertyType}>{prop.type}</Text>

            <View style={styles.cardMetaRow}>
              {prop.tenant ? (
                <View style={styles.tenantInfo}>
                  <Feather name="user" size={14} color={Palette.textSecondary} />
                  <Text style={styles.tenantText}>{prop.tenant}</Text>
                </View>
              ) : (
                <View style={styles.tenantInfo}>
                  <Feather name="check-circle" size={14} color={Palette.status.active.text} />
                  <Text style={[styles.tenantText, { color: Palette.status.active.text }]}>
                    Available for Lease
                  </Text>
                </View>
              )}
              <View style={styles.rentCol}>
                <Text style={styles.rentAmount}>
                  {prop.rent} <Text style={styles.rentMo}>/mo</Text>
                </Text>
              </View>
            </View>

            <View style={styles.cardActionRow}>
              <TouchableOpacity
                style={styles.cardBtnSecondary}
                onPress={() => Alert.alert(prop.name, `Viewing details for ${prop.name}`)}
              >
                <Text style={styles.cardBtnSecondaryText}>View Lease</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardBtnPrimary}
                onPress={() => Alert.alert('Contact', `Contacting for ${prop.name}`)}
              >
                <Feather name="phone" size={14} color={Palette.surface} style={{ marginRight: 6 }} />
                <Text style={styles.cardBtnPrimaryText}>
                  {prop.status === 'Occupied' ? 'Contact Resident' : 'List on Market'}
                </Text>
              </TouchableOpacity>
            </View>
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
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.text,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  filterTextActive: {
    color: Palette.surface,
  },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: Palette.border,
  },
  cardBody: {
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameLocation: {
    flex: 1,
    marginRight: 8,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.text,
  },
  propertyLocation: {
    fontSize: 12,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  occupiedBadge: {
    backgroundColor: Palette.status.active.bg,
  },
  vacantBadge: {
    backgroundColor: Palette.status.vacant.bg,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  occupiedText: {
    color: Palette.status.active.text,
  },
  vacantText: {
    color: Palette.status.vacant.text,
  },
  propertyType: {
    fontSize: 12.5,
    color: Palette.textSecondary,
    marginTop: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  tenantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tenantText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
    marginLeft: 6,
  },
  rentCol: {
    alignItems: 'flex-end',
  },
  rentAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.text,
  },
  rentMo: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '400',
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardBtnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: Palette.surface,
  },
  cardBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  cardBtnPrimary: {
    flex: 1.3,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.surface,
  },
});
