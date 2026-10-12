import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, User as UserIcon, Coins, ShieldCheck } from 'lucide-react-native';
import api from '../../src/api/client';
import { Header } from '../../src/components/ui/Header';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Colors } from '../../src/constants/theme';
import { Booking } from '../../src/types';

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filtered, setFiltered] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'CONFIRMED' | 'COMPLETED'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/bookings');
      const list = Array.isArray(data) ? data : [];
      setBookings(list);
      applyFilter(list, filter);
    } catch (err) {
      console.warn('Failed to fetch bookings:', err);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const applyFilter = (list: Booking[], tab: 'ALL' | 'ACTIVE' | 'CONFIRMED' | 'COMPLETED') => {
    if (tab === 'ALL') {
      setFiltered(list);
    } else {
      setFiltered(list.filter((b) => b.status === tab));
    }
  };

  const onTabChange = (tab: 'ALL' | 'ACTIVE' | 'CONFIRMED' | 'COMPLETED') => {
    setFilter(tab);
    applyFilter(bookings, tab);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'CONFIRMED':
        return 'info';
      case 'COMPLETED':
        return 'neutral';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Réservations" subtitle={`${bookings.length} dossiers au total`} />

      <View style={styles.content}>
        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {[
            { id: 'ALL', label: 'Toutes' },
            { id: 'ACTIVE', label: 'En cours' },
            { id: 'CONFIRMED', label: 'Confirmées' },
            { id: 'COMPLETED', label: 'Terminées' },
          ].map((tab) => {
            const active = filter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => onTabChange(tab.id as any)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.bookingCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.vehicleTitle}>
                    {item.car ? `${item.car.make} ${item.car.model}` : 'Véhicule'}
                  </Text>
                  {item.car?.licensePlate ? (
                    <Text style={styles.vehiclePlate}>{item.car.licensePlate}</Text>
                  ) : null}
                </View>
                <Badge
                  label={item.status}
                  variant={getStatusBadge(item.status) as any}
                />
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Calendar size={14} color={Colors.textMuted} />
                  <Text style={styles.detailText}>
                    {new Date(item.startDate).toLocaleDateString()} →{' '}
                    {new Date(item.endDate).toLocaleDateString()}
                  </Text>
                </View>

                {item.customer ? (
                  <View style={styles.detailRow}>
                    <UserIcon size={14} color={Colors.textMuted} />
                    <Text style={styles.detailText}>
                      {item.customer.firstName} {item.customer.lastName}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.financialRow}>
                  <View style={styles.financialCol}>
                    <Text style={styles.financialLabel}>Caution</Text>
                    <Text style={styles.financialValue}>
                      {Number(item.depositAmount || 0).toLocaleString()} MAD
                    </Text>
                  </View>

                  <View style={styles.financialColRight}>
                    <Text style={styles.financialLabel}>Total TTC</Text>
                    <Text style={styles.totalPrice}>
                      {Number(item.totalPrice).toLocaleString()} MAD
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune réservation dans cette catégorie.</Text>
            </View>
          }
        />
      </View>
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  filterPillActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  filterPillTextActive: {
    color: Colors.foreground,
  },
  bookingCard: {
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
  },
  vehiclePlate: {
    fontSize: 12,
    fontFamily: 'Menlo',
    color: Colors.brass,
    marginTop: 2,
  },
  cardDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
    paddingTop: 10,
    marginTop: 6,
  },
  financialCol: {},
  financialColRight: {
    alignItems: 'flex-end',
  },
  financialLabel: {
    fontSize: 11,
    color: Colors.textFaint,
    textTransform: 'uppercase',
  },
  financialValue: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  totalPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.brass,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
});
