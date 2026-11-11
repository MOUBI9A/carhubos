import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  X,
  Gauge,
  Fuel,
  Camera,
  FileSignature,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useInspectionDraft } from '../../src/context/InspectionDraftContext';
import { FuelGaugePicker } from '../../src/components/inspection/FuelGaugePicker';
import { PhotoEvidenceCapture } from '../../src/components/inspection/PhotoEvidenceCapture';
import { DigitalSignaturePad } from '../../src/components/inspection/DigitalSignaturePad';
import { Header } from '../../src/components/ui/Header';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Colors, Radii } from '../../src/constants/theme';
import { Damage } from '../../src/types';

export default function InspectionWizardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    bookingId?: string;
    carId?: string;
    carName?: string;
    carPlate?: string;
    renterName?: string;
    type?: string;
    resumeDraftId?: string;
  }>();

  const { drafts, syncDraftToServer, saveCurrentDraft, updateActiveDraft, activeDraft } =
    useInspectionDraft();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const inspectionType = params.type === 'CHECK_IN' ? 'POST_RENTAL' : 'PRE_RENTAL';
  const [odometer, setOdometer] = useState('42500');
  const [fuelLevel, setFuelLevel] = useState(4); // 4/8 default (half tank)
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [damages, setDamages] = useState<Damage[]>([]);
  const [signatureSvg, setSignatureSvg] = useState<string>('');

  // Add Damage Modal
  const [damageModalVisible, setDamageModalVisible] = useState(false);
  const [damageZone, setDamageZone] = useState('');
  const [damageSeverity, setDamageSeverity] = useState<'LIGHT' | 'MODERATE' | 'SEVERE'>('LIGHT');
  const [damageDesc, setDamageDesc] = useState('');

  // If resuming a draft
  useEffect(() => {
    if (params.resumeDraftId) {
      const existing = drafts.find((d) => d.localId === params.resumeDraftId);
      if (existing) {
        setOdometer(String(existing.mileage || '0'));
        setFuelLevel(existing.fuelLevel || 4);
        setDamages(existing.damages || []);
        if (existing.signatureSvg) {
          setSignatureSvg(existing.signatureSvg);
        }
      }
    }
  }, [params.resumeDraftId, drafts]);

  const handleAddDamage = () => {
    if (!damageZone.trim() || !damageDesc.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner la zone et la description du dommage.');
      return;
    }

    const newDamage: Damage = {
      id: `dmg_${Date.now()}`,
      zone: damageZone.trim(),
      severity: damageSeverity,
      description: damageDesc.trim(),
    };

    setDamages((prev) => [...prev, newDamage]);
    setDamageZone('');
    setDamageDesc('');
    setDamageModalVisible(false);
  };

  const handleRemoveDamage = (id: string) => {
    setDamages((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSaveDraft = async () => {
    const draftPayload = {
      localId: params.resumeDraftId || `draft_${Date.now()}`,
      bookingId: params.bookingId || 'booking-manual',
      carId: params.carId || 'car-manual',
      type: inspectionType as 'PRE_RENTAL' | 'POST_RENTAL',
      mileage: Number(odometer) || 0,
      fuelLevel,
      damages,
      photos: Object.values(photos),
      signatureSvg,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    updateActiveDraft(draftPayload);
    await saveCurrentDraft();

    Alert.alert(
      'Brouillon Sauvegardé',
      'Cet état des lieux a été conservé localement sur votre appareil. Vous pourrez le finaliser ou le synchroniser plus tard.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const handleFinalizeInspection = async () => {
    if (!signatureSvg) {
      Alert.alert(
        'Signature Manquante',
        'La signature numérique contradictoire du locataire est obligatoire pour certifier cet état des lieux.'
      );
      return;
    }

    setSubmitting(true);
    const draftPayload = {
      localId: params.resumeDraftId || `draft_${Date.now()}`,
      bookingId: params.bookingId || 'booking-1',
      carId: params.carId || 'car-1',
      type: inspectionType as 'PRE_RENTAL' | 'POST_RENTAL',
      mileage: Number(odometer) || 0,
      fuelLevel,
      damages,
      photos: Object.values(photos),
      signatureSvg,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    try {
      const result = await syncDraftToServer(draftPayload);
      if (result.success) {
        Alert.alert(
          'État des Lieux Certifié',
          'Le constat contradictoire a été certifié, horodaté et enregistré avec succès dans le système Fider.',
          [{ text: 'Continuer', onPress: () => router.back() }]
        );
      } else {
        // Fallback: save to local drafts
        updateActiveDraft(draftPayload);
        await saveCurrentDraft();
        Alert.alert(
          'Sauvegardé Hors-Ligne',
          'Impossible de joindre le serveur actuellement. Le constat est archivé localement et sera synchronisé automatiquement.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch {
      updateActiveDraft(draftPayload);
      await saveCurrentDraft();
      Alert.alert(
        'Sauvegardé Hors-Ligne',
        'Le constat est stocké localement sur votre téléphone.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with Close and Progress */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.title}>
            {params.type === 'CHECK_IN'
              ? 'État des Lieux Entrant (Restitution)'
              : 'État des Lieux Sortant (Départ)'}
          </Text>
          <Text style={styles.subtitle}>
            {params.carName || 'Véhicule'} · {params.carPlate || 'Matricule'} · {params.renterName || 'Locataire'}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Stepper Indicator */}
      <View style={styles.stepperContainer}>
        <View
          style={[styles.stepItem, currentStep >= 1 && styles.stepItemActive]}
        >
          <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>
            1
          </Text>
          <Text style={styles.stepLabel}>Compteur</Text>
        </View>
        <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
        <View
          style={[styles.stepItem, currentStep >= 2 && styles.stepItemActive]}
        >
          <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>
            2
          </Text>
          <Text style={styles.stepLabel}>Photos & Dégâts</Text>
        </View>
        <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />
        <View
          style={[styles.stepItem, currentStep >= 3 && styles.stepItemActive]}
        >
          <Text style={[styles.stepNumber, currentStep >= 3 && styles.stepNumberActive]}>
            3
          </Text>
          <Text style={styles.stepLabel}>Signature</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* STEP 1: ODOMETER & FUEL */}
        {currentStep === 1 && (
          <View style={styles.stepContent}>
            <Card style={styles.card}>
              <View style={styles.inputHeader}>
                <Gauge size={20} color={Colors.primary} />
                <Text style={styles.inputHeaderTitle}>KILOMÉTRAGE AU COMPTEUR</Text>
              </View>
              <Text style={styles.inputHelp}>
                Relevez la valeur exacte affichée sur le tableau de bord du véhicule.
              </Text>
              <View style={styles.odometerInputWrapper}>
                <TextInput
                  style={styles.odometerInput}
                  value={odometer}
                  onChangeText={setOdometer}
                  keyboardType="numeric"
                  placeholder="Ex: 45200"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={styles.odometerUnit}>KM</Text>
              </View>
            </Card>

            <Card style={styles.card}>
              <FuelGaugePicker value={fuelLevel} onChange={setFuelLevel} />
            </Card>
          </View>
        )}

        {/* STEP 2: PHOTOS & DAMAGES */}
        {currentStep === 2 && (
          <View style={styles.stepContent}>
            <PhotoEvidenceCapture photos={photos} onChange={setPhotos} />

            <Card style={styles.card}>
              <View style={styles.damagesHeaderRow}>
                <View style={styles.inputHeader}>
                  <AlertTriangle size={20} color={Colors.warning} />
                  <Text style={styles.inputHeaderTitle}>
                    DOMMAGES CONSTATÉS ({damages.length})
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addDamageBtn}
                  onPress={() => setDamageModalVisible(true)}
                >
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={styles.addDamageText}>Ajouter</Text>
                </TouchableOpacity>
              </View>

              {damages.length === 0 ? (
                <View style={styles.noDamageBox}>
                  <CheckCircle2 size={24} color={Colors.accentTeal} />
                  <Text style={styles.noDamageText}>
                    Aucun dommage ou rayure supplémentaire signalé. Véhicule conforme.
                  </Text>
                </View>
              ) : (
                damages.map((dmg) => (
                  <View key={dmg.id} style={styles.damageItem}>
                    <View style={styles.damageInfo}>
                      <View style={styles.damageZoneRow}>
                        <Text style={styles.damageZone}>{dmg.zone}</Text>
                        <Badge
                          label={
                            dmg.severity === 'LIGHT'
                              ? 'Léger'
                              : dmg.severity === 'MODERATE'
                              ? 'Moyen'
                              : 'Critique'
                          }
                          variant={
                            dmg.severity === 'LIGHT'
                              ? 'info'
                              : dmg.severity === 'MODERATE'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        />
                      </View>
                      <Text style={styles.damageDescription}>{dmg.description}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveDamage(dmg.id)}
                      style={styles.removeDamageBtn}
                    >
                      <Trash2 size={16} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </Card>
          </View>
        )}

        {/* STEP 3: SIGNATURE & CERTIFICATION */}
        {currentStep === 3 && (
          <View style={styles.stepContent}>
            {/* Metric Summary Card */}
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>RÉCAPITULATIF DU CONSTAT</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Compteur</Text>
                  <Text style={styles.summaryVal}>{odometer} km</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Carburant</Text>
                  <Text style={styles.summaryVal}>{fuelLevel}/8</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Photos</Text>
                  <Text style={styles.summaryVal}>
                    {Object.keys(photos).length} clichés
                  </Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Dégâts notés</Text>
                  <Text style={styles.summaryVal}>{damages.length}</Text>
                </View>
              </View>
            </Card>

            {/* Contradictory Legal Clause */}
            <Card style={styles.legalClauseCard}>
              <Text style={styles.legalText}>
                Le locataire et l'agent reconnaissent l'exactitude de l'état des lieux contradictoire ci-dessus établi conformément aux articles 676 et suivants du D.O.C. (Dahir des Obligations et Contrats marocain). La signature numérique apposée ci-après vaut acceptation ferme et certification sans réserve.
              </Text>
            </Card>

            {/* Signature Pad */}
            <DigitalSignaturePad
              signerName={params.renterName || 'Locataire'}
              onConfirm={(svg) => {
                setSignatureSvg(svg);
                Alert.alert(
                  'Signature Enregistrée',
                  'L’émargement électronique a été capturé avec succès.'
                );
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Footer Navigation Buttons */}
      <View style={styles.footerBar}>
        <View style={styles.footerLeftActions}>
          {currentStep > 1 ? (
            <Button
              title="Précédent"
              variant="outline"
              size="md"
              icon={<ArrowLeft size={16} color={Colors.text} />}
              onPress={() => setCurrentStep((prev) => (prev - 1) as any)}
            />
          ) : (
            <Button
              title="Sauvegarder"
              variant="outline"
              size="md"
              icon={<Save size={16} color={Colors.text} />}
              onPress={handleSaveDraft}
            />
          )}
        </View>

        <View style={styles.footerRightActions}>
          {currentStep < 3 ? (
            <Button
              title="Suivant"
              variant="primary"
              size="md"
              icon={<ArrowRight size={16} color="#FFFFFF" />}
              onPress={() => setCurrentStep((prev) => (prev + 1) as any)}
            />
          ) : (
            <Button
              title={submitting ? 'Certification...' : 'Certifier & Clôturer'}
              variant="primary"
              size="md"
              loading={submitting}
              icon={<CheckCircle2 size={16} color="#FFFFFF" />}
              onPress={handleFinalizeInspection}
            />
          )}
        </View>
      </View>

      {/* Add Damage Modal */}
      <Modal
        visible={damageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDamageModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Signaler un Dommage</Text>
              <TouchableOpacity onPress={() => setDamageModalVisible(false)}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Zone du véhicule</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Pare-chocs avant gauche, Portière arrière..."
              placeholderTextColor={Colors.textMuted}
              value={damageZone}
              onChangeText={setDamageZone}
            />

            <Text style={styles.modalLabel}>Gravité du dommage</Text>
            <View style={styles.severityRow}>
              {(['LIGHT', 'MODERATE', 'SEVERE'] as const).map((sev) => (
                <TouchableOpacity
                  key={sev}
                  style={[
                    styles.severityBtn,
                    damageSeverity === sev && styles.severityBtnActive,
                  ]}
                  onPress={() => setDamageSeverity(sev)}
                >
                  <Text
                    style={[
                      styles.severityBtnText,
                      damageSeverity === sev && styles.severityBtnTextActive,
                    ]}
                  >
                    {sev === 'LIGHT' ? 'Léger' : sev === 'MODERATE' ? 'Moyen' : 'Critique'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Description précise</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Ex: Rayure profonde de 5 cm sans enfoncement de tôle..."
              placeholderTextColor={Colors.textMuted}
              value={damageDesc}
              onChangeText={setDamageDesc}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Button
                title="Annuler"
                variant="outline"
                onPress={() => setDamageModalVisible(false)}
              />
              <Button
                title="Ajouter au constat"
                variant="primary"
                onPress={handleAddDamage}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarLeft: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.surface,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepItemActive: {},
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
  },
  stepNumberActive: {
    backgroundColor: Colors.primary,
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  stepContent: {
    gap: 16,
  },
  card: {
    padding: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  inputHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.8,
  },
  inputHelp: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  odometerInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: 16,
    height: 54,
  },
  odometerInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  odometerUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.brass,
  },
  damagesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addDamageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  addDamageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noDamageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    padding: 12,
    borderRadius: Radii.md,
  },
  noDamageText: {
    fontSize: 12,
    color: Colors.accentTeal,
    flex: 1,
    fontWeight: '600',
  },
  damageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
  },
  damageInfo: {
    flex: 1,
  },
  damageZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  damageZone: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  damageDescription: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  removeDamageBtn: {
    padding: 8,
  },
  summaryCard: {
    padding: 16,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md,
    padding: 12,
  },
  summaryCol: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  legalClauseCard: {
    padding: 14,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  legalText: {
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerLeftActions: {
    flex: 1,
    marginRight: 8,
  },
  footerRightActions: {
    flex: 1,
    marginLeft: 8,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    padding: 10,
    color: Colors.text,
    fontSize: 14,
    marginBottom: 12,
  },
  modalTextArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  severityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  severityBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  severityBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  severityBtnTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
});
