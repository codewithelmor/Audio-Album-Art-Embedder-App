import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let win: BrowserWindow | null = null;
let job: ChildProcessWithoutNullStreams | null = null; // the running embed process, if any

// ---- locating the Python backend -------------------------------------------

function backendCommand(args: string[]): { cmd: string; args: string[] } {
  const isWindows = process.platform === 'win32';
  if (app.isPackaged) {
    const exe = isWindows ? 'backend.exe' : 'backend';
    return { cmd: path.join(process.resourcesPath, 'backend', exe), args };
  }
  // out/main.js -> app/out -> repo root
  const script = path.join(__dirname, '..', '..', 'backend', 'backend.py');
  const python = process.env.PYTHON || (isWindows ? 'python' : 'python3');
  return { cmd: python, args: ['-X', 'utf8', '-u', script, ...args] };
}

function run(args: string[]): ChildProcessWithoutNullStreams {
  const { cmd, args: fullArgs } = backendCommand(args);
  return spawn(cmd, fullArgs, {
    windowsHide: true,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
}

// Calls onEvent for each complete JSON line on stdout.
function readEvents(proc: ChildProcessWithoutNullStreams, onEvent: (ev: BackendEvent) => void): void {
  let buffer = '';
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (chunk: string) => {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        onEvent(JSON.parse(line) as BackendEvent);
      } catch {
        /* ignore non-JSON noise */
      }
    }
  });
}

function sendEvent(ev: BackendEvent): void {
  win?.webContents.send('embed:event', ev);
}

function failed(error: string): DoneEvent {
  return { event: 'done', ok: [], failed: [], error };
}

// ---- settings --------------------------------------------------------------

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings(): Partial<Settings> {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch {
    return {};
  }
}

// ---- IPC ---------------------------------------------------------------------

ipcMain.handle('settings:get', (): Settings => ({
  folder: app.getPath('music'),
  ...loadSettings(),
}));

ipcMain.handle('settings:set', (_e, settings: Settings): void => {
  fs.writeFileSync(settingsFile(), JSON.stringify(settings));
});

ipcMain.handle('folder:pick', async (_e, current: string): Promise<string | null> => {
  const r = await dialog.showOpenDialog(win!, {
    properties: ['openDirectory'],
    defaultPath: current,
  });
  return r.canceled ? null : r.filePaths[0];
});

const IMAGE_MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

// The renderer's CSP does not allow file:// images, so previews travel as data URLs.
function imageDataUrl(file: string): string | null {
  const mime = IMAGE_MIME[path.extname(file).toLowerCase()];
  if (!mime) return null;
  try {
    return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
  } catch {
    return null;
  }
}

ipcMain.handle('image:pick', async (_e, current: string): Promise<PickedImage | null> => {
  const r = await dialog.showOpenDialog(win!, {
    properties: ['openFile'],
    defaultPath: current,
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
  });
  if (r.canceled) return null;
  const dataUrl = imageDataUrl(r.filePaths[0]);
  return dataUrl ? { path: r.filePaths[0], dataUrl } : null;
});

ipcMain.handle('image:load', (_e, file: string): string | null => imageDataUrl(file));

ipcMain.handle('folder:open', (_e, folder: string) => shell.openPath(folder));

ipcMain.handle('scan', (_e, folder: string) => new Promise<ScanResult>((resolve) => {
  const proc = run(['--dir', folder, '--scan']);
  let last: BackendEvent = { event: 'error', message: 'The backend did not respond.' };
  let stderr = '';
  readEvents(proc, (ev) => { last = ev; });
  proc.stderr.on('data', (d) => { stderr += d; });
  proc.on('error', (err) => resolve({ error: `Could not start the backend: ${err.message}` }));
  proc.on('close', () => {
    if (last.event === 'scan') {
      resolve({ directory: last.directory, files: last.files, cover: last.cover });
    } else {
      resolve({ error: (last.event === 'error' && last.message) || stderr.trim() || 'Unknown error' });
    }
  });
}));

ipcMain.handle('embed:start', (_e, opts: EmbedOptions): { started: true } | { error: string } => {
  if (job) return { error: 'An embed run is already in progress.' };
  const args = ['--dir', opts.folder, '--image', opts.image];
  for (const name of opts.files) args.push('--file', name);

  const proc = run(args);
  job = proc;
  let sawDone = false;
  readEvents(proc, (ev) => {
    if (ev.event === 'done') sawDone = true;
    sendEvent(ev);
  });
  proc.on('error', (err) => {
    sendEvent(failed(`Could not start the backend: ${err.message}`));
    job = null;
  });
  proc.on('close', (code) => {
    if (!sawDone) sendEvent(failed(`The backend stopped unexpectedly (exit code ${code}).`));
    job = null;
  });
  return { started: true };
});

ipcMain.handle('embed:cancel', (): void => {
  if (!job) return;
  const proc = job;
  try { proc.stdin.write('cancel\n'); } catch { /* already closed */ }
  // If it hasn't stopped on its own, force it.
  setTimeout(() => { if (job === proc) proc.kill(); }, 8000);
});

// ---- window ------------------------------------------------------------------

function createWindow(): void {
  win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 720,
    minHeight: 560,
    maximizable: false,
    backgroundColor: '#121212',
    icon: path.join(__dirname, '..', 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('before-quit', () => { job?.kill(); });
app.on('window-all-closed', () => app.quit());
