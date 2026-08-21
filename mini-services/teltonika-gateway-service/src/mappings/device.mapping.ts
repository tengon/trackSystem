/**
 * Teltonika Device Hardware Profile Mapping
 */

export interface TeltonikaDeviceProfile {
  family: string;
  name: string;
  defaultIconColor: string;
  hasCanbus: boolean;
  hasBle: boolean;
}

export function detectDeviceFamilyByImei(imei: string): TeltonikaDeviceProfile {
  // Common TAC (Type Allocation Code - first 8 digits of IMEI) mappings for Teltonika
  const prefix = imei.substring(0, 8);

  if (prefix.startsWith('356450') || prefix.startsWith('864191')) {
    return {
      family: 'FMB920',
      name: 'Teltonika FMB920 Compact Tracker',
      defaultIconColor: '#22c55e',
      hasCanbus: false,
      hasBle: true,
    };
  }

  if (prefix.startsWith('867258') || prefix.startsWith('358742')) {
    return {
      family: 'FMC130',
      name: 'Teltonika FMC130 4G Tracker',
      defaultIconColor: '#3b82f6',
      hasCanbus: true,
      hasBle: true,
    };
  }

  if (prefix.startsWith('863393')) {
    return {
      family: 'TMT250',
      name: 'Teltonika TMT250 Personal Badge Tracker',
      defaultIconColor: '#ec4899',
      hasCanbus: false,
      hasBle: true,
    };
  }

  return {
    family: 'TELTONIKA_GENERIC',
    name: `Teltonika GPS Tracker (${imei.slice(-6)})`,
    defaultIconColor: '#3b82f6',
    hasCanbus: true,
    hasBle: true,
  };
}
