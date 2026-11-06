import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';
import { INITIAL_APARTMENTS, ApartmentItem } from './SettingsView';

export interface PartnersViewProps {
  onBack?: () => void;
  apartments?: ApartmentItem[];
}

export interface PartnerItem {
  id: string;
  name: string;
  role: string;
  share: number;
  payout: string;
  apartment?: string;
  status?: string;
}

const INITIAL_PARTNERS: PartnerItem[] = [
  {
    id: '1',
    name: 'City Homes Realty',
    role: 'Partner · 40%',
    apartment: 'City Homes',
    share: 40,
    payout: '₹26,400',
  },
  {
    id: '2',
    name: 'Meera Nair',
    role: 'Partner · 20%',
    apartment: 'Sunrise Apartments',
    share: 20,
    payout: '₹13,200',
  },
  {
    id: '3',
    name: 'You (Owner)',
    role: 'Owner · 40%',
    apartment: 'All Properties',
    share: 40,
    payout: '₹26,400',
  },
];

export default function PartnersView({ onBack, apartments: propApartments }: PartnersViewProps) {
  const availableApartments = propApartments && propApartments.length > 0 ? propApartments : INITIAL_APARTMENTS;
  const [partners, setPartners] = useState<PartnerItem[]>(INITIAL_PARTNERS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newShare, setNewShare] = useState('');
  const [selectedApartment, setSelectedApartment] = useState(
    availableApartments.find((a) => a.isActive)?.name || availableApartments[0]?.name || 'Sunrise Apartments'
  );
  const [isAptDropdownOpen, setIsAptDropdownOpen] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleAddPartner = () => {
    if (!newName.trim() || !newShare.trim()) {
      Alert.alert('Required', 'Please enter partner name and share %');
      return;
    }
    const shareNum = parseInt(newShare, 10) || 10;
    const estimatedPayout = Math.round((66000 * shareNum) / 100);
    const newPartner: PartnerItem = {
      id: Date.now().toString(),
      name: newName.trim(),
      role: `Partner · ${shareNum}%`,
      share: shareNum,
      payout: `₹${estimatedPayout.toLocaleString('en-IN')}`,
      apartment: selectedApartment,
    };
    setPartners([...partners, newPartner]);
    setNewName('');
    setNewShare('');
    setIsAptDropdownOpen(false);
    setIsAddModalOpen(false);
    Alert.alert('Success', `Partner ${newPartner.name} added successfully.`);
  };

  return (
    <View style={styles.outerScreen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000000"
            colors={['#000000']}
          />
        }
      >
        {/* Top Header with Back button, Title, and Add button */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButtonCircle}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-left" size={22} color={Palette.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Partners</Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() => setIsAddModalOpen(true)}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Top Feature Card: Profit to share */}
        <View style={styles.profitShareCard}>
          <Text style={styles.profitShareLabel}>Profit to share · October</Text>
          <Text style={styles.profitShareAmount}>₹66,000</Text>

          {/* 3-Segment Proportional Distribution Bar */}
          <View style={styles.shareBarTrack}>
            <View style={[styles.shareBarSegment, { width: '40%', backgroundColor: Palette.primary }]} />
            <View style={[styles.shareBarSegment, { width: '20%', backgroundColor: Palette.secondary }]} />
            <View style={[styles.shareBarSegment, { width: '40%', backgroundColor: Palette.text }]} />
          </View>
        </View>

        {/* Partners List Card */}
        <View style={styles.partnersCard}>
          {partners.map((partner, index) => (
            <React.Fragment key={partner.id}>
              {index > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.partnerRow}
                activeOpacity={0.7}
                onPress={() =>
                  Alert.alert(partner.name, `${partner.role}\nEstimated Payout: ${partner.payout}`)
                }
              >
                <View style={styles.partnerLeft}>
                  <Text style={styles.partnerName}>{partner.name}</Text>
                  <Text style={styles.partnerRole}>
                    {partner.role}{partner.apartment ? ` · ${partner.apartment}` : ''}
                  </Text>
                </View>

                <View style={styles.partnerRight}>
                  <Text style={styles.partnerPayout}>{partner.payout}</Text>
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      {/* Add Partner Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="fade" onRequestClose={() => setIsAddModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsAddModalOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Revenue Partner</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              <Text style={styles.inputLabel}>Partner / Agency Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Skyline Management"
                placeholderTextColor={Palette.textMuted}
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.inputLabel}>Apartment</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                activeOpacity={0.7}
                onPress={() => setIsAptDropdownOpen((prev) => !prev)}
              >
                <Text style={styles.dropdownSelectorText}>{selectedApartment}</Text>
                <Feather
                  name={isAptDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Palette.textSecondary}
                />
              </TouchableOpacity>

              {isAptDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <ScrollView
                    style={styles.dropdownScroll}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
                    {availableApartments.map((apt) => {
                      const isSelected = selectedApartment === apt.name;
                      return (
                        <TouchableOpacity
                          key={apt.id}
                          style={[
                            styles.dropdownItem,
                            isSelected && styles.dropdownItemSelected,
                          ]}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedApartment(apt.name);
                            setIsAptDropdownOpen(false);
                          }}
                        >
                          <View style={styles.dropdownItemContent}>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                isSelected && styles.dropdownItemTextSelected,
                              ]}
                            >
                              {apt.name}
                            </Text>
                            {apt.location ? (
                              <Text style={styles.dropdownItemSubText}>
                                {apt.location}
                              </Text>
                            ) : null}
                          </View>
                          {isSelected && (
                            <Feather name="check" size={16} color={Palette.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Profit Share Percentage (%)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 15"
                placeholderTextColor={Palette.textMuted}
                keyboardType="numeric"
                value={newShare}
                onChangeText={setNewShare}
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsAddModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAddPartner}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveButtonText}>Add Partner</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerScreen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 110,
    backgroundColor: Palette.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Palette.text,
    letterSpacing: 0.3,
    ...Platform.select({
      ios: { fontFamily: 'Georgia' },
      android: { fontFamily: 'serif' },
      default: { fontFamily: 'serif' },
    }),
  },
  addButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addButtonText: {
    color: Palette.surface,
    fontWeight: '700',
    fontSize: 14,
  },
  profitShareCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  profitShareLabel: {
    fontSize: 13,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  profitShareAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 14,
  },
  shareBarTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  shareBarSegment: {
    height: '100%',
  },
  partnersCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  partnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  partnerLeft: {
    flex: 1,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 3,
  },
  partnerRole: {
    fontSize: 13,
    color: Palette.textSecondary,
  },
  partnerRight: {
    alignItems: 'flex-end',
  },
  partnerPayout: {
    fontSize: 15.5,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 4,
  },
  activeBadge: {
    backgroundColor: Palette.status.active.bg,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeBadgeText: {
    color: Palette.status.active.text,
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(46, 39, 34, 0.5)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    backgroundColor: Palette.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.text,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.text,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surface,
  },
  cancelButtonText: {
    color: Palette.textSecondary,
    fontWeight: '600',
    fontSize: 13.5,
  },
  saveButton: {
    backgroundColor: Palette.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  saveButtonText: {
    color: Palette.surface,
    fontWeight: '700',
    fontSize: 13.5,
  },
  dropdownSelector: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownSelectorText: {
    fontSize: 14,
    color: Palette.text,
    fontWeight: '500',
  },
  dropdownMenu: {
    marginTop: 4,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 140,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  dropdownItemSelected: {
    backgroundColor: Palette.background,
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 13.5,
    color: Palette.text,
    fontWeight: '600',
  },
  dropdownItemTextSelected: {
    color: Palette.primary,
    fontWeight: '700',
  },
  dropdownItemSubText: {
    fontSize: 11.5,
    color: Palette.textSecondary,
    marginTop: 2,
  },
});
