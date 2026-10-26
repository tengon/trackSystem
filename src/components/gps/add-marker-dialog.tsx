'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGPSStore } from '@/store/gps-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Sparkles, Loader2, Search, X, Navigation, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddMarkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCoords?: { lat: number; lng: number } | null;
  onSuccess?: () => void;
}

interface GeocodeSuggestion {
  id: string;
  title: string;
  display_name: string;
  lat: number;
  lng: number;
}

const CATEGORIES = [
  { value: 'warehouse', label: '🏬 Gudang Logistik', icon: '🏬', defaultColor: '#0ea5e9' },
  { value: 'office', label: '🏢 Kantor Cabang / Pusat', icon: '🏢', defaultColor: '#3b82f6' },
  { value: 'customer', label: '👤 Pelanggan / Toko', icon: '👤', defaultColor: '#10b981' },
  { value: 'gas_station', label: '⛽ SPBU / Pom Bensin', icon: '⛽', defaultColor: '#f59e0b' },
  { value: 'rest_area', label: '🅿️ Rest Area', icon: '🅿️', defaultColor: '#8b5cf6' },
  { value: 'checkpoint', label: '🚩 Pos Pemeriksaan / Checkpoint', icon: '🚩', defaultColor: '#ec4899' },
  { value: 'danger', label: '⚠️ Titik Bahaya / Macet', icon: '⚠️', defaultColor: '#ef4444' },
  { value: 'location', label: '📍 Lokasi Umum', icon: '📍', defaultColor: '#64748b' },
];

const ICONS = ['🏬', '🏢', '👤', '⛽', '🅿️', '🚩', '⚠️', '📍', '📦', '🚛', '🏥', '🏭', '🏪', '🛳️', '✈️'];

