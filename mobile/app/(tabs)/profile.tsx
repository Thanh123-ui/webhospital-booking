import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, Field, InfoBanner, PrimaryButton, Screen, SectionTitle, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { mobileApi } from '@/services/api';
import { colors, radii, spacing } from '@/theme';
import type { Appointment, MedicalHistoryItem, Patient } from '@/types';
import { canCancelAppointment, formatDateDisplay, normalizeDateValue } from '@/utils/date';

export default function ProfileScreen() {
  const { patient, updatePatient, signOut } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({ cccd: '', dob: '', gender: '' });
  const [ratingModal, setRatingModal] = useState<MedicalHistoryItem | null>(null);
  const [ratingValue, setRatingValue] = useState('5');
  const [ratingComment, setRatingComment] = useState('');

  useEffect(() => {
    let active = true;
    if (!patient?.id) return;

    Promise.all([
      mobileApi.getPatientById(patient.id),
      mobileApi.getPatientAppointments(),
    ])
      .then(([patientRes, appointmentRes]) => {
        if (!active) return;
        updatePatient(patientRes.data.user);
        setAppointments(appointmentRes.data);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.response?.data?.message || 'Không tải được hồ sơ bệnh nhân.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [patient?.id]);

  const currentPatient = patient as Patient | null;
  const openAppointments = useMemo(() => appointments.filter((item) => !['COMPLETED', 'CANCELED'].includes(item.status)), [appointments]);

  const openEdit = () => {
    if (!currentPatient) return;
    setProfileData({
      cccd: currentPatient.cccd || '',
      dob: normalizeDateValue(currentPatient.dob) || '',
      gender: currentPatient.gender || '',
    });
    setEditing(true);
  };

  const handleUpdateProfile = async () => {
    if (!currentPatient) return;

    try {
      const res = await mobileApi.updatePatientProfile(currentPatient.id, profileData);
      await updatePatient(res.data.user);
      setEditing(false);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể cập nhật hồ sơ lúc này.');
    }
  };

  const handleCancel = async (appointmentId: number) => {
    Alert.alert('Hủy lịch khám', 'Bạn có chắc chắn muốn hủy lịch khám này không?', [
      { text: 'Đóng', style: 'cancel' },
      {
        text: 'Hủy lịch',
        style: 'destructive',
        onPress: async () => {
          try {
            await mobileApi.cancelAppointment(appointmentId, {
              role: 'PATIENT',
              reason: 'Bệnh nhân tự hủy qua ứng dụng mobile',
            });
            const nextAppointments = await mobileApi.getPatientAppointments();
            setAppointments(nextAppointments.data);
          } catch (err: any) {
            Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể hủy lịch lúc này.');
          }
        },
      },
    ]);
  };

  const handleRateDoctor = async () => {
    if (!ratingModal) return;

    try {
      await mobileApi.submitRating({
        apptId: ratingModal.apptId,
        doctorName: ratingModal.doctor,
        rating: Number(ratingValue),
        comment: ratingComment,
      });
      Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá bác sĩ.');
      setRatingModal(null);
      setRatingValue('5');
      setRatingComment('');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gửi đánh giá.');
    }
  };

  if (loading) {
    return <Screen><InfoBanner text="Đang tải hồ sơ bệnh nhân..." /></Screen>;
  }

  if (!currentPatient) {
    return <Screen><InfoBanner tone="error" text="Không tìm thấy hồ sơ bệnh nhân." /></Screen>;
  }

  return (
    <Screen>
      {error ? <InfoBanner tone="error" text={error} /> : null}

      <SectionTitle title="Hồ sơ bệnh nhân" subtitle="Theo dõi lịch khám, cập nhật hồ sơ và xem lại lịch sử khám bệnh ngay trên mobile." />

      <Card>
        <Text style={styles.name}>{currentPatient.name}</Text>
        <Text style={styles.meta}>{currentPatient.phone}</Text>
        <Text style={styles.meta}>Ngày sinh: {formatDateDisplay(currentPatient.dob)}</Text>
        <Text style={styles.meta}>Giới tính: {currentPatient.gender || '---'}</Text>
        <Text style={styles.meta}>CCCD: {currentPatient.cccd || '---'}</Text>
        <Text style={styles.meta}>Email: {currentPatient.email || '---'}</Text>
        <View style={{ gap: spacing.sm }}>
          <PrimaryButton label="Chỉnh sửa hồ sơ" onPress={openEdit} />
          <SecondaryButton label="Đăng xuất" onPress={signOut} />
        </View>
      </Card>

      <SectionTitle title="Lịch hẹn chờ khám" />
      <View style={{ gap: spacing.md }}>
        {openAppointments.length === 0 ? (
          <InfoBanner text="Bạn không có lịch hẹn nào đang chờ khám." />
        ) : openAppointments.map((appointment) => (
          <Card key={appointment.id}>
            <Text style={styles.appointmentCode}>{appointment.code}</Text>
            <Text style={styles.meta}>{formatDateDisplay(appointment.date)} · {appointment.time}</Text>
            <Text style={styles.meta}>Trạng thái: {appointment.status}</Text>
            {['PENDING', 'CONFIRMED'].includes(appointment.status) && (
              canCancelAppointment(appointment.date, appointment.time)
                ? <SecondaryButton label="Hủy lịch" onPress={() => handleCancel(appointment.id)} />
                : <InfoBanner text="Lịch hẹn này đã quá gần giờ khám nên không thể hủy trên ứng dụng." />
            )}
          </Card>
        ))}
      </View>

      <SectionTitle title="Lịch sử khám & toa thuốc" />
      <View style={{ gap: spacing.md }}>
        {(currentPatient.medicalHistory || []).length === 0 ? (
          <InfoBanner text="Chưa có dữ liệu khám bệnh." />
        ) : (currentPatient.medicalHistory || []).map((item, index) => (
          <Card key={`${item.date}-${index}`}>
            <Text style={styles.appointmentCode}>{formatDateDisplay(item.date)}</Text>
            <Text style={styles.nameSmall}>{item.diagnosis || 'Không có chẩn đoán'}</Text>
            <Text style={styles.meta}>Bác sĩ: {item.doctor || '---'}</Text>
            {item.prescription ? <Text style={styles.note}>Toa thuốc: {item.prescription}</Text> : null}
            {item.notes ? <Text style={styles.note}>Lưu ý: {item.notes}</Text> : null}
            <SecondaryButton label="Đánh giá bác sĩ" onPress={() => setRatingModal(item)} />
          </Card>
        ))}
      </View>

      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <View style={styles.modalBackdrop}>
          <Card style={{ width: '100%' }}>
            <SectionTitle title="Cập nhật hồ sơ" />
            <Field label="CCCD" value={profileData.cccd} onChangeText={(value) => setProfileData((prev) => ({ ...prev, cccd: value }))} />
            <Field label="Ngày sinh (yyyy-mm-dd)" value={profileData.dob} onChangeText={(value) => setProfileData((prev) => ({ ...prev, dob: value }))} />
            <Field label="Giới tính" value={profileData.gender} onChangeText={(value) => setProfileData((prev) => ({ ...prev, gender: value }))} />
            <View style={{ gap: spacing.sm }}>
              <PrimaryButton label="Lưu thay đổi" onPress={handleUpdateProfile} />
              <SecondaryButton label="Đóng" onPress={() => setEditing(false)} />
            </View>
          </Card>
        </View>
      </Modal>

      <Modal visible={Boolean(ratingModal)} transparent animationType="slide" onRequestClose={() => setRatingModal(null)}>
        <View style={styles.modalBackdrop}>
          <Card style={{ width: '100%' }}>
            <SectionTitle title="Đánh giá bác sĩ" subtitle={ratingModal?.doctor || ''} />
            <Field label="Số sao (1-5)" keyboardType="number-pad" value={ratingValue} onChangeText={setRatingValue} />
            <Field label="Nhận xét" multiline value={ratingComment} onChangeText={setRatingComment} />
            <View style={{ gap: spacing.sm }}>
              <PrimaryButton label="Gửi đánh giá" onPress={handleRateDoctor} />
              <SecondaryButton label="Đóng" onPress={() => setRatingModal(null)} />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  nameSmall: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  meta: {
    color: colors.textMuted,
    lineHeight: 21,
  },
  note: {
    color: colors.text,
    lineHeight: 21,
  },
  appointmentCode: {
    color: colors.primary,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 22, 23, 0.28)',
    padding: spacing.lg,
  },
});
