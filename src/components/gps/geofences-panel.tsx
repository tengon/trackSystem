'use client';

import { useGPSStore } from '@/store/gps-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Circle, MapPin } from 'lucide-react';

export default function GeofencesPanel() {
  const geofences = useGPSStore((s) => s.geofences);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Geofence ({geofences.length})</h3>
      </div>

      <ScrollArea className="flex-1 -mx-1 px-1">
        <div className="space-y-1.5 pb-2">
          {geofences.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs flex flex-col items-center gap-2">
              <Circle className="w-8 h-8 text-muted-foreground/50" />
              Belum ada zona geofence
            </div>
          )}
          {geofences.map((geofence) => (
            <div
              key={geofence.id}
              className="p-2.5 rounded-lg border border-border/50 bg-muted/20"
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  geofence.active ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'
                }`}>
                  <Circle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate">{geofence.name}</span>
                    <Badge
                      variant={geofence.active ? 'default' : 'secondary'}
                      className="text-[10px] h-4"
                    >
                      {geofence.active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {geofence.latitude.toFixed(4)}, {geofence.longitude.toFixed(4)}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>Radius: {geofence.radius}m</span>
                    <span>Tipe: {geofence.type}</span>
                    {geofence.device && <span>Perangkat: {geofence.device.name}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
