'use client';

import { useGPSStore } from '@/store/gps-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X, Car, User, PawPrint, Package, MapPin, Battery,
  Gauge, Compass, Signal, SignalZero, Pause, Clock, Trash2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const typeIcons: Record<string, React.ReactNode> = {
  vehicle: <Car className="w-5 h-5" />,
  person: <User className="w-5 h-5" />,
  pet: <PawPrint className="w-5 h-5" />,
  asset: <Package className="w-5 h-5" />,
};

const typeLabels: Record<string, string> = {
  vehicle: 'Kendaraan',
  person: 'Orang',
  pet: 'Hewan Peliharaan',
  asset: 'Aset',
};

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string; textColor: string }> = {
  online: { icon: <Signal className="w-4 h-4" />, label: 'Aktif', color: 'bg-emerald-100 text-emerald-700', textColor: 'text-emerald-600' },
  offline: { icon: <SignalZero className="w-4 h-4" />, label: 'Offline', color: 'bg-gray-100 text-gray-600', textColor: 'text-gray-500' },
  idle: { icon: <Pause className="w-4 h-4" />, label: 'Idle', color: 'bg-amber-100 text-amber-700', textColor: 'text-amber-600' },
};

export default function DeviceDetail() {
  const device = useGPSStore((s) => s.devices.find((d) => d.id === s.selectedDeviceId) || null);
  const selectedDeviceId = useGPSStore((s) => s.selectedDeviceId);
  const locationHistory = useGPSStore((s) => s.locationHistory);
  const selectDevice = useGPSStore((s) => s.selectDevice);
  const setShowDeviceDetail = useGPSStore((s) => s.setShowDeviceDetail);

  if (!device) return null;

  const status = statusConfig[device.status] || statusConfig.offline;

  const handleClose = () => {
    selectDevice(null);
    setShowDeviceDetail(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Hapus perangkat "${device.name}"?`)) return;
    try {
      await fetch(`/api/devices/${device.id}`, { method: 'DELETE' });
      handleClose();
      window.location.reload();
    } catch (err) {
      console.error('Failed to delete device:', err);
    }
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-full md:w-96 bg-background border-l shadow-xl z-[1001] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${device.iconColor}20`, color: device.iconColor }}
          >
            {typeIcons[device.type]}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{device.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] h-5">
                {typeLabels[device.type]}
              </Badge>
              <Badge className={`text-[10px] h-5 ${status.color}`}>
                {status.label}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full grid grid-cols-3 rounded-none border-b bg-transparent h-10 p-0">
            <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none text-xs h-full">Info</TabsTrigger>
            <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none text-xs h-full">Riwayat</TabsTrigger>
            <TabsTrigger value="geofence" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none text-xs h-full">Geofence</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="p-4 space-y-4 mt-0">
            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Gauge className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Kecepatan</span>
                </div>
                <p className="text-lg font-bold">{Math.round(device.lastSpeed)} <span className="text-xs font-normal text-muted-foreground">km/h</span></p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Compass className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Arah</span>
                </div>
                <p className="text-lg font-bold">{Math.round(device.lastHeading)}° <span className="text-xs font-normal text-muted-foreground">{getDirection(device.lastHeading)}</span></p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Battery className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Baterai</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold">{device.batteryLevel}%</p>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${device.batteryLevel > 50 ? 'bg-emerald-500' : device.batteryLevel > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${device.batteryLevel}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Lokasi</span>
                </div>
                {device.lastLatitude && device.lastLongitude ? (
                  <p className="text-xs font-medium truncate">{device.lastLatitude.toFixed(5)}, {device.lastLongitude.toFixed(5)}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Tidak tersedia</p>
                )}
              </div>
            </div>

            {/* Device Info */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detail Perangkat</h4>
              <div className="space-y-2">
                <InfoRow label="Tipe" value={typeLabels[device.type]} />
                {device.phoneNumber && <InfoRow label="No. Telepon" value={device.phoneNumber} />}
                {device.imei && <InfoRow label="IMEI" value={device.imei} />}
                <InfoRow label="Dibuat" value={format(new Date(device.createdAt), 'dd MMM yyyy, HH:mm', { locale: idLocale })} />
                <InfoRow label="Diperbarui" value={format(new Date(device.updatedAt), 'dd MMM yyyy, HH:mm', { locale: idLocale })} />
                {device.notes && <InfoRow label="Catatan" value={device.notes} />}
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="p-4 mt-0">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Riwayat Lokasi</h4>
            {locationHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                Riwayat lokasi tidak tersedia
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {locationHistory.slice(0, 30).map((loc, i) => (
                  <div key={loc.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</span>
                        <span className="text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {format(new Date(loc.timestamp), 'HH:mm:ss')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground mt-0.5">
                        <span>{Math.round(loc.speed)} km/h</span>
                        <span>Akurasi: {loc.accuracy.toFixed(0)}m</span>
                        <span>Baterai: {loc.batteryLevel}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Geofence Tab */}
          <TabsContent value="geofence" className="p-4 mt-0">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Zona Geofence</h4>
            <div className="text-center py-8 text-muted-foreground text-xs">
              Geofence untuk perangkat ini akan ditampilkan di peta
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function getDirection(heading: number): string {
  const dirs = ['U', 'UT', 'T', 'TT', 'S', 'BD', 'B', 'BL'];
  const index = Math.round(heading / 45) % 8;
  const labels = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
  return labels[index];
}
