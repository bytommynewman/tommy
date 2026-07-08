import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function SignupScreen() {
  const { colors, typography, spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setError(null);
    setMessage(null);
    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setMessage('Check your email to confirm your account, then log in.');
  }

  return (
    <Screen scroll safeTop>
      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        <Text style={[typography.title, { color: colors.text }]}>Create your account</Text>
        <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.md }]}>
          This app is just for you — one account, everything private.
        </Text>

        <TextField
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} />

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        {message ? <Text style={{ color: colors.success }}>{message}</Text> : null}

        <Button label="Sign up" onPress={handleSignup} loading={loading} disabled={!email || !password} />

        <Link href="/(auth)/login" style={{ textAlign: 'center', color: colors.textMuted, marginTop: spacing.md }}>
          Already have an account? Log in
        </Link>
      </View>
    </Screen>
  );
}
