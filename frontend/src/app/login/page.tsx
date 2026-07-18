"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Shield, Briefcase, UserCircle, Users, Mail, Lock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      showToast('success', 'Authentication Successful', 'Secure connection established.');
    } catch (error: any) {
      showToast('danger', 'Authentication Failed', error.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const autofill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('admin123'); // From seed.js
    showToast('info', 'Demo Credentials Loaded', 'Click Secure Login to proceed.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
            Fider
          </h1>
          <p className="text-white/40 font-bold uppercase tracking-[0.4em] text-[10px] mt-2">
            Sign in to your agency
          </p>
        </div>

        <form onSubmit={handleRealLogin} className="glass p-8 rounded-[2rem] shadow-2xl space-y-6 border-white/5">
           <div className="space-y-4">
              <div className="space-y-1.5">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Email</p>
                 <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <input 
                      required 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-4 text-sm font-bold text-white outline-none focus:border-primary focus:bg-primary/5 transition-all shadow-inner" 
                      placeholder="name@agency.com" 
                    />
                 </div>
              </div>
              
              <div className="space-y-1.5">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Password</p>
                 <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <input 
                      required 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-4 text-sm font-bold text-white outline-none focus:border-primary focus:bg-primary/5 transition-all shadow-inner" 
                      placeholder="••••••••" 
                    />
                 </div>
              </div>
           </div>

           <Button type="submit" className="w-full py-5 text-xs font-black tracking-[0.2em]" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign In'}
           </Button>
        </form>

        <p className="text-center mt-8 text-white/20 text-[9px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
          <Zap className="w-3 h-3" />
          Secure session · HttpOnly cookie
        </p>
      </motion.div>
    </div>
  );
}
