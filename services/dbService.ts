import { DB_KEY } from '../constants';
import { CredentialItem, StoredDatabase } from '../types';
import { encryptData, decryptData, hashPassword, deriveKey } from './cryptoService';
import CryptoJS from 'crypto-js';

export class DBService {
  private masterKey: string | null = null;

  constructor() { }

  // Initialize or check if DB exists
  hasDatabase(): boolean {
    return !!localStorage.getItem(DB_KEY);
  }

  // Set the master key for the session (expects the derived key)
  setMasterKey(derivedKey: string) {
    this.masterKey = derivedKey;
  }

  // Create a new database with a master password
  initDatabase(password: string) {
    const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
    const emptyDB: StoredDatabase = {
      verificationHash: hashPassword(password, salt),
      salt,
      items: []
    };
    localStorage.setItem(DB_KEY, JSON.stringify(emptyDB));

    // Set the derived key for current session
    const derivedKey = deriveKey(password, salt);
    this.setMasterKey(derivedKey);
  }

  // Get the database info (salt and hash)
  getDatabaseInfo(): { salt: string, verificationHash: string } | null {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    const db = JSON.parse(raw) as StoredDatabase;
    return { salt: db.salt, verificationHash: db.verificationHash };
  }

  // Get all items decrypted
  getAllItems(): CredentialItem[] {
    if (!this.masterKey) throw new Error("Database locked");

    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return [];

    const db = JSON.parse(raw) as StoredDatabase;
    const items: CredentialItem[] = [];

    for (const encryptedItem of db.items) {
      const decrypted = decryptData<CredentialItem>(encryptedItem.ciphertext, this.masterKey);
      if (decrypted) {
        items.push(decrypted);
      }
    }

    // Sort by created date desc
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Save an item (Add or Update)
  saveItem(item: CredentialItem) {
    if (!this.masterKey) throw new Error("Database locked");

    const raw = localStorage.getItem(DB_KEY);
    if (!raw) throw new Error("Database not initialized");
    const db = JSON.parse(raw) as StoredDatabase;

    // Encrypt the item
    const ciphertext = encryptData(item, this.masterKey);

    // Check if update or insert
    const existingIndex = db.items.findIndex(i => i.id === item.id);

    if (existingIndex >= 0) {
      db.items[existingIndex] = { id: item.id, ciphertext };
    } else {
      db.items.push({ id: item.id, ciphertext });
    }

    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  // Delete an item
  deleteItem(id: string) {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return;
    const db = JSON.parse(raw) as StoredDatabase;

    db.items = db.items.filter(i => i.id !== id);
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  // Nuke DB
  clearDatabase() {
    localStorage.removeItem(DB_KEY);
    this.masterKey = null;
  }

  // Export Data (Backup)
  exportData(): string {
    const raw = localStorage.getItem(DB_KEY);
    return raw || "{}";
  }
}

export const dbService = new DBService();