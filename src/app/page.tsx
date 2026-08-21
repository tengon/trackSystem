'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useGPSStore } from '@/store/gps-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Monitor, Bell, MapPin, Plus, Radio,
  Menu, X, Satellite, LogOut, User, FileText,
  Truck, Users, Building2, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import LoginPage from '@/components/gps/login-page';
import DeviceList from '@/components/gps/device-list';
import DeviceDetail from '@/components/gps/device-detail';
import AlertsPanel from '@/components/gps/alerts-panel';
import GeofencesPanel from '@/components/gps/geofences-panel';
import AddDeviceDialog from '@/components/gps/add-device-dialog';
import DashboardStats from '@/components/gps/dashboard-stats';

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

const UserManagementPanel = dynamic(() => import('@/components/gps/user-management-panel'), {
  loading: () => <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>,
});

const DeviceManagementPanel = dynamic(() => import('@/components/gps/device-management-panel'), {
  loading: () => <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>,
});

const FleetManagementPanel = dynamic(() => import('@/components/gps/fleet-management-panel'), {
  loading: () => <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>,
});

const NAV_TABS = [
  { value: 'monitor' as const, label: 'Monitor', icon: Monitor },
  { value: 'report' as const, label: 'Laporan', icon: FileText },
  { value: 'device' as const, label: 'Perangkat', icon: Truck },
  { value: 'account' as const, label: 'Akun', icon: Users },
  { value: 'fleet' as const, label: 'Armada', icon: Building2 },
];

