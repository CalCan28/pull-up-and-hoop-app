import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Colors, Fonts } from '../../src/constants/theme';
import Button from '../../src/components/Button';
import ScreenBackground from '../../src/components/ScreenBackground';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <ScreenBackground imageIndex={4}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>{'\u{1F3C0}'}</Text>
        <Text style={styles.title}>WELCOME{'\n'}BACK</Text>
        <Text style={styles.subtitle}>Sign in to find your next game</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button title="Sign In" onPress={handleLogin} loading={loading} size="lg" />
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={styles.link}>
          <Text style={styles.linkText}>
            Don't have an account?{' '}
            <Text style={styles.linkAccent}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emoji: { fontSize: 64, textAlign: 'center', marginBottom: 16 },
  title: {
    fontFamily: Fonts.display,
    fontSize: 52,
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 52,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: Colors.error + '15',
    padding: 10,
    borderRadius: 8,
  },
  form: { gap: 14 },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 16,
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.foreground,
  },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
  },
  linkAccent: { color: Colors.accent },
});
