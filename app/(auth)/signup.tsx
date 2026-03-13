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
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { Colors, Fonts } from '../../src/constants/theme';
import Button from '../../src/components/Button';
import ScreenBackground from '../../src/components/ScreenBackground';
import { containsOffensiveContent } from '../../src/services/moderationService';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [position, setPosition] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const positions = ['PG', 'SG', 'SF', 'PF', 'C'];

  const handleSignup = async () => {
    if (!username || !email || !password) {
      setError('Fill in all required fields');
      return;
    }
    if (!termsAgreed) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }
    // Content filtering on username and display name
    if (containsOffensiveContent(username) || containsOffensiveContent(displayName)) {
      Alert.alert(
        'Content Not Allowed',
        'Your username or display name contains language that violates our community guidelines. Please choose a different name.',
      );
      return;
    }
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName || username,
        },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.session) {
      // User is logged in immediately (email confirm is OFF)
      if (data.user) {
        await supabase
          .from('profiles')
          .update({
            position: position || null,
            display_name: displayName || username,
            terms_accepted_at: new Date().toISOString(),
          })
          .eq('id', data.user.id);
      }
      router.replace('/(tabs)');
    } else {
      // Email confirmation is required — tell the user
      setError('Check your email to confirm your account, then come back and sign in.');
      setLoading(false);
    }
  };

  return (
    <ScreenBackground imageIndex={5}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>JOIN THE{'\n'}GAME</Text>
        <Text style={styles.subtitle}>Create your player profile</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Username *"
            placeholderTextColor={Colors.muted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Display Name"
            placeholderTextColor={Colors.muted}
            value={displayName}
            onChangeText={setDisplayName}
          />
          <TextInput
            style={styles.input}
            placeholder="Email *"
            placeholderTextColor={Colors.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password *"
            placeholderTextColor={Colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Position picker */}
          <Text style={styles.label}>Position</Text>
          <View style={styles.positionRow}>
            {positions.map((pos) => (
              <TouchableOpacity
                key={pos}
                style={[
                  styles.positionBtn,
                  position === pos && styles.positionBtnActive,
                ]}
                onPress={() => setPosition(pos === position ? '' : pos)}
              >
                <Text
                  style={[
                    styles.positionText,
                    position === pos && styles.positionTextActive,
                  ]}
                >
                  {pos}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Terms Agreement */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setTermsAgreed(!termsAgreed)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, termsAgreed && styles.checkboxChecked]}>
              {termsAgreed && <Text style={styles.checkmark}>{'\u2713'}</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL('https://pullupandhoop.com/terms')}
              >
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text
                style={styles.termsLink}
                onPress={() => Linking.openURL('https://pullupandhoop.com/privacy')}
              >
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>

          <Button title="Sign Up" onPress={handleSignup} loading={loading} size="lg" disabled={!termsAgreed} />
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.link}>
          <Text style={styles.linkText}>
            Already have an account?{' '}
            <Text style={styles.linkAccent}>Sign in</Text>
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
  label: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  positionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  positionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  positionBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  positionText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.muted,
  },
  positionTextActive: {
    color: Colors.background,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.surfaceLight,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.accent,
    textDecorationLine: 'underline',
  },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
  },
  linkAccent: { color: Colors.accent },
});
