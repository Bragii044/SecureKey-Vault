import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('secureVaultStorage', {
    get: () => ipcRenderer.invoke('vault-storage:get') as Promise<string | null>,
    set: (value: string) => ipcRenderer.invoke('vault-storage:set', value) as Promise<void>,
    remove: () => ipcRenderer.invoke('vault-storage:remove') as Promise<void>,
    isSecureStorageAvailable: () => ipcRenderer.invoke('vault-storage:is-secure') as Promise<boolean>,
});
