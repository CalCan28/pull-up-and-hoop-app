import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts } from '../constants/theme';
import type { Profile, CareerStats } from '../lib/types';

interface PlayerCardProps {
  profile: Profile;
  stats?: CareerStats;
  onPress?: () => void;
  selected?: boolean;
  teamColor?: string;
}

export default function PlayerCard({ profile, stats, onPress, selected, teamColor }: PlayerCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.card,
        selected && { borderColor: teamColor || Colors.primary, borderWidth: 2 },
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(profile.display_name || profile.username || '?')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{profile.display_name || profile.username}</Text>
        <View style={styles.meta}>
          {profile.position && (
            <Text style={styles.position}>{profile.position}</Text>
          )}
          <Text style={styles.username}>@{profile.username}</Text>
        </View>
      </View>
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.ppg}</Text>
            <Text style={styles.statLabel}>PPG</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.apg}</Text>
            <Text style={styles.statLabel}>APG</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.rpg}</Text>
            <Text style={styles.statLabel}>RPG</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.background,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.foreground,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  position: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.accent,
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  username: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.muted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.primary,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
});
