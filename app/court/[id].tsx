import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
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
import StatBar from '../../src/components/StatBar';
import ReportModal from '../../src/components/ReportModal';
import BlockConfirmModal from '../../src/components/BlockConfirmModal';
import { getBlockedUserIds } from '../../src/services/moderationService';
import type { Court, QueueEntry, Profile, CareerStats } from '../../src/lib/types';

export default function CourtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [court, setCourt] = useState<Court | null>(null);
  const [checkedInPlayers, setCheckedInPlayers] = useState<(Profile & { career?: CareerStats })[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

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

    // Fetch court
    const { data: courtData } = await supabase
      .from('courts')
      .select('*')
      .eq('id', id)
      .single();
    if (courtData) setCourt(courtData);

    // Fetch active check-ins with profiles
    const { data: checkIns } = await supabase
      .from('check_ins')
      .select('user_id')
      .eq('court_id', id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (checkIns && checkIns.length > 0) {
      const userIds = checkIns.map((ci) => ci.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      // Fetch career stats for each player
      const { data: stats } = await supabase
        .from('player_career_stats')
        .select('*')
        .in('user_id', userIds);

      const playersWithStats = (profiles || []).map((p) => ({
        ...p,
        career: stats?.find((s) => s.user_id === p.id),
      }));
      setCheckedInPlayers(playersWithStats);

      if (user) {
        setIsCheckedIn(userIds.includes(user.id));
      }
    } else {
      setCheckedInPlayers([]);
      setIsCheckedIn(false);
    }

    // Fetch queue
    const { data: queueData } = await supabase
      .from('queue')
      .select('*, profiles(*)')
      .eq('court_id', id)
      .eq('status', 'waiting')
      .order('position', { ascending: true });

    if (queueData) {
      setQueue(queueData);
      if (user) {
        setInQueue(queueData.some((q) => q.user_id === user.id));
      }
    }

    // Fetch blocked user IDs
    if (user) {
      const blocked = await getBlockedUserIds(user.id);
      setBlockedIds(blocked);
    }

    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = async () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }

    if (isCheckedIn) {
      await supabase
        .from('check_ins')
        .update({ is_active: false })
        .eq('court_id', id)
        .eq('user_id', user.id)
        .eq('is_active', true);
    } else {
      await supabase.from('check_ins').insert({
        user_id: user.id,
        court_id: id,
      });
    }
    fetchData();
  };

  const handleGotNext = async () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }

    if (inQueue) {
      await supabase
        .from('queue')
        .update({ status: 'done' })
        .eq('court_id', id)
        .eq('user_id', user.id)
        .eq('status', 'waiting');
    } else {
      const nextPosition = queue.length > 0 ? Math.max(...queue.map((q) => q.position)) + 1 : 1;
      await supabase.from('queue').insert({
        user_id: user.id,
        court_id: id,
        position: nextPosition,
      });
    }
    fetchData();
  };

  const handleStartGame = async (gameType: '5v5' | '3v3' | '1v1') => {
    if (!user) return;

    // The #1 person in the queue is the designated scorekeeper
    const scorekeeperId = queue.length > 0 ? queue[0].user_id : null;

    const { data: game, error } = await supabase
      .from('games')
      .insert({
        court_id: id,
        game_type: gameType,
        created_by: user.id,
        scorekeeper_id: scorekeeperId,
        status: 'picking',
      })
      .select()
      .single();

    if (game) {
      router.push(`/game/${game.id}`);
    } else if (error) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>LOADING...</Text>
      </View>
    );
  }

  if (!court) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>COURT NOT FOUND</Text>
      </View>
    );
  }

  // Filter out blocked players
  const visiblePlayers = checkedInPlayers.filter((p) => !blockedIds.includes(p.id));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Court Header */}
      <Text style={styles.courtName}>{court.name}</Text>
      <Text style={styles.courtAddress}>{court.address}</Text>
      <View style={styles.tags}>
        <Text style={styles.tagPrimary}>{court.surface_type}</Text>
      </View>

      {/* Active Players Count */}
      <View style={styles.statsRow}>
        <StatBar label="At Court" value={checkedInPlayers.length} color={Colors.accent} />
        <StatBar label="In Queue" value={queue.length} color={Colors.primary} />
      </View>

      {/* Check In / Got Next Buttons */}
      <View style={styles.actions}>
        <Button
          title={isCheckedIn ? "I'm Leaving" : "I'm Here"}
          onPress={handleCheckIn}
          variant={isCheckedIn ? 'accent' : 'primary'}
          size="lg"
        />
        <Button
          title={inQueue ? 'Leave Queue' : 'I Got Next'}
          onPress={handleGotNext}
          variant={inQueue ? 'ghost' : 'outline'}
          size="md"
        />
      </View>

      {/* Start a Game */}
      {checkedInPlayers.length >= 2 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>START A GAME</Text>
          <View style={styles.gameTypeRow}>
            {(['1v1', '3v3', '5v5'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.gameTypeBtn}
                onPress={() => handleStartGame(type)}
              >
                <Text style={styles.gameTypeText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Queue */}
      {queue.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NEXT UP</Text>
          {queue.map((entry, index) => (
            <View key={entry.id} style={styles.queueItem}>
              <Text style={styles.queuePosition}>#{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueName}>
                  {(entry.profiles as unknown as Profile)?.display_name ||
                    (entry.profiles as unknown as Profile)?.username ||
                    'Player'}
                </Text>
                {index === 0 && (
                  <Text style={styles.scorekeeperBadge}>SCOREKEEPER</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Players at Court */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          PLAYERS HERE ({visiblePlayers.length})
        </Text>
        {visiblePlayers.length === 0 ? (
          <Text style={styles.emptyText}>No one here yet. Be the first to pull up!</Text>
        ) : (
          visiblePlayers.map((player) => (
            <TouchableOpacity
              key={player.id}
              onLongPress={() =>
                showPlayerActions(
                  player.id,
                  player.display_name || player.username,
                )
              }
              activeOpacity={0.8}
            >
              <PlayerCard
                profile={player}
                stats={player.career}
                onPress={() => router.push(`/court/${id}?player=${player.id}`)}
              />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          visible={!!reportTarget}
          onClose={() => setReportTarget(null)}
          reportedUserId={reportTarget.userId}
          contentType="profile"
          contentId={reportTarget.userId}
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
  courtName: {
    fontFamily: Fonts.display,
    fontSize: 42,
    color: Colors.primary,
    lineHeight: 44,
  },
  courtAddress: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
    marginTop: 4,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  tagPrimary: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.primary,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginTop: 24,
    marginBottom: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  actions: { gap: 10, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.foreground,
    marginBottom: 12,
  },
  gameTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gameTypeBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  gameTypeText: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.primary,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  queuePosition: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.accent,
    width: 40,
  },
  queueName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    color: Colors.foreground,
  },
  scorekeeperBadge: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.accent,
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
