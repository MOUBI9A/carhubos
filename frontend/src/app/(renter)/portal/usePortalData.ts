"use client";

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { ConsentGrant, PortalMe, PortalNotification } from './types';

function errMessage(err: any, fallback: string): string {
  return err?.response?.data?.message || err?.message || fallback;
}

/**
 * Three independent renter-portal resources (profile+trust, consent grants,
 * notifications). Kept separate rather than one Promise.all bundle so one
 * failing endpoint doesn't blank out the other two sections of the page.
 */

export function usePortalMe() {
  const [me, setMe] = useState<PortalMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await api.get<PortalMe>('/portal/me');
      setMe(data);
    } catch (err: any) {
      setError(errMessage(err, 'Could not load your profile.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return { me, isLoading, error, refetch: fetchMe };
}

export function usePortalConsent() {
  const [grants, setGrants] = useState<ConsentGrant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConsent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await api.get<ConsentGrant[]>('/portal/consent');
      setGrants(data);
    } catch (err: any) {
      setError(errMessage(err, 'Could not load consent requests.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsent();
  }, [fetchConsent]);

  return { grants, isLoading, error, refetch: fetchConsent };
}

export function usePortalNotifications() {
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await api.get<PortalNotification[]>('/portal/notifications');
      setNotifications(data);
    } catch (err: any) {
      setError(errMessage(err, 'Could not load notifications.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { notifications, setNotifications, isLoading, error, refetch: fetchNotifications };
}
