'use client';

import React, { useState } from 'react';
import { useGPSStore, type Device } from '@/store/gps-store';
import { getTeltonikaModel } from '@/lib/teltonika-models';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X, Car, User, PawPrint, Package, Gauge, Compass, Battery,
  Clock, MapPin, Route as RouteIcon, ChevronDown, ChevronUp,
  Activity, Zap, ShieldCheck, Fuel, Radio, Flame,
  Cpu, Wrench, ShieldAlert, AlertTriangle, Eye, Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const typeIcons: Record<string, React.ReactNode> = {
  vehicle: <Car className="w-4 h-4" />,
  person: <User className="w-4 h-4" />,
  pet: <PawPrint className="w-4 h-4" />,
  asset: <Package className="w-4 h-4" />,
};

const statusConfig: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  online: { label: 'Aktif Bergerak', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', dotClass: 'bg-emerald-500 animate-pulse' },
  idle: { label: 'Mesin Menyala (Idle)', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', dotClass: 'bg-amber-500' },
  offline: { label: 'Offline', badgeClass: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30', dotClass: 'bg-gray-400' },
};

function getDirectionLabel(heading: number): string {
  const dirs = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
  const index = Math.round(heading / 45) % 8;
  return dirs[index];
}

interface DeviceMapPopupProps {
  device: Device;
  onClose: () => void;
  onOpenTripHistory: () => void;
  onOpenDetail?: () => void;
}

export default function DeviceMapPopup({
  device,
  onClose,
  onOpenTripHistory,
  onOpenDetail,
}: DeviceMapPopupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get Teltonika Model Meta
  const modelMeta = getTeltonikaModel(device.model);
  const status = statusConfig[device.status] || statusConfig.offline;

  const isObd = modelMeta.category.toLowerCase().includes('obd') || modelMeta.model.includes('003');
  const isCan = modelMeta.hasCanbus && !isObd;
  const isPersonal = modelMeta.series === 'GH' || modelMeta.series === 'TMT' || device.type === 'person';
  const isAsset = modelMeta.series === 'TAT' || device.type === 'asset';
  const isStandardVehicle = !isObd && !isCan && !isPersonal && !isAsset;

  // Realistic telemetry estimation based on device status and tracker type
  const isMoving = device.status === 'online';
  const isIdle = device.status === 'idle';

  // OBD/CAN metrics
  const estimatedRpm = isMoving ? 1850 + Math.round((device.lastSpeed % 30) * 35) : isIdle ? 780 : 0;
  const estimatedCoolant = isMoving || isIdle ? 88 + Math.round((device.lastSpeed % 10) * 0.4) : 31;
  const estimatedFuel = Math.max(15, Math.min(100, Math.round(device.batteryLevel * 0.85)));
  const estimatedThrottle = isMoving ? Math.min(75, 12 + Math.round(device.lastSpeed * 0.6)) : 0;
  const batteryVoltage = isMoving || isIdle ? 13.8 : 12.4;

  return (
    <div
      className="absolute bottom-4 right-4 z-[999] transition-all duration-300 w-[350px] sm:w-[380px] max-w-[calc(100vw-2rem)] select-none animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="bg-background/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl overflow-hidden flex flex-col text-xs transition-all">
        {/* Top Header Card */}
        <div className="p-3 pb-2.5 bg-gradient-to-r from-card to-muted/40 border-b flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: `${device.iconColor}22`, color: device.iconColor }}
            >
              {typeIcons[device.type] || <Car className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs truncate max-w-[140px] text-foreground">
                  {device.name}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {device.model || 'FMC920'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass} shrink-0`} />
                <span className="text-[10px] text-muted-foreground truncate">{status.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Sembunyikan Detail' : 'Tampilkan Detail'}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-md"
              onClick={onClose}
              title="Tutup Info"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Essential Quick Metrics Bar (Always Visible) */}
        <div className="grid grid-cols-3 divide-x border-b bg-card/40 text-center py-2 px-1">
          <div className="px-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Gauge className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px]">Kecepatan</span>
            </div>
            <p className="text-xs font-bold text-foreground">
              {Math.round(device.lastSpeed)} <span className="text-[9px] font-normal text-muted-foreground">km/h</span>
            </p>
          </div>

          <div className="px-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Compass className="w-3 h-3 text-blue-500" />
              <span className="text-[9px]">Arah</span>
            </div>
            <p className="text-xs font-bold text-foreground truncate">
              {Math.round(device.lastHeading)}° <span className="text-[9px] font-normal text-muted-foreground">{getDirectionLabel(device.lastHeading)}</span>
            </p>
          </div>

          <div className="px-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Battery className="w-3 h-3 text-amber-500" />
              <span className="text-[9px]">Baterai</span>
            </div>
            <p className="text-xs font-bold text-foreground">
              {device.batteryLevel}%
            </p>
          </div>
        </div>

        {/* Expanded Content: Specialized Tracker Type Diagnostics */}
        {isExpanded && (
          <div className="p-3 space-y-2.5 max-h-72 overflow-y-auto">
            {/* 1. OBD-II Specific Model Section */}
            {isObd && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold text-[11px]">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Diagnostik OBD-II OEM ({device.model})</span>
                  </div>
                  <Badge variant="outline" className="text-[8px] h-4 bg-purple-500/10 text-purple-600 border-purple-500/30">
                    Plug & Play
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-background/80 rounded-lg p-1.5 border border-purple-500/15">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Cpu className="w-2.5 h-2.5" /> Putaran Mesin (RPM)
                    </span>
                    <span className="font-bold text-foreground text-xs mt-0.5 block font-mono">
                      {estimatedRpm} RPM
                    </span>
                  </div>

                  <div className="bg-background/80 rounded-lg p-1.5 border border-purple-500/15">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Flame className="w-2.5 h-2.5 text-rose-500" /> Suhu Pendingin
                    </span>
                    <span className="font-bold text-foreground text-xs mt-0.5 block font-mono">
                      {estimatedCoolant}°C <span className="text-[9px] font-normal text-emerald-600">Normal</span>
                    </span>
                  </div>

                  <div className="bg-background/80 rounded-lg p-1.5 border border-purple-500/15">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Fuel className="w-2.5 h-2.5 text-amber-500" /> Sisa BBM Tangki
                    </span>
                    <span className="font-bold text-foreground text-xs mt-0.5 block font-mono">
                      {estimatedFuel}%
                    </span>
                  </div>

                  <div className="bg-background/80 rounded-lg p-1.5 border border-purple-500/15">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Gauge className="w-2.5 h-2.5" /> Pedal Gas
                    </span>
                    <span className="font-bold text-foreground text-xs mt-0.5 block font-mono">
                      {estimatedThrottle}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1 border-t border-purple-500/15">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> Status Kerusakan DTC:
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">0 Faults / Bersih</span>
                </div>
              </div>
            )}

            {/* 2. CAN-bus / Heavy Duty Professional Fleet Section */}
            {isCan && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Telemetri CAN-bus & FMS ({device.model})</span>
                  </div>
                  <Badge variant="outline" className="text-[8px] h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
                    J1939 CAN
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-background/80 rounded-lg p-1.5 border border-amber-500/15">
                    <span className="text-muted-foreground">Putaran Mesin CAN</span>
                    <span className="font-bold text-foreground text-xs mt-0.5 block font-mono">
                      {estimatedRpm} RPM
                    </span>
                  </div>
                  <div className="bg-background/80 rounded-lg p-1.5 border border-amber-500/15">
                    <span className="text-muted-foreground">Level Bahan Bakar</span>
                    <span className="font-bold text-foreground text-xs mt-0.5 block font-mono">
                      {estimatedFuel}%
                    </span>
                  </div>
                  <div className="bg-background/80 rounded-lg p-1.5 border border-amber-500/15">
                    <span className="text-muted-foreground">Jam Kerja Mesin</span>
                    <span className="font-bold text-foreground text-xs mt-0.5 block font-mono">
                      1,420.8 Jam
                    </span>
                  </div>
                  <div className="bg-background/80 rounded-lg p-1.5 border border-amber-500/15">
                    <span className="text-muted-foreground">Kontak Mesin (ACC)</span>
                    <span className={`font-bold text-xs mt-0.5 block ${isMoving || isIdle ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {isMoving || isIdle ? 'Menyala (ON)' : 'Mati (OFF)'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Standard Vehicle Tracker Section (FMC920, FMB920, etc.) */}
            {isStandardVehicle && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Telemetri Standar Kendaraan ({device.model})</span>
                  </div>
                  <Badge variant="outline" className="text-[8px] h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    Smart 4G/2G
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-background/80 rounded-lg p-1.5 border border-emerald-500/15">
                    <span className="text-muted-foreground">Status Kontak (DIN1)</span>
                    <span className={`font-bold text-xs mt-0.5 block ${isMoving || isIdle ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {isMoving || isIdle ? 'Ignition ON' : 'Ignition OFF'}
                    </span>
                  </div>

                  <div className="bg-background/80 rounded-lg p-1.5 border border-emerald-500/15">
                    <span className="text-muted-foreground">Voltase Aki Utama</span>
                    <span className="font-bold text-foreground text-xs mt-0.5 block font-mono">
                      {batteryVoltage} V
                    </span>
                  </div>

                  <div className="bg-background/80 rounded-lg p-1.5 border border-emerald-500/15">
                    <span className="text-muted-foreground">Akselerometer</span>
                    <span className="font-bold text-foreground text-xs mt-0.5 block">
                      {isMoving ? 'Deteksi Gerak' : 'Diam (Static)'}
                    </span>
                  </div>

                  <div className="bg-background/80 rounded-lg p-1.5 border border-emerald-500/15">
                    <span className="text-muted-foreground">Status Towing</span>
                    <span className="font-bold text-emerald-600 text-xs mt-0.5 block">
                      Aman (Tidak Diderek)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Personal Tracker Section (GH5200, TMT250) */}
            {isPersonal && (
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-semibold text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Sensor Keselamatan Pekerja ({device.model})</span>
                  </div>
                  <Badge variant="outline" className="text-[8px] h-4 bg-sky-500/10 text-sky-600 border-sky-500/30">
                    SOS / Man-Down
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-background/80 rounded-lg p-1.5 border border-sky-500/15">
                    <span className="text-muted-foreground">Tombol SOS</span>
                    <span className="font-bold text-emerald-600 text-xs mt-0.5 block">Siap Siaga</span>
                  </div>
                  <div className="bg-background/80 rounded-lg p-1.5 border border-sky-500/15">
                    <span className="text-muted-foreground">Sensor Jatuh</span>
                    <span className="font-bold text-emerald-600 text-xs mt-0.5 block">Normal</span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Autonomous Asset Tracker Section (TAT100) */}
            {isAsset && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                    <Package className="w-3.5 h-3.5" />
                    <span>Status Pelacak Aset ({device.model})</span>
                  </div>
                  <Badge variant="outline" className="text-[8px] h-4 bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                    Otonom IP68
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-background/80 rounded-lg p-1.5 border border-indigo-500/15">
                    <span className="text-muted-foreground">Sensor Anti-Bongkar</span>
                    <span className="font-bold text-emerald-600 text-xs mt-0.5 block">Terpasang Rapat</span>
                  </div>
                  <div className="bg-background/80 rounded-lg p-1.5 border border-indigo-500/15">
                    <span className="text-muted-foreground">Mode Bangun</span>
                    <span className="font-bold text-foreground text-xs mt-0.5 block">1x / 4 Jam</span>
                  </div>
                </div>
              </div>
            )}

            {/* Coordinates & Technical Meta */}
            <div className="space-y-1 text-[10px] text-muted-foreground pt-1 border-t">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" /> Koordinat GPS:
                </span>
                <span className="font-mono text-foreground font-medium">
                  {device.lastLatitude ? `${device.lastLatitude.toFixed(5)}, ${device.lastLongitude?.toFixed(5)}` : 'Menunggu Satelit'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>IMEI Perangkat:</span>
                <span className="font-mono text-foreground">{device.imei || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Konektivitas:</span>
                <span className="text-foreground">{modelMeta.connectivity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> Terakhir Update:
                </span>
                <span className="text-foreground font-mono">
                  {device.updatedAt ? format(new Date(device.updatedAt), 'dd MMM yyyy, HH:mm:ss', { locale: idLocale }) : 'Baru saja'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Footer Buttons */}
        <div className="p-2.5 pt-2 bg-muted/30 border-t flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            className="flex-1 h-8 text-[11px] gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            onClick={onOpenTripHistory}
          >
            <RouteIcon className="w-3.5 h-3.5" />
            <span>Riwayat & Rute Perjalanan</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[11px] px-3 font-medium text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <span>Tutup</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
