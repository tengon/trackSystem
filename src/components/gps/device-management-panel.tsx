'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Truck,
  MapPin,
  Smartphone,
  Package,
  Dog,
  Circle,
  Wifi,
  WifiOff,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ───────────────────────────────────────────────────────────
interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
  iconColor: string;
  phoneNumber: string | null;
  imei: string | null;
  notes: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastSpeed: number;
  batteryLevel: number;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string; role: string };
  _count?: { alerts: number };
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DeviceFormData {
  name: string;
  type: string;
  iconColor: string;
  phoneNumber: string;
  imei: string;
  notes: string;
  userId: string;
}

const emptyForm: DeviceFormData = {
  name: '',
  type: 'vehicle',
  iconColor: '#22c55e',
  phoneNumber: '',
  imei: '',
  notes: '',
  userId: '',
};

// ── Constants ───────────────────────────────────────────────────────
const typeLabels: Record<string, string> = {
  vehicle: 'Kendaraan',
  person: 'Orang',
  pet: 'Hewan',
  asset: 'Aset',
};

const typeIcons: Record<string, React.ReactNode> = {
  vehicle: <Truck className="w-4 h-4" />,
  person: <Smartphone className="w-4 h-4" />,
  pet: <Dog className="w-4 h-4" />,
  asset: <Package className="w-4 h-4" />,
};

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  online: {
    label: 'Online',
    className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    icon: <Wifi className="w-3 h-3" />,
  },
  offline: {
    label: 'Offline',
    className: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
    icon: <WifiOff className="w-3 h-3" />,
  },
  idle: {
    label: 'Idle',
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
    icon: <Clock className="w-3 h-3" />,
  },
};

