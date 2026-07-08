import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const { colors, typography, spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) setError(signInError.message);
  }

  return (
    <Screen scroll safeTop>
      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        <Text style={[typography.title, { color: colors.text }]}>Tommy</Text>
        <Text style={[typography.body, { color: colors.textMuted, marginBottom: spacing.md }]}>
          Log in to your planner, tracker, and reflection space.
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

        <Button label="Log in" onPress={handleLogin} loading={loading} disabled={!email || !password} />

        <Link href="/(auth)/signup" style={{ textAlign: 'center', color: colors.textMuted, marginTop: spacing.md }}>
          Don&apos;t have an account? Sign up
        </Link>
      </View>
    </Screen>
  );
}
