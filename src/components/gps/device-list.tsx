'use client';

import { useGPSStore, type Device } from '@/store/gps-store';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  MapPin, Search, Car, User, PawPrint, Package,
  Signal, SignalZero, Pause, Battery, Plus, Filter,
  ChevronRight, ChevronDown, Users, FolderTree,
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const typeIcons: Record<string, React.ReactNode> = {
  vehicle: <Car className="w-3.5 h-3.5" />,
  person: <User className="w-3.5 h-3.5" />,
  pet: <PawPrint className="w-3.5 h-3.5" />,
  asset: <Package className="w-3.5 h-3.5" />,
};

const typeLabels: Record<string, string> = {
  vehicle: 'Kendaraan',
  person: 'Orang',
  pet: 'Hewan',
  asset: 'Aset',
};

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  online: { icon: <Signal className="w-3 h-3" />, label: 'Aktif', color: 'bg-emerald-500' },
  offline: { icon: <SignalZero className="w-3 h-3" />, label: 'Offline', color: 'bg-gray-400' },
  idle: { icon: <Pause className="w-3 h-3" />, label: 'Idle', color: 'bg-amber-500' },
};

const roleColors: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  admin: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  user: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
};

const roleLabels: Record<string, string> = {
  super_admin: 'S.Admin',
  admin: 'Admin',
  user: 'User',
};

interface UserGroup {
  userId: string | null;
  userName: string;
  userRole: string;
  devices: Device[];
}

// ── Device Row (leaf node) ──────────────────────────────────────
function DeviceRow({
  device,
  isSelected,
  onSelect,
}: {
  device: Device;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const status = statusConfig[device.status] || statusConfig.offline;

  return (
    <button
      onClick={() => onSelect(device.id)}
      className={`w-full text-left py-2 pl-3 pr-2 rounded-md transition-all duration-150 hover:bg-muted/50 cursor-pointer group ${
        isSelected
          ? 'bg-primary/5 border border-primary/20'
          : 'border border-transparent'
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: `${device.iconColor}20`, color: device.iconColor }}
        >
          {typeIcons[device.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-medium truncate">{device.name}</span>
            {(device._count?.alerts ?? 0) > 0 && (
              <Badge variant="destructive" className="h-4 text-[9px] px-1 shrink-0">
                {device._count?.alerts}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
            <span className="text-[10px] text-muted-foreground">
              {status.label}
              {device.lastSpeed > 0 ? ` · ${Math.round(device.lastSpeed)} km/h` : ''}
              {' · '}{device.batteryLevel}%
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── User Tree Node (branch) ────────────────────────────────────
function UserTreeNode({
  group,
  defaultExpanded,
  selectedDeviceId,
  onSelectDevice,
  filterType,
  filterStatus,
  search,
}: {
  group: UserGroup;
  defaultExpanded: boolean;
  selectedDeviceId: string | null;
  onSelectDevice: (id: string) => void;
  filterType: string;
  filterStatus: string;
  search: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const filteredDevices = useMemo(() => {
    return group.devices.filter((d) => {
      const matchesSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'all' || d.type === filterType;
      const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [group.devices, search, filterType, filterStatus]);

  // Hide empty groups when filtering is active
  if ((filterType !== 'all' || filterStatus !== 'all' || search) && filteredDevices.length === 0) {
    return null;
  }

  const onlineCount = filteredDevices.filter((d) => d.status === 'online').length;
  const totalVisible = filteredDevices.length;

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group/node"
      >
        <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-3 h-3 text-primary" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <span className="text-[11px] font-semibold truncate block">{group.userName}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] text-muted-foreground">{onlineCount}/{totalVisible}</span>
          {group.userRole && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${roleColors[group.userRole] || roleColors.user}`}>
              {roleLabels[group.userRole] || group.userRole}
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="ml-3 pl-3 border-l-2 border-muted/60 space-y-0.5">
          {filteredDevices.map((device) => (
            <DeviceRow
              key={device.id}
              device={device}
              isSelected={device.id === selectedDeviceId}
              onSelect={onSelectDevice}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main DeviceList Component ───────────────────────────────────
export default function DeviceList() {
  const devices = useGPSStore((s) => s.devices);
  const selectedDeviceId = useGPSStore((s) => s.selectedDeviceId);
  const selectDevice = useGPSStore((s) => s.selectDevice);
  const setSidebarTab = useGPSStore((s) => s.setSidebarTab);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [allExpanded, setAllExpanded] = useState(true);

  const handleSelectDevice = useCallback((id: string) => {
    selectDevice(id);
  }, [selectDevice]);

  // Group devices by user
  const userGroups = useMemo(() => {
    const groupMap = new Map<string, UserGroup>();

    devices.forEach((device) => {
      const uid = device.userId || '__unassigned__';
      const userName = device.user?.name || 'Tidak Ditugaskan';
      const userRole = device.user?.role || '';

      if (!groupMap.has(uid)) {
        groupMap.set(uid, {
          userId: device.userId,
          userName,
          userRole,
          devices: [],
        });
      }
      groupMap.get(uid)!.devices.push(device);
    });

    // Sort: assigned users first (by name), then unassigned last
    const sorted = Array.from(groupMap.values()).sort((a, b) => {
      if (!a.userId) return 1;
      if (!b.userId) return -1;
      return a.userName.localeCompare(b.userName);
    });

    return sorted;
  }, [devices]);

  const totalDevices = devices.length;
  const totalOnline = devices.filter((d) => d.status === 'online').length;

  return (
    <div className="flex flex-col h-full gap-2.5">
      {/* Header with tree icon and add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold">Perangkat</h3>
          <Badge variant="secondary" className="h-4 text-[9px] px-1.5">
            {totalDevices}
          </Badge>
          <span className="text-[10px] text-emerald-600 font-medium">{totalOnline} aktif</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 gap-1 text-[10px] px-2"
          onClick={() => setSidebarTab('add-device')}
        >
          <Plus className="w-3 h-3" />
          Tambah
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        <Input
          placeholder="Cari perangkat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 pl-7 text-[11px]"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-6 text-[10px] flex-1 px-2">
            <Filter className="w-2.5 h-2.5 mr-0.5 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="vehicle">Kendaraan</SelectItem>
            <SelectItem value="person">Orang</SelectItem>
            <SelectItem value="pet">Hewan</SelectItem>
            <SelectItem value="asset">Aset</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-6 text-[10px] flex-1 px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="online">Aktif</SelectItem>
            <SelectItem value="idle">Idle</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
        {/* Expand/Collapse all */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 shrink-0"
          onClick={() => setAllExpanded(!allExpanded)}
          title={allExpanded ? 'Tutup Semua' : 'Buka Semua'}
        >
          {allExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Tree View */}
      <ScrollArea className="flex-1 -mx-1 px-1">
        <div className="space-y-0.5 pb-2">
          {userGroups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-[11px]">
              Tidak ada perangkat ditemukan
            </div>
          )}
          {userGroups.map((group) => (
            <UserTreeNode
              key={group.userId || '__unassigned__'}
              group={group}
              defaultExpanded={allExpanded}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={handleSelectDevice}
              filterType={filterType}
              filterStatus={filterStatus}
              search={search}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
