const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const KEY_DERIVATION_ITERATIONS = 310000;
const PASSWORD_HASH_ITERATIONS = 210000;
const LEGACY_KEY_DERIVATION_ITERATIONS = 100000;
const LEGACY_KEY_DERIVATION_HASHES: Array<'SHA-256' | 'SHA-1'> = ['SHA-256', 'SHA-1'];
const AES_GCM_IV_LENGTH = 12;
const AES_CBC_BLOCK_SIZE = 16;
const OPENSSL_SALTED_PREFIX = textEncoder.encode('Salted__');

const MD5_SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];

const MD5_CONSTANTS = new Int32Array(64);
for (let i = 0; i < 64; i += 1) {
  MD5_CONSTANTS[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) | 0;
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const fromBase64 = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const toHex = (bytes: Uint8Array): string => {
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
};

const fromHex = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
};

const concatBytes = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
};

const concatManyBytes = (...parts: Uint8Array[]): Uint8Array => {
  let totalLength = 0;
  for (const part of parts) {
    totalLength += part.length;
  }

  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

const leftRotate = (value: number, bits: number): number => {
  return (value << bits) | (value >>> (32 - bits));
};

// Minimal MD5 implementation for legacy OpenSSL EVP_BytesToKey compatibility
const md5 = (input: Uint8Array): Uint8Array => {
  const originalLength = input.length;
  const bitLength = originalLength * 8;
  const paddedLength = (((originalLength + 8) >>> 6) + 1) * 64;

  const buffer = new Uint8Array(paddedLength);
  buffer.set(input);
  buffer[originalLength] = 0x80;

  const dataView = new DataView(buffer.buffer);
  dataView.setUint32(paddedLength - 8, bitLength, true);
  dataView.setUint32(paddedLength - 4, Math.floor(bitLength / 0x100000000), true);

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const chunk = new Int32Array(16);
    for (let i = 0; i < 16; i += 1) {
      chunk[i] = dataView.getInt32(offset + (i * 4), true);
    }

    let aa = a;
    let bb = b;
    let cc = c;
    let dd = d;

    for (let i = 0; i < 64; i += 1) {
      let f = 0;
      let g = 0;

      if (i < 16) {
        f = (bb & cc) | (~bb & dd);
        g = i;
      } else if (i < 32) {
        f = (dd & bb) | (~dd & cc);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = bb ^ cc ^ dd;
        g = (3 * i + 5) % 16;
      } else {
        f = cc ^ (bb | ~dd);
        g = (7 * i) % 16;
      }

      const nextD = dd;
      dd = cc;
      cc = bb;
      const sum = (aa + f + MD5_CONSTANTS[i] + chunk[g]) | 0;
      bb = (bb + leftRotate(sum, MD5_SHIFTS[i])) | 0;
      aa = nextD;
    }

    a = (a + aa) | 0;
    b = (b + bb) | 0;
    c = (c + cc) | 0;
    d = (d + dd) | 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setInt32(0, a, true);
  outView.setInt32(4, b, true);
  outView.setInt32(8, c, true);
  outView.setInt32(12, d, true);
  return out;
};

const evpBytesToKey = (
  passphrase: Uint8Array,
  salt: Uint8Array,
  keyLength: number,
  ivLength: number
): { key: Uint8Array; iv: Uint8Array } => {
  let derived = new Uint8Array(0);
  let block = new Uint8Array(0);

  while (derived.length < keyLength + ivLength) {
    block = md5(concatManyBytes(block, passphrase, salt));
    derived = concatBytes(derived, block);
  }

  return {
    key: derived.slice(0, keyLength),
    iv: derived.slice(keyLength, keyLength + ivLength)
  };
};

const pkcs7Pad = (data: Uint8Array, blockSize: number): Uint8Array => {
  const remainder = data.length % blockSize;
  const padLength = remainder === 0 ? blockSize : (blockSize - remainder);
  const out = new Uint8Array(data.length + padLength);
  out.set(data);
  out.fill(padLength, data.length);
  return out;
};

const pkcs7Unpad = (data: Uint8Array): Uint8Array => {
  if (data.length === 0) throw new Error('Invalid padded data');
  const padLength = data[data.length - 1];
  if (padLength < 1 || padLength > AES_CBC_BLOCK_SIZE || padLength > data.length) {
    throw new Error('Invalid PKCS7 padding');
  }
  for (let i = data.length - padLength; i < data.length; i += 1) {
    if (data[i] !== padLength) {
      throw new Error('Invalid PKCS7 padding');
    }
  }
  return data.slice(0, data.length - padLength);
};

const constantTimeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
};

