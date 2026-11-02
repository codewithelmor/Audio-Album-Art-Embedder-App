// Ambient types shared by main, preload and renderer (no imports/exports on purpose,
// so the renderer stays a plain browser script).

/** Result of `backend.py --scan`: what a chosen folder contains. */
interface ScanData {
  error?: undefined;
  directory: string;
  /** Audio file names (not paths) inside the folder, sorted. */
  files: string[];
  /** Auto-detected cover image path, or null when the folder has none. */
  cover: string | null;
}

type ScanResult = ScanData | { error: string };

/** Events the Python backend writes as JSON lines (see backend/backend.py). */
type BackendEvent =
  | ({ event: 'scan' } & Omit<ScanData, 'error'>)
  | { event: 'error'; message: string }
  | { event: 'log'; message: string }
  | { event: 'start'; total: number; folder: string }
  | { event: 'file_start'; index: number; total: number; name: string }
  | { event: 'file_done'; index: number; name: string }
  | { event: 'file_error'; index: number; name: string; error: string }
  | DoneEvent;

interface DoneEvent {
  event: 'done';
  ok: string[];
  failed: { track: string; error: string }[];
  folder?: string;
  cancelled?: boolean;
  error: string | null;
}

interface Settings {
  /** Last folder that was scanned. */
  folder: string;
}

interface EmbedOptions {
  folder: string;
  image: string;
  /** Audio file names to embed into. */
  files: string[];
}

/** A cover image chosen in the file dialog, with a data URL the renderer can show. */
interface PickedImage {
  path: string;
  dataUrl: string;
}

/** What preload.ts exposes to the renderer as `window.api`. */
interface Api {
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  pickFolder(current: string): Promise<string | null>;
  pickImage(current: string): Promise<PickedImage | null>;
  /** Reads an image file as a data URL for the preview (null if unreadable). */
  loadImage(path: string): Promise<string | null>;
  openFolder(folder: string): Promise<string>;
  scan(folder: string): Promise<ScanResult>;
  startEmbed(opts: EmbedOptions): Promise<{ started: true } | { error: string }>;
  cancelEmbed(): Promise<void>;
  onEvent(handler: (ev: BackendEvent) => void): () => void;
}

interface Window {
  api: Api;
}
