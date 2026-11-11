import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import {
  ShieldCheck,
  QrCode,
  FileText,
  Upload,
  Lock,
  Eye,
  AlertTriangle,
  CheckCircle,
  Building,
  KeyRound,
  Trash2,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/ui/Header';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Colors, Radii } from '../../src/constants/theme';

export default function RenterVaultScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [documents, setDocuments] = useState([
    {
      id: 'doc-cin',
      type: 'CIN / PASSEPORT',
      status: 'VERIFIED',
      filename: 'CIN_MAROC_RECTO_VERSO.pdf',
      updatedAt: '10/01/2026',
    },
    {
      id: 'doc-license',
      type: 'PERMIS DE CONDUIRE',
      status: 'VERIFIED',
      filename: 'PERMIS_B_MAROC.jpg',
      updatedAt: '12/01/2026',
    },
    {
      id: 'doc-proof',
      type: 'JUSTIFICATIF DE DOMICILE',
      status: 'PENDING',
      filename: 'QUITTANCE_LOYER.pdf',
      updatedAt: '05/02/2026',
    },
  ]);

  const [consentGrants, setConsentGrants] = useState([
    {
      id: 'cg-1',
      agencyName: 'Fider Casablanca Airport',
      scope: 'LOCATION_EN_COURS',
      expiresAt: '15/10/2026',
      active: true,
    },
    {
      id: 'cg-2',
      agencyName: 'Atlas Mobility Marrakech',
      scope: 'HISTORIQUE_RESTITUTION',
      expiresAt: '20/09/2026',
      active: true,
    },
  ]);

  const handlePickDocument = async (docType: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        Alert.alert(
          'Document Numérisé',
          `Le document ${docType} a été chiffré et stocké en toute sécurité dans votre coffre-fort.`
        );
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de charger le document.');
    }
  };

  const handleRevokeConsent = (grantId: string, agencyName: string) => {
    Alert.alert(
      'Révoquer le Consentement',
      `Êtes-vous certain de vouloir révoquer l'accès aux documents pour "${agencyName}" ? L'agence ne pourra plus consulter vos pièces d'identité.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Révoquer l’accès',
          style: 'destructive',
          onPress: () => {
            setConsentGrants((prev) => prev.filter((g) => g.id !== grantId));
            Alert.alert(
              'Consentement Révoqué',
              `L'accès aux documents pour ${agencyName} a été immédiatement supprimé.`
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Coffre-fort & Consentement"
        subtitle="Identité souveraine et contrôle d'accès conforme Loi 09-08"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Driver Verification QR Code */}
        <Card style={styles.qrCard}>
          <View style={styles.qrHeaderRow}>
            <View style={styles.qrIconWrap}>
              <QrCode size={22} color={Colors.primary} />
            </View>
            <View style={styles.qrTitleWrap}>
              <Text style={styles.qrTitle}>Mon Pass Conducteur Certifié</Text>
              <Text style={styles.qrSubtitle}>
                Présentez ce QR Code à l'agent de comptoir pour vérification instantanée
              </Text>
            </View>
          </View>

          {/* QR Container Visual Mock */}
          <View style={styles.qrBox}>
            <View style={styles.qrMatrixPattern}>
              <QrCode size={140} color={Colors.text} />
            </View>
            <Text style={styles.qrPassToken}>
              FIDER-PASS-{user?.id ? user.id.slice(0, 8).toUpperCase() : 'AUTH8921'}
            </Text>
            <View style={styles.badgeRow}>
              <Badge label="Identité Validée" variant="success" size="sm" />
              <Badge label="Réseau de Confiance Fider" variant="primary" size="sm" />
            </View>
          </View>
        </Card>

        {/* Encrypted Document Vault */}
        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionTitle}>
            COFFRE-FORT NUMÉRIQUE CHIFFRÉ ({documents.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            Vos documents sont chiffrés et stockés dans un vault sécurisé. Aucune agence n'y accède sans consentement explicite.
          </Text>
        </View>

        {documents.map((doc) => (
          <Card key={doc.id} style={styles.docCard}>
            <View style={styles.docHeader}>
              <View style={styles.docTypeRow}>
                <FileText size={18} color={Colors.primary} />
                <Text style={styles.docTypeTitle}>{doc.type}</Text>
              </View>
              <Badge
                label={doc.status === 'VERIFIED' ? 'Certifié CNDP' : 'En examen'}
                variant={doc.status === 'VERIFIED' ? 'success' : 'warning'}
                size="sm"
              />
            </View>

            <Text style={styles.docFilename}>{doc.filename}</Text>
            <Text style={styles.docUpdated}>Dernière mise à jour : {doc.updatedAt}</Text>

            <View style={styles.docActions}>
              <Button
                title="Mettre à jour"
                variant="outline"
                size="sm"
                icon={<Upload size={14} color={Colors.text} />}
                onPress={() => handlePickDocument(doc.type)}
              />
            </View>
          </Card>
        ))}

        {/* Active Agency Consent Grants */}
        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionTitle}>
            AUTORISATIONS & CONSENTEMENTS ACTIFS ({consentGrants.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            Agences autorisées à consulter vos pièces pour la durée de la location.
          </Text>
        </View>

        {consentGrants.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Lock size={32} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucun accès accordé</Text>
            <Text style={styles.emptySubtitle}>
              Aucune agence de location n'a actuellement accès à vos pièces d'identité.
            </Text>
          </Card>
        ) : (
          consentGrants.map((grant) => (
            <Card key={grant.id} style={styles.grantCard}>
              <View style={styles.grantHeader}>
                <View style={styles.grantAgencyRow}>
                  <Building size={16} color={Colors.brass} />
                  <Text style={styles.grantAgencyName}>{grant.agencyName}</Text>
                </View>
                <Badge label="Actif" variant="success" size="sm" />
              </View>

              <Text style={styles.grantScope}>
                Portée : Lecture des justificatifs (Contrat #{grant.scope})
              </Text>
              <Text style={styles.grantExpires}>
                Expire automatiquement le {grant.expiresAt}
              </Text>

              <View style={styles.grantActionRow}>
                <Button
                  title="Révoquer l'accès immédiatement"
                  variant="outline"
                  size="sm"
                  icon={<Trash2 size={14} color={Colors.danger} />}
                  onPress={() => handleRevokeConsent(grant.id, grant.agencyName)}
                  style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
                />
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
  qrCard: {
    padding: 18,
    marginBottom: 24,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
  },
  qrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  qrTitleWrap: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  qrSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.lg,
    padding: 20,
    marginTop: 8,
  },
  qrMatrixPattern: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPassToken: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionTitleBlock: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  docCard: {
    marginBottom: 12,
    padding: 14,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  docTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docTypeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  docFilename: {
    fontSize: 13,
    color: Colors.brass,
    fontWeight: '500',
    marginBottom: 4,
  },
  docUpdated: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  docActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  grantCard: {
    marginBottom: 12,
    padding: 14,
  },
  grantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  grantAgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grantAgencyName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  grantScope: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 4,
  },
  grantExpires: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  grantActionRow: {
    flexDirection: 'row',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
