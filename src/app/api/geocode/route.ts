import { NextRequest, NextResponse } from 'next/server';

// In-memory cache to prevent hitting Nominatim rate limits and make autocomplete ultra-fast
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim();
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    // 1. Reverse Geocoding (Coordinates -> Address)
    if (lat && lng) {
      const cacheKey = `rev:${lat},${lng}`;
      const cached = cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return NextResponse.json(cached.data);
      }

      const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;
      const res = await fetch(reverseUrl, {
        headers: {
          'User-Agent': 'GPSTrackerFleetApp/1.0 (contact@gpstracker.local)',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        },
      });

      if (!res.ok) {
        return NextResponse.json({ display_name: `${lat}, ${lng}` });
      }

      const data = await res.json();
      const result = {
        display_name: data.display_name || `${lat}, ${lng}`,
        name: data.name || data.address?.road || data.address?.suburb || `${lat}, ${lng}`,
        lat: Number(data.lat),
        lng: Number(data.lon),
      };

      cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
      return NextResponse.json(result);
    }

    // 2. Forward Geocoding (Search query -> List of matching addresses)
    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const cacheKey = `search:${query.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return NextResponse.json(cached.data);
    }

    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=id&limit=6&addressdetails=1`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'GPSTrackerFleetApp/1.0 (contact@gpstracker.local)',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      },
    });

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const items = await res.json();
    if (!Array.isArray(items)) {
      return NextResponse.json([]);
    }

    const results = items.map((item: {
      place_id: number;
      display_name: string;
      name?: string;
      lat: string;
      lon: string;
      type?: string;
      address?: {
        road?: string;
        suburb?: string;
        city?: string;
        town?: string;
        state?: string;
      };
    }) => {
      // Build a clean, readable short title
      const shortTitle = item.name || item.address?.road || item.address?.suburb || item.display_name.split(',')[0];
      return {
        id: String(item.place_id),
        title: shortTitle,
        display_name: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
        type: item.type || 'place',
      };
    });

    cache.set(cacheKey, { data: results, expiry: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(results);
  } catch (error) {
    console.error('Geocode API error:', error);
    return NextResponse.json([], { status: 200 }); // Return empty array gracefully on network/rate-limit issues
  }
}
