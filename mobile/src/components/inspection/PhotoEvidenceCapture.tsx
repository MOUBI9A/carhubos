import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { Colors, Radii } from '../../constants/theme';

interface PhotoSlot {
  key: string;
  label: string;
  uri?: string;
}

interface PhotoEvidenceCaptureProps {
  photos: Record<string, string>; // slotKey -> uri
  onChange: (photos: Record<string, string>) => void;
}

const DEFAULT_SLOTS: Array<{ key: string; label: string }> = [
  { key: 'front', label: 'Face Avant' },
  { key: 'right', label: 'Côté Droit' },
  { key: 'rear', label: 'Face Arrière' },
  { key: 'left', label: 'Côté Gauche' },
  { key: 'dashboard', label: 'Compteur / Jauge' },
];

export const PhotoEvidenceCapture: React.FC<PhotoEvidenceCaptureProps> = ({
  photos,
  onChange,
}) => {
  const handleTakePhoto = async (slotKey: string) => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Autorisation requise',
          "L'accès à l'appareil photo est requis pour enregistrer les photos d'état des lieux.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        onChange({
          ...photos,
          [slotKey]: result.assets[0].uri,
        });
      }
    } catch (err) {
      console.warn('Camera capture error:', err);
    }
  };

  const handlePickFromGallery = async (slotKey: string) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Autorisation requise',
          "L'accès à la galerie est requis pour sélectionner des photos existantes.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        onChange({
          ...photos,
          [slotKey]: result.assets[0].uri,
        });
      }
    } catch (err) {
      console.warn('Gallery picker error:', err);
    }
  };

  const handleRemovePhoto = (slotKey: string) => {
    const updated = { ...photos };
    delete updated[slotKey];
    onChange(updated);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>PHOTOGRAPHIES CONTRADICTOIRES</Text>
      <View style={styles.grid}>
        {DEFAULT_SLOTS.map((slot) => {
          const photoUri = photos[slot.key];

          return (
            <View key={slot.key} style={styles.slotCard}>
              <Text style={styles.slotLabel}>{slot.label}</Text>
              {photoUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: photoUri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    onPress={() => handleRemovePhoto(slot.key)}
                    style={styles.deleteBadge}
                  >
                    <Trash2 size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    onPress={() => handleTakePhoto(slot.key)}
                    style={styles.actionBtnPrimary}
                  >
                    <Camera size={18} color="#FFFFFF" />
                    <Text style={styles.btnTextPrimary}>Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handlePickFromGallery(slot.key)}
                    style={styles.actionBtnSecondary}
                  >
                    <ImageIcon size={18} color={Colors.textMuted} />
                    <Text style={styles.btnTextSecondary}>Galerie</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  header: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  grid: {
    gap: 10,
  },
  slotCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
    borderRadius: Radii.md,
    padding: 12,
  },
  slotLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
    height: 140,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  deleteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.danger,
    padding: 6,
    borderRadius: Radii.full,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: Radii.sm,
  },
  btnTextPrimary: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.hairline,
    paddingVertical: 10,
    borderRadius: Radii.sm,
  },
  btnTextSecondary: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
