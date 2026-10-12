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
import { Search, Gauge, Fuel } from 'lucide-react-native';
import api from '../../src/api/client';
import { Header } from '../../src/components/ui/Header';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Input } from '../../src/components/ui/Input';
import { Colors } from '../../src/constants/theme';
import { Car } from '../../src/types';

export default function FleetScreen() {
  const [cars, setCars] = useState<Car[]>([]);
  const [filteredCars, setFilteredCars] = useState<Car[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'RENTED' | 'MAINTENANCE'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const fetchCars = async () => {
    try {
      const { data } = await api.get('/cars');
      const list = Array.isArray(data) ? data : [];
      setCars(list);
      applyFilter(list, search, statusFilter);
    } catch (err) {
      console.warn('Failed to fetch cars:', err);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  const applyFilter = (
    list: Car[],
    query: string,
    status: 'ALL' | 'AVAILABLE' | 'RENTED' | 'MAINTENANCE',
  ) => {
    let result = list;
    if (status !== 'ALL') {
      result = result.filter((c) => c.status === status);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (c) =>
          c.make.toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q) ||
          c.licensePlate.toLowerCase().includes(q),
      );
    }
    setFilteredCars(result);
  };

  const onSearchChange = (text: string) => {
    setSearch(text);
    applyFilter(cars, text, statusFilter);
  };

  const onFilterChange = (status: 'ALL' | 'AVAILABLE' | 'RENTED' | 'MAINTENANCE') => {
    setStatusFilter(status);
    applyFilter(cars, search, status);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCars();
    setRefreshing(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'success';
      case 'RENTED':
        return 'info';
      case 'MAINTENANCE':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Parc Automobile" subtitle={`${cars.length} véhicules enregistrés`} />

      <View style={styles.content}>
        {/* Search */}
        <Input
          placeholder="Rechercher par modèle ou matricule..."
          value={search}
          onChangeText={onSearchChange}
          icon={<Search size={18} color={Colors.textMuted} />}
          style={styles.searchInput}
        />

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {[
            { id: 'ALL', label: 'Tous' },
            { id: 'AVAILABLE', label: 'Disponibles' },
            { id: 'RENTED', label: 'En Location' },
            { id: 'MAINTENANCE', label: 'Atelier' },
          ].map((f) => {
            const active = statusFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => onFilterChange(f.id as any)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Car List */}
        <FlatList
          data={filteredCars}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.carCard}>
              <View style={styles.carHeader}>
                <View>
                  <Text style={styles.carTitle}>
                    {item.make} {item.model}
                  </Text>
                  <Text style={styles.carPlate}>{item.licensePlate}</Text>
                </View>
                <Badge
                  label={item.status}
                  variant={getStatusBadgeVariant(item.status) as any}
                />
              </View>

              <View style={styles.carMetaRow}>
                <View style={styles.metaItem}>
                  <Gauge size={14} color={Colors.textMuted} />
                  <Text style={styles.metaText}>
                    {item.currentMileage.toLocaleString()} km
                  </Text>
                </View>

                {item.fuelType ? (
                  <View style={styles.metaItem}>
                    <Fuel size={14} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{item.fuelType}</Text>
                  </View>
                ) : null}

                <View style={styles.priceContainer}>
                  <Text style={styles.priceText}>
                    {Number(item.dailyRate).toLocaleString()} MAD
                  </Text>
                  <Text style={styles.priceSub}>/ jour</Text>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun véhicule ne correspond aux critères.</Text>
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
  searchInput: {
    paddingVertical: 10,
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
  carCard: {
    marginBottom: 12,
    padding: 16,
  },
  carHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  carTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
  },
  carPlate: {
    fontSize: 12,
    fontFamily: 'Menlo',
    color: Colors.brass,
    marginTop: 2,
  },
  carMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
    paddingTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  priceContainer: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
  },
  priceSub: {
    fontSize: 11,
    color: Colors.textFaint,
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
