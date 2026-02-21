import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const LEGACY_VERIFICATION_REGEX = /^[a-f0-9]{64}$/i;

const ENCRYPTION_ITERATIONS_V2 = 310000;
const VERIFICATION_ITERATIONS_V2 = 210000;
const LEGACY_ENCRYPTION_ITERATIONS = 100000;
const LEGACY_ENCRYPTION_HASHES = ['sha256', 'sha1'];

const PURPOSE_ENCRYPTION = Buffer.from(':encryption', 'utf8');
const PURPOSE_VERIFICATION = Buffer.from(':verification', 'utf8');
const OPENSSL_SALTED_PREFIX = Buffer.from('Salted__', 'utf8');

function parseArgs(argv) {
  const parsed = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      parsed[key] = 'true';
    } else {
      parsed[key] = value;
      i += 1;
    }
  }

  return parsed;
}

function printUsage() {
  console.log('Usage: node scripts/migrate-db-101-to-102.js --input <legacy.json> [--output <migrated.json>] [--password <master-password>]');
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    const onData = (char) => {
      const text = String(char);
      if (text === '\n' || text === '\r' || text === '\u0004') {
        rl.output.write('\n');
        return;
      }

      rl.output.clearLine(0);
      rl.output.cursorTo(0);
      rl.output.write(question + '*'.repeat(rl.line.length));
    };

    process.stdin.on('data', onData);
    rl.question(question, (answer) => {
      process.stdin.removeListener('data', onData);
      rl.close();
      resolve(answer);
    });
  });
}

function timingSafeStringEqualHex(a, b) {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function verifyLegacyMasterPassword(password, salt, verificationHash) {
  const candidate = createHash('sha256').update(password + salt, 'utf8').digest('hex');
  return timingSafeStringEqualHex(candidate.toLowerCase(), verificationHash.toLowerCase());
}

function deriveLegacyKeys(password, salt) {
  const saltBytes = Buffer.from(salt, 'utf8');
  const candidates = [];

  for (const hash of LEGACY_ENCRYPTION_HASHES) {
    const keyHex = pbkdf2Sync(password, saltBytes, LEGACY_ENCRYPTION_ITERATIONS, 32, hash).toString('hex');
    if (!candidates.some((candidate) => candidate.keyHex === keyHex)) {
      candidates.push({ keyHex, hash });
    }
  }

  return candidates;
}

function evpBytesToKey(passphrase, salt, keyLength, ivLength) {
  let derived = Buffer.alloc(0);
  let block = Buffer.alloc(0);

  while (derived.length < keyLength + ivLength) {
    const hash = createHash('md5');
    hash.update(block);
    hash.update(passphrase);
    hash.update(salt);
    block = hash.digest();
    derived = Buffer.concat([derived, block]);
  }

  return {
    key: derived.subarray(0, keyLength),
    iv: derived.subarray(keyLength, keyLength + ivLength),
  };
}

function decryptLegacyCiphertext(ciphertext, legacyDerivedKeyHex) {
  const raw = Buffer.from(ciphertext, 'base64');
  if (raw.length < 16) {
    throw new Error('Ciphertext too short');
  }

  const prefix = raw.subarray(0, 8);
  if (!prefix.equals(OPENSSL_SALTED_PREFIX)) {
    throw new Error('Unsupported legacy ciphertext header');
  }

  const salt = raw.subarray(8, 16);
  const payload = raw.subarray(16);

  const { key, iv } = evpBytesToKey(Buffer.from(legacyDerivedKeyHex, 'utf8'), salt, 32, 16);
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  decipher.setAutoPadding(true);

  const plaintext = Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext);
}

function deriveV2EncryptionKeyBytes(password, saltBase64) {
  const saltBytes = Buffer.from(saltBase64, 'base64');
  const purposeSalt = Buffer.concat([saltBytes, PURPOSE_ENCRYPTION]);
  return pbkdf2Sync(password, purposeSalt, ENCRYPTION_ITERATIONS_V2, 32, 'sha256');
}

