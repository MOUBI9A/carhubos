"use client";

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * App-wide TanStack Query v5 provider.
 * Client is created once per browser session (lazy useState initializer)
 * so cache survives re-renders but is never shared across SSR requests.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 10_000),
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
