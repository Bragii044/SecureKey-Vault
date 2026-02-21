export {};

declare global {
  interface Window {
    secureVaultStorage?: {
      get: () => Promise<string | null>;
      set: (value: string) => Promise<void>;
      remove: () => Promise<void>;
      isSecureStorageAvailable: () => Promise<boolean>;
    };
  }
}
