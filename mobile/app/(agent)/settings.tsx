import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  User as UserIcon,
  Building,
  Globe,
  Shield,
  FileText,
  HelpCircle,
  Trash2,
  LogOut,
  ChevronRight,
  ClipboardList,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/ui/Header';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { changeLanguage } from '../../src/i18n';
import { Colors, Radii } from '../../src/constants/theme';

export default function AgentSettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', `Impossible d'ouvrir le lien : ${url}`);
    });
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter de votre session agent ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Paramètres Agent" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <UserIcon size={24} color={Colors.primary} />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.userName}>{user?.name || 'Agent Opérationnel'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.roleBadgeContainer}>
                <Badge label={user?.role || 'AGENT'} variant="primary" />
              </View>
            </View>
          </View>
        </Card>

        {/* Agency Information Card */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>AGENCE DE RATTACHEMENT</Text>
        </View>
        <Card style={styles.sectionCard}>
          <View style={styles.rowItem}>
            <View style={styles.rowIcon}>
              <Building size={18} color={Colors.brass} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>Agence</Text>
              <Text style={styles.rowValue}>{user?.agencyName || 'Agence Principale'}</Text>
            </View>
          </View>
          <View style={[styles.rowItem, styles.rowBorderTop]}>
            <View style={styles.rowIcon}>
              <ClipboardList size={18} color={Colors.accentTeal} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>Capacités Opérationnelles</Text>
              <Text style={styles.rowValue}>États des lieux · Remise de clés · Restitution</Text>
            </View>
          </View>
        </Card>

        {/* Language Selection */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>LANGUE D'AFFICHAGE</Text>
        </View>
        <Card style={styles.sectionCard}>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[
                styles.langBtn,
                i18n.language === 'fr' && styles.langBtnActive,
              ]}
              onPress={() => changeLanguage('fr')}
            >
              <Text
                style={[
                  styles.langText,
                  i18n.language === 'fr' && styles.langTextActive,
                ]}
              >
                Français
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.langBtn,
                i18n.language === 'ar' && styles.langBtnActive,
              ]}
              onPress={() => changeLanguage('ar')}
            >
              <Text
                style={[
                  styles.langText,
                  i18n.language === 'ar' && styles.langTextActive,
                ]}
              >
                العربية
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.langBtn,
                i18n.language === 'en' && styles.langBtnActive,
              ]}
              onPress={() => changeLanguage('en')}
            >
              <Text
                style={[
                  styles.langText,
                  i18n.language === 'en' && styles.langTextActive,
                ]}
              >
                English
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Legal & Compliance Links */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>LÉGAL & CONFORMITÉ CNDP / STORE</Text>
        </View>
        <Card style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => handleOpenLink('https://www.carhub.codes/privacy')}
          >
            <Shield size={18} color={Colors.textMuted} />
            <Text style={styles.navRowLabel}>Politique de Confidentialité</Text>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navRow, styles.rowBorderTop]}
            onPress={() => handleOpenLink('https://www.carhub.codes/terms')}
          >
            <FileText size={18} color={Colors.textMuted} />
            <Text style={styles.navRowLabel}>Conditions Générales d'Utilisation</Text>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navRow, styles.rowBorderTop]}
            onPress={() => handleOpenLink('https://www.carhub.codes/support')}
          >
            <HelpCircle size={18} color={Colors.textMuted} />
            <Text style={styles.navRowLabel}>Assistance & Support</Text>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Account Deletion */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>GESTION DU COMPTE</Text>
        </View>
        <Card style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/settings/delete-account')}
          >
            <Trash2 size={18} color={Colors.danger} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.navRowLabel, { color: Colors.danger }]}>
                Supprimer mon compte
              </Text>
              <Text style={styles.rowCaption}>
                Droit à l'oubli et conformité RGPD / Loi 09-08
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.danger} />
          </TouchableOpacity>
        </Card>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={Colors.danger} />
          <Text style={styles.logoutBtnText}>Se Déconnecter</Text>
        </TouchableOpacity>

        {/* App Version Footer */}
        <View style={styles.versionFooter}>
          <Text style={styles.versionText}>Fider Mobile v1.0.0 (Build 1)</Text>
          <Text style={styles.copyrightText}>
            Plateforme certifiée Fider OS · Tous droits réservés
          </Text>
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
  sectionCard: {
    padding: 0,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionTitle: {
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileText: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  roleBadgeContainer: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  rowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
  },
  rowIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  rowTextCol: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  rowCaption: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  langRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  langText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  langTextActive: {
    color: '#FFFFFF',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  navRowLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: Radii.md,
    paddingVertical: 14,
    marginBottom: 24,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.danger,
  },
  versionFooter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  copyrightText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
