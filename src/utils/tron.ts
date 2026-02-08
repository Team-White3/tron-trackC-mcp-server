import { createHash } from 'node:crypto';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_MAP: Record<string, number> = Object.fromEntries(
  [...BASE58_ALPHABET].map((c, i) => [c, i])
);

function sha256(data: Uint8Array): Uint8Array {
  return createHash('sha256').update(data).digest();
}

function doubleSha256(data: Uint8Array): Uint8Array {
  return sha256(sha256(data));
}

export function base58Decode(input: string): Uint8Array {
  if (!input) return new Uint8Array();

  let num = 0n;
  for (const char of input) {
    const value = BASE58_MAP[char];
    if (value === undefined) {
      throw new Error(`Invalid base58 character: "${char}"`);
    }
    num = num * 58n + BigInt(value);
  }

  // Convert BigInt to bytes (big-endian)
  const bytes: number[] = [];
  while (num > 0n) {
    bytes.push(Number(num % 256n));
    num /= 256n;
  }
  bytes.reverse();

  // Deal with leading zeros
  let leadingZeros = 0;
  for (const char of input) {
    if (char === '1') leadingZeros++;
    else break;
  }

  return new Uint8Array([...new Array(leadingZeros).fill(0), ...bytes]);
}

export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';

  // Count leading zeros
  let leadingZeros = 0;
  for (const b of bytes) {
    if (b === 0) leadingZeros++;
    else break;
  }

  let num = 0n;
  for (const b of bytes) {
    num = num * 256n + BigInt(b);
  }

  let encoded = '';
  while (num > 0n) {
    const rem = Number(num % 58n);
    num /= 58n;
    encoded = BASE58_ALPHABET[rem] + encoded;
  }

  return '1'.repeat(leadingZeros) + encoded;
}

export function base58CheckDecode(input: string): Uint8Array {
  const decoded = base58Decode(input);
  if (decoded.length < 4) throw new Error('Invalid base58check: too short');

  const payload = decoded.slice(0, -4);
  const checksum = decoded.slice(-4);
  const expected = doubleSha256(payload).slice(0, 4);

  for (let i = 0; i < 4; i++) {
    if (checksum[i] !== expected[i]) {
      throw new Error('Invalid base58check: checksum mismatch');
    }
  }

  return payload;
}

export function base58CheckEncode(payload: Uint8Array): string {
  const checksum = doubleSha256(payload).slice(0, 4);
  const full = new Uint8Array(payload.length + 4);
  full.set(payload, 0);
  full.set(checksum, payload.length);
  return base58Encode(full);
}

export function tronBase58ToHex(addressBase58: string): string {
  const payload = base58CheckDecode(addressBase58);
  if (payload.length !== 21) throw new Error('Invalid TRON address: bad payload length');
  if (payload[0] !== 0x41) throw new Error('Invalid TRON address: bad prefix');
  return Buffer.from(payload).toString('hex');
}

export function tronHexToBase58(addressHex: string): string {
  const hex = addressHex.startsWith('0x') ? addressHex.slice(2) : addressHex;
  const bytes = Buffer.from(hex, 'hex');
  if (bytes.length !== 21) throw new Error('Invalid TRON hex address: expected 21 bytes');
  if (bytes[0] !== 0x41) throw new Error('Invalid TRON hex address: bad prefix');
  return base58CheckEncode(bytes);
}

export function isValidTronBase58Address(address: string): boolean {
  // Fast path (format)
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) return false;
  try {
    tronBase58ToHex(address);
    return true;
  } catch {
    return false;
  }
}

export function assertTronBase58Address(address: string, fieldName: string = 'address') {
  if (!isValidTronBase58Address(address)) {
    throw new Error(`Invalid TRON address for "${fieldName}"`);
  }
}

export function assertTxId(txid: string, fieldName: string = 'txid') {
  if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
    throw new Error(`Invalid transaction id for "${fieldName}" (expected 64 hex chars)`);
  }
}

export function parseDecimalToBigInt(amount: string, decimals: number): bigint {
  const raw = amount.trim();
  if (!raw) throw new Error('Amount is required');

  const m = raw.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) throw new Error('Amount must be a positive decimal string');

  const whole = m[1] ?? '0';
  const frac = m[2] ?? '';

  if (frac.length > decimals) {
    throw new Error(`Amount has too many decimal places (max ${decimals})`);
  }

  const base = 10n ** BigInt(decimals);
  const wholePart = BigInt(whole) * base;
  const fracPart = frac ? BigInt(frac.padEnd(decimals, '0')) : 0n;
  return wholePart + fracPart;
}

export function formatBigIntDecimal(value: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = value % base;
  if (decimals === 0) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
}

export function trxToSun(amountTrx: string): string {
  const sun = parseDecimalToBigInt(amountTrx, 6);
  return sun.toString();
}

export function sunToTrx(amountSun: string | number | bigint): string {
  const sun = typeof amountSun === 'bigint' ? amountSun : BigInt(amountSun.toString());
  return formatBigIntDecimal(sun, 6);
}

export function abiEncodeAddressParam(tronBase58Address: string): string {
  // Solidity `address` is 20 bytes. TRON base58 decodes to 21 bytes (0x41 + 20 bytes).
  const hex21 = tronBase58ToHex(tronBase58Address); // 42 hex chars (21 bytes)
  const hex20 = hex21.slice(2); // drop "41"
  return hex20.padStart(64, '0');
}

export function abiEncodeUint256Param(value: string | number | bigint): string {
  const v = typeof value === 'bigint' ? value : BigInt(value.toString());
  if (v < 0n) throw new Error('uint256 must be non-negative');
  return v.toString(16).padStart(64, '0');
}

