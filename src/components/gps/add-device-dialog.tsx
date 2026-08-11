'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGPSStore } from '@/store/gps-store';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';

const colorOptions = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

export default function AddDeviceDialog() {
  const setSidebarTab = useGPSStore((s) => s.setSidebarTab);
  const setDevices = useGPSStore((s) => s.setDevices);
  const devices = useGPSStore((s) => s.devices);

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'vehicle',
    iconColor: '#22c55e',
    phoneNumber: '',
    imei: '',
    notes: '',
  });

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
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Failed to create device');

      const newDevice = await res.json();
      setDevices([newDevice, ...devices]);
      toast.success(`Perangkat "${form.name}" berhasil ditambahkan`);
      setSidebarTab('devices');
    } catch {
      toast.error('Gagal menambahkan perangkat');
    } finally {
      setLoading(false);
    }
  };

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
        <h3 className="text-sm font-semibold">Tambah Perangkat</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 flex-1">
        <div className="space-y-1.5">
          <Label className="text-xs">Nama Perangkat *</Label>
          <Input
            placeholder="Contoh: Mobil Avanza Hitam"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Tipe</Label>
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
          <div className="flex gap-2">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  form.iconColor === color ? 'border-foreground scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setForm({ ...form, iconColor: color })}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">No. Telepon</Label>
          <Input
            placeholder="+6281234567890"
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">IMEI</Label>
          <Input
            placeholder="IMEI number"
            value={form.imei}
            onChange={(e) => setForm({ ...form, imei: e.target.value })}
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Catatan</Label>
          <Textarea
            placeholder="Catatan tambahan..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="text-xs min-h-[60px]"
          />
        </div>

        <Button type="submit" className="w-full h-8 text-xs" disabled={loading}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          {loading ? 'Menyimpan...' : 'Tambah Perangkat'}
        </Button>
      </form>
    </div>
  );
}
