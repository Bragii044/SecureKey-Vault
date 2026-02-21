import { DB_KEY } from '../constants';
import { CredentialItem, StoredDatabase } from '../types';
import {
  decryptData,
  decryptLegacyData,
  deriveKey,
  deriveLegacyKeyCandidates,
  encryptData,
  generateSalt,
  hashPassword,
  isLegacyVerificationHash,
  verifyLegacyPassword,
  verifyPassword
} from './cryptoService';

export class DBService {
  private masterKey: string | null = null;

  constructor() { }

  private canUseSecureStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.secureVaultStorage !== 'undefined';
  }

  private parseDatabase(raw: string): StoredDatabase | null {
    try {
      const parsed = JSON.parse(raw) as StoredDatabase;
      if (!parsed || typeof parsed !== 'object') return null;
      if (typeof parsed.salt !== 'string' || typeof parsed.verificationHash !== 'string') return null;
      if (!Array.isArray(parsed.items)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private async readRawDatabase(): Promise<string | null> {
    if (this.canUseSecureStorage()) {
      const secureRaw = await window.secureVaultStorage!.get();
      if (secureRaw) {
        return secureRaw;
      }

      // One-time migration path from legacy localStorage.
      const legacyRaw = localStorage.getItem(DB_KEY);
      if (legacyRaw) {
        try {
          await window.secureVaultStorage!.set(legacyRaw);
          localStorage.removeItem(DB_KEY);
        } catch {
          return legacyRaw;
        }
        return legacyRaw;
      }

      return null;
    }

    return localStorage.getItem(DB_KEY);
  }

  private async writeRawDatabase(raw: string): Promise<void> {
    if (this.canUseSecureStorage()) {
      await window.secureVaultStorage!.set(raw);
      localStorage.removeItem(DB_KEY);
      return;
    }

    localStorage.setItem(DB_KEY, raw);
  }

  private async removeRawDatabase(): Promise<void> {
    if (this.canUseSecureStorage()) {
      await window.secureVaultStorage!.remove();
      localStorage.removeItem(DB_KEY);
      return;
    }

    localStorage.removeItem(DB_KEY);
  }

  // Initialize or check if DB exists
  async hasDatabase(): Promise<boolean> {
    return !!(await this.readRawDatabase());
  }

  // Set the master key for the session (expects the derived key)
  setMasterKey(derivedKey: string | null) {
    this.masterKey = derivedKey;
  }

  // Create a new database with a master password
  async initDatabase(password: string): Promise<void> {
    const salt = generateSalt();
    const verificationHash = await hashPassword(password, salt);
    const emptyDB: StoredDatabase = {
      version: 2,
      verificationHash,
      salt,
      items: []
    };
    await this.writeRawDatabase(JSON.stringify(emptyDB));

    // Set the derived key for current session
    const derivedKey = await deriveKey(password, salt);
    this.setMasterKey(derivedKey);
  }

  // Get the database info (salt and hash)
  async getDatabaseInfo(): Promise<{ salt: string, verificationHash: string } | null> {
    const raw = await this.readRawDatabase();
    if (!raw) return null;
    const db = this.parseDatabase(raw);
    if (!db) return null;
    return { salt: db.salt, verificationHash: db.verificationHash };
  }

  async unlockDatabase(password: string): Promise<string | null> {
    const raw = await this.readRawDatabase();
    if (!raw) return null;

    const db = this.parseDatabase(raw);
    if (!db) return null;

    if (isLegacyVerificationHash(db.verificationHash)) {
      const valid = await verifyLegacyPassword(password, db.salt, db.verificationHash);
      if (!valid) return null;

      const legacyKeys = await deriveLegacyKeyCandidates(password, db.salt);

      // Best effort auto-migration to modern format. If it fails, keep legacy mode so user is not locked out.
      try {
        return await this.migrateLegacyDatabase(password, db, legacyKeys);
      } catch {
        return this.findUsableLegacyKey(db, legacyKeys);
      }
    }

    const valid = await verifyPassword(password, db.salt, db.verificationHash);
    if (!valid) return null;

    return deriveKey(password, db.salt);
  }

  private async findUsableLegacyKey(legacyDb: StoredDatabase, legacyKeys: string[]): Promise<string | null> {
    if (legacyDb.items.length === 0) {
      return legacyKeys[0] || null;
    }

    const sampleCiphertext = legacyDb.items[0]?.ciphertext;
    if (!sampleCiphertext) {
      return legacyKeys[0] || null;
    }

    for (const legacyKey of legacyKeys) {
      const sample = await decryptLegacyData<CredentialItem>(sampleCiphertext, legacyKey);
      if (sample) {
        return legacyKey;
      }
    }

    return null;
  }

  private async decryptLegacyItems(
    legacyDb: StoredDatabase,
    legacyKeys: string[]
  ): Promise<CredentialItem[]> {
    for (const legacyKey of legacyKeys) {
      const decryptedItems: CredentialItem[] = [];
      let failed = false;

      for (const encryptedItem of legacyDb.items) {
        const decrypted = await decryptLegacyData<CredentialItem>(encryptedItem.ciphertext, legacyKey);
        if (!decrypted) {
          failed = true;
          break;
        }
        decryptedItems.push(decrypted);
      }

      if (!failed) {
        return decryptedItems;
      }
    }

    throw new Error('Legacy migration failed');
  }

  private async migrateLegacyDatabase(
    password: string,
    legacyDb: StoredDatabase,
    legacyKeys: string[]
  ): Promise<string> {
    const decryptedItems = await this.decryptLegacyItems(legacyDb, legacyKeys);

    const newSalt = generateSalt();
    const newVerificationHash = await hashPassword(password, newSalt);
    const newMasterKey = await deriveKey(password, newSalt);

    const migratedItems = [];
    for (const item of decryptedItems) {
      const ciphertext = await encryptData(item, newMasterKey);
      migratedItems.push({ id: item.id, ciphertext });
    }

    const migratedDb: StoredDatabase = {
      version: 2,
      verificationHash: newVerificationHash,
      salt: newSalt,
      items: migratedItems
    };

    await this.writeRawDatabase(JSON.stringify(migratedDb));
    return newMasterKey;
  }

  // Get all items decrypted
  async getAllItems(): Promise<CredentialItem[]> {
    if (!this.masterKey) throw new Error("Database locked");

    const raw = await this.readRawDatabase();
    if (!raw) return [];

    const db = this.parseDatabase(raw);
    if (!db) throw new Error("Corrupted database");
    const items: CredentialItem[] = [];

    for (const encryptedItem of db.items) {
      const decrypted = await decryptData<CredentialItem>(encryptedItem.ciphertext, this.masterKey);
      if (decrypted) {
        items.push(decrypted);
      }
    }

    // Sort by created date desc
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Save an item (Add or Update)
  async saveItem(item: CredentialItem): Promise<void> {
    if (!this.masterKey) throw new Error("Database locked");

    const raw = await this.readRawDatabase();
    if (!raw) throw new Error("Database not initialized");
    const db = this.parseDatabase(raw);
    if (!db) throw new Error("Corrupted database");

    // Encrypt the item
    const ciphertext = await encryptData(item, this.masterKey);

    // Check if update or insert
    const existingIndex = db.items.findIndex(i => i.id === item.id);

    if (existingIndex >= 0) {
      db.items[existingIndex] = { id: item.id, ciphertext };
    } else {
      db.items.push({ id: item.id, ciphertext });
    }

    await this.writeRawDatabase(JSON.stringify(db));
  }

  // Delete an item
  async deleteItem(id: string): Promise<void> {
    if (!this.masterKey) throw new Error("Database locked");

    const raw = await this.readRawDatabase();
    if (!raw) return;
    const db = this.parseDatabase(raw);
    if (!db) throw new Error("Corrupted database");

    db.items = db.items.filter(i => i.id !== id);
    await this.writeRawDatabase(JSON.stringify(db));
  }

  // Nuke DB
  async clearDatabase(): Promise<void> {
    await this.removeRawDatabase();
    this.masterKey = null;
  }

  // Export Data (Backup)
  async exportData(): Promise<string> {
    const raw = await this.readRawDatabase();
    return raw || "{}";
  }

  // Import database JSON from backup and overwrite current DB
  async importData(raw: string, legacyPassword?: string): Promise<void> {
    const db = this.parseDatabase(raw);
    if (!db) throw new Error("Invalid database format");

    if (isLegacyVerificationHash(db.verificationHash)) {
      if (!legacyPassword) {
        throw new Error("LegacyPasswordRequired");
      }

      const valid = await verifyLegacyPassword(legacyPassword, db.salt, db.verificationHash);
      if (!valid) {
        throw new Error("LegacyPasswordInvalid");
      }

      const legacyKeys = await deriveLegacyKeyCandidates(legacyPassword, db.salt);
      await this.migrateLegacyDatabase(legacyPassword, db, legacyKeys);
      this.masterKey = null;
      return;
    }

    await this.writeRawDatabase(raw);
    this.masterKey = null;
  }
}

export const dbService = new DBService();
