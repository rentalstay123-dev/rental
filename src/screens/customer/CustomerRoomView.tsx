import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../../constants/theme';
import { useCustomerData } from '../../context/CustomerDataContext';

interface CustomerRoomViewProps {
  onBack?: () => void;
  showBackButton?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'RS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatWhatsAppDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export default function CustomerRoomView({
  onBack,
  showBackButton = false,
}: CustomerRoomViewProps) {
  const { data, refreshWorkspace } = useCustomerData();
  const { room, profile, leaseInfo, ownerContact, rentMeta } = data;

  const [refreshing, setRefreshing] = useState(false);
  const [contactNotice, setContactNotice] = useState<string | null>(null);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const statusColors =
    room.status === 'Rent due' ? Palette.status.due : Palette.status.occupied;

  const handleCall = (phone: string, label: string) => {
    const digits = phone.replace(/[^\d+]/g, '');
    if (!digits) return;
    void Linking.openURL(`tel:${digits}`).catch(() => {
      setContactNotice(`Call ${label}: ${phone}`);
    });
  };

  const handleWhatsApp = (phone: string, label: string) => {
    const digits = formatWhatsAppDigits(phone);
    if (!digits) return;
    void Linking.openURL(`https://wa.me/${digits}`).catch(() => {
      setContactNotice(`WhatsApp ${label}: ${phone}`);
    });
  };

  const furnishings = room.furnishings ?? [
    'Bed & Mattress',
    'Wardrobe',
    'Modular Kitchen',
    'Geyser',
    'Ceiling Fans',
  ];

  return (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Palette.primary}
          colors={[Palette.primary]}
        />
      }
    >
      <View style={styles.contentWrapper}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          {onBack ? (
            <TouchableOpacity
              style={styles.backButtonCircle}
              onPress={onBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
            >
              <Feather
                name="chevron-left"
                size={Typography.iconSize.base}
                color={Palette.primary}
              />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.headerTitle}>Room</Text>
        </View>

        {contactNotice ? (
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeBannerText}>{contactNotice}</Text>
            <TouchableOpacity onPress={() => setContactNotice(null)}>
              <Text style={styles.noticeDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Room Overview Card */}
        <View style={styles.heroCard}>
          <View style={styles.roomTopRow}>
            <View style={styles.roomTitleCol}>
              <Text style={styles.roomNumber}>{room.roomNumber}</Text>
              <Text style={styles.roomWing}>
                {room.wing} · {profile.propertyName}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                {room.status}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.financialSummaryRow}>
            <View style={styles.financialCol}>
              <Text style={styles.metaLabel}>Monthly Rent</Text>
              <Text style={styles.metaPrimaryValue}>{room.monthlyRent}</Text>
            </View>
            <View style={styles.financialCol}>
              <Text style={styles.metaLabel}>Maintenance</Text>
              <Text style={styles.metaValue}>{rentMeta.maintenanceAmount}</Text>
            </View>
            <View style={styles.financialCol}>
              <Text style={styles.metaLabel}>Deposit</Text>
              <Text style={styles.metaValue}>{room.depositAmount}</Text>
            </View>
          </View>
        </View>

        {/* Room Specifications */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>SPECIFICATIONS</Text>
          <View style={styles.specsGrid}>
            <View style={styles.specBox}>
              <Text style={styles.specValue}>{room.type}</Text>
              <Text style={styles.specLabel}>Configuration</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specValue}>{room.furnished || 'Semi-Furnished'}</Text>
              <Text style={styles.specLabel}>Furnishing</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specValue}>{room.bookingType || 'Family'}</Text>
              <Text style={styles.specLabel}>Occupancy</Text>
            </View>
          </View>

          <View style={styles.countPillsRow}>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>
                {room.bathrooms ?? 2} {(room.bathrooms ?? 2) === 1 ? 'Bathroom' : 'Bathrooms'}
              </Text>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>
                {room.balconies ?? 2} {(room.balconies ?? 2) === 1 ? 'Balcony' : 'Balconies'}
              </Text>
            </View>
          </View>
        </View>

        {/* Furnishings & Amenities */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>INCLUDED FURNISHINGS</Text>
          <View style={styles.chipWrap}>
            {furnishings.map((item) => (
              <View key={item} style={styles.amenityChip}>
                <Feather name="check" size={13} color={Palette.primary} />
                <Text style={styles.amenityChipText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Residents / Co-occupants */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>RESIDENTS ({room.members.length})</Text>
            <Text style={styles.joinedMeta}>Moved in {room.joinedDate || leaseInfo.startDate}</Text>
          </View>

          {room.members.map((member, idx) => {
            const isLast = idx === room.members.length - 1;
            return (
              <React.Fragment key={member.id}>
                <View style={styles.memberRow}>
                  {member.imageUri ? (
                    <Image source={{ uri: member.imageUri }} style={styles.memberAvatar} />
                  ) : (
                    <View style={styles.memberAvatarPlaceholder}>
                      <Text style={styles.memberInitials}>{getInitials(member.name)}</Text>
                    </View>
                  )}
                  <View style={styles.memberTextCol}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberRole}>
                      {member.role} · {member.phone}
                    </Text>
                    {member.documentName ? (
                      <View style={styles.docBadgeRow}>
                        <Feather name="file-text" size={11} color={Palette.primary} />
                        <Text style={styles.docBadgeText} numberOfLines={1}>
                          {member.documentName}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                {!isLast ? <View style={styles.divider} /> : null}
              </React.Fragment>
            );
          })}
        </View>

        {/* Owner & Caretaker Contacts */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>PROPERTY CONTACTS</Text>

          <View style={styles.contactRow}>
            <View style={styles.contactIconTile}>
              <Feather name="user" size={16} color={Palette.primary} />
            </View>
            <View style={styles.contactTextCol}>
              <Text style={styles.contactName}>{ownerContact.name}</Text>
              <Text style={styles.contactSub}>Property Owner · {ownerContact.phone}</Text>
            </View>
            <View style={styles.contactActions}>
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={() => handleCall(ownerContact.phone, ownerContact.name)}
                accessibilityLabel="Call owner"
              >
                <Feather name="phone" size={15} color={Palette.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={() => handleWhatsApp(ownerContact.phone, ownerContact.name)}
                accessibilityLabel="WhatsApp owner"
              >
                <Feather name="message-circle" size={15} color={Palette.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.contactRow}>
            <View style={styles.contactIconTile}>
              <Feather name="shield" size={16} color={Palette.primary} />
            </View>
            <View style={styles.contactTextCol}>
              <Text style={styles.contactName}>{ownerContact.caretakerName}</Text>
              <Text style={styles.contactSub}>Caretaker / Security · {ownerContact.caretakerPhone}</Text>
            </View>
            <View style={styles.contactActions}>
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={() => handleCall(ownerContact.caretakerPhone, ownerContact.caretakerName)}
                accessibilityLabel="Call caretaker"
              >
                <Feather name="phone" size={15} color={Palette.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.3,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 10,
  },
  noticeBannerText: {
    flex: 1,
    fontSize: Typography.fontSize.caption,
    color: Palette.text,
    fontWeight: '600',
  },
  noticeDismissText: {
    fontSize: Typography.fontSize.caption,
    color: Palette.primary,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 18,
    marginBottom: 14,
  },
  roomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  roomTitleCol: {
    flex: 1,
  },
  roomNumber: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.3,
  },
  roomWing: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  statusBadge: {
    paddingVertical: 1,
  },
  statusBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Palette.divider,
    marginVertical: 12,
  },
  financialSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  financialCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginBottom: 2,
  },
  metaPrimaryValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
    color: Palette.primary,
  },
  metaValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
  },
  sectionCard: {
    backgroundColor: Palette.surface,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.accentText,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  joinedMeta: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginBottom: 12,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specBox: {
    flex: 1,
    minWidth: 95,
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 12,
  },
  specValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  specLabel: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  countPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  countPill: {
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countPillText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.primary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  amenityChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Palette.text,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    marginRight: 12,
    backgroundColor: Palette.iconBg,
  },
  memberAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitials: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '800',
    color: Palette.primary,
  },
  memberTextCol: {
    flex: 1,
  },
  memberName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  memberRole: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  docBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  docBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.primary,
    flexShrink: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  contactIconTile: {
    width: 36,
    height: 36,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactTextCol: {
    flex: 1,
    marginRight: 8,
  },
  contactName: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  contactSub: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

