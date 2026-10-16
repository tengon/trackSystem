'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGPSStore } from '@/store/gps-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Activity,
  Radio,
  Search,
  RefreshCw,
  Clock,
  Navigation,
  Battery,
  Signal,
  MapPin,
  ExternalLink,
  Code,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Server,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface IngestionRecord {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  altitude: number;
  batteryLevel: number;
  accuracy: number;
  timestamp: string;
  isNew?: boolean;
  device?: {
    id: string;
    name: string;
    imei: string | null;
    type: string;
    status: string;
    iconColor: string;
  };
}

interface ServerStats {
  totalRecords: number;
  activeDevicesCount: number;
  totalDevices: number;
  latestTimestamp: string | null;
}

export default function ServerLogsPanel() {
  const devices = useGPSStore((s) => s.devices);
  const [records, setRecords] = useState<IngestionRecord[]>([]);
  const [stats, setStats] = useState<ServerStats>({
    totalRecords: 0,
    activeDevicesCount: 0,
    totalDevices: 0,
    latestTimestamp: null,
  });
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDevice, setFilterDevice] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<IngestionRecord | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch initial & polled server logs
  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const url = filterDevice !== 'all'
        ? `/api/server-logs?deviceId=${filterDevice}&limit=100`
        : '/api/server-logs?limit=100';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch server logs:', err);
    } finally {
      if (!silent) {
        setIsRefreshing(false);
        setLoading(false);
      }
    }
  }, [filterDevice]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Polling every 3 seconds if isLive is enabled
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive, fetchLogs]);

  // Filtered list
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const searchLower = search.toLowerCase();
      const matchSearch =
        !search ||
        (r.device?.name || '').toLowerCase().includes(searchLower) ||
        (r.device?.imei || '').toLowerCase().includes(searchLower) ||
        r.latitude.toString().includes(searchLower) ||
        r.longitude.toString().includes(searchLower);

      return matchSearch;
    });
  }, [records, search]);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' ' +
        d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    } catch {
      return ts;
    }
  };

  const getHeadingDirection = (heading: number) => {
    const directions = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];
    const idx = Math.round(((heading % 360) / 45)) % 8;
    return directions[idx];
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Data Masuk Server</h2>
            <Badge variant="outline" className="gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Telemetry Stream
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log real-time setiap paket koordinat dan telemetri yang diterima dari perangkat GPS
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setIsLive(!isLive);
              toast.info(isLive ? 'Streaming log dijeda' : 'Streaming log aktif kembali');
            }}
            className="gap-1.5 h-8 text-xs font-medium"
          >
            {isLive ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Jeda Stream
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Lanjutkan Stream
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(false)}
            disabled={isRefreshing}
            className="gap-1.5 h-8 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gateway Status */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Status Port Gateway</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">Port 5027 / 5028</span>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> TCP & UDP Listening
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Server className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Packets */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Total Paket Masuk</p>
              <p className="text-2xl font-bold tracking-tight">{stats.totalRecords.toLocaleString('id-ID')}</p>
              <p className="text-[10px] text-muted-foreground">Tersimpan di PostgreSQL</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Zap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Active Devices */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Perangkat Aktif</p>
              <p className="text-2xl font-bold tracking-tight">
                {stats.activeDevicesCount} <span className="text-xs font-normal text-muted-foreground">/ {stats.totalDevices} unit</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Terkoneksi ke server</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Last Packet Time */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Paket Terakhir Diterima</p>
              <p className="text-sm font-semibold truncate max-w-[160px]">
                {stats.latestTimestamp ? formatTime(stats.latestTimestamp) : 'Belum ada data'}
              </p>
              <p className="text-[10px] text-muted-foreground">Waktu server</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="bg-card border-border shadow-xs">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama, IMEI, atau koordinat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={filterDevice} onValueChange={setFilterDevice}>
                <SelectTrigger className="w-full sm:w-56 h-9 text-xs">
                  <SelectValue placeholder="Pilih Perangkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Perangkat</SelectItem>
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} {d.imei ? `(${d.imei.slice(-6)})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Ingestion Table */}
      <Card className="bg-card border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Waktu Diterima</th>
                <th className="py-3 px-4">Perangkat & IMEI</th>
                <th className="py-3 px-4">Koordinat GPS</th>
                <th className="py-3 px-4">Kecepatan & Arah</th>
                <th className="py-3 px-4">Status & Baterai</th>
                <th className="py-3 px-4">Ketinggian</th>
                <th className="py-3 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <p>Memuat log data masuk...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-muted-foreground/60" />
                      <p className="font-medium">Belum ada paket data masuk</p>
                      <p className="text-[11px] text-muted-foreground max-w-sm">
                        Pastikan GPS tracker sudah diarahkan ke Port 5027 (TCP) atau 5028 (UDP) dan memiliki sinyal satelit.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => {
                  const isOnline = r.speed > 0 || r.device?.status === 'online';
                  return (
                    <tr
                      key={r.id || idx}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-semibold">{formatTime(r.timestamp)}</span>
                        </div>
                      </td>

                      {/* Device & IMEI */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground truncate max-w-[160px]">
                            {r.device?.name || 'Perangkat GPS'}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            IMEI: {r.device?.imei || '-'}
                          </p>
                        </div>
                      </td>

                      {/* Coordinates */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <a
                            href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                            title="Buka di Google Maps"
                          >
                            <MapPin className="w-3 h-3 shrink-0" />
                            {r.latitude.toFixed(6)}, {r.longitude.toFixed(6)}
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                          <p className="text-[10px] text-muted-foreground">
                            Akurasi: ±{Math.round(r.accuracy || 10)}m
                          </p>
                        </div>
                      </td>

                      {/* Speed & Heading */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-semibold px-1.5 py-0.5 ${
                              r.speed > 5
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {Math.round(r.speed)} km/h
                          </Badge>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Navigation
                              className="w-2.5 h-2.5 transition-transform"
                              style={{ transform: `rotate(${r.heading}deg)` }}
                            />
                            {Math.round(r.heading)}° ({getHeadingDirection(r.heading)})
                          </p>
                        </div>
                      </td>

                      {/* Status & Battery */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`text-[9px] px-1.5 py-0 ${
                              isOnline
                                ? 'bg-emerald-500 text-white'
                                : 'bg-gray-400 text-white'
                            }`}
                          >
                            {isOnline ? 'Online' : 'Idle'}
                          </Badge>
                          <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground font-mono">
                            <Battery className="w-3.5 h-3.5 text-muted-foreground" />
                            {r.batteryLevel}%
                          </div>
                        </div>
                      </td>

                      {/* Altitude */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        {Math.round(r.altitude || 0)} m
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRecord(r)}
                          className="h-7 px-2 text-[11px] gap-1 hover:bg-muted"
                        >
                          <Code className="w-3 h-3" />
                          Detail
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Packet Detail Dialog */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Radio className="w-4 h-4 text-primary" />
                Detail Paket Data Telemetri
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Summary Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 border">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Perangkat</span>
                  <span className="font-semibold">{selectedRecord.device?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Nomor IMEI</span>
                  <span className="font-mono font-semibold">{selectedRecord.device?.imei || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Waktu Diterima</span>
                  <span className="font-mono font-semibold">{formatTime(selectedRecord.timestamp)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Latitude</span>
                  <span className="font-mono font-semibold">{selectedRecord.latitude}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Longitude</span>
                  <span className="font-mono font-semibold">{selectedRecord.longitude}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Kecepatan / Arah</span>
                  <span className="font-mono font-semibold">
                    {Math.round(selectedRecord.speed)} km/h · {Math.round(selectedRecord.heading)}°
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Baterai Cadangan</span>
                  <span className="font-mono font-semibold">{selectedRecord.batteryLevel}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Ketinggian (Altitude)</span>
                  <span className="font-mono font-semibold">{selectedRecord.altitude} m</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Estimasi Akurasi</span>
                  <span className="font-mono font-semibold">±{Math.round(selectedRecord.accuracy)} meter</span>
                </div>
              </div>

              {/* Raw JSON View */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                  Format JSON Database (LocationRecord):
                </p>
                <pre className="p-3 rounded-lg bg-slate-950 text-slate-100 font-mono text-[10px] overflow-x-auto max-h-56">
                  {JSON.stringify(selectedRecord, null, 2)}
                </pre>
              </div>

              {/* Action Link */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedRecord, null, 2));
                    toast.success('JSON berhasil disalin ke clipboard');
                  }}
                  className="h-8 text-xs"
                >
                  Salin JSON
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className="h-8 text-xs"
                >
                  <a
                    href={`https://www.google.com/maps?q=${selectedRecord.latitude},${selectedRecord.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buka Titik di Maps <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