const createPurposeSalt = (salt: string, purpose: string): Uint8Array => {
  const saltBytes = fromBase64(salt);
  const purposeBytes = textEncoder.encode(`:${purpose}`);
  return concatBytes(saltBytes, purposeBytes);
};

const importPasswordKey = async (password: string): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
};

const deriveBytes = async (
  password: string,
  salt: Uint8Array,
  hash: 'SHA-1' | 'SHA-256',
  iterations: number
): Promise<Uint8Array> => {
  const baseKey = await importPasswordKey(password);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash,
      salt,
      iterations
    },
    baseKey,
    256
  );
  return new Uint8Array(derivedBits);
};

const importAesGcmKey = async (derivedKey: string): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    'raw',
    fromBase64(derivedKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

const importAesCbcKey = async (derivedKeyHex: string, salt: Uint8Array): Promise<{ key: CryptoKey; iv: Uint8Array }> => {
  const passphraseBytes = textEncoder.encode(derivedKeyHex);
  const { key, iv } = evpBytesToKey(passphraseBytes, salt, 32, 16);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-CBC' },
    false,
    ['encrypt', 'decrypt']
  );
  return { key: cryptoKey, iv };
};

export const isLegacyVerificationHash = (storedHash: string): boolean => {
  return /^[a-f0-9]{64}$/i.test(storedHash);
};

export const isLegacyDerivedKey = (derivedKey: string): boolean => {
  return /^[a-f0-9]{64}$/i.test(derivedKey);
};

export const generateSalt = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return toBase64(bytes);
};

export const deriveLegacyKey = async (password: string, salt: string): Promise<string> => {
  const saltBytes = textEncoder.encode(salt);
  const derived = await deriveBytes(password, saltBytes, 'SHA-256', LEGACY_KEY_DERIVATION_ITERATIONS);
  return toHex(derived);
};

export const deriveLegacyKeyCandidates = async (password: string, salt: string): Promise<string[]> => {
  const saltBytes = textEncoder.encode(salt);
  const candidates: string[] = [];

  for (const hash of LEGACY_KEY_DERIVATION_HASHES) {
    const derived = await deriveBytes(password, saltBytes, hash, LEGACY_KEY_DERIVATION_ITERATIONS);
    const keyHex = toHex(derived);
    if (!candidates.includes(keyHex)) {
      candidates.push(keyHex);
    }
  }

  return candidates;
};

export const verifyLegacyPassword = async (password: string, salt: string, storedHash: string): Promise<boolean> => {
  try {
    const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(password + salt));
    const candidate = toHex(new Uint8Array(digest));
    return candidate.toLowerCase() === storedHash.toLowerCase();
  } catch {
    return false;
  }
};

// Derive a 256-bit key from the password and salt (for modern AES-GCM encryption)
export const deriveKey = async (password: string, salt: string): Promise<string> => {
  const derived = await deriveBytes(
    password,
    createPurposeSalt(salt, 'encryption'),
    'SHA-256',
    KEY_DERIVATION_ITERATIONS
  );
  return toBase64(derived);
};

