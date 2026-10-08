'use client';

import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';
import type { DiagnosticAction, DiagnosticScenario, DiagnosticSession, DiagnosticVehicle } from './types';

export function diagnosticError(error: unknown): { kind: 'permission' | 'conflict' | 'missing' | 'network' | 'invalid'; message: string } {
  if (!isAxiosError(error)) return { kind: 'network', message: '' };
  const status = error.response?.status;
  const message: unknown = error.response?.data?.message;
  return {
    kind: status === 403 ? 'permission' : status === 409 ? 'conflict' : status === 404 ? 'missing' : status === 400 ? 'invalid' : 'network',
    message: typeof message === 'string' ? message : Array.isArray(message) ? message.filter((item) => typeof item === 'string').join('. ') : '',
  };
}

export function useDiagnostics(sessionId: string | null) {
  const { user } = useAuth();
  const client = useQueryClient();
  // Membership data and evidence must not be shared between logged-in users.
  const scope = ['diagnostics', user?.id] as const;
  const access = useQuery({
    queryKey: [...scope, 'access'],
    queryFn: async () => (await api.get<{ capabilities: string[] }>('/diagnostics/access')).data,
    enabled: !!user,
    retry: false,
    staleTime: 0,
  });
  const capabilities = access.data?.capabilities ?? [];
  const canView = capabilities.includes('diagnostics.view');
  const vehicles = useQuery({
    queryKey: [...scope, 'vehicles'],
    queryFn: async () => (await api.get<DiagnosticVehicle[]>('/diagnostics/vehicles')).data,
    enabled: canView,
    retry: false,
  });
  const sessions = useQuery({
    queryKey: [...scope, 'sessions'],
    queryFn: async () => (await api.get<DiagnosticSession[]>('/diagnostics/sessions')).data,
    enabled: canView,
    retry: false,
  });
  const scenarios = useQuery({
    queryKey: [...scope, 'scenarios'],
    queryFn: async () => (await api.get<DiagnosticScenario[]>('/diagnostics/scenarios')).data,
    enabled: canView,
    retry: false,
  });
  const session = useQuery({
    queryKey: [...scope, 'session', sessionId],
    queryFn: async () => (await api.get<DiagnosticSession>(`/diagnostics/sessions/${sessionId}`)).data,
    enabled: canView && !!sessionId,
    retry: false,
    staleTime: 0,
  });
  const createVehicle = useMutation({
    mutationFn: async (body: { brand: string; model: string; vin?: string; year?: number }) => (await api.post<DiagnosticVehicle>('/diagnostics/vehicles', body)).data,
    onSuccess: async () => { await client.invalidateQueries({ queryKey: [...scope, 'vehicles'] }); },
  });
  const createSession = useMutation({
    mutationFn: async (body: { vehicleId: string; symptoms?: string }) => (await api.post<DiagnosticSession>('/diagnostics/sessions', body)).data,
    onSuccess: async (data) => {
      client.setQueryData([...scope, 'session', data.id], data);
      await client.invalidateQueries({ queryKey: [...scope, 'sessions'] });
    },
  });
  const updateSession = useMutation({
    mutationFn: async ({ session: current, command }: { session: DiagnosticSession; command: DiagnosticAction }) => {
      const path = `/diagnostics/sessions/${current.id}/${command.action}`;
      const body = { ...command.body, expectedRevision: current.revision };
      return (await (command.action === 'estimate' ? api.put<DiagnosticSession>(path, body) : api.post<DiagnosticSession>(path, body))).data;
    },
    onSuccess: async (data) => {
      client.setQueryData([...scope, 'session', data.id], data);
      await client.invalidateQueries({ queryKey: [...scope, 'sessions'] });
    },
    onError: async (error, variables) => {
      if (diagnosticError(error).kind === 'conflict') {
        // Refresh evidence, but never silently resubmit a technician decision.
        await client.invalidateQueries({ queryKey: [...scope, 'session', variables.session.id] });
      }
    },
  });
  const retry = async () => {
    await access.refetch();
    if (canView) await Promise.all([vehicles.refetch(), sessions.refetch(), scenarios.refetch(), ...(sessionId ? [session.refetch()] : [])]);
  };
  return { access, capabilities, canView, vehicles, sessions, scenarios, session, createVehicle, createSession, updateSession, retry };
}
