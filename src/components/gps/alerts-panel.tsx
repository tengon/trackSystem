'use client';

import { useGPSStore } from '@/store/gps-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, ShieldAlert, TriangleAlert, BatteryWarning,
  Bell, BellOff, CheckCheck, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const alertIcons: Record<string, React.ReactNode> = {
  geofence_enter: <Shield className="w-4 h-4" />,
  geofence_exit: <ShieldAlert className="w-4 h-4" />,
  low_battery: <BatteryWarning className="w-4 h-4" />,
  speed_limit: <TriangleAlert className="w-4 h-4" />,
  sos: <TriangleAlert className="w-4 h-4" />,
};

const alertColors: Record<string, string> = {
  geofence_enter: 'text-emerald-600 bg-emerald-50',
  geofence_exit: 'text-red-600 bg-red-50',
  low_battery: 'text-amber-600 bg-amber-50',
  speed_limit: 'text-orange-600 bg-orange-50',
  sos: 'text-red-700 bg-red-100',
};

export default function AlertsPanel() {
  const alerts = useGPSStore((s) => s.alerts);
  const unreadCount = useGPSStore((s) => s.unreadCount);

  const markAsRead = async (id: string) => {
    await fetch(`/api/alerts/${id}/read`, { method: 'PUT' });
    const updated = alerts.map((a) => (a.id === id ? { ...a, read: true } : a));
    useGPSStore.getState().setAlerts(updated, Math.max(0, unreadCount - 1));
  };

  const markAllRead = async () => {
    await fetch(`/api/alerts/${id}/read`, { method: 'POST' });
    const updated = alerts.map((a) => ({ ...a, read: true }));
    useGPSStore.getState().setAlerts(updated, 0);
  };

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Notifikasi</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 text-[10px]">
              {unreadCount} baru
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={markAllRead}
          >
            <CheckCheck className="w-3 h-3" />
            Tandai Semua
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 -mx-1 px-1">
        <div className="space-y-1.5 pb-2">
          {alerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs flex flex-col items-center gap-2">
              <BellOff className="w-8 h-8 text-muted-foreground/50" />
              Tidak ada notifikasi
            </div>
          )}
          {alerts.map((alert) => {
            const icon = alertIcons[alert.type] || <Bell className="w-4 h-4" />;
            const colorClass = alertColors[alert.type] || 'text-gray-600 bg-gray-50';

            return (
              <div
                key={alert.id}
                className={`p-2.5 rounded-lg border transition-colors ${
                  alert.read
                    ? 'border-transparent bg-transparent opacity-60'
                    : 'border-border bg-muted/30 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium truncate">
                        {alert.device?.name || 'Unknown Device'}
                      </span>
                      {!alert.read && (
                        <button
                          onClick={() => markAsRead(alert.id)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(alert.createdAt), 'dd MMM, HH:mm', { locale: idLocale })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
