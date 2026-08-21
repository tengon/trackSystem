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
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden p-4">
      {/* Background Wallpaper Image with Ambient Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
        style={{ backgroundImage: "url('/images/login_back.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/80 to-slate-950/50 backdrop-brightness-90" />

      {/* Decorative ambient glow Orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-teal-500/15 blur-3xl" />

      {/* Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-emerald-500/20 bg-slate-950/70 p-8 shadow-2xl shadow-emerald-950/80 backdrop-blur-2xl sm:p-10 transition-all">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 p-2.5 border border-emerald-500/30 shadow-lg shadow-emerald-500/20 backdrop-blur-md ring-1 ring-white/10">
            <img src="/images/truck_loc_icon.png" alt="GPS Tracker Logo" className="h-14 w-14 object-contain drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide drop-shadow-md">Ikutin Aja</h1>
          <p className="mt-1 text-xs font-medium text-emerald-400/80 tracking-wide uppercase">Platform Pelacakan Real-time</p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Masukkan email anda"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl border-white/10 bg-slate-900/80 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:border-emerald-500/50 transition-all"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan password anda"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl border-white/10 bg-slate-900/80 pr-10 text-white placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:border-emerald-500/50 transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 focus:outline-none transition-colors"
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
            className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 font-semibold text-white shadow-lg shadow-emerald-950/60 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-500/30 active:scale-[0.99] disabled:opacity-50 transition-all"
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
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-400/70">Akun Demo</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>

        {/* Quick login buttons */}
        <div className="flex flex-col gap-2.5">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              variant="outline"
              disabled={isLoading}
              onClick={() => onQuickLogin(account.email)}
              className="h-10 w-full justify-between rounded-xl border-emerald-500/20 bg-slate-900/60 px-4 text-xs font-medium text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-50 transition-all"
            >
              <span>{account.label}</span>
              <span className="text-[11px] text-slate-500">{account.email}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-500/80 font-medium">
        Ikutin Aja — Platform Pelacakan Real-time v1.0
      </footer>
    </div>
  );
}