export default function GPSTrackerPage() {
  const {
    devices, setDevices, selectedDeviceId, selectDevice, updateDevicePosition,
    stats, setStats, alerts, unreadCount, setAlerts, setLocationHistory,
    geofences, setGeofences, sidebarTab, setSidebarTab,
    showDeviceDetail, setShowDeviceDetail, simulationEnabled, setSimulationEnabled,
    currentUser, logout, isAuthenticated,
    activeNavTab, setActiveNavTab,
  } = useGPSStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Client-side mount detection for auth gate
  useEffect(() => { setMounted(true); }, []);

  // Fetch initial data (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchData() {
      try {
        const [devicesRes, statsRes, alertsRes, geofencesRes] = await Promise.all([
          fetch('/api/devices'),
          fetch('/api/dashboard'),
          fetch('/api/alerts?limit=30'),
          fetch('/api/geofences'),
        ]);
        const [devicesData, statsData, alertsData, geofencesData] = await Promise.all([
          devicesRes.json(), statsRes.json(), alertsRes.json(), geofencesRes.json(),
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
  }, [isAuthenticated, setDevices, setStats, setAlerts, setGeofences]);

  // Connect to WebSocket (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = io('/?XTransformPort=3004', { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => console.log('Connected to GPS tracking service'));
    socket.on('initial-positions', (positions: Array<{
      deviceId: string; latitude: number; longitude: number; speed: number; heading: number; batteryLevel: number;
    }>) => {
      positions.forEach((pos) => updateDevicePosition(pos));
    });
    socket.on('location-updates', (updates: Array<{
      deviceId: string; latitude: number; longitude: number; speed: number; heading: number; batteryLevel: number;
    }>) => {
      updates.forEach((update) => updateDevicePosition(update));
      const handler = (window as unknown as Record<string, unknown>).__mapRealtimeHandler as ((updates: unknown[]) => void) | undefined;
      if (handler) handler(updates);
    });
    socket.on('disconnect', () => console.log('Disconnected from GPS tracking service'));
    socket.on('connect_error', (error) => console.warn('WebSocket connection error:', error.message));
    return () => { socket.disconnect(); };
  }, [isAuthenticated, updateDevicePosition]);

  // Fetch location history when a device is selected
  useEffect(() => {
    if (!isAuthenticated || !selectedDeviceId) { if (!selectedDeviceId && isAuthenticated) setLocationHistory([]); return; }
    fetch(`/api/devices/${selectedDeviceId}/locations?limit=50`)
      .then((res) => res.json())
      .then((data) => setLocationHistory(data))
      .catch(console.error);
  }, [selectedDeviceId, isAuthenticated, setLocationHistory]);

  // Refresh dashboard stats periodically
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(async () => {
      try { const res = await fetch('/api/dashboard'); const data = await res.json(); setStats(data); } catch { /* silently */ }
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, setStats]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = () => setUserMenuOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [userMenuOpen]);

  // Login gate — show login page on first load or when not authenticated
  if (!mounted || !isAuthenticated) {
    return <LoginPage />;
  }

  const handleToggleSimulation = () => {
    const newEnabled = !simulationEnabled;
    setSimulationEnabled(newEnabled);
    socketRef.current?.emit('toggle-simulation', { enabled: newEnabled });
    toast.success(newEnabled ? 'Simulasi GPS diaktifkan' : 'Simulasi GPS dimatikan');
  };

  const handleDeselect = () => { selectDevice(null); setShowDeviceDetail(false); };
  const handleLogout = () => { socketRef.current?.disconnect(); logout(); toast.success('Berhasil keluar'); };

  const roleLabel: Record<string, string> = { super_admin: 'Super Admin', admin: 'Admin', user: 'User' };

  const renderContent = () => {
    switch (activeNavTab) {
      case 'monitor':
        return (
          <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
            <aside className={`absolute md:relative z-40 h-full w-80 bg-background border-r flex flex-col transition-transform duration-300 shrink-0 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-0 md:overflow-hidden'
            }`}>
              <div className="p-3 border-b shrink-0">
                <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as typeof sidebarTab)}>
                  <TabsList className="w-full h-8">
                    <TabsTrigger value="devices" className="flex-1 text-[10px] gap-1 h-7">
                      <Monitor className="w-3 h-3" /><span className="hidden sm:inline">Perangkat</span>
                    </TabsTrigger>
                    <TabsTrigger value="alerts" className="flex-1 text-[10px] gap-1 h-7 relative">
                      <Bell className="w-3 h-3" /><span className="hidden sm:inline">Notifikasi</span>
                      {unreadCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-3.5 min-w-3.5 text-[8px] px-1">{unreadCount}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="geofences" className="flex-1 text-[10px] gap-1 h-7">
                      <MapPin className="w-3 h-3" /><span className="hidden sm:inline">Geofence</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex-1 overflow-hidden p-3">
                {sidebarTab === 'devices' && <DeviceList />}
                {sidebarTab === 'alerts' && <AlertsPanel />}
                {sidebarTab === 'geofences' && <GeofencesPanel />}
                {sidebarTab === 'add-device' && <AddDeviceDialog />}
              </div>
            </aside>
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-3 border-b shrink-0"><DashboardStats /></div>
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
                          <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={() => setShowDeviceDetail(true)}>Detail</Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleDeselect}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'report':
        return (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto"><FileText className="w-8 h-8 text-muted-foreground" /></div>
              <h3 className="text-lg font-semibold">Laporan</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Modul laporan akan menampilkan riwayat perjalanan, statistik kecepatan, dan laporan geofence.</p>
              <p className="text-xs text-muted-foreground/60">Segera hadir</p>
            </div>
          </div>
        );
      case 'device':
        return <DeviceManagementPanel />;
      case 'account':
        return <UserManagementPanel />;
      case 'fleet':
        return <FleetManagementPanel />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            {activeNavTab === 'monitor' && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-1.5 rounded-md hover:bg-muted">
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center p-1 shadow-sm overflow-hidden">
                <img src="/images/truck_loc_icon.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight">GPS Tracker</h1>
                <p className="text-[10px] text-muted-foreground leading-tight">Platform Pelacakan Real-time</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeNavTab === 'monitor' && (
              <>
                <div className="hidden sm:flex items-center gap-1.5 text-[10px]">
                  <div className={`w-2 h-2 rounded-full ${simulationEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-muted-foreground">{simulationEnabled ? 'Simulasi Aktif' : 'Simulasi Mati'}</span>
                </div>
                <Button variant={simulationEnabled ? 'default' : 'outline'} size="sm" className="h-8 text-xs gap-1.5" onClick={handleToggleSimulation}>
                  <Radio className="w-3.5 h-3.5" /><span className="hidden sm:inline">Simulasi</span>
                </Button>
              </>
            )}
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium leading-tight">{currentUser?.name || 'User'}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{roleLabel[currentUser?.role || 'user'] || currentUser?.role}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border bg-popover p-1 shadow-lg z-50">
                  <div className="px-3 py-2 border-b mb-1">
                    <p className="text-sm font-medium">{currentUser?.name}</p>
                    <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                  </div>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors cursor-pointer">
                    <LogOut className="w-4 h-4" /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Top Navigation Tabs */}
        <div className="px-4 border-t">
          <nav className="flex gap-0.5 -mb-px">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeNavTab === tab.value;
              return (
                <button key={tab.value} onClick={() => setActiveNavTab(tab.value)} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                  isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col overflow-hidden">{renderContent()}</main>
      <footer className="border-t py-3 px-4 bg-background mt-auto">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2"><Satellite className="w-3.5 h-3.5" /><span>GPS Tracker Platform v1.0</span></div>
          <div className="flex items-center gap-3">
            <span>{devices.length} perangkat terdaftar</span><span>·</span>
            <span>{devices.filter((d) => d.status === 'online').length} sedang aktif</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
