import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AvatarBadge, Card, InfoBanner, PrimaryButton, Screen, SectionTitle, SecondaryButton } from '@/components/ui';
import { mobileApi } from '@/services/api';
import { colors, radii, spacing } from '@/theme';
import type { Department, Doctor } from '@/types';
import { getDoctorInitials } from '@/utils/date';

const DEPT_EMOJIS: Record<string, string> = {
  'Tim mạch': '❤️',
  'Nhi khoa': '🧒',
  'Nha khoa': '😁',
  'Thần kinh': '🧠',
};

const HOTLINE_PHONE = '19001234';

const HOME_ACTIONS = [
  { label: 'Đăng ký khám bệnh', hint: 'Chọn khoa, bác sĩ và khung giờ', icon: '📅', action: 'book' },
  { label: 'Thông tin khám bệnh', hint: 'Xem quy trình và đi tới đặt lịch', icon: '🩺', action: 'book' },
  { label: 'Thanh toán viện phí', hint: 'Theo dõi các khoản cần thanh toán', icon: '💳', action: 'payments' },
  { label: 'Quản lý hồ sơ', hint: 'Cập nhật hồ sơ và lịch hẹn', icon: '👤', action: 'profile' },
  { label: 'Lịch tái khám', hint: 'Xem các lịch hẹn và ghi chú tái khám', icon: '🔁', action: 'followUps' },
  { label: 'Hóa đơn điện tử', hint: 'Nhận hóa đơn khi tính năng sẵn sàng', icon: '🧾', action: 'invoice' },
  { label: 'Hotline', hint: 'Gọi tổng đài 1900 1234', icon: '☎️', action: 'hotline' },
  { label: 'Tư vấn 24/7', hint: 'Kênh tư vấn trực tuyến', icon: '💬', action: 'consulting' },
] as const;

export default function HomeScreen() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all([mobileApi.getDepartments(), mobileApi.getTopDoctors()])
      .then(([deptRes, doctorRes]) => {
        if (!active) return;
        setDepartments(deptRes.data);
        setDoctors(doctorRes.data);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.response?.data?.message || 'Không tải được dữ liệu trang chủ.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const featuredDoctors = useMemo(() => doctors
    .map((doctor) => ({
      ...doctor,
      departmentName: departments.find((department) => department.id === doctor.deptId)?.name,
    }))
    .filter((doctor) => doctor.departmentName && !departments.find((department) => department.id === doctor.deptId)?.isEmergency)
    .slice(0, 3), [doctors, departments]);

  const handleActionPress = async (action: typeof HOME_ACTIONS[number]['action']) => {
    switch (action) {
      case 'book':
        router.push('/book');
        return;
      case 'payments':
        router.push('./payments');
        return;
      case 'profile':
        router.push('/profile');
        return;
      case 'followUps':
        router.push('./follow-ups');
        return;
      case 'invoice':
      case 'consulting':
        Alert.alert('Thông báo', 'Tính năng đang phát triển');
        return;
      case 'hotline':
        try {
          await Linking.openURL(`tel:${HOTLINE_PHONE}`);
        } catch {
          Alert.alert('Không thể gọi hotline', 'Vui lòng gọi 1900 1234 để được hỗ trợ.');
        }
    }
  };

  return (
    <Screen>
      <Card style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Chăm sóc sức khỏe tinh tế</Text>
        <Text style={styles.heroTitle}>
          Đặt lịch khám dễ dàng, chăm sóc sức khỏe chủ động mỗi ngày
        </Text>
        <Text style={styles.heroText}>
          Bệnh viện Hospital mang đến trải nghiệm y tế hiện đại, nơi mọi lần thăm khám bắt đầu bằng sự an tâm.
        </Text>
        <View style={{ gap: 12 }}>
          <PrimaryButton label="Đăng ký khám bệnh" onPress={() => router.push('/book')} />
          <SecondaryButton label="Xem hồ sơ bệnh nhân" onPress={() => router.push('/profile')} />
        </View>
      </Card>

      {error ? <InfoBanner tone="error" text={error} /> : null}
      {loading ? <InfoBanner text="Đang tải chuyên khoa và bác sĩ..." /> : null}

      <SectionTitle title="Thông tin khám bệnh" subtitle="Các thao tác thường dùng cho bệnh nhân trước và sau khi thăm khám." />
      <View style={styles.actionGrid}>
        {HOME_ACTIONS.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => handleActionPress(item.action)}
            style={({ pressed }) => [styles.actionCard, pressed ? styles.actionCardPressed : null]}
          >
            <View style={styles.actionIconWrap}>
              <Text style={styles.actionIcon}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.actionTitle}>{item.label}</Text>
              <Text style={styles.actionHint}>{item.hint}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="Chuyên khoa nổi bật" subtitle="Chọn nhanh chuyên khoa rồi đi thẳng tới bước đặt lịch trên mobile." />
      <View style={styles.grid}>
        {departments.filter((department) => !department.isEmergency).map((department) => (
          <Pressable
            key={department.id}
            onPress={() => router.push({ pathname: '/book', params: { dept: String(department.id) } })}
            style={styles.deptCard}
          >
            <Text style={styles.deptEmoji}>{DEPT_EMOJIS[department.name] || '🏥'}</Text>
            <Text style={styles.deptTitle}>{department.name}</Text>
            <Text style={styles.deptHint}>Đi tới đặt lịch</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="Bác sĩ nổi bật" subtitle="Dữ liệu lấy từ cùng API với web để giữ nguyên logic hiển thị hiện tại." />
      <View style={{ gap: spacing.md }}>
        {featuredDoctors.map((doctor) => (
          <Card key={doctor.id}>
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              <AvatarBadge initials={getDoctorInitials(doctor.name)} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.doctorMeta}>{doctor.title || 'Bác sĩ chuyên khoa'}</Text>
                <Text style={styles.doctorMeta}>
                  {(doctor as any).departmentName} · ⭐ {doctor.avgRating || '5.0'} ({doctor.reviewCount || 0} đánh giá)
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  heroEyebrow: {
    color: '#D8FBFD',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  heroText: {
    color: '#DFF6F7',
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionGrid: {
    gap: spacing.sm,
  },
  actionCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  actionCardPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 23,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  actionHint: {
    color: colors.textMuted,
    lineHeight: 19,
  },
  deptCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 8,
  },
  deptEmoji: {
    fontSize: 30,
  },
  deptTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  deptHint: {
    color: colors.primary,
    fontWeight: '700',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  doctorMeta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
});
