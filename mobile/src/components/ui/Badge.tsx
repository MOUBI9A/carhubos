import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radii } from '../../constants/theme';

export interface BadgeProps {
  label: string;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'brass' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', size = 'md' }) => {
  const getTheme = () => {
    switch (variant) {
      case 'success':
        return { bg: Colors.successMuted, text: Colors.success, border: Colors.success };
      case 'danger':
        return { bg: Colors.dangerMuted, text: Colors.danger, border: Colors.danger };
      case 'warning':
        return { bg: Colors.warningMuted, text: Colors.warning, border: Colors.warning };
      case 'info':
        return { bg: Colors.infoMuted, text: Colors.info, border: Colors.info };
      case 'primary':
        return { bg: Colors.primaryMuted, text: Colors.primary, border: Colors.primary };
      case 'brass':
        return { bg: Colors.brassMuted, text: Colors.brass, border: Colors.brass };
      default:
        return { bg: Colors.surfaceRaised, text: Colors.textMuted, border: Colors.hairline };
    }
  };

  const theme = getTheme();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        isSm && styles.badgeSm,
        { backgroundColor: theme.bg, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.label, isSm && styles.labelSm, { color: theme.text }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radii.full,
    borderWidth: 0.5,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelSm: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
