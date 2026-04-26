import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, router } from 'expo-router';

import { Field, InfoBanner, PrimaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { mobileApi } from '@/services/api';
import { colors } from '@/theme';
import { maskDisplayDateInput, toApiDateValue } from '@/utils/date';

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
    
    if (!form.name || !form.phone || !form.email || !form.password) {
      setError('Vui lòng điền đầy đủ họ tên, số điện thoại, email và mật khẩu.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Email không hợp lệ.');
      return;
    }

    setLoading(true);

    try {
      await mobileApi.registerPatient({
        ...form,
        dob: toApiDateValue(form.dob),
      });
      const loginRes = await mobileApi.loginPatient(form.phone, form.password);
      const user = loginRes?.data?.user;
      const accessToken = loginRes?.data?.accessToken;
      const refreshToken = loginRes?.data?.refreshToken;

      if (!user || !accessToken || !refreshToken) {
        throw new Error('Phản hồi đăng nhập sau đăng ký không hợp lệ.');
      }

      try {
        await signIn(user, accessToken, refreshToken);
      } catch (storageError: any) {
        throw new Error(storageError?.message || 'Không thể lưu phiên đăng nhập.');
      }

      try {
        router.replace('/home');
      } catch (navigationError: any) {
        throw new Error(navigationError?.message || 'Không thể chuyển sang trang chủ.');
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message
        || err?.message
        || 'Không thể đăng ký lúc này.',
      );
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
      <Field
        label="Ngày sinh (DD-MM-YYYY)"
        value={form.dob}
        keyboardType="number-pad"
        placeholder="dd-mm-yyyy"
        maxLength={10}
        onChangeText={(value) => updateField('dob', maskDisplayDateInput(value))}
      />
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
