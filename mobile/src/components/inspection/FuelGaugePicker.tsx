import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radii } from '../../constants/theme';

interface FuelGaugePickerProps {
  value: number; // 0 to 8
  onChange: (level: number) => void;
}

const FUEL_LABELS = ['0', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8', '1/1'];

export const FuelGaugePicker: React.FC<FuelGaugePickerProps> = ({
  value,
  onChange,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.title}>JAUGE DE CARBURANT</Text>
        <Text style={styles.currentLabel}>
          {value === 0 ? 'Vide / Réserve' : value === 8 ? 'Plein (1/1)' : FUEL_LABELS[value]}
        </Text>
      </View>

      <View style={styles.meterContainer}>
        {Array.from({ length: 9 }).map((_, idx) => {
          const isSelected = value === idx;
          const isFilled = idx <= value && value > 0;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => onChange(idx)}
              style={[
                styles.segment,
                isFilled && styles.segmentFilled,
                isSelected && styles.segmentSelected,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  isSelected && styles.segmentTextSelected,
                ]}
              >
                {idx === 0 ? 'E' : idx === 8 ? 'F' : `${idx}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.gaugeLegend}>
        <Text style={styles.legendText}>E (Vide)</Text>
        <Text style={styles.legendText}>1/2</Text>
        <Text style={styles.legendText}>F (Plein)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  currentLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.brass,
  },
  meterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 44,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentFilled: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  segmentSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  segmentTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  gaugeLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  legendText: {
    fontSize: 10,
    color: Colors.textFaint,
  },
});
