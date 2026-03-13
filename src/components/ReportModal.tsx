import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Fonts } from '../constants/theme';
import { submitReport } from '../services/moderationService';
import type { ReportReason, ContentType } from '../services/moderationService';
import { useAuth } from '../lib/auth-context';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;
  contentType: ContentType;
  contentId: string;
  userName?: string;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_speech', label: 'Hate Speech' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'fake_stats', label: 'Fake Stats' },
  { value: 'unsportsmanlike', label: 'Unsportsmanlike Conduct' },
  { value: 'other', label: 'Other' },
];

export default function ReportModal({
  visible,
  onClose,
  reportedUserId,
  contentType,
  contentId,
  userName,
}: ReportModalProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !selectedReason) {
      Alert.alert('Select a Reason', 'Please choose why you are reporting this user.');
      return;
    }

    setSubmitting(true);
    const result = await submitReport({
      reporterId: user.id,
      reportedUserId,
      contentType,
      contentId,
      reason: selectedReason,
      details,
    });
    setSubmitting(false);

    if (result.success) {
      Alert.alert(
        'Report Submitted',
        "Thanks for helping keep the community safe. We'll review your report within 24 hours.",
      );
      setSelectedReason(null);
      setDetails('');
      onClose();
    } else {
      Alert.alert('Error', result.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>REPORT{userName ? ` ${userName.toUpperCase()}` : ''}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>X</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>
              Why are you reporting this {contentType === 'profile' ? 'player' : contentType}?
            </Text>

            {/* Reason pills */}
            <View style={styles.reasonList}>
              {REPORT_REASONS.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.reasonBtn,
                    selectedReason === r.value && styles.reasonBtnActive,
                  ]}
                  onPress={() => setSelectedReason(r.value)}
                >
                  <Text
                    style={[
                      styles.reasonBtnText,
                      selectedReason === r.value && styles.reasonBtnTextActive,
                    ]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Details */}
            <Text style={styles.label}>ADDITIONAL DETAILS (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="Tell us more about what happened..."
              placeholderTextColor={Colors.muted}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={4}
            />

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!selectedReason || submitting) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason || submitting}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.error,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.muted,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
    marginBottom: 20,
  },
  reasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  reasonBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  reasonBtnActive: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  reasonBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.muted,
  },
  reasonBtnTextActive: {
    color: Colors.foreground,
  },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.muted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    borderRadius: 10,
    padding: 14,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.foreground,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.foreground,
    letterSpacing: 1.5,
  },
});
