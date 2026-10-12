import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radii } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'surface' | 'raised' | 'highlight';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'surface',
}) => {
  const getBgColor = () => {
    switch (variant) {
      case 'raised':
        return Colors.surfaceRaised;
      case 'highlight':
        return Colors.surfaceHighlight;
      default:
        return Colors.surface;
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: getBgColor() },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.hairline,
    padding: 16,
  },
});
