import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appStyles, colors, radii, spacing } from '@/theme';

export const Screen = ({
  children,
  scroll = true,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}) => {
  const content = (
    <View style={[styles.content, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {scroll ? <ScrollView showsVerticalScrollIndicator={false}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
};

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[styles.card, appStyles.shadowCard, style]}>
    {children}
  </View>
);

export const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={{ gap: 4 }}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
  </View>
);

export const Field = ({
  label,
  multiline,
  ...props
}: TextInputProps & { label: string }) => (
  <View style={{ gap: 8 }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[styles.input, multiline ? styles.textarea : null]}
      multiline={multiline}
      {...props}
    />
  </View>
);

export const PrimaryButton = ({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || loading}
    style={({ pressed }) => [
      styles.primaryButton,
      (disabled || loading) ? styles.buttonDisabled : null,
      pressed ? { opacity: 0.9, transform: [{ scale: 0.99 }] } : null,
    ]}
  >
    {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryButtonText}>{label}</Text>}
  </Pressable>
);

export const SecondaryButton = ({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed ? { opacity: 0.8 } : null]}>
    <Text style={styles.secondaryButtonText}>{label}</Text>
  </Pressable>
);

export const InfoBanner = ({
  tone = 'neutral',
  text,
}: {
  tone?: 'neutral' | 'error' | 'success';
  text: string;
}) => {
  const toneStyle = tone === 'error'
    ? { backgroundColor: colors.dangerSoft, borderColor: '#F6C9C9', color: colors.danger }
    : tone === 'success'
      ? { backgroundColor: colors.successSoft, borderColor: '#C8E9DA', color: colors.success }
      : { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.textMuted };

  return (
    <View style={[styles.banner, { backgroundColor: toneStyle.backgroundColor, borderColor: toneStyle.borderColor }]}>
      <Text style={{ color: toneStyle.color, lineHeight: 20 }}>{text}</Text>
    </View>
  );
};

export const ChoiceChip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) => (
  <Pressable onPress={onPress} style={[styles.chip, selected ? styles.chipSelected : null]}>
    <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>{label}</Text>
  </Pressable>
);

export const AvatarBadge = ({
  initials,
  tone = colors.primarySoft,
}: {
  initials: string;
  tone?: string;
}) => (
  <View style={[styles.avatar, { backgroundColor: tone }]}>
    <Text style={styles.avatarText}>{initials}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  banner: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: '#8DCFD4',
  },
  chipText: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: colors.primaryDark,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primaryDark,
  },
});
