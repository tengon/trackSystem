'use client';

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { useGPSStore } from '@/store/gps-store';
import type { RealtimePosition } from '@/store/gps-store';
import { ShieldAlert, Route as RouteIcon } from 'lucide-react';

const JAKARTA_CENTER: [number, number] = [-6.2088, 106.8456];
const JAKARTA_ZOOM = 11;

// Fix leaflet default marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function getDeviceIcon(type: string, status: string, color: string, name: string): L.DivIcon {
  const iconMap: Record<string, string> = {
    vehicle: '🚗',
    person: '👤',
    pet: '🐾',
    asset: '📦',
  };
  const emoji = iconMap[type] || '📍';
  // Status colors for the device name background
  const statusBgColor =
    status === 'online' ? '#16a34a' : status === 'idle' ? '#d97706' : '#64748b';

  return L.divIcon({
    className: 'custom-device-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        transform: translate(-50%, -100%);
        user-select: none;
      ">
        <!-- 1. Device Name Badge on Top (Background reflects status) -->
        <div style="
          background: ${statusBgColor};
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          font-family: system-ui, -apple-system, sans-serif;
          padding: 2.5px 8px;
          border-radius: 6px;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.4);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          letter-spacing: 0.2px;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        ">
          <span style="
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #ffffff;
            display: inline-block;
            flex-shrink: 0;
          "></span>
          <span style="overflow: hidden; text-overflow: ellipsis;">${name}</span>
        </div>

        <!-- 2. Vehicle Icon Only (No white background circle) -->
        <div style="
          font-size: 26px;
          line-height: 1;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));
          margin-top: 1px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${emoji}
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -50],
  });
}

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const historyMarkersRef = useRef<L.Marker[]>([]);
  const geofenceCirclesRef = useRef<Map<string, L.Circle>>(new Map());
  const initialFitDoneRef = useRef(false);

  const devices = useGPSStore((s) => s.devices);
  const selectedDeviceId = useGPSStore((s) => s.selectedDeviceId);
  const selectDevice = useGPSStore((s) => s.selectDevice);
  const geofences = useGPSStore((s) => s.geofences);
  const locationHistory = useGPSStore((s) => s.locationHistory);
  const currentUser = useGPSStore((s) => s.currentUser);
  const setActiveNavTab = useGPSStore((s) => s.setActiveNavTab);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: JAKARTA_CENTER,
      zoom: JAKARTA_ZOOM,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Auto-center or fitBounds on initial load to show all devices that have coordinates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || initialFitDoneRef.current) return;

    const devicesWithCoords = devices.filter(
      (d) => d.lastLatitude !== null && d.lastLongitude !== null
    );

    if (devicesWithCoords.length > 0) {
      if (devicesWithCoords.length === 1) {
        map.setView(
          [devicesWithCoords[0].lastLatitude!, devicesWithCoords[0].lastLongitude!],
          13
        );
      } else {
        const bounds = L.latLngBounds(
          devicesWithCoords.map((d) => [d.lastLatitude!, d.lastLongitude!])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
      initialFitDoneRef.current = true;
    }
  }, [devices]);

  // Update markers when devices change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentMarkerIds = new Set<string>();

    devices.forEach((device) => {
      if (device.lastLatitude === null || device.lastLongitude === null) return;

      currentMarkerIds.add(device.id);

      const icon = getDeviceIcon(device.type, device.status, device.iconColor, device.name);
      const position: L.LatLngExpression = [device.lastLatitude, device.lastLongitude];

      const popupContent = `
        <div style="min-width: 160px; font-family: system-ui;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${device.name}</div>
          <div style="font-size: 12px; color: #666;">Kecepatan: ${Math.round(device.lastSpeed)} km/h</div>
          <div style="font-size: 12px; color: #666;">Baterai: ${device.batteryLevel}%</div>
          <div style="font-size: 12px; color: #666;">Status: ${device.status}</div>
        </div>
      `;

      if (markersRef.current.has(device.id)) {
        const marker = markersRef.current.get(device.id)!;
        marker.setLatLng(position);
        marker.setIcon(icon);
        marker.setPopupContent(popupContent);
      } else {
        const marker = L.marker(position, { icon }).addTo(map);
        marker.bindPopup(popupContent);
        marker.on('click', () => selectDevice(device.id));
        markersRef.current.set(device.id, marker);
      }
    });

    // Remove markers for devices no longer in the list
    markersRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });
  }, [devices, selectDevice]);

  // Handle selected device - fly to it
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedDeviceId) return;

    const device = devices.find((d) => d.id === selectedDeviceId);
    if (device && device.lastLatitude !== null && device.lastLongitude !== null) {
      map.flyTo([device.lastLatitude, device.lastLongitude], 14, { duration: 1 });
    }
  }, [selectedDeviceId, devices]);

  // Draw location history trail for selected device
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing polylines and markers
    polylinesRef.current.forEach((polyline) => map.removeLayer(polyline));
    polylinesRef.current.clear();
    historyMarkersRef.current.forEach((marker) => map.removeLayer(marker));
    historyMarkersRef.current = [];

    if (!selectedDeviceId || locationHistory.length === 0) return;

    const sortedHistory = [...locationHistory].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const latlngs: [number, number][] = sortedHistory.map(
      (loc) => [loc.latitude, loc.longitude]
    );

    if (latlngs.length > 1) {
      // 1. Ambient glow line underneath
      const glowPolyline = L.polyline(latlngs, {
        color: '#60a5fa',
        weight: 8,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // 2. Core vivid blue polyline
      const polyline = L.polyline(latlngs, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      polylinesRef.current.set(selectedDeviceId + '-glow', glowPolyline);
      polylinesRef.current.set(selectedDeviceId, polyline);

      // 3. Start Marker (Green Flag)
      const startPt = sortedHistory[0];
      const startIcon = L.divIcon({
        className: 'main-map-start-flag',
        html: `
          <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
            <div style="background: #16a34a; color: #fff; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.35); white-space: nowrap;">
              START
            </div>
            <div style="font-size: 18px; line-height: 1;">🟢</div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const startMarker = L.marker([startPt.latitude, startPt.longitude], { icon: startIcon })
        .addTo(map)
        .bindPopup(`<b>Titik Awal Rute</b><br/>Waktu: ${new Date(startPt.timestamp).toLocaleTimeString('id-ID')}`);
      historyMarkersRef.current.push(startMarker);

      // 4. Finish Marker (Red Flag)
      const endPt = sortedHistory[sortedHistory.length - 1];
      const endIcon = L.divIcon({
        className: 'main-map-end-flag',
        html: `
          <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
            <div style="background: #dc2626; color: #fff; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.35); white-space: nowrap;">
              FINISH
            </div>
            <div style="font-size: 18px; line-height: 1;">🏁</div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const endMarker = L.marker([endPt.latitude, endPt.longitude], { icon: endIcon })
        .addTo(map)
        .bindPopup(`<b>Posisi Terkini Rute</b><br/>Waktu: ${new Date(endPt.timestamp).toLocaleTimeString('id-ID')}`);
      historyMarkersRef.current.push(endMarker);

      // Fit bounds to trail
      map.fitBounds(polyline.getBounds(), { padding: [60, 60], maxZoom: 16 });
    }
  }, [selectedDeviceId, locationHistory]);

  // Draw geofences
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    geofenceCirclesRef.current.forEach((circle) => map.removeLayer(circle));
    geofenceCirclesRef.current.clear();

    geofences.forEach((geofence) => {
      const circle = L.circle([geofence.latitude, geofence.longitude], {
        radius: geofence.radius,
        color: geofence.active ? '#ef4444' : '#9ca3af',
        fillColor: geofence.active ? '#ef4444' : '#9ca3af',
        fillOpacity: geofence.active ? 0.1 : 0.05,
        weight: 2,
        dashArray: geofence.active ? undefined : '5, 5',
      }).addTo(map);

      circle.bindPopup(
        `<div style="font-family: system-ui;"><strong>${geofence.name}</strong><br/>Radius: ${geofence.radius}m<br/>Tipe: ${geofence.type}</div>`
      );

      geofenceCirclesRef.current.set(geofence.id, circle);
    });
  }, [geofences]);

  // Public method to update positions from real-time updates
  useGPSStore.subscribe((state, prev) => {
    // Listen for device changes (positions update via the store)
  });

  const handleRealtimeUpdate = useCallback((updates: RealtimePosition[]) => {
    const map = mapRef.current;
    if (!map) return;

    updates.forEach((update) => {
      const marker = markersRef.current.get(update.deviceId);
      if (marker) {
        marker.setLatLng([update.latitude, update.longitude]);
      }
    });
  }, []);

  // Expose handleRealtimeUpdate via a ref or global
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__mapRealtimeHandler = handleRealtimeUpdate;
    return () => {
      delete (window as unknown as Record<string, unknown>).__mapRealtimeHandler;
    };
  }, [handleRealtimeUpdate]);

  const isRegularUser = currentUser?.role === 'user';

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* Map overlay info */}
      <div className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border">
        <p className="text-xs text-muted-foreground font-medium">
          🗺️ Monitoring Realtime — {devices.filter((d) => d.lastLatitude !== null).length} Perangkat di Peta
        </p>
      </div>

      {/* Notice for regular users with no assigned devices */}
      {isRegularUser && devices.length === 0 && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center p-4 bg-background/40 backdrop-blur-[2px] pointer-events-none">
          <div className="bg-background/95 border shadow-xl rounded-2xl p-6 max-w-sm text-center pointer-events-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Tidak Ada Perangkat Aktif</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Secara default semua perangkat GPS adalah milik <strong>Superuser / Admin</strong>. Peta pelacakan akan menampilkan kendaraan setelah administrator menugaskan perangkat ke akun Anda.
              </p>
            </div>
            <div className="text-[11px] text-muted-foreground/80 bg-muted/40 rounded-lg py-2 px-3 border border-dashed">
              Silakan hubungi Administrator untuk menambahkan tugas / unit kendaraan.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
