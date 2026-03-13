import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/lib/auth-context';
import { Colors, Fonts } from '../../src/constants/theme';
import StatBar from '../../src/components/StatBar';
import Button from '../../src/components/Button';
import ScreenBackground from '../../src/components/ScreenBackground';
import type { Profile, CareerStats, VerifiedStats } from '../../src/lib/types';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [career, setCareer] = useState<CareerStats | null>(null);
  const [recentGames, setRecentGames] = useState<VerifiedStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const [profileRes, careerRes, gamesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('player_career_stats').select('*').eq('user_id', user.id).single(),
      supabase
        .from('verified_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('verified_at', { ascending: false })
        .limit(10),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (careerRes.data) setCareer(careerRes.data);
    if (gamesRes.data) setRecentGames(gamesRes.data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (!user) {
    return (
      <ScreenBackground imageIndex={2}>
      <View style={styles.center}>
        <Text style={styles.emoji}>{'\u{1F3C0}'}</Text>
        <Text style={styles.title}>MY STATS</Text>
        <Text style={styles.subtitle}>Sign in to track your game</Text>
        <View style={{ marginTop: 20, width: '80%' }}>
          <Button title="Sign In" onPress={() => router.push('/(auth)/login')} size="lg" />
        </View>
      </View>
      </ScreenBackground>
    );
  }

  if (loading) {
    return (
      <ScreenBackground imageIndex={2}>
      <View style={styles.center}>
        <Text style={styles.loadingText}>LOADING...</Text>
      </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground imageIndex={2}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.display_name || profile?.username || '?')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.displayName}>
          {profile?.display_name || profile?.username}
        </Text>
        <Text style={styles.username}>@{profile?.username}</Text>
        {profile?.position && (
          <View style={styles.positionBadge}>
            <Text style={styles.positionText}>{profile.position}</Text>
          </View>
        )}
      </View>

      {/* Career Stats */}
      {career ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CAREER AVERAGES</Text>
          <View style={styles.careerCard}>
            <View style={styles.statsGrid}>
              <StatBar label="PPG" value={career.ppg} color={Colors.primary} />
              <StatBar label="APG" value={career.apg} color={Colors.accent} />
              <StatBar label="RPG" value={career.rpg} color={Colors.foreground} />
              <StatBar label="SPG" value={career.spg} color={Colors.primary} />
              <StatBar label="BPG" value={career.bpg} color={Colors.accent} />
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Games Played</Text>
              <Text style={styles.totalValue}>{career.games_played}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Points</Text>
              <Text style={styles.totalValue}>{career.total_points}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Assists</Text>
              <Text style={styles.totalValue}>{career.total_assists}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Rebounds</Text>
              <Text style={styles.totalValue}>{career.total_rebounds}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>NO VERIFIED STATS YET</Text>
          <Text style={styles.emptySubtitle}>
            Pull up to a court, play a game, and log your stats. Other players will vouch to verify.
          </Text>
        </View>
      )}

      {/* Recent Games */}
      {recentGames.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT GAMES</Text>
          {recentGames.map((game) => (
            <View key={game.id} style={styles.gameRow}>
              <View style={styles.gameStats}>
                <Text style={styles.gameStat}>{game.points} PTS</Text>
                <Text style={styles.gameStat}>{game.assists} AST</Text>
                <Text style={styles.gameStat}>{game.rebounds} REB</Text>
                <Text style={styles.gameStat}>{game.steals} STL</Text>
                <Text style={styles.gameStat}>{game.blocks} BLK</Text>
              </View>
              <Text style={styles.gameDate}>
                {new Date(game.verified_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Sign Out */}
      <View style={styles.section}>
        <Button title="Sign Out" onPress={signOut} variant="ghost" size="sm" />
      </View>
    </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 20, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: 24,
  },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: {
    fontFamily: Fonts.display,
    fontSize: 36,
    color: Colors.primary,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.muted,
    marginTop: 8,
  },
  loadingText: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.primary,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 40,
    color: Colors.background,
  },
  displayName: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.foreground,
  },
  username: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
    marginTop: 2,
  },
  positionBadge: {
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  positionText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.accent,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.foreground,
    marginBottom: 12,
  },
  careerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
  },
  totalLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
  },
  totalValue: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.foreground,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
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
  gameRow: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  gameStats: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 6,
  },
  gameStat: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  gameDate: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
  },
});
