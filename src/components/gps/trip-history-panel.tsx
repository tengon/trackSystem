'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { useGPSStore } from '@/store/gps-store';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  MapPin,
  Calendar,
  Clock,
  Gauge,
  Navigation,
  Compass,
  BatteryMedium,
  CheckCircle2,
  AlertCircle,
  Truck,
  Layers,
  ChevronRight,
  Route as RouteIcon,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface TripPoint {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  altitude: number;
  batteryLevel: number;
  timestamp: string;
}

interface TripStop {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  latitude: number;
  longitude: number;
}

interface TripSegment {
  id: string;
  tripNumber: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  distanceKm: number;
  maxSpeed: number;
  avgSpeed: number;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  points: TripPoint[];
}

interface TripResponse {
  deviceId: string;
  from: string;
  to: string;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  movingDurationMinutes: number;
  stoppedDurationMinutes: number;
  maxSpeed: number;
  avgSpeed: number;
  trips: TripSegment[];
  stops: TripStop[];
  allPoints: TripPoint[];
}

export default function TripHistoryPanel() {
  const { devices, selectedDeviceId, selectDevice, currentUser } = useGPSStore();

  const [currentDeviceId, setCurrentDeviceId] = useState<string>(
    selectedDeviceId || (devices.length > 0 ? devices[0].id : '')
  );

  useEffect(() => {
    if ((!currentDeviceId || !devices.some((d) => d.id === currentDeviceId)) && devices.length > 0) {
      setCurrentDeviceId(devices[0].id);
    }
  }, [devices, currentDeviceId]);

  // Date filter state
  const [preset, setPreset] = useState<'today' | 'yesterday' | '3days' | '7days' | 'custom'>('today');
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [customTo, setCustomTo] = useState<string>(() => {
    return new Date().toISOString().slice(0, 16);
  });

  const [loading, setLoading] = useState(false);
  const [tripData, setTripData] = useState<TripResponse | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string>('all');

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2); // 1x, 2x, 5x, 10x, 20x
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [autoFollow, setAutoFollow] = useState(true);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const playbackTrailLayerRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const carMarkerRef = useRef<L.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(0);

  // Sync selected device from store
  useEffect(() => {
    if (selectedDeviceId && selectedDeviceId !== currentDeviceId) {
      setCurrentDeviceId(selectedDeviceId);
    }
  }, [selectedDeviceId, currentDeviceId]);

  // Compute active points depending on whether a single trip or "all" is selected
  const activePoints = (() => {
    if (!tripData) return [];
    if (selectedTripId === 'all') {
      return tripData.allPoints;
    }
    const segment = tripData.trips.find((t) => t.id === selectedTripId);
    return segment ? segment.points : tripData.allPoints;
  })();

  // Calculate Date bounds from preset
  const getDateRange = useCallback(() => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (preset === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      to = now;
    } else if (preset === 'yesterday') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    } else if (preset === '3days') {
      from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      to = now;
    } else if (preset === '7days') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      to = now;
    } else {
      from = new Date(customFrom);
      to = new Date(customTo);
    }
    return { from: from.toISOString(), to: to.toISOString() };
  }, [preset, customFrom, customTo]);

  // Fetch Trip Records
  const fetchTripData = useCallback(async () => {
    if (!currentDeviceId) return;
    setLoading(true);
    setIsPlaying(false);
    setCurrentIndex(0);

    const { from, to } = getDateRange();
    try {
      const res = await fetch(`/api/devices/${currentDeviceId}/trips?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!res.ok) throw new Error('Gagal memuat data perjalanan');
      const data: TripResponse = await res.json();
      setTripData(data);
      setSelectedTripId('all');

      if (data.allPoints.length === 0) {
        toast.info('Tidak ada riwayat perjalanan pada periode ini');
      } else {
        toast.success(`Ditemukan ${data.trips.length} perjalanan (${data.totalDistanceKm} km)`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [currentDeviceId, getDateRange]);

  // Trigger fetch when device or preset changes
  useEffect(() => {
    if (currentDeviceId) {
      fetchTripData();
    }
  }, [currentDeviceId, preset, fetchTripData]);

  const [simulating, setSimulating] = useState(false);

  const handleSimulateRoute = async () => {
    if (!currentDeviceId) return;
    setSimulating(true);
    try {
      const res = await fetch(`/api/devices/${currentDeviceId}/trips/simulate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Gagal membuat rute simulasi');
      const data = await res.json();
      toast.success(data.message || 'Berhasil membuat rute perjalanan.');
      await fetchTripData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setSimulating(false);
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const dev = devices.find((d) => d.id === currentDeviceId);
    const initialCenter: [number, number] =
      dev && dev.lastLatitude && dev.lastLongitude
        ? [dev.lastLatitude, dev.lastLongitude]
        : [-6.2088, 106.8456];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    mapRef.current = map;

    // Trigger multiple invalidateSize to ensure full map render across layout phases
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [devices.length, currentDeviceId]);

  // Update Map Route, Markers, and Bounds when activePoints change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous layers
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (playbackTrailLayerRef.current) {
      map.removeLayer(playbackTrailLayerRef.current);
      playbackTrailLayerRef.current = null;
    }
    if (startMarkerRef.current) {
      map.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      map.removeLayer(endMarkerRef.current);
      endMarkerRef.current = null;
    }
    if (carMarkerRef.current) {
      map.removeLayer(carMarkerRef.current);
      carMarkerRef.current = null;
    }
    stopMarkersRef.current.forEach((m) => map.removeLayer(m));
    stopMarkersRef.current = [];

    if (activePoints.length === 0) return;

    const latLngs = activePoints.map((p) => [p.lat, p.lng] as [number, number]);

    // 1. Draw full route polyline
    const fullRoute = L.polyline(latLngs, {
      color: '#2563eb',
      weight: 5,
      opacity: 0.65,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    routeLayerRef.current = fullRoute;

    // 2. Trail polyline for playback progress (colored bright emerald)
    const trail = L.polyline([], {
      color: '#10b981',
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
    }).addTo(map);
    playbackTrailLayerRef.current = trail;

    // 3. Start Marker (Green Pin with Start Flag)
    const startPoint = activePoints[0];
    const startIcon = L.divIcon({
      className: 'start-flag-marker',
      html: `
        <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
          <div style="background: #16a34a; color: #fff; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); white-space: nowrap;">
            START
          </div>
          <div style="font-size: 20px; line-height: 1;">🟢</div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    const startMarker = L.marker([startPoint.lat, startPoint.lng], { icon: startIcon }).addTo(map);
    startMarker.bindPopup(`<b>Titik Awal</b><br/>Waktu: ${new Date(startPoint.timestamp).toLocaleString('id-ID')}`);
    startMarkerRef.current = startMarker;

    // 4. End Marker (Red Pin with Finish Flag)
    const endPoint = activePoints[activePoints.length - 1];
    const endIcon = L.divIcon({
      className: 'end-flag-marker',
      html: `
        <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
          <div style="background: #dc2626; color: #fff; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); white-space: nowrap;">
            FINISH
          </div>
          <div style="font-size: 20px; line-height: 1;">🏁</div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    const endMarker = L.marker([endPoint.lat, endPoint.lng], { icon: endIcon }).addTo(map);
    endMarker.bindPopup(`<b>Titik Akhir</b><br/>Waktu: ${new Date(endPoint.timestamp).toLocaleString('id-ID')}`);
    endMarkerRef.current = endMarker;

    // 5. Parking / Stop Markers
    if (tripData?.stops && selectedTripId === 'all') {
      tripData.stops.forEach((stop, idx) => {
        const stopIcon = L.divIcon({
          className: 'stop-marker',
          html: `
            <div style="transform: translate(-50%, -50%);">
              <div style="background: #f59e0b; color: #ffffff; font-weight: 800; font-size: 11px; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.4); border: 2px solid white;">
                P
              </div>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        const stopMarker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon }).addTo(map);
        stopMarker.bindPopup(`
          <div style="font-size: 12px; font-family: system-ui;">
            <b style="color: #d97706;">🅿️ Parkir #${idx + 1}</b><br/>
            <b>Durasi:</b> ${stop.durationMinutes} menit<br/>
            <b>Mulai:</b> ${new Date(stop.startTime).toLocaleTimeString('id-ID')}<br/>
            <b>Selesai:</b> ${new Date(stop.endTime).toLocaleTimeString('id-ID')}
          </div>
        `);
        stopMarkersRef.current.push(stopMarker);
      });
    }

    // 6. Animated Car Marker
    const carIcon = L.divIcon({
      className: 'animated-car-marker',
      html: `
        <div id="playback-car" style="transform: translate(-50%, -50%); cursor: pointer; user-select: none;">
          <div style="
            background: #1e293b;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            margin-bottom: 3px;
            white-space: nowrap;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            text-align: center;
          " id="playback-car-badge">
            ${startPoint.speed} km/h
          </div>
          <div id="playback-car-icon" style="font-size: 28px; line-height: 1; transform: rotate(${startPoint.heading}deg); transition: transform 0.15s ease-out; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.4));">
            🚗
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    const carMarker = L.marker([startPoint.lat, startPoint.lng], { icon: carIcon, zIndexOffset: 1000 }).addTo(map);
    carMarkerRef.current = carMarker;

    // Zoom and center to route
    map.fitBounds(fullRoute.getBounds(), { padding: [50, 50], maxZoom: 16 });
  }, [activePoints, tripData, selectedTripId]);

  // Update vehicle position when currentIndex changes
  useEffect(() => {
    if (activePoints.length === 0 || !carMarkerRef.current) return;
    const pt = activePoints[currentIndex] || activePoints[0];

    carMarkerRef.current.setLatLng([pt.lat, pt.lng]);

    // Update car badge speed & rotation
    const badge = document.getElementById('playback-car-badge');
    if (badge) badge.innerText = `${Math.round(pt.speed)} km/h`;
    const icon = document.getElementById('playback-car-icon');
    if (icon) icon.style.transform = `rotate(${pt.heading}deg)`;

    // Update trail
    if (playbackTrailLayerRef.current) {
      const trailPoints = activePoints.slice(0, currentIndex + 1).map((p) => [p.lat, p.lng] as [number, number]);
      playbackTrailLayerRef.current.setLatLngs(trailPoints);
    }

    // Auto-follow map pan
    if (autoFollow && mapRef.current) {
      mapRef.current.panTo([pt.lat, pt.lng], { animate: true, duration: 0.2 });
    }
  }, [currentIndex, activePoints, autoFollow]);

  // Playback Animation Loop
  useEffect(() => {
    if (!isPlaying || activePoints.length <= 1) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const intervalMs = Math.max(25, 400 / playbackSpeed);

    const loop = (timestamp: number) => {
      if (timestamp - lastTickTimeRef.current >= intervalMs) {
        lastTickTimeRef.current = timestamp;
        setCurrentIndex((prev) => {
          if (prev >= activePoints.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    lastTickTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, activePoints.length]);

  const currentPoint = activePoints[currentIndex] || activePoints[0];

  const handlePlayPause = () => {
    if (activePoints.length === 0) return;
    if (currentIndex >= activePoints.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const handleSelectTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setIsPlaying(false);
    setCurrentIndex(0);
  };


  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* 1. Header Filter Bar */}
      <div className="p-3 border-b bg-card/60 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Device Selector */}
          <div className="w-52">
            <Select
              value={currentDeviceId}
              onValueChange={(val) => {
                setCurrentDeviceId(val);
                selectDevice(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Pilih Kendaraan" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    🚗 {d.name} ({d.imei || 'No IMEI'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            {(
              [
                { id: 'today', label: 'Hari Ini' },
                { id: 'yesterday', label: 'Kemarin' },
                { id: '3days', label: '3 Hari' },
                { id: '7days', label: '7 Hari' },
                { id: 'custom', label: 'Kustom' },
              ] as const
            ).map((p) => (
              <Button
                key={p.id}
                variant={preset === p.id ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setPreset(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {preset === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs">
              <input
                type="datetime-local"
                className="h-8 px-2 rounded-md border text-xs bg-background"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className="text-muted-foreground">-</span>
              <input
                type="datetime-local"
                className="h-8 px-2 rounded-md border text-xs bg-background"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
              <Button size="sm" className="h-8 text-xs" onClick={fetchTripData}>
                Terapkan
              </Button>
            </div>
          )}
        </div>

        {/* TimescaleDB Status Tag & Refresh */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 gap-1 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
            TimescaleDB Hypertable
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={fetchTripData}
            disabled={loading}
          >
            <Calendar className="w-3.5 h-3.5" />
            {loading ? 'Memuat...' : 'Muat Ulang'}
          </Button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      {tripData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-muted/20 border-b shrink-0 text-xs">
          <div className="bg-card border rounded-lg p-2.5 flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <RouteIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">Total Jarak</p>
              <p className="text-sm font-bold text-foreground leading-tight">{tripData.totalDistanceKm} km</p>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-2.5 flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">Waktu Bergerak</p>
              <p className="text-sm font-bold text-foreground leading-tight">
                {Math.floor(tripData.movingDurationMinutes / 60)}j {tripData.movingDurationMinutes % 60}m
              </p>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-2.5 flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">Waktu Parkir</p>
              <p className="text-sm font-bold text-foreground leading-tight">
                {Math.floor(tripData.stoppedDurationMinutes / 60)}j {tripData.stoppedDurationMinutes % 60}m
              </p>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-2.5 flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">Kecepatan Maks</p>
              <p className="text-sm font-bold text-foreground leading-tight">{tripData.maxSpeed} km/h</p>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-2.5 flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">Kecepatan Rata2</p>
              <p className="text-sm font-bold text-foreground leading-tight">{tripData.avgSpeed} km/h</p>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-2.5 flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground leading-tight">Jml Perjalanan</p>
              <p className="text-sm font-bold text-foreground leading-tight">{tripData.trips.length} trip</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Body: Split Sidebar & Interactive Map */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Left Drawer: Trip Segments & Stops */}
        <div className="w-full md:w-80 border-r bg-background flex flex-col shrink-0 h-64 md:h-full z-10 shadow-sm">
          <Tabs defaultValue="trips" className="flex-1 flex flex-col">
            <div className="p-2 border-b shrink-0">
              <TabsList className="w-full h-8">
                <TabsTrigger value="trips" className="flex-1 text-xs h-7">
                  Perjalanan ({tripData?.trips.length || 0})
                </TabsTrigger>
                <TabsTrigger value="stops" className="flex-1 text-xs h-7">
                  Parkir ({tripData?.stops.length || 0})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Trips List */}
            <TabsContent value="trips" className="flex-1 overflow-y-auto p-2 space-y-2 m-0">
              <div
                onClick={() => handleSelectTrip('all')}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  selectedTripId === 'all'
                    ? 'bg-primary/10 border-primary text-primary font-medium shadow-sm'
                    : 'hover:bg-muted/50 border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Semua Rute Periode Ini</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {tripData?.allPoints.length || 0} Titik
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Jarak Total: {tripData?.totalDistanceKm || 0} km · {tripData?.trips.length || 0} Perjalanan
                </p>
              </div>

              {tripData?.trips.map((trip) => {
                const isSelected = selectedTripId === trip.id;
                const startTimeStr = new Date(trip.startTime).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const endTimeStr = new Date(trip.endTime).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={trip.id}
                    onClick={() => handleSelectTrip(trip.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500 text-foreground font-medium shadow-sm'
                        : 'hover:bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        🚗 Trip #{trip.tripNumber}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {startTimeStr} - {endTimeStr}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 mt-2 text-[11px] text-muted-foreground">
                      <div>
                        Jarak: <span className="font-medium text-foreground">{trip.distanceKm} km</span>
                      </div>
                      <div>
                        Durasi: <span className="font-medium text-foreground">{trip.durationMinutes} m</span>
                      </div>
                      <div>
                        Avg: <span className="font-medium text-foreground">{trip.avgSpeed} km/h</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {(!tripData || tripData.trips.length === 0) && !loading && (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Belum ada segmen perjalanan pada rentang waktu ini.
                </div>
              )}
            </TabsContent>

            {/* Stops / Parking List */}
            <TabsContent value="stops" className="flex-1 overflow-y-auto p-2 space-y-2 m-0">
              {tripData?.stops.map((stop, idx) => (
                <div
                  key={stop.id}
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.setView([stop.latitude, stop.longitude], 16, { animate: true });
                    }
                  }}
                  className="p-2.5 rounded-lg border text-xs cursor-pointer hover:bg-muted/50 border-border"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      🅿️ Parkir #{idx + 1}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                      {stop.durationMinutes} menit
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(stop.startTime).toLocaleTimeString('id-ID')} - {new Date(stop.endTime).toLocaleTimeString('id-ID')}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                  </p>
                </div>
              ))}

              {(!tripData || tripData.stops.length === 0) && !loading && (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50 text-emerald-500" />
                  Tidak ada pemberhentian lebih dari 3 menit.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Center / Right: Leaflet Map & HUD Playback Control */}
        <div className="flex-1 relative w-full h-full min-h-[400px]">
          {/* Leaflet Map Container */}
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

          {/* Notice when no devices assigned */}
          {devices.length === 0 && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center p-4 bg-background/50 backdrop-blur-[2px] pointer-events-none">
              <div className="max-w-md bg-card/95 border shadow-xl rounded-2xl p-6 text-center pointer-events-auto space-y-3.5">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <RouteIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Tidak Ada Kendaraan Ditugaskan</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Secara default semua perangkat GPS adalah milik <strong>Superuser / Admin</strong>. Riwayat perjalanan dan pergerakan hanya dapat dilihat untuk kendaraan yang ditugaskan ke akun Anda.
                  </p>
                </div>
                <div className="text-[11px] text-muted-foreground/80 bg-muted/40 rounded-lg py-2 px-3 border border-dashed">
                  Silakan hubungi Administrator untuk menambahkan tugas / unit kendaraan.
                </div>
              </div>
            </div>
          )}

          {/* Map Top Status Pill */}
          <div className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md border flex items-center gap-2 text-xs">
            <RouteIcon className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium">
              {activePoints.length > 0
                ? `Rute: ${activePoints.length} Titik · ${tripData?.totalDistanceKm || 0} km`
                : 'Peta Riwayat Perjalanan'}
            </span>
          </div>

          {/* Empty State Overlay with Simulate Button */}
          {activePoints.length === 0 && !loading && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center p-4 bg-background/40 backdrop-blur-[2px] pointer-events-none">
              <div className="bg-background/95 border shadow-xl rounded-2xl p-6 max-w-sm text-center pointer-events-auto space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
                  <RouteIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Belum Ada Rute Pada Periode Ini</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Kendaraan ini belum memiliki rekaman koordinat perjalanan untuk filter tanggal yang dipilih.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="w-full gap-2 text-xs font-medium shadow-sm"
                  onClick={handleSimulateRoute}
                  disabled={simulating}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {simulating ? 'Menghasilkan Rute...' : 'Simulasikan Rute Perjalanan'}
                </Button>
              </div>
            </div>
          )}

          {/* Floating Playback Control HUD at the bottom */}
          {activePoints.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 md:left-8 md:right-8 z-[1000] bg-background/95 backdrop-blur-md border rounded-xl p-3 shadow-xl">
              <div className="flex flex-col gap-2.5">
                {/* 1. Time Slider & Scrubber */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-muted-foreground w-12 shrink-0">
                    {currentPoint ? new Date(currentPoint.timestamp).toLocaleTimeString('id-ID') : '--:--'}
                  </span>
                  <Slider
                    value={[currentIndex]}
                    min={0}
                    max={Math.max(0, activePoints.length - 1)}
                    step={1}
                    onValueChange={(val) => {
                      setIsPlaying(false);
                      setCurrentIndex(val[0]);
                    }}
                    className="flex-1 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                    {currentIndex + 1} / {activePoints.length}
                  </span>
                </div>

                {/* 2. Controls and Telemetry Info */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t">
                  {/* Left Controls: Play/Pause, Reset, Speed Multipliers */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={isPlaying ? 'default' : 'outline'}
                      className="h-8 w-8 p-0"
                      onClick={handlePlayPause}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </Button>

                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleReset}>
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>

                    <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md ml-1">
                      {[1, 2, 5, 10, 20].map((s) => (
                        <button
                          key={s}
                          onClick={() => setPlaybackSpeed(s)}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            playbackSpeed === s
                              ? 'bg-background shadow-xs text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      variant={autoFollow ? 'secondary' : 'ghost'}
                      className="h-7 text-[10px] px-2 ml-1"
                      onClick={() => setAutoFollow(!autoFollow)}
                    >
                      {autoFollow ? '🎯 Ikuti Mobil' : 'Bebas'}
                    </Button>
                  </div>

                  {/* Right Telemetry Telemetry Overlay */}
                  {currentPoint && (
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Gauge className="w-3.5 h-3.5" />
                        <span className="font-bold">{Math.round(currentPoint.speed)} km/h</span>
                      </div>

                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Compass className="w-3.5 h-3.5" />
                        <span>{Math.round(currentPoint.heading)}°</span>
                      </div>

                      <div className="flex items-center gap-1 text-muted-foreground">
                        <BatteryMedium className="w-3.5 h-3.5" />
                        <span>{currentPoint.batteryLevel}%</span>
                      </div>

                      <div className="hidden sm:inline text-[10px] text-muted-foreground font-mono">
                        {currentPoint.lat.toFixed(5)}, {currentPoint.lng.toFixed(5)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
