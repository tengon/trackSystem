import { create } from 'zustand';

export interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
  iconColor: string;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastSpeed: number;
  lastHeading: number;
  batteryLevel: number;
  phoneNumber: string | null;
  imei: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { alerts: number };
}

export interface LocationRecord {
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
}

export interface Geofence {
  id: string;
  name: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  radius: number;
  type: string;
  active: boolean;
  createdAt: string;
  device?: { name: string; type: string };
}

export interface Alert {
  id: string;
  deviceId: string;
  geofenceId: string | null;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  device?: { name: string; type: string; iconColor: string };
}

export interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  idleDevices: number;
  totalAlerts: number;
  unreadAlerts: number;
  devicesByType: Record<string, number>;
  recentAlerts: Alert[];
  avgSpeed: number;
}

interface RealtimePosition {
  deviceId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  batteryLevel: number;
  timestamp: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface GPSStore {
  // Auth
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  logout: () => void;

  // Navigation
  activeNavTab: 'monitor' | 'report' | 'device' | 'account' | 'fleet';
  setActiveNavTab: (tab: 'monitor' | 'report' | 'device' | 'account' | 'fleet') => void;

  // Devices
  devices: Device[];
  selectedDeviceId: string | null;
  setDevices: (devices: Device[]) => void;
  selectDevice: (id: string | null) => void;
  updateDevicePosition: (update: RealtimePosition) => void;

  // Dashboard
  stats: DashboardStats | null;
  setStats: (stats: DashboardStats) => void;

  // Alerts
  alerts: Alert[];
  unreadCount: number;
  setAlerts: (alerts: Alert[], unreadCount: number) => void;

  // Location History
  locationHistory: LocationRecord[];
  setLocationHistory: (history: LocationRecord[]) => void;

  // Geofences
  geofences: Geofence[];
  setGeofences: (geofences: Geofence[]) => void;

  // UI state
  sidebarTab: 'devices' | 'alerts' | 'geofences' | 'add-device';
  setSidebarTab: (tab: 'devices' | 'alerts' | 'geofences' | 'add-device') => void;
  showDeviceDetail: boolean;
  setShowDeviceDetail: (show: boolean) => void;
  simulationEnabled: boolean;
  setSimulationEnabled: (enabled: boolean) => void;
}

export const useGPSStore = create<GPSStore>((set) => ({
  // Auth
  isAuthenticated: false,
  setIsAuthenticated: (auth) => set({ isAuthenticated: auth }),
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  logout: () => set({
    isAuthenticated: false,
    currentUser: null,
    activeNavTab: 'monitor',
    devices: [],
    selectedDeviceId: null,
    stats: null,
    alerts: [],
    unreadCount: 0,
    locationHistory: [],
    geofences: [],
    sidebarTab: 'devices',
    showDeviceDetail: false,
  }),

  // Navigation
  activeNavTab: 'monitor',
  setActiveNavTab: (tab) => set({ activeNavTab: tab }),

  // Devices
  devices: [],
  selectedDeviceId: null,
  setDevices: (devices) => set({ devices }),
  selectDevice: (id) => set({ selectedDeviceId: id, showDeviceDetail: id !== null }),
  updateDevicePosition: (update) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === update.deviceId
          ? {
              ...d,
              lastLatitude: update.latitude,
              lastLongitude: update.longitude,
              lastSpeed: update.speed,
              lastHeading: update.heading,
              batteryLevel: update.batteryLevel,
              status: update.speed > 2 ? 'online' : 'idle',
            }
          : d
      ),
    })),

  // Dashboard
  stats: null,
  setStats: (stats) => set({ stats }),

  // Alerts
  alerts: [],
  unreadCount: 0,
  setAlerts: (alerts, unreadCount) => set({ alerts, unreadCount }),

  // Location History
  locationHistory: [],
  setLocationHistory: (history) => set({ locationHistory: history }),

  // Geofences
  geofences: [],
  setGeofences: (geofences) => set({ geofences }),

  // UI state
  sidebarTab: 'devices',
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  showDeviceDetail: false,
  setShowDeviceDetail: (show) => set({ showDeviceDetail: show }),
  simulationEnabled: true,
  setSimulationEnabled: (enabled) => set({ simulationEnabled: enabled }),
}));
