import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import {
  QrCode,
  Camera,
  CheckCircle,
  AlertCircle,
  Search,
  User,
  ShieldCheck,
  FileText,
  X,
} from 'lucide-react-native';
import { Header } from '../../src/components/ui/Header';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Colors, Radii } from '../../src/constants/theme';
import api from '../../src/api/client';

export default function AgentScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualModal, setManualModal] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannedResult, setScannedResult] = useState<any>(null);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    processScannedPayload(data);
  };

  const processScannedPayload = async (rawCode: string) => {
    try {
      // In production, queries backend consent / trust network
      // e.g., api.get(`/consent/verify?code=${encodeURIComponent(rawCode)}`)
      // Mocking successful identification for preview/testing:
      setScannedResult({
        code: rawCode,
        renterName: 'Karim Tazi',
        cin: 'BE892341 (Haché HMAC-SHA256)',
        trustStatus: 'VÉRIFIÉ · AUCUN INCIDENT',
        consentActive: true,
        agencyScoped: true,
        activeBookingId: 'b-today-1',
      });
    } catch {
      Alert.alert(
        'Code Non Reconnu',
        'Le QR code scanné ne correspond à aucun conducteur ou consentement actif.'
      );
      setScanned(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    setManualModal(false);
    processScannedPayload(manualCode.trim());
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Scanner QR Conducteur"
        subtitle="Vérification instantanée d'identité et consentement"
      />

      <View style={styles.content}>
        {!permission ? (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>Vérification des autorisations...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.permissionBox}>
            <Camera size={48} color={Colors.textMuted} />
            <Text style={styles.permissionTitle}>Caméra Requise</Text>
            <Text style={styles.permissionText}>
              Pour scanner le QR code présenté sur le smartphone du locataire, autorisez l'accès à l'appareil photo.
            </Text>
            <Button
              title="Autoriser la caméra"
              variant="primary"
              onPress={requestPermission}
              style={{ marginTop: 16 }}
            />
            <Button
              title="Saisir le code manuellement"
              variant="outline"
              onPress={() => setManualModal(true)}
              style={{ marginTop: 10 }}
            />
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
              {/* Overlay with reticle */}
              <View style={styles.overlay}>
                <View style={styles.scanTarget}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <Text style={styles.scanInstruction}>
                  Cadrez le QR code du locataire (Profil Fider ou Réservation)
                </Text>
              </View>
            </CameraView>

            {/* Bottom Controls */}
            <View style={styles.controlsRow}>
              <Button
                title="Saisir Manuellement"
                variant="outline"
                size="md"
                icon={<Search size={16} color={Colors.text} />}
                onPress={() => setManualModal(true)}
              />
              {scanned && (
                <Button
                  title="Scanner à nouveau"
                  variant="primary"
                  size="md"
                  onPress={() => {
                    setScanned(false);
                    setScannedResult(null);
                  }}
                />
              )}
            </View>
          </View>
        )}

        {/* Verification Result Card */}
        {scannedResult && (
          <Card style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.checkBadge}>
                <ShieldCheck size={20} color={Colors.accentTeal} />
              </View>
              <View style={styles.resultHeaderContent}>
                <Text style={styles.renterName}>{scannedResult.renterName}</Text>
                <Text style={styles.trustScore}>{scannedResult.trustStatus}</Text>
              </View>
              <Badge label="Consentement Actif" variant="success" size="sm" />
            </View>

            <View style={styles.detailsRow}>
              <User size={14} color={Colors.textMuted} />
              <Text style={styles.detailsText}>CIN / Passeport : {scannedResult.cin}</Text>
            </View>

            <View style={styles.detailsRow}>
              <FileText size={14} color={Colors.textMuted} />
              <Text style={styles.detailsText}>
                Réservation liée : #{scannedResult.activeBookingId}
              </Text>
            </View>

            <View style={styles.actionRow}>
              <Button
                title="Lancer l'État des Lieux Contradictoire"
                variant="primary"
                size="md"
                fullWidth
                onPress={() => {
                  router.push({
                    pathname: '/inspection/wizard',
                    params: {
                      bookingId: scannedResult.activeBookingId,
                      renterName: scannedResult.renterName,
                      type: 'CHECK_OUT',
                    },
                  });
                }}
              />
            </View>
          </Card>
        )}
      </View>

      {/* Manual Input Modal */}
      <Modal
        visible={manualModal}
        transparent
        animationType="slide"
        onRequestClose={() => setManualModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saisie Manuelle</Text>
              <TouchableOpacity onPress={() => setManualModal(false)}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Entrez le code de vérification à 6 caractères ou l'identifiant de réservation.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Ex: FIDER-784920"
              placeholderTextColor={Colors.textMuted}
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              autoFocus
            />

            <View style={styles.modalActions}>
              <Button
                title="Annuler"
                variant="outline"
                onPress={() => setManualModal(false)}
              />
              <Button
                title="Vérifier"
                variant="primary"
                onPress={handleManualSubmit}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  cameraWrapper: {
    flex: 1,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scanTarget: {
    width: 240,
    height: 240,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: Colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanInstruction: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  controlsRow: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  resultCard: {
    marginTop: 16,
    padding: 16,
    borderColor: Colors.accentTeal,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  resultHeaderContent: {
    flex: 1,
  },
  renterName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  trustScore: {
    fontSize: 11,
    color: Colors.accentTeal,
    fontWeight: '700',
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  actionRow: {
    marginTop: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: 12,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
});
