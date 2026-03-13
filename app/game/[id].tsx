import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/lib/auth-context';
import { Colors, Fonts } from '../../src/constants/theme';
import Button from '../../src/components/Button';
import PlayerCard from '../../src/components/PlayerCard';
import ReportModal from '../../src/components/ReportModal';
import BlockConfirmModal from '../../src/components/BlockConfirmModal';
import type { Game, GamePlayer, Profile, CareerStats, GameStats } from '../../src/lib/types';

type PlayerWithStats = Profile & { career?: CareerStats };

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerWithStats[]>([]);
  const [currentTeam, setCurrentTeam] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [scorekeeperName, setScorekeeperName] = useState<string | null>(null);

  // Stats entry
  const [statsMode, setStatsMode] = useState(false);
  const [playerStats, setPlayerStats] = useState<Record<string, {
    points: string; assists: string; rebounds: string;
    steals: string; blocks: string; three_pointers: string;
  }>>({});

  // Vouching
  const [vouchMode, setVouchMode] = useState(false);
  const [pendingStats, setPendingStats] = useState<(GameStats & { profile?: Profile })[]>([]);

  // Report/Block modals
  const [reportTarget, setReportTarget] = useState<{ userId: string; userName: string } | null>(null);
  const [blockTarget, setBlockTarget] = useState<{ userId: string; userName: string } | null>(null);

  const showPlayerActions = (playerId: string, playerName: string) => {
    if (!user || playerId === user.id) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Report Player', 'Block Player'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
          title: playerName,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) setReportTarget({ userId: playerId, userName: playerName });
          if (buttonIndex === 2) setBlockTarget({ userId: playerId, userName: playerName });
        },
      );
    } else {
      Alert.alert(playerName, 'Choose an action', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report Player', onPress: () => setReportTarget({ userId: playerId, userName: playerName }) },
        { text: 'Block Player', style: 'destructive', onPress: () => setBlockTarget({ userId: playerId, userName: playerName }) },
      ]);
    }
  };

  const fetchData = useCallback(async () => {
    if (!id) return;

    const { data: gameData } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .single();
    if (gameData) {
      setGame(gameData);
      // Fetch scorekeeper name
      if (gameData.scorekeeper_id) {
        const { data: skProfile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('id', gameData.scorekeeper_id)
          .single();
        if (skProfile) {
          setScorekeeperName(skProfile.display_name || skProfile.username);
        }
      }
    }

    // Get game players with profiles
    const { data: gamePlayers } = await supabase
      .from('game_players')
      .select('*, profiles(*)')
      .eq('game_id', id);
    if (gamePlayers) setPlayers(gamePlayers);

    // If picking, get available players at the court
    if (gameData?.status === 'picking') {
      const { data: checkIns } = await supabase
        .from('check_ins')
        .select('user_id')
        .eq('court_id', gameData.court_id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      if (checkIns) {
        const pickedIds = (gamePlayers || []).map((p) => p.user_id);
        const availableIds = checkIns
          .map((ci) => ci.user_id)
          .filter((uid) => !pickedIds.includes(uid));

        if (availableIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', availableIds);
          const { data: stats } = await supabase
            .from('player_career_stats')
            .select('*')
            .in('user_id', availableIds);

          setAvailablePlayers(
            (profiles || []).map((p) => ({
              ...p,
              career: stats?.find((s) => s.user_id === p.id),
            }))
          );
        }
      }
    }

    // If finished, check for pending stat vouches
    if (gameData?.status === 'finished' && user) {
      const { data: stats } = await supabase
        .from('game_stats')
        .select('*')
        .eq('game_id', id)
        .neq('user_id', user.id);

      if (stats && stats.length > 0) {
        const userIds = [...new Set(stats.map((s) => s.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        // Check which ones I haven't vouched for yet
        const { data: myVouches } = await supabase
          .from('stat_vouches')
          .select('stat_owner_id')
          .eq('game_id', id)
          .eq('voucher_id', user.id);

        const vouchedIds = (myVouches || []).map((v) => v.stat_owner_id);
        const pending = stats
          .filter((s) => s.reported_by === s.user_id && !vouchedIds.includes(s.user_id))
          .map((s) => ({
            ...s,
            profile: profiles?.find((p) => p.id === s.user_id),
          }));
        setPendingStats(pending);
        if (pending.length > 0) setVouchMode(true);
      }
    }

    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pickPlayer = async (playerId: string) => {
    await supabase.from('game_players').insert({
      game_id: id,
      user_id: playerId,
      team: currentTeam,
      is_captain: false,
    });
    setCurrentTeam(currentTeam === 1 ? 2 : 1);
    fetchData();
  };

  const startGame = async () => {
    await supabase
      .from('games')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', id);
    fetchData();
  };

  const endGame = async () => {
    await supabase
      .from('games')
      .update({ status: 'finished', ended_at: new Date().toISOString() })
      .eq('id', id);
    setStatsMode(true);
    fetchData();
  };

  const submitStats = async () => {
    if (!user) return;

    // Submit own stats
    const myStats = playerStats[user.id];
    if (myStats) {
      await supabase.from('game_stats').insert({
        game_id: id,
        user_id: user.id,
        reported_by: user.id,
        points: parseInt(myStats.points) || 0,
        assists: parseInt(myStats.assists) || 0,
        rebounds: parseInt(myStats.rebounds) || 0,
        steals: parseInt(myStats.steals) || 0,
        blocks: parseInt(myStats.blocks) || 0,
        three_pointers: parseInt(myStats.three_pointers) || 0,
      });
    }

    Alert.alert('Stats Submitted', 'Waiting for other players to vouch for your stats.');
    setStatsMode(false);
    fetchData();
  };

  const vouchForPlayer = async (statOwnerId: string, approved: boolean) => {
    if (!user) return;
    await supabase.from('stat_vouches').insert({
      game_id: id,
      stat_owner_id: statOwnerId,
      voucher_id: user.id,
      approved,
    });
    setPendingStats((prev) => prev.filter((s) => s.user_id !== statOwnerId));
    if (pendingStats.length <= 1) setVouchMode(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>LOADING GAME...</Text>
      </View>
    );
  }

  if (!game) return null;

  const team1 = players.filter((p) => p.team === 1);
  const team2 = players.filter((p) => p.team === 2);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Game Header */}
      <View style={styles.header}>
        <Text style={styles.gameType}>{game.game_type}</Text>
        <View style={[
          styles.statusBadge,
          game.status === 'active' && { backgroundColor: Colors.accent + '30' },
          game.status === 'finished' && { backgroundColor: Colors.muted + '30' },
        ]}>
          <Text style={[
            styles.statusText,
            game.status === 'active' && { color: Colors.accent },
            game.status === 'finished' && { color: Colors.muted },
          ]}>
            {game.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Teams */}
      <View style={styles.teamsContainer}>
        <View style={styles.teamCol}>
          <Text style={[styles.teamLabel, { color: Colors.team1 }]}>TEAM 1</Text>
          {team1.map((p) => {
            const prof = p.profiles as unknown as Profile;
            return (
              <TouchableOpacity
                key={p.id}
                onLongPress={() =>
                  showPlayerActions(p.user_id, prof?.display_name || prof?.username || 'Player')
                }
                activeOpacity={0.8}
              >
                <PlayerCard profile={prof} teamColor={Colors.team1} selected />
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={styles.teamCol}>
          <Text style={[styles.teamLabel, { color: Colors.team2 }]}>TEAM 2</Text>
          {team2.map((p) => {
            const prof = p.profiles as unknown as Profile;
            return (
              <TouchableOpacity
                key={p.id}
                onLongPress={() =>
                  showPlayerActions(p.user_id, prof?.display_name || prof?.username || 'Player')
                }
                activeOpacity={0.8}
              >
                <PlayerCard profile={prof} teamColor={Colors.team2} selected />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Pick Players */}
      {game.status === 'picking' && availablePlayers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            PICK FOR{' '}
            <Text style={{ color: currentTeam === 1 ? Colors.team1 : Colors.team2 }}>
              TEAM {currentTeam}
            </Text>
          </Text>
          {availablePlayers.map((player) => (
            <PlayerCard
              key={player.id}
              profile={player}
              stats={player.career}
              onPress={() => pickPlayer(player.id)}
            />
          ))}
        </View>
      )}

      {/* Game Controls */}
      {game.status === 'picking' && players.length >= 2 && (
        <Button title="Start Game" onPress={startGame} variant="accent" size="lg" />
      )}

      {game.status === 'active' && (
        <View style={styles.activeActions}>
          {user && game.scorekeeper_id === user.id ? (
            <Button
              title="Keep Score"
              onPress={() => router.push(`/game/scoreboard/${id}`)}
              variant="accent"
              size="lg"
            />
          ) : game.scorekeeper_id ? (
            <View style={styles.scorekeeperNotice}>
              <Text style={styles.scorekeeperNoticeLabel}>SCOREKEEPER</Text>
              <Text style={styles.scorekeeperNoticeName}>
                {scorekeeperName || 'Next up in queue'}
              </Text>
            </View>
          ) : (
            <Button
              title="Keep Score"
              onPress={() => router.push(`/game/scoreboard/${id}`)}
              variant="accent"
              size="lg"
            />
          )}
          <Button title="End Game" onPress={endGame} variant="primary" size="lg" />
        </View>
      )}

      {/* Stats Entry Mode */}
      {statsMode && user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOG YOUR STATS</Text>
          <View style={styles.statsForm}>
            {(['points', 'assists', 'rebounds', 'steals', 'blocks', 'three_pointers'] as const).map(
              (stat) => (
                <View key={stat} style={styles.statInput}>
                  <Text style={styles.statInputLabel}>
                    {stat === 'three_pointers' ? '3PT' : stat.toUpperCase()}
                  </Text>
                  <TextInput
                    style={styles.statInputField}
                    keyboardType="number-pad"
                    value={playerStats[user.id]?.[stat] || ''}
                    onChangeText={(val) =>
                      setPlayerStats((prev) => ({
                        ...prev,
                        [user.id]: { ...prev[user.id], [stat]: val },
                      }))
                    }
                    placeholder="0"
                    placeholderTextColor={Colors.muted}
                  />
                </View>
              )
            )}
          </View>
          <Button title="Submit My Stats" onPress={submitStats} size="md" />
        </View>
      )}

      {/* Vouch Mode */}
      {vouchMode && pendingStats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VOUCH FOR STATS</Text>
          <Text style={styles.vouchSubtitle}>
            Confirm or deny these player stats
          </Text>
          {pendingStats.map((stat) => (
            <View key={stat.id} style={styles.vouchCard}>
              <Text style={styles.vouchName}>
                {stat.profile?.display_name || stat.profile?.username || 'Player'}
              </Text>
              <View style={styles.vouchStats}>
                <Text style={styles.vouchStat}>{stat.points} PTS</Text>
                <Text style={styles.vouchStat}>{stat.assists} AST</Text>
                <Text style={styles.vouchStat}>{stat.rebounds} REB</Text>
                <Text style={styles.vouchStat}>{stat.steals} STL</Text>
                <Text style={styles.vouchStat}>{stat.blocks} BLK</Text>
              </View>
              <View style={styles.vouchActions}>
                <TouchableOpacity
                  style={[styles.vouchBtn, { backgroundColor: Colors.accent }]}
                  onPress={() => vouchForPlayer(stat.user_id, true)}
                >
                  <Text style={styles.vouchBtnText}>LEGIT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.vouchBtn, { backgroundColor: Colors.error }]}
                  onPress={() => vouchForPlayer(stat.user_id, false)}
                >
                  <Text style={styles.vouchBtnText}>CAP</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          visible={!!reportTarget}
          onClose={() => setReportTarget(null)}
          reportedUserId={reportTarget.userId}
          contentType="game"
          contentId={id || ''}
          userName={reportTarget.userName}
        />
      )}

      {/* Block Confirm Modal */}
      {blockTarget && (
        <BlockConfirmModal
          visible={!!blockTarget}
          onClose={() => setBlockTarget(null)}
          userId={blockTarget.userId}
          userName={blockTarget.userName}
          onBlocked={fetchData}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  gameType: {
    fontFamily: Fonts.display,
    fontSize: 48,
    color: Colors.primary,
  },
  statusBadge: {
    backgroundColor: Colors.primary + '30',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.primary,
  },
  teamsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  teamCol: { flex: 1 },
  teamLabel: {
    fontFamily: Fonts.display,
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  vs: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.muted,
    alignSelf: 'center',
    marginTop: 30,
  },
  activeActions: { gap: 10, marginBottom: 12 },
  scorekeeperNotice: {
    backgroundColor: Colors.accent + '15',
    borderWidth: 1,
    borderColor: Colors.accent + '30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  scorekeeperNoticeLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  scorekeeperNoticeName: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.accent,
    marginTop: 4,
  },
  section: { marginTop: 24, marginBottom: 12 },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.foreground,
    marginBottom: 12,
  },
  statsForm: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statInput: {
    width: '30%',
    alignItems: 'center',
  },
  statInputLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.muted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statInputField: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    borderRadius: 10,
    padding: 12,
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.foreground,
    textAlign: 'center',
    width: '100%',
  },
  vouchSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    marginBottom: 12,
  },
  vouchCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  vouchName: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.foreground,
    marginBottom: 8,
  },
  vouchStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  vouchStat: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  vouchActions: {
    flexDirection: 'row',
    gap: 10,
  },
  vouchBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  vouchBtnText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.background,
  },
});
