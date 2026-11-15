import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Typography } from '../constants/theme';
import { useCustomerData } from '../context/CustomerDataContext';
import { ServiceRequestPriority } from '../types/appData';

interface RequestAdminModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (title: string) => void;
}

export default function RequestAdminModal({
  visible,
  onClose,
  onSuccess,
}: RequestAdminModalProps) {
  const { data, createServiceRequest } = useCustomerData();
  const roomNumber = data.room.roomNumber;

  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ServiceRequestPriority>('Normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setDescription('');
    setPriority('Normal');
    setErrorMessage(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setErrorMessage('Please enter a description for your request.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const firstLine = trimmedDesc.split('\n')[0].trim();
      const generatedTitle =
        firstLine.length > 50 ? `${firstLine.slice(0, 47)}...` : firstLine;

      await createServiceRequest({
        category: 'General',
        title: generatedTitle || `Request - Room ${roomNumber}`,
        description: trimmedDesc,
        priority,
      });

      const submittedTitle = generatedTitle || `Request - Room ${roomNumber}`;
      resetForm();
      onClose();
      onSuccess?.(submittedTitle);
    } catch {
      setErrorMessage('Failed to submit request. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.modalTitle}>Request</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isSubmitting}
            >
              <Feather name="x" size={Typography.iconSize.base} color={Palette.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formContainer}
          >
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color={Palette.status.due.text} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* 1. Room Number (Auto-filled) */}
            <Text style={styles.inputLabel}>Room Number</Text>
            <View style={styles.roomBox}>
              <Feather name="home" size={16} color={Palette.textSecondary} />
              <Text style={styles.roomText}>
                {roomNumber ? `Room ${roomNumber}` : 'Assigned Room'}
              </Text>
              <View style={styles.autoBadge}>
                <Text style={styles.autoBadgeText}>Auto-filled</Text>
              </View>
            </View>

            {/* 2. Description */}
            <Text style={styles.inputLabel}>
              Description <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={[styles.inputField, styles.textArea]}
              value={description}
              onChangeText={(val) => {
                setDescription(val);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Describe your request, issue, or question for the admin..."
              placeholderTextColor={Palette.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* 3. Urgency */}
            <Text style={styles.inputLabel}>Urgency</Text>
            <View style={styles.priorityRow}>
              {(['Normal', 'Urgent'] as ServiceRequestPriority[]).map((p) => {
                const active = priority === p;
                const isUrgent = p === 'Urgent';
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityBtn,
                      active &&
                        (isUrgent ? styles.priorityBtnUrgentActive : styles.priorityBtnActive),
                    ]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.8}
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

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={Palette.onPrimary} />
                ) : (
                  <Text style={styles.submitBtnText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  headerTitleCol: {
    flex: 1,
    paddingRight: 8,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Palette.text,
  },
  closeBtn: {
    padding: 4,
  },
  formContainer: {
    paddingTop: 14,
    paddingBottom: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.status.due.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.caption,
    color: Palette.status.due.text,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.text,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requiredAsterisk: {
    color: Palette.status.due.text,
  },
  roomBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.iconBg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  roomText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Palette.text,
  },
  autoBadge: {
    backgroundColor: Palette.tint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  autoBadgeText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.primary,
  },
  inputField: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: Typography.fontSize.base,
    color: Palette.text,
    backgroundColor: Palette.surface,
  },
  textArea: {
    minHeight: 90,
    paddingTop: 10,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.iconBg,
  },
  priorityBtnActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  priorityBtnUrgentActive: {
    backgroundColor: Palette.status.due.text,
    borderColor: Palette.status.due.text,
  },
  priorityBtnText: {
    fontSize: Typography.fontSize.caption,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  priorityBtnTextActive: {
    color: Palette.onPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: Typography.fontSize.base,
    color: Palette.textSecondary,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: Radius.pill,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: Typography.fontSize.base,
    color: Palette.onPrimary,
    fontWeight: '700',
  },
});
