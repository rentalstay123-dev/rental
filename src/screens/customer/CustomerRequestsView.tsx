import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { INITIAL_MAINTENANCE_REASONS } from '../../constants/initialData';
import { Palette, Radius, Typography } from '../../constants/theme';
import { useCustomerData } from '../../context/CustomerDataContext';
import type {
  CustomerServiceRequest,
  ServiceRequestPriority,
  ServiceRequestStatus,
} from '../../types/appData';

interface CustomerRequestsViewProps {
  onBack?: () => void;
  showBackButton?: boolean;
  initialOpenNewModal?: boolean;
}

type RequestFilter = 'All' | ServiceRequestStatus;

const CATEGORIES = Array.from(
  new Set([
    ...INITIAL_MAINTENANCE_REASONS,
    'Carpentry',
    'Cleaning',
    'Appliance',
    'General',
    'Other',
  ])
);

function getStatusStyle(status: ServiceRequestStatus) {
  if (status === 'Resolved') return Palette.status.paid;
  if (status === 'In Progress') {
    return { bg: Palette.iconBg, text: Palette.primary };
  }
  return Palette.status.pending;
}

export default function CustomerRequestsView({
  onBack,
  showBackButton = false,
  initialOpenNewModal = false,
}: CustomerRequestsViewProps) {
  const {
    data,
    createServiceRequest,
    updateServiceRequestStatus,
    deleteServiceRequest,
    refreshWorkspace,
  } = useCustomerData();
  const { requests, room, profile } = data;
  const fixedRoomNumber = profile.roomNumber?.trim() || room.roomNumber || 'Room 102';

  const [filter, setFilter] = useState<RequestFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [bannerText, setBannerText] = useState<string | null>(null);

  // Create Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(() => Boolean(initialOpenNewModal));
  const [category, setCategory] = useState(CATEGORIES[0] || 'Plumbing');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [priority, setPriority] = useState<ServiceRequestPriority>('Normal');
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal
  const [selectedRequest, setSelectedRequest] = useState<CustomerServiceRequest | null>(null);

  const openNewModal = React.useCallback(() => {
    setCategory(CATEGORIES[0] || 'Plumbing');
    setIsCategoryDropdownOpen(false);
    setPriority('Normal');
    setTitleInput('');
    setDescInput('');
    setFormError(null);
    setIsNewModalOpen(true);
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspace]);

  const handleSubmitRequest = async () => {
    if (!titleInput.trim() || !descInput.trim()) {
      setFormError('Please enter both a short title and description of the issue.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      await createServiceRequest({
        category,
        title: titleInput,
        description: descInput,
        priority,
        roomNumber: fixedRoomNumber,
      });
      setIsNewModalOpen(false);
      setBannerText(`Service request submitted for ${fixedRoomNumber}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesFilter = filter === 'All' ? true : req.status === filter;
    if (!matchesFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      req.title.toLowerCase().includes(q) ||
      req.category.toLowerCase().includes(q) ||
      req.description.toLowerCase().includes(q) ||
      (req.roomNumber && req.roomNumber.toLowerCase().includes(q))
    );
  });

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
              {onBack ? (
                <TouchableOpacity
                  style={styles.backButtonCircle}
                  onPress={onBack}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name="chevron-left"
                    size={Typography.iconSize.header}
                    color={Palette.primary}
                  />
                </TouchableOpacity>
              ) : null}
              <Text style={styles.headerTitle}>Requests</Text>
            </View>

            <TouchableOpacity
              style={styles.requestHeaderButton}
              onPress={openNewModal}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Create Request"
            >
              <Text style={styles.requestHeaderButtonText}>Request</Text>
            </TouchableOpacity>
          </View>

          {bannerText ? (
            <View style={styles.bannerCard}>
              <Text style={styles.bannerText}>{bannerText}</Text>
              <TouchableOpacity onPress={() => setBannerText(null)}>
                <Text style={styles.bannerDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Search Bar matching Admin style */}
          <View style={styles.searchBarBox}>
            <Feather name="search" size={Typography.iconSize.sm} color={Palette.primary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by title, category, or room..."
              placeholderTextColor={Palette.textMuted}
              accessibilityLabel="Search requests"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Feather name="x" size={Typography.iconSize.sm} color={Palette.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {(['All', 'Open', 'In Progress', 'Resolved'] as RequestFilter[]).map((tab) => {
              const active = filter === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilter(tab)}
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
          </ScrollView>

          {/* Request List */}
          {filteredRequests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No {filter === 'All' ? '' : `${filter} `}requests</Text>
            </View>
          ) : (
            filteredRequests.map((req) => {
              const stColors = getStatusStyle(req.status);
              const isResolved = req.status === 'Resolved';
              return (
                <TouchableOpacity
                  key={req.id}
                  style={styles.requestCard}
                  activeOpacity={0.8}
                  onPress={() => setSelectedRequest(req)}
                >
                  <View style={styles.reqTopRow}>
                    <View style={styles.reqCategoryRow}>
                      <Text style={styles.reqCategoryText}>{req.category}</Text>
                      {req.priority === 'Urgent' ? (
                        <View style={styles.urgentBadge}>
                          <Text style={styles.urgentBadgeText}>Urgent</Text>
                        </View>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        isResolved
                          ? styles.statusBadgePlain
                          : { backgroundColor: stColors.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: stColors.text },
                          isResolved && styles.statusBadgeTextPlain,
                        ]}
                      >
                        {req.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reqTitle}>{req.title}</Text>
                  <Text style={styles.reqDesc} numberOfLines={2}>
                    {req.description}
                  </Text>

                  <View style={styles.reqFooterRow}>
                    <Text style={styles.reqTime}>
                      {req.roomNumber || fixedRoomNumber} · {req.timeLabel}
                    </Text>
                    <View style={styles.viewDetailRow}>
                      <Text style={styles.viewDetailText}>Details</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* New Request Modal */}
      <Modal
        visible={isNewModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmitting) setIsNewModalOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              if (!isSubmitting) setIsNewModalOpen(false);
            }}
          >
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Service Request</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!isSubmitting) setIsNewModalOpen(false);
                }}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={Typography.iconSize.base} color={Palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {formError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{formError}</Text>
                </View>
              ) : null}

              {/* Category Dropdown */}
              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity
                style={styles.dropdownSelector}
                onPress={() => setIsCategoryDropdownOpen((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownSelectorText}>{category}</Text>
                <Feather
                  name={isCategoryDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={Typography.iconSize.base}
                  color={Palette.primary}
                />
              </TouchableOpacity>

              {isCategoryDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <ScrollView
                    style={styles.dropdownScroll}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {CATEGORIES.map((cat) => {
                      const isSelected = category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                          onPress={() => {
                            setCategory(cat);
                            setIsCategoryDropdownOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              isSelected && styles.dropdownItemTextSelected,
                            ]}
                          >
                            {cat}
                          </Text>
                          {isSelected && (
                            <Feather name="check" size={Typography.iconSize.sm} color={Palette.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Room Number (Fixed based on customer profile) */}
              <Text style={styles.inputLabel}>Room Number</Text>
              <View style={styles.fixedInput}>
                <Text style={styles.fixedInputText}>{fixedRoomNumber}</Text>
              </View>

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.priorityRow}>
                {(['Normal', 'Urgent'] as ServiceRequestPriority[]).map((p) => {
                  const active = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityBtn,
                        active && styles.priorityBtnActive,
                      ]}
                      onPress={() => setPriority(p)}
                    >
                      <Text
                        style={[
                          styles.priorityBtnText,
                          active && styles.priorityBtnTextActive,
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Issue Summary</Text>
              <TextInput
                style={styles.inputField}
                value={titleInput}
                onChangeText={(val) => {
                  setTitleInput(val);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g. Bathroom tap leaking"
                placeholderTextColor={Palette.textMuted}
              />

              <Text style={styles.inputLabel}>Details</Text>
              <TextInput
                style={[styles.inputField, styles.textArea]}
                value={descInput}
                onChangeText={(val) => {
                  setDescInput(val);
                  if (formError) setFormError(null);
                }}
                placeholder="Describe the location and issue clearly..."
                placeholderTextColor={Palette.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, isSubmitting && { opacity: 0.7 }]}
                onPress={() => void handleSubmitRequest()}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Request Detail Modal */}
      <Modal
        visible={Boolean(selectedRequest)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setSelectedRequest(null)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          {selectedRequest ? (
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedRequest.category}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedRequest(null)}
                  style={styles.modalCloseBtn}
                >
                  <Feather name="x" size={Typography.iconSize.base} color={Palette.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.detailTitle}>{selectedRequest.title}</Text>
              <Text style={styles.detailMeta}>
                {selectedRequest.roomNumber || fixedRoomNumber} · {selectedRequest.status} · {selectedRequest.priority} priority · {selectedRequest.timeLabel}
              </Text>
              <Text style={styles.detailBody}>{selectedRequest.description}</Text>

              {selectedRequest.assignedTo || selectedRequest.ownerNote ? (
                <View style={styles.noteBox}>
                  {selectedRequest.assignedTo ? (
                    <Text style={styles.noteAssigned}>
                      Assigned: {selectedRequest.assignedTo}
                    </Text>
                  ) : null}
                  {selectedRequest.ownerNote ? (
                    <Text style={styles.noteText}>{selectedRequest.ownerNote}</Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.detailActionsRow}>
                {selectedRequest.status !== 'Resolved' ? (
                  <TouchableOpacity
                    style={[styles.modalPrimaryBtn, { flex: 1 }]}
                    onPress={() => {
                      void updateServiceRequestStatus(selectedRequest.id, 'Resolved');
                      setSelectedRequest(null);
                      setBannerText('Request marked as resolved.');
                    }}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Mark Resolved</Text>
                  </TouchableOpacity>
                ) : null}

                {selectedRequest.status === 'Open' ? (
                  <TouchableOpacity
                    style={styles.cancelReqBtn}
                    onPress={() => {
                      void deleteServiceRequest(selectedRequest.id);
                      setSelectedRequest(null);
                      setBannerText('Request cancelled.');
                    }}
                  >
                    <Text style={styles.cancelReqText}>Cancel</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}
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
    marginBottom: 16,
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
    fontSize: 20,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.3,
  },
  requestHeaderButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestHeaderButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    marginLeft: 8,
    paddingVertical: 0,
  },
  bannerCard: {
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
  },
  bannerText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Palette.text,
  },
  bannerDismiss: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.primary,
    marginLeft: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 5,
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
  emptyCard: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  requestCard: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 15,
    marginBottom: 12,
  },
  reqTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reqCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqIconBox: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    backgroundColor: Palette.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqCategoryText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Palette.primary,
  },
  urgentBadge: {
    backgroundColor: Palette.status.overdue.bg,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.status.overdue.text,
  },
  statusBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgePlain: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeTextPlain: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  reqTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 4,
  },
  reqDesc: {
    fontSize: Typography.fontSize.sm,
    color: Palette.textSecondary,
    lineHeight: 19,
  },
  noteBox: {
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
  },
  noteAssigned: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.primary,
    marginBottom: 2,
  },
  noteText: {
    fontSize: Typography.fontSize.xs,
    color: Palette.text,
    lineHeight: 17,
  },
  reqFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  reqTime: {
    fontSize: Typography.fontSize.caption,
    color: Palette.textMuted,
  },
  viewDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewDetailText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.primary,
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
    backgroundColor: Palette.backdrop,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '86%',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '800',
    color: Palette.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 5,
    backgroundColor: Palette.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: Palette.status.overdue.bg,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorBannerText: {
    color: Palette.status.overdue.text,
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.textSecondary,
    marginBottom: 6,
  },
  dropdownSelector: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropdownSelectorText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    fontWeight: '600',
  },
  dropdownMenu: {
    marginTop: -6,
    marginBottom: 12,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 160,
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
    backgroundColor: Palette.tint,
  },
  dropdownItemText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    fontWeight: '500',
  },
  dropdownItemTextSelected: {
    color: Palette.primary,
    fontWeight: '700',
  },
  fixedInput: {
    backgroundColor: Palette.tint,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
  },
  fixedInputText: {
    fontSize: Typography.fontSize.sm,
    color: Palette.text,
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
  },
  priorityBtnActive: {
    backgroundColor: Palette.iconBg,
    borderColor: Palette.primary,
  },
  priorityBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Palette.textSecondary,
  },
  priorityBtnTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  inputField: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 82,
  },
  modalPrimaryBtn: {
    backgroundColor: Palette.primary,
    borderRadius: Radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalPrimaryBtnText: {
    color: Palette.onPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
  detailTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '800',
    color: Palette.text,
    marginBottom: 4,
  },
  detailMeta: {
    fontSize: Typography.fontSize.xs,
    color: Palette.textSecondary,
    marginBottom: 12,
  },
  detailBody: {
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    lineHeight: 21,
    marginBottom: 12,
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelReqBtn: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelReqText: {
    color: Palette.status.overdue.text,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
});
