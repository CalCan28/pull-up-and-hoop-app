import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Fonts } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  size = 'md',
}: ButtonProps) {
  const bg = {
    primary: Colors.primary,
    accent: Colors.accent,
    outline: 'transparent',
    ghost: 'transparent',
  }[variant];

  const textColor = {
    primary: Colors.background,
    accent: Colors.background,
    outline: Colors.primary,
    ghost: Colors.muted,
  }[variant];

  const heights = { sm: 40, md: 50, lg: 60 };
  const fontSizes = { sm: 16, md: 20, lg: 26 };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: bg, height: heights[size] },
        variant === 'outline' && { borderWidth: 2, borderColor: Colors.primary },
        (disabled || loading) && { opacity: 0.5 },
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize: fontSizes[size] }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  text: {
    fontFamily: Fonts.display,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
