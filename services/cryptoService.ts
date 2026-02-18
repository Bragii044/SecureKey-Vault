import CryptoJS from 'crypto-js';

// Derive a strong key from the password and salt using PBKDF2
export const deriveKey = (password: string, salt: string): string => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000 // High iteration count for security
  }).toString();
};

// Verify if the provided password matches the stored verification hash
export const verifyPassword = (password: string, salt: string, storedHash: string): boolean => {
  const hash = CryptoJS.SHA256(password + salt).toString();
  return hash === storedHash;
};

// Generate a hash for the password to store for verification
export const hashPassword = (password: string, salt: string): string => {
  return CryptoJS.SHA256(password + salt).toString();
};

// Encrypt an object (stringified)
export const encryptData = (data: any, derivedKey: string): string => {
  const jsonString = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonString, derivedKey).toString();
};

// Decrypt a ciphertext string back to an object
export const decryptData = <T>(ciphertext: string, derivedKey: string): T | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, derivedKey);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedString) return null;
    return JSON.parse(decryptedString) as T;
  } catch (e) {
    console.error("Decryption failed", e);
    return null;
  }
};