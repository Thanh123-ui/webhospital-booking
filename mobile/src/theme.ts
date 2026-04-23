import { StyleSheet } from 'react-native';

export const colors = {
  background: '#F7F9F8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F0',
  primary: '#1F6B70',
  primaryDark: '#16565A',
  primarySoft: '#D7EFF0',
  secondarySoft: '#DFF5F7',
  text: '#243133',
  textMuted: '#667476',
  border: '#DCE3E0',
  success: '#167B57',
  successSoft: '#E4F6EF',
  danger: '#B63A3A',
  dangerSoft: '#FDECEC',
  warning: '#9A6B1C',
  warningSoft: '#FFF4D8',
  shadow: 'rgba(18, 34, 36, 0.08)',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
};

export const appStyles = StyleSheet.create({
  shadowCard: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 6,
  },
});
