import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Linking } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Colors, Fonts } from '../../src/constants/theme';
import ScreenBackground from '../../src/components/ScreenBackground';
import type { Court, PickupSession } from '../../src/lib/types';

const { width } = Dimensions.get('window');

export default function MapScreen() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [pickupSessions, setPickupSessions] = useState<PickupSession[]>([]);
  const [activeCounts, setActiveCounts] = useState<Record<string, number>>({});
  const [region, setRegion] = useState<Region>({
    latitude: 33.749,
    longitude: -84.388,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });
  const [listMode, setListMode] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion((prev) => ({
          ...prev,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        }));
      }
    })();
  }, []);

  // Re-fetch courts and hosted runs every time this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchCourts();
    }, [])
  );

  const fetchCourts = async () => {
    const { data } = await supabase.from('courts').select('*');
    if (data) setCourts(data);

    const { data: checkIns } = await supabase
      .from('check_ins')
      .select('court_id')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (checkIns) {
      const counts: Record<string, number> = {};
      checkIns.forEach((ci) => {
        counts[ci.court_id] = (counts[ci.court_id] || 0) + 1;
      });
      setActiveCounts(counts);
    }

    // Fetch active pickup sessions
    const { data: sessions } = await supabase
      .from('pickup_sessions')
      .select('*, profiles:created_by(display_name, username)')
      .in('status', ['upcoming', 'active'])
      .gt('end_time', new Date().toISOString())
      .order('start_time', { ascending: true });
    if (sessions) setPickupSessions(sessions);
  };

  const renderCourtCard = ({ item }: { item: Court }) => (
    <TouchableOpacity
      style={styles.courtCard}
      onPress={() => router.push(`/court/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.courtCardHeader}>
        <Text style={styles.courtName}>{item.name}</Text>
        <View style={styles.activeCount}>
          <Text style={styles.activeCountText}>
            {activeCounts[item.id] || 0}
          </Text>
          <Text style={styles.activeCountLabel}>playing</Text>
        </View>
      </View>
      <Text style={styles.courtAddress}>{item.address}</Text>
      <View style={styles.tags}>
        <Text style={styles.tag}>{item.surface_type}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenBackground imageIndex={0}>
      {/* Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !listMode && styles.toggleActive]}
          onPress={() => setListMode(false)}
        >
          <Text style={[styles.toggleText, !listMode && styles.toggleTextActive]}>
            Map
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, listMode && styles.toggleActive]}
          onPress={() => setListMode(true)}
        >
          <Text style={[styles.toggleText, listMode && styles.toggleTextActive]}>
            List
          </Text>
        </TouchableOpacity>
      </View>

      {listMode ? (
        <FlatList
          data={courts}
          keyExtractor={(item) => item.id}
          renderItem={renderCourtCard}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            pickupSessions.length > 0 ? (
              <View>
                <Text style={styles.sectionLabel}>HOSTED RUNS</Text>
                {pickupSessions.map((session) => {
                  const endTime = new Date(session.end_time);
                  const now = new Date();
                  const hoursLeft = Math.max(
                    0,
                    Math.round((endTime.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10
                  );
                  const profile = session.profiles as any;
                  const hostName = profile?.display_name || profile?.username || 'Someone';
                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={styles.sessionCard}
                      activeOpacity={0.7}
                      onPress={() => {
                        const url = `maps://0,0?q=${encodeURIComponent(session.location_name)}@${session.lat},${session.lng}`;
                        Linking.openURL(url);
                      }}
                    >
                      <View style={styles.courtCardHeader}>
                        <Text style={styles.courtName}>{session.location_name}</Text>
                        <View style={styles.liveBadge}>
                          <Text style={styles.liveBadgeText}>LIVE</Text>
                        </View>
                      </View>
                      <Text style={styles.courtAddress}>{session.address}</Text>
                      <Text style={styles.sessionMeta}>
                        {session.game_type.toUpperCase()} {'\u2022'} {hoursLeft}h left {'\u2022'} Hosted by {hostName}
                      </Text>
                      {session.description ? (
                        <Text style={styles.sessionDesc}>{session.description}</Text>
                      ) : null}
                      <Text style={styles.directionsLink}>TAP FOR DIRECTIONS</Text>
                    </TouchableOpacity>
                  );
                })}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>COURTS</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No courts found. Add one from the web admin.</Text>
          }
        />
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          userInterfaceStyle="dark"
          showsUserLocation
          showsMyLocationButton
        >
          {courts.map((court) => (
            <Marker
              key={court.id}
              coordinate={{ latitude: court.lat, longitude: court.lng }}
              title={court.name}
              description={`${activeCounts[court.id] || 0} playing`}
              onCalloutPress={() => router.push(`/court/${court.id}`)}
              pinColor={Colors.primary}
            />
          ))}
          {pickupSessions.map((session) => (
            <Marker
              key={`session-${session.id}`}
              coordinate={{ latitude: session.lat, longitude: session.lng }}
              title={session.location_name}
              description={`${session.game_type.toUpperCase()} \u2022 Hosted run`}
              pinColor={Colors.accent}
            />
          ))}
        </MapView>
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  toggleRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleText: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.muted,
  },
  toggleTextActive: {
    color: Colors.background,
  },
  map: { flex: 1 },
  list: { padding: 12 },
  courtCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  courtCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courtName: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.foreground,
    flex: 1,
  },
  activeCount: { alignItems: 'center' },
  activeCountText: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.accent,
  },
  activeCountLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.accent,
    textTransform: 'uppercase',
  },
  courtAddress: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    marginTop: 4,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.muted,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  empty: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 40,
  },
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.muted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  sessionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  liveBadge: {
    backgroundColor: Colors.accent + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 1,
  },
  sessionMeta: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.primary,
    marginTop: 6,
  },
  sessionDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  directionsLink: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: Colors.accent,
    marginTop: 10,
    letterSpacing: 1,
  },
});
