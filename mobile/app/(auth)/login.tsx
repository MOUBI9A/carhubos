import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Shield } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { changeLanguage } from '../../src/i18n';
import { Colors, Radii } from '../../src/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg(t('auth.invalidCredentials'));
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const user = await login(email.trim().toLowerCase(), password);
      // Route based on role
      switch (user.role) {
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
        case 'ROOT_ADMIN':
          Alert.alert(
            'Console Fondateur Web Uniquement',
            "Pour des raisons de sécurité, la console ROOT_ADMIN est accessible exclusivement depuis le navigateur de bureau sur https://www.carhub.codes/admin.",
          );
          break;
        default:
          setErrorMsg('Rôle non reconnu.');
      }
    } catch (err: any) {
      const serverMessage =
        err.response?.data?.message || t('auth.invalidCredentials');
      setErrorMsg(serverMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Language Selector Pills */}
          <View style={styles.langPillsRow}>
            {(['fr', 'ar', 'en'] as const).map((lang) => {
              const active = i18n.language === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  onPress={() => changeLanguage(lang)}
                  style={[styles.langPill, active && styles.langPillActive]}
                >
                  <Text style={[styles.langPillText, active && styles.langPillTextActive]}>
                    {lang.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.brandIconWrapper}>
              <Shield size={32} color={Colors.brass} />
            </View>
            <Text style={styles.brandTitle}>FIDER</Text>
            <Text style={styles.brandTagline}>{t('common.tagline')}</Text>
          </View>

          {/* Login Form Card */}
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>{t('auth.loginTitle')}</Text>
            <Text style={styles.formSubtitle}>{t('auth.loginSubtitle')}</Text>

            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <Input
              label={t('auth.emailLabel')}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon={<Mail size={18} color={Colors.textMuted} />}
            />

            <Input
              label={t('auth.passwordLabel')}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              isPassword
              icon={<Lock size={18} color={Colors.textMuted} />}
            />

            <Button
              title={isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
              onPress={handleLogin}
              loading={isLoading}
              style={styles.submitBtn}
            />
          </Card>

          {/* Moroccan Regulatory Compliance Footer */}
          <View style={styles.footerNote}>
            <Text style={styles.footerText}>
              Plateforme certifiée conforme CNDP & Loi 09-08
            </Text>
            <Text style={styles.footerSub}>
              Casablanca, Maroc · Version Mobile 1.0.0
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  langPillsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 24,
  },
  langPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  langPillActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  langPillTextActive: {
    color: Colors.foreground,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.brassMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.foreground,
    letterSpacing: 3,
  },
  brandTagline: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  formCard: {
    padding: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: Colors.dangerMuted,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  submitBtn: {
    marginTop: 8,
  },
  footerNote: {
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textFaint,
    fontWeight: '500',
  },
  footerSub: {
    fontSize: 10,
    color: Colors.textFaint,
  },
});
