import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Colors, Fonts } from '../constants/theme';
import { blockUser } from '../services/moderationService';
import { useAuth } from '../lib/auth-context';

interface BlockConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  onBlocked?: () => void;
}

export default function BlockConfirmModal({
  visible,
  onClose,
  userId,
  userName,
  onBlocked,
}: BlockConfirmModalProps) {
  const { user } = useAuth();
  const [blocking, setBlocking] = useState(false);

  const handleBlock = async () => {
    if (!user) return;

    setBlocking(true);
    const result = await blockUser(user.id, userId);
    setBlocking(false);

    if (result.success) {
      Alert.alert(
        'Player Blocked',
        `${userName || 'This player'} has been blocked. You won't see their content anymore.`,
      );
      onBlocked?.();
      onClose();
    } else {
      Alert.alert('Error', result.error || 'Could not block this player. Try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>BLOCK {userName?.toUpperCase() || 'PLAYER'}?</Text>

          <Text style={styles.description}>
            Blocking this player means:{'\n\n'}
            {'\u2022'} You won't see them on leaderboards{'\n'}
            {'\u2022'} You won't see their hosted sessions{'\n'}
            {'\u2022'} They won't be able to see your profile{'\n'}
            {'\u2022'} You can unblock them anytime from settings
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.blockBtn, blocking && { opacity: 0.5 }]}
              onPress={handleBlock}
              disabled={blocking}
            >
              <Text style={styles.blockBtnText}>
                {blocking ? 'BLOCKING...' : 'BLOCK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  cancelBtnText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.muted,
  },
  blockBtn: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  blockBtnText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.foreground,
  },
});
