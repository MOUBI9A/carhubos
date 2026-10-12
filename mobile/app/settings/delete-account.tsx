import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  Trash2,
  ArrowLeft,
  ShieldAlert,
  CheckCircle,
  Lock,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/api/client';
import { Header } from '../../src/components/ui/Header';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Colors, Radii } from '../../src/constants/theme';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!password.trim()) {
      Alert.alert('Mot de passe requis', 'Veuillez saisir votre mot de passe pour confirmer votre identité.');
      return;
    }

    if (confirmText.trim().toUpperCase() !== 'SUPPRIMER') {
      Alert.alert(
        'Confirmation requise',
        'Veuillez taper le mot "SUPPRIMER" pour attester de votre décision irréversible.'
      );
      return;
    }

    Alert.alert(
      'Dernière Confirmation',
      'Cette action est définitive et irréversible. Votre compte sera clôturé et vos données personnelles anonymisées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer Définitivement',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.delete('/auth/me', {
                data: { password },
              });

              Alert.alert(
                'Compte Supprimé',
                'Votre compte a été supprimé avec succès. Vos données personnelles ont été anonymisées.',
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      await logout();
                    },
                  },
                ]
              );
            } catch (err: any) {
              const msg =
                err.response?.data?.message ||
                'Impossible de supprimer le compte. Vérifiez votre mot de passe ou assurez-vous de n’avoir aucune location active.';
              Alert.alert('Erreur', msg);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Suppression de Compte"
        subtitle="Conformité CNDP Loi 09-08 & Politiques App Store / Google Play"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Warning Banner */}
        <Card style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <AlertTriangle size={24} color={Colors.danger} />
            <Text style={styles.warningTitle}>ACTION IRRÉVERSIBLE</Text>
          </View>
          <Text style={styles.warningBody}>
            Conformément aux exigences d'Apple, de Google et de la loi marocaine 09-08 relative à la protection des données à caractère personnel, vous avez le droit de demander l'effacement de vos données personnelles.
          </Text>
        </Card>

        {/* What happens list */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>CE QUI SERA EFFECTUÉ :</Text>

          <View style={styles.checkItem}>
            <CheckCircle size={16} color={Colors.accentTeal} style={styles.checkIcon} />
            <Text style={styles.checkText}>
              Anonymisation immédiate et irréversible de votre nom, email et coordonnées.
            </Text>
          </View>

          <View style={styles.checkItem}>
            <CheckCircle size={16} color={Colors.accentTeal} style={styles.checkIcon} />
            <Text style={styles.checkText}>
              Révocation de tous les consentements et purges des pièces d'identité déposées dans le coffre-fort.
            </Text>
          </View>

          <View style={styles.checkItem}>
            <CheckCircle size={16} color={Colors.accentTeal} style={styles.checkIcon} />
            <Text style={styles.checkText}>
              Fermeture immédiate de toutes les sessions actives sur tous vos appareils.
            </Text>
          </View>

          <View style={styles.checkItem}>
            <AlertTriangle size={16} color={Colors.warning} style={styles.checkIcon} />
            <Text style={[styles.checkText, { color: Colors.textMuted }]}>
              Les archives de facturation et d'états des lieux contradictoires déjà émargés sont conservées sous forme anonymisée conformément aux obligations légales comptables et fiscales marocaines (Dahir des Obligations et Contrats).
            </Text>
          </View>
        </Card>

        {/* Input Confirmation Form */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>CONFIRMATION DE SÉCURITÉ</Text>

          <Text style={styles.inputLabel}>Votre mot de passe actuel</Text>
          <View style={styles.inputWrapper}>
            <Lock size={16} color={Colors.textMuted} style={styles.fieldIcon} />
            <TextInput
              style={styles.textInput}
              secureTextEntry
              placeholder="••••••••••••"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Text style={styles.inputLabel}>
            Tapez "SUPPRIMER" pour valider l'effacement
          </Text>
          <TextInput
            style={[styles.textInput, styles.standaloneInput]}
            placeholder="SUPPRIMER"
            placeholderTextColor={Colors.textMuted}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
          />

          <View style={styles.actions}>
            <Button
              title={loading ? 'Suppression en cours...' : 'Supprimer Définitivement mon Compte'}
              variant="danger"
              size="lg"
              fullWidth
              loading={loading}
              icon={<Trash2 size={18} color="#FFFFFF" />}
              onPress={handleDelete}
            />

            <Button
              title="Annuler et retourner aux paramètres"
              variant="outline"
              size="md"
              fullWidth
              onPress={() => router.back()}
              style={{ marginTop: 10 }}
            />
          </View>
        </Card>
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
  warningCard: {
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.danger,
    letterSpacing: 0.8,
  },
  warningBody: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  infoCard: {
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  checkIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  checkText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
    lineHeight: 18,
  },
  formCard: {
    padding: 16,
  },
  formTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 14,
  },
  fieldIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  standaloneInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  actions: {
    marginTop: 4,
  },
});