const COLORS = [
  { name: 'Biru', value: '#0ea5e9' },
  { name: 'Hijau', value: '#10b981' },
  { name: 'Merah', value: '#ef4444' },
  { name: 'Kuning', value: '#f59e0b' },
  { name: 'Ungu', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Abu-abu', value: '#64748b' },
];

export default function AddMarkerDialog({
  open,
  onOpenChange,
  initialCoords,
  onSuccess,
}: AddMarkerDialogProps) {
  const { addMarker, currentUser, devices } = useGPSStore();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('warehouse');
  const [icon, setIcon] = useState('🏬');
  const [color, setColor] = useState('#0ea5e9');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<string>('-6.1754');
  const [lng, setLng] = useState<string>('106.8272');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Address search autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // When dialog opens or initialCoords change
  useEffect(() => {
    if (!open) return;

    if (initialCoords) {
      setLat(initialCoords.lat.toFixed(6));
      setLng(initialCoords.lng.toFixed(6));
      setName((prev) => (prev ? prev : `Titik Lokasi (${initialCoords.lat.toFixed(4)}, ${initialCoords.lng.toFixed(4)})`));

      // Auto reverse-geocode address
      setIsLoadingAddress(true);
      fetch(`/api/geocode?lat=${initialCoords.lat}&lng=${initialCoords.lng}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && (data.name || data.display_name)) {
            const shortName = data.name || data.display_name.split(',')[0];
            setName(shortName);
            setDescription(data.display_name || '');
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingAddress(false));
    } else {
      // Pick first active device coords or Jakarta default if lat is empty
      const activeDev = devices.find((d) => d.lastLatitude !== null && d.lastLongitude !== null);
      if (activeDev && activeDev.lastLatitude && activeDev.lastLongitude) {
        setLat(activeDev.lastLatitude.toFixed(6));
        setLng(activeDev.lastLongitude.toFixed(6));
      } else {
        setLat('-6.175400');
        setLng('106.827200');
      }
    }
  }, [open, initialCoords, devices]);

  // Debounced address search
  const handleSearchAddress = useCallback((query: string) => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(Array.isArray(data) ? data : []);
          setShowSuggestions(true);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  // Handle category change (sets matching icon and color default)
  const handleCategoryChange = (val: string) => {
    setCategory(val);
    const cat = CATEGORIES.find((c) => c.value === val);
    if (cat) {
      setIcon(cat.icon);
      setColor(cat.defaultColor);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nama penanda wajib diisi');
      return;
    }
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      toast.error('Koordinat Latitude dan Longitude tidak valid');
      return;
    }

    setIsSubmitting(true);
    try {
      const queryParams = new URLSearchParams();
      if (currentUser?.id) queryParams.set('currentUserId', currentUser.id);

      const res = await fetch(`/api/markers?${queryParams.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          icon,
          color,
          description: description.trim() || null,
          latitude,
          longitude,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan penanda');
      }

      const newMarker = await res.json();
      addMarker(newMarker);
      toast.success(`Penanda "${name}" berhasil disimpan ke database!`);

      // Reset and close
      setName('');
      setDescription('');
      setSearchQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-xs"
              style={{ background: color + '20', border: `1px solid ${color}40` }}
            >
              {icon}
            </span>
            Tandai Lokasi di Peta &amp; Simpan ke Database
          </DialogTitle>
          <DialogDescription className="text-xs">
            Cari lokasi, pilih dari armada GPS, atau tentukan koordinat penanda untuk disimpan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-1 text-xs">
          {/* 1. Address Search Autocomplete (OpenStreetMap Nominatim) */}
          <div className="relative">
            <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 mb-1">
              <Search className="w-3.5 h-3.5 text-sky-500" />
              Cari Nama Tempat / Alamat di Peta:
            </label>
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchAddress(e.target.value);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="Ketik nama tempat, misal: Pelabuhan Tanjung Priok..."
                className="h-8 text-xs pl-8 pr-7"
              />
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : null}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-popover border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-border/40">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setLat(item.lat.toFixed(6));
                      setLng(item.lng.toFixed(6));
                      setName(item.title);
                      setDescription(item.display_name);
                      setShowSuggestions(false);
                      setSearchQuery(item.title);
                      toast.success(`Lokasi dipilih: ${item.title}`);
                    }}
                    className="w-full text-left p-2 hover:bg-muted transition-colors flex items-start gap-2 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-sky-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-foreground leading-tight truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight truncate mt-0.5">{item.display_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Quick device coordinate picker */}
          {devices.length > 0 && (
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold block mb-1">
                Atau Ambil Posisi dari Armada GPS:
              </label>
              <Select
                onValueChange={(devId) => {
                  const dev = devices.find((d) => d.id === devId);
                  if (dev && dev.lastLatitude && dev.lastLongitude) {
                    setLat(dev.lastLatitude.toFixed(6));
                    setLng(dev.lastLongitude.toFixed(6));
                    setName(`Posisi ${dev.name}`);
                    toast.success(`Koordinat diambil dari posisi ${dev.name}`);
                  }
                }}
              >
                <SelectTrigger className="h-7 text-xs bg-muted/40">
                  <SelectValue placeholder="🚗 Pilih armada GPS..." />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs">
                      {d.name} ({d.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 3. Coordinates readout */}
          <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-lg border">
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold block mb-0.5">Latitude</label>
              <Input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="-6.175400"
                className="h-7 text-xs font-mono"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold block mb-0.5">Longitude</label>
              <Input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="106.827200"
                className="h-7 text-xs font-mono"
                required
              />
            </div>
          </div>

          {/* 4. Marker Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-foreground">Nama Penanda / Lokasi</label>
              {isLoadingAddress && (
                <span className="text-[10px] text-sky-600 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Mengambil alamat...
                </span>
              )}
            </div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Gudang Bahan Baku Cengkareng"
              className="h-8 text-xs font-medium"
              required
            />
          </div>

          {/* 5. Category */}
          <div>
            <label className="text-[11px] font-bold text-foreground block mb-1">Kategori Lokasi</label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih Kategori" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} className="text-xs">
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 6. Icon Picker */}
          <div>
            <label className="text-[11px] font-bold text-foreground block mb-1">Ikon / Simbol</label>
            <div className="flex flex-wrap gap-1.5 p-1.5 bg-muted/30 rounded-lg border">
              {ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-transform cursor-pointer ${
                    icon === ic
                      ? 'bg-primary text-white scale-110 shadow-xs ring-2 ring-primary/40'
                      : 'hover:bg-muted bg-background border'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Color Picker */}
          <div>
            <label className="text-[11px] font-bold text-foreground block mb-1">Warna Penanda</label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                    color === c.value ? 'scale-125 ring-2 ring-offset-2 ring-foreground' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* 8. Description / Address */}
          <div>
            <label className="text-[11px] font-bold text-foreground block mb-1">Alamat Lengkap / Catatan</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Keterangan tambahan atau rincian kontak lokasi..."
              className="text-xs resize-none h-16"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs font-semibold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Simpan Penanda ke Database
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
