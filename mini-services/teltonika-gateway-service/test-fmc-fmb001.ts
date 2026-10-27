/**
 * Test & Verification Suite for Teltonika FMC001 & FMB001 Decoders
 */

import { detectDeviceFamilyByImei } from './src/mappings/device.mapping';
import { decodeCodec8 } from './src/protocol/codec8.decoder';
import { decodeCodec8Extended } from './src/protocol/codec8e.decoder';
import { normalizeTelemetryRecord } from './src/normalizers/telemetry.normalizer';
import { calculateTeltonikaCRC16 } from './src/protocol/teltonika.protocol';
import { parseDtcCodes, decodeVinString, decodeObdTelemetry } from './src/decoders/obd.decoder';

console.log('========================================================');
console.log('🧪 Starting Teltonika FMC001 & FMB001 Decoder Test Suite');
console.log('========================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------
// TEST 1: TAC Device Family Detection by IMEI
// ---------------------------------------------------------------
console.log('--- TEST 1: IMEI TAC Detection for FMC001 & FMB001 ---');
const fmc001Profile = detectDeviceFamilyByImei('861343041234567');
assert(fmc001Profile.family === 'FMC001', 'FMC001 identified by TAC 861343');
assert(fmc001Profile.hasCanbus === true, 'FMC001 profile has OBD/CAN enabled');
assert(fmc001Profile.recommendedCodec === 'Codec 8 Extended', 'FMC001 recommended codec is Codec 8 Extended');

const fmb001Profile = detectDeviceFamilyByImei('867950039876543');
assert(fmb001Profile.family === 'FMB001', 'FMB001 identified by TAC 867950');
assert(fmb001Profile.recommendedCodec === 'Codec 8', 'FMB001 recommended codec is Codec 8');

// ---------------------------------------------------------------
// TEST 2: DTC & VIN Decoding Helpers
// ---------------------------------------------------------------
console.log('\n--- TEST 2: OBD DTC Codes & VIN Parsing ---');

// SAE J2012 test:
// P0300: b0 = 0x03, b1 = 0x00 -> P (00) + 0 + 3 + 0 + 0 = P0300
// P0171: b0 = 0x01, b1 = 0x71 -> P (00) + 0 + 1 + 7 + 1 = P0171
// C0121: b0 = 0x41, b1 = 0x21 -> C (01) + 0 + 1 + 2 + 1 = C0121
const testHexDtc = '030001714121';
const dtcList = parseDtcCodes(testHexDtc);
assert(dtcList.includes('P0300'), 'DTC P0300 decoded from SAE J2012 hex');
assert(dtcList.includes('P0171'), 'DTC P0171 decoded from SAE J2012 hex');
assert(dtcList.includes('C0121'), 'DTC C0121 (Chassis) decoded from SAE J2012 hex');

// ASCII DTC test
const asciiDtcList = parseDtcCodes('P0300, P0171, U0100');
assert(asciiDtcList.length === 3 && asciiDtcList[2] === 'U0100', 'ASCII DTC list parsed cleanly');

// VIN test: 17 chars ASCII "1HGCR2F83HA000001"
const vinHex = Buffer.from('1HGCR2F83HA000001', 'ascii').toString('hex');
const decodedVin = decodeVinString(undefined, vinHex);
assert(decodedVin === '1HGCR2F83HA000001', 'VIN decoded correctly from X-byte hex');

// ---------------------------------------------------------------
// TEST 3: Codec 8 Decoder with FMB001 OBD Telemetry Packet
// ---------------------------------------------------------------
console.log('\n--- TEST 3: Codec 8 (0x08) FMB001 Packet Decoding ---');

function buildMockCodec8Fmb001Buffer(): Buffer {
  // Preamble (4 zero bytes)
  const header = Buffer.alloc(8);
  header.writeUInt32BE(0, 0); // Preamble 0x00000000
  // dataLength written later at offset 4

  const payloadBuf = Buffer.alloc(256);
  let p = 0;

  payloadBuf.writeUInt8(0x08, p); p += 1; // Codec ID: 0x08 (Codec 8)
  payloadBuf.writeUInt8(1, p); p += 1;    // Record count: 1

  // Record 1
  const tsMs = BigInt(Date.now());
  payloadBuf.writeBigInt64BE(tsMs, p); p += 8; // Timestamp
  payloadBuf.writeUInt8(0, p); p += 1;         // Priority: 0 (Normal)

  // GPS Element: Jakarta Lat -6.2088 (raw -62088000), Lng 106.8456 (raw 1068456000)
  payloadBuf.writeInt32BE(1068456000, p); p += 4; // Longitude
  payloadBuf.writeInt32BE(-62088000, p); p += 4;  // Latitude
  payloadBuf.writeInt16BE(15, p); p += 2;          // Altitude 15m
  payloadBuf.writeUInt16BE(180, p); p += 2;        // Angle 180°
  payloadBuf.writeUInt8(14, p); p += 1;            // Satellites 14
  payloadBuf.writeUInt16BE(45, p); p += 2;         // Speed 45 km/h

  // IO Element (1-byte ID & Counts for standard Codec 8)
  payloadBuf.writeUInt8(0, p); p += 1; // Event IO ID: 0
  payloadBuf.writeUInt8(7, p); p += 1; // Total IO Count: 7

  // 1-Byte IOs (Count: 4)
  // IO 239 (Ignition): 1
  // IO 31 (OBD Engine Load %): 45
  // IO 41 (OBD Throttle Position %): 30
  // IO 47 (OBD Fuel Level %): 72
  payloadBuf.writeUInt8(4, p); p += 1; // 1-Byte IO count
  payloadBuf.writeUInt8(239, p); payloadBuf.writeUInt8(1, p + 1); p += 2;
  payloadBuf.writeUInt8(31, p); payloadBuf.writeUInt8(45, p + 1); p += 2;
  payloadBuf.writeUInt8(41, p); payloadBuf.writeUInt8(30, p + 1); p += 2;
  payloadBuf.writeUInt8(47, p); payloadBuf.writeUInt8(72, p + 1); p += 2;

  // 2-Byte IOs (Count: 3)
  // IO 36 (OBD RPM): 2250
  // IO 32 (OBD Coolant Temp): 88
  // IO 66 (External Voltage): 13800 mV (13.8V)
  payloadBuf.writeUInt8(3, p); p += 1; // 2-Byte IO count
  payloadBuf.writeUInt8(36, p); payloadBuf.writeUInt16BE(2250, p + 1); p += 3;
  payloadBuf.writeUInt8(32, p); payloadBuf.writeUInt16BE(88, p + 1); p += 3;
  payloadBuf.writeUInt8(66, p); payloadBuf.writeUInt16BE(13800, p + 1); p += 3;

  // 4-Byte IOs (Count: 0)
  payloadBuf.writeUInt8(0, p); p += 1;

  // 8-Byte IOs (Count: 0)
  payloadBuf.writeUInt8(0, p); p += 1;

  // Record count 2
  payloadBuf.writeUInt8(1, p); p += 1;

  const dataPayload = payloadBuf.subarray(0, p);
  header.writeUInt32BE(dataPayload.length, 4);

  // CRC-16 of dataPayload
  const crc = calculateTeltonikaCRC16(dataPayload);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([header, dataPayload, crcBuf]);
}

const fmb001Buffer = buildMockCodec8Fmb001Buffer();
const fmb001Packet = decodeCodec8(fmb001Buffer);
assert(fmb001Packet !== null, 'Codec 8 packet decoded successfully');
assert(fmb001Packet?.crcValid === true, 'Codec 8 packet CRC verified');
assert(fmb001Packet?.records.length === 1, '1 AVL record found');

if (fmb001Packet && fmb001Packet.records.length > 0) {
  const norm = normalizeTelemetryRecord(fmb001Packet.records[0]);
  assert(norm.telemetry.ignition === true, 'Ignition decoded as TRUE');
  assert(norm.obd.rpm === 2250, `OBD RPM decoded as 2250 RPM (got ${norm.obd.rpm})`);
  assert(norm.obd.coolantTemperature === 88, `OBD Coolant Temp decoded as 88°C (got ${norm.obd.coolantTemperature})`);
  assert(norm.obd.engineLoadPercent === 45, `OBD Engine Load decoded as 45% (got ${norm.obd.engineLoadPercent})`);
  assert(norm.obd.throttlePositionPercent === 30, `OBD Throttle Position decoded as 30% (got ${norm.obd.throttlePositionPercent})`);
  assert(norm.obd.fuelLevelPercent === 72, `OBD Fuel Level decoded as 72% (got ${norm.obd.fuelLevelPercent})`);
  assert(norm.telemetry.batteryVoltage === 13.8, `Battery voltage decoded as 13.8V (got ${norm.telemetry.batteryVoltage})`);
  assert(norm.obd.unplugged === false, 'OBD unplugged is FALSE (device securely connected)');
}

// ---------------------------------------------------------------
// TEST 4: Codec 8 Extended (0x8E) FMC001 with VIN, DTC & Unplug Alarm
// ---------------------------------------------------------------
console.log('\n--- TEST 4: Codec 8 Extended (0x8E) FMC001 with VIN, DTC & Unplug Alarm ---');

function buildMockCodec8EFmc001Buffer(): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(0, 0); // Preamble 0x00000000

  const payloadBuf = Buffer.alloc(512);
  let p = 0;

  payloadBuf.writeUInt8(0x8E, p); p += 1; // Codec ID: 0x8E (Codec 8 Extended)
  payloadBuf.writeUInt8(1, p); p += 1;    // Record count: 1

  // Record 1
  const tsMs = BigInt(Date.now());
  payloadBuf.writeBigInt64BE(tsMs, p); p += 8; // Timestamp
  payloadBuf.writeUInt8(1, p); p += 1;         // Priority: 1 (High / Alarm)

  // GPS Element: Bandung Lat -6.9175 (raw -69175000), Lng 107.6191 (raw 1076191000)
  payloadBuf.writeInt32BE(1076191000, p); p += 4;
  payloadBuf.writeInt32BE(-69175000, p); p += 4;
  payloadBuf.writeInt16BE(768, p); p += 2;
  payloadBuf.writeUInt16BE(90, p); p += 2;
  payloadBuf.writeUInt8(18, p); p += 1;
  payloadBuf.writeUInt16BE(62, p); p += 2; // Speed 62 km/h

  // IO Element (2-byte IDs and 2-byte counts for Codec 8 Extended)
  payloadBuf.writeUInt16BE(252, p); p += 2; // Event IO ID: 252 (UNPLUG DETECTION EVENT)
  payloadBuf.writeUInt16BE(6, p); p += 2;   // Total IO Count: 6

  // 1-Byte IOs (Count: 2)
  // IO 239 (Ignition): 1
  // IO 252 (Unplug): 1 (UNPLUGGED!)
  payloadBuf.writeUInt16BE(2, p); p += 2;
  payloadBuf.writeUInt16BE(239, p); payloadBuf.writeUInt8(1, p + 2); p += 3;
  payloadBuf.writeUInt16BE(252, p); payloadBuf.writeUInt8(1, p + 2); p += 3;

  // 2-Byte IOs (Count: 2)
  // IO 36 (OBD RPM): 3150
  // IO 32 (OBD Coolant Temp): 94
  payloadBuf.writeUInt16BE(2, p); p += 2;
  payloadBuf.writeUInt16BE(36, p); payloadBuf.writeUInt16BE(3150, p + 2); p += 4;
  payloadBuf.writeUInt16BE(32, p); payloadBuf.writeUInt16BE(94, p + 2); p += 4;

  // 4-Byte IOs (Count: 0)
  payloadBuf.writeUInt16BE(0, p); p += 2;

  // 8-Byte IOs (Count: 0)
  payloadBuf.writeUInt16BE(0, p); p += 2;

  // X-Byte Variable Length IOs (Count: 2)
  // IO 256: VIN "1HGCR2F83HA000001" (17 bytes)
  // IO 281: DTC "03000171" (4 bytes: P0300 and P0171)
  const vinStr = '1HGCR2F83HA000001';
  const vinBuf = Buffer.from(vinStr, 'ascii');
  const dtcBuf = Buffer.from('03000171', 'hex');

  payloadBuf.writeUInt16BE(2, p); p += 2; // 2 variable length elements

  // Variable 1: VIN
  payloadBuf.writeUInt16BE(256, p); p += 2; // ID: 256
  payloadBuf.writeUInt16BE(vinBuf.length, p); p += 2; // Length: 17
  vinBuf.copy(payloadBuf, p); p += vinBuf.length;

  // Variable 2: DTC Codes
  payloadBuf.writeUInt16BE(281, p); p += 2; // ID: 281
  payloadBuf.writeUInt16BE(dtcBuf.length, p); p += 2; // Length: 4
  dtcBuf.copy(payloadBuf, p); p += dtcBuf.length;

  // Record count 2
  payloadBuf.writeUInt8(1, p); p += 1;

  const dataPayload = payloadBuf.subarray(0, p);
  header.writeUInt32BE(dataPayload.length, 4);

  const crc = calculateTeltonikaCRC16(dataPayload);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([header, dataPayload, crcBuf]);
}

