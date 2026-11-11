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
  CreditCard,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Header } from '../../src/components/ui/Header';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { changeLanguage } from '../../src/i18n';
import { Colors, Radii } from '../../src/constants/theme';

export default function OwnerSettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', `Impossible d'ouvrir le lien : ${url}`);
    });
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Paramètres & Profil" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <UserIcon size={24} color={Colors.primary} />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.roleBadgeContainer}>
                <Badge label={user?.role || 'UTILISATEUR'} variant="primary" />
              </View>
            </View>
          </View>
        </Card>

        {/* Agency Information Card */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>ENTREPRISE & ESPACE DE TRAVAIL</Text>
        </View>
        <Card style={styles.sectionCard}>
          <View style={styles.rowItem}>
            <View style={styles.rowIcon}>
              <Building size={18} color={Colors.brass} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>Raison Sociale</Text>
              <Text style={styles.rowValue}>{user?.agencyName || 'Agence Principale'}</Text>
            </View>
          </View>

          <View style={[styles.rowItem, styles.rowBorderTop]}>
            <View style={styles.rowIcon}>
              <CreditCard size={18} color={Colors.brass} />
            </View>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>Abonnement SaaS</Text>
              <Text style={styles.rowValue}>Formule Entreprise · Active</Text>
              <Text style={styles.rowCaption}>
                {t('settings.planCompanion')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Language Selection */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>LANGUE & AFFICHAGE</Text>
        </View>
        <Card style={styles.sectionCard}>
          <View style={styles.langGrid}>
            {[
              { id: 'fr', label: 'Français' },
              { id: 'ar', label: 'العربية (RTL)' },
              { id: 'en', label: 'English' },
            ].map((l) => {
              const active = i18n.language === l.id;
              return (
                <TouchableOpacity
                  key={l.id}
                  onPress={() => changeLanguage(l.id as any)}
                  style={[styles.langChoice, active && styles.langChoiceActive]}
                >
                  <Text style={[styles.langChoiceText, active && styles.langChoiceTextActive]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Legal & Compliance Section */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>LÉGAL & CONFORMITÉ DES STORES</Text>
        </View>
        <Card style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => handleOpenLink('https://www.carhub.codes/privacy')}
          >
            <View style={styles.navRowLeft}>
              <Shield size={18} color={Colors.textMuted} />
              <Text style={styles.navRowText}>{t('settings.privacyPolicy')}</Text>
            </View>
            <ChevronRight size={16} color={Colors.textFaint} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navRow, styles.rowBorderTop]}
            onPress={() => handleOpenLink('https://www.carhub.codes/terms')}
          >
            <View style={styles.navRowLeft}>
              <FileText size={18} color={Colors.textMuted} />
              <Text style={styles.navRowText}>{t('settings.termsOfService')}</Text>
            </View>
            <ChevronRight size={16} color={Colors.textFaint} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navRow, styles.rowBorderTop]}
            onPress={() => handleOpenLink('https://www.carhub.codes/support')}
          >
            <View style={styles.navRowLeft}>
              <HelpCircle size={18} color={Colors.textMuted} />
              <Text style={styles.navRowText}>{t('settings.support')}</Text>
            </View>
            <ChevronRight size={16} color={Colors.textFaint} />
          </TouchableOpacity>
        </Card>

        {/* Account Deletion & Security */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>SÉCURITÉ & DONNÉES PERSONNELLES</Text>
        </View>
        <Card style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/settings/delete-account')}
          >
            <View style={styles.navRowLeft}>
              <Trash2 size={18} color={Colors.danger} />
              <Text style={[styles.navRowText, { color: Colors.danger }]}>
                {t('settings.deleteAccount')}
              </Text>
            </View>
            <ChevronRight size={16} color={Colors.danger} />
          </TouchableOpacity>
        </Card>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
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
  sectionTitle: {
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  sectionCard: {
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  roleBadgeContainer: {
    marginTop: 6,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  rowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
  },
  rowIcon: {
    marginTop: 2,
  },
  rowTextCol: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 11,
    color: Colors.textFaint,
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: 2,
  },
  rowCaption: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  langGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  langChoice: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
  },
  langChoiceActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  langChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  langChoiceTextActive: {
    color: Colors.foreground,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navRowText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.foreground,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: Radii.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.dangerMuted,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.danger,
  },
});
