export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea';
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
  updatedAt?: string; // Last modified date
}

export interface AuthTypeField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea';
}

export interface AuthTypeDefinition {
  id: string;
  name: string;
  fields: AuthTypeField[];
  example?: string;
  description?: string;
}

export interface EncryptedItem {
  id: string;
  ciphertext: string; // The entire CredentialItem JSON stringified and encrypted
}

export interface StoredDatabase {
  version?: 1 | 2;
  verificationHash: string; // PBKDF2-based verification hash of the master password
  salt: string;            // Salt for PBKDF2
  items: EncryptedItem[];
}

export type ThemeMode = 'light' | 'dark';
