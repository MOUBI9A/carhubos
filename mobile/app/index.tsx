import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/theme';

export default function IndexScreen() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user || !role) {
      router.replace('/(auth)/login');
      return;
    }

    switch (role) {
      case 'OWNER':
      case 'MANAGER':
        router.replace('/(owner)');
        break;
      case 'AGENT':
        router.replace('/(agent)');
        break;
      case 'RENTER':
        router.replace('/(renter)');
        break;
      default:
        router.replace('/(auth)/login');
        break;
    }
  }, [user, role, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
