'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { useGPSStore } from '@/store/gps-store';
import {
  Navigation,
  MapPin,
  Car,
  Truck,
  Bike,
  ArrowUpDown,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  Fuel,
  Compass,
  Layers,
  ChevronRight,
  Send,
  Milestone,
  CornerUpRight,
  CornerUpLeft,
  MoveUp,
  CircleDot,
  Check,
  Search,
  Loader2,
  X,
  Plus,
  Trash2,
  Flag,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface RoutePoint {
  lat: number;
  lng: number;
}

interface GeocodeItem {
  id: string;
  title: string;
  display_name: string;
  lat: number;
  lng: number;
  type: string;
}

interface RouteStep {
  instruction: string;
  distanceKm: number;
  durationSec: number;
  type: 'straight' | 'right' | 'left' | 'arrive' | 'depart';
}

interface WaypointItem {
  id: string;
  name: string;
  coord: RoutePoint;
}

interface RouteResult {
  points: RoutePoint[];
  distanceKm: number;
  durationMinutes: number;
  estimatedFuelLiters: number;
  steps: RouteStep[];
  originName: string;
  destName: string;
}

// Preset locations in Jabodetabek area for quick testing
const PRESET_LOCATIONS = [
  { name: 'Gudang Pusat Cengkareng', lat: -6.1528, lng: 106.7231 },
  { name: 'Pelabuhan Tanjung Priok', lat: -6.1042, lng: 106.8827 },
  { name: 'Monas (Pusat Jakarta)', lat: -6.1754, lng: 106.8272 },
  { name: 'Bandara Soekarno-Hatta', lat: -6.1275, lng: 106.6537 },
  { name: 'Kawasan Industri Pulogadung', lat: -6.1952, lng: 106.9142 },
  { name: 'Depo Logistik Bekasi', lat: -6.2383, lng: 106.9756 },
  { name: 'Hub Distribusi Cibubur', lat: -6.3721, lng: 106.8962 },
  { name: 'Rest Area KM 19 Tol Cikampek', lat: -6.2625, lng: 107.0381 },
];

export default function RoutePlanningPanel() {
  const { devices, geofences, markers, pendingRouteTarget, setPendingRouteTarget } = useGPSStore();

  // Origin & Destination state
  const [originText, setOriginText] = useState('Gudang Pusat Cengkareng');
  const [originCoord, setOriginCoord] = useState<RoutePoint>({ lat: -6.1528, lng: 106.7231 });
  const [originSuggestions, setOriginSuggestions] = useState<GeocodeItem[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);

  // Waypoints (Titik-Titik Penanda Singgah)
  const [waypoints, setWaypoints] = useState<WaypointItem[]>([]);
  const waypointMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const savedMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const [showSavedMarkers, setShowSavedMarkers] = useState(true);

  const [destText, setDestText] = useState('Pelabuhan Tanjung Priok');
  const [destCoord, setDestCoord] = useState<RoutePoint>({ lat: -6.1042, lng: 106.8827 });
  const [destSuggestions, setDestSuggestions] = useState<GeocodeItem[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // Map click selection mode
  const [clickMode, setClickMode] = useState<'none' | 'origin' | 'dest' | 'waypoint'>('none');

  // Vehicle transport profile
  const [vehicleProfile, setVehicleProfile] = useState<'car' | 'truck' | 'bike'>('truck');

  // Route calculation state
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1);
  const simRef = useRef<NodeJS.Timeout | null>(null);

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeShadowRef = useRef<L.Polyline | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const simMarkerRef = useRef<L.Marker | null>(null);
  const devicesLayerRef = useRef<L.LayerGroup | null>(null);

  // Tile layer style
  const [tileMode, setTileMode] = useState<'street' | 'satellite'>('street');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-6.1754, 106.8272],
      zoom: 11,
      zoomControl: true,
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });
    streetLayer.addTo(map);
    tileLayerRef.current = streetLayer;

    // Devices layer
    const devicesLayer = L.layerGroup().addTo(map);
    devicesLayerRef.current = devicesLayer;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const newLayer = tileMode === 'street'
      ? L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
      : L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18 });
    newLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [tileMode]);

  // Sync with pendingRouteTarget from other panels (e.g. clicking Rute in MarkersPanel or MapView)
  useEffect(() => {
    if (pendingRouteTarget) {
      setDestText(pendingRouteTarget.name);
      const newDest = { lat: pendingRouteTarget.lat, lng: pendingRouteTarget.lng };
      setDestCoord(newDest);
      setPendingRouteTarget(null);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([newDest.lat, newDest.lng], 13, { duration: 1 });
      }
      toast.success(`Titik Tujuan diset ke: ${pendingRouteTarget.name}`);
      calculateRoute(undefined, newDest);
    }
  }, [pendingRouteTarget, setPendingRouteTarget]);

  // Handle map click for choosing Origin, Destination, or intermediate Waypoint with Reverse Geocoding
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (clickMode === 'origin') {
        const newOrig = { lat, lng };
        setOriginCoord(newOrig);
        setClickMode('none');
        setOriginText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        toast.success('Titik Asal dipilih dari peta, mencari nama lokasi...');
        calculateRoute(newOrig, undefined);
        try {
          const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data.name || data.display_name) {
              setOriginText(data.name || data.display_name.split(',')[0]);
            }
          }
        } catch {
          // keep coords
        }
      } else if (clickMode === 'dest') {
        const newDest = { lat, lng };
        setDestCoord(newDest);
        setClickMode('none');
        setDestText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        toast.success('Titik Tujuan dipilih dari peta, mencari nama lokasi...');
        calculateRoute(undefined, newDest);
        try {
          const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data.name || data.display_name) {
              setDestText(data.name || data.display_name.split(',')[0]);
            }
          }
        } catch {
          // keep coords
        }
      } else if (clickMode === 'waypoint') {
        setClickMode('none');
        const wpIdx = waypoints.length + 1;
        const newWp: WaypointItem = {
          id: 'wp-' + Date.now(),
          name: `Titik Penanda #${wpIdx} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          coord: { lat, lng },
        };
        const updatedWps = [...waypoints, newWp];
        setWaypoints(updatedWps);
        toast.success(`Titik Penanda #${wpIdx} ditambahkan dari peta`);
        calculateRoute(undefined, undefined, updatedWps);
        fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && (data.name || data.display_name)) {
              const name = data.name || data.display_name.split(',')[0];
              setWaypoints((prev) => prev.map((w) => (w.id === newWp.id ? { ...w, name } : w)));
            }
          })
          .catch(() => {});
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [clickMode, waypoints]);

  // Debounced search for Origin address via OpenStreetMap Nominatim
  const searchOrigin = useCallback((query: string) => {
    if (!query || query.trim().length < 3) {
      setOriginSuggestions([]);
      setShowOriginDropdown(false);
      return;
    }
    setIsSearchingOrigin(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setOriginSuggestions(Array.isArray(data) ? data : []);
          setShowOriginDropdown(true);
        }
      } catch {
        setOriginSuggestions([]);
      } finally {
        setIsSearchingOrigin(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  // Debounced search for Destination address via OpenStreetMap Nominatim
  const searchDest = useCallback((query: string) => {
    if (!query || query.trim().length < 3) {
      setDestSuggestions([]);
      setShowDestDropdown(false);
      return;
    }
    setIsSearchingDest(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setDestSuggestions(Array.isArray(data) ? data : []);
          setShowDestDropdown(true);
        }
      } catch {
        setDestSuggestions([]);
      } finally {
        setIsSearchingDest(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  // Render Origin and Destination markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Origin Marker
    if (originMarkerRef.current) map.removeLayer(originMarkerRef.current);
    if (originCoord) {
      const originIcon = L.divIcon({
        className: 'origin-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%);">
            <div style="background:#10b981; color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:12px; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.3); border:1px solid #fff; margin-bottom:2px;">
              A (Asal)
            </div>
            <div style="width:24px; height:24px; background:#10b981; border:3px solid #fff; border-radius:50%; box-shadow:0 3px 8px rgba(16,185,129,0.5); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:11px;">
              A
            </div>
          </div>
        `,
        iconSize: [30, 50],
        iconAnchor: [15, 50],
      });
      const marker = L.marker([originCoord.lat, originCoord.lng], { icon: originIcon }).addTo(map);
      marker.bindPopup(`<b>Titik Asal:</b><br/>${originText}`);
      originMarkerRef.current = marker;
    }

    // Destination Marker
    if (destMarkerRef.current) map.removeLayer(destMarkerRef.current);
    if (destCoord) {
      const destIcon = L.divIcon({
        className: 'dest-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%);">
            <div style="background:#ef4444; color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:12px; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.3); border:1px solid #fff; margin-bottom:2px;">
              B (Tujuan)
            </div>
            <div style="width:24px; height:24px; background:#ef4444; border:3px solid #fff; border-radius:50%; box-shadow:0 3px 8px rgba(239,68,68,0.5); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:11px;">
              B
            </div>
          </div>
        `,
        iconSize: [30, 50],
        iconAnchor: [15, 50],
      });
      const marker = L.marker([destCoord.lat, destCoord.lng], { icon: destIcon }).addTo(map);
      marker.bindPopup(`<b>Titik Tujuan:</b><br/>${destText}`);
      destMarkerRef.current = marker;
    }
  }, [originCoord, destCoord, originText, destText]);

  // Render Waypoint Markers on Route Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    waypointMarkersRef.current.forEach((m) => map.removeLayer(m));
    waypointMarkersRef.current.clear();

    waypoints.forEach((wp, idx) => {
      const wpIcon = L.divIcon({
        className: 'route-waypoint-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%);">
            <div style="background:#f59e0b; color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:12px; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.3); border:1px solid #fff; margin-bottom:2px;">
              P${idx + 1}: ${wp.name}
            </div>
            <div style="width:24px; height:24px; background:#f59e0b; border:3px solid #fff; border-radius:50%; box-shadow:0 3px 8px rgba(245,158,11,0.5); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:11px;">
              ${idx + 1}
            </div>
          </div>
        `,
        iconSize: [30, 50],
        iconAnchor: [15, 50],
      });
      const m = L.marker([wp.coord.lat, wp.coord.lng], { icon: wpIcon }).addTo(map);
      m.bindPopup(`<b>Titik Penanda #${idx + 1}:</b><br/>${wp.name}`);
      waypointMarkersRef.current.set(wp.id, m);
    });
  }, [waypoints]);

  // Render Saved Database Markers on Route Map with interactive actions
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!savedMarkersLayerRef.current) {
      savedMarkersLayerRef.current = L.layerGroup().addTo(map);
    }
    savedMarkersLayerRef.current.clearLayers();

    if (!showSavedMarkers) return;

    markers.forEach((m) => {
      const markerIcon = L.divIcon({
        className: 'route-saved-map-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%); cursor:pointer;">
            <div style="background:${m.color}; color:#fff; font-size:9px; font-weight:700; padding:1px 6px; border-radius:10px; white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,0.3); border:1px solid #fff;">
              ${m.name}
            </div>
            <div style="width:26px; height:26px; background:#ffffff; border:2.5px solid ${m.color}; border-radius:50%; box-shadow:0 3px 8px rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; font-size:14px;">
              ${m.icon || '📍'}
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -30],
      });

      const leafletMarker = L.marker([m.latitude, m.longitude], { icon: markerIcon });
      leafletMarker.bindPopup(`
        <div style="font-family:system-ui; min-width:170px; font-size:11px; padding:2px;">
          <div style="font-weight:700; font-size:12px; margin-bottom:2px; display:flex; align-items:center; gap:4px;">
            <span>${m.icon || '📍'}</span> <span>${m.name}</span>
          </div>
          ${m.description ? `<p style="color:#64748b; font-size:10px; margin-bottom:6px;">${m.description}</p>` : ''}
          <div style="display:flex; flex-direction:column; gap:4px; margin-top:6px; border-top:1px solid #e2e8f0; padding-top:6px;">
            <button id="rt-set-orig-${m.id}" style="text-align:left; background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; border-radius:4px; padding:3px 6px; font-size:10px; cursor:pointer; font-weight:600;">
              🟢 Jadikan Titik Asal
            </button>
            <button id="rt-add-wp-${m.id}" style="text-align:left; background:#fffbeb; color:#d97706; border:1px solid #fde68a; border-radius:4px; padding:3px 6px; font-size:10px; cursor:pointer; font-weight:600;">
              🚩 Tambah Titik Penanda (Singgah)
            </button>
            <button id="rt-set-dest-${m.id}" style="text-align:left; background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:4px; padding:3px 6px; font-size:10px; cursor:pointer; font-weight:600;">
              🔴 Jadikan Titik Tujuan
            </button>
          </div>
        </div>
      `);

      leafletMarker.on('popupopen', () => {
        const origBtn = document.getElementById(`rt-set-orig-${m.id}`);
        if (origBtn) origBtn.onclick = () => {
          setOriginCoord({ lat: m.latitude, lng: m.longitude });
          setOriginText(m.name);
          calculateRoute({ lat: m.latitude, lng: m.longitude }, undefined);
          toast.success(`Titik Asal diset ke: ${m.name}`);
        };
        const wpBtn = document.getElementById(`rt-add-wp-${m.id}`);
        if (wpBtn) wpBtn.onclick = () => {
          const newWp: WaypointItem = {
            id: 'wp-' + Date.now(),
            name: m.name,
            coord: { lat: m.latitude, lng: m.longitude },
          };
          const updatedWps = [...waypoints, newWp];
          setWaypoints(updatedWps);
          calculateRoute(undefined, undefined, updatedWps);
          toast.success(`Titik Penanda "${m.name}" ditambahkan`);
        };
        const destBtn = document.getElementById(`rt-set-dest-${m.id}`);
        if (destBtn) destBtn.onclick = () => {
          setDestCoord({ lat: m.latitude, lng: m.longitude });
          setDestText(m.name);
          calculateRoute(undefined, { lat: m.latitude, lng: m.longitude });
          toast.success(`Titik Tujuan diset ke: ${m.name}`);
        };
      });

      savedMarkersLayerRef.current?.addLayer(leafletMarker);
    });
  }, [markers, showSavedMarkers, waypoints]);

  // Render Fleet Devices on Map as context
  useEffect(() => {
    const layer = devicesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    devices.forEach((device) => {
      if (device.lastLatitude && device.lastLongitude) {
        const icon = L.divIcon({
          className: 'fleet-device-marker',
          html: `
            <div style="display:flex; flex-direction:column; align-items:center; transform:translate(-50%, -100%); opacity:0.85;">
              <div style="background:#1e293b; color:#cbd5e1; font-size:9px; font-weight:600; padding:1px 6px; border-radius:4px; white-space:nowrap; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
                ${device.name}
              </div>
              <div style="width:14px; height:14px; background:${device.status === 'online' ? '#10b981' : '#f59e0b'}; border:2px solid #fff; border-radius:50%; margin-top:1px;"></div>
            </div>
          `,
          iconSize: [20, 30],
          iconAnchor: [10, 30],
        });
        const m = L.marker([device.lastLatitude, device.lastLongitude], { icon });
        m.bindPopup(`<b>${device.name}</b><br/>Status: ${device.status}<br/>Kecepatan: ${device.lastSpeed} km/h`);
        layer.addLayer(m);
      }
    });
  }, [devices]);

  // Swap Origin and Destination
  const handleSwap = () => {
    const tempText = originText;
    const tempCoord = originCoord;
    setOriginText(destText);
    setOriginCoord(destCoord);
    setDestText(tempText);
    setDestCoord(tempCoord);
    setRouteResult(null);
  };

  // Select Device as Origin
  const handleSelectDeviceAsOrigin = (deviceId: string) => {
    const dev = devices.find((d) => d.id === deviceId);
    if (dev && dev.lastLatitude && dev.lastLongitude) {
      setOriginCoord({ lat: dev.lastLatitude, lng: dev.lastLongitude });
      setOriginText(`${dev.name} (Posisi Terkini)`);
      toast.success(`Titik Asal diset ke posisi ${dev.name}`);
    } else {
      toast.error('Perangkat belum memiliki koordinat GPS yang valid');
    }
  };

  // Select Geofence as Destination
  const handleSelectGeofenceAsDest = (geofenceId: string) => {
    const geo = geofences.find((g) => g.id === geofenceId);
    if (geo) {
      setDestCoord({ lat: geo.latitude, lng: geo.longitude });
      setDestText(`Geofence: ${geo.name}`);
      toast.success(`Titik Tujuan diset ke Geofence ${geo.name}`);
    }
  };

  // Calculate Route via OSRM with smart Fallback supporting multiple waypoints
  const calculateRoute = async (
    customOrigin?: RoutePoint,
    customDest?: RoutePoint,
    customWaypoints?: WaypointItem[]
  ) => {
    const orig = customOrigin || originCoord;
    const dest = customDest || destCoord;
    const wps = customWaypoints !== undefined ? customWaypoints : waypoints;

    if (!orig || !dest) {
      toast.error('Harap tentukan titik asal dan tujuan terlebih dahulu');
      return;
    }

    setIsCalculating(true);
    setIsSimulating(false);
    if (simRef.current) clearInterval(simRef.current);
    setSimIndex(0);

    try {
      // Profile multiplier
      const speedFactor = vehicleProfile === 'truck' ? 0.8 : vehicleProfile === 'bike' ? 1.1 : 1.0;
      const fuelRatePerKm = vehicleProfile === 'truck' ? 0.28 : vehicleProfile === 'car' ? 0.1 : 0.035;

      const allPoints: RoutePoint[] = [orig, ...wps.map((w) => w.coord), dest];
      const coordStr = allPoints.map((p) => `${p.lng},${p.lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=true`;

      const res = await fetch(url);
      const data = await res.json();

      let points: RoutePoint[] = [];
      let distanceKm = 0;
      let durationMinutes = 0;
      let steps: RouteStep[] = [];

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        points = route.geometry.coordinates.map((coord: [number, number]) => ({
          lat: coord[1],
          lng: coord[0],
        }));
        distanceKm = Number((route.distance / 1000).toFixed(1));
        durationMinutes = Math.round((route.duration / 60) / speedFactor);

        if (route.legs && Array.isArray(route.legs)) {
          route.legs.forEach(
            (
              leg: {
                steps?: Array<{
                  maneuver?: { type?: string; modifier?: string };
                  name?: string;
                  distance: number;
                  duration: number;
                }>;
              },
              legIdx: number
            ) => {
              const targetName =
                legIdx < wps.length ? `Titik Penanda #${legIdx + 1} (${wps[legIdx].name})` : `Tujuan (${destText})`;

              if (leg.steps) {
                leg.steps.forEach((st) => {
                  const mod = st.maneuver?.modifier || '';
                  const type = st.maneuver?.type || '';
                  let stepType: RouteStep['type'] = 'straight';
                  if (mod.includes('right')) stepType = 'right';
                  else if (mod.includes('left')) stepType = 'left';
                  else if (type === 'arrive') stepType = 'arrive';
                  else if (type === 'depart') stepType = 'depart';

                  const roadName = st.name ? `ke ${st.name}` : 'terus di jalur';
                  let instruction = '';
                  if (stepType === 'depart') instruction = `Mulai perjalanan ${roadName}`;
                  else if (stepType === 'arrive') instruction = `Tiba di ${targetName}`;
                  else if (stepType === 'right') instruction = `Belok kanan ${roadName}`;
                  else if (stepType === 'left') instruction = `Belok kiri ${roadName}`;
                  else instruction = `Lurus ${roadName}`;

                  steps.push({
                    instruction,
                    distanceKm: Number((st.distance / 1000).toFixed(2)),
                    durationSec: Math.round(st.duration),
                    type: stepType,
                  });
                });
              }
            }
          );
        }
      } else {
        // Fallback: Generate realistic interpolated curve route through all points
        points = [];
        const segments = allPoints.length - 1;
        const countPerSeg = 20;

        for (let s = 0; s < segments; s++) {
          const p1 = allPoints[s];
          const p2 = allPoints[s + 1];
          for (let i = 0; i <= countPerSeg; i++) {
            if (s > 0 && i === 0) continue;
            const t = i / countPerSeg;
            const lat = p1.lat + (p2.lat - p1.lat) * t + Math.sin(t * Math.PI) * 0.01;
            const lng = p1.lng + (p2.lng - p1.lng) * t - Math.sin(t * Math.PI) * 0.008;
            points.push({ lat, lng });
          }
        }

        // Approximate distance
        let totalD = 0;
        for (let s = 0; s < segments; s++) {
          const p1 = allPoints[s];
          const p2 = allPoints[s + 1];
          const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
          const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          totalD += 6371 * c * 1.35;
        }
        distanceKm = Number(totalD.toFixed(1));
        durationMinutes = Math.round(((distanceKm / 42) * 60) / speedFactor);

        steps = [
          { instruction: `Mulai perjalanan dari ${originText}`, distanceKm: 0.1, durationSec: 60, type: 'depart' },
          ...wps.map((w, i) => ({
            instruction: `Melewati Titik Penanda #${i + 1}: ${w.name}`,
            distanceKm: Number((distanceKm / (wps.length + 1)).toFixed(1)),
            durationSec: 500,
            type: 'straight' as const,
          })),
          { instruction: `Tiba di tujuan: ${destText}`, distanceKm: 0.05, durationSec: 30, type: 'arrive' },
        ];
      }

      const estimatedFuelLiters = Number((distanceKm * fuelRatePerKm).toFixed(1));

      const result: RouteResult = {
        points,
        distanceKm,
        durationMinutes,
        estimatedFuelLiters,
        steps,
        originName: originText,
        destName: destText,
      };

      setRouteResult(result);

      // Draw polyline on Map
      const map = mapInstanceRef.current;
      if (map) {
        if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);
        if (routeShadowRef.current) map.removeLayer(routeShadowRef.current);

        const latLngs = points.map((p) => [p.lat, p.lng] as [number, number]);

        // Glowing shadow line
        const shadow = L.polyline(latLngs, {
          color: '#0284c7',
          weight: 9,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        routeShadowRef.current = shadow;

        // Core polyline
        const polyline = L.polyline(latLngs, {
          color: '#0ea5e9',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        routePolylineRef.current = polyline;

        // Fit map bounds to show whole route with nice padding
        map.fitBounds(polyline.getBounds(), { padding: [60, 60] });
      }

      toast.success(`Rute berhasil dihitung: ${distanceKm} km (~${durationMinutes} mnt)`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil rute, silakan coba lagi');
    } finally {
      setIsCalculating(false);
    }
  };

  // Run Route on initial mount
  useEffect(() => {
    calculateRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simulation Animation Loop
  useEffect(() => {
    if (!isSimulating || !routeResult || routeResult.points.length === 0) {
      if (simRef.current) clearInterval(simRef.current);
      return;
    }

    const intervalMs = Math.max(80, Math.floor(400 / simSpeed));
    simRef.current = setInterval(() => {
      setSimIndex((prev) => {
        const next = prev + 1;
        if (next >= routeResult.points.length) {
          setIsSimulating(false);
          toast.success('Simulasi perjalanan selesai! Kendaraan telah tiba di tujuan.');
          return prev;
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (simRef.current) clearInterval(simRef.current);
    };
  }, [isSimulating, routeResult, simSpeed]);

  // Update Simulation Marker on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !routeResult) return;

    const currentPoint = routeResult.points[simIndex];
    if (!currentPoint) return;

    // Calculate heading towards next point
    let heading = 0;
    if (simIndex < routeResult.points.length - 1) {
      const nextPoint = routeResult.points[simIndex + 1];
      const dLng = (nextPoint.lng - currentPoint.lng) * Math.PI / 180;
      const lat1 = currentPoint.lat * Math.PI / 180;
      const lat2 = nextPoint.lat * Math.PI / 180;
      const y = Math.sin(dLng) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
      heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    if (!simMarkerRef.current) {
      const simIcon = L.divIcon({
        className: 'sim-vehicle-marker',
        html: `
          <div id="sim-vehicle-icon" style="
            width: 38px;
            height: 38px;
            background: #0284c7;
            border: 3px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(2,132,199,0.6);
            transform: rotate(${heading}deg);
            transition: transform 0.2s ease-out;
          ">
            <span style="font-size: 18px;">🚚</span>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      simMarkerRef.current = L.marker([currentPoint.lat, currentPoint.lng], { icon: simIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      simMarkerRef.current.setLatLng([currentPoint.lat, currentPoint.lng]);
      const el = document.getElementById('sim-vehicle-icon');
      if (el) el.style.transform = `rotate(${heading}deg)`;
    }
  }, [simIndex, routeResult]);

  // Format step icons
  const renderStepIcon = (type: RouteStep['type']) => {
    switch (type) {
      case 'depart': return <CircleDot className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'arrive': return <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0" />;
      case 'right': return <CornerUpRight className="w-4 h-4 text-sky-500 shrink-0" />;
      case 'left': return <CornerUpLeft className="w-4 h-4 text-sky-500 shrink-0" />;
      default: return <MoveUp className="w-4 h-4 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden relative">
      {/* Sidebar: Route Configuration & Step Instructions */}
      <aside className="w-full md:w-96 bg-background border-r flex flex-col h-full z-10 shrink-0 shadow-sm">
        {/* Panel Header */}
        <div className="p-3.5 border-b bg-card flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Pengarah Rute Jalur</h2>
              <p className="text-[10px] text-muted-foreground">Navigasi Titik Asal &amp; Tujuan Armada</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200">
            Routing Aktif
          </Badge>
        </div>

        {/* Scrollable Form & Content */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
          {/* Origin & Destination Card */}
          <Card className="shadow-xs border-border/80">
            <CardContent className="p-3 space-y-3">
              {/* Origin Block with OpenStreetMap Autocomplete */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    Titik Asal (Origin)
                  </label>
                  <button
                    onClick={() => setClickMode(clickMode === 'origin' ? 'none' : 'origin')}
                    className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                      clickMode === 'origin'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-muted/60 hover:bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {clickMode === 'origin' ? 'Klik di Peta...' : 'Pilih di Peta'}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    value={originText}
                    onChange={(e) => {
                      setOriginText(e.target.value);
                      searchOrigin(e.target.value);
                    }}
                    onFocus={() => {
                      if (originSuggestions.length > 0) setShowOriginDropdown(true);
                    }}
                    placeholder="Cari jalan, gedung, atau daerah..."
                    className="h-8 text-xs font-medium pl-8 pr-7"
                  />
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {isSearchingOrigin ? (
                    <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                  ) : originText ? (
                    <button
                      onClick={() => {
                        setOriginText('');
                        setOriginSuggestions([]);
                        setShowOriginDropdown(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : null}
                </div>

                {/* Suggestions Dropdown for Origin */}
                {showOriginDropdown && originSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-popover border rounded-lg shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-border/40">
                    {originSuggestions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setOriginCoord({ lat: item.lat, lng: item.lng });
                          setOriginText(item.title);
                          setShowOriginDropdown(false);
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.flyTo([item.lat, item.lng], 14, { duration: 1 });
                          }
                          toast.success(`Titik Asal diset: ${item.title}`);
                        }}
                        className="w-full text-left p-2 hover:bg-muted transition-colors flex items-start gap-2 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-foreground leading-tight truncate">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">{item.display_name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick selector for Origin: Device GPS or Saved Marker */}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Select onValueChange={handleSelectDeviceAsOrigin}>
                    <SelectTrigger className="h-6 text-[10px] py-0 px-2 bg-muted/40">
                      <SelectValue placeholder="🚗 Dari GPS Armada..." />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          {d.name} ({d.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {markers.length > 0 && (
                    <Select
                      onValueChange={(markerId) => {
                        const m = markers.find((x) => x.id === markerId);
                        if (m) {
                          setOriginCoord({ lat: m.latitude, lng: m.longitude });
                          setOriginText(m.name);
                          calculateRoute({ lat: m.latitude, lng: m.longitude }, undefined);
                          toast.success(`Titik Asal diset ke penanda: ${m.name}`);
                        }
                      }}
                    >
                      <SelectTrigger className="h-6 text-[10px] py-0 px-2 bg-muted/40">
                        <SelectValue placeholder="📍 Dari Penanda..." />
                      </SelectTrigger>
                      <SelectContent>
                        {markers.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">
                            {m.icon || '📍'} {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Waypoints Section (Titik Penanda Singgah) */}
              <div className="p-2.5 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-amber-500" />
                    Titik Penanda Singgah
                    <Badge variant="secondary" className="text-[9px] px-1 h-4 font-bold">
                      {waypoints.length}
                    </Badge>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setClickMode(clickMode === 'waypoint' ? 'none' : 'waypoint')}
                      className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                        clickMode === 'waypoint'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-background hover:bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {clickMode === 'waypoint' ? 'Klik di Peta...' : '+ Klik di Peta'}
                    </button>
                  </div>
                </div>

                {/* Waypoints List */}
                {waypoints.length > 0 ? (
                  <div className="space-y-1.5">
                    {waypoints.map((wp, idx) => (
                      <div
                        key={wp.id}
                        className="flex items-center justify-between gap-1.5 bg-background p-1.5 rounded border text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate font-medium">{wp.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            const updated = waypoints.filter((w) => w.id !== wp.id);
                            setWaypoints(updated);
                            calculateRoute(undefined, undefined, updated);
                            toast.info(`Titik Penanda #${idx + 1} dihapus`);
                          }}
                          className="p-1 text-muted-foreground hover:text-red-500"
                          title="Hapus titik penanda ini"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic">
                    Belum ada titik penanda singgah. Tambahkan titik perhentian di antara Asal dan Tujuan jika diperlukan.
                  </p>
                )}

                {/* Quick Add Waypoint from Saved Markers */}
                {markers.length > 0 && (
                  <Select
                    onValueChange={(markerId) => {
                      const m = markers.find((x) => x.id === markerId);
                      if (m) {
                        const newWp: WaypointItem = {
                          id: 'wp-' + Date.now(),
                          name: m.name,
                          coord: { lat: m.latitude, lng: m.longitude },
                        };
                        const updated = [...waypoints, newWp];
                        setWaypoints(updated);
                        calculateRoute(undefined, undefined, updated);
                        toast.success(`Titik Penanda "${m.name}" ditambahkan`);
                      }
                    }}
                  >
                    <SelectTrigger className="h-6 text-[10px] py-0 px-2 bg-background">
                      <SelectValue placeholder="➕ Tambah dari Penanda Tersimpan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {markers.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.icon || '📍'} {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Swap Button */}
              <div className="flex items-center justify-center my-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwap}
                  className="h-7 px-3 text-[10px] gap-1 rounded-full border-dashed hover:border-primary text-muted-foreground hover:text-primary transition-all"
                >
                  <ArrowUpDown className="w-3 h-3" /> Tukar Asal &amp; Tujuan
                </Button>
              </div>

              {/* Destination Block with OpenStreetMap Autocomplete */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                    Titik Tujuan (Destination)
                  </label>
                  <button
                    onClick={() => setClickMode(clickMode === 'dest' ? 'none' : 'dest')}
                    className={`text-[10px] px-2 py-0.5 rounded font-medium border transition-colors ${
                      clickMode === 'dest'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-muted/60 hover:bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {clickMode === 'dest' ? 'Klik di Peta...' : 'Pilih di Peta'}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    value={destText}
                    onChange={(e) => {
                      setDestText(e.target.value);
                      searchDest(e.target.value);
                    }}
                    onFocus={() => {
                      if (destSuggestions.length > 0) setShowDestDropdown(true);
                    }}
                    placeholder="Cari jalan, gedung, atau daerah..."
                    className="h-8 text-xs font-medium pl-8 pr-7"
                  />
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {isSearchingDest ? (
                    <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                  ) : destText ? (
                    <button
                      onClick={() => {
                        setDestText('');
                        setDestSuggestions([]);
                        setShowDestDropdown(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : null}
                </div>

                {/* Suggestions Dropdown for Destination */}
                {showDestDropdown && destSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-popover border rounded-lg shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-border/40">
                    {destSuggestions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setDestCoord({ lat: item.lat, lng: item.lng });
                          setDestText(item.title);
                          setShowDestDropdown(false);
                          calculateRoute(undefined, { lat: item.lat, lng: item.lng });
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.flyTo([item.lat, item.lng], 14, { duration: 1 });
                          }
                          toast.success(`Titik Tujuan diset: ${item.title}`);
                        }}
                        className="w-full text-left p-2 hover:bg-muted transition-colors flex items-start gap-2 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-foreground leading-tight truncate">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">{item.display_name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {/* Quick selector for Destination: Geofence or Saved Marker */}
                <div className="mt-1.5 flex items-center gap-1.5">
                  {geofences.length > 0 && (
                    <Select onValueChange={handleSelectGeofenceAsDest}>
                      <SelectTrigger className="h-6 text-[10px] py-0 px-2 bg-muted/40">
                        <SelectValue placeholder="🎯 Dari Geofence..." />
                      </SelectTrigger>
                      <SelectContent>
                        {geofences.map((g) => (
                          <SelectItem key={g.id} value={g.id} className="text-xs">
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {markers.length > 0 && (
                    <Select
                      onValueChange={(markerId) => {
                        const m = markers.find((x) => x.id === markerId);
                        if (m) {
                          setDestCoord({ lat: m.latitude, lng: m.longitude });
                          setDestText(m.name);
                          calculateRoute(undefined, { lat: m.latitude, lng: m.longitude });
                          toast.success(`Titik Tujuan diset ke penanda: ${m.name}`);
                        }
                      }}
                    >
                      <SelectTrigger className="h-6 text-[10px] py-0 px-2 bg-muted/40">
                        <SelectValue placeholder="📍 Dari Penanda..." />
                      </SelectTrigger>
                      <SelectContent>
                        {markers.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">
                            {m.icon || '📍'} {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Saved Markers Quick Chips */}
              {markers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-sky-500" /> Penanda Peta Tersimpan:
                    </p>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{markers.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {markers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setDestText(m.name);
                          setDestCoord({ lat: m.latitude, lng: m.longitude });
                          calculateRoute(undefined, { lat: m.latitude, lng: m.longitude });
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.flyTo([m.latitude, m.longitude], 13);
                          }
                        }}
                        className="text-[9px] bg-sky-500/10 hover:bg-sky-500/20 text-foreground px-2 py-1 rounded border border-sky-500/30 flex items-center gap-1 transition-colors"
                      >
                        <span>{m.icon || '📍'}</span>
                        <span className="font-medium truncate max-w-[120px]">{m.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Preset Destinations Chips */}
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold mb-1">Lokasi Cepat / Gudang Hub:</p>
                <div className="flex flex-wrap gap-1">
                  {PRESET_LOCATIONS.slice(0, 5).map((loc) => (
                    <button
                      key={loc.name}
                      onClick={() => {
                        setDestText(loc.name);
                        setDestCoord({ lat: loc.lat, lng: loc.lng });
                        calculateRoute(undefined, { lat: loc.lat, lng: loc.lng });
                      }}
                      className="text-[9px] bg-muted/70 hover:bg-muted text-foreground px-2 py-1 rounded border border-border/50 transition-colors"
                    >
                      {loc.name.split(' (')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle Profile Selection */}
              <div>
                <label className="text-[11px] font-bold text-foreground block mb-1">
                  Profil Jenis Kendaraan:
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setVehicleProfile('truck')}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-medium border flex items-center justify-center gap-1.5 transition-all ${
                      vehicleProfile === 'truck'
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" /> Truk
                  </button>
                  <button
                    onClick={() => setVehicleProfile('car')}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-medium border flex items-center justify-center gap-1.5 transition-all ${
                      vehicleProfile === 'car'
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" /> Mobil
                  </button>
                  <button
                    onClick={() => setVehicleProfile('bike')}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-medium border flex items-center justify-center gap-1.5 transition-all ${
                      vehicleProfile === 'bike'
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5" /> Motor
                  </button>
                </div>
              </div>

              {/* Calculate Route CTA */}
              <Button
                onClick={() => calculateRoute()}
                disabled={isCalculating}
                className="w-full h-8 text-xs font-semibold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
              >
                {isCalculating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Hitung Jalur Perjalanan
              </Button>
            </CardContent>
          </Card>

          {/* Route Summary Results */}
          {routeResult && (
            <Card className="shadow-xs border-sky-500/30 bg-sky-500/5">
              <CardContent className="p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-sky-500/15 pb-2">
                  <span className="text-xs font-bold text-foreground">Ringkasan Rute</span>
                  <Badge variant="outline" className="text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200">
                    Jalur Tercepat
                  </Badge>
                </div>

                {/* 3 Metric Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-background/90 p-2 rounded-lg border border-border/60">
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                      <Milestone className="w-3 h-3 text-sky-500" /> Jarak
                    </p>
                    <p className="text-base font-bold text-foreground mt-0.5">{routeResult.distanceKm} <span className="text-[10px] font-normal text-muted-foreground">km</span></p>
                  </div>
                  <div className="bg-background/90 p-2 rounded-lg border border-border/60">
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" /> Estimasi
                    </p>
                    <p className="text-base font-bold text-foreground mt-0.5">{routeResult.durationMinutes} <span className="text-[10px] font-normal text-muted-foreground">mnt</span></p>
                  </div>
                  <div className="bg-background/90 p-2 rounded-lg border border-border/60">
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                      <Fuel className="w-3 h-3 text-emerald-500" /> BBM
                    </p>
                    <p className="text-base font-bold text-foreground mt-0.5">{routeResult.estimatedFuelLiters} <span className="text-[10px] font-normal text-muted-foreground">L</span></p>
                  </div>
                </div>

                {/* Simulation Controller */}
                <div className="bg-background/90 p-2.5 rounded-lg border border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold flex items-center gap-1">
                      <Play className="w-3 h-3 text-sky-500" /> Simulasi Pergerakan:
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 5].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => setSimSpeed(spd)}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${
                            simSpeed === spd
                              ? 'bg-primary text-primary-foreground border-primary font-bold'
                              : 'bg-muted/50 text-muted-foreground border-border'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setIsSimulating(!isSimulating)}
                      className={`h-7 px-3 text-[11px] gap-1 flex-1 font-semibold ${
                        isSimulating ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isSimulating ? 'Jeda Simulasi' : 'Mulai Jalankan Simulasi'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsSimulating(false);
                        setSimIndex(0);
                      }}
                      className="h-7 px-2 text-[11px]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Progress slider */}
                  <div className="pt-1">
                    <Slider
                      value={[simIndex]}
                      max={Math.max(1, routeResult.points.length - 1)}
                      step={1}
                      onValueChange={(val) => {
                        setIsSimulating(false);
                        setSimIndex(val[0]);
                      }}
                      className="cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1 font-medium">
                      <span>Asal (0 km)</span>
                      <span>{((simIndex / Math.max(1, routeResult.points.length - 1)) * routeResult.distanceKm).toFixed(1)} km</span>
                      <span>Tujuan ({routeResult.distanceKm} km)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Turn by Turn Navigation Directions */}
          {routeResult && routeResult.steps.length > 0 && (
            <Card className="shadow-xs border-border/80">
              <CardHeader className="p-3 pb-2 border-b">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-sky-500" />
                  Petunjuk Arah Jalur ({routeResult.steps.length} langkah)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {routeResult.steps.map((st, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                  >
                    <div className="mt-0.5">{renderStepIcon(st.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium leading-tight text-foreground">{st.instruction}</p>
                      {st.distanceKm > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {st.distanceKm >= 1 ? `${st.distanceKm} km` : `${Math.round(st.distanceKm * 1000)} m`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </aside>

      {/* Main Map View */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Floating Map Controls Bar */}
        <div className="absolute top-3 right-3 z-[400] flex items-center gap-2 bg-background/90 backdrop-blur border rounded-lg p-1.5 shadow-md">
          <Button
            size="sm"
            variant={showSavedMarkers ? 'default' : 'outline'}
            onClick={() => setShowSavedMarkers(!showSavedMarkers)}
            className="h-7 text-[10px] px-2.5 gap-1.5 font-semibold"
            title={showSavedMarkers ? 'Sembunyikan Penanda Tersimpan' : 'Tampilkan Penanda Tersimpan'}
          >
            {showSavedMarkers ? <Eye className="w-3 h-3 text-sky-500" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
            Penanda ({markers.length})
          </Button>
          <Button
            size="sm"
            variant={tileMode === 'street' ? 'default' : 'outline'}
            onClick={() => setTileMode('street')}
            className="h-7 text-[10px] px-2.5"
          >
            Peta Jalan
          </Button>
          <Button
            size="sm"
            variant={tileMode === 'satellite' ? 'default' : 'outline'}
            onClick={() => setTileMode('satellite')}
            className="h-7 text-[10px] px-2.5"
          >
            Satelit
          </Button>
        </div>

        {/* Map Click Help Banner */}
        {clickMode !== 'none' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-emerald-600 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <MapPin className="w-4 h-4" />
            <span>
              Klik pada area peta untuk menentukan{' '}
              <strong>
                {clickMode === 'origin'
                  ? 'Titik Asal (A)'
                  : clickMode === 'dest'
                  ? 'Titik Tujuan (B)'
                  : 'Titik Penanda Singgah (Waypoint)'}
              </strong>
            </span>
            <button
              onClick={() => setClickMode('none')}
              className="ml-2 text-white/80 hover:text-white font-bold bg-emerald-700 rounded-full px-2 py-0.5 text-[10px]"
            >
              ✕ Batal
            </button>
          </div>
        )}

        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-full bg-muted/20" />
      </div>
    </div>
  );
}
