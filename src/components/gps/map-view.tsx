'use client';

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { useGPSStore } from '@/store/gps-store';
import type { RealtimePosition } from '@/store/gps-store';

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

function getDeviceIcon(type: string, status: string, color: string): L.DivIcon {
  const iconMap: Record<string, string> = {
    vehicle: '🚗',
    person: '👤',
    pet: '🐾',
    asset: '📦',
  };
  const emoji = iconMap[type] || '📍';
  const pulseClass = status === 'online' ? 'animate-pulse' : '';
  const bgColor = status === 'online' ? color : status === 'idle' ? '#f59e0b' : '#9ca3af';

  return L.divIcon({
    className: 'custom-device-icon',
    html: `
      <div class="relative ${pulseClass}">
        <div style="
          width: 40px; height: 40px;
          background: ${bgColor};
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 3px solid white;
          cursor: pointer;
        ">
          ${emoji}
        </div>
        ${status === 'online' ? `<div style="
          position: absolute; bottom: -2px; right: -2px;
          width: 12px; height: 12px;
          background: #22c55e;
          border-radius: 50%;
          border: 2px solid white;
        "></div>` : ''}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  });
}

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const geofenceCirclesRef = useRef<Map<string, L.Circle>>(new Map());

  const devices = useGPSStore((s) => s.devices);
  const selectedDeviceId = useGPSStore((s) => s.selectedDeviceId);
  const selectDevice = useGPSStore((s) => s.selectDevice);
  const geofences = useGPSStore((s) => s.geofences);
  const locationHistory = useGPSStore((s) => s.locationHistory);

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

  // Update markers when devices change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentMarkerIds = new Set<string>();

    devices.forEach((device) => {
      if (device.lastLatitude === null || device.lastLongitude === null) return;

      currentMarkerIds.add(device.id);

      const icon = getDeviceIcon(device.type, device.status, device.iconColor);
      const position: L.LatLngExpression = [device.lastLatitude, device.lastLongitude];

      if (markersRef.current.has(device.id)) {
        const marker = markersRef.current.get(device.id)!;
        marker.setLatLng(position);
        marker.setIcon(icon);
      } else {
        const marker = L.marker(position, { icon }).addTo(map);
        const popupContent = `
          <div style="min-width: 160px; font-family: system-ui;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${device.name}</div>
            <div style="font-size: 12px; color: #666;">Kecepatan: ${Math.round(device.lastSpeed)} km/h</div>
            <div style="font-size: 12px; color: #666;">Baterai: ${device.batteryLevel}%</div>
            <div style="font-size: 12px; color: #666;">Status: ${device.status}</div>
          </div>
        `;
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

    // Clear existing polylines
    polylinesRef.current.forEach((polyline) => map.removeLayer(polyline));
    polylinesRef.current.clear();

    if (!selectedDeviceId || locationHistory.length === 0) return;

    const sortedHistory = [...locationHistory].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const latlngs: L.LatLngExpression[] = sortedHistory.map(
      (loc) => [loc.latitude, loc.longitude] as L.LatLngExpression
    );

    if (latlngs.length > 1) {
      const polyline = L.polyline(latlngs, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 6',
      }).addTo(map);

      polylinesRef.current.set(selectedDeviceId, polyline);

      // Fit bounds to trail
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
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

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* Map overlay info */}
      <div className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border">
        <p className="text-xs text-muted-foreground font-medium">
          🗺️ GPS Tracker — Jakarta Area
        </p>
      </div>
    </div>
  );
}
