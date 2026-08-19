import { db } from '../src/lib/db';

async function seed() {
  // Create users
  const users = await db.user.createMany({ data: [
    { name: 'Admin Utama', email: 'admin@gps.com', role: 'super_admin', active: true },
    { name: 'Ahmad Rizki', email: 'ahmad@gps.com', role: 'admin', active: true },
    { name: 'Siti Nurhaliza', email: 'siti@gps.com', role: 'user', active: true },
  ] });
  const allUsers = await db.user.findMany();
  console.log('Created', allUsers.length, 'users');

  // Create demo devices
  const demoDevices = [
    { name: 'Avanza B 1234 XY', type: 'vehicle', iconColor: '#22c55e', status: 'online', lastLatitude: -6.2088, lastLongitude: 106.8456, lastSpeed: 45, batteryLevel: 85 },
    { name: 'Xenia D 5678 AB', type: 'vehicle', iconColor: '#3b82f6', status: 'online', lastLatitude: -6.1850, lastLongitude: 106.8340, lastSpeed: 30, batteryLevel: 72 },
    { name: 'Innova F 9012 CD', type: 'vehicle', iconColor: '#f59e0b', status: 'idle', lastLatitude: -6.2200, lastLongitude: 106.8100, lastSpeed: 0, batteryLevel: 60 },
    { name: 'Motor Supra', type: 'vehicle', iconColor: '#ef4444', status: 'online', lastLatitude: -6.1500, lastLongitude: 106.8700, lastSpeed: 55, batteryLevel: 90 },
    { name: 'Pickup L 3456 EF', type: 'vehicle', iconColor: '#8b5cf6', status: 'offline', lastLatitude: -6.2500, lastLongitude: 106.7900, lastSpeed: 0, batteryLevel: 15 },
    { name: 'Budi Santoso', type: 'person', iconColor: '#ec4899', status: 'online', lastLatitude: -6.2000, lastLongitude: 106.8200, lastSpeed: 5, batteryLevel: 95 },
    { name: 'Dewi Lestari', type: 'person', iconColor: '#14b8a6', status: 'idle', lastLatitude: -6.1750, lastLongitude: 106.8500, lastSpeed: 0, batteryLevel: 80 },
    { name: 'Kucing Persia', type: 'pet', iconColor: '#f97316', status: 'online', lastLatitude: -6.1900, lastLongitude: 106.8400, lastSpeed: 2, batteryLevel: 70 },
    { name: 'Container RG 789', type: 'asset', iconColor: '#6366f1', status: 'idle', lastLatitude: -6.3000, lastLongitude: 106.9500, lastSpeed: 0, batteryLevel: 50 },
    { name: 'Truk Kontainer', type: 'vehicle', iconColor: '#22c55e', status: 'online', lastLatitude: -6.1700, lastLongitude: 106.8600, lastSpeed: 40, batteryLevel: 88 },
    { name: 'Honda Jazz H 1111', type: 'vehicle', iconColor: '#3b82f6', status: 'online', lastLatitude: -6.2100, lastLongitude: 106.8300, lastSpeed: 60, batteryLevel: 92 },
    { name: 'Yamaha NMAX', type: 'vehicle', iconColor: '#ef4444', status: 'idle', lastLatitude: -6.1950, lastLongitude: 106.8550, lastSpeed: 0, batteryLevel: 65 },
    { name: 'Ani Wijaya', type: 'person', iconColor: '#ec4899', status: 'online', lastLatitude: -6.2050, lastLongitude: 106.8150, lastSpeed: 8, batteryLevel: 78 },
    { name: 'Golden Retriever', type: 'pet', iconColor: '#f97316', status: 'idle', lastLatitude: -6.1800, lastLongitude: 106.8350, lastSpeed: 0, batteryLevel: 55 },
    { name: 'Gudang A', type: 'asset', iconColor: '#6366f1', status: 'offline', lastLatitude: -6.2600, lastLongitude: 106.7800, lastSpeed: 0, batteryLevel: 20 },
  ];

  for (let i = 0; i < demoDevices.length; i++) {
    const userIdx = i % allUsers.length;
    await db.device.create({
      data: {
        ...demoDevices[i],
        userId: allUsers[userIdx].id,
      },
    });
  }

  // Create 6 more devices without user assignment
  const unassigned = [
    { name: 'Suzuki Ertiga', type: 'vehicle', iconColor: '#22c55e', status: 'online', lastLatitude: -6.1650, lastLongitude: 106.8750, lastSpeed: 35, batteryLevel: 77 },
    { name: 'Daihatsu Ayla', type: 'vehicle', iconColor: '#f59e0b', status: 'idle', lastLatitude: -6.2150, lastLongitude: 106.8450, lastSpeed: 0, batteryLevel: 43 },
    { name: 'Anjing Shepherd', type: 'pet', iconColor: '#f97316', status: 'online', lastLatitude: -6.1450, lastLongitude: 106.8650, lastSpeed: 3, batteryLevel: 62 },
    { name: 'Paket Cargo 01', type: 'asset', iconColor: '#6366f1', status: 'offline', lastLatitude: null, lastLongitude: null, lastSpeed: 0, batteryLevel: 0 },
    { name: 'Eko Prasetyo', type: 'person', iconColor: '#14b8a6', status: 'online', lastLatitude: -6.2300, lastLongitude: 106.8000, lastSpeed: 12, batteryLevel: 88 },
    { name: 'Toyota Hilux', type: 'vehicle', iconColor: '#8b5cf6', status: 'online', lastLatitude: -6.1550, lastLongitude: 106.8850, lastSpeed: 50, batteryLevel: 93 },
  ];

  for (const d of unassigned) {
    await db.device.create({ data: d });
  }

  const totalDevices = await db.device.count();
  console.log('Created', totalDevices, 'total devices (15 assigned, 6 unassigned)');
}

seed().catch(e => { console.error(e); process.exit(1); });
