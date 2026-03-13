import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAuth } from '../../../src/lib/auth-context';
import { Colors, Fonts } from '../../../src/constants/theme';
import type { Game, GamePlayer, Profile, ScoreEvent } from '../../../src/lib/types';

type ScoreType = '2pt' | '3pt' | 'ft';

export default function ScoreboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;

    const [gameRes, playersRes, scoresRes] = await Promise.all([
      supabase.from('games').select('*').eq('id', id).single(),
      supabase.from('game_players').select('*, profiles(*)').eq('game_id', id),
      supabase
        .from('score_events')
        .select('*')
        .eq('game_id', id)
        .order('created_at', { ascending: true }),
    ]);

    if (gameRes.data) setGame(gameRes.data);
    if (playersRes.data) setPlayers(playersRes.data);
    if (scoresRes.data) setScoreEvents(scoresRes.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();

    // Subscribe to real-time score updates
    const channel = supabase
      .channel(`scoreboard-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'score_events', filter: `game_id=eq.${id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, id]);

  const recordScore = async (playerId: string, team: 1 | 2, scoreType: ScoreType) => {
    if (!user) return;
    if (!isOpenScoring && !isScorekeeper) {
      Alert.alert('Not Authorized', 'Only the designated scorekeeper can record scores.');
      return;
    }
    const points = scoreType === '3pt' ? 3 : scoreType === '2pt' ? 2 : 1;

    const { error } = await supabase.from('score_events').insert({
      game_id: id,
      player_id: playerId,
      team,
      score_type: scoreType,
      points,
      recorded_by: user.id,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Vibration.vibrate(50);
      fetchData();
    }
  };

  const undoLast = async () => {
    if (!user || scoreEvents.length === 0) return;
    const last = scoreEvents[scoreEvents.length - 1];
    if (last.recorded_by !== user.id) {
      Alert.alert('Cannot Undo', 'You can only undo scores you recorded.');
      return;
    }
    await supabase.from('score_events').delete().eq('id', last.id);
    Vibration.vibrate(30);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>LOADING...</Text>
      </View>
    );
  }

  if (!game) return null;

  const isScorekeeper = user && game.scorekeeper_id === user.id;
  const isOpenScoring = !game.scorekeeper_id; // no assigned scorekeeper = anyone can score

  const team1Players = players.filter((p) => p.team === 1);
  const team2Players = players.filter((p) => p.team === 2);

  const team1Score = scoreEvents
    .filter((e) => e.team === 1)
    .reduce((sum, e) => sum + e.points, 0);
  const team2Score = scoreEvents
    .filter((e) => e.team === 2)
    .reduce((sum, e) => sum + e.points, 0);

  // Per-player point totals
  const playerPoints: Record<string, number> = {};
  scoreEvents.forEach((e) => {
    playerPoints[e.player_id] = (playerPoints[e.player_id] || 0) + e.points;
  });

  const canScore = isOpenScoring || isScorekeeper;

  const renderTeamSection = (teamPlayers: GamePlayer[], team: 1 | 2, teamColor: string) => (
    <View style={styles.teamSection}>
      {teamPlayers.map((gp) => {
        const profile = gp.profiles as unknown as Profile;
        const name = profile?.display_name || profile?.username || 'Player';
        const pts = playerPoints[gp.user_id] || 0;

        return (
          <View key={gp.id} style={styles.playerRow}>
            {/* Player name & points */}
            <View style={styles.playerInfo}>
              <Text style={[styles.playerName, { color: teamColor }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.playerPts}>{pts} PTS</Text>
            </View>

            {/* Score buttons — only interactive for scorekeeper */}
            {canScore ? (
              <View style={styles.scoreButtons}>
                <TouchableOpacity
                  style={[styles.scoreBtn, styles.scoreBtnFt]}
                  onPress={() => recordScore(gp.user_id, team, 'ft')}
                  activeOpacity={0.6}
                >
                  <Text style={styles.scoreBtnText}>+1</Text>
                  <Text style={styles.scoreBtnLabel}>FT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scoreBtn, styles.scoreBtn2pt]}
                  onPress={() => recordScore(gp.user_id, team, '2pt')}
                  activeOpacity={0.6}
                >
                  <Text style={styles.scoreBtnText}>+2</Text>
                  <Text style={styles.scoreBtnLabel}>2PT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.scoreBtn, styles.scoreBtn3pt]}
                  onPress={() => recordScore(gp.user_id, team, '3pt')}
                  activeOpacity={0.6}
                >
                  <Text style={styles.scoreBtnText}>+3</Text>
                  <Text style={styles.scoreBtnLabel}>3PT</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  // Last 5 events for the play-by-play feed
  const recentEvents = [...scoreEvents].reverse().slice(0, 5);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Big Scoreboard */}
      <View style={styles.scoreboard}>
        <View style={styles.scoreCol}>
          <Text style={styles.teamName}>TEAM 1</Text>
          <Text style={[styles.bigScore, { color: Colors.team1 }]}>{team1Score}</Text>
        </View>
        <View style={styles.divider}>
          <Text style={styles.dividerText}>VS</Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={styles.teamName}>TEAM 2</Text>
          <Text style={[styles.bigScore, { color: Colors.team2 }]}>{team2Score}</Text>
        </View>
      </View>

      {/* Game type badge + scorekeeper info */}
      <View style={styles.badgeRow}>
        <View style={styles.gameTypeBadge}>
          <Text style={styles.gameTypeText}>{game.game_type}</Text>
        </View>
        {game.scorekeeper_id && (
          <View style={styles.scorekeeperBadge}>
            <Text style={styles.scorekeeperBadgeText}>
              {isScorekeeper ? 'YOU ARE SCOREKEEPER' : 'VIEW ONLY'}
            </Text>
          </View>
        )}
      </View>

      {/* Undo Button */}
      {scoreEvents.length > 0 && (
        <TouchableOpacity style={styles.undoBtn} onPress={undoLast} activeOpacity={0.7}>
          <Text style={styles.undoBtnText}>UNDO LAST</Text>
        </TouchableOpacity>
      )}

      {/* Team 1 Players */}
      <Text style={[styles.sectionTitle, { color: Colors.team1 }]}>TEAM 1</Text>
      {renderTeamSection(team1Players, 1, Colors.team1)}

      {/* Team 2 Players */}
      <Text style={[styles.sectionTitle, { color: Colors.team2 }]}>TEAM 2</Text>
      {renderTeamSection(team2Players, 2, Colors.team2)}

      {/* Play-by-Play Feed */}
      {recentEvents.length > 0 && (
        <View style={styles.feedSection}>
          <Text style={styles.feedTitle}>RECENT PLAYS</Text>
          {recentEvents.map((event) => {
            const scorer = players.find((p) => p.user_id === event.player_id);
            const profile = scorer?.profiles as unknown as Profile;
            const name = profile?.display_name || profile?.username || 'Player';
            const teamColor = event.team === 1 ? Colors.team1 : Colors.team2;
            const typeLabel =
              event.score_type === '3pt'
                ? 'THREE POINTER'
                : event.score_type === '2pt'
                  ? 'BUCKET'
                  : 'FREE THROW';

            return (
              <View key={event.id} style={styles.feedItem}>
                <View style={[styles.feedDot, { backgroundColor: teamColor }]} />
                <Text style={styles.feedText}>
                  <Text style={{ color: teamColor }}>{name}</Text>
                  {' \u2014 '}
                  <Text style={styles.feedType}>{typeLabel}</Text>
                  {' (+' + event.points + ')'}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.primary,
  },

  // Scoreboard
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  scoreCol: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  bigScore: {
    fontFamily: Fonts.display,
    fontSize: 72,
    lineHeight: 80,
  },
  divider: {
    paddingHorizontal: 16,
  },
  dividerText: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.muted,
  },

  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  gameTypeBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  gameTypeText: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.primary,
  },
  scorekeeperBadge: {
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scorekeeperBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Undo
  undoBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  undoBtnText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.muted,
  },

  // Team sections
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  teamSection: {
    paddingHorizontal: 12,
  },
  playerRow: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  playerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  playerName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    flex: 1,
  },
  playerPts: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.foreground,
  },
  scoreButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBtnFt: {
    backgroundColor: Colors.surfaceLight,
  },
  scoreBtn2pt: {
    backgroundColor: Colors.primary,
  },
  scoreBtn3pt: {
    backgroundColor: Colors.accent,
  },
  scoreBtnText: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.background,
    lineHeight: 28,
  },
  scoreBtnLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.background,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // Feed
  feedSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  feedTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.foreground,
    marginBottom: 10,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  feedText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.foreground,
    flex: 1,
  },
  feedType: {
    color: Colors.muted,
  },
});
