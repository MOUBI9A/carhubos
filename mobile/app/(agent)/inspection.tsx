import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  Car,
  Fuel,
  Gauge,
  Camera,
  FileSignature,
  AlertTriangle,
} from 'lucide-react-native';
import { useInspectionDrafts } from '../../src/context/InspectionDraftContext';
import api from '../../src/api/client';
import { Header } from '../../src/components/ui/Header';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Colors, Radii } from '../../src/constants/theme';
import { Inspection } from '../../src/types';

export default function AgentInspectionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { drafts, removeDraft, syncPendingDrafts, isSyncing, pendingCount } =
    useInspectionDrafts();

  const [refreshing, setRefreshing] = useState(false);
  const [completedInspections, setCompletedInspections] = useState<Inspection[]>([]);

  const loadServerInspections = async () => {
    try {
      const res = await api.get('/inspections');
      if (Array.isArray(res.data)) {
        setCompletedInspections(res.data);
      }
    } catch {
      // Sample certified historical inspections for demonstration
      setCompletedInspections([
        {
          id: 'insp-101',
          bookingId: 'b-today-1',
          carId: 'car-1',
          agencyId: 'agency-1',
          type: 'CHECK_OUT',
          odometer: 42150,
          fuelLevel: '7/8',
          damages: [],
          photos: ['photo-1.jpg', 'photo-2.jpg', 'photo-3.jpg'],
          signatureUrl: 'sig-data-url',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: 'insp-102',
          bookingId: 'b-today-2',
          carId: 'car-2',
          agencyId: 'agency-1',
          type: 'CHECK_IN',
          odometer: 38900,
          fuelLevel: '8/8',
          damages: [
            {
              id: 'd-1',
              zone: 'Pare-chocs avant droit',
              severity: 'LIGHT',
              description: 'Rayure superficielle 4cm',
            },
          ],
          photos: ['photo-4.jpg'],
          signatureUrl: 'sig-data-url-2',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    }
  };

  useEffect(() => {
    loadServerInspections();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServerInspections();
    setRefreshing(false);
  };

  const handleSyncAll = async () => {
    if (drafts.length === 0) return;
    try {
      await syncPendingDrafts();
      Alert.alert(
        'Synchronisation Réussie',
        'Tous les états des lieux locaux ont été certifiés et envoyés au serveur.'
      );
      loadServerInspections();
    } catch (err: any) {
      Alert.alert(
        'Erreur de synchronisation',
        err.message || 'Impossible de synchroniser. Vérifiez votre connexion.'
      );
    }
  };

  const handleDeleteDraft = (draftId: string) => {
    Alert.alert(
      'Supprimer le brouillon',
      'Êtes-vous sûr de vouloir supprimer cet état des lieux en attente ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => removeDraft(draftId),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="États des Lieux"
        subtitle="Constats contradictoires certifiés et brouillons hors-ligne"
        rightAction={
          <Button
            title="Nouveau"
            variant="primary"
            size="sm"
            icon={<Plus size={16} color="#FFFFFF" />}
            onPress={() => router.push('/inspection/wizard')}
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Offline / Pending Drafts Section */}
        {drafts.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.badgeTitleRow}>
                <Text style={styles.sectionTitle}>BROUILLONS HORS-LIGNE ({drafts.length})</Text>
                <Badge label="Non synchronisé" variant="warning" size="sm" />
              </View>
              <TouchableOpacity
                style={styles.syncAllButton}
                onPress={handleSyncAll}
                disabled={isSyncing}
              >
                <RefreshCw
                  size={14}
                  color={Colors.primary}
                  style={isSyncing ? styles.spinning : undefined}
                />
                <Text style={styles.syncAllText}>
                  {isSyncing ? 'Envoi...' : 'Tout synchroniser'}
                </Text>
              </TouchableOpacity>
            </View>

            {drafts.map((d) => (
              <Card key={d.localId} style={styles.draftCard}>
                <View style={styles.draftHeader}>
                  <View style={styles.typeRow}>
                    <ClipboardCheck size={16} color={Colors.warning} />
                    <Text style={styles.draftType}>
                      {d.type === 'CHECK_OUT' || d.type === 'PRE_RENTAL'
                        ? 'DÉPART (SORTANT)'
                        : 'RESTITUTION (ENTRANT)'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteDraft(d.localId)}
                    style={styles.deleteDraftBtn}
                  >
                    <Trash2 size={16} color={Colors.danger} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.draftBooking}>Réservation ref: {d.bookingId}</Text>
                <View style={styles.draftMetricsRow}>
                  <View style={styles.draftMetric}>
                    <Gauge size={14} color={Colors.textMuted} />
                    <Text style={styles.draftMetricText}>{d.mileage} km</Text>
                  </View>
                  <View style={styles.draftMetric}>
                    <Fuel size={14} color={Colors.textMuted} />
                    <Text style={styles.draftMetricText}>Jauge: {d.fuelLevel}</Text>
                  </View>
                  <View style={styles.draftMetric}>
                    <Camera size={14} color={Colors.textMuted} />
                    <Text style={styles.draftMetricText}>{d.photos.length} photo(s)</Text>
                  </View>
                </View>

                <View style={styles.draftActionsRow}>
                  <Button
                    title="Reprendre & Valider"
                    variant="outline"
                    size="sm"
                    fullWidth
                    onPress={() => {
                      router.push({
                        pathname: '/inspection/wizard',
                        params: {
                          bookingId: d.bookingId,
                          carId: d.carId,
                          type: d.type,
                          resumeDraftId: d.localId,
                        },
                      });
                    }}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Server Certified Inspections */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>
            HISTORIQUE DES ÉTATS DES LIEUX VALIDÉS ({completedInspections.length})
          </Text>

          {completedInspections.length === 0 ? (
            <Card style={styles.emptyCard}>
              <ClipboardCheck size={36} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Aucun constat enregistré</Text>
              <Text style={styles.emptySubtitle}>
                Réalisez un état des lieux contradictoire avec signature pour sécuriser chaque remise de clé.
              </Text>
            </Card>
          ) : (
            completedInspections.map((insp) => {
              const isOut = insp.type === 'CHECK_OUT';
              return (
                <Card key={insp.id} style={styles.inspCard}>
                  <View style={styles.inspHeaderRow}>
                    <View style={styles.typeRow}>
                      <View
                        style={[
                          styles.typeBadgeDot,
                          { backgroundColor: isOut ? Colors.accentTeal : Colors.primary },
                        ]}
                      />
                      <Text style={styles.inspTypeTitle}>
                        {isOut ? 'Inspection Sortante (Départ)' : 'Inspection Entrante (Retour)'}
                      </Text>
                    </View>
                    <Badge label="Certifié" variant="success" size="sm" />
                  </View>

                  <Text style={styles.inspBookingRef}>
                    Réservation : {insp.bookingId}
                  </Text>

                  <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                      <Gauge size={14} color={Colors.textMuted} />
                      <Text style={styles.metricLabel}>Compteur :</Text>
                      <Text style={styles.metricVal}>{insp.odometer} km</Text>
                    </View>

                    <View style={styles.metricItem}>
                      <Fuel size={14} color={Colors.textMuted} />
                      <Text style={styles.metricLabel}>Carburant :</Text>
                      <Text style={styles.metricVal}>{insp.fuelLevel}</Text>
                    </View>

                    <View style={styles.metricItem}>
                      <Camera size={14} color={Colors.textMuted} />
                      <Text style={styles.metricLabel}>Photos :</Text>
                      <Text style={styles.metricVal}>{insp.photos.length} clichés</Text>
                    </View>

                    <View style={styles.metricItem}>
                      <FileSignature size={14} color={Colors.brass} />
                      <Text style={styles.metricLabel}>Signature :</Text>
                      <Text style={[styles.metricVal, { color: Colors.brass }]}>
                        Émargé
                      </Text>
                    </View>
                  </View>

                  {insp.damages && insp.damages.length > 0 && (
                    <View style={styles.damagesBox}>
                      <AlertTriangle size={14} color={Colors.warning} />
                      <Text style={styles.damagesText}>
                        {insp.damages.length} dommage(s) relevé(s) lors de la passation
                      </Text>
                    </View>
                  )}

                  <View style={styles.dateFooter}>
                    <Clock size={12} color={Colors.textMuted} />
                    <Text style={styles.dateFooterText}>
                      Enregistré le{' '}
                      {new Date(insp.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  syncAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  spinning: {
    transform: [{ rotate: '45deg' }],
  },
  syncAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  draftCard: {
    marginBottom: 12,
    padding: 14,
    borderColor: 'rgba(217, 119, 6, 0.4)',
    backgroundColor: 'rgba(217, 119, 6, 0.05)',
  },
  draftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftType: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  deleteDraftBtn: {
    padding: 4,
  },
  draftBooking: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  draftMetricsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  draftMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  draftMetricText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  draftActionsRow: {
    marginTop: 4,
  },
  inspCard: {
    marginBottom: 14,
    padding: 16,
  },
  inspHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inspTypeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  inspBookingRef: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: Colors.surfaceElevated,
    padding: 12,
    borderRadius: Radii.md,
    marginBottom: 10,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  metricVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  damagesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    padding: 10,
    borderRadius: Radii.sm,
    marginBottom: 10,
  },
  damagesText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '600',
  },
  dateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dateFooterText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
  },
});
