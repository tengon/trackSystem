'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Satellite, LogIn, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useGPSStore, CurrentUser } from '@/store/gps-store';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'admin@gps.com' },
  { label: 'Ahmad Admin', email: 'ahmad@gps.com' },
  { label: 'Siti User', email: 'siti@gps.com' },
];

const DEMO_PASSWORD = 'password123';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { setIsAuthenticated, setCurrentUser } = useGPSStore();

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Login gagal');
      }

      const { user } = await res.json();
      setIsAuthenticated(true);
      setCurrentUser(user as CurrentUser);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat login';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Email dan password wajib diisi');
      return;
    }
    handleLogin(email, password);
  };

  const onQuickLogin = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
    handleLogin(accountEmail, DEMO_PASSWORD);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4">
      {/* Full-bleed Background Wallpaper Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/login_back.png')" }}
      />
      {/* Transparent Dark Ambient Layer */}
      <div className="absolute inset-0 bg-gradient-to-tr backdrop-brightness-95" />

      {/* Decorative Electric Glow Orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-cyan-500/20 blur-3xl" />

      {/* Transparent Electric Blue Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-md rounded-[15px] border border-blue-500/30 bg-transparent p-8 shadow-2xl shadow-blue-950/80 sm:p-10 transition-all ring-1 ring-blue-500/20">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/10 p-2.5 border border-blue-400/30 shadow-lg shadow-blue-500/20 backdrop-blur-md ring-1 ring-cyan-400/20">
            <img src="/images/truck_loc_icon.png" alt="GPS Tracker Logo" className="h-14 w-14 object-contain drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-extrabold text-blue-950 tracking-wide drop-shadow-md">Ikutin Aja</h1>
          <p className="mt-1 text-xs font-semibold text-blue-900 tracking-wider uppercase">Platform Pelacakan Real-time</p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-blue-200/90">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Masukkan email anda"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl border-blue-500/20 bg-slate-950/50 text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:border-blue-400 transition-all"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-blue-200/90">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password anda"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border-blue-500/20 bg-slate-950/50 pr-10 text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:border-blue-400 transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 focus:outline-none transition-colors"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 font-semibold text-white shadow-lg shadow-blue-950/80 hover:from-blue-500 hover:to-cyan-400 hover:shadow-cyan-500/40 active:scale-[0.99] disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Memproses...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Masuk
              </span>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">Akun Demo</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        </div>

        {/* Quick login buttons */}
        <div className="flex flex-col gap-2.5">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              variant="outline"
              disabled={isLoading}
              onClick={() => onQuickLogin(account.email)}
              className="h-10 w-full justify-between rounded-xl border-blue-500/20 bg-slate-950/40 px-4 text-xs font-medium text-blue-100/90 hover:border-cyan-400/50 hover:bg-blue-500/15 hover:text-cyan-200 disabled:opacity-50 transition-all"
            >
              <span>{account.label}</span>
              <span className="text-[11px] text-cyan-400/70">{account.email}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-xs text-blue-200/60 font-medium">
        Ikutin Aja — Platform Pelacakan Real-time v1.0
      </footer>
    </div>
  );
}
