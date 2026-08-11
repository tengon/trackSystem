import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const httpServer = createServer();
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Jakarta area bounds for simulation
const JAKARTA = {
  latMin: -6.35, latMax: -6.08,
  lngMin: 106.68, lngMax: 107.00,
};

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// Track simulated device movements
const devicePositions = new Map<string, { lat: number; lng: number; speed: number; heading: number; battery: number }>();

// Load initial device positions from DB
async function loadDevicePositions() {
  const devices = await db.device.findMany({
    where: { status: { in: ['online', 'idle'] } },
    select: { id: true, lastLatitude: true, lastLongitude: true, lastSpeed: true, lastHeading: true, batteryLevel: true, type: true },
  });

  for (const device of devices) {
    if (device.lastLatitude !== null && device.lastLongitude !== null) {
      devicePositions.set(device.id, {
        lat: device.lastLatitude,
        lng: device.lastLongitude,
        speed: device.lastSpeed,
        heading: device.lastHeading,
        battery: device.batteryLevel,
      });
    }
  }

  console.log(`Loaded ${devicePositions.size} device positions`);
}

// Simulate device movement for a single device
function simulateMovement(deviceId: string, pos: { lat: number; lng: number; speed: number; heading: number; battery: number }) {
  const speed = pos.speed > 5 ? pos.speed + randomInRange(-3, 3) : randomInRange(0, 60);
  const heading = pos.heading + randomInRange(-20, 20);
  const headingRad = (heading * Math.PI) / 180;
  const distance = (speed * 0.001) / 111.32; // rough km to degrees

  const newLat = clamp(pos.lat + Math.cos(headingRad) * distance, JAKARTA.latMin, JAKARTA.latMax);
  const newLng = clamp(pos.lng + Math.sin(headingRad) * distance / Math.cos((pos.lat * Math.PI) / 180), JAKARTA.lngMin, JAKARTA.lngMax);
  const newBattery = Math.max(5, pos.battery - randomInRange(0, 0.1));
  const newSpeed = Math.max(0, speed);
  const newHeading = ((heading % 360) + 360) % 360;

  return { lat: newLat, lng: newLng, speed: newSpeed, heading: newHeading, battery: newBattery };
}

// Main simulation loop
let simulationInterval: ReturnType<typeof setInterval> | null = null;

function startSimulation() {
  if (simulationInterval) return;

  simulationInterval = setInterval(async () => {
    const updates: Array<{
      deviceId: string;
      latitude: number;
      longitude: number;
      speed: number;
      heading: number;
      batteryLevel: number;
      accuracy: number;
      timestamp: string;
    }> = [];

    for (const [deviceId, pos] of devicePositions.entries()) {
      const newPos = simulateMovement(deviceId, pos);
      devicePositions.set(deviceId, newPos);

      const update = {
        deviceId,
        latitude: newPos.lat,
        longitude: newPos.lng,
        speed: Math.round(newPos.speed * 10) / 10,
        heading: Math.round(newPos.heading),
        batteryLevel: Math.round(newPos.battery),
        accuracy: Math.round(randomInRange(5, 25)),
        timestamp: new Date().toISOString(),
      };

      updates.push(update);

      // Save to DB (throttled - only every 5th update per device)
      if (Math.random() < 0.2) {
        try {
          await db.locationRecord.create({
            data: {
              deviceId,
              latitude: newPos.lat,
              longitude: newPos.lng,
              speed: newPos.speed,
              heading: newPos.heading,
              batteryLevel: Math.round(newPos.battery),
              accuracy: randomInRange(5, 25),
            },
          });

          await db.device.update({
            where: { id: deviceId },
            data: {
              lastLatitude: newPos.lat,
              lastLongitude: newPos.lng,
              lastSpeed: newPos.speed,
              lastHeading: newPos.heading,
              batteryLevel: Math.round(newPos.battery),
              status: newPos.speed > 2 ? 'online' : 'idle',
            },
          });
        } catch (err) {
          console.error(`Error saving location for ${deviceId}:`, err);
        }
      }
    }

    if (updates.length > 0) {
      io.emit('location-updates', updates);
    }
  }, 3000); // Update every 3 seconds
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send current positions on connect
  const currentPositions = Array.from(devicePositions.entries()).map(([deviceId, pos]) => ({
    deviceId,
    latitude: pos.lat,
    longitude: pos.lng,
    speed: Math.round(pos.speed * 10) / 10,
    heading: Math.round(pos.heading),
    batteryLevel: Math.round(pos.battery),
    timestamp: new Date().toISOString(),
  }));

  socket.emit('initial-positions', currentPositions);

  // Handle manual location update from a device
  socket.on('update-location', async (data: {
    deviceId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    batteryLevel?: number;
  }) => {
    const { deviceId, latitude, longitude, speed, heading, batteryLevel } = data;

    // Update local tracking
    devicePositions.set(deviceId, {
      lat: latitude,
      lng: longitude,
      speed: speed || 0,
      heading: heading || 0,
      battery: batteryLevel || 100,
    });

    // Broadcast to all clients
    const update = {
      deviceId,
      latitude,
      longitude,
      speed: speed || 0,
      heading: heading || 0,
      batteryLevel: batteryLevel || 100,
      accuracy: 10,
      timestamp: new Date().toISOString(),
    };
    io.emit('location-updates', [update]);

    // Save to DB
    try {
      await db.locationRecord.create({
        data: {
          deviceId,
          latitude,
          longitude,
          speed: speed || 0,
          heading: heading || 0,
          batteryLevel: batteryLevel || 100,
          accuracy: 10,
        },
      });

      await db.device.update({
        where: { id: deviceId },
        data: {
          lastLatitude: latitude,
          lastLongitude: longitude,
          lastSpeed: speed || 0,
          lastHeading: heading || 0,
          batteryLevel: batteryLevel || 100,
          status: speed > 2 ? 'online' : 'idle',
        },
      });
    } catch (err) {
      console.error(`Error saving manual location for ${deviceId}:`, err);
    }
  });

  // Handle simulation control
  socket.on('toggle-simulation', (data: { enabled: boolean }) => {
    if (data.enabled) {
      startSimulation();
      console.log('Simulation started');
    } else if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
      console.log('Simulation stopped');
    }
    socket.emit('simulation-status', { enabled: simulationInterval !== null });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error);
  });
});

const PORT = 3004;
httpServer.listen(PORT, async () => {
  console.log(`GPS Tracking WebSocket service running on port ${PORT}`);
  await loadDevicePositions();
  startSimulation();
  console.log('Location simulation started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down GPS tracking service...');
  if (simulationInterval) clearInterval(simulationInterval);
  httpServer.close(() => {
    db.$disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down GPS tracking service...');
  if (simulationInterval) clearInterval(simulationInterval);
  httpServer.close(() => {
    db.$disconnect();
    process.exit(0);
  });
});
