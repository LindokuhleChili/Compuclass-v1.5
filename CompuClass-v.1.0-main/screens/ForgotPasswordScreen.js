import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { supabase } from '../config/supabase';
import { limiters, RateLimitError } from '../utils/rateLimiter';
import { getErrorMessage } from '../utils/errorMessages';
import { logSecurityEvent, maskEmail } from '../utils/securityLog';
import { validateNewPassword, PASSWORD_HINT, PASSWORD_MAX_LENGTH } from '../utils/passwordPolicy';
import { passwordResetSendOutcome } from '../utils/passwordResetNotice';
import { useTheme } from '../context/ThemeContext';
import AuthLayout from '../components/ui/AuthLayout';
import { Button, Field } from '../components/ui/kit';

export default function ForgotPasswordScreen({ onBackToLogin }) {
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) { Alert.alert('Error', 'Please enter your email'); return; }
    setLoading(true);
    try {
      await limiters.passwordResetSend.consume(email.trim());
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, { context: 'passwordResetSend' }));
      setLoading(false);
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
      const outcome = passwordResetSendOutcome(error);
      if (outcome.advance) {
        Alert.alert('Check your email', outcome.message);
        setStep(2);
      } else {
        Alert.alert('Error', getErrorMessage(error, { context: 'passwordResetSend' }));
      }
    } catch (error) {
      const outcome = passwordResetSendOutcome(error);
      if (outcome.advance) {
        Alert.alert('Check your email', outcome.message);
        setStep(2);
      } else {
        Alert.alert('Error', getErrorMessage(error, { context: 'passwordResetSend' }));
      }
    } finally { setLoading(false); }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) { Alert.alert('Error', 'Please enter the code'); return; }
    setLoading(true);
    try {
      const { allowed, retryAfterMs } = await limiters.passwordResetVerify.check(email);
      if (!allowed) {
        logSecurityEvent('password_reset_verify_blocked_locked_out', { email: maskEmail(email), retryAfterSeconds: Math.ceil(retryAfterMs / 1000) });
        throw new RateLimitError(retryAfterMs);
      }
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (error) throw error;
      await limiters.passwordResetVerify.reset(email);
      setStep(3);
    } catch (error) {
      if (error instanceof RateLimitError) {
        Alert.alert('Error', error.userMessage);
      } else {
        getErrorMessage(error, { context: 'passwordResetVerify' });
        const result = await limiters.passwordResetVerify.recordFailure(email);
        logSecurityEvent('password_reset_code_failed', { email: maskEmail(email), recentFailures: result.failures });
        if (result.lockedNow) {
          logSecurityEvent('password_reset_lockout', { email: maskEmail(email), lockoutSeconds: Math.ceil(result.retryAfterMs / 1000) });
          Alert.alert('Error', new RateLimitError(result.retryAfterMs).userMessage);
        } else {
          Alert.alert('Error', 'Invalid or expired code. Please try again.');
        }
      }
    } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) { Alert.alert('Error', 'Please fill all fields'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
    setLoading(true);
    try {
      const passwordProblems = await validateNewPassword(newPassword, { email });
      if (passwordProblems.length > 0) { Alert.alert('Choose a stronger password', passwordProblems.join('\n')); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await supabase.auth.signOut();
      Alert.alert('Success', 'Password reset successfully! Please log in.', [{ text: 'OK', onPress: onBackToLogin }]);
    } catch (error) { Alert.alert('Error', getErrorMessage(error, { context: 'passwordReset' })); }
    finally { setLoading(false); }
  };

  const leave = async () => {
    if (step >= 3) {
      try { await supabase.auth.signOut(); } catch { /* still return to login */ }
    }
    onBackToLogin();
  };

  const subtitles = [
    'Enter your email to receive a reset code.',
    'Enter the 6-digit code sent to your email.',
    'Choose a new password.',
  ];

  return (
    <AuthLayout title="Reset password" subtitle={subtitles[step - 1]}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24, alignSelf: 'stretch' }}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: step >= s ? theme.primary : theme.border }} />
        ))}
      </View>
      {step === 1 && (
        <>
          <Field label="Email address" icon="mail" placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Button label={loading ? 'Sending...' : 'Send code'} onPress={handleSendCode} disabled={loading} block />
        </>
      )}
      {step === 2 && (
        <>
          <Field label="Code" icon="lock" placeholder="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
          <Button label={loading ? 'Verifying...' : 'Verify code'} onPress={handleVerifyCode} disabled={loading} block />
          <Button label="Resend code" variant="text" onPress={() => { setStep(1); setCode(''); }} />
        </>
      )}
      {step === 3 && (
        <>
          <Field label="New password" icon="lock" placeholder="New Password" value={newPassword} onChangeText={setNewPassword} secure secureVisible={showPassword} onToggleSecure={() => setShowPassword((v) => !v)} maxLength={PASSWORD_MAX_LENGTH} hint={PASSWORD_HINT} />
          <Field label="Confirm password" icon="lock" placeholder="Confirm New Password" value={confirmPassword} onChangeText={setConfirmPassword} secure secureVisible={showPassword} onToggleSecure={() => setShowPassword((v) => !v)} />
          <Button label={loading ? 'Resetting...' : 'Reset password'} onPress={handleResetPassword} disabled={loading} block />
        </>
      )}
      <Button label="Back to sign in" variant="text" onPress={leave} />
    </AuthLayout>
  );
}
