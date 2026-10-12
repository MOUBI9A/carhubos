import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Car as CarIcon,
  User as UserIcon,
  ClipboardCheck,
  Clock,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useInspectionDrafts } from '../../src/context/InspectionDraftContext';
import api from '../../src/api/client';
import { Header } from '../../src/components/ui/Header';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Colors, Radii } from '../../src/constants/theme';
import { Booking } from '../../src/types';

export default function AgentHomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { drafts, pendingCount } = useInspectionDrafts();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CHECK_OUT' | 'CHECK_IN'>('ALL');
  const [bookings, setBookings] = useState<Booking[]>([]);

  const loadAgentOperations = async () => {
    try {
      const res = await api.get('/bookings');
      if (Array.isArray(res.data)) {
        setBookings(res.data);
      }
    } catch {
      // Fallback to sample operational bookings for frontline demonstration
      setBookings([
        {
          id: 'b-today-1',
          agencyId: 'agency-1',
          carId: 'car-1',
          renterId: 'renter-1',
          renterName: 'Karim Tazi',
          renterPhone: '+212 6 61 23 45 67',
          carMake: 'Renault',
          carModel: 'Clio V',
          carPlate: '45892-A-6',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          totalDays: 3,
          dailyRate: 350,
          totalPrice: 1050,
          depositAmount: 5000,
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
        },
        {
          id: 'b-today-2',
          agencyId: 'agency-1',
          carId: 'car-2',
          renterId: 'renter-2',
          renterName: 'Sarah Benali',
          renterPhone: '+212 6 62 89 12 34',
          carMake: 'Dacia',
          carModel: 'Duster 4x4',
          carPlate: '12490-B-1',
          startDate: new Date(Date.now() - 86400000 * 4).toISOString(),
          endDate: new Date().toISOString(),
          totalDays: 4,
          dailyRate: 500,
          totalPrice: 2000,
          depositAmount: 7000,
          status: 'ACTIVE',
          paymentStatus: 'PAID',
        },
        {
          id: 'b-today-3',
          agencyId: 'agency-1',
          carId: 'car-3',
          renterId: 'renter-3',
          renterName: 'Mehdi Alami',
          renterPhone: '+212 6 63 45 67 89',
          carMake: 'Hyundai',
          carModel: 'Tucson',
          carPlate: '78234-A-1',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000 * 5).toISOString(),
          totalDays: 5,
          dailyRate: 650,
          totalPrice: 3250,
          depositAmount: 10000,
          status: 'PENDING',
          paymentStatus: 'PARTIAL',
        },
      ]);
    }
  };

  useEffect(() => {
    loadAgentOperations();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAgentOperations();
    setRefreshing(false);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Query filter
      const matchesQuery =
        (b.renterName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.carPlate || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (`${b.carMake || ''} ${b.carModel || ''}`).toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesQuery) return false;

      // Filter type
      if (filterType === 'CHECK_OUT') {
        return b.status === 'CONFIRMED' || b.status === 'PENDING';
      }
      if (filterType === 'CHECK_IN') {
        return b.status === 'ACTIVE';
      }
      return true;
    });
  }, [bookings, searchQuery, filterType]);

  const departsCount = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING').length;
  const retoursCount = bookings.filter((b) => b.status === 'ACTIVE').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Passations & Comptoir"
        subtitle={`Agent : ${user?.name || 'Comptoir'} · ${user?.agencyName || 'Fider Agency'}`}
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
        {/* Pending Drafts Warning if offline work exists */}
        {pendingCount > 0 && (
          <TouchableOpacity
            style={styles.draftAlertCard}
            onPress={() => router.push('/(agent)/inspection')}
          >
            <AlertCircle size={20} color={Colors.warning} />
            <View style={styles.draftAlertContent}>
              <Text style={styles.draftAlertTitle}>
                {pendingCount} état(s) des lieux en attente de synchronisation
              </Text>
              <Text style={styles.draftAlertSubtitle}>
                Appuyez pour vérifier et synchroniser dès que le réseau est stable.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Operational Counters */}
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={[
              styles.counterBox,
              filterType === 'CHECK_OUT' && styles.counterBoxActive,
            ]}
            onPress={() =>
              setFilterType(filterType === 'CHECK_OUT' ? 'ALL' : 'CHECK_OUT')
            }
          >
            <View style={[styles.counterIconBadge, { backgroundColor: Colors.accentTealMuted }]}>
              <ArrowUpRight size={18} color={Colors.accentTeal} />
            </View>
            <Text style={styles.counterNumber}>{departsCount}</Text>
            <Text style={styles.counterLabel}>Départs Prévus</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.counterBox,
              filterType === 'CHECK_IN' && styles.counterBoxActive,
            ]}
            onPress={() =>
              setFilterType(filterType === 'CHECK_IN' ? 'ALL' : 'CHECK_IN')
            }
          >
            <View style={[styles.counterIconBadge, { backgroundColor: Colors.primaryMuted }]}>
              <ArrowDownLeft size={18} color={Colors.primary} />
            </View>
            <Text style={styles.counterNumber}>{retoursCount}</Text>
            <Text style={styles.counterLabel}>Retours Attendus</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher conducteur, immatriculation..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* List of Operational Handover Tasks */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            OPÉRATIONS DU JOUR ({filteredBookings.length})
          </Text>
        </View>

        {filteredBookings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <CarIcon size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucune passation trouvée</Text>
            <Text style={styles.emptySubtitle}>
              Toutes les livraisons et restitutions sont à jour pour ce filtre.
            </Text>
          </Card>
        ) : (
          filteredBookings.map((b) => {
            const isDeparture = b.status === 'CONFIRMED' || b.status === 'PENDING';
            const isReturn = b.status === 'ACTIVE';

            return (
              <Card key={b.id} style={styles.bookingCard}>
                {/* Header row */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.operationType}>
                    {isDeparture ? (
                      <>
                        <ArrowUpRight size={16} color={Colors.accentTeal} />
                        <Text style={[styles.operationTypeText, { color: Colors.accentTeal }]}>
                          DÉPART CLIENT
                        </Text>
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft size={16} color={Colors.primary} />
                        <Text style={[styles.operationTypeText, { color: Colors.primary }]}>
                          RETOUR VÉHICULE
                        </Text>
                      </>
                    )}
                  </View>
                  <Badge
                    label={b.paymentStatus === 'PAID' ? 'Caution Réglée' : 'Paiement partiel'}
                    variant={b.paymentStatus === 'PAID' ? 'success' : 'warning'}
                  />
                </View>

                {/* Car info */}
                <View style={styles.carRow}>
                  <View style={styles.carIconBox}>
                    <CarIcon size={20} color={Colors.brass} />
                  </View>
                  <View style={styles.carDetails}>
                    <Text style={styles.carTitle}>
                      {b.carMake} {b.carModel}
                    </Text>
                    <Text style={styles.carPlate}>
                      Matricule : {b.carPlate || 'En attente d’attribution'}
                    </Text>
                  </View>
                </View>

                {/* Renter info */}
                <View style={styles.renterRow}>
                  <UserIcon size={16} color={Colors.textMuted} />
                  <Text style={styles.renterName}>{b.renterName || 'Client'}</Text>
                  {b.renterPhone && (
                    <Text style={styles.renterPhone}>· {b.renterPhone}</Text>
                  )}
                </View>

                {/* Time & Dates */}
                <View style={styles.scheduleRow}>
                  <Clock size={14} color={Colors.textMuted} />
                  <Text style={styles.scheduleText}>
                    Période :{' '}
                    {new Date(b.startDate).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                    })}{' '}
                    ➔{' '}
                    {new Date(b.endDate).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </Text>
                </View>

                {/* Action button */}
                <View style={styles.actionRow}>
                  <Button
                    title={
                      isDeparture
                        ? "Démarrer l'État des Lieux Sortant"
                        : "Effectuer l'État des Lieux Entrant"
                    }
                    variant={isDeparture ? 'primary' : 'outline'}
                    size="md"
                    fullWidth
                    icon={<ClipboardCheck size={18} color="#FFFFFF" />}
                    onPress={() => {
                      router.push({
                        pathname: '/inspection/wizard',
                        params: {
                          bookingId: b.id,
                          carId: b.carId,
                          carName: `${b.carMake || ''} ${b.carModel || ''}`,
                          carPlate: b.carPlate || '',
                          renterName: b.renterName || '',
                          type: isDeparture ? 'CHECK_OUT' : 'CHECK_IN',
                        },
                      });
                    }}
                  />
                </View>
              </Card>
            );
          })
        )}
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
  draftAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 16,
  },
  draftAlertContent: {
    marginLeft: 12,
    flex: 1,
  },
  draftAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.warning,
  },
  draftAlertSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  counterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  counterBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  counterBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  counterIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  counterNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  counterLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    marginBottom: 20,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  bookingCard: {
    marginBottom: 14,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  operationType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  operationTypeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  carIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  carDetails: {
    flex: 1,
  },
  carTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  carPlate: {
    fontSize: 12,
    color: Colors.brass,
    fontWeight: '600',
    marginTop: 2,
  },
  renterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  renterName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  renterPhone: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  scheduleText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  actionRow: {
    marginTop: 4,
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
