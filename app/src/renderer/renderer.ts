// Plain browser script (no imports/exports); types come from ../types.d.ts.

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

let folder = '';
let imagePath: string | null = null;
let running = false;
let rows: HTMLLIElement[] = []; // <li> elements of the files being processed, in order
let lastFolder = '';

function showMessage(text: string): void {
  el('message').textContent = text;
  el('message').hidden = !text;
}

function fileBoxes(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>('#files input')];
}

function selectedFiles(): string[] {
  return fileBoxes().filter((b) => b.checked).map((b) => b.dataset.name!);
}

function updateEmbedEnabled(): void {
  const selected = selectedFiles().length;
  el('listCount').textContent = `${selected} of ${fileBoxes().length} selected`;
  el<HTMLButtonElement>('embedBtn').disabled = selected === 0 || !imagePath;
}

function setRunning(value: boolean): void {
  running = value;
  for (const id of ['folderBtn', 'imageBtn', 'selectAll']) el<HTMLInputElement>(id).disabled = value;
  for (const box of fileBoxes()) box.disabled = value;
  el('embedBtn').hidden = value;
  el('cancelBtn').hidden = !value;
  el<HTMLButtonElement>('cancelBtn').disabled = false;
  el('cancelBtn').textContent = 'Cancel';
}

function setCover(path: string | null, dataUrl: string | null): void {
  imagePath = path;
  const img = el<HTMLImageElement>('coverPreview');
  img.hidden = !dataUrl;
  if (dataUrl) img.src = dataUrl;
  el('coverPlaceholder').hidden = !!dataUrl;
  el('coverPath').textContent = path ?? 'No image selected';
  el('coverPath').title = path ?? '';
  updateEmbedEnabled();
}

function renderFiles(names: string[]): void {
  const ul = el('files');
  ul.replaceChildren();
  for (const name of names) {
    const li = document.createElement('li');

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = true;
    box.dataset.name = name;
    box.setAttribute('aria-label', name);
    box.addEventListener('change', updateEmbedEnabled);

    const label = document.createElement('div');
    label.className = 'name';
    label.textContent = name;
    const state = document.createElement('span');
    state.className = 'state';

    li.append(box, label, state);
    ul.append(li);
  }
  el<HTMLInputElement>('selectAll').checked = true;
  updateEmbedEnabled();
}

function showFolder(): void {
  el('folder').textContent = folder || 'No folder selected';
  el('folder').title = folder;
}

async function scanFolder(): Promise<void> {
  showMessage('');
  el('progressSection').hidden = true;
  const result = await window.api.scan(folder);
  if (result.error !== undefined) {
    el('listSection').hidden = true;
    return showMessage(result.error);
  }
  folder = result.directory;
  showFolder();
  renderFiles(result.files);
  el('listSection').hidden = false;
  if (!result.files.length) showMessage('No supported audio files (.flac, .mp3, .m4a, .mp4, .aac) in that folder.');
  const dataUrl = result.cover ? await window.api.loadImage(result.cover) : null;
  setCover(dataUrl ? result.cover : null, dataUrl);
  await window.api.saveSettings({ folder });
}

async function chooseFolder(): Promise<void> {
  const picked = await window.api.pickFolder(folder);
  if (!picked) return;
  folder = picked;
  showFolder();
  await scanFolder();
}

async function chooseImage(): Promise<void> {
  const picked = await window.api.pickImage(imagePath ?? folder);
  if (picked) setCover(picked.path, picked.dataUrl);
}

async function startEmbed(): Promise<void> {
  const files = selectedFiles();
  if (!files.length || !imagePath) return;

  // Rows for the selected files, in processing order (the backend keeps sorted order).
  const all = [...document.querySelectorAll<HTMLLIElement>('#files li')];
  rows = all.filter((li) => li.querySelector('input')!.checked);
  for (const li of all) {
    li.className = '';
    li.querySelector('.state')!.textContent = '';
  }

  el('log').textContent = '';
  el('summary').hidden = true;
  el('overallBar').style.width = '0';
  el('overallText').textContent = 'Starting…';
  el('progressSection').hidden = false;
  showMessage('');
  setRunning(true);

  const r = await window.api.startEmbed({ folder, image: imagePath, files });
  if ('error' in r) {
    setRunning(false);
    showMessage(r.error);
  }
}

function setRowState(index: number, cls: string, text: string): void {
  const li = rows[index - 1];
  if (!li) return;
  li.className = cls;
  li.querySelector('.state')!.textContent = text;
  if (cls === 'active') li.scrollIntoView({ block: 'nearest' });
}

function onEvent(ev: BackendEvent): void {
  switch (ev.event) {
    case 'log': {
      const log = el('log');
      log.textContent += `${ev.message}\n`;
      log.scrollTop = log.scrollHeight;
      break;
    }
    case 'start':
      lastFolder = ev.folder;
      el('overallText').textContent = `0 of ${ev.total} done`;
      break;
    case 'file_start':
      setRowState(ev.index, 'active', 'Embedding');
      el('overallText').textContent = `File ${ev.index} of ${ev.total}`;
      el('overallBar').style.width = `${((ev.index - 1) / ev.total) * 100}%`;
      break;
    case 'file_done':
      setRowState(ev.index, 'done', 'Done');
      el('overallBar').style.width = `${(ev.index / rows.length) * 100}%`;
      break;
    case 'file_error':
      setRowState(ev.index, 'error', 'Failed');
      break;
    case 'done':
      finish(ev);
      break;
  }
}

function finish(summary: DoneEvent): void {
  setRunning(false);
  if (summary.folder) lastFolder = summary.folder;
  if (summary.error) {
    showMessage(summary.error);
    return;
  }
  const total = summary.ok.length + summary.failed.length;
  if (!summary.cancelled) el('overallBar').style.width = '100%';
  el('overallText').textContent = summary.cancelled ? 'Cancelled' : 'Finished';
  el('summaryText').textContent =
    `${summary.ok.length} of ${total} file(s) updated${summary.failed.length ? `, ${summary.failed.length} failed` : ''}.`;
  const failedList = el('failed');
  failedList.replaceChildren();
  for (const f of summary.failed) {
    const li = document.createElement('li');
    li.textContent = `${f.track}: ${f.error}`;
    failedList.append(li);
  }
  el('openBtn').hidden = !lastFolder;
  el('summary').hidden = false;
}

async function init(): Promise<void> {
  const s = await window.api.getSettings();
  folder = s.folder;
  showFolder();
  setCover(null, null);

  el('folderBtn').addEventListener('click', chooseFolder);
  el('imageBtn').addEventListener('click', chooseImage);
  el('selectAll').addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    for (const box of fileBoxes()) box.checked = checked;
    updateEmbedEnabled();
  });
  el('embedBtn').addEventListener('click', startEmbed);
  el('cancelBtn').addEventListener('click', () => {
    el<HTMLButtonElement>('cancelBtn').disabled = true;
    el('cancelBtn').textContent = 'Cancelling…';
    window.api.cancelEmbed();
  });
  el('openBtn').addEventListener('click', () => window.api.openFolder(lastFolder));
  window.api.onEvent(onEvent);

  if (folder) await scanFolder();
}

init();
