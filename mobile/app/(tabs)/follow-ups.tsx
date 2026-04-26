import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Card, InfoBanner, PrimaryButton, Screen, SectionTitle, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { mobileApi } from '@/services/api';
import { colors, spacing } from '@/theme';
import type { Appointment, MedicalHistoryItem, Patient } from '@/types';
import { formatDateDisplay, getAppointmentStatusLabel } from '@/utils/date';

export default function FollowUpsScreen() {
  const { patient, updatePatient } = useAuth();
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(patient);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshFollowUps = useCallback(async () => {
    if (!patient?.id) return;

    const [patientRes, appointmentRes] = await Promise.all([
      mobileApi.getPatientById(patient.id),
      mobileApi.getPatientAppointments(),
    ]);

    await updatePatient(patientRes.data.user);
    setCurrentPatient(patientRes.data.user);
    setAppointments(appointmentRes.data);
    setError('');
  }, [patient?.id, updatePatient]);

  useEffect(() => {
    let active = true;

    refreshFollowUps()
      .catch((err: any) => {
        if (!active) return;
        setError(err?.response?.data?.message || 'Không tải được lịch tái khám.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshFollowUps]);

  useFocusEffect(
    useCallback(() => {
      refreshFollowUps().catch((err: any) => {
        setError(err?.response?.data?.message || 'Không tải được lịch tái khám.');
      });
    }, [refreshFollowUps]),
  );

  const upcomingAppointments = useMemo(() => appointments
    .filter((appointment) => !['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(appointment.status))
    .slice(0, 5), [appointments]);

  const followUpNotes = useMemo(() => (currentPatient?.medicalHistory || [])
    .filter((item) => hasFollowUpSignal(item))
    .slice(0, 6), [currentPatient?.medicalHistory]);

  return (
    <Screen>
      <SectionTitle
        title="Lịch tái khám"
        subtitle="Theo dõi các lịch hẹn sắp tới và ghi chú tái khám trong hồ sơ bệnh nhân."
      />

      {error ? <InfoBanner tone="error" text={error} /> : null}
      {loading ? <InfoBanner text="Đang tải lịch tái khám..." /> : null}

      <Card>
        <Text style={styles.cardTitle}>Đăng ký lịch tái khám</Text>
        <Text style={styles.meta}>Bạn có thể đặt lịch mới với chuyên khoa và bác sĩ phù hợp khi cần tái khám.</Text>
        <PrimaryButton label="Đăng ký khám bệnh" onPress={() => router.push('/book')} />
      </Card>

      <SectionTitle title="Lịch hẹn đang chờ" />
      <View style={{ gap: spacing.md }}>
        {upcomingAppointments.length === 0 ? (
          <InfoBanner text="Chưa có lịch hẹn tái khám đang chờ." />
        ) : upcomingAppointments.map((appointment) => (
          <Card key={appointment.id}>
            <Text style={styles.code}>{appointment.code}</Text>
            <Text style={styles.meta}>{formatDateDisplay(appointment.date)} · {appointment.time}</Text>
            <Text style={styles.meta}>Trạng thái: {getAppointmentStatusLabel(appointment.status)}</Text>
            <SecondaryButton label="Xem hồ sơ" onPress={() => router.push('/profile')} />
          </Card>
        ))}
      </View>

      <SectionTitle title="Ghi chú từ lần khám trước" />
      <View style={{ gap: spacing.md }}>
        {followUpNotes.length === 0 ? (
          <InfoBanner text="Chưa có ghi chú tái khám trong lịch sử khám bệnh." />
        ) : followUpNotes.map((item, index) => (
          <Card key={`${item.date}-${index}`}>
            <Text style={styles.code}>{formatDateDisplay(item.date)}</Text>
            <Text style={styles.cardTitle}>{item.diagnosis || 'Lần khám gần đây'}</Text>
            {item.doctor ? <Text style={styles.meta}>Bác sĩ: {item.doctor}</Text> : null}
            {item.notes ? <Text style={styles.note}>Lưu ý: {item.notes}</Text> : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const hasFollowUpSignal = (item: MedicalHistoryItem) => {
  const text = `${item.notes || ''} ${item.prescription || ''}`.toLowerCase();
  return text.includes('tái khám') || text.includes('tai kham') || text.includes('hẹn');
};

const styles = StyleSheet.create({
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  code: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  meta: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  note: {
    color: colors.text,
    lineHeight: 21,
  },
});
