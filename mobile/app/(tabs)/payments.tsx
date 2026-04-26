import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Card, InfoBanner, Screen, SectionTitle, SecondaryButton } from '@/components/ui';
import { mobileApi } from '@/services/api';
import { colors, spacing } from '@/theme';
import type { Appointment } from '@/types';
import { formatDateDisplay, getAppointmentStatusLabel } from '@/utils/date';

export default function PaymentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshPayments = useCallback(async () => {
    const res = await mobileApi.getPatientAppointments();
    setAppointments(res.data);
    setError('');
  }, []);

  useEffect(() => {
    let active = true;

    refreshPayments()
      .catch((err: any) => {
        if (!active) return;
        setError(err?.response?.data?.message || 'Không tải được thông tin viện phí.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshPayments]);

  useFocusEffect(
    useCallback(() => {
      refreshPayments().catch((err: any) => {
        setError(err?.response?.data?.message || 'Không tải được thông tin viện phí.');
      });
    }, [refreshPayments]),
  );

  const payableAppointments = useMemo(() => appointments
    .filter((appointment) => appointment.status !== 'CANCELED')
    .slice(0, 8), [appointments]);

  return (
    <Screen>
      <SectionTitle
        title="Thanh toán viện phí"
        subtitle="Theo dõi các lịch khám liên quan đến viện phí. Thanh toán trực tuyến sẽ được nối khi bệnh viện bật cổng thanh toán."
      />

      {error ? <InfoBanner tone="error" text={error} /> : null}
      {loading ? <InfoBanner text="Đang tải thông tin viện phí..." /> : null}

      <View style={{ gap: spacing.md }}>
        {payableAppointments.length === 0 ? (
          <InfoBanner text="Chưa có lịch khám phát sinh viện phí." />
        ) : payableAppointments.map((appointment) => (
          <Card key={appointment.id}>
            <Text style={styles.code}>{appointment.code}</Text>
            <Text style={styles.meta}>{formatDateDisplay(appointment.date)} · {appointment.time}</Text>
            <Text style={styles.meta}>Trạng thái: {getAppointmentStatusLabel(appointment.status)}</Text>
            <View style={styles.paymentBox}>
              <Text style={styles.paymentLabel}>Trạng thái thanh toán</Text>
              <Text style={styles.paymentValue}>Chưa phát sinh yêu cầu thanh toán online</Text>
            </View>
            <SecondaryButton
              label="Xem hồ sơ"
              onPress={() => router.push('/profile')}
            />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  meta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  paymentBox: {
    backgroundColor: colors.warningSoft,
    borderColor: '#F2DCA9',
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    gap: 4,
  },
  paymentLabel: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  paymentValue: {
    color: colors.text,
    fontWeight: '700',
  },
});
