'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import type LeafletType from 'leaflet';

let L: typeof import('leaflet') | null = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}
import { useGPSStore } from '@/store/gps-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X, Car, User, PawPrint, Package, MapPin, Battery,
  Gauge, Compass, Signal, SignalZero, Pause, Clock, Trash2,
  Route as RouteIcon, Navigation,
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
  const setActiveNavTab = useGPSStore((s) => s.setActiveNavTab);

  const currentUser = useGPSStore((s) => s.currentUser);
  const canDelete = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const [detailTab, setDetailTab] = useState('info');
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<L.Map | null>(null);

  // Calculate total route distance (km)
  const totalDistance = useMemo(() => {
    if (locationHistory.length < 2) return 0;
    const sorted = [...locationHistory].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    let dist = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i];
      const p2 = sorted[i + 1];
      const R = 6371;
      const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
      const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((p1.latitude * Math.PI) / 180) *
          Math.cos((p2.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      dist += R * c;
    }
    return Math.round(dist * 10) / 10;
  }, [locationHistory]);

  // Leaflet Mini Map lifecycle when history tab is active
  useEffect(() => {
    if (!L || detailTab !== 'history' || !miniMapContainerRef.current) return;

    if (!miniMapRef.current) {
      const map = L.map(miniMapContainerRef.current, {
        center: [-6.2088, 106.8456],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);
      miniMapRef.current = map;
    }

    const map = miniMapRef.current;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    // Clear previous vector layers
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    if (locationHistory.length > 0) {
      const sorted = [...locationHistory].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const latlngs: [number, number][] = sorted.map((loc) => [loc.latitude, loc.longitude]);

      // Route glow and core polyline
      L.polyline(latlngs, {
        color: '#60a5fa',
        weight: 6,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      const polyline = L.polyline(latlngs, {
        color: '#2563eb',
        weight: 3.5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Start Marker
      const startPt = sorted[0];
      const startIcon = L.divIcon({
        className: 'start-marker-mini',
        html: `
          <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
            <div style="background: #16a34a; color: #fff; font-size: 8px; font-weight: bold; padding: 1.5px 5px; border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); white-space: nowrap;">
              START
            </div>
            <div style="font-size: 14px; line-height: 1;">🟢</div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([startPt.latitude, startPt.longitude], { icon: startIcon })
        .addTo(map)
        .bindPopup(`<b>Titik Awal</b><br/>${format(new Date(startPt.timestamp), 'dd MMM, HH:mm:ss', { locale: idLocale })}`);

      // Finish / Current Marker
      const endPt = sorted[sorted.length - 1];
      const endIcon = L.divIcon({
        className: 'end-marker-mini',
        html: `
          <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
            <div style="background: #dc2626; color: #fff; font-size: 8px; font-weight: bold; padding: 1.5px 5px; border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); white-space: nowrap;">
              FINISH
            </div>
            <div style="font-size: 14px; line-height: 1;">🏁</div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([endPt.latitude, endPt.longitude], { icon: endIcon })
        .addTo(map)
        .bindPopup(`<b>Posisi Terkini</b><br/>${format(new Date(endPt.timestamp), 'dd MMM, HH:mm:ss', { locale: idLocale })}`);

      map.fitBounds(polyline.getBounds(), { padding: [25, 25] });
    } else if (device?.lastLatitude && device?.lastLongitude) {
      map.setView([device.lastLatitude, device.lastLongitude], 14);
    }

    return () => clearTimeout(timer);
  }, [detailTab, locationHistory, device?.lastLatitude, device?.lastLongitude]);

  if (!device) return null;

  const status = statusConfig[device.status] || statusConfig.offline;

  const handleClose = () => {
    selectDevice(null);
    setShowDeviceDetail(false);
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    if (!confirm(`Hapus perangkat "${device.name}"?`)) return;
    try {
      const q = currentUser ? `?currentUserId=${currentUser.id}&currentUserRole=${currentUser.role}` : '';
      const headers = {
        'x-user-id': currentUser?.id || '',
        'x-user-role': currentUser?.role || '',
      };
      await fetch(`/api/devices/${device.id}${q}`, { method: 'DELETE', headers });
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
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary h-5">
                Teltonika {device.model || 'FMC920'}
              </Badge>
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
          {canDelete && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Tabs value={detailTab} onValueChange={setDetailTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 rounded-none border-b bg-transparent h-10 p-0">
            <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none text-xs h-full">Info</TabsTrigger>
            <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none text-xs h-full">Riwayat & Rute</TabsTrigger>
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
                <InfoRow label="Model Teltonika" value={`Teltonika ${device.model || 'FMC920'}`} />
                <InfoRow label="Tipe" value={typeLabels[device.type]} />
                {device.phoneNumber && <InfoRow label="No. Telepon" value={device.phoneNumber} />}
                {device.imei && <InfoRow label="IMEI" value={device.imei} />}
                <InfoRow label="Dibuat" value={format(new Date(device.createdAt), 'dd MMM yyyy, HH:mm', { locale: idLocale })} />
                <InfoRow label="Diperbarui" value={format(new Date(device.updatedAt), 'dd MMM yyyy, HH:mm', { locale: idLocale })} />
                {device.notes && <InfoRow label="Catatan" value={device.notes} />}
              </div>
            </div>
          </TabsContent>

          {/* History Tab with Mini Map & Route */}
          <TabsContent value="history" className="p-4 mt-0 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Peta & Rute Riwayat</h4>
              <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                {locationHistory.length} Titik GPS
              </Badge>
            </div>

            {/* Mini Map Container */}
            <div className="relative rounded-xl overflow-hidden border shadow-sm h-48 w-full bg-muted">
              <div ref={miniMapContainerRef} className="w-full h-full z-0" />
              <div className="absolute top-2 left-2 z-[500] bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-semibold border shadow-xs flex items-center gap-1.5">
                <RouteIcon className="w-3 h-3 text-primary" />
                <span>Peta Rute Jalur</span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/40 border rounded-lg p-2">
                <p className="text-[9px] text-muted-foreground">Total Jarak</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{totalDistance} km</p>
              </div>
              <div className="bg-muted/40 border rounded-lg p-2">
                <p className="text-[9px] text-muted-foreground">Jml Titik</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{locationHistory.length}</p>
              </div>
              <div className="bg-muted/40 border rounded-lg p-2">
                <p className="text-[9px] text-muted-foreground">Kec. Terkini</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{Math.round(device.lastSpeed)} km/h</p>
              </div>
            </div>

            {/* Full Playback Button */}
            <Button
              size="sm"
              className="w-full gap-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              onClick={() => {
                selectDevice(device.id);
                setActiveNavTab('report');
                setShowDeviceDetail(false);
              }}
            >
              <RouteIcon className="w-4 h-4" />
              Buka Pemutar Rute & Riwayat Lengkap
            </Button>

            {/* Checkpoint list */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-2">Daftar Titik Koordinat:</p>
              {locationHistory.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs bg-muted/20 rounded-lg border border-dashed">
                  Belum ada rekaman riwayat lokasi untuk perangkat ini.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {locationHistory.slice(0, 30).map((loc, i) => (
                    <div
                      key={loc.id}
                      onClick={() => {
                        if (L && miniMapRef.current) {
                          miniMapRef.current.setView([loc.latitude, loc.longitude], 15, { animate: true });
                          L.popup()
                            .setLatLng([loc.latitude, loc.longitude])
                            .setContent(`<b>Titik #${i + 1}</b><br/>Waktu: ${format(new Date(loc.timestamp), 'HH:mm:ss')}<br/>Kec: ${Math.round(loc.speed)} km/h`)
                            .openOn(miniMapRef.current);
                        }
                      }}
                      className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-xs border border-transparent hover:border-muted-foreground/20"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-medium">{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</span>
                          <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
                            <Clock className="w-3 h-3" />
                            {format(new Date(loc.timestamp), 'HH:mm:ss')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground mt-0.5 text-[10px]">
                          <span className="text-emerald-600 font-medium">{Math.round(loc.speed)} km/h</span>
                          <span>Baterai: {loc.batteryLevel}%</span>
                          <span>Alt: {Math.round(loc.altitude)}m</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
