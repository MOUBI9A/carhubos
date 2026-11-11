import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Colors } from '../../constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon,
  accentColor,
}) => {
  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      </View>
      <Text style={[styles.value, accentColor ? { color: accentColor } : null]}>
        {value}
      </Text>
      {subValue ? <Text style={styles.subValue}>{subValue}</Text> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconContainer: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: Colors.surfaceRaised,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.foreground,
    letterSpacing: -0.5,
  },
  subValue: {
    fontSize: 11,
    color: Colors.textFaint,
    marginTop: 4,
  },
});
