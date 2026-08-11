'use client';

import { useGPSStore } from '@/store/gps-store';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  MapPin, Search, Car, User, PawPrint, Package, 
  Signal, SignalZero, Pause, Battery, Plus, Filter 
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const typeIcons: Record<string, React.ReactNode> = {
  vehicle: <Car className="w-4 h-4" />,
  person: <User className="w-4 h-4" />,
  pet: <PawPrint className="w-4 h-4" />,
  asset: <Package className="w-4 h-4" />,
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

export default function DeviceList() {
  const devices = useGPSStore((s) => s.devices);
  const selectedDeviceId = useGPSStore((s) => s.selectedDeviceId);
  const selectDevice = useGPSStore((s) => s.selectDevice);
  const setSidebarTab = useGPSStore((s) => s.setSidebarTab);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchesSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'all' || d.type === filterType;
      const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [devices, search, filterType, filterStatus]);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Perangkat ({devices.length})</h3>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-7 gap-1 text-xs"
          onClick={() => setSidebarTab('add-device')}
        >
          <Plus className="w-3 h-3" />
          Tambah
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Cari perangkat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-7 text-xs flex-1">
            <Filter className="w-3 h-3 mr-1" />
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
          <SelectTrigger className="h-7 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="online">Aktif</SelectItem>
            <SelectItem value="idle">Idle</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Device List */}
      <ScrollArea className="flex-1 -mx-1 px-1">
        <div className="space-y-1.5 pb-2">
          {filteredDevices.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs">
              Tidak ada perangkat ditemukan
            </div>
          )}
          {filteredDevices.map((device) => {
            const status = statusConfig[device.status] || statusConfig.offline;
            const isSelected = device.id === selectedDeviceId;

            return (
              <button
                key={device.id}
                onClick={() => selectDevice(device.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all duration-150 hover:shadow-sm cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-transparent hover:border-border'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${device.iconColor}20`, color: device.iconColor }}
                  >
                    {typeIcons[device.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium truncate">{device.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(device._count?.alerts ?? 0) > 0 && (
                          <Badge variant="destructive" className="h-4 text-[10px] px-1.5">
                            {device._count?.alerts}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="secondary"
                        className="h-4 text-[10px] px-1.5 gap-0.5"
                      >
                        {typeLabels[device.type]}
                      </Badge>
                      <div className={`flex items-center gap-1 text-[10px] ${
                        device.status === 'online' ? 'text-emerald-600' : device.status === 'idle' ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                        {status.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      {device.lastSpeed > 0 && (
                        <span className="flex items-center gap-0.5">
                          {Math.round(device.lastSpeed)} km/h
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Battery className="w-3 h-3" />
                        {device.batteryLevel}%
                      </span>
                      {device.lastLatitude && device.lastLongitude && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {device.lastLatitude.toFixed(3)}, {device.lastLongitude.toFixed(3)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
