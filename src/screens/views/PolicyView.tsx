import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Alert,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Typography } from '../../constants/theme';
import { useAppData } from '../../context/AppDataContext';
import { createInitialPropertyRules } from '../../constants/customerInitialData';
import type { PropertyRule } from '../../types/appData';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const STORAGE_KEY_ADMIN_RULES = '@luvora_admin_rules';
const STORAGE_KEY_ROOM_AGREEMENTS = '@luvora_room_agreements';

export interface RoomAgreementRecord {
  id: string;
  roomNumber: string;
  residentName: string;
  fileName: string;
  fileSize?: string;
  fileUri?: string;
  uploadedAt: string;
  status: 'Active' | 'Pending';
}

type TabFilter = 'Agreement' | 'Rules';

interface PolicyViewProps {
  onBack?: () => void;
}

export default function PolicyView({ onBack }: PolicyViewProps) {
  const insets = useSafeAreaInsets();
  const { profile, settings, rooms, refreshWorkspace } = useAppData();

  // Tab: only 'Agreement' and 'Rules' ('All' removed)
  const [activeTab, setActiveTab] = useState<TabFilter>('Agreement');
  const [rules, setRules] = useState<PropertyRule[]>([]);
  const [agreements, setAgreements] = useState<RoomAgreementRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Agreement Upload Form State
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('');
  const [isRoomPickerOpen, setIsRoomPickerOpen] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [pickedPdf, setPickedPdf] = useState<{
    name: string;
    size?: string;
    uri: string;
  } | null>(null);
  const [agreementFormError, setAgreementFormError] = useState<string | null>(null);
  const [isSubmittingAgreement, setIsSubmittingAgreement] = useState(false);

  // Add Rule Modal State (Only Upload Image + Submit)
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [ruleImageUri, setRuleImageUri] = useState<string | null>(null);
  const [ruleFormError, setRuleFormError] = useState<string | null>(null);

  // Full-view Rule Image Modal State
  const [fullViewImageUri, setFullViewImageUri] = useState<string | null>(null);

  // Expanded rule details
  const [expandedRuleIds, setExpandedRuleIds] = useState<Record<string, boolean>>({});

  // Load rules & agreements from AsyncStorage
  useEffect(() => {
    async function loadData() {
      // 1. Load Rules
      try {
        const storedRules = await AsyncStorage.getItem(STORAGE_KEY_ADMIN_RULES);
        if (storedRules) {
          const parsed = JSON.parse(storedRules) as PropertyRule[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRules(parsed);
          } else {
            setRules(createInitialPropertyRules());
          }
        } else {
          setRules(createInitialPropertyRules());
        }
      } catch {
        setRules(createInitialPropertyRules());
      }

      // 2. Load Agreements
      try {
        const storedAgr = await AsyncStorage.getItem(STORAGE_KEY_ROOM_AGREEMENTS);
        if (storedAgr) {
          const parsedAgr = JSON.parse(storedAgr) as RoomAgreementRecord[];
          if (Array.isArray(parsedAgr)) {
            setAgreements(parsedAgr);
          }
        } else {
          // Default initial record
          const initialAgr: RoomAgreementRecord[] = [
            {
              id: 'agr-sample-1',
              roomNumber: 'Room 102',
              residentName: 'Priya Sharma',
              fileName: 'Residential_Lease_Agreement_Room102.pdf',
              fileSize: '1.8 MB',
              uploadedAt: '01 Mar 2026',
              status: 'Active',
            },
          ];
          setAgreements(initialAgr);
          await AsyncStorage.setItem(STORAGE_KEY_ROOM_AGREEMENTS, JSON.stringify(initialAgr));
        }
      } catch {
        // Fallback silently
      }
    }
    void loadData();
  }, []);

  const saveRulesToStorage = useCallback(async (newRules: PropertyRule[]) => {
    try {
      setRules(newRules);
      await AsyncStorage.setItem(STORAGE_KEY_ADMIN_RULES, JSON.stringify(newRules));
    } catch {
      // Handled silently
    }
  }, []);

  const saveAgreementsToStorage = useCallback(async (newAgreements: RoomAgreementRecord[]) => {
    try {
      setAgreements(newAgreements);
      await AsyncStorage.setItem(STORAGE_KEY_ROOM_AGREEMENTS, JSON.stringify(newAgreements));
    } catch {
      // Handled silently
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  // Derived owner info
  const propertyName = profile.propertyName || 'Sunrise Enclave';
  const ownerName = profile.fullName || 'Rajesh Kumar';
  const ownerPhone = profile.phone || '+91 98765 43210';
  const ownerEmail = profile.email || 'owner@luvora.com';
  const paymentDetails = profile.bankName
    ? `${profile.bankName} · A/C ${profile.accountNumber || '••••9821'}`
    : 'HDFC Bank · UPI: luvora.sunrise@hdfcbank';

  const defaultRent = useMemo(() => {
    if (rooms.length > 0 && rooms[0]?.monthlyRent) {
      return rooms[0].monthlyRent;
    }
    return '₹9,000';
  }, [rooms]);

  const defaultDeposit = useMemo(() => {
    if (rooms.length > 0 && rooms[0]?.depositAmount) {
      return rooms[0].depositAmount;
    }
    return '₹18,000';
  }, [rooms]);

  // Helper to determine if an agreement was already added for a room
  const isRoomAgreementAdded = useCallback(
    (roomNum: string, currentAgreements: RoomAgreementRecord[] = agreements) => {
      const cleanDigits = roomNum.replace(/[^0-9]/g, '');
      const cleanLower = roomNum.toLowerCase().trim();
      return currentAgreements.some((agr) => {
        const agrDigits = agr.roomNumber.replace(/[^0-9]/g, '');
        const agrLower = agr.roomNumber.toLowerCase().trim();
        if (cleanDigits && agrDigits && cleanDigits === agrDigits) return true;
        return agrLower === cleanLower;
      });
    },
    [agreements]
  );

  const { availableRooms, addedRooms } = useMemo(() => {
    const avail: typeof rooms = [];
    const added: typeof rooms = [];
    rooms.forEach((r) => {
      if (isRoomAgreementAdded(r.roomNumber)) {
        added.push(r);
      } else {
        avail.push(r);
      }
    });
    return { availableRooms: avail, addedRooms: added };
  }, [rooms, isRoomAgreementAdded]);

  // Derive effective selected room: if user picked one and it has no agreement, use it; otherwise pick the first available room without an agreement
  const effectiveSelectedRoomNumber = useMemo(() => {
    if (selectedRoomNumber && !isRoomAgreementAdded(selectedRoomNumber)) {
      return selectedRoomNumber;
    }
    return availableRooms[0]?.roomNumber || '';
  }, [selectedRoomNumber, isRoomAgreementAdded, availableRooms]);

  const selectedRoomMemberName = useMemo(() => {
    if (!effectiveSelectedRoomNumber) return '';
    const cleanDigits = effectiveSelectedRoomNumber.replace(/[^0-9]/g, '');
    const cleanLower = effectiveSelectedRoomNumber.toLowerCase().trim();
    const matched = rooms.find((r) => {
      const rDigits = r.roomNumber.replace(/[^0-9]/g, '');
      const rLower = r.roomNumber.toLowerCase().trim();
      if (cleanDigits && rDigits && cleanDigits === rDigits) return true;
      return rLower === cleanLower;
    });
    return matched?.members?.[0]?.name || 'Available';
  }, [rooms, effectiveSelectedRoomNumber]);

  const filteredAvailableRooms = useMemo(() => {
    const query = roomSearchQuery.toLowerCase().trim();
    if (!query) return availableRooms;
    return availableRooms.filter(
      (r) =>
        r.roomNumber.toLowerCase().includes(query) ||
        r.members?.some((m) => m.name.toLowerCase().includes(query))
    );
  }, [availableRooms, roomSearchQuery]);

  const filteredAddedRooms = useMemo(() => {
    const query = roomSearchQuery.toLowerCase().trim();
    if (!query) return addedRooms;
    return addedRooms.filter(
      (r) =>
        r.roomNumber.toLowerCase().includes(query) ||
        r.members?.some((m) => m.name.toLowerCase().includes(query))
    );
  }, [addedRooms, roomSearchQuery]);

  // 1. PDF File Picker for Agreement
  const handlePickAgreementPdf = async () => {
    setAgreementFormError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const sizeFormatted = file.size
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : 'PDF Document';
        setPickedPdf({
          name: file.name,
          size: sizeFormatted,
          uri: file.uri,
        });
      }
    } catch {
      Alert.alert('File Picker', 'Could not access file picker. Please try again.');
    }
  };

  // 2. Submit Agreement for selected room
  const handleSubmitAgreement = async () => {
    if (!effectiveSelectedRoomNumber) {
      setAgreementFormError('Please select a room number.');
      return;
    }
    if (isRoomAgreementAdded(effectiveSelectedRoomNumber)) {
      setAgreementFormError(`An agreement for ${effectiveSelectedRoomNumber} has already been uploaded.`);
      return;
    }
    if (!pickedPdf) {
      setAgreementFormError('Please upload an agreement in PDF format.');
      return;
    }

    setIsSubmittingAgreement(true);
    setAgreementFormError(null);

    try {
      const matchedRoom = rooms.find(
        (r) =>
          r.roomNumber === effectiveSelectedRoomNumber ||
          r.roomNumber === `Room ${effectiveSelectedRoomNumber}` ||
          r.roomNumber.replace(/[^0-9]/g, '') === effectiveSelectedRoomNumber.replace(/[^0-9]/g, '')
      );
      const residentName = matchedRoom?.members?.[0]?.name || 'Resident';

      const newRecord: RoomAgreementRecord = {
        id: `agr-${Date.now()}`,
        roomNumber: effectiveSelectedRoomNumber.startsWith('Room') ? effectiveSelectedRoomNumber : `Room ${effectiveSelectedRoomNumber}`,
        residentName,
        fileName: pickedPdf.name,
        fileSize: pickedPdf.size,
        fileUri: pickedPdf.uri,
        uploadedAt: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        status: 'Active',
      };

      const filtered = agreements.filter((a) => a.roomNumber !== newRecord.roomNumber);
      const nextAgreements = [newRecord, ...filtered];
      await saveAgreementsToStorage(nextAgreements);

      setPickedPdf(null);

      // Advance to next room that still needs an agreement
      const remainingRooms = rooms.filter((r) => !isRoomAgreementAdded(r.roomNumber, nextAgreements));
      setSelectedRoomNumber(remainingRooms[0]?.roomNumber || '');

      setStatusNotice(`Agreement submitted successfully for ${newRecord.roomNumber}!`);
      setTimeout(() => setStatusNotice(null), 3500);
    } catch {
      setAgreementFormError('Failed to save agreement. Please try again.');
    } finally {
      setIsSubmittingAgreement(false);
    }
  };

  // Download Agreement PDF
  const handleDownloadAgreementPdf = async (agr: RoomAgreementRecord) => {
    if (agr.fileUri && (await Sharing.isAvailableAsync())) {
      try {
        await Sharing.shareAsync(agr.fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Download Agreement - ${agr.roomNumber}`,
          UTI: 'com.adobe.pdf',
        });
        return;
      } catch {
        // Fallback to template generator
      }
    }
    // Fallback template download
    await handleDownloadTemplatePdf();
  };

  // 3. Image Picker for Rule
  const handlePickRuleImage = async () => {
    setRuleFormError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setRuleImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Image Picker', 'Could not open image library.');
    }
  };

  // 4. Save New Rule (Only Upload Image + Submit)
  const handleSaveNewRule = async () => {
    if (!ruleImageUri) {
      setRuleFormError('Please upload an image for the rule.');
      return;
    }

    const savedImage = ruleImageUri;

    const newRule: PropertyRule = {
      id: `rule-${Date.now()}`,
      category: 'General',
      title: 'Property Notice & Guidelines',
      summary: 'Attached photo notice',
      enforcementLevel: 'Standard',
      imageUri: savedImage,
    };

    const nextRules = [newRule, ...rules];
    await saveRulesToStorage(nextRules);

    // Reset Form
    setRuleImageUri(null);
    setRuleFormError(null);
    setIsAddRuleModalOpen(false);

    // Automatically open image in full view after adding
    setFullViewImageUri(savedImage);

    setStatusNotice('Rule image added successfully.');
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleDeleteRule = (ruleId: string, ruleTitleStr: string) => {
    Alert.alert('Remove Rule', `Are you sure you want to remove "${ruleTitleStr}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const nextRules = rules.filter((r) => r.id !== ruleId);
          void saveRulesToStorage(nextRules);
        },
      },
    ]);
  };

  const toggleExpandRule = (id: string) => {
    setExpandedRuleIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Download Blank Agreement Template PDF
  const handleDownloadTemplatePdf = async () => {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Residential Tenancy Lease Template - ${escapeHtml(propertyName)}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 36px; color: #17121D; line-height: 1.5; }
              .header { text-align: center; border-bottom: 2px solid #4B0082; padding-bottom: 12px; margin-bottom: 20px; }
              h1 { color: #4B0082; font-size: 20px; margin: 0 0 4px 0; text-transform: uppercase; }
              .meta-box { background: #FAF6FE; border: 1px solid #E6DFEC; border-radius: 5px; padding: 14px; margin-bottom: 20px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              .field-label { color: #000000; font-weight: 600; text-transform: uppercase; font-size: 10px; }
              .field-value { font-weight: 700; color: #17121D; font-size: 13px; margin-top: 2px; }
              h2 { color: #4B0082; font-size: 14px; margin-top: 20px; margin-bottom: 6px; border-bottom: 1px solid #ECE7F1; padding-bottom: 4px; }
              p, li { font-size: 12px; color: #2D2735; margin: 4px 0; }
              .signatures { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
              .sig-block { border-top: 1px dashed #000000; padding-top: 6px; text-align: center; font-size: 11px; }
              .footer { margin-top: 36px; text-align: center; font-size: 10px; color: #000000; border-top: 1px solid #ECE7F1; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Residential Tenancy Lease Agreement</h1>
              <p style="font-size: 12px; color: #000000; margin: 0;">${escapeHtml(propertyName)} · Master Template</p>
            </div>
            <div class="meta-box">
              <div class="grid">
                <div><div class="field-label">Landlord</div><div class="field-value">${escapeHtml(ownerName)}</div></div>
                <div><div class="field-label">Contact</div><div class="field-value">${escapeHtml(ownerPhone)}</div></div>
                <div><div class="field-label">Email</div><div class="field-value">${escapeHtml(ownerEmail)}</div></div>
                <div><div class="field-label">Payment / Bank</div><div class="field-value">${escapeHtml(paymentDetails)}</div></div>
                <div><div class="field-label">Monthly Rent</div><div class="field-value">${escapeHtml(defaultRent)}</div></div>
                <div><div class="field-label">Security Deposit</div><div class="field-value">${escapeHtml(defaultDeposit)}</div></div>
                <div><div class="field-label">Rent Cycle</div><div class="field-value">Day ${escapeHtml(settings.rentCycleDay || '1')} of each Month</div></div>
                <div><div class="field-label">Notice Period</div><div class="field-value">30 Days Written Notice</div></div>
              </div>
            </div>
            <h2>Standard Terms</h2>
            <p>1. <strong>Premises:</strong> Exclusively for peaceful residential occupation by registered resident(s).</p>
            <p>2. <strong>Rent & Deposit:</strong> Rent payable by the due cycle day. Deposit refundable upon peaceful move-out after dues settlement.</p>
            <p>3. <strong>House Rules:</strong> Strict adherence to building quiet hours, gate closure, and cleanliness discipline.</p>
            <div class="signatures">
              <div class="sig-block"><strong>${escapeHtml(ownerName)}</strong><br />Landlord Signature</div>
              <div class="sig-block"><strong>Tenant Signature</strong><br />Room No: ________________</div>
            </div>
            <div class="footer">Generated via Luvora Property Management</div>
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
            dialogTitle: 'Save Agreement Template',
          });
        }
      }
    } catch {
      Alert.alert('Error', 'Could not generate template PDF.');
    }
  };

  // Filtered Rules
  const filteredRules = rules;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
          {/* Header Bar: Only Back & Title */}
          <View style={styles.headerBar}>
            <View style={styles.headerLeft}>
              {onBack ? (
                <TouchableOpacity
                  style={styles.backButtonCircle}
                  onPress={onBack}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
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

          {/* Status Toast Banner */}
          {statusNotice && (
            <View style={styles.statusToast}>
              <Feather name="check-circle" size={15} color="#315B32" style={{ marginRight: 6 }} />
              <Text style={styles.statusToastText}>{statusNotice}</Text>
            </View>
          )}

          {/* Segmented Switcher: Only 'Agreement' and 'Rules' ('All' removed) */}
          <View style={styles.tabFilterRow}>
            {(['Agreement', 'Rules'] as TabFilter[]).map((tab) => {
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

          {/* ======================================================== */}
          {/* 1. AGREEMENT TAB: Select Room -> Upload PDF -> Submit    */}
          {/* ======================================================== */}
          {activeTab === 'Agreement' && (
            <View style={styles.sectionContainer}>
              <View style={styles.card}>
                <View style={styles.sectionTitleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardHeaderTitle}>Agreement</Text>
                  </View>
                </View>

                {agreementFormError && (
                  <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={14} color="#A52A25" style={{ marginRight: 6 }} />
                    <Text style={styles.errorBoxText}>{agreementFormError}</Text>
                  </View>
                )}

                {/* STEP 1: Select Room Number */}
                <Text style={styles.inputStepLabel}>1. Select Room Number</Text>
                <TouchableOpacity
                  style={[
                    styles.roomSelectBtn,
                    availableRooms.length === 0 && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    if (availableRooms.length === 0) {
                      Alert.alert('All Agreements Added', 'All rooms currently have an agreement uploaded.');
                      return;
                    }
                    setIsRoomPickerOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Feather name="home" size={16} color={Palette.primary} />
                    <Text
                      style={[
                        styles.roomSelectBtnText,
                        !effectiveSelectedRoomNumber && { color: Palette.textMuted },
                      ]}
                      numberOfLines={1}
                    >
                      {availableRooms.length === 0
                        ? 'All rooms have uploaded agreements'
                        : effectiveSelectedRoomNumber
                        ? `${effectiveSelectedRoomNumber} · ${selectedRoomMemberName}`
                        : 'Select Room Number...'}
                    </Text>
                  </View>
                  <Feather name="chevron-down" size={18} color={Palette.accentText} />
                </TouchableOpacity>

                {/* STEP 2: Upload Agreement in PDF form */}
                <Text style={styles.inputStepLabel}>2. Upload Agreement</Text>
                {pickedPdf ? (
                  <View style={styles.pdfPickedBox}>
                    <View style={styles.pdfIconBadge}>
                      <Feather name="file" size={20} color={Palette.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pdfPickedName} numberOfLines={1}>
                        {pickedPdf.name}
                      </Text>
                      <Text style={styles.pdfPickedSize}>
                        {pickedPdf.size || 'PDF'} · Ready to submit
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setPickedPdf(null)}
                      style={styles.pdfRemoveBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x" size={16} color={Palette.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadDropZone}
                    onPress={() => void handlePickAgreementPdf()}
                    activeOpacity={0.7}
                  >
                    <View style={styles.uploadDropIcon}>
                      <Feather name="upload-cloud" size={24} color={Palette.primary} />
                    </View>
                    <Text style={styles.uploadDropTitle}>upload Agreement</Text>
                  </TouchableOpacity>
                )}

                {/* STEP 3: Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitAgreementBtn,
                    isSubmittingAgreement && { opacity: 0.7 },
                  ]}
                  onPress={() => void handleSubmitAgreement()}
                  disabled={isSubmittingAgreement}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitAgreementBtnText}>
                    {isSubmittingAgreement ? 'Submitting...' : 'Submit'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Uploaded Agreements History */}
              <View style={[styles.card, { marginTop: 14 }]}>
                <View style={styles.historyHeaderRow}>
                  <Text style={styles.historyTitle}>Agreements</Text>
                  <View>
                    <Text style={styles.countBadgeText}>{agreements.length} Total</Text>
                  </View>
                </View>

                {agreements.length === 0 ? (
                  <View style={styles.emptyAgreementsState}>
                    <Feather name="inbox" size={28} color={Palette.textMuted} />
                    <Text style={styles.emptyAgreementsTitle}>No room agreements uploaded yet</Text>
                    <Text style={styles.emptyAgreementsSub}>
                      Select a room number above, upload the signed PDF, and tap submit.
                    </Text>
                  </View>
                ) : (
                  agreements.map((agr) => (
                    <View key={agr.id} style={styles.agreementRowItem}>
                      {/* Room number without background box */}
                      <Text style={styles.agrRoomNumberText}>{agr.roomNumber}</Text>

                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.agrFileName} numberOfLines={1}>
                          {agr.fileName}
                        </Text>
                        <Text style={styles.agrMetaText}>
                          {agr.residentName} · {agr.uploadedAt} {agr.fileSize ? `· ${agr.fileSize}` : ''}
                        </Text>
                      </View>

                      {/* Download as Button */}
                      <TouchableOpacity
                        style={styles.agrDownloadBtn}
                        onPress={() => void handleDownloadAgreementPdf(agr)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`Download ${agr.roomNumber} agreement`}
                      >
                        <Text style={styles.agrDownloadBtnText}>Download</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* 2. RULES TAB: Rules List + Add Rule (Upload Image only)  */}
          {/* ======================================================== */}
          {activeTab === 'Rules' && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderTitleCol}>
                  <Text style={styles.sectionTitle}>House Rules</Text>
                </View>

                {/* Add Rule Button inside Rules section */}
                <TouchableOpacity
                  style={styles.addRulePillBtn}
                  onPress={() => {
                    setRuleFormError(null);
                    setRuleImageUri(null);
                    setIsAddRuleModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addRulePillBtnText}>Add Rule</Text>
                </TouchableOpacity>
              </View>
              {/* Rules List */}
              {filteredRules.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Feather name="shield" size={32} color={Palette.textMuted} />
                  <Text style={styles.emptyTitle}>No rules in this category</Text>
                  <Text style={styles.emptySub}>Tap &quot;Add Rule&quot; to upload a rule image.</Text>
                </View>
              ) : (
                filteredRules.map((rule) => {
                  const isMandatory = rule.enforcementLevel === 'Mandatory';
                  const isStandard = rule.enforcementLevel === 'Standard';
                  const isExpanded = !!expandedRuleIds[rule.id];

                  return (
                    <View key={rule.id} style={styles.ruleCard}>
                      <View style={styles.ruleTopRow}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{rule.category || 'General'}</Text>
                        </View>

                        <View style={styles.ruleTopRight}>
                          {rule.enforcementLevel ? (
                            <View
                              style={[
                                styles.levelBadge,
                                isMandatory
                                  ? styles.levelBadgeMandatory
                                  : isStandard
                                  ? styles.levelBadgeStandard
                                  : styles.levelBadgeGuideline,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.levelBadgeText,
                                  isMandatory
                                    ? styles.levelBadgeTextMandatory
                                    : isStandard
                                    ? styles.levelBadgeTextStandard
                                    : styles.levelBadgeTextGuideline,
                                ]}
                              >
                                {rule.enforcementLevel}
                              </Text>
                            </View>
                          ) : null}

                          <TouchableOpacity
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            onPress={() => handleDeleteRule(rule.id, rule.title)}
                            style={styles.deleteRuleBtn}
                          >
                            <Feather name="trash-2" size={14} color={Palette.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {rule.title && rule.title !== 'Property Notice & Guidelines' ? (
                        <Text style={styles.ruleTitle}>{rule.title}</Text>
                      ) : null}
                      {rule.summary && rule.summary !== 'Attached photo notice' ? (
                        <Text style={styles.ruleSummary}>{rule.summary}</Text>
                      ) : null}

                      {/* Attached Rule Image if uploaded */}
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

                      {rule.details && isExpanded ? (
                        <View style={styles.ruleDetailsBox}>
                          <Text style={styles.ruleDetailsText}>{rule.details}</Text>
                        </View>
                      ) : null}

                      <View style={styles.ruleBottomRow}>
                        {rule.timing ? (
                          <View style={styles.timingPill}>
                            <Feather
                              name="clock"
                              size={12}
                              color={Palette.primary}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={styles.timingText}>{rule.timing}</Text>
                          </View>
                        ) : (
                          <View />
                        )}

                        {rule.details ? (
                          <TouchableOpacity
                            onPress={() => toggleExpandRule(rule.id)}
                            style={styles.detailsToggle}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.detailsToggleText}>
                              {isExpanded ? 'Less info' : 'More details'}
                            </Text>
                            <Feather
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={14}
                              color={Palette.primary}
                            />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ======================================================== */}
      {/* ROOM SELECTOR MODAL                                      */}
      {/* ======================================================== */}
      <Modal
        visible={isRoomPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRoomPickerOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsRoomPickerOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.roomPickerCard}>
            <View style={styles.roomPickerHeader}>
              <Text style={styles.modalTitle}>Select Room</Text>
              <TouchableOpacity
                onPress={() => setIsRoomPickerOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Room Search */}
            <View style={styles.roomSearchBox}>
              <Feather name="search" size={14} color={Palette.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.roomSearchInput}
                placeholder="Search room number or tenant..."
                placeholderTextColor={Palette.textMuted}
                value={roomSearchQuery}
                onChangeText={setRoomSearchQuery}
              />
            </View>

            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              {filteredAvailableRooms.length === 0 && filteredAddedRooms.length === 0 ? (
                <View style={styles.roomPickerEmpty}>
                  <Text style={styles.roomPickerEmptyText}>No matching rooms found</Text>
                </View>
              ) : null}

              {/* Available Rooms for Selection */}
              {filteredAvailableRooms.map((room) => {
                const isSelected = effectiveSelectedRoomNumber === room.roomNumber;
                const memberName = room.members?.[0]?.name;

                return (
                  <TouchableOpacity
                    key={room.id}
                    style={[
                      styles.roomPickerItem,
                      isSelected && styles.roomPickerItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedRoomNumber(room.roomNumber);
                      setIsRoomPickerOpen(false);
                      setRoomSearchQuery('');
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <Feather
                        name="home"
                        size={15}
                        color={isSelected ? Palette.primary : Palette.textSecondary}
                      />
                      <View>
                        <Text
                          style={[
                            styles.roomPickerItemText,
                            isSelected && styles.roomPickerItemTextSelected,
                          ]}
                        >
                          {room.roomNumber}
                        </Text>
                        {memberName ? (
                          <Text style={styles.roomPickerItemSub}>{memberName}</Text>
                        ) : null}
                      </View>
                    </View>
                    {isSelected && <Feather name="check" size={16} color={Palette.primary} />}
                  </TouchableOpacity>
                );
              })}

              {/* Rooms with Agreement Already Added (Disabled & Unselectable) */}
              {filteredAddedRooms.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.roomPickerSectionLabelDisabled}>
                    Agreement Already Added ({filteredAddedRooms.length})
                  </Text>
                  {filteredAddedRooms.map((room) => {
                    const memberName = room.members?.[0]?.name;

                    return (
                      <View
                        key={`added-${room.id}`}
                        style={[styles.roomPickerItem, styles.roomPickerItemDisabled]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <Feather name="check-circle" size={15} color={Palette.textMuted} />
                          <View>
                            <Text style={styles.roomPickerItemTextDisabled}>
                              {room.roomNumber}
                            </Text>
                            {memberName ? (
                              <Text style={styles.roomPickerItemSubDisabled}>{memberName}</Text>
                            ) : null}
                          </View>
                        </View>
                        <View style={styles.agrAddedBadge}>
                          <Text style={styles.agrAddedBadgeText}>Agreement Added</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ======================================================== */}
      {/* ADD RULE MODAL: Only Upload Image & Submit               */}
      {/* ======================================================== */}
      <Modal
        visible={isAddRuleModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddRuleModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsAddRuleModalOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Rule Image</Text>
              <TouchableOpacity
                onPress={() => setIsAddRuleModalOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalFormContent}>
              {ruleFormError ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color="#A52A25" style={{ marginRight: 6 }} />
                  <Text style={styles.errorBoxText}>{ruleFormError}</Text>
                </View>
              ) : null}

              {/* Upload Image Only */}
              <Text style={styles.inputStepLabel}>Upload Rule Image *</Text>
              {ruleImageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: ruleImageUri }} style={styles.modalImageThumbnail} resizeMode="cover" />
                  <View style={styles.imagePreviewMeta}>
                    <Text style={styles.imageAttachedText}>Rule Photo Attached</Text>
                    <TouchableOpacity
                      onPress={() => void handlePickRuleImage()}
                      style={styles.changeImageBtn}
                    >
                      <Text style={styles.changeImageBtnText}>Change Photo</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => setRuleImageUri(null)}
                    style={styles.removeImageBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={16} color={Palette.status.overdue.text} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadImageDropZone}
                  onPress={() => void handlePickRuleImage()}
                  activeOpacity={0.7}
                >
                  <View style={styles.uploadDropIcon}>
                    <Feather name="image" size={24} color={Palette.primary} />
                  </View>
                  <Text style={styles.uploadDropTitle}>Upload Rules Image</Text>
                </TouchableOpacity>
              )}

              {/* Action Buttons: Cancel and Submit */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsAddRuleModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={() => void handleSaveNewRule()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalSaveBtnText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ======================================================== */}
      {/* FULL-VIEW RULE IMAGE MODAL                               */}
      {/* ======================================================== */}
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

          <View style={[styles.imageViewerHeader, { paddingTop: Math.max(insets.top, 16) }]}>
            <View style={styles.imageViewerHeaderLeft}>
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
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 80,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
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
  statusToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F0DF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    marginBottom: 12,
  },
  statusToastText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: '#315B32',
  },
  tabFilterRow: {
    flexDirection: 'row',
    backgroundColor: Palette.tint,
    borderRadius: 5,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  filterChipActive: {
    backgroundColor: Palette.primary,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  filterChipTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.status.overdue.bg,
    padding: 8,
    borderRadius: 5,
    marginBottom: 12,
  },
  errorBoxText: {
    fontSize: Typography.fontSize.xs,
    color: Palette.status.overdue.text,
    fontWeight: '600',
  },
  inputStepLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.textSecondary,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  roomSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  roomSelectBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Palette.text,
  },
  uploadDropZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.primary,
    backgroundColor: Palette.tint,
    borderRadius: 5,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadDropIcon: {
    width: 44,
    height: 44,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  uploadDropTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.primary,
  },
  uploadDropSub: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  pdfPickedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.primary,
    borderRadius: 5,
    padding: 12,
    gap: 10,
  },
  pdfIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 5,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfPickedName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
  },
  pdfPickedSize: {
    fontSize: Typography.fontSize.xs,
    color: '#315B32',
    fontWeight: '600',
    marginTop: 2,
  },
  pdfRemoveBtn: {
    padding: 4,
  },
  submitAgreementBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    borderRadius: 5,
    paddingVertical: 12,
    marginTop: 18,
  },
  submitAgreementBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  countBadge: {
    backgroundColor: Palette.tint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  emptyAgreementsState: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAgreementsTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
    marginTop: 8,
  },
  emptyAgreementsSub: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    marginTop: 3,
    textAlign: 'center',
  },
  agreementRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
    gap: 8,
  },
  agrRoomNumberText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.primary,
    minWidth: 74,
  },
  agrFileName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
  },
  agrMetaText: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  agrDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  agrDownloadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeaderTitleCol: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
  },
  addRulePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  addRulePillBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  categoryScroll: {
    marginBottom: 12,
  },
  categoryScrollContent: {
    gap: 6,
    paddingRight: 8,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  categoryPillActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  categoryPillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  categoryPillTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    marginTop: 4,
    textAlign: 'center',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: Palette.tint,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  ruleTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  levelBadgeMandatory: {
    backgroundColor: Palette.status.overdue.bg,
  },
  levelBadgeStandard: {
    backgroundColor: Palette.iconBg,
  },
  levelBadgeGuideline: {
    backgroundColor: Palette.tint,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  levelBadgeTextMandatory: {
    color: Palette.status.overdue.text,
  },
  levelBadgeTextStandard: {
    color: Palette.primary,
  },
  levelBadgeTextGuideline: {
    color: Palette.textSecondary,
  },
  deleteRuleBtn: {
    padding: 2,
  },
  ruleTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 4,
  },
  ruleSummary: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    lineHeight: 19,
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
  ruleDetailsBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  ruleDetailsText: {
    fontSize: Typography.fontSize.xs,
    color: Palette.text,
    lineHeight: 18,
  },
  ruleBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  timingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.tint,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  timingText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.primary,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Palette.backdrop,
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  modalTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
  },
  modalFormContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 20,
  },
  uploadImageDropZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.primary,
    backgroundColor: Palette.tint,
    borderRadius: 5,
    paddingVertical: 24,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 10,
    gap: 10,
  },
  modalImageThumbnail: {
    width: 68,
    height: 68,
    borderRadius: 5,
    backgroundColor: Palette.border,
  },
  imagePreviewMeta: {
    flex: 1,
  },
  imageAttachedText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Palette.text,
  },
  changeImageBtn: {
    marginTop: 4,
  },
  changeImageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  removeImageBtn: {
    padding: 6,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  modalCancelBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
  },
  modalSaveBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  roomPickerCard: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  roomPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  roomSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roomSearchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    padding: 0,
  },
  roomPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  roomPickerItemSelected: {
    backgroundColor: Palette.tint,
  },
  roomPickerItemText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  roomPickerItemTextSelected: {
    color: Palette.primary,
  },
  roomPickerItemSub: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    marginTop: 2,
  },
  roomPickerSectionLabelDisabled: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Palette.textMuted,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  roomPickerItemDisabled: {
    opacity: 0.65,
    backgroundColor: '#F9F7FC',
  },
  roomPickerItemTextDisabled: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Palette.textMuted,
  },
  roomPickerItemSubDisabled: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textMuted,
    marginTop: 2,
  },
  agrAddedBadge: {
    backgroundColor: Palette.iconBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  agrAddedBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  roomPickerEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomPickerEmptyText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  /* Full Image Viewer Styles */
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
    paddingBottom: 12,
    zIndex: 10,
  },
  imageViewerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
