'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGPSStore } from '@/store/gps-store';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  Shield,
  ShieldCheck,
  UserIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  name: string;
  email: string;
  role: string;
  password: string;
  active: boolean;
}

const emptyForm: UserFormData = {
  name: '',
  email: '',
  role: 'user',
  password: '',
  active: true,
};

// ── Helpers ─────────────────────────────────────────────────────────
const roleBadge: Record<string, { label: string; className: string }> = {
  super_admin: { label: 'Super Admin', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  admin: { label: 'Admin', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  user: { label: 'Pengguna', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' },
};

const roleIcons: Record<string, React.ReactNode> = {
  super_admin: <ShieldCheck className="w-4 h-4 text-red-600" />,
  admin: <Shield className="w-4 h-4 text-blue-600" />,
  user: <UserIcon className="w-4 h-4 text-gray-500" />,
};

// ── Component ───────────────────────────────────────────────────────
export default function UserManagementPanel() {
  const currentUser = useGPSStore((s) => s.currentUser);
  const canManage = currentUser?.role === 'super_admin';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch users ──────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/users${params}`);
      if (!res.ok) throw new Error('Gagal memuat pengguna');
      const data = await res.json();
      setUsers(data);
    } catch {
      toast.error('Gagal memuat daftar pengguna');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Filtered list (client-side search fallback) ─────────────────
  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  // ── Open create dialog ───────────────────────────────────────────
  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  // ── Open edit dialog ─────────────────────────────────────────────
  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
      active: user.active,
    });
    setDialogOpen(true);
  };

  // ── Submit (create or update) ────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Nama wajib diisi');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Email wajib diisi');
      return;
    }
    if (!editingUser && !form.password.trim()) {
      toast.error('Kata sandi wajib diisi untuk pengguna baru');
      return;
    }

    try {
      setSubmitting(true);

      if (editingUser) {
        // Update
        const payload: Record<string, unknown> = {
          id: editingUser.id,
          name: form.name,
          email: form.email,
          role: form.role,
          active: form.active,
        };
        if (form.password.trim()) {
          payload.password = form.password;
        }
        const res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Gagal mengupdate pengguna');
        }
        toast.success('Pengguna berhasil diperbarui');
      } else {
        // Create
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Gagal menambah pengguna');
        }
        toast.success('Pengguna berhasil ditambahkan');
      }

      setDialogOpen(false);
      fetchUsers();
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
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Gagal menghapus pengguna');
      }
      toast.success('Pengguna berhasil dihapus');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Manajemen Pengguna</h2>
          <Badge variant="secondary" className="text-xs">
            {users.length} pengguna
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          {canManage && (
            <Button onClick={openCreate} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              Tambah Pengguna
            </Button>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="rounded-lg border bg-card">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Tidak ada pengguna ditemukan</p>
          <p className="text-xs mt-1">Coba ubah kata kunci pencarian</p>
        </div>
      )}

      {/* Desktop table */}
      {!loading && filteredUsers.length > 0 && (
        <>
          {/* Desktop: Table view */}
          <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-48">Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-32">Role</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  {canManage && <TableHead className="w-28 text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const badge = roleBadge[user.role] || roleBadge.user;
                  return (
                    <TableRow key={user.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={badge.className}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? 'default' : 'outline'} className="text-xs">
                          {user.active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(user)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(user)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Card view */}
          <div className="md:hidden space-y-3">
            {filteredUsers.map((user) => {
              const badge = roleBadge[user.role] || roleBadge.user;
              return (
                <div
                  key={user.id}
                  className="rounded-lg border bg-card p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        {roleIcons[user.role] || roleIcons.user}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant={user.active ? 'default' : 'outline'} className="text-[11px]">
                      {user.active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className={badge.className}>
                      {badge.label}
                    </Badge>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(user)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </Button>
                      </div>
                    )}
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
              {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="user-name">Nama</Label>
              <Input
                id="user-name"
                placeholder="Masukkan nama lengkap"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="contoh@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger id="user-role">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-red-600" />
                      Super Admin
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      Admin
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-gray-500" />
                      Pengguna
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-password">
                Kata Sandi {editingUser && '(kosongkan jika tidak diubah)'}
              </Label>
              <Input
                id="user-password"
                type="password"
                placeholder={editingUser ? 'Kosongkan jika tidak diubah' : 'Masukkan kata sandi'}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>Status Aktif</Label>
                <p className="text-xs text-muted-foreground">
                  Nonaktifkan untuk menonaktifkan akses
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
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
                : editingUser
                  ? 'Simpan Perubahan'
                  : 'Tambah Pengguna'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengguna</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengguna{' '}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? 
              Tindakan ini tidak dapat dibatalkan.
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
