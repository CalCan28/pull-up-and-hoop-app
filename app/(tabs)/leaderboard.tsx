import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { Colors, Fonts } from '../../src/constants/theme';
import ScreenBackground from '../../src/components/ScreenBackground';
import type { CareerStats, Profile } from '../../src/lib/types';

type LeaderEntry = CareerStats & { profile?: Profile };
type StatKey = 'ppg' | 'apg' | 'rpg' | 'spg' | 'bpg';

const categories: { key: StatKey; label: string; title: string }[] = [
  { key: 'ppg', label: 'PPG', title: 'SCORERS' },
  { key: 'apg', label: 'APG', title: 'PLAYMAKERS' },
  { key: 'rpg', label: 'RPG', title: 'REBOUNDERS' },
  { key: 'spg', label: 'SPG', title: 'THIEVES' },
  { key: 'bpg', label: 'BPG', title: 'SHOT BLOCKERS' },
];

export default function LeaderboardScreen() {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<StatKey>('ppg');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaders();
  }, []);

  const fetchLeaders = async () => {
    const { data: stats } = await supabase
      .from('player_career_stats')
      .select('*');

    if (stats && stats.length > 0) {
      const userIds = stats.map((s) => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      setLeaders(
        stats.map((s) => ({
          ...s,
          profile: profiles?.find((p) => p.id === s.user_id),
        }))
      );
    }
    setLoading(false);
  };

  const activeConfig = categories.find((c) => c.key === activeCategory)!;
  const sorted = [...leaders].sort(
    (a, b) => (b[activeCategory] as number) - (a[activeCategory] as number)
  );

  const renderItem = ({ item, index }: { item: LeaderEntry; index: number }) => {
    const rank = index + 1;
    const isTop3 = rank <= 3;
    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

    return (
      <View style={[styles.row, isTop3 && styles.topRow]}>
        <Text
          style={[
            styles.rank,
            isTop3 && { color: rankColors[rank - 1] },
          ]}
        >
          {rank}
        </Text>
        <View style={styles.playerAvatar}>
          <Text style={styles.avatarText}>
            {(item.profile?.display_name || item.profile?.username || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>
            {item.profile?.display_name || item.profile?.username}
          </Text>
          <Text style={styles.playerMeta}>
            {item.games_played} games
            {item.profile?.position ? ` \u00B7 ${item.profile.position}` : ''}
          </Text>
        </View>
        <Text style={[styles.statValue, isTop3 && { color: Colors.primary }]}>
          {item[activeCategory]}
        </Text>
      </View>
    );
  };

  return (
    <ScreenBackground imageIndex={3}>
      <Text style={styles.title}>TOP {activeConfig.title}</Text>

      {/* Category Tabs */}
      <View style={styles.tabs}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.tab, activeCategory === cat.key && styles.tabActive]}
            onPress={() => setActiveCategory(cat.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeCategory === cat.key && styles.tabTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>LOADING...</Text>
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>NO STATS YET</Text>
          <Text style={styles.emptySubtitle}>
            Play some games and get your stats verified to appear on the leaderboard.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.user_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  title: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.muted,
  },
  tabTextActive: {
    color: Colors.background,
  },
  list: { padding: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  topRow: {
    borderColor: Colors.primary + '40',
  },
  rank: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.muted,
    width: 32,
    textAlign: 'center',
  },
  playerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.foreground,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: Colors.foreground,
  },
  playerMeta: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
    marginTop: 1,
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.foreground,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.primary,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.muted,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
