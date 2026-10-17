import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface TripPoint {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  altitude: number;
  batteryLevel: number;
  timestamp: string;
}

export interface TripStop {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  latitude: number;
  longitude: number;
}

export interface TripSegment {
  id: string;
  tripNumber: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  distanceKm: number;
  maxSpeed: number;
  avgSpeed: number;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  points: TripPoint[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deviceId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const minStopDuration = parseInt(searchParams.get('minStopMinutes') || '3', 10); // default 3 minutes

    const where: Record<string, unknown> = { deviceId };

    const fromDate = fromParam ? new Date(fromParam) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = toParam ? new Date(toParam) : new Date();

    where.timestamp = {
      gte: fromDate,
      lte: toDate,
    };

    // Query sorted chronological location records
    const records = await db.locationRecord.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    });

    if (records.length === 0) {
      return NextResponse.json({
        deviceId,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
        movingDurationMinutes: 0,
        stoppedDurationMinutes: 0,
        maxSpeed: 0,
        avgSpeed: 0,
        trips: [],
        stops: [],
        allPoints: [],
      });
    }

    const allPoints: TripPoint[] = records.map((r) => ({
      lat: r.latitude,
      lng: r.longitude,
      speed: Math.round(r.speed * 10) / 10,
      heading: r.heading,
      altitude: r.altitude,
      batteryLevel: r.batteryLevel,
      timestamp: r.timestamp.toISOString(),
    }));

    // Calculate overall stats & segment into trips and stops
    const trips: TripSegment[] = [];
    const stops: TripStop[] = [];

    let currentTripPoints: TripPoint[] = [];
    let currentStopCandidate: { startTime: Date; endTime: Date; lat: number; lng: number } | null = null;

    let totalDistanceKm = 0;
    let maxOverallSpeed = 0;
    let totalSpeedSum = 0;
    let movingSpeedCount = 0;

    for (let i = 0; i < allPoints.length; i++) {
      const pt = allPoints[i];
      const ptDate = new Date(pt.timestamp);

      if (pt.speed > maxOverallSpeed) maxOverallSpeed = pt.speed;
      if (pt.speed > 3) {
        totalSpeedSum += pt.speed;
        movingSpeedCount++;
      }

      if (i > 0) {
        const prevPt = allPoints[i - 1];
        const dist = getDistanceKm(prevPt.lat, prevPt.lng, pt.lat, pt.lng);
        // Discard GPS jitter jumps (e.g. > 150 km/h jump)
        const timeDiffHours = (ptDate.getTime() - new Date(prevPt.timestamp).getTime()) / (1000 * 3600);
        if (timeDiffHours > 0) {
          const impliedSpeed = dist / timeDiffHours;
          if (impliedSpeed < 200) {
            totalDistanceKm += dist;
          }
        } else {
          totalDistanceKm += dist;
        }
      }

      const isStationary = pt.speed < 3; // Stationary threshold: < 3 km/h

      if (isStationary) {
        if (!currentStopCandidate) {
          currentStopCandidate = { startTime: ptDate, endTime: ptDate, lat: pt.lat, lng: pt.lng };
        } else {
          currentStopCandidate.endTime = ptDate;
        }

        const stopMinutes = (currentStopCandidate.endTime.getTime() - currentStopCandidate.startTime.getTime()) / (1000 * 60);

        // If stationary duration exceeds threshold and we had an active moving trip, close current trip
        if (stopMinutes >= minStopDuration && currentTripPoints.length > 1) {
          const tripStart = new Date(currentTripPoints[0].timestamp);
          const tripEnd = new Date(currentTripPoints[currentTripPoints.length - 1].timestamp);
          const durationMin = Math.max(1, Math.round((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60)));

          let tripDist = 0;
          let tripMaxSpeed = 0;
          let tripSpeedSum = 0;
          let tripMovingCount = 0;

          for (let j = 1; j < currentTripPoints.length; j++) {
            const p1 = currentTripPoints[j - 1];
            const p2 = currentTripPoints[j];
            tripDist += getDistanceKm(p1.lat, p1.lng, p2.lat, p2.lng);
            if (p2.speed > tripMaxSpeed) tripMaxSpeed = p2.speed;
            if (p2.speed > 3) {
              tripSpeedSum += p2.speed;
              tripMovingCount++;
            }
          }

          if (tripDist >= 0.05) { // Only record if moved at least 50 meters
            trips.push({
              id: `trip-${trips.length + 1}`,
              tripNumber: trips.length + 1,
              startTime: tripStart.toISOString(),
              endTime: tripEnd.toISOString(),
              durationMinutes: durationMin,
              distanceKm: Math.round(tripDist * 100) / 100,
              maxSpeed: Math.round(tripMaxSpeed),
              avgSpeed: tripMovingCount > 0 ? Math.round(tripSpeedSum / tripMovingCount) : 0,
              startLocation: { lat: currentTripPoints[0].lat, lng: currentTripPoints[0].lng },
              endLocation: {
                lat: currentTripPoints[currentTripPoints.length - 1].lat,
                lng: currentTripPoints[currentTripPoints.length - 1].lng,
              },
              points: [...currentTripPoints],
            });
          }

          currentTripPoints = [];
        }
      } else {
        // Vehicle is moving
        if (currentStopCandidate) {
          const stopDurationMin = Math.round(
            (currentStopCandidate.endTime.getTime() - currentStopCandidate.startTime.getTime()) / (1000 * 60)
          );
          if (stopDurationMin >= minStopDuration) {
            stops.push({
              id: `stop-${stops.length + 1}`,
              startTime: currentStopCandidate.startTime.toISOString(),
              endTime: currentStopCandidate.endTime.toISOString(),
              durationMinutes: stopDurationMin,
              latitude: currentStopCandidate.lat,
              longitude: currentStopCandidate.lng,
            });
          }
          currentStopCandidate = null;
        }

        currentTripPoints.push(pt);
      }
    }

    // Flush last trip if still running
    if (currentTripPoints.length > 1) {
      const tripStart = new Date(currentTripPoints[0].timestamp);
      const tripEnd = new Date(currentTripPoints[currentTripPoints.length - 1].timestamp);
      const durationMin = Math.max(1, Math.round((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60)));

      let tripDist = 0;
      let tripMaxSpeed = 0;
      let tripSpeedSum = 0;
      let tripMovingCount = 0;

      for (let j = 1; j < currentTripPoints.length; j++) {
        const p1 = currentTripPoints[j - 1];
        const p2 = currentTripPoints[j];
        tripDist += getDistanceKm(p1.lat, p1.lng, p2.lat, p2.lng);
        if (p2.speed > tripMaxSpeed) tripMaxSpeed = p2.speed;
        if (p2.speed > 3) {
          tripSpeedSum += p2.speed;
          tripMovingCount++;
        }
      }

      trips.push({
        id: `trip-${trips.length + 1}`,
        tripNumber: trips.length + 1,
        startTime: tripStart.toISOString(),
        endTime: tripEnd.toISOString(),
        durationMinutes: durationMin,
        distanceKm: Math.round(tripDist * 100) / 100,
        maxSpeed: Math.round(tripMaxSpeed),
        avgSpeed: tripMovingCount > 0 ? Math.round(tripSpeedSum / tripMovingCount) : 0,
        startLocation: { lat: currentTripPoints[0].lat, lng: currentTripPoints[0].lng },
        endLocation: {
          lat: currentTripPoints[currentTripPoints.length - 1].lat,
          lng: currentTripPoints[currentTripPoints.length - 1].lng,
        },
        points: [...currentTripPoints],
      });
    }

    // Flush last stop if ended stationary
    if (currentStopCandidate) {
      const stopDurationMin = Math.round(
        (currentStopCandidate.endTime.getTime() - currentStopCandidate.startTime.getTime()) / (1000 * 60)
      );
      if (stopDurationMin >= minStopDuration) {
        stops.push({
          id: `stop-${stops.length + 1}`,
          startTime: currentStopCandidate.startTime.toISOString(),
          endTime: currentStopCandidate.endTime.toISOString(),
          durationMinutes: stopDurationMin,
          latitude: currentStopCandidate.lat,
          longitude: currentStopCandidate.lng,
        });
      }
    }

    // If no distinct trips were segmented because device barely moved or was one continuous trip:
    if (trips.length === 0 && allPoints.length > 0) {
      const tripStart = new Date(allPoints[0].timestamp);
      const tripEnd = new Date(allPoints[allPoints.length - 1].timestamp);
      const durationMin = Math.max(1, Math.round((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60)));

      trips.push({
        id: 'trip-1',
        tripNumber: 1,
        startTime: tripStart.toISOString(),
        endTime: tripEnd.toISOString(),
        durationMinutes: durationMin,
        distanceKm: Math.round(totalDistanceKm * 100) / 100,
        maxSpeed: Math.round(maxOverallSpeed),
        avgSpeed: movingSpeedCount > 0 ? Math.round(totalSpeedSum / movingSpeedCount) : 0,
        startLocation: { lat: allPoints[0].lat, lng: allPoints[0].lng },
        endLocation: { lat: allPoints[allPoints.length - 1].lat, lng: allPoints[allPoints.length - 1].lng },
        points: allPoints,
      });
    }

    const firstTime = new Date(allPoints[0].timestamp).getTime();
    const lastTime = new Date(allPoints[allPoints.length - 1].timestamp).getTime();
    const totalDurationMinutes = Math.max(1, Math.round((lastTime - firstTime) / (1000 * 60)));

    const movingDurationMinutes = trips.reduce((acc, t) => acc + t.durationMinutes, 0);
    const stoppedDurationMinutes = stops.reduce((acc, s) => acc + s.durationMinutes, 0);
    const avgOverallSpeed = movingSpeedCount > 0 ? Math.round(totalSpeedSum / movingSpeedCount) : 0;

    return NextResponse.json({
      deviceId,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      totalDurationMinutes,
      movingDurationMinutes,
      stoppedDurationMinutes,
      maxSpeed: Math.round(maxOverallSpeed),
      avgSpeed: avgOverallSpeed,
      trips,
      stops,
      allPoints,
    });
  } catch (error) {
    console.error('Error calculating trips:', error);
    return NextResponse.json({ error: 'Failed to calculate trips' }, { status: 500 });
  }
}
