import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

const AUTH_TOKEN_KEY = 'fider_mobile_jwt_token';
const USER_PROFILE_KEY = 'fider_mobile_user_profile';

/**
 * Persists JWT access token into hardware-backed iOS Keychain / Android Keystore.
 */
export async function saveAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  } catch (error) {
    console.warn('Failed to save auth token to SecureStore:', error);
  }
}

/**
 * Retrieves JWT access token from hardware-backed storage.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.warn('Failed to read auth token from SecureStore:', error);
    return null;
  }
}

/**
 * Deletes JWT access token from hardware-backed storage.
 */
export async function deleteAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.warn('Failed to delete auth token from SecureStore:', error);
  }
}

/**
 * Persists user session profile to secure storage.
 */
export async function saveUserProfile(user: User): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_PROFILE_KEY, JSON.stringify(user));
  } catch (error) {
    console.warn('Failed to save user profile to SecureStore:', error);
  }
}

/**
 * Retrieves user session profile from secure storage.
 */
export async function getUserProfile(): Promise<User | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to read user profile from SecureStore:', error);
    return null;
  }
}

/**
 * Clears entire session from secure storage upon logout or expiry.
 */
export async function clearSession(): Promise<void> {
  await Promise.all([
    deleteAuthToken(),
    SecureStore.deleteItemAsync(USER_PROFILE_KEY).catch(() => {}),
  ]);
}

// Ergonomic aliases
export const removeAuthToken = deleteAuthToken;
export const saveUserData = saveUserProfile;
export const getUserData = getUserProfile;
export const clearAuthSession = clearSession;
