import { Tabs } from 'expo-router';
import { Text, Image } from 'react-native';
import { Colors, Fonts } from '../../src/constants/theme';

const logo = require('../../assets/backgrounds/logo.png');

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    map: '\u{1F3C0}',       // basketball
    host: '\u{1F4E2}',      // megaphone
    profile: '\u{1F464}',   // person
    leaderboard: '\u{1F3C6}', // trophy
  };
  return (
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '\u{2B50}'}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.surfaceLight,
          height: 85,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: {
          fontFamily: Fonts.bodySemiBold,
          fontSize: 11,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.foreground,
        headerTitleStyle: { fontFamily: Fonts.display, fontSize: 24 },
        headerShadowVisible: false,
        headerLeft: () => (
          <Image
            source={logo}
            style={{ width: 160, height: 160, marginLeft: 12 }}
            resizeMode="contain"
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Find Courts',
          tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="host"
        options={{
          title: 'Host a Run',
          tabBarIcon: ({ focused }) => <TabIcon name="host" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Stats',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaders',
          tabBarIcon: ({ focused }) => <TabIcon name="leaderboard" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
