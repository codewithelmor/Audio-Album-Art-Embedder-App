import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const api: Api = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('settings:set', s),
  pickFolder: (current) => ipcRenderer.invoke('folder:pick', current),
  pickImage: (current) => ipcRenderer.invoke('image:pick', current),
  loadImage: (path) => ipcRenderer.invoke('image:load', path),
  openFolder: (folder) => ipcRenderer.invoke('folder:open', folder),
  scan: (folder) => ipcRenderer.invoke('scan', folder),
  startEmbed: (opts) => ipcRenderer.invoke('embed:start', opts),
  cancelEmbed: () => ipcRenderer.invoke('embed:cancel'),
  onEvent: (handler) => {
    const listener = (_e: IpcRendererEvent, ev: BackendEvent) => handler(ev);
    ipcRenderer.on('embed:event', listener);
    return () => ipcRenderer.removeListener('embed:event', listener);
  },
};

contextBridge.exposeInMainWorld('api', api);
