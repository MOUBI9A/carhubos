import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { RotateCcw, Check } from 'lucide-react-native';
import { Colors, Radii } from '../../constants/theme';

interface DigitalSignaturePadProps {
  onConfirm: (signatureSvgPath: string) => void;
  signerName?: string;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  onConfirm,
  signerName,
}) => {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isSigned, setIsSigned] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt: GestureResponderEvent) => {
      const { locationX, locationY } = evt.nativeEvent;
      const newPath = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
      setCurrentPath(newPath);
    },
    onPanResponderMove: (evt: GestureResponderEvent) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath((prev) => `${prev} L${locationX.toFixed(1)},${locationY.toFixed(1)}`);
    },
    onPanResponderRelease: () => {
      if (currentPath) {
        setPaths((prev) => [...prev, currentPath]);
        setCurrentPath('');
        setIsSigned(true);
      }
    },
  });

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
    setIsSigned(false);
  };

  const handleConfirm = () => {
    const fullSvg = [...paths, currentPath].filter(Boolean).join(' ');
    onConfirm(fullSvg);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>SIGNATURE NUMÉRIQUE DU CONDUCTEUR</Text>
        {signerName ? <Text style={styles.signerName}>{signerName}</Text> : null}
      </View>

      <View style={styles.canvasContainer} {...panResponder.panHandlers}>
        <Svg style={StyleSheet.absoluteFill}>
          {paths.map((p, idx) => (
            <Path
              key={idx}
              d={p}
              stroke={Colors.foreground}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke={Colors.foreground}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
        {!isSigned && !currentPath ? (
          <View style={styles.placeholderContainer} pointerEvents="none">
            <Text style={styles.placeholderText}>
              Signez avec le doigt dans ce cadre
            </Text>
          </View>
        ) : null}
        <View style={styles.baseline} pointerEvents="none" />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearBtn}
          disabled={!isSigned && !currentPath}
        >
          <RotateCcw size={16} color={Colors.textMuted} />
          <Text style={styles.clearText}>Effacer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleConfirm}
          style={[styles.confirmBtn, !isSigned && styles.btnDisabled]}
          disabled={!isSigned}
        >
          <Check size={16} color="#FFFFFF" />
          <Text style={styles.confirmText}>Valider la Signature</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  header: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  signerName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.brass,
  },
  canvasContainer: {
    height: 180,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
    overflow: 'hidden',
    position: 'relative',
  },
  placeholderContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: Colors.textFaint,
    fontSize: 13,
    fontStyle: 'italic',
  },
  baseline: {
    position: 'absolute',
    bottom: 36,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: Colors.hairline,
    borderStyle: 'dashed',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primary,
  },
  confirmText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
