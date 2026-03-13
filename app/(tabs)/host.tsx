import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/lib/auth-context';
import { Colors, Fonts } from '../../src/constants/theme';
import Button from '../../src/components/Button';
import ScreenBackground from '../../src/components/ScreenBackground';
import { containsOffensiveContent } from '../../src/services/moderationService';
import type { PickupSession } from '../../src/lib/types';

type GameType = '5v5' | '3v3' | '1v1' | 'open';
type Duration = 1 | 2 | 3 | 4;

export default function HostScreen() {
  const { user } = useAuth();
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gameType, setGameType] = useState<GameType>('open');
  const [duration, setDuration] = useState<Duration>(2);
  const [maxPlayers, setMaxPlayers] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mySessions, setMySessions] = useState<PickupSession[]>([]);

  useEffect(() => {
    if (user) fetchMySessions();
  }, [user]);

  const fetchMySessions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pickup_sessions')
      .select('*')
      .eq('created_by', user.id)
      .in('status', ['upcoming', 'active'])
      .order('start_time', { ascending: true });
    if (data) setMySessions(data);
  };

  const useCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Enable location to auto-fill your spot.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLat(loc.coords.latitude);
    setLng(loc.coords.longitude);

    const [place] = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
    if (place) {
      const addr = [place.name, place.street, place.city, place.region]
        .filter(Boolean)
        .join(', ');
      setAddress(addr);
    }
    Alert.alert('Location Set', 'Your current location has been saved.');
  };

  const handleSubmit = async () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    if (!locationName.trim()) {
      Alert.alert('Missing Info', 'Give your spot a name (e.g. "YMCA Downtown").');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Missing Info', 'Enter an address or use your current location.');
      return;
    }
    if (lat === null || lng === null) {
      Alert.alert('Missing Location', 'Tap "Use My Location" so people can find you on the map.');
      return;
    }

    // Content filtering
    if (
      containsOffensiveContent(locationName) ||
      containsOffensiveContent(description)
    ) {
      Alert.alert(
        'Content Not Allowed',
        'Your session name or description contains language that violates our community guidelines. Please revise and try again.',
      );
      return;
    }

    setSubmitting(true);
    const now = new Date();
    const endTime = new Date(now.getTime() + duration * 60 * 60 * 1000);

    const { error } = await supabase.from('pickup_sessions').insert({
      created_by: user.id,
      location_name: locationName.trim(),
      address: address.trim(),
      lat,
      lng,
      game_type: gameType,
      start_time: now.toISOString(),
      end_time: endTime.toISOString(),
      max_players: maxPlayers ? parseInt(maxPlayers, 10) : null,
      description: description.trim() || null,
      status: 'active',
    });

    setSubmitting(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Run Posted!', 'Players nearby can see your session on the map.');
      setLocationName('');
      setAddress('');
      setDescription('');
      setMaxPlayers('');
      fetchMySessions();
    }
  };

  const endSession = async (sessionId: string) => {
    await supabase
      .from('pickup_sessions')
      .update({ status: 'ended' })
      .eq('id', sessionId);
    fetchMySessions();
  };

  const gameTypes: { value: GameType; label: string }[] = [
    { value: 'open', label: 'OPEN RUN' },
    { value: '5v5', label: '5v5' },
    { value: '3v3', label: '3v3' },
    { value: '1v1', label: '1v1' },
  ];

  const durations: { value: Duration; label: string }[] = [
    { value: 1, label: '1 HR' },
    { value: 2, label: '2 HR' },
    { value: 3, label: '3 HR' },
    { value: 4, label: '4 HR' },
  ];

  return (
    <ScreenBackground imageIndex={1}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>HOST A RUN</Text>
      <Text style={styles.subtitle}>
        Let people know where you're hooping so they can pull up
      </Text>

      {/* Location Name */}
      <Text style={styles.label}>SPOT NAME</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. YMCA Downtown, Rucker Park"
        placeholderTextColor={Colors.muted}
        value={locationName}
        onChangeText={setLocationName}
      />

      {/* Address */}
      <Text style={styles.label}>ADDRESS</Text>
      <TextInput
        style={styles.input}
        placeholder="123 Main St, City, State"
        placeholderTextColor={Colors.muted}
        value={address}
        onChangeText={setAddress}
      />

      {/* Use Location Button */}
      <TouchableOpacity style={styles.locationBtn} onPress={useCurrentLocation}>
        <Text style={styles.locationBtnText}>
          {lat ? '\u2705 LOCATION SET' : '\uD83D\uDCCD USE MY LOCATION'}
        </Text>
      </TouchableOpacity>

      {/* Game Type */}
      <Text style={styles.label}>GAME TYPE</Text>
      <View style={styles.optionRow}>
        {gameTypes.map((gt) => (
          <TouchableOpacity
            key={gt.value}
            style={[styles.optionBtn, gameType === gt.value && styles.optionBtnActive]}
            onPress={() => setGameType(gt.value)}
          >
            <Text
              style={[
                styles.optionBtnText,
                gameType === gt.value && styles.optionBtnTextActive,
              ]}
            >
              {gt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Duration */}
      <Text style={styles.label}>HOW LONG ARE YOU PLAYING?</Text>
      <View style={styles.optionRow}>
        {durations.map((d) => (
          <TouchableOpacity
            key={d.value}
            style={[styles.optionBtn, duration === d.value && styles.optionBtnActive]}
            onPress={() => setDuration(d.value)}
          >
            <Text
              style={[
                styles.optionBtnText,
                duration === d.value && styles.optionBtnTextActive,
              ]}
            >
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Max Players */}
      <Text style={styles.label}>MAX PLAYERS (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 10"
        placeholderTextColor={Colors.muted}
        value={maxPlayers}
        onChangeText={setMaxPlayers}
        keyboardType="number-pad"
      />

      {/* Description */}
      <Text style={styles.label}>DETAILS (OPTIONAL)</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="e.g. Bring your own ball, indoor gym, $5 entry..."
        placeholderTextColor={Colors.muted}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      {/* Submit */}
      <Button
        title={submitting ? 'Posting...' : "LET'S HOOP"}
        onPress={handleSubmit}
        variant="primary"
        size="lg"
      />

      {/* My Active Sessions */}
      {mySessions.length > 0 && (
        <View style={styles.mySessionsSection}>
          <Text style={styles.mySessionsTitle}>YOUR ACTIVE RUNS</Text>
          {mySessions.map((session) => {
            const endTime = new Date(session.end_time);
            const now = new Date();
            const hoursLeft = Math.max(
              0,
              Math.round((endTime.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10
            );

            return (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionCardHeader}>
                  <Text style={styles.sessionName}>{session.location_name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      session.status === 'active'
                        ? styles.statusActive
                        : styles.statusUpcoming,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {session.status === 'active' ? 'LIVE' : 'UPCOMING'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sessionAddress}>{session.address}</Text>
                <Text style={styles.sessionMeta}>
                  {session.game_type.toUpperCase()} \u2022 {hoursLeft}h left
                </Text>
                <TouchableOpacity
                  style={styles.endBtn}
                  onPress={() =>
                    Alert.alert('End Run?', 'This will remove your session from the map.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'End It', style: 'destructive', onPress: () => endSession(session.id) },
                    ])
                  }
                >
                  <Text style={styles.endBtnText}>END RUN</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    fontFamily: Fonts.display,
    fontSize: 42,
    color: Colors.primary,
    lineHeight: 44,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
    marginTop: 4,
    marginBottom: 24,
  },
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.muted,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    borderRadius: 10,
    padding: 14,
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.foreground,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locationBtn: {
    marginTop: 12,
    backgroundColor: Colors.accent + '20',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  locationBtnText: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.accent,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionBtnText: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.muted,
  },
  optionBtnTextActive: {
    color: Colors.background,
  },
  mySessionsSection: {
    marginTop: 32,
  },
  mySessionsTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.foreground,
    marginBottom: 12,
  },
  sessionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionName: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.foreground,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: Colors.accent + '30',
  },
  statusUpcoming: {
    backgroundColor: Colors.primary + '30',
  },
  statusText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 1,
  },
  sessionAddress: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    marginTop: 4,
  },
  sessionMeta: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.primary,
    marginTop: 6,
  },
  endBtn: {
    marginTop: 10,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  endBtnText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.muted,
  },
});