const colorPresets = [
  '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

// ── Component ───────────────────────────────────────────────────────
export default function DeviceManagementPanel() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [form, setForm] = useState<DeviceFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch users ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setUsers(data); })
      .catch(() => {});
  }, []);

  // ── Fetch devices ────────────────────────────────────────────────
  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/devices${params}`);
      if (!res.ok) throw new Error('Gagal memuat perangkat');
      const data = await res.json();
      setDevices(data);
    } catch {
      toast.error('Gagal memuat daftar perangkat');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // ── Client-side filter ───────────────────────────────────────────
  const filteredDevices = devices.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.imei && d.imei.toLowerCase().includes(q)) ||
      (d.phoneNumber && d.phoneNumber.toLowerCase().includes(q))
    );
  });

  // ── Open create dialog ───────────────────────────────────────────
  const openCreate = () => {
    setEditingDevice(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  // ── Open edit dialog ─────────────────────────────────────────────
  const openEdit = (device: Device) => {
    setEditingDevice(device);
    setForm({
      name: device.name,
      type: device.type,
      iconColor: device.iconColor,
      phoneNumber: device.phoneNumber || '',
      imei: device.imei || '',
      notes: device.notes || '',
      userId: device.userId || '',
    });
    setDialogOpen(true);
  };

  // ── Submit (create or update) ────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Nama perangkat wajib diisi');
      return;
    }

    try {
      setSubmitting(true);

      if (editingDevice) {
        const res = await fetch(`/api/devices/${editingDevice.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Gagal mengupdate perangkat');
        }
        toast.success('Perangkat berhasil diperbarui');
      } else {
        const res = await fetch('/api/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Gagal menambah perangkat');
        }
        toast.success('Perangkat berhasil ditambahkan');
      }

      setDialogOpen(false);
      fetchDevices();
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
      const res = await fetch(`/api/devices/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus perangkat');
      }
      toast.success('Perangkat berhasil dihapus');
      setDeleteTarget(null);
      fetchDevices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Manajemen Perangkat</h2>
          <Badge variant="secondary" className="text-xs">
            {devices.length} perangkat
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, IMEI, atau No. HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Tambah Perangkat
          </Button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="rounded-lg border bg-card">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredDevices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Truck className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Tidak ada perangkat ditemukan</p>
          <p className="text-xs mt-1">Coba ubah kata kunci pencarian atau tambahkan perangkat baru</p>
        </div>
      )}

      {/* Content */}
      {!loading && filteredDevices.length > 0 && (
        <>
          {/* Desktop: Table view */}
          <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-44">Nama</TableHead>
                  <TableHead className="w-28">User</TableHead>
                  <TableHead className="w-24">Tipe</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                  <TableHead className="hidden xl:table-cell">IMEI</TableHead>
                  <TableHead className="hidden xl:table-cell">No. HP</TableHead>
                  <TableHead className="w-28 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((device) => {
                  const typeIcon = typeIcons[device.type] || <Package className="w-4 h-4" />;
                  const statusCfg = statusConfig[device.status] || statusConfig.offline;
                  return (
                    <TableRow key={device.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: device.iconColor + '18', color: device.iconColor }}
                          >
                            {typeIcon}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{device.name}</p>
                            {device._count && device._count.alerts > 0 && (
                              <p className="text-[11px] text-destructive">
                                {device._count.alerts} notifikasi belum dibaca
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {device.user ? (
                          <span className="text-sm text-muted-foreground">{device.user.name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground/50">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          {typeIcon}
                          {typeLabels[device.type] || device.type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`gap-1 ${statusCfg.className}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">
                        {device.imei || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {device.phoneNumber || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(device)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(device)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Card view */}
          <div className="md:hidden space-y-3">
            {filteredDevices.map((device) => {
              const typeIcon = typeIcons[device.type] || <Package className="w-4 h-4" />;
              const statusCfg = statusConfig[device.status] || statusConfig.offline;
              return (
                <div key={device.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: device.iconColor + '18', color: device.iconColor }}
                      >
                        {typeIcon}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{device.name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          {typeIcon}
                          {typeLabels[device.type] || device.type}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`gap-1 text-[11px] ${statusCfg.className}`}>
                      {statusCfg.icon}
                      {statusCfg.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">User: </span>
                      <span>{device.user?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">IMEI: </span>
                      <span className="font-mono">{device.imei || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">No. HP: </span>
                      <span>{device.phoneNumber || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-1 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => openEdit(device)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(device)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDevice ? 'Edit Perangkat' : 'Tambah Perangkat Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="device-name">Nama Perangkat</Label>
              <Input
                id="device-name"
                placeholder="Contoh: Mobil Avanza B 1234 XY"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-user">Ditugaskan ke User</Label>
              <Select
                value={form.userId}
                onValueChange={(v) => setForm((f) => ({ ...f, userId: v }))}
              >
                <SelectTrigger id="device-user">
                  <SelectValue placeholder="Pilih user (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tanpa User</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-type">Tipe</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger id="device-type">
                  <SelectValue placeholder="Pilih tipe perangkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vehicle">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Kendaraan
                    </div>
                  </SelectItem>
                  <SelectItem value="person">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Orang
                    </div>
                  </SelectItem>
                  <SelectItem value="pet">
                    <div className="flex items-center gap-2">
                      <Dog className="w-4 h-4" />
                      Hewan
                    </div>
                  </SelectItem>
                  <SelectItem value="asset">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Aset
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Warna Ikon</Label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: form.iconColor === color ? 'var(--foreground)' : 'transparent',
                      boxShadow: form.iconColor === color ? `0 0 0 2px var(--background), 0 0 0 4px ${color}` : 'none',
                    }}
                    onClick={() => setForm((f) => ({ ...f, iconColor: color }))}
                    aria-label={`Pilih warna ${color}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="custom-color" className="text-xs text-muted-foreground shrink-0">
                  Kustom:
                </Label>
                <Input
                  id="custom-color"
                  type="color"
                  value={form.iconColor}
                  onChange={(e) => setForm((f) => ({ ...f, iconColor: e.target.value }))}
                  className="h-8 w-16 p-1 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-imei">IMEI</Label>
              <Input
                id="device-imei"
                placeholder="Masukkan nomor IMEI"
                value={form.imei}
                onChange={(e) => setForm((f) => ({ ...f, imei: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-phone">No. HP</Label>
              <Input
                id="device-phone"
                placeholder="Contoh: 08123456789"
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-notes">Catatan</Label>
              <Textarea
                id="device-notes"
                placeholder="Catatan tambahan (opsional)"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? 'Menyimpan...'
                : editingDevice
                  ? 'Simpan Perubahan'
                  : 'Tambah Perangkat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Perangkat</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus perangkat{' '}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? 
              Semua data lokasi, geofence, dan notifikasi terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
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
