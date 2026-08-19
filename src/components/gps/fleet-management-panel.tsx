'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Search, Building2,
  Car, Smartphone, Dog, Package, Wifi, WifiOff, Clock,
  ChevronDown, ChevronRight, Check,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ───────────────────────────────────────────────────────────
interface FleetDevice {
  id: string;
  name: string;
  type: string;
  status: string;
  iconColor: string;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastSpeed: number;
  batteryLevel: number;
  user?: { id: string; name: string };
}

interface Fleet {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
  _count?: { devices: number };
  devices?: FleetDevice[];
}

interface DeviceOption {
  id: string;
  name: string;
  type: string;
  status: string;
  iconColor: string;
  fleetId: string | null;
}

interface FleetFormData {
  name: string;
  description: string;
  color: string;
  deviceIds: string[];
}

const emptyForm: FleetFormData = {
  name: '',
  description: '',
  color: '#22c55e',
  deviceIds: [],
};

// ── Constants ───────────────────────────────────────────────────────
const typeIcons: Record<string, React.ReactNode> = {
  vehicle: <Car className="w-4 h-4" />,
  person: <Smartphone className="w-4 h-4" />,
  pet: <Dog className="w-4 h-4" />,
  asset: <Package className="w-4 h-4" />,
};

const typeLabels: Record<string, string> = {
  vehicle: 'Kendaraan',
  person: 'Orang',
  pet: 'Hewan',
  asset: 'Aset',
};

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  online: { label: 'Aktif', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', icon: <Wifi className="w-3 h-3" /> },
  offline: { label: 'Offline', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: <WifiOff className="w-3 h-3" /> },
  idle: { label: 'Idle', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', icon: <Clock className="w-3 h-3" /> },
};

const colorPresets = [
  '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

// ── Component ───────────────────────────────────────────────────────
export default function FleetManagementPanel() {
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [allDevices, setAllDevices] = useState<DeviceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedFleet, setExpandedFleet] = useState<string | null>(null);
  const [expandedFleetData, setExpandedFleetData] = useState<Fleet | null>(null);
  const [loadingExpanded, setLoadingExpanded] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFleet, setEditingFleet] = useState<Fleet | null>(null);
  const [form, setForm] = useState<FleetFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Fleet | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch fleets & devices ────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [fleetsRes, devicesRes] = await Promise.all([
        fetch('/api/fleets'),
        fetch('/api/devices'),
      ]);
      const [fleetsData, devicesData] = await Promise.all([
        fleetsRes.json(),
        devicesRes.json(),
      ]);
      setFleets(fleetsData);
      setAllDevices(devicesData);
    } catch {
      toast.error('Gagal memuat data armada');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filter ─────────────────────────────────────────────────────────
  const filteredFleets = fleets.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q));
  });

  // Available devices (not in any fleet, or in current editing fleet)
  const getAvailableDevices = useCallback(() => {
    return allDevices
      .filter((d) => {
        if (editingFleet && d.fleetId === editingFleet.id) return true;
        return !d.fleetId;
      })
      .filter((d) => {
        if (!deviceSearch) return true;
        return d.name.toLowerCase().includes(deviceSearch.toLowerCase());
      });
  }, [allDevices, editingFleet, deviceSearch]);

  // ── Open create dialog ───────────────────────────────────────────
  const openCreate = () => {
    setEditingFleet(null);
    setForm(emptyForm);
    setDeviceSearch('');
    setDialogOpen(true);
  };

  // ── Toggle fleet expansion (lazy-loads full devices) ──────────
  const handleToggleExpand = async (fleetId: string) => {
    if (expandedFleet === fleetId) {
      setExpandedFleet(null);
      setExpandedFleetData(null);
      return;
    }
    setExpandedFleet(fleetId);
    setExpandedFleetData(null);
    setLoadingExpanded(true);
    try {
      const res = await fetch(`/api/fleets/${fleetId}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedFleetData(data);
        // Also update the fleet in the list with full data
        setFleets((prev) => prev.map((f) => f.id === fleetId ? { ...f, devices: data.devices } : f));
      }
    } catch {
      toast.error('Gagal memuat perangkat armada');
    } finally {
      setLoadingExpanded(false);
    }
  };

  // ── Open edit dialog ─────────────────────────────────────────────
  const openEdit = async (fleet: Fleet) => {
    setEditingFleet(fleet);
    setForm({
      name: fleet.name,
      description: fleet.description || '',
      color: fleet.color,
      deviceIds: [],
    });
    setDialogOpen(true);

    // Fetch full fleet with devices
    try {
      const res = await fetch(`/api/fleets/${fleet.id}`);
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          deviceIds: data.devices?.map((d: FleetDevice) => d.id) || [],
        }));
      }
    } catch { /* keep empty */ }
  };

  // ── Toggle device in form ────────────────────────────────────────
  const toggleDevice = (deviceId: string) => {
    setForm((prev) => ({
      ...prev,
      deviceIds: prev.deviceIds.includes(deviceId)
        ? prev.deviceIds.filter((id) => id !== deviceId)
        : [...prev.deviceIds, deviceId],
    }));
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Nama armada wajib diisi');
      return;
    }

    try {
      setSubmitting(true);

      if (editingFleet) {
        const res = await fetch(`/api/fleets/${editingFleet.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            description: form.description || null,
            color: form.color,
            deviceIds: form.deviceIds,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Gagal mengupdate armada');
        }
        toast.success('Armada berhasil diperbarui');
      } else {
        const res = await fetch('/api/fleets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            description: form.description || null,
            color: form.color,
            deviceIds: form.deviceIds,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Gagal menambah armada');
        }
        toast.success('Armada berhasil ditambahkan');
      }

      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/fleets/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus armada');
      }
      toast.success('Armada berhasil dihapus');
      setDeleteTarget(null);
      setExpandedFleet(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setDeleting(false);
    }
  };

  // ── Get device counts by status for a fleet ───────────────────────
  // NOTE: GET /api/fleets returns only 5 devices per fleet (preview),
  // so we use the full devices only when expanded (fetched via GET /api/fleets/:id).
  // For accurate counts, we check if fleet._count is available.
  const getFleetStatusCounts = (fleet: Fleet) => {
    if (!fleet.devices?.length) return { online: 0, idle: 0, offline: 0 };
    return {
      online: fleet.devices.filter((d) => d.status === 'online').length,
      idle: fleet.devices.filter((d) => d.status === 'idle').length,
      offline: fleet.devices.filter((d) => d.status === 'offline').length,
    };
  };

  // ── Render ───────────────────────────────────────────────────────
  const availableDevices = getAvailableDevices();

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Manajemen Armada</h2>
          <Badge variant="secondary" className="text-xs">
            {fleets.length} armada
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari armada..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Tambah Armada
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-3 w-48 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-6 w-14" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredFleets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Building2 className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Belum ada armada</p>
          <p className="text-xs mt-1">Buat armada pertama untuk mengelompokkan perangkat</p>
        </div>
      )}

      {/* Fleet Cards Grid */}
      {!loading && filteredFleets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFleets.map((fleet) => {
            const isExpanded = expandedFleet === fleet.id;
            const counts = getFleetStatusCounts(fleet);
            const totalDevices = fleet._count?.devices ?? fleet.devices?.length ?? 0;

            return (
              <div
                key={fleet.id}
                className="rounded-lg border bg-card overflow-hidden transition-shadow hover:shadow-md"
              >
                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: fleet.color + '18', color: fleet.color }}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{fleet.name}</h3>
                        {fleet.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{fleet.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(fleet)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(fleet)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-1.5 px-4 pb-3">
                    <Badge variant="secondary" className="text-[10px] gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {counts.online} aktif
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {counts.idle} idle
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      {counts.offline} offline
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {totalDevices} perangkat
                    </span>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => handleToggleExpand(fleet.id)}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border-t text-xs text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    {loadingExpanded && !expandedFleetData
                      ? 'Memuat...'
                      : isExpanded
                        ? 'Sembunyikan'
                        : `Lihat ${totalDevices} perangkat`}
                  </button>
                </div>

                {/* Expanded device list */}
                {isExpanded && (
                  <div className="border-t max-h-64 overflow-y-auto">
                    {loadingExpanded && !expandedFleetData ? (
                      <div className="p-4 space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-2.5">
                            <Skeleton className="w-7 h-7 rounded-md" />
                            <div className="flex-1 space-y-1">
                              <Skeleton className="h-3 w-32" />
                              <Skeleton className="h-2 w-20" />
                            </div>
                            <Skeleton className="h-4 w-10" />
                          </div>
                        ))}
                      </div>
                    ) : expandedFleetData?.devices && expandedFleetData.devices.length > 0 ? (
                      expandedFleetData.devices.map((device) => {
                        const status = statusConfig[device.status] || statusConfig.offline;
                        const icon = typeIcons[device.type] || <Package className="w-3.5 h-3.5" />;
                        return (
                          <div
                            key={device.id}
                            className="flex items-center gap-2.5 px-4 py-2.5 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                          >
                            <div
                              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                              style={{ backgroundColor: device.iconColor + '18', color: device.iconColor }}
                            >
                              {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{device.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {typeLabels[device.type] || device.type}
                                {device.user ? ` · ${device.user.name}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {device.lastSpeed > 0 && (
                                <span className="text-[10px] text-muted-foreground">{Math.round(device.lastSpeed)} km/h</span>
                              )}
                              <Badge variant="secondary" className={`text-[9px] h-4 px-1.5 gap-0.5 ${status.className}`}>
                                {status.icon}
                                {status.label}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        Tidak ada perangkat dalam armada ini
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingFleet ? 'Edit Armada' : 'Tambah Armada Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="fleet-name">Nama Armada *</Label>
              <Input
                id="fleet-name"
                placeholder="Contoh: Armada Pengiriman Jakarta"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="fleet-desc">Deskripsi</Label>
              <Textarea
                id="fleet-desc"
                placeholder="Deskripsi armada (opsional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Warna Armada</Label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: form.color === color ? 'var(--foreground)' : 'transparent',
                      boxShadow: form.color === color ? `0 0 0 2px var(--background), 0 0 0 4px ${color}` : 'none',
                    }}
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    aria-label={`Pilih warna ${color}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="custom-fleet-color" className="text-xs text-muted-foreground shrink-0">
                  Kustom:
                </Label>
                <Input
                  id="custom-fleet-color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-8 w-16 p-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Device selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Perangkat ({form.deviceIds.length} dipilih)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => setForm((f) => ({ ...f, deviceIds: availableDevices.map((d) => d.id) }))}
                >
                  Pilih Semua
                </Button>
              </div>
              <Input
                placeholder="Cari perangkat..."
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
                className="h-8 text-xs mb-2"
              />
              <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                {availableDevices.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Tidak ada perangkat tersedia
                  </div>
                ) : (
                  availableDevices.map((device) => {
                    const isSelected = form.deviceIds.includes(device.id);
                    const icon = typeIcons[device.type] || <Package className="w-3.5 h-3.5" />;
                    return (
                      <button
                        key={device.id}
                        type="button"
                        onClick={() => toggleDevice(device.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                          style={{ backgroundColor: device.iconColor + '18', color: device.iconColor }}
                        >
                          {icon}
                        </div>
                        <span className="text-xs font-medium flex-1 truncate">{device.name}</span>
                        <Badge variant="secondary" className="text-[9px] h-4 px-1 gap-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            device.status === 'online' ? 'bg-emerald-500' :
                            device.status === 'idle' ? 'bg-amber-500' : 'bg-gray-400'
                          }`} />
                          {statusConfig[device.status]?.label || device.status}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? 'Menyimpan...'
                : editingFleet
                  ? 'Simpan Perubahan'
                  : 'Tambah Armada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Armada</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus armada{' '}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              Perangkat di dalam armada tidak akan dihapus, hanya dilepaskan dari armada ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
