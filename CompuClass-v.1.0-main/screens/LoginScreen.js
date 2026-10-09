import React, { useState } from 'react';
import { Alert } from 'react-native';
import { authService } from '../services/authService';
import { limiters, RateLimitError } from '../utils/rateLimiter';
import { getErrorMessage } from '../utils/errorMessages';
import { logSecurityEvent, maskEmail } from '../utils/securityLog';
import { cleanEmail } from '../utils/inputValidation';
import AuthLayout, { AuthLink } from '../components/ui/AuthLayout';
import { Button, Field } from '../components/ui/kit';

const isCredentialFailure = (error) =>
  error?.code === 'invalid_credentials' || /invalid login credentials/i.test(error?.message || '');

export default function LoginScreen({ onLogin, onSignUp, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please enter email and password'); return; }
    let trimmedEmail;
    try {
      trimmedEmail = cleanEmail(email);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, { context: 'login' }));
      return;
    }
    setLoading(true);
    try {
      const { allowed, retryAfterMs } = await limiters.login.check(trimmedEmail);
      if (!allowed) {
        logSecurityEvent('login_blocked_locked_out', { email: maskEmail(trimmedEmail), retryAfterSeconds: Math.ceil(retryAfterMs / 1000) });
        throw new RateLimitError(retryAfterMs);
      }
      await authService.signIn(trimmedEmail, password);
      await limiters.login.reset(trimmedEmail);
      onLogin();
    } catch (error) {
      if (isCredentialFailure(error)) {
        const result = await limiters.login.recordFailure(trimmedEmail);
        logSecurityEvent('login_failed', { email: maskEmail(trimmedEmail), recentFailures: result.failures });
        if (result.lockedNow) {
          logSecurityEvent('login_lockout', { email: maskEmail(trimmedEmail), lockoutSeconds: Math.ceil(result.retryAfterMs / 1000), lockoutNumber: result.lockouts });
        }
      }
      Alert.alert('Error', getErrorMessage(error, { context: 'login' }));
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up your lessons, quizzes and streak."
      footer={<AuthLink prefix="New to CompuClass?" label="Create an account" onPress={onSignUp} />}
    >
      <Field label="Email address" icon="mail" placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Password" icon="lock" placeholder="Password" value={password} onChangeText={setPassword} secure secureVisible={showPassword} onToggleSecure={() => setShowPassword((v) => !v)} />
      <Button label="Forgot password?" variant="text" onPress={onForgotPassword} style={{ alignSelf: 'flex-end', marginTop: -8, marginBottom: 8, maxWidth: undefined, width: undefined }} />
      <Button label={loading ? 'Signing in...' : 'Sign in'} onPress={handleLogin} disabled={loading} block />
    </AuthLayout>
  );
}
