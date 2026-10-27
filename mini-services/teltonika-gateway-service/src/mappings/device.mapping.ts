/**
 * Teltonika Device Hardware Profile Mapping
 */

export interface TeltonikaDeviceProfile {
  family: string;
  name: string;
  defaultType: 'vehicle' | 'person' | 'pet' | 'asset';
  defaultIconColor: string;
  hasCanbus: boolean;
  hasBle: boolean;
  recommendedCodec: string;
}

export function detectDeviceFamilyByImei(imei: string): TeltonikaDeviceProfile {
  const prefix = imei.substring(0, 8);

  // Teltonika TAC (Type Allocation Code - first 8 digits of IMEI) mappings
  if (prefix.startsWith('867258')) {
    return {
      family: 'FMC920',
      name: 'Teltonika FMC920 4G LTE Tracker',
      defaultType: 'vehicle',
      defaultIconColor: '#22c55e',
      hasCanbus: false,
      hasBle: true,
      recommendedCodec: 'Codec 8 Extended',
    };
  }

  if (prefix.startsWith('358742') || prefix.startsWith('867259')) {
    return {
      family: 'FMC130',
      name: 'Teltonika FMC130 4G Tracker + CAN',
      defaultType: 'vehicle',
      defaultIconColor: '#3b82f6',
      hasCanbus: true,
      hasBle: true,
      recommendedCodec: 'Codec 8 Extended',
    };
  }

  if (prefix.startsWith('356450') || prefix.startsWith('864191')) {
    return {
      family: 'FMB920',
      name: 'Teltonika FMB920 Compact 2G Tracker',
      defaultType: 'vehicle',
      defaultIconColor: '#22c55e',
      hasCanbus: false,
      hasBle: true,
      recommendedCodec: 'Codec 8',
    };
  }

  if (prefix.startsWith('863393')) {
    return {
      family: 'TMT250',
      name: 'Teltonika TMT250 Personal SOS Tracker',
      defaultType: 'person',
      defaultIconColor: '#ec4899',
      hasCanbus: false,
      hasBle: true,
      recommendedCodec: 'Codec 8',
    };
  }

  if (prefix.startsWith('861234') || prefix.startsWith('357891')) {
    return {
      family: 'FMC640',
      name: 'Teltonika FMC640 Professional Fleet Tracker',
      defaultType: 'vehicle',
      defaultIconColor: '#f59e0b',
      hasCanbus: true,
      hasBle: true,
      recommendedCodec: 'Codec 8 Extended',
    };
  }

  if (prefix.startsWith('861343') || prefix.startsWith('864983') || prefix.startsWith('868019') || prefix.startsWith('354152')) {
    return {
      family: 'FMC001',
      name: 'Teltonika FMC001 4G OBDII Tracker',
      defaultType: 'vehicle',
      defaultIconColor: '#8b5cf6',
      hasCanbus: true,
      hasBle: true,
      recommendedCodec: 'Codec 8 Extended',
    };
  }

  if (prefix.startsWith('867950') || prefix.startsWith('862214') || prefix.startsWith('357283') || prefix.startsWith('868204')) {
    return {
      family: 'FMB001',
      name: 'Teltonika FMB001 2G OBDII Tracker',
      defaultType: 'vehicle',
      defaultIconColor: '#a855f7',
      hasCanbus: true,
      hasBle: true,
      recommendedCodec: 'Codec 8',
    };
  }

  if (prefix.startsWith('869003') || prefix.startsWith('868003')) {
    return {
      family: 'FMC003',
      name: 'Teltonika FMC003 4G Plug & Play OBDII',
      defaultType: 'vehicle',
      defaultIconColor: '#8b5cf6',
      hasCanbus: true,
      hasBle: true,
      recommendedCodec: 'Codec 8 Extended',
    };
  }

  if (prefix.startsWith('867003') || prefix.startsWith('862003')) {
    return {
      family: 'FMB003',
      name: 'Teltonika FMB003 2G Plug & Play OBDII',
      defaultType: 'vehicle',
      defaultIconColor: '#a855f7',
      hasCanbus: true,
      hasBle: true,
      recommendedCodec: 'Codec 8',
    };
  }

  // Default fallback for any Teltonika unit
  return {
    family: 'FMC920',
    name: `Teltonika GPS Tracker (${imei.slice(-6)})`,
    defaultType: 'vehicle',
    defaultIconColor: '#22c55e',
    hasCanbus: true,
    hasBle: true,
    recommendedCodec: 'Codec 8 Extended',
  };
}
