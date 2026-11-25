import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Image,
  Modal,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../../constants/theme';
import { useCustomerData } from '../../context/CustomerDataContext';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface CustomerRulesAndDocsViewProps {
  onBack?: () => void;
  showBackButton?: boolean;
}

type TabFilter = 'All' | 'Agreement' | 'Rules';

export default function CustomerRulesAndDocsView({
  onBack,
  showBackButton = false,
}: CustomerRulesAndDocsViewProps) {
  const { data, refreshWorkspace } = useCustomerData();
  const { profile, room, ownerContact, leaseInfo } = data;
  const rules = data.rules ?? [];

  const [activeTab, setActiveTab] = useState<TabFilter>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [fullViewImageUri, setFullViewImageUri] = useState<string | null>(null);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const handleDownloadAgreement = async () => {
    setIsDownloading(true);
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Residential Lease Agreement</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #17121D; }
              h1 { color: #4B0082; font-size: 24px; margin-bottom: 4px; }
              .ref { color: #000000; font-size: 13px; margin-bottom: 24px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
              .card { background: #FAF6FE; border: 1px solid #E6DFEC; border-radius: 6px; padding: 12px; }
              .label { font-size: 11px; color: #000000; font-weight: 600; text-transform: uppercase; }
              .val { font-size: 15px; font-weight: 700; color: #17121D; margin-top: 4px; }
              .parties { background: #F8F5FC; border: 1px solid #E6DFEC; border-radius: 6px; padding: 14px; margin-bottom: 24px; line-height: 1.6; }
              h2 { font-size: 14px; color: #4B0082; margin-top: 20px; border-bottom: 1px solid #ECE7F1; padding-bottom: 6px; }
              p { font-size: 13px; line-height: 1.5; color: #17121D; }
              .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #ECE7F1; font-size: 11px; color: #000000; text-align: center; }
            </style>
          </head>
          <body>
            <h1>Residential Lease Agreement</h1>
            <div class="ref">Ref: AGR-2026-${escapeHtml(room.roomNumber.replace(/\s+/g, ''))} · Active & Registered · ${escapeHtml(profile.propertyName)}</div>

            <div class="grid">
              <div class="card">
                <div class="label">Unit / Room</div>
                <div class="val">${escapeHtml(room.roomNumber)}</div>
              </div>
              <div class="card">
                <div class="label">Monthly Rent</div>
                <div class="val">${escapeHtml(room.monthlyRent)}</div>
              </div>
              <div class="card">
                <div class="label">Security Deposit</div>
                <div class="val">${escapeHtml(room.depositAmount)}</div>
              </div>
              <div class="card">
                <div class="label">Lease Duration</div>
                <div class="val">${escapeHtml(String(leaseInfo.totalMonths || 11))} Months</div>
              </div>
            </div>

            <div class="parties">
              <div><strong>Tenant:</strong> ${escapeHtml(profile.fullName)} (${escapeHtml(profile.phone)})</div>
              <div><strong>Owner:</strong> ${escapeHtml(ownerContact.name)} (${escapeHtml(ownerContact.phone)})</div>
              <div><strong>Lease Term:</strong> ${escapeHtml(leaseInfo.startDate)} to ${escapeHtml(leaseInfo.endDate)}</div>
              <div><strong>Notice Period:</strong> ${escapeHtml(String(leaseInfo.noticePeriodDays || 30))} Days</div>
              <div><strong>Rent Cycle:</strong> Day ${escapeHtml(leaseInfo.rentCycleDay || '1')} of each calendar month</div>
            </div>

            <h2>Key Terms & Obligations</h2>
            <p><strong>1. Premises:</strong> The property is leased strictly for residential occupation by the registered tenant.</p>
            <p><strong>2. Rent & Utilities:</strong> Rent is payable by the due date. The tenant agrees to settle room electricity and maintenance as scheduled.</p>
            <p><strong>3. Deposit:</strong> The security deposit is refundable upon peaceful handover after deduction of unpaid dues or property damages.</p>
            <p><strong>4. Termination:</strong> Either party may terminate by serving the agreed written notice period.</p>
            <p><strong>5. House Rules:</strong> The tenant agrees to observe community quiet hours, cleanliness standards, and building security rules.</p>

            <div class="footer">
              Generated via Luvora Resident Portal · Verified Digital Copy
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Agreement PDF',
            UTI: 'com.adobe.pdf',
          });
        }
      }
      setDownloadSuccess(true);
    } catch {
      // Handled gracefully
    } finally {
      setIsDownloading(false);
    }
  };

  const showAgreement = activeTab === 'All' || activeTab === 'Agreement';
  const showRules = activeTab === 'All' || activeTab === 'Rules';

  return (
    <View style={styles.outerScreen}>
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
            <View style={styles.headerLeft}>
              {(showBackButton || onBack) && onBack ? (
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
                    size={Typography.iconSize.header}
                    color={Palette.primary}
                  />
                </TouchableOpacity>
              ) : null}
              <Text style={styles.headerTitle}>Policy</Text>
            </View>
          </View>

          {/* Segmented Filter Switcher */}
          <View style={styles.tabFilterRow}>
            {(['All', 'Agreement', 'Rules'] as TabFilter[]).map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 1. Agreement Section */}
          {showAgreement ? (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Tenancy Agreement</Text>
              </View>

              <View style={styles.agreementCard}>
                <View style={styles.agreementTopRow}>
                  <View style={styles.agreementTitleCol}>
                    <Text style={styles.agreementTitle}>Residential Lease Agreement</Text>
                  </View>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>Active</Text>
                  </View>
                </View>

                {/* Key Agreement Terms Grid */}
                <View style={styles.termsGrid}>
                  <View style={styles.termBox}>
                    <Text style={styles.termLabel}>Monthly Rent</Text>
                    <Text style={styles.termValue}>{room.monthlyRent}</Text>
                  </View>
                  <View style={styles.termBox}>
                    <Text style={styles.termLabel}>Security Deposit</Text>
                    <Text style={styles.termValue}>{room.depositAmount}</Text>
                  </View>
                  <View style={styles.termBox}>
                    <Text style={styles.termLabel}>Lease Duration</Text>
                    <Text style={styles.termValue}>
                      {leaseInfo.totalMonths || 11} Months
                    </Text>
                  </View>
                  <View style={styles.termBox}>
                    <Text style={styles.termLabel}>Notice Period</Text>
                    <Text style={styles.termValue}>
                      {leaseInfo.noticePeriodDays || 30} Days
                    </Text>
                  </View>
                </View>

                <View style={styles.agreementParties}>
                  <Text style={styles.partyText}>
                    <Text style={styles.partyLabel}>Tenant: </Text>
                    {profile.fullName}
                  </Text>
                  <Text style={styles.partyText}>
                    <Text style={styles.partyLabel}>Owner: </Text>
                    {ownerContact.name} ({ownerContact.phone})
                  </Text>
                  <Text style={styles.partyText}>
                    <Text style={styles.partyLabel}>Valid Period: </Text>
                    {leaseInfo.startDate} to {leaseInfo.endDate}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.downloadAgreementBtn, isDownloading && { opacity: 0.7 }]}
                  onPress={() => void handleDownloadAgreement()}
                  disabled={isDownloading}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Download"
                >
                  <Text style={styles.downloadAgreementText}>
                    {isDownloading
                      ? 'Downloading...'
                      : downloadSuccess
                      ? 'Downloaded ✓'
                      : 'Download '}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* 2. Rules Section */}
          {showRules ? (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>House Rules</Text>
              </View>

              {rules.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No rules published</Text>
                </View>
              ) : (
                rules.map((rule) => {
                  const isMandatory = rule.enforcementLevel === 'Mandatory';
                  return (
                    <View key={rule.id} style={styles.ruleCard}>
                      <View style={styles.ruleTopRow}>
                        <Text style={styles.ruleCategory}>{rule.category}</Text>
                        {rule.enforcementLevel ? (
                          <View
                            style={[
                              styles.levelBadge,
                              isMandatory && styles.levelBadgeMandatory,
                            ]}
                          >
                            <Text
                              style={[
                                styles.levelBadgeText,
                                isMandatory && styles.levelBadgeTextMandatory,
                              ]}
                            >
                              {rule.enforcementLevel}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.ruleTitle}>{rule.title}</Text>
                      <Text style={styles.ruleSummary}>{rule.summary}</Text>

                      {rule.imageUri ? (
                        <TouchableOpacity
                          style={styles.ruleImageWrapper}
                          activeOpacity={0.88}
                          onPress={() => setFullViewImageUri(rule.imageUri!)}
                          accessibilityRole="button"
                          accessibilityLabel="Open rule image in full view"
                        >
                          <Image
                            source={{ uri: rule.imageUri }}
                            style={styles.ruleImage}
                            resizeMode="cover"
                          />
                          <View style={styles.imageTapHint}>
                            <Feather name="maximize-2" size={13} color="#F8F5FC" style={{ marginRight: 4 }} />
                            <Text style={styles.imageTapHintText}>Tap to view full</Text>
                          </View>
                        </TouchableOpacity>
                      ) : null}

                      {rule.details ? (
                        <Text style={styles.ruleDetails}>{rule.details}</Text>
                      ) : null}

                      {rule.timing ? (
                        <View style={styles.timingRow}>
                          <Text style={styles.timingLabel}>Schedule / Hours:</Text>
                          <Text style={styles.timingValue}>{rule.timing}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Full-view Rule Image Modal */}
      <Modal
        visible={!!fullViewImageUri}
        transparent
        animationType="fade"
        onRequestClose={() => setFullViewImageUri(null)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerBackdrop}
            activeOpacity={1}
            onPress={() => setFullViewImageUri(null)}
          />

          <View style={styles.imageViewerHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="image" size={18} color="#F8F5FC" style={{ marginRight: 8 }} />
              <Text style={styles.imageViewerTitle}>House Rule Notice</Text>
            </View>
            <TouchableOpacity
              style={styles.imageViewerCloseBtn}
              onPress={() => setFullViewImageUri(null)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close image viewer"
            >
              <Feather name="x" size={20} color="#F8F5FC" />
            </TouchableOpacity>
          </View>

          <View style={styles.imageViewerBody}>
            {fullViewImageUri ? (
              <Image
                source={{ uri: fullViewImageUri }}
                style={styles.imageViewerImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerScreen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  scrollView: {
    flex: 1,
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
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  tabFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.text,
  },
  filterChipTextActive: {
    color: Palette.onPrimary,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '800',
    color: Palette.text,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  agreementCard: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 16,
    marginBottom: 10,
  },
  agreementTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  agreementBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Palette.primary,
  },
  agreementBadgeText: {
    color: Palette.onPrimary,
    fontSize: 10,
    fontWeight: '800',
  },
  agreementTitleCol: {
    flex: 1,
  },
  agreementTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  agreementRef: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  activePill: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  activePillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.status.paid.text,
  },
  termsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 10,
    marginBottom: 12,
  },
  termBox: {
    width: '48%',
    paddingVertical: 4,
  },
  termLabel: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  termValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
  },
  agreementParties: {
    gap: 4,
  },
  partyText: {
    fontSize: Typography.fontSize.xs,
    color: Palette.text,
  },
  partyLabel: {
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  downloadAgreementBtn: {
    backgroundColor: Palette.primary,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  downloadAgreementText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
  },
  ruleCard: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 14,
    marginBottom: 10,
  },
  ruleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ruleCategory: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.primary,
  },
  levelBadge: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  levelBadgeMandatory: {
    backgroundColor: 'transparent',
  },
  levelBadgeText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  levelBadgeTextMandatory: {
    color: Palette.status.overdue.text,
  },
  ruleTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 4,
  },
  ruleSummary: {
    fontSize: Typography.fontSize.xs,
    color: Palette.text,
    lineHeight: 18,
  },
  ruleDetails: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    lineHeight: 17,
    marginTop: 6,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  timingLabel: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '600',
    color: Palette.textMuted,
  },
  timingValue: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.primary,
  },
  emptyCard: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingVertical: 32,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  ruleImageWrapper: {
    marginTop: 8,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: Palette.tint,
    position: 'relative',
  },
  ruleImage: {
    width: '100%',
    height: 160,
    borderRadius: 5,
  },
  imageTapHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  imageTapHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F8F5FC',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'space-between',
  },
  imageViewerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 12,
    zIndex: 10,
  },
  imageViewerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: '#F8F5FC',
  },
  imageViewerCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 5,
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
});
