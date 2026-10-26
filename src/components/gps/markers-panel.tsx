'use client';

import { useState, useMemo } from 'react';
import { useGPSStore, type MapMarkerItem } from '@/store/gps-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Plus, Trash2, Navigation, Compass, ExternalLink } from 'lucide-react';
import AddMarkerDialog from '@/components/gps/add-marker-dialog';
import { toast } from 'sonner';

export default function MarkersPanel() {
  const { markers, deleteMarker, setActiveNavTab, setPendingRouteTarget } = useGPSStore();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredMarkers = useMemo(() => {
    if (!search.trim()) return markers;
    const q = search.toLowerCase();
    return markers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }, [markers, search]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus penanda "${name}"?`)) return;
    try {
      const res = await fetch(`/api/markers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        deleteMarker(id);
        toast.success(`Penanda "${name}" berhasil dihapus`);
      } else {
        toast.error('Gagal menghapus penanda');
      }
    } catch {
      toast.error('Gagal menghapus penanda');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Top Header & Search */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="font-bold text-sm text-foreground">Penanda Peta</h3>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
              {markers.length}
            </Badge>
          </div>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-7 text-xs font-semibold gap-1 bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah
          </Button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama lokasi atau kategori..."
            className="h-7 text-xs pl-8"
          />
        </div>
      </div>

      {/* Markers List */}
      <ScrollArea className="flex-1 pr-1">
        {filteredMarkers.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <span className="text-3xl block">📍</span>
            <p className="text-xs font-medium">Belum ada penanda peta tersimpan</p>
            <p className="text-[10px] text-muted-foreground/80 max-w-[200px] mx-auto">
              Tandai lokasi gudang, pelanggan, atau pos penting di peta untuk disimpan ke database.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(true)}
              className="h-7 text-xs gap-1 mt-2"
            >
              <Plus className="w-3 h-3" /> Tandai Sekarang
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMarkers.map((m) => (
              <div
                key={m.id}
                className="group p-2.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors shadow-xs relative"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 shadow-2xs"
                    style={{ background: m.color + '15', border: `1px solid ${m.color}35` }}
                  >
                    {m.icon || '📍'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold text-xs text-foreground truncate">{m.name}</p>
                      <button
                        onClick={() => handleDelete(m.id, m.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-600 transition-opacity"
                        title="Hapus Penanda"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {m.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {m.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-border/40">
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                      </span>
                      <button
                        onClick={() => {
                          setPendingRouteTarget({ name: m.name, lat: m.latitude, lng: m.longitude });
                          setActiveNavTab('route');
                          toast.info(`Buka rute menuju ${m.name}`);
                        }}
                        className="text-[10px] text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
                      >
                        <Navigation className="w-2.5 h-2.5" /> Rute
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Add Marker Dialog */}
      <AddMarkerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