// Verify if the provided password matches the stored verification hash
export const verifyPassword = async (password: string, salt: string, storedHash: string): Promise<boolean> => {
  if (isLegacyVerificationHash(storedHash)) {
    return verifyLegacyPassword(password, salt, storedHash);
  }

  try {
    const candidate = await hashPassword(password, salt);
    return constantTimeEqual(fromBase64(candidate), fromBase64(storedHash));
  } catch {
    return false;
  }
};

// Generate a verification hash for the password
export const hashPassword = async (password: string, salt: string): Promise<string> => {
  const derived = await deriveBytes(
    password,
    createPurposeSalt(salt, 'verification'),
    'SHA-256',
    PASSWORD_HASH_ITERATIONS
  );
  return toBase64(derived);
};

const encryptLegacyData = async (data: unknown, legacyDerivedKey: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(8));
  const { key, iv } = await importAesCbcKey(legacyDerivedKey, salt);
  const payload = textEncoder.encode(JSON.stringify(data));
  const paddedPayload = pkcs7Pad(payload, AES_CBC_BLOCK_SIZE);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-CBC',
      iv
    },
    key,
    paddedPayload
  );

  const ciphertext = new Uint8Array(encrypted);
  return toBase64(concatManyBytes(OPENSSL_SALTED_PREFIX, salt, ciphertext));
};

export const decryptLegacyData = async <T>(ciphertext: string, legacyDerivedKey: string): Promise<T | null> => {
  try {
    const encryptedBytes = fromBase64(ciphertext);
    if (encryptedBytes.length < OPENSSL_SALTED_PREFIX.length + 8 + 16) return null;

    const prefix = encryptedBytes.slice(0, OPENSSL_SALTED_PREFIX.length);
    for (let i = 0; i < OPENSSL_SALTED_PREFIX.length; i += 1) {
      if (prefix[i] !== OPENSSL_SALTED_PREFIX[i]) return null;
    }

    const salt = encryptedBytes.slice(OPENSSL_SALTED_PREFIX.length, OPENSSL_SALTED_PREFIX.length + 8);
    const payload = encryptedBytes.slice(OPENSSL_SALTED_PREFIX.length + 8);
    const { key, iv } = await importAesCbcKey(legacyDerivedKey, salt);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-CBC',
        iv
      },
      key,
      payload
    );

    const unpadded = pkcs7Unpad(new Uint8Array(decrypted));
    const decryptedString = textDecoder.decode(unpadded);
    return JSON.parse(decryptedString) as T;
  } catch {
    return null;
  }
};

// Encrypt object using modern AES-GCM; legacy keys are supported for backward compatibility
export const encryptData = async (data: unknown, derivedKey: string): Promise<string> => {
  if (isLegacyDerivedKey(derivedKey)) {
    return encryptLegacyData(data, derivedKey);
  }

  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
  const aesKey = await importAesGcmKey(derivedKey);
  const payload = textEncoder.encode(JSON.stringify(data));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    aesKey,
    payload
  );

  const ciphertext = new Uint8Array(encrypted);
  return `${toBase64(iv)}:${toBase64(ciphertext)}`;
};

// Decrypt object from modern AES-GCM; legacy ciphertext is supported for backward compatibility
export const decryptData = async <T>(ciphertext: string, derivedKey: string): Promise<T | null> => {
  if (isLegacyDerivedKey(derivedKey)) {
    return decryptLegacyData<T>(ciphertext, derivedKey);
  }

  try {
    const [ivBase64, ciphertextBase64] = ciphertext.split(':');
    if (!ivBase64 || !ciphertextBase64) return null;

    const iv = fromBase64(ivBase64);
    const encryptedBytes = fromBase64(ciphertextBase64);
    const aesKey = await importAesGcmKey(derivedKey);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      aesKey,
      encryptedBytes
    );

    const decryptedString = textDecoder.decode(decrypted);
    return JSON.parse(decryptedString) as T;
  } catch {
    return null;
  }
};
