import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Card, ChoiceChip, Field, InfoBanner, PrimaryButton, Screen, SectionTitle, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { mobileApi } from '@/services/api';
import { colors, radii, spacing } from '@/theme';
import type { Appointment, Department, Doctor, MedicalHistoryItem, Patient } from '@/types';
import { canCancelAppointment, formatDateDisplay, getAppointmentStatusLabel, maskDisplayDateInput, toApiDateValue, toDisplayDateValue } from '@/utils/date';

export default function ProfileScreen() {
  const { patient, updatePatient, signOut } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({ cccd: '', dob: '', gender: '' });
  const [ratingModal, setRatingModal] = useState<MedicalHistoryItem | null>(null);
  const [ratingValue, setRatingValue] = useState('5');
  const [ratingComment, setRatingComment] = useState('');

  const getDepartmentName = useCallback((deptId?: number | string | null) => {
    if (!deptId) return '---';
    return departments.find((department) => String(department.id) === String(deptId))?.name || '---';
  }, [departments]);

  const getDoctorName = useCallback((doctorId?: number | string | null) => {
    if (!doctorId) return '---';
    return doctors.find((doctor) => String(doctor.id) === String(doctorId))?.name || '---';
  }, [doctors]);

  const getAssignedNurseName = useCallback((appointment: Appointment) => {
    const history = Array.isArray(appointment.history) ? appointment.history : [];
    const nurseEntry = [...history].reverse().find((item) => item?.action?.includes('Điều dưỡng'));
    return nurseEntry?.by || '---';
  }, []);

  const CareTeamBlock = ({
    departmentName,
    nurseName,
    doctorName,
  }: {
    departmentName: string;
    nurseName: string;
    doctorName: string;
  }) => (
    <View style={styles.careTeamWrap}>
      <View style={[styles.carePill, styles.departmentPill]}>
        <Text style={[styles.carePillText, styles.departmentPillText]}>Khoa: {departmentName}</Text>
      </View>
      <View style={[styles.carePill, styles.nursePill]}>
        <Text style={[styles.carePillText, styles.nursePillText]}>Điều dưỡng: {nurseName}</Text>
      </View>
      <View style={[styles.carePill, styles.doctorPill]}>
        <Text style={[styles.carePillText, styles.doctorPillText]}>Bác sĩ: {doctorName}</Text>
      </View>
    </View>
  );

  const refreshProfile = useCallback(async () => {
    if (!patient?.id) return;

    const [patientRes, appointmentRes, departmentRes, doctorRes] = await Promise.all([
      mobileApi.getPatientById(patient.id),
      mobileApi.getPatientAppointments(),
      mobileApi.getDepartments(),
      mobileApi.getDoctors(),
    ]);

    await updatePatient(patientRes.data.user);
    setAppointments(appointmentRes.data);
    setDepartments(departmentRes.data);
    setDoctors(doctorRes.data);
    setError('');
  }, [patient?.id, updatePatient]);

  useEffect(() => {
    let active = true;
    if (!patient?.id) return;

    refreshProfile()
      .then(() => {
        if (!active) return;
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
  }, [patient?.id, refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      refreshProfile().catch((err: any) => {
        setError(err?.response?.data?.message || 'Không tải được hồ sơ bệnh nhân.');
      });
    }, [refreshProfile]),
  );

  const currentPatient = patient as Patient | null;
  const openAppointments = useMemo(() => appointments.filter((item) => !['COMPLETED', 'CANCELED'].includes(item.status)), [appointments]);

  const openEdit = () => {
    if (!currentPatient) return;
    setProfileData({
      cccd: currentPatient.cccd || '',
      dob: toDisplayDateValue(currentPatient.dob) || '',
      gender: currentPatient.gender || '',
    });
    setEditing(true);
  };

  const handleUpdateProfile = async () => {
    if (!currentPatient) return;

    try {
      const payload = {
        ...profileData,
        dob: toApiDateValue(profileData.dob),
      };
      const res = await mobileApi.updatePatientProfile(currentPatient.id, payload);
      await updatePatient(res.data.user);
      await refreshProfile();
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
            await refreshProfile();
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
      await refreshProfile();
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
            <CareTeamBlock
              departmentName={getDepartmentName(appointment.current_department || appointment.deptId)}
              nurseName={getAssignedNurseName(appointment)}
              doctorName={getDoctorName(appointment.doctorId)}
            />
            <Text style={styles.meta}>Trạng thái: {getAppointmentStatusLabel(appointment.status)}</Text>
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
            <CareTeamBlock
              departmentName={getDepartmentName(item.deptId)}
              nurseName="---"
              doctorName={item.doctor || '---'}
            />
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
            <Field
              label="Ngày sinh (DD-MM-YYYY)"
              value={profileData.dob}
              keyboardType="number-pad"
              placeholder="dd-mm-yyyy"
              maxLength={10}
              onChangeText={(value) => setProfileData((prev) => ({ ...prev, dob: maskDisplayDateInput(value) }))}
            />
            <View style={{ gap: 8 }}>
              <Text style={styles.fieldLabel}>Giới tính</Text>
              <View style={styles.genderRow}>
                {['Nam', 'Nữ'].map((gender) => (
                  <ChoiceChip
                    key={gender}
                    label={gender}
                    selected={profileData.gender === gender}
                    onPress={() => setProfileData((prev) => ({ ...prev, gender }))}
                  />
                ))}
              </View>
            </View>
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
  fieldLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  careTeamWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  carePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  carePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  departmentPill: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  departmentPillText: {
    color: '#1D4ED8',
  },
  nursePill: {
    backgroundColor: '#ECFEFF',
    borderColor: '#BEEBF3',
  },
  nursePillText: {
    color: '#0F766E',
  },
  doctorPill: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  doctorPillText: {
    color: colors.text,
  },
});
