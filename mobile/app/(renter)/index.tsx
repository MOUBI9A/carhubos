import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  Car as CarIcon,
  Calendar,
  Clock,
  ShieldCheck,
  FileText,
  Phone,
  Building,
  CheckCircle,
  QrCode,
  MapPin,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/api/client';
import { Header } from '../../src/components/ui/Header';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Colors, Radii } from '../../src/constants/theme';
import { Booking } from '../../src/types';

export default function RenterBookingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [rentals, setRentals] = useState<Booking[]>([]);

  const loadRenterData = async () => {
    try {
      const res = await api.get('/portal/bookings');
      if (Array.isArray(res.data)) {
        setRentals(res.data);
      }
    } catch {
      // Demo renter bookings
      setRentals([
        {
          id: 'b-renter-active',
          agencyId: 'agency-1',
          carId: 'car-10',
          renterId: user?.id || 'renter-1',
          renterName: user?.name || 'Hamza El Moueddane',
          carMake: 'Mercedes-Benz',
          carModel: 'Classe A 200d',
          carPlate: '94201-A-1',
          startDate: new Date(Date.now() - 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 2).toISOString(),
          totalDays: 3,
          dailyRate: 900,
          totalPrice: 2700,
          depositAmount: 15000,
          status: 'ACTIVE',
          paymentStatus: 'PAID',
        },
        {
          id: 'b-renter-past',
          agencyId: 'agency-1',
          carId: 'car-11',
          renterId: user?.id || 'renter-1',
          renterName: user?.name || 'Hamza El Moueddane',
          carMake: 'Volkswagen',
          carModel: 'Golf 8 GTD',
          carPlate: '63124-B-6',
          startDate: new Date(Date.now() - 86400000 * 15).toISOString(),
          endDate: new Date(Date.now() - 86400000 * 10).toISOString(),
          totalDays: 5,
          dailyRate: 750,
          totalPrice: 3750,
          depositAmount: 10000,
          status: 'COMPLETED',
          paymentStatus: 'PAID',
        },
      ]);
    }
  };

  useEffect(() => {
    loadRenterData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRenterData();
    setRefreshing(false);
  };

  const activeRental = rentals.find((r) => r.status === 'ACTIVE');
  const pastRentals = rentals.filter((r) => r.status !== 'ACTIVE');

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Mes Locations"
        subtitle={`Espace Conducteur · ${user?.name || 'Locataire'}`}
        rightAction={
          <TouchableOpacity
            style={styles.qrHeaderBtn}
            onPress={() => router.push('/(renter)/vault')}
          >
            <QrCode size={18} color={Colors.primary} />
          </TouchableOpacity>
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
        {/* Active Rental Highlight */}
        {activeRental && (
          <View style={styles.activeBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>LOCATION EN COURS</Text>
              <Badge label="Véhicule en main" variant="success" size="sm" />
            </View>

            <Card style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.heroCarIcon}>
                  <CarIcon size={24} color={Colors.primary} />
                </View>
                <View style={styles.heroTitleCol}>
                  <Text style={styles.heroCarName}>
                    {activeRental.carMake} {activeRental.carModel}
                  </Text>
                  <Text style={styles.heroPlate}>
                    Matricule : {activeRental.carPlate}
                  </Text>
                </View>
              </View>

              <View style={styles.heroDetailsBox}>
                <View style={styles.detailItem}>
                  <Calendar size={14} color={Colors.textMuted} />
                  <Text style={styles.detailLabel}>Restitution prévue :</Text>
                  <Text style={styles.detailValue}>
                    {new Date(activeRental.endDate).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <ShieldCheck size={14} color={Colors.accentTeal} />
                  <Text style={styles.detailLabel}>Caution bloquée :</Text>
                  <Text style={[styles.detailValue, { color: Colors.accentTeal }]}>
                    {activeRental.depositAmount} MAD
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Building size={14} color={Colors.textMuted} />
                  <Text style={styles.detailLabel}>Agence :</Text>
                  <Text style={styles.detailValue}>Fider Casablanca Airport</Text>
                </View>
              </View>

              <View style={styles.heroActionsRow}>
                <Button
                  title="Mon QR Conducteur"
                  variant="primary"
                  size="md"
                  icon={<QrCode size={16} color="#FFFFFF" />}
                  onPress={() => router.push('/(renter)/vault')}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Contrat PDF"
                  variant="outline"
                  size="md"
                  icon={<FileText size={16} color={Colors.text} />}
                  onPress={() => {
                    Alert.alert(
                      'Contrat de Location',
                      'Votre contrat certifié conforme est conservé dans votre coffre-fort sécurisé Fider.'
                    );
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Past Bookings */}
        <View style={styles.pastBlock}>
          <Text style={styles.sectionTitle}>
            HISTORIQUE DES LOCATIONS ({pastRentals.length})
          </Text>

          {pastRentals.length === 0 ? (
            <Card style={styles.emptyCard}>
              <CarIcon size={36} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Aucune autre location</Text>
              <Text style={styles.emptySubtitle}>
                Vos prochaines réservations et clôtures d'états des lieux apparaîtront ici.
              </Text>
            </Card>
          ) : (
            pastRentals.map((r) => (
              <Card key={r.id} style={styles.pastCard}>
                <View style={styles.pastHeader}>
                  <View style={styles.pastCarCol}>
                    <Text style={styles.pastCarName}>
                      {r.carMake} {r.carModel}
                    </Text>
                    <Text style={styles.pastDates}>
                      Du{' '}
                      {new Date(r.startDate).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                      })}{' '}
                      au{' '}
                      {new Date(r.endDate).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Badge label="Restituée" variant="info" size="sm" />
                </View>

                <View style={styles.pastPricingRow}>
                  <Text style={styles.pastPriceText}>
                    Montant total réglé : {r.totalPrice} MAD
                  </Text>
                  <Text style={styles.pastDepositReleased}>
                    Caution {r.depositAmount} MAD débloquée
                  </Text>
                </View>
              </Card>
            ))
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
  qrHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBlock: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  heroCard: {
    padding: 16,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    backgroundColor: 'rgba(124, 58, 237, 0.04)',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroCarIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroTitleCol: {
    flex: 1,
  },
  heroCarName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  heroPlate: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.brass,
    marginTop: 2,
  },
  heroDetailsBox: {
    backgroundColor: Colors.surfaceElevated,
    padding: 12,
    borderRadius: Radii.md,
    gap: 8,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pastBlock: {
    marginBottom: 20,
  },
  pastCard: {
    marginBottom: 12,
    padding: 14,
  },
  pastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  pastCarCol: {
    flex: 1,
  },
  pastCarName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  pastDates: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  pastPricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
    paddingTop: 8,
  },
  pastPriceText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  pastDepositReleased: {
    fontSize: 12,
    color: Colors.accentTeal,
    fontWeight: '600',
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
