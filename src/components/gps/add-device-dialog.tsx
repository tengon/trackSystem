'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGPSStore } from '@/store/gps-store';
import { ArrowLeft, Plus, Cpu, Radio, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  TELTONIKA_DEVICE_MODELS,
  getTeltonikaModel,
  getTeltonikaModelsGrouped,
} from '@/lib/teltonika-models';

const colorOptions = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AddDeviceDialog() {
  const setSidebarTab = useGPSStore((s) => s.setSidebarTab);
  const setDevices = useGPSStore((s) => s.setDevices);
  const devices = useGPSStore((s) => s.devices);

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [form, setForm] = useState({
    name: 'Teltonika FMC920',
    model: 'FMC920',
    type: 'vehicle',
    iconColor: '#22c55e',
    phoneNumber: '',
    imei: '',
    notes: '',
    userId: '__none__',
  });

  const selectedModel = getTeltonikaModel(form.model);

  // Fetch users for the dropdown
  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(() => {});
  }, []);

  const handleModelChange = (modelId: string) => {
    const info = getTeltonikaModel(modelId);
    setForm((prev) => {
      const isDefaultName =
        !prev.name ||
        prev.name === 'Teltonika FMC920' ||
        TELTONIKA_DEVICE_MODELS.some((m) => m.fullName === prev.name || m.label === prev.name);

      return {
        ...prev,
        model: modelId,
        type: info.defaultType,
        iconColor: info.defaultColor,
        name: isDefaultName ? info.fullName : prev.name,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Nama perangkat wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          userId: form.userId === '__none__' ? null : form.userId,
        }),
      });

      if (!res.ok) throw new Error('Failed to create device');

      const newDevice = await res.json();
      setDevices([newDevice, ...devices]);
      toast.success(`Perangkat Teltonika ${form.model} "${form.name}" berhasil ditambahkan`);
      setSidebarTab('devices');
    } catch {
      toast.error('Gagal menambahkan perangkat');
    } finally {
      setLoading(false);
    }
  };

  const groupedModels = getTeltonikaModelsGrouped();

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setSidebarTab('devices')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h3 className="text-sm font-semibold">Tambah Perangkat</h3>
          <p className="text-[10px] text-muted-foreground">Konfigurasi Pelacak GPS Teltonika</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 flex-1 overflow-y-auto pr-1">
        {/* Teltonika Hardware Model Dropdown */}
        <div className="space-y-1.5 p-2.5 rounded-lg border bg-muted/20 border-primary/20">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold flex items-center gap-1.5 text-primary">
              <Cpu className="w-3.5 h-3.5" />
              Jenis / Tipe / Seri Teltonika *
            </Label>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/40 text-primary">
              {selectedModel.recommendedCodec}
            </Badge>
          </div>

          <Select value={form.model} onValueChange={handleModelChange}>
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue placeholder="Pilih tipe/seri Teltonika" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {Object.entries(groupedModels).map(([category, models]) => (
                <div key={category} className="py-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 rounded-sm mb-1">
                    {category}
                  </div>
                  {models.map((m) => (
                    <SelectItem key={m.model} value={m.model} className="text-xs">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="font-medium text-foreground">{m.label}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {m.connectivity}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>

          {/* Model info snippet */}
          <div className="pt-1 text-[10px] space-y-1 text-muted-foreground">
            <p className="line-clamp-2 leading-tight">{selectedModel.description}</p>
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[9px] font-medium text-foreground">
                <Radio className="w-2.5 h-2.5 text-primary" /> {selectedModel.connectivity}
              </span>
              {selectedModel.hasBle && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[9px] font-medium text-foreground">
                  BLE 4.0
                </span>
              )}
              {selectedModel.hasCanbus && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-medium">
                  CAN-bus / OBD
                </span>
              )}
              {selectedModel.backupBattery && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-medium">
                  <ShieldCheck className="w-2.5 h-2.5" /> Baterai Cadangan
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Nama Perangkat *</Label>
          <Input
            placeholder="Contoh: Teltonika FMC920 Avanza"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Ditugaskan ke User</Label>
          <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Pilih user (opsional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Tanpa User</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Kategori Objek</Label>
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vehicle">Kendaraan</SelectItem>
              <SelectItem value="person">Orang</SelectItem>
              <SelectItem value="pet">Hewan Peliharaan</SelectItem>
              <SelectItem value="asset">Aset</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Warna Ikon</Label>
          <div className="flex gap-2 flex-wrap">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  form.iconColor === color ? 'border-foreground scale-110 ring-2 ring-primary/40' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setForm({ ...form, iconColor: color })}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">IMEI Teltonika</Label>
          <Input
            placeholder="15 digit nomor IMEI (cth: 35645008...)"
            value={form.imei}
            onChange={(e) => setForm({ ...form, imei: e.target.value })}
            className="h-8 text-xs font-mono"
            maxLength={18}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">No. Telepon SIM Card</Label>
          <Input
            placeholder="+6281234567890"
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Catatan</Label>
          <Textarea
            placeholder="Catatan tambahan (pemasangan, nomor polisi, dll)..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="text-xs min-h-[55px]"
          />
        </div>

        <Button type="submit" className="w-full h-8 text-xs font-medium" disabled={loading}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          {loading ? 'Menyimpan...' : 'Tambah Perangkat Teltonika'}
        </Button>
      </form>
    </div>
  );
}
