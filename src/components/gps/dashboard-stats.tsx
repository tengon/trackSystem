'use client';

import { useGPSStore } from '@/store/gps-store';
import {
  Monitor, Signal, SignalZero, Pause,
  Bell, BellRing, Gauge, Zap,
} from 'lucide-react';

const statCards = [
  {
    key: 'totalDevices',
    label: 'Total Perangkat',
    icon: Monitor,
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
  },
  {
    key: 'onlineDevices',
    label: 'Sedang Aktif',
    icon: Signal,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    key: 'idleDevices',
    label: 'Idle',
    icon: Pause,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    key: 'offlineDevices',
    label: 'Offline',
    icon: SignalZero,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  },
  {
    key: 'unreadAlerts',
    label: 'Notifikasi Baru',
    icon: BellRing,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  {
    key: 'avgSpeed',
    label: 'Rata-rata Kecepatan',
    icon: Gauge,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    suffix: ' km/h',
  },
];

export default function DashboardStats() {
  const stats = useGPSStore((s) => s.stats);

  if (!stats) return null;

  const values: Record<string, number> = {
    totalDevices: stats.totalDevices,
    onlineDevices: stats.onlineDevices,
    idleDevices: stats.idleDevices,
    offlineDevices: stats.offlineDevices,
    unreadAlerts: stats.unreadAlerts,
    avgSpeed: stats.avgSpeed,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {statCards.map((card) => {
        const Icon = card.icon;
        const value = values[card.key] ?? 0;
        return (
          <div
            key={card.key}
            className="bg-background border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center ${card.bgColor} ${card.color}`}>
                <Icon className="w-4 h-4" />
                
              </div>
            </div>
            <p className="text-xl font-bold">{value}{card.suffix || ''}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}
