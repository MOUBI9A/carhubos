import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  Car as CarIcon,
  CheckCircle,
  AlertTriangle,
  Coins,
  ClipboardCheck,
  CalendarPlus,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/api/client';
import { Header } from '../../src/components/ui/Header';
import { Card } from '../../src/components/ui/Card';
import { StatCard } from '../../src/components/ui/StatCard';
import { Badge } from '../../src/components/ui/Badge';
import { Colors } from '../../src/constants/theme';
import { Booking, Car } from '../../src/types';

export default function OwnerDashboardScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCars: 0,
    activeRentals: 0,
    availableCars: 0,
    utilization: 0,
    revenueMtd: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);

  const loadDashboardData = async () => {
    try {
      const [carsRes, bookingsRes] = await Promise.all([
        api.get('/cars').catch(() => ({ data: [] })),
        api.get('/bookings').catch(() => ({ data: [] })),
      ]);

      const cars: Car[] = Array.isArray(carsRes.data) ? carsRes.data : [];
      const bookings: Booking[] = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];

      const total = cars.length;
      const rented = cars.filter((c) => c.status === 'RENTED').length;
      const available = cars.filter((c) => c.status === 'AVAILABLE').length;
      const utilization = total > 0 ? Math.round((rented / total) * 100) : 0;

      // Calculate total MTD revenue from completed & active bookings
      const revenue = bookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

      setStats({
        totalCars: total,
        activeRentals: rented,
        availableCars: available,
        utilization,
        revenueMtd: revenue,
      });

      setRecentBookings(bookings.slice(0, 5));
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={user?.agencyName || 'Command Centre'}
        subtitle={`Session : ${user?.name} (${user?.role})`}
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
        {/* Metric Cards Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label={t('dashboard.statsUtilization')}
            value={`${stats.utilization}%`}
            subValue={`${stats.activeRentals} / ${stats.totalCars} véhicules`}
            icon={<CarIcon size={16} color={Colors.primary} />}
            accentColor={stats.utilization >= 70 ? Colors.success : Colors.brass}
          />
          <StatCard
            label={t('dashboard.statsAvailable')}
            value={stats.availableCars}
            subValue="Prêts à la location"
            icon={<CheckCircle size={16} color={Colors.success} />}
            accentColor={Colors.success}
          />
          <StatCard
            label={t('dashboard.statsActiveRentals')}
            value={stats.activeRentals}
            subValue="Contrats en cours"
            icon={<CarIcon size={16} color={Colors.info} />}
          />
          <StatCard
            label={t('dashboard.statsRevenue')}
            value={`${stats.revenueMtd.toLocaleString()} MAD`}
            subValue="Facturation MTD"
            icon={<Coins size={16} color={Colors.brass} />}
            accentColor={Colors.brass}
          />
        </View>

        {/* Quick Operations Strip */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
        </View>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => router.push('/inspection/wizard')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.primaryMuted }]}>
              <ClipboardCheck size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionTitle}>{t('dashboard.newInspection')}</Text>
            <Text style={styles.actionDesc}>Départ / Restitution avec photos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => router.push('/(owner)/fleet')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.brassMuted }]}>
              <CarIcon size={20} color={Colors.brass} />
            </View>
            <Text style={styles.actionTitle}>Inspecter le Parc</Text>
            <Text style={styles.actionDesc}>Disponibilités et kilométrages</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Rentals List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dernières Réservations</Text>
          <TouchableOpacity onPress={() => router.push('/(owner)/bookings')}>
            <Text style={styles.seeAllText}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {recentBookings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucune réservation enregistrée.</Text>
          </Card>
        ) : (
          recentBookings.map((b) => (
            <Card key={b.id} style={styles.bookingCard}>
              <View style={styles.bookingRow}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingCar}>
                    {b.car ? `${b.car.make} ${b.car.model}` : 'Véhicule'}
                  </Text>
                  <Text style={styles.bookingDates}>
                    {new Date(b.startDate).toLocaleDateString()} →{' '}
                    {new Date(b.endDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.bookingRight}>
                  <Badge
                    label={b.status}
                    variant={
                      b.status === 'ACTIVE'
                        ? 'success'
                        : b.status === 'CONFIRMED'
                        ? 'info'
                        : 'neutral'
                    }
                  />
                  <Text style={styles.bookingPrice}>
                    {Number(b.totalPrice).toLocaleString()} MAD
                  </Text>
                </View>
              </View>
            </Card>
          ))
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seeAllText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
    borderRadius: 14,
    padding: 14,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 14,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  bookingCard: {
    marginBottom: 10,
    padding: 14,
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingCar: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 4,
  },
  bookingDates: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  bookingRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  bookingPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.brass,
  },
});
