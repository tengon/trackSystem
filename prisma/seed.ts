import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const jakartaArea = {
  center: { lat: -6.2088, lng: 106.8456 },
  bounds: {
    latMin: -6.35, latMax: -6.08,
    lngMin: 106.68, lngMax: 107.00,
  },
};

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const deviceTypes = ['vehicle', 'person', 'pet', 'asset'];
const vehicleNames = [
  'Toyota Avanza Hitam', 'Honda Jazz Putih', 'Mitsubishi Xpander Silver',
  'Suzuki Ertiga Merah', 'Daihatsu Terios Biru', 'Honda CR-V Abu-abu',
  'Toyota Fortuner Putih', 'Honda Brio Merah',
];
const personNames = ['Ahmad Rizki', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Lestari', 'Eko Prasetyo'];
const petNames = ['Buddy (Golden Retriever)', 'Milo (Persian Cat)', 'Rocky (German Shepherd)', 'Luna (Siamese Cat)'];
const assetNames = ['Kontainer A-001', 'Paket Ekspedisi B-042', 'Truk Pengiriman C-015', 'Alat Berat D-007'];

const iconColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await db.alert.deleteMany();
  await db.locationRecord.deleteMany();
  await db.geofence.deleteMany();
  await db.device.deleteMany();

  const allDevices = [];

  // Create vehicle devices
  for (const name of vehicleNames) {
    const lat = randomInRange(jakartaArea.bounds.latMin, jakartaArea.bounds.latMax);
    const lng = randomInRange(jakartaArea.bounds.lngMin, jakartaArea.bounds.lngMax);
    const device = await db.device.create({
      data: {
        name,
        type: 'vehicle',
        status: randomItem(['online', 'online', 'online', 'idle', 'offline']),
        iconColor: randomItem(iconColors),
        lastLatitude: lat,
        lastLongitude: lng,
        lastSpeed: Math.random() * 80,
        lastHeading: Math.random() * 360,
        batteryLevel: Math.floor(randomInRange(20, 100)),
        phoneNumber: `+628${Math.floor(randomInRange(1000000000, 9999999999))}`,
        imei: `IMEI${Math.floor(randomInRange(100000000000000, 999999999999999))}`,
      },
    });
    allDevices.push(device);
  }

  // Create person devices
  for (const name of personNames) {
    const lat = randomInRange(jakartaArea.bounds.latMin, jakartaArea.bounds.latMax);
    const lng = randomInRange(jakartaArea.bounds.lngMin, jakartaArea.bounds.lngMax);
    const device = await db.device.create({
      data: {
        name,
        type: 'person',
        status: randomItem(['online', 'online', 'offline']),
        iconColor: randomItem(iconColors),
        lastLatitude: lat,
        lastLongitude: lng,
        lastSpeed: Math.random() * 10,
        lastHeading: Math.random() * 360,
        batteryLevel: Math.floor(randomInRange(30, 100)),
      },
    });
    allDevices.push(device);
  }

  // Create pet devices
  for (const name of petNames) {
    const lat = randomInRange(jakartaArea.bounds.latMin, jakartaArea.bounds.latMax);
    const lng = randomInRange(jakartaArea.bounds.lngMin, jakartaArea.bounds.lngMax);
    const device = await db.device.create({
      data: {
        name,
        type: 'pet',
        status: randomItem(['online', 'offline', 'offline']),
        iconColor: randomItem(iconColors),
        lastLatitude: lat,
        lastLongitude: lng,
        lastSpeed: Math.random() * 5,
        lastHeading: Math.random() * 360,
        batteryLevel: Math.floor(randomInRange(40, 100)),
      },
    });
    allDevices.push(device);
  }

  // Create asset devices
  for (const name of assetNames) {
    const lat = randomInRange(jakartaArea.bounds.latMin, jakartaArea.bounds.latMax);
    const lng = randomInRange(jakartaArea.bounds.lngMin, jakartaArea.bounds.lngMax);
    const device = await db.device.create({
      data: {
        name,
        type: 'asset',
        status: randomItem(['idle', 'idle', 'offline', 'online']),
        iconColor: randomItem(iconColors),
        lastLatitude: lat,
        lastLongitude: lng,
        lastSpeed: 0,
        lastHeading: 0,
        batteryLevel: Math.floor(randomInRange(60, 100)),
        notes: 'High value asset - monitor closely',
      },
    });
    allDevices.push(device);
  }

  // Generate location history for each device (last 24 hours, random points)
  for (const device of allDevices) {
    const numPoints = Math.floor(randomInRange(20, 60));
    let currentLat = device.lastLatitude!;
    let currentLng = device.lastLongitude!;
    const now = new Date();

    for (let i = numPoints; i >= 0; i--) {
      currentLat += randomInRange(-0.005, 0.005);
      currentLng += randomInRange(-0.005, 0.005);
      // Clamp to Jakarta area
      currentLat = Math.max(jakartaArea.bounds.latMin, Math.min(jakartaArea.bounds.latMax, currentLat));
      currentLng = Math.max(jakartaArea.bounds.lngMin, Math.min(jakartaArea.bounds.lngMax, currentLng));

      const timestamp = new Date(now.getTime() - i * (24 * 60 * 60 * 1000) / numPoints);

      await db.locationRecord.create({
        data: {
          deviceId: device.id,
          latitude: currentLat,
          longitude: currentLng,
          speed: device.type === 'asset' ? 0 : randomInRange(0, 80),
          heading: randomInRange(0, 360),
          altitude: randomInRange(0, 50),
          batteryLevel: Math.floor(randomInRange(20, 100)),
          accuracy: randomInRange(5, 30),
          timestamp,
        },
      });
    }
  }

  // Create some geofences
  const geofenceLocations = [
    { name: 'Kantor Pusat', lat: -6.2088, lng: 106.8456 },
    { name: 'Gudang Utama', lat: -6.1745, lng: 106.8227 },
    { name: 'Area Pengiriman', lat: -6.2297, lng: 106.8107 },
  ];

  for (let i = 0; i < Math.min(geofenceLocations.length, allDevices.length); i++) {
    const loc = geofenceLocations[i];
    await db.geofence.create({
      data: {
        name: loc.name,
        deviceId: allDevices[i].id,
        latitude: loc.lat,
        longitude: loc.lng,
        radius: 500,
        type: randomItem(['enter', 'exit', 'both']),
        active: true,
      },
    });
  }

  // Create some alerts
  const alertTypes = ['geofence_enter', 'geofence_exit', 'low_battery', 'speed_limit'];
  const alertMessages = [
    'Perangkat memasuki area geofence',
    'Perangkat keluar dari area geofence',
    'Level baterai rendah (di bawah 20%)',
    'Perangkat melebihi batas kecepatan',
    'SOS diterima dari perangkat',
  ];

  for (let i = 0; i < 8; i++) {
    const device = randomItem(allDevices);
    await db.alert.create({
      data: {
        deviceId: device.id,
        type: randomItem(alertTypes),
        message: randomItem(alertMessages),
        read: Math.random() > 0.5,
        createdAt: new Date(Date.now() - Math.floor(randomInRange(0, 7 * 24 * 60 * 60 * 1000))),
      },
    });
  }

  console.log(`Seeded ${allDevices.length} devices with location history, geofences, and alerts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
