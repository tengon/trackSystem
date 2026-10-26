'use client';

import { useGPSStore } from '@/store/gps-store';
import {
  Monitor, Signal, SignalZero, Pause,
  Bell, BellRing, Gauge, Zap, type LucideIcon,
} from 'lucide-react';

interface StatCard {
  key: string;
  label: string;
  icon?: LucideIcon;
  iconUrl?: string;
  color?: string;
  bgColor?: string;
  suffix?: string;
}

const statCards: StatCard[] = [
  {
    key: 'totalDevices',
    label: 'Total Perangkat',
    icon: Monitor,
    iconUrl: '/icon/total_perangkat.png',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
  },
  {
    key: 'onlineDevices',
    label: 'Sedang Aktif',
    icon: Signal,
    iconUrl: '/icon/aktif.png',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    key: 'idleDevices',
    label: 'Idle',
    icon: Pause,
    iconUrl: '/icon/idle.png',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    key: 'offlineDevices',
    label: 'Offline',
    icon: SignalZero,
    iconUrl: '/icon/offline.png',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  },
  /*{
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
  },*/
];

export default function DashboardStats() {
  const stats = useGPSStore((s) => s.stats);

  if (!stats) return null;

  const values: Record<string, number> = {
    totalDevices: stats.totalDevices,
    onlineDevices: stats.onlineDevices,
    idleDevices: stats.idleDevices,
    offlineDevices: stats.offlineDevices,
    // unreadAlerts: stats.unreadAlerts,
    // avgSpeed: stats.avgSpeed,
  };

  const gridCols = statCards.length <= 4
    ? 'grid-cols-2 sm:grid-cols-4'
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';

  return (
    <div className={`grid ${gridCols} gap-2`}>
      {statCards.map((card) => {
        const Icon = card.icon;
        const value = values[card.key] ?? 0;
        return (
          <div
            key={card.key}
            className="group bg-background border rounded-lg p-2.5 sm:p-3 shadow-xs hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center gap-3 mb-1">
              {card.iconUrl ? (
                <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                  <img
                    src={card.iconUrl}
                    alt={card.label}
                    className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-110"
                  />
                </div>
              ) : Icon ? (
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md flex items-center justify-center ${card.bgColor || ''} ${card.color || ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                
              ) : null}
              <p className="text-xl sm:text-2xl font-bold tracking-tight">{value}{card.suffix || ''}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{card.label}</p>
            </div>
            
          </div>
        );
      })}
    </div>
  );
}
