import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, router } from 'expo-router';

import { Field, InfoBanner, PrimaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { mobileApi } from '@/services/api';
import { colors } from '@/theme';

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    dob: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRegister = async () => {
    setError('');
    setLoading(true);

    try {
      await mobileApi.registerPatient(form);
      const loginRes = await mobileApi.loginPatient(form.phone, form.password);
      await signIn(loginRes.data.user, loginRes.data.accessToken, loginRes.data.refreshToken);
      router.replace('/home');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể đăng ký lúc này.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 32, fontWeight: '900', color: colors.text }}>Tạo hồ sơ bệnh nhân</Text>
        <Text style={{ color: colors.textMuted, lineHeight: 22 }}>
          Hồ sơ này sẽ được dùng cho đặt lịch, theo dõi lịch hẹn và đồng bộ thông tin thăm khám.
        </Text>
      </View>

      {error ? <InfoBanner tone="error" text={error} /> : null}

      <Field label="Họ và tên" value={form.name} onChangeText={(value) => updateField('name', value)} />
      <Field label="Số điện thoại" keyboardType="phone-pad" value={form.phone} onChangeText={(value) => updateField('phone', value)} />
      <Field label="Email" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(value) => updateField('email', value)} />
      <Field label="Mật khẩu" secureTextEntry value={form.password} onChangeText={(value) => updateField('password', value)} />
      <Field label="Ngày sinh (yyyy-mm-dd)" value={form.dob} onChangeText={(value) => updateField('dob', value)} />
      <Field label="Địa chỉ" multiline value={form.address} onChangeText={(value) => updateField('address', value)} />

      <PrimaryButton label="Hoàn tất đăng ký" onPress={handleRegister} loading={loading} />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
        <Text style={{ color: colors.textMuted }}>Đã có tài khoản?</Text>
        <Link href="/login" asChild>
          <Pressable>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Đăng nhập ngay</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
