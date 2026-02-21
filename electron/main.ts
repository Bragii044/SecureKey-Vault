import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;

const STORAGE_FILE_NAME = 'vault.secure.store';

type PersistedStorage = {
    version: number;
    mode: 'safeStorage' | 'plain';
    data: string;
};

const getStorageFilePath = () => path.join(app.getPath('userData'), STORAGE_FILE_NAME);

const readPersistedStorage = async (): Promise<string | null> => {
    try {
        const filePath = getStorageFilePath();
        const raw = await fs.readFile(filePath, 'utf8');

        // Backward compatibility: if file contains raw DB JSON directly, return as-is.
        let payload: Partial<PersistedStorage> | null = null;
        try {
            payload = JSON.parse(raw) as Partial<PersistedStorage>;
        } catch {
            return raw;
        }

        if (!payload || typeof payload.mode !== 'string' || typeof payload.data !== 'string') {
            return raw;
        }

        if (payload.mode === 'safeStorage') {
            if (!safeStorage.isEncryptionAvailable()) {
                throw new Error('OS encryption is unavailable');
            }

            const encryptedBuffer = Buffer.from(payload.data, 'base64');
            return safeStorage.decryptString(encryptedBuffer);
        }

        return payload.data;
    } catch (error: any) {
        if (error?.code === 'ENOENT') {
            return null;
        }

        throw error;
    }
};

const writePersistedStorage = async (value: string): Promise<void> => {
    const filePath = getStorageFilePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const payload: PersistedStorage = safeStorage.isEncryptionAvailable()
        ? {
            version: 1,
            mode: 'safeStorage',
            data: safeStorage.encryptString(value).toString('base64')
        }
        : {
            version: 1,
            mode: 'plain',
            data: value
        };

    await fs.writeFile(filePath, JSON.stringify(payload), 'utf8');
};

const removePersistedStorage = async (): Promise<void> => {
    const filePath = getStorageFilePath();
    await fs.rm(filePath, { force: true });
};

const registerStorageIpcHandlers = () => {
    ipcMain.removeHandler('vault-storage:get');
    ipcMain.removeHandler('vault-storage:set');
    ipcMain.removeHandler('vault-storage:remove');
    ipcMain.removeHandler('vault-storage:is-secure');

    ipcMain.handle('vault-storage:get', async () => readPersistedStorage());
    ipcMain.handle('vault-storage:set', async (_event, value: string) => {
        if (typeof value !== 'string') {
            throw new Error('Invalid storage payload');
        }

        await writePersistedStorage(value);
    });
    ipcMain.handle('vault-storage:remove', async () => {
        await removePersistedStorage();
    });
    ipcMain.handle('vault-storage:is-secure', () => safeStorage.isEncryptionAvailable());
};

function createWindow() {
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC as string, 'icon.ico'),
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString());
    });

    if (VITE_DEV_SERVER_URL && !app.isPackaged) {
        win.loadURL(VITE_DEV_SERVER_URL);
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(RENDERER_DIST, 'index.html'));
    }
}

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
        win = null;
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.whenReady().then(() => {
    registerStorageIpcHandlers();
    createWindow();
});

// Example IPC handler
ipcMain.handle('ping', () => 'pong');
