/**
 * Teltonika Device Models & Hardware Series Configuration
 * Comprehensive catalog of Teltonika Telematics GPS Devices
 */

export interface TeltonikaModelInfo {
  model: string;
  series: 'FMC' | 'FMB' | 'FMM' | 'TMT' | 'TAT' | 'TFT' | 'GH' | 'OTHER';
  label: string;
  fullName: string;
  category: string;
  description: string;
  connectivity: '4G LTE Cat 1' | '2G GSM' | 'LTE-M / NB-IoT' | 'GNSS / BLE';
  defaultType: 'vehicle' | 'person' | 'pet' | 'asset';
  defaultColor: string;
  recommendedCodec: 'Codec 8' | 'Codec 8 Extended' | 'Codec 16';
  hasCanbus: boolean;
  hasBle: boolean;
  backupBattery: boolean;
  tacPrefixes?: string[];
}

export const TELTONIKA_DEVICE_MODELS: TeltonikaModelInfo[] = [
  // --- FMC Series (4G LTE Cat 1) ---
  {
    model: 'FMC920',
    series: 'FMC',
    label: 'FMC920',
    fullName: 'Teltonika FMC920 (4G LTE Cat 1 Compact)',
    category: 'Kendaraan (4G LTE Cat 1)',
    description: 'Pelacak pintar ringkas 4G LTE Cat 1, Bluetooth 4.0 LE, baterai cadangan & akselerometer',
    connectivity: '4G LTE Cat 1',
    defaultType: 'vehicle',
    defaultColor: '#22c55e',
    recommendedCodec: 'Codec 8 Extended',
    hasCanbus: false,
    hasBle: true,
    backupBattery: true,
    tacPrefixes: ['867258', '864191'],
  },
  {
    model: 'FMC130',
    series: 'FMC',
    label: 'FMC130',
    fullName: 'Teltonika FMC130 (4G Advanced + CAN Adapter)',
    category: 'Kendaraan (4G LTE Cat 1)',
    description: 'Pelacak 4G tingkat lanjut dengan input fleksibel (DIN/AIN/DOUT), CAN bus / OBD adapter & Bluetooth',
    connectivity: '4G LTE Cat 1',
    defaultType: 'vehicle',
    defaultColor: '#3b82f6',
    recommendedCodec: 'Codec 8 Extended',
    hasCanbus: true,
    hasBle: true,
    backupBattery: true,
    tacPrefixes: ['358742', '867259'],
  },
  {
    model: 'FMC125',
    series: 'FMC',
    label: 'FMC125',
    fullName: 'Teltonika FMC125 (4G Advanced + RS232/RS485)',
    category: 'Kendaraan (4G LTE Cat 1)',
    description: 'Pelacak 4G dengan antarmuka serial RS232/RS485, Dual SIM & dukungan sensor bahan bakar / RFID',
    connectivity: '4G LTE Cat 1',
    defaultType: 'vehicle',
    defaultColor: '#0ea5e9',
    recommendedCodec: 'Codec 8 Extended',
    hasCanbus: true,
    hasBle: true,
    backupBattery: true,
  },
  {
    model: 'FMC640',
    series: 'FMC',
    label: 'FMC640',
    fullName: 'Teltonika FMC640 (4G Professional Fleet / FMS / CAN)',
    category: 'Alat Berat & Armada Profesional',
    description: 'Pelacak profesional 4G kelas berat dengan FMS CAN, J1939/J1708, tachograph digital & Dual SIM',
    connectivity: '4G LTE Cat 1',
    defaultType: 'vehicle',
    defaultColor: '#f59e0b',
    recommendedCodec: 'Codec 8 Extended',
    hasCanbus: true,
    hasBle: true,
    backupBattery: true,
  },
  {
    model: 'FMC880',
    series: 'FMC',
    label: 'FMC880',
    fullName: 'Teltonika FMC880 (4G Waterproof IP65 Fast Battery Mount)',
    category: 'Kendaraan (4G LTE Cat 1)',
    description: 'Pelacak 4G tahan air IP65 yang dipasang langsung di atas baterai aki kendaraan secara instan',
    connectivity: '4G LTE Cat 1',
    defaultType: 'vehicle',
    defaultColor: '#10b981',
    recommendedCodec: 'Codec 8 Extended',
    hasCanbus: false,
    hasBle: true,
    backupBattery: true,
  },
  {
    model: 'FMC003',
    series: 'FMC',
    label: 'FMC003',
    fullName: 'Teltonika FMC003 (4G Plug & Play OBDII)',
    category: 'OBDII Plug & Play',
    description: 'Pelacak OBD-II 4G LTE tanpa kabel dengan pembacaan data standar OEM OBD (kecepatan, RPM, odometer, BBM)',
    connectivity: '4G LTE Cat 1',
    defaultType: 'vehicle',
    defaultColor: '#8b5cf6',
    recommendedCodec: 'Codec 8 Extended',
    hasCanbus: true,
    hasBle: true,
    backupBattery: true,
  },

  // --- FMB Series (2G GSM / GNSS) ---
  {
    model: 'FMB920',
    series: 'FMB',
    label: 'FMB920',
    fullName: 'Teltonika FMB920 (2G Compact Smart Tracker)',
    category: 'Kendaraan (2G GSM)',
    description: 'Pelacak pintar 2G terlaris, ringkas, hemat daya, dilengkapi Bluetooth 4.0 dan baterai cadangan Li-ion',
    connectivity: '2G GSM',
    defaultType: 'vehicle',
    defaultColor: '#22c55e',
    recommendedCodec: 'Codec 8',
    hasCanbus: false,
    hasBle: true,
    backupBattery: true,
    tacPrefixes: ['356450', '864191'],
  },
  {
    model: 'FMB120',
    series: 'FMB',
    label: 'FMB120',
    fullName: 'Teltonika FMB120 (2G Advanced Tracker + Battery)',
    category: 'Kendaraan (2G GSM)',
    description: 'Pelacak 2G dengan antena internal GNSS/GSM gain tinggi, digital I/O fleksibel & baterai cadangan',
    connectivity: '2G GSM',
    defaultType: 'vehicle',
    defaultColor: '#3b82f6',
    recommendedCodec: 'Codec 8',
    hasCanbus: true,
    hasBle: true,
    backupBattery: true,
  },
  {
    model: 'FMB125',
    series: 'FMB',
    label: 'FMB125',
    fullName: 'Teltonika FMB125 (2G Advanced + RS232/RS485)',
    category: 'Kendaraan (2G GSM)',
    description: 'Pelacak 2G serbaguna dengan RS232/RS485 untuk sensor bahan bakar LLS, RFID reader & Dual SIM',
    connectivity: '2G GSM',
    defaultType: 'vehicle',
    defaultColor: '#6366f1',
    recommendedCodec: 'Codec 8',
    hasCanbus: true,
    hasBle: true,
    backupBattery: true,
  },
  {
    model: 'FMB204',
    series: 'FMB',
    label: 'FMB204',
    fullName: 'Teltonika FMB204 (2G Waterproof IP67 + High Battery)',
    category: 'Kendaraan Khusus / Tahan Air',
    description: 'Pelacak tahan air & debu IP67 dengan kapasitas baterai cadangan besar (1800mAh), ideal untuk motor & alat pertanian',
    connectivity: '2G GSM',
    defaultType: 'vehicle',
    defaultColor: '#06b6d4',
    recommendedCodec: 'Codec 8',
    hasCanbus: false,
    hasBle: true,
    backupBattery: true,
  },
  {
    model: 'FMB640',
    series: 'FMB',
    label: 'FMB640',
    fullName: 'Teltonika FMB640 (2G Professional Fleet / FMS)',
    category: 'Alat Berat & Armada Profesional',
    description: 'Pelacak armada profesional 2G dengan antarmuka CAN-bus FMS ganda dan tachograph',
    connectivity: '2G GSM',
    defaultType: 'vehicle',
    defaultColor: '#d97706',
    recommendedCodec: 'Codec 8',
    hasCanbus: true,
    hasBle: true,
    backupBattery: true,
  },
  {
    model: 'FMB003',
    series: 'FMB',
    label: 'FMB003',
    fullName: 'Teltonika FMB003 (2G Plug & Play OBDII)',
    category: 'OBDII Plug & Play',
    description: 'Pelacak OBD-II 2G langsung colok ke port OBD kendaraan tanpa pemotongan kabel',
    connectivity: '2G GSM',
    defaultType: 'vehicle',
    defaultColor: '#a855f7',
    recommendedCodec: 'Codec 8',
    hasCanbus: true,
    hasBle: true,
    backupBattery: true,
  },

  // --- FMM Series (LTE-M / NB-IoT) ---
  {
    model: 'FMM920',
    series: 'FMM',
    label: 'FMM920',
    fullName: 'Teltonika FMM920 (LTE Cat M1 / NB-IoT Compact)',
    category: 'Kendaraan (LTE-M / NB-IoT)',
    description: 'Pelacak hemat daya dengan konektivitas jaringan modern LTE-M & NB-IoT untuk masa depan',
    connectivity: 'LTE-M / NB-IoT',
    defaultType: 'vehicle',
    defaultColor: '#14b8a6',
    recommendedCodec: 'Codec 8 Extended',
    hasCanbus: false,
    hasBle: true,
    backupBattery: true,
  },
  {
    model: 'FMM130',
    series: 'FMM',
    label: 'FMM130',
    fullName: 'Teltonika FMM130 (LTE-M Advanced + CAN)',
    category: 'Kendaraan (LTE-M / NB-IoT)',
    description: 'Pelacak tingkat lanjut LTE-M / NB-IoT dengan fleksibilitas I/O dan pembacaan CAN bus',
    connectivity: 'LTE-M / NB-IoT',
    defaultType: 'vehicle',
    defaultColor: '#059669',
    recommendedCodec: 'Codec 8 Extended',
    hasCanbus: true,
    hasBle: true,
    backupBattery: true,
  },

  // --- Personal & Worker Series ---
  {
    model: 'TMT250',
    series: 'TMT',
    label: 'TMT250',
    fullName: 'Teltonika TMT250 (Personal Autonomous Tracker + SOS)',
    category: 'Personal & Pekerja Mandiri',
    description: 'Pelacak otonom personal portabel dengan tombol darurat SOS, sensor jatuh (man-down), & alarm gerak',
    connectivity: '2G GSM',
    defaultType: 'person',
    defaultColor: '#ec4899',
    recommendedCodec: 'Codec 8',
    hasCanbus: false,
    hasBle: true,
    backupBattery: true,
    tacPrefixes: ['863393'],
  },
  {
    model: 'GH5200',
    series: 'GH',
    label: 'GH5200',
    fullName: 'Teltonika GH5200 (Worker Badge Tracker + Two-Way Voice)',
    category: 'Personal & Pekerja Mandiri',
    description: 'Kartu tanda pengenal pekerja pintar dengan pelacakan GPS, tombol SOS & panggilan suara dua arah (GSM)',
    connectivity: '2G GSM',
    defaultType: 'person',
    defaultColor: '#f43f5e',
    recommendedCodec: 'Codec 8',
    hasCanbus: false,
    hasBle: true,
    backupBattery: true,
  },

  // --- Autonomous Asset Series ---
  {
    model: 'TAT100',
    series: 'TAT',
    label: 'TAT100',
    fullName: 'Teltonika TAT100 (Autonomous Asset Tracker - 3 Years Battery)',
    category: 'Pelacak Aset Mandiri',
    description: 'Pelacak aset berdaya tahan baterai hingga 3 tahun (1 laporan/hari) tanpa perlu instalasi kabel',
    connectivity: '2G GSM',
    defaultType: 'asset',
    defaultColor: '#eab308',
    recommendedCodec: 'Codec 8',
    hasCanbus: false,
    hasBle: true,
    backupBattery: true,
  },
  {
    model: 'TAT140',
    series: 'TAT',
    label: 'TAT140',
    fullName: 'Teltonika TAT140 (4G Autonomous Asset Tracker)',
    category: 'Pelacak Aset Mandiri',
    description: 'Pelacak aset otonom 4G LTE Cat 1 tahan air IP68 dengan baterai internal daya tahan tahunan',
    connectivity: '4G LTE Cat 1',
    defaultType: 'asset',
    defaultColor: '#f97316',
    recommendedCodec: 'Codec 8 Extended',
    hasCanbus: false,
    hasBle: true,
    backupBattery: true,
  },

  // --- E-Mobility Series ---
  {
    model: 'TFT100',
    series: 'TFT',
    label: 'TFT100',
    fullName: 'Teltonika TFT100 (E-Mobility High Voltage 10-97V IoT)',
    category: 'E-Mobility & Kendaraan Listrik',
    description: 'Pelacak khusus kendaraan listrik (skuter listrik, e-bike, forklift) mendukung tegangan 10V hingga 97V',
    connectivity: '4G LTE Cat 1',
    defaultType: 'vehicle',
    defaultColor: '#84cc16',
    recommendedCodec: 'Codec 8 Extended',
    hasCanbus: true,
    hasBle: true,
    backupBattery: true,
  },
];

/**
 * Finds Teltonika Model Information by model code
 */
export function getTeltonikaModel(modelCode?: string | null): TeltonikaModelInfo {
  if (!modelCode) {
    return TELTONIKA_DEVICE_MODELS[0]; // Default FMC920
  }
  const found = TELTONIKA_DEVICE_MODELS.find(
    (m) => m.model.toLowerCase() === modelCode.toLowerCase()
  );
  return found || TELTONIKA_DEVICE_MODELS[0];
}

/**
 * Groups models by category for clean UI rendering
 */
export function getTeltonikaModelsGrouped(): Record<string, TeltonikaModelInfo[]> {
  const grouped: Record<string, TeltonikaModelInfo[]> = {};
  for (const model of TELTONIKA_DEVICE_MODELS) {
    if (!grouped[model.category]) {
      grouped[model.category] = [];
    }
    grouped[model.category].push(model);
  }
  return grouped;
}
