import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, router } from 'expo-router';

import { Field, InfoBanner, PrimaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { mobileApi } from '@/services/api';
import { colors } from '@/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await mobileApi.loginPatient(phone, password);
      await signIn(res.data.user, res.data.accessToken, res.data.refreshToken);
      router.replace('/home');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể đăng nhập lúc này.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center', gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 34, fontWeight: '900', color: colors.text }}>Chào mừng trở lại</Text>
        <Text style={{ color: colors.textMuted, lineHeight: 22 }}>
          Đăng nhập để đặt lịch khám, theo dõi lịch hẹn và quản lý hồ sơ sức khỏe ngay trên điện thoại.
        </Text>
      </View>

      {error ? <InfoBanner tone="error" text={error} /> : null}

      <Field label="Số điện thoại" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <Field label="Mật khẩu" secureTextEntry value={password} onChangeText={setPassword} />

      <Pressable onPress={() => router.push('/forgot-password')}>
        <Text style={{ color: colors.primary, fontWeight: '700', textAlign: 'right' }}>Quên mật khẩu?</Text>
      </Pressable>

      <PrimaryButton label="Đăng nhập" onPress={handleLogin} loading={loading} />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
        <Text style={{ color: colors.textMuted }}>Chưa có hồ sơ bệnh nhân?</Text>
        <Link href="/register" asChild>
          <Pressable>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Đăng ký ngay</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
