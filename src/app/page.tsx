'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useGPSStore } from '@/store/gps-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Monitor, Bell, MapPin, Plus, Radio,
  Menu, X, Satellite,
} from 'lucide-react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';

import DeviceList from '@/components/gps/device-list';
import DeviceDetail from '@/components/gps/device-detail';
import AlertsPanel from '@/components/gps/alerts-panel';
import GeofencesPanel from '@/components/gps/geofences-panel';
import AddDeviceDialog from '@/components/gps/add-device-dialog';
import DashboardStats from '@/components/gps/dashboard-stats';

// Dynamic import leaflet to avoid SSR issues
const MapView = dynamic(() => import('@/components/gps/map-view'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted/30 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Satellite className="w-10 h-10 text-primary animate-pulse" />
        <p className="text-sm text-muted-foreground">Memuat peta...</p>
      </div>
    </div>
  ),
});

export default function GPSTrackerPage() {
  const {
    devices,
    setDevices,
    selectedDeviceId,
    selectDevice,
    updateDevicePosition,
    stats,
    setStats,
    alerts,
    unreadCount,
    setAlerts,
    setLocationHistory,
    geofences,
    setGeofences,
    sidebarTab,
    setSidebarTab,
    showDeviceDetail,
    setShowDeviceDetail,
    simulationEnabled,
    setSimulationEnabled,
  } = useGPSStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        const [devicesRes, statsRes, alertsRes, geofencesRes] = await Promise.all([
          fetch('/api/devices'),
          fetch('/api/dashboard'),
          fetch('/api/alerts?limit=30'),
          fetch('/api/geofences'),
        ]);

        const [devicesData, statsData, alertsData, geofencesData] = await Promise.all([
          devicesRes.json(),
          statsRes.json(),
          alertsRes.json(),
          geofencesRes.json(),
        ]);

        setDevices(devicesData);
        setStats(statsData);
        setAlerts(alertsData.alerts, alertsData.unreadCount);
        setGeofences(geofencesData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Gagal memuat data');
      } finally {
        setInitialLoading(false);
      }
    }

    fetchData();
  }, []);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    const socket = io('/?XTransformPort=3004', {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to GPS tracking service');
    });

    socket.on('initial-positions', (positions: Array<{
      deviceId: string;
      latitude: number;
      longitude: number;
      speed: number;
      heading: number;
      batteryLevel: number;
    }>) => {
      positions.forEach((pos) => {
        updateDevicePosition(pos);
      });
    });

    socket.on('location-updates', (updates: Array<{
      deviceId: string;
      latitude: number;
      longitude: number;
      speed: number;
      heading: number;
      batteryLevel: number;
    }>) => {
      updates.forEach((update) => {
        updateDevicePosition(update);
      });

      // Also call the map's realtime handler directly
      const handler = (window as unknown as Record<string, unknown>).__mapRealtimeHandler as
        ((updates: unknown[]) => void) | undefined;
      if (handler) handler(updates);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from GPS tracking service');
    });

    socket.on('connect_error', (error) => {
      console.warn('WebSocket connection error:', error.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch location history when a device is selected
  useEffect(() => {
    if (!selectedDeviceId) {
      setLocationHistory([]);
      return;
    }

    fetch(`/api/devices/${selectedDeviceId}/locations?limit=50`)
      .then((res) => res.json())
      .then((data) => setLocationHistory(data))
      .catch(console.error);
  }, [selectedDeviceId, setLocationHistory]);

  // Refresh dashboard stats periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        setStats(data);
      } catch {
        // Silently fail
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [setStats]);

  const handleToggleSimulation = () => {
    const newEnabled = !simulationEnabled;
    setSimulationEnabled(newEnabled);
    socketRef.current?.emit('toggle-simulation', { enabled: newEnabled });
    toast.success(newEnabled ? 'Simulasi GPS diaktifkan' : 'Simulasi GPS dimatikan');
  };

  const handleDeselect = () => {
    selectDevice(null);
    setShowDeviceDetail(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1.5 rounded-md hover:bg-muted"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Satellite className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight">GPS Tracker</h1>
                <p className="text-[10px] text-muted-foreground leading-tight">Platform Pelacakan Real-time</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px]">
              <div className={`w-2 h-2 rounded-full ${simulationEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-muted-foreground">
                {simulationEnabled ? 'Simulasi Aktif' : 'Simulasi Mati'}
              </span>
            </div>
            <Button
              variant={simulationEnabled ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleToggleSimulation}
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simulasi</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`absolute md:relative z-40 h-full w-80 bg-background border-r flex flex-col transition-transform duration-300 shrink-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-0 md:overflow-hidden'
          }`}
        >
          {/* Sidebar Tabs */}
          <div className="p-3 border-b shrink-0">
            <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as typeof sidebarTab)}>
              <TabsList className="w-full h-8">
                <TabsTrigger value="devices" className="flex-1 text-[10px] gap-1 h-7">
                  <Monitor className="w-3 h-3" />
                  <span className="hidden sm:inline">Perangkat</span>
                </TabsTrigger>
                <TabsTrigger value="alerts" className="flex-1 text-[10px] gap-1 h-7 relative">
                  <Bell className="w-3 h-3" />
                  <span className="hidden sm:inline">Notifikasi</span>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-3.5 min-w-3.5 text-[8px] px-1">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="geofences" className="flex-1 text-[10px] gap-1 h-7">
                  <MapPin className="w-3 h-3" />
                  <span className="hidden sm:inline">Geofence</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-hidden p-3">
            {sidebarTab === 'devices' && <DeviceList />}
            {sidebarTab === 'alerts' && <AlertsPanel />}
            {sidebarTab === 'geofences' && <GeofencesPanel />}
            {sidebarTab === 'add-device' && <AddDeviceDialog />}
          </div>
        </aside>

        {/* Map & Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Dashboard Stats */}
          <div className="p-3 border-b shrink-0">
            <DashboardStats />
          </div>

          {/* Map Container */}
          <div className="flex-1 relative">
            {initialLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-muted/10">
                <div className="flex flex-col items-center gap-3">
                  <Satellite className="w-12 h-12 text-primary animate-pulse" />
                  <p className="text-sm text-muted-foreground">Memuat platform GPS Tracker...</p>
                </div>
              </div>
            ) : (
              <>
                <MapView />
                {showDeviceDetail && selectedDeviceId && <DeviceDetail />}
              </>
            )}

            {/* Selected device quick info overlay */}
            {selectedDeviceId && !showDeviceDetail && (
              <div className="absolute bottom-4 left-4 z-[1000] bg-background/95 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-md max-w-xs">
                {(() => {
                  const device = devices.find((d) => d.id === selectedDeviceId);
                  if (!device) return null;
                  return (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium truncate max-w-[180px]">{device.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {device.lastSpeed > 0 ? `${Math.round(device.lastSpeed)} km/h · ` : ''}
                          {device.batteryLevel}% baterai
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => setShowDeviceDetail(true)}
                      >
                        Detail
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={handleDeselect}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-3 px-4 bg-background mt-auto">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Satellite className="w-3.5 h-3.5" />
            <span>GPS Tracker Platform v1.0</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{devices.length} perangkat terdaftar</span>
            <span>•</span>
            <span>{devices.filter((d) => d.status === 'online').length} sedang aktif</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
