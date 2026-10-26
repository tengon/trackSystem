'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useGPSStore } from '@/store/gps-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Monitor, Bell, MapPin, Plus,
  Menu, X, Satellite, LogOut, User, FileText,
  Truck, Users, Building2, ChevronDown, Radio, Route, Navigation, MapPinned,
} from 'lucide-react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import LoginPage from '@/components/gps/login-page';
import DeviceList from '@/components/gps/device-list';
import AlertsPanel from '@/components/gps/alerts-panel';
import GeofencesPanel from '@/components/gps/geofences-panel';
import AddDeviceDialog from '@/components/gps/add-device-dialog';
import DashboardStats from '@/components/gps/dashboard-stats';

const MarkersPanel = dynamic(() => import('@/components/gps/markers-panel'), {
  loading: () => <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>,
});


const DeviceMapPopup = dynamic(() => import('@/components/gps/device-map-popup'), {
  ssr: false,
});

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

const TripHistoryPanel = dynamic(() => import('@/components/gps/trip-history-panel'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const RoutePlanningPanel = dynamic(() => import('@/components/gps/route-planning-panel'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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

const ServerLogsPanel = dynamic(() => import('@/components/gps/server-logs-panel'), {
  loading: () => <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>,
});

interface NavTabItem {
  value: 'monitor' | 'report' | 'route' | 'device' | 'fleet' | 'server-logs' | 'account';
  label: string;
  icon: typeof Monitor;
  iconUrl?: string;
}

const NAV_TABS: NavTabItem[] = [
  { value: 'monitor', label: 'Monitor', icon: Monitor, iconUrl: '/icon/monitor.png' },
  { value: 'report', label: 'Riwayat', icon: Route, iconUrl: '/icon/riwayat.png' },
  { value: 'route', label: 'Rute', icon: Navigation, iconUrl: '/icon/riwayat.png' },
  { value: 'device', label: 'Perangkat', icon: Truck, iconUrl: '/icon/perangkat.png' },
  { value: 'fleet', label: 'Armada', icon: Building2, iconUrl: '/icon/armada.png' },
  { value: 'server-logs', label: 'Data Masuk', icon: Radio },
  { value: 'account', label: 'Akun', icon: Users, iconUrl: '/icon/user.png' },
];

export default function GPSTrackerPage() {
  const {
    devices, setDevices, selectedDeviceId, selectDevice, updateDevicePosition,
    stats, setStats, alerts, unreadCount, setAlerts, setLocationHistory,
    geofences, setGeofences, markers, setMarkers, sidebarTab, setSidebarTab,
    showDeviceDetail, setShowDeviceDetail,
    currentUser, logout, isAuthenticated,
    activeNavTab, setActiveNavTab,
  } = useGPSStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Track current user and devices in refs for realtime socket scoping
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const devicesRef = useRef(devices);
  devicesRef.current = devices;

  // Client-side mount detection for auth gate
  useEffect(() => { setMounted(true); }, []);

  // Redirect regular user if they are on an admin tab
  useEffect(() => {
    if (currentUser?.role === 'user' && !['monitor', 'report', 'route'].includes(activeNavTab)) {
      setActiveNavTab('monitor');
    }
  }, [currentUser?.role, activeNavTab, setActiveNavTab]);

  // Fetch initial data (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    async function fetchData() {
      try {
        const queryParams = new URLSearchParams();
        if (currentUser?.id) queryParams.set('currentUserId', currentUser.id);
        if (currentUser?.role) queryParams.set('currentUserRole', currentUser.role);
        const qStr = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const headers: Record<string, string> = {
          'x-user-id': currentUser?.id || '',
          'x-user-role': currentUser?.role || '',
        };

        const [devicesRes, statsRes, alertsRes, geofencesRes, markersRes] = await Promise.all([
          fetch(`/api/devices${qStr}`, { headers }),
          fetch(`/api/dashboard${qStr}`, { headers }),
          fetch(`/api/alerts?limit=30${currentUser?.id ? `&currentUserId=${currentUser.id}&currentUserRole=${currentUser?.role || ''}` : ''}`, { headers }),
          fetch(`/api/geofences${qStr}`, { headers }),
          fetch(`/api/markers${qStr}`, { headers }),
        ]);
        const [devicesData, statsData, alertsData, geofencesData, markersData] = await Promise.all([
          devicesRes.json(), statsRes.json(), alertsRes.json(), geofencesRes.json(), markersRes.json(),
        ]);
        setDevices(Array.isArray(devicesData) ? devicesData : []);
        setStats(statsData);
        setAlerts(alertsData.alerts || [], alertsData.unreadCount || 0);
        setGeofences(Array.isArray(geofencesData) ? geofencesData : []);
        setMarkers(Array.isArray(markersData) ? markersData : []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Gagal memuat data');
      } finally {
        setInitialLoading(false);
      }
    }
    fetchData();
  }, [isAuthenticated, currentUser?.id, currentUser?.role, setDevices, setStats, setAlerts, setGeofences, setMarkers]);

  // Connect to WebSocket (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:3002`
      : 'http://localhost:3002');
    const socket = io(socketUrl, { transports: ['websocket', 'polling'], reconnectionAttempts: 10, reconnectionDelay: 2000 });
    socketRef.current = socket;
    socket.on('connect', () => console.log('Connected to Teltonika GPS gateway service at', socketUrl));
    socket.on('initial-positions', (positions: Array<{
      deviceId: string; latitude: number; longitude: number; speed: number; heading: number; batteryLevel: number;
    }>) => {
      const isUser = currentUserRef.current?.role === 'user';
      const myDeviceIds = new Set(devicesRef.current.map((d) => d.id));
      positions.forEach((pos) => {
        if (!isUser || myDeviceIds.has(pos.deviceId)) {
          updateDevicePosition(pos);
        }
      });
    });
    socket.on('location-updates', (updates: Array<{
      deviceId: string; latitude: number; longitude: number; speed: number; heading: number; batteryLevel: number;
    }>) => {
      const isUser = currentUserRef.current?.role === 'user';
      const myDeviceIds = new Set(devicesRef.current.map((d) => d.id));
      const filtered = isUser ? updates.filter((u) => myDeviceIds.has(u.deviceId)) : updates;
      filtered.forEach((update) => updateDevicePosition(update));
      const handler = (window as unknown as Record<string, unknown>).__mapRealtimeHandler as ((updates: unknown[]) => void) | undefined;
      if (handler) handler(filtered);
    });
    socket.on('location_update', (telemetry: {
      deviceId: string; latitude: number; longitude: number; speed: number; heading: number; batteryLevel: number;
    }) => {
      const isUser = currentUserRef.current?.role === 'user';
      const myDeviceIds = new Set(devicesRef.current.map((d) => d.id));
      if (!isUser || myDeviceIds.has(telemetry.deviceId)) {
        updateDevicePosition(telemetry);
        const handler = (window as unknown as Record<string, unknown>).__mapRealtimeHandler as ((updates: unknown[]) => void) | undefined;
        if (handler) handler([telemetry]);
      }
    });
    socket.on('disconnect', () => console.log('Disconnected from Teltonika GPS gateway service'));
    socket.on('connect_error', (error) => console.warn('WebSocket connection error:', error.message));
    return () => { socket.disconnect(); };
  }, [isAuthenticated, updateDevicePosition]);

  // Realtime Polling Fallback: Always poll latest device positions every 3 seconds with user scoping
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(async () => {
      try {
        const queryParams = new URLSearchParams();
        if (currentUser?.id) queryParams.set('currentUserId', currentUser.id);
        if (currentUser?.role) queryParams.set('currentUserRole', currentUser.role);
        const qStr = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const headers: Record<string, string> = {
          'x-user-id': currentUser?.id || '',
          'x-user-role': currentUser?.role || '',
        };
        const res = await fetch(`/api/devices${qStr}`, { headers });
        if (res.ok) {
          const freshDevices = await res.json();
          if (Array.isArray(freshDevices)) {
            setDevices(freshDevices);
          }
        }
      } catch {
        /* silently ignore */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser?.id, currentUser?.role, setDevices]);

  // Fetch location history when a device is selected
  useEffect(() => {
    if (!isAuthenticated || !selectedDeviceId) { if (!selectedDeviceId && isAuthenticated) setLocationHistory([]); return; }
    fetch(`/api/devices/${selectedDeviceId}/locations?limit=50`)
      .then((res) => res.json())
      .then((data) => setLocationHistory(data))
      .catch(console.error);
  }, [selectedDeviceId, isAuthenticated, setLocationHistory]);

  // Refresh dashboard stats periodically with user scoping
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(async () => {
      try {
        const queryParams = new URLSearchParams();
        if (currentUser?.id) queryParams.set('currentUserId', currentUser.id);
        if (currentUser?.role) queryParams.set('currentUserRole', currentUser.role);
        const qStr = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const headers: Record<string, string> = {
          'x-user-id': currentUser?.id || '',
          'x-user-role': currentUser?.role || '',
        };
        const res = await fetch(`/api/dashboard${qStr}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch { /* silently */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser?.id, currentUser?.role, setStats]);

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
                  <TabsList className="w-full h-8 grid grid-cols-4">
                    <TabsTrigger value="devices" className="text-[10px] gap-1 h-7 px-1">
                      <img src="/icon/perangkat.png" alt="Perangkat" className="w-3.5 h-3.5 object-contain" />
                      <span className="hidden sm:inline">Perangkat</span>
                    </TabsTrigger>
                    <TabsTrigger value="alerts" className="text-[10px] gap-1 h-7 px-1 relative">
                      <Bell className="w-3 h-3" /><span className="hidden sm:inline">Notif</span>
                      {unreadCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-3.5 min-w-3.5 text-[8px] px-1">{unreadCount}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="geofences" className="text-[10px] gap-1 h-7 px-1">
                      <MapPin className="w-3 h-3" /><span className="hidden sm:inline">Geofence</span>
                    </TabsTrigger>
                    <TabsTrigger value="markers" className="text-[10px] gap-1 h-7 px-1">
                      <MapPinned className="w-3 h-3 text-sky-500" /><span className="hidden sm:inline">Penanda</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex-1 overflow-hidden p-3">
                {sidebarTab === 'devices' && <DeviceList />}
                {sidebarTab === 'alerts' && <AlertsPanel />}
                {sidebarTab === 'geofences' && <GeofencesPanel />}
                {sidebarTab === 'markers' && <MarkersPanel />}
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
                  <MapView />
                )}
                {selectedDeviceId && (() => {
                  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
                  if (!selectedDevice) return null;
                  return (
                    <DeviceMapPopup
                      device={selectedDevice}
                      onClose={handleDeselect}
                      onOpenTripHistory={() => {
                        selectDevice(selectedDevice.id);
                        setActiveNavTab('report');
                      }}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        );
      case 'report':
        return <TripHistoryPanel />;
      case 'route':
        return <RoutePlanningPanel />;
      case 'device':
        return <DeviceManagementPanel />;
      case 'fleet':
        return <FleetManagementPanel />;
      case 'server-logs':
        return <ServerLogsPanel />;
      case 'account':
        return <UserManagementPanel />;
      default: return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 h-14 gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
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

          {/* Navigation Menu (Button Mode) */}
          <nav className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(currentUser?.role === 'user'
              ? NAV_TABS.filter((tab) => tab.value === 'monitor' || tab.value === 'report' || tab.value === 'route')
              : NAV_TABS
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeNavTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveNavTab(tab.value)}
                  className={`group shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap border ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40 hover:border-border'
                  }`}
                >
                  {tab.iconUrl ? (
                    <img
                      src={tab.iconUrl}
                      alt={tab.label}
                      className={`w-5 h-5 object-contain transition-transform duration-200 ${
                        isActive
                          ? 'scale-110 drop-shadow-xs'
                          : 'opacity-80 group-hover:opacity-100 group-hover:scale-105'
                      }`}
                    />
                  ) : (
                    <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
          
          {/* Right Section: Status & Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {activeNavTab === 'monitor' && (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold">Gateway Live</span>
              </div>
            )}
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  <img src="/icon/user.png" alt="User" className="w-6 h-6 object-contain" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium leading-tight">{currentUser?.name || 'User'}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{roleLabel[currentUser?.role || 'user'] || currentUser?.role}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border bg-popover p-1 shadow-lg z-50">
                  <div className="px-3 py-2 border-b mb-1 flex items-center gap-2.5">
                    <img src="/icon/user.png" alt="User" className="w-8 h-8 object-contain shrink-0" />
                    <div>
                      <p className="text-sm font-medium leading-tight">{currentUser?.name}</p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">{currentUser?.email}</p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors cursor-pointer">
                    <LogOut className="w-4 h-4" /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{renderContent()}</main>
      <footer className="border-t py-2 px-4 bg-background shrink-0">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2"><Satellite className="w-3.5 h-3.5" /><span>GPS Tracker Platform v1.0</span></div>
          <div className="flex items-center gap-3">
            {currentUser?.role === 'user' ? (
              <span>{devices.length} perangkat ditugaskan ke Anda</span>
            ) : (
              <span>{devices.length} perangkat terdaftar</span>
            )}
            <span>·</span>
            <span>{devices.filter((d) => d.status === 'online').length} sedang aktif</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
