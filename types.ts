export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea';
}

export interface AuthTypeDefinition {
  id: string;
  name: string;
  fields: CredentialField[];
  example?: string;
}

export interface CredentialItem {
  id: string;
  serviceName: string;
  accountName: string;
  authTypeId: string;
  credentials: Record<string, string>; // Encrypted value stored in DB, Decrypted in memory
  tags: string[];
  docUrl?: string;
  expiry?: string; // ISO Date string YYYY-MM-DD
  memo?: string;
  createdAt: string;
}

export interface StoredDatabase {
  verificationHash: string; // SHA256 of the master password to verify correctness
  salt: string;            // Salt for PBKDF2
  items: EncryptedItem[];
}

export interface EncryptedItem {
  id: string;
  ciphertext: string; // The entire CredentialItem JSON stringified and encrypted
}

export type ThemeMode = 'light' | 'dark';