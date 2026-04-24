import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { AvatarBadge, Card, ChoiceChip, InfoBanner, PrimaryButton, Screen, SectionTitle, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { mobileApi } from '@/services/api';
import { colors, radii, spacing } from '@/theme';
import type { Department, Doctor, Schedule } from '@/types';
import { formatDateDisplay, getDoctorInitials, maskDisplayDateInput, normalizeDateValue, toApiDateValue, toDisplayDateValue, toLocalDateInputValue } from '@/utils/date';

type BookingForm = {
  dept: string;
  doctorId: string;
  date: string;
  time: string;
  cccd: string;
  dob: string;
  gender: string;
  symptoms: string;
};

export default function BookingScreen() {
  const params = useLocalSearchParams<{ dept?: string }>();
  const { patient, updatePatient } = useAuth();
  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bookedCode, setBookedCode] = useState('');
  const [form, setForm] = useState<BookingForm>({
    dept: typeof params.dept === 'string' ? params.dept : '',
    doctorId: '',
    date: '',
    time: '',
    cccd: patient?.cccd || '',
    dob: toDisplayDateValue(patient?.dob) || '',
    gender: patient?.gender && patient.gender !== 'Unknown' ? patient.gender : '',
    symptoms: '',
  });

  useEffect(() => {
    if (!patient) return;
    setForm((prev) => ({
      ...prev,
      cccd: patient.cccd || '',
      dob: toDisplayDateValue(patient.dob) || '',
      gender: patient.gender && patient.gender !== 'Unknown' ? patient.gender : '',
    }));
  }, [patient?.cccd, patient?.dob, patient?.gender]);

  useEffect(() => {
    let active = true;

    Promise.all([
      mobileApi.getDepartments(),
      mobileApi.getDoctors(),
      mobileApi.getSchedules(),
    ])
      .then(([deptRes, doctorRes, scheduleRes]) => {
        if (!active) return;
        setDepartments(deptRes.data);
        setDoctors(doctorRes.data);
        setSchedules(scheduleRes.data.map((schedule) => ({ ...schedule, date: normalizeDateValue(schedule.date) })));
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.response?.data?.message || 'Không tải được dữ liệu đặt lịch.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const today = toLocalDateInputValue(new Date());
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();

  const departmentOptions = departments.filter((department) => !department.isEmergency);
  const availableDoctors = doctors.filter((doctor) => form.dept && String(doctor.deptId) === form.dept);
  const doctorSchedules = schedules.filter((schedule) => String(schedule.doctorId) === form.doctorId && schedule.booked < schedule.maxPatients);
  const availableDates = [...new Set(doctorSchedules.map((schedule) => schedule.date))].filter((date) => date >= today).sort();
  const availableTimes = doctorSchedules
    .filter((schedule) => schedule.date === form.date)
    .map((schedule) => schedule.time)
    .sort()
    .filter((time) => {
      if (form.date > today) return true;
      const [hour, minute] = time.split(':').map(Number);
      return hour > currentHour || (hour === currentHour && minute > currentMinute);
    });

  const selectedDoctor = useMemo(() => doctors.find((doctor) => String(doctor.id) === form.doctorId), [doctors, form.doctorId]);
  const selectedDepartment = useMemo(() => departments.find((department) => String(department.id) === form.dept), [departments, form.dept]);

  const patchForm = (patch: Partial<BookingForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async () => {
    if (!patient) return;
    setSubmitting(true);
    setError('');

    try {
      const profileChanged =
        form.cccd !== (patient.cccd || '') ||
        form.dob !== (toDisplayDateValue(patient.dob) || '') ||
        form.gender !== ((patient.gender && patient.gender !== 'Unknown') ? patient.gender : '');

      if (profileChanged) {
        const profileRes = await mobileApi.updatePatientProfile(patient.id, {
          cccd: form.cccd,
          dob: toApiDateValue(form.dob),
          gender: form.gender,
        });
        await updatePatient(profileRes.data.user);
      }

      const res = await mobileApi.createAppointment({
        patientId: patient.id,
        phone: patient.phone,
        doctorId: Number(form.doctorId),
        deptId: Number(form.dept),
        date: form.date,
        time: form.time,
        cccd: form.cccd,
        dob: toApiDateValue(form.dob),
        gender: form.gender,
        symptoms: form.symptoms,
      });

      setBookedCode(res.data.code);
      setStep(4);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể đặt lịch lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <SectionTitle title="Đặt lịch khám" subtitle="Giữ nguyên logic chọn khoa, bác sĩ, ngày giờ và cập nhật hồ sơ như web hiện tại." />

      {error ? <InfoBanner tone="error" text={error} /> : null}
      {loading ? <InfoBanner text="Đang tải bác sĩ và lịch khám..." /> : null}

      <Card>
        <View style={styles.stepRow}>
          {[1, 2, 3, 4].map((value) => (
            <View key={value} style={[styles.stepDot, step >= value ? styles.stepDotActive : null]}>
              <Text style={step >= value ? styles.stepDotTextActive : styles.stepDotText}>{value}</Text>
            </View>
          ))}
        </View>

        {step === 1 ? (
          <View style={{ gap: spacing.lg }}>
            <Text style={styles.stepTitle}>1. Chọn chuyên khoa và bác sĩ</Text>
            <View style={styles.wrap}>
              {departmentOptions.map((department) => (
                <ChoiceChip
                  key={department.id}
                  label={department.name}
                  selected={form.dept === String(department.id)}
                  onPress={() => patchForm({ dept: String(department.id), doctorId: '', date: '', time: '' })}
                />
              ))}
            </View>
            {form.dept ? (
              availableDoctors.map((doctor) => (
                <Pressable
                  key={doctor.id}
                  onPress={() => patchForm({ doctorId: String(doctor.id), date: '', time: '' })}
                  style={[styles.optionCard, form.doctorId === String(doctor.id) ? styles.optionCardSelected : null]}
                >
                  <AvatarBadge initials={getDoctorInitials(doctor.name)} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.optionTitle}>{doctor.name}</Text>
                    <Text style={styles.optionSubtitle}>{doctor.title || 'Bác sĩ chuyên khoa'}</Text>
                    <Text style={styles.optionSubtitle}>{doctor.exp || 'Lịch khám đang mở'}</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <InfoBanner text="Chọn chuyên khoa trước để xem bác sĩ phù hợp." />
            )}
            <PrimaryButton label="Tiếp tục" onPress={() => setStep(2)} disabled={!form.dept || !form.doctorId} />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: spacing.lg }}>
            <Text style={styles.stepTitle}>2. Chọn ngày và giờ khám</Text>
            <Text style={styles.helperText}>
              {selectedDoctor ? `${selectedDoctor.name} · ${selectedDepartment?.name || ''}` : 'Vui lòng chọn bác sĩ'}
            </Text>

            <View style={styles.wrap}>
              {availableDates.map((date) => (
                <ChoiceChip
                  key={date}
                  label={formatDateDisplay(date)}
                  selected={form.date === date}
                  onPress={() => patchForm({ date, time: '' })}
                />
              ))}
            </View>

            {form.date ? (
              <View style={styles.wrap}>
                {availableTimes.map((time) => (
                  <ChoiceChip
                    key={time}
                    label={time}
                    selected={form.time === time}
                    onPress={() => patchForm({ time })}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <SecondaryButton label="Quay lại" onPress={() => setStep(1)} />
              <PrimaryButton label="Tiếp tục" onPress={() => setStep(3)} disabled={!form.date || !form.time} />
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={{ gap: spacing.lg }}>
            <Text style={styles.stepTitle}>3. Xác nhận hồ sơ và triệu chứng</Text>

            <FieldGroup label="Bệnh nhân" value={patient?.name || '---'} />
            <FieldGroup label="Số điện thoại" value={patient?.phone || '---'} />
            <FieldInput label="CCCD" value={form.cccd} onChangeText={(value) => patchForm({ cccd: value })} />
            <FieldInput
              label="Ngày sinh (DD-MM-YYYY)"
              value={form.dob}
              keyboardType="number-pad"
              placeholder="dd-mm-yyyy"
              maxLength={10}
              onChangeText={(value) => patchForm({ dob: maskDisplayDateInput(value) })}
            />
            <FieldInput label="Giới tính" value={form.gender} onChangeText={(value) => patchForm({ gender: value })} />

            <Text style={styles.label}>Triệu chứng</Text>
            <TextInput
              multiline
              value={form.symptoms}
              onChangeText={(value) => patchForm({ symptoms: value })}
              style={styles.textarea}
              placeholder="Mô tả ngắn gọn triệu chứng để bác sĩ nắm trước thông tin."
              placeholderTextColor={colors.textMuted}
            />

            <Card style={{ backgroundColor: colors.surfaceMuted }}>
              <Text style={styles.optionTitle}>Tóm tắt lịch hẹn</Text>
              <Text style={styles.optionSubtitle}>Khoa: {selectedDepartment?.name || '---'}</Text>
              <Text style={styles.optionSubtitle}>Bác sĩ: {selectedDoctor?.name || '---'}</Text>
              <Text style={styles.optionSubtitle}>Ngày khám: {formatDateDisplay(form.date)} · {form.time || '---'}</Text>
            </Card>

            <View style={styles.actionRow}>
              <SecondaryButton label="Quay lại" onPress={() => setStep(2)} />
              <PrimaryButton label="Xác nhận đặt lịch" onPress={handleSubmit} loading={submitting} />
            </View>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={{ gap: spacing.lg }}>
            <Text style={styles.stepTitle}>Đặt lịch thành công</Text>
            <InfoBanner tone="success" text={`Mã lịch của bạn là ${bookedCode}. Hãy lưu lại để tra cứu khi cần.`} />
            <PrimaryButton label="Xem hồ sơ bệnh nhân" onPress={() => router.push('/profile')} />
            <SecondaryButton label="Đặt lịch mới" onPress={() => {
              setStep(1);
              setBookedCode('');
              patchForm({ doctorId: '', date: '', time: '', symptoms: '' });
            }} />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

const FieldGroup = ({ label, value }: { label: string; value: string }) => (
  <View style={{ gap: 6 }}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.readonlyField}>
      <Text style={{ color: colors.text }}>{value}</Text>
    </View>
  </View>
);

const FieldInput = ({
  label,
  value,
  onChangeText,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
} & Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChangeText'>) => (
  <View style={{ gap: 6 }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      style={styles.input}
      placeholderTextColor={colors.textMuted}
      {...props}
    />
  </View>
);

const styles = StyleSheet.create({
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotText: {
    color: colors.textMuted,
    fontWeight: '800',
  },
  stepDotTextActive: {
    color: colors.surface,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  helperText: {
    color: colors.textMuted,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  optionSubtitle: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  actionRow: {
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  readonlyField: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.text,
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.text,
  },
});
