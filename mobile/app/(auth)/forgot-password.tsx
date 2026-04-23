import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { Field, InfoBanner, PrimaryButton, Screen } from '@/components/ui';
import { mobileApi } from '@/services/api';
import { colors } from '@/theme';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [previewOtp, setPreviewOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestOtp = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await mobileApi.requestPatientPasswordResetOtp(phone);
      setPreviewOtp((res.data as any).previewOtp || '');
      setSuccess((res.data as any).message || 'Mã OTP đã được tạo.');
      setStep('reset');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tạo OTP lúc này.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const res = await mobileApi.resetPatientPasswordWithOtp(phone, otp, newPassword);
      setSuccess((res.data as any).message || 'Đặt lại mật khẩu thành công.');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setPreviewOtp('');
      setStep('request');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 32, fontWeight: '900', color: colors.text }}>
          {step === 'request' ? 'Khôi phục mật khẩu' : 'Xác nhận OTP'}
        </Text>
        <Text style={{ color: colors.textMuted, lineHeight: 22 }}>
          {step === 'request'
            ? 'Nhập số điện thoại đã đăng ký để yêu cầu mã OTP.'
            : 'Nhập OTP cùng mật khẩu mới để hoàn tất việc đặt lại tài khoản.'}
        </Text>
      </View>

      {error ? <InfoBanner tone="error" text={error} /> : null}
      {success ? <InfoBanner tone="success" text={success} /> : null}
      {previewOtp && step === 'reset' ? <InfoBanner text={`Mã OTP test hiện tại: ${previewOtp}`} /> : null}

      <Field label="Số điện thoại" keyboardType="phone-pad" value={phone} onChangeText={setPhone} editable={step !== 'reset'} />

      {step === 'reset' ? (
        <>
          <Field label="Mã OTP" keyboardType="number-pad" value={otp} onChangeText={setOtp} />
          <Field label="Mật khẩu mới" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
          <Field label="Xác nhận mật khẩu mới" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
          <PrimaryButton label="Đặt lại mật khẩu" onPress={handleResetPassword} loading={loading} />
          <Pressable onPress={() => setStep('request')}>
            <Text style={{ color: colors.primary, fontWeight: '700', textAlign: 'center' }}>Gửi lại mã OTP</Text>
          </Pressable>
        </>
      ) : (
        <PrimaryButton label="Gửi mã OTP" onPress={handleRequestOtp} loading={loading} />
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
        <Text style={{ color: colors.textMuted }}>Đã nhớ lại mật khẩu?</Text>
        <Link href="/login" asChild>
          <Pressable>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Quay lại đăng nhập</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
