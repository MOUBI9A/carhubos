"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function RootPage() {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!role) {
        router.push('/landing');
      } else {
        switch (role) {
          case 'ROOT_ADMIN': router.push('/admin'); break;
          case 'OWNER': router.push('/dashboard'); break;
          case 'AGENT': router.push('/agent'); break;
          case 'RENTER': router.push('/portal'); break;
        }
      }
    }
  }, [role, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center animate-pulse">
        <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
      </div>
    </div>
  );
}