function deriveV2VerificationHash(password, saltBase64) {
  const saltBytes = Buffer.from(saltBase64, 'base64');
  const purposeSalt = Buffer.concat([saltBytes, PURPOSE_VERIFICATION]);
  const bytes = pbkdf2Sync(password, purposeSalt, VERIFICATION_ITERATIONS_V2, 32, 'sha256');
  return bytes.toString('base64');
}

function encryptV2Ciphertext(payload, keyBytes) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyBytes, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([encrypted, tag]);
  return `${iv.toString('base64')}:${packed.toString('base64')}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === 'true' || args.h === 'true') {
    printUsage();
    process.exit(0);
  }

  const inputPath = args.input;
  if (!inputPath) {
    printUsage();
    throw new Error('--input is required');
  }

  const resolvedInput = path.resolve(inputPath);
  const defaultOutput = path.join(
    path.dirname(resolvedInput),
    `${path.basename(resolvedInput, path.extname(resolvedInput))}-v102.json`
  );
  const resolvedOutput = path.resolve(args.output || defaultOutput);

  const password = args.password || await promptHidden('Master password: ');
  if (!password) {
    throw new Error('Master password is required');
  }

  const raw = await fs.readFile(resolvedInput, 'utf8');
  const db = JSON.parse(raw);

  if (!db || typeof db !== 'object' || typeof db.salt !== 'string' || typeof db.verificationHash !== 'string' || !Array.isArray(db.items)) {
    throw new Error('Invalid legacy database format');
  }

  if (!LEGACY_VERIFICATION_REGEX.test(db.verificationHash)) {
    throw new Error('This file does not look like a 1.0.1 legacy DB (verificationHash is not SHA-256 hex)');
  }

  if (!verifyLegacyMasterPassword(password, db.salt, db.verificationHash)) {
    throw new Error('Master password verification failed for legacy DB');
  }

  const legacyDerivedKeys = deriveLegacyKeys(password, db.salt);
  let selectedLegacyHash = null;

  const decryptedItems = [];
  for (const [index, item] of db.items.entries()) {
    if (!item || typeof item.id !== 'string' || typeof item.ciphertext !== 'string') {
      throw new Error(`Invalid item format at index ${index}`);
    }

    let decrypted = null;
    let lastError = null;

    for (const legacyCandidate of legacyDerivedKeys) {
      try {
        decrypted = decryptLegacyCiphertext(item.ciphertext, legacyCandidate.keyHex);
        if (!selectedLegacyHash) {
          selectedLegacyHash = legacyCandidate.hash;
        }
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!decrypted) {
      const detail = lastError instanceof Error ? lastError.message : 'unknown decryption error';
      throw new Error(`Failed to decrypt legacy item at index ${index}: ${detail}`);
    }

    decryptedItems.push({ id: item.id, payload: decrypted });
  }

  const newSalt = randomBytes(16).toString('base64');
  const newVerificationHash = deriveV2VerificationHash(password, newSalt);
  const newKeyBytes = deriveV2EncryptionKeyBytes(password, newSalt);

  const migratedItems = decryptedItems.map(({ id, payload }) => ({
    id,
    ciphertext: encryptV2Ciphertext(payload, newKeyBytes),
  }));

  const migrated = {
    version: 2,
    verificationHash: newVerificationHash,
    salt: newSalt,
    items: migratedItems,
  };

  await fs.writeFile(resolvedOutput, JSON.stringify(migrated, null, 2), 'utf8');

  console.log('Migration completed successfully.');
  if (selectedLegacyHash) {
    console.log(`Legacy key derivation hash: ${selectedLegacyHash}`);
  }
  console.log(`Input : ${resolvedInput}`);
  console.log(`Output: ${resolvedOutput}`);
  console.log(`Items : ${migratedItems.length}`);
}

main().catch((error) => {
  console.error(`Migration failed: ${error.message}`);
  process.exit(1);
});
