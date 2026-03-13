import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '../constants/theme';

interface StatBarProps {
  label: string;
  value: number | string;
  color?: string;
}

export default function StatBar({ label, value, color = Colors.primary }: StatBarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontFamily: Fonts.display,
    fontSize: 28,
    marginTop: 2,
  },
});
