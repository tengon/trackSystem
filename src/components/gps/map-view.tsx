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

function getDeviceIcon(type: string, status: string, color: string, name: string): L.DivIcon {
  const iconMap: Record<string, string> = {
    vehicle: '🚗',
    person: '👤',
    pet: '🐾',
    asset: '📦',
  };
  const emoji = iconMap[type] || '📍';
  const statusColor = status === 'online' ? '#22c55e' : status === 'idle' ? '#f59e0b' : '#9ca3af';

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
        <!-- Vehicle Badge (Clean White Box without big blue circle) -->
        <div style="
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 2px solid ${statusColor};
          border-radius: 8px;
          padding: 3px 6px;
          box-shadow: 0 3px 8px rgba(0,0,0,0.25);
          position: relative;
        ">
          <span style="font-size: 20px; line-height: 1;">${emoji}</span>
          <span style="
            position: absolute;
            top: -3px;
            right: -3px;
            width: 8px;
            height: 8px;
            background: ${statusColor};
            border-radius: 50%;
            border: 1.5px solid #ffffff;
          "></span>
        </div>
        <!-- Pin Pointer -->
        <div style="
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid ${statusColor};
          margin-top: -1px;
        "></div>
        <!-- Device Name Label -->
        <div style="
          margin-top: 2px;
          background: rgba(15, 23, 42, 0.90);
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          font-family: system-ui, -apple-system, sans-serif;
          padding: 2px 7px;
          border-radius: 5px;
          white-space: nowrap;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.25);
          letter-spacing: 0.2px;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
        ">
          ${name}
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -46],
  });
}

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const geofenceCirclesRef = useRef<Map<string, L.Circle>>(new Map());
  const initialFitDoneRef = useRef(false);

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
      const polyline = L.polyline(latlngs).addTo(map);

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
          🗺️ Monitoring Realtime — {devices.filter((d) => d.lastLatitude !== null).length} Perangkat di Peta
        </p>
      </div>
    </div>
  );
}