const fmc001Buffer = buildMockCodec8EFmc001Buffer();
const fmc001Packet = decodeCodec8Extended(fmc001Buffer);
assert(fmc001Packet !== null, 'Codec 8 Extended packet decoded successfully');
assert(fmc001Packet?.crcValid === true, 'Codec 8 Extended packet CRC verified');
assert(fmc001Packet?.records.length === 1, '1 AVL record found');

if (fmc001Packet && fmc001Packet.records.length > 0) {
  const norm = normalizeTelemetryRecord(fmc001Packet.records[0]);
  assert(norm.eventIoId === 252, 'Event IO ID is 252 (Unplug Detection)');
  assert(norm.obd.unplugged === true, 'OBD unplugged detected as TRUE');
  assert(norm.alarmEvent !== undefined, 'Alarm event generated');
  assert(norm.alarmEvent?.type === 'unplugged', `Alarm type is 'unplugged' (got ${norm.alarmEvent?.type})`);
  assert(norm.obd.vin === '1HGCR2F83HA000001', `VIN decoded as '1HGCR2F83HA000001' (got ${norm.obd.vin})`);
  assert(norm.obd.dtcCodes.includes('P0300'), 'DTC code P0300 found in decoded list');
  assert(norm.obd.dtcCodes.includes('P0171'), 'DTC code P0171 found in decoded list');
  assert(norm.obd.rpm === 3150, `OBD RPM decoded as 3150 (got ${norm.obd.rpm})`);
  assert(norm.obd.coolantTemperature === 94, `OBD Coolant Temp decoded as 94°C (got ${norm.obd.coolantTemperature})`);
  assert(norm.gps.speed === 62, `GPS speed decoded as 62 km/h (got ${norm.gps.speed})`);
}

console.log('\n========================================================');
console.log(`📊 Test Summary: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('========================================================\n');
