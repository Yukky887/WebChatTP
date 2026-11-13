/* Ассистент техподдержки — side panel: чат + контекст страницы + скриншоты */
import {
  LOADER_COLS, LOADER_ROWS, LOADER_FPS, LOADER_PAL, LOADER_FRAMES,
} from './loaderFrames.js';

const $ = (id) => document.getElementById(id);
const chatEl = $('chat'), inputEl = $('input'), attachBar = $('attachBar');
const pageChip = $('pageChip'), shotChip = $('shotChip');

const DEFAULT_BACKEND = 'http://sup5.tradesoft.corp:8000';
const MAX_PAGE_TEXT = 12000;

let sessionId = null;
let pageCtx = null;      // {url, title, text}
let shotUri = null;      // data:image/jpeg;base64,...
let busy = false;

/* ---------- настройки ---------- */
async function getSettings() {
  const s = await chrome.storage.local.get(['backend', 'token']);
  return {
    backend: (s.backend || DEFAULT_BACKEND).replace(/\/+$/, ''),
    token: s.token || '',
  };
}

$('btnSettings').addEventListener('click', async () => {
  const el = $('settings');
  if (!el.classList.contains('hidden')) { el.classList.add('hidden'); return; }
  const s = await getSettings();
  $('inpBackend').value = s.backend === DEFAULT_BACKEND ? '' : s.backend;
  $('inpToken').value = s.token;
  $('settingsMsg').textContent = '';
  el.classList.remove('hidden');
});

$('btnSaveSettings').addEventListener('click', async () => {
  await chrome.storage.local.set({
    backend: $('inpBackend').value.trim() || DEFAULT_BACKEND,
    token: $('inpToken').value.trim(),
  });
  $('settingsMsg').textContent = 'Сохранено ✓';
  setTimeout(() => { $('settings').classList.add('hidden'); }, 900);
});

/* ---------- лоадер «Ассистент думает...» (ASCII-кот, кадры из loaderFrames.js) ---------- */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function frameHTML(idx) {
  const [chars, colors] = LOADER_FRAMES[idx];
  let out = '';
  for (let r = 0; r < LOADER_ROWS; r++) {
    let line = '', run = '', runK = -1;
    const flush = () => {
      if (runK >= 0) {
        line += `<span style="color:${LOADER_PAL[runK]}">${esc(run)}</span>`;
        run = ''; runK = -1;
      }
    };
    for (let x = 0; x < LOADER_COLS; x++) {
      const ch = chars[r * LOADER_COLS + x];
      if (ch === ' ') { flush(); line += ' '; runK = -1; continue; }
      const ki = parseInt(colors[r * LOADER_COLS + x], 16);
      if (ki !== runK) { flush(); runK = ki; }
      run += ch;
    }
    flush();
    out += line + (r < LOADER_ROWS - 1 ? '\n' : '');
  }
  return out;
}
const loaderFrames = LOADER_FRAMES.map((_, i) => frameHTML(i));
let loaderTimer = null;

function startLoader() {
  const pre = document.createElement('pre');
  pre.className = 'loader-pre';
  chatEl.appendChild(pre);
  let i = 0;
  pre.innerHTML = loaderFrames[0];
  loaderTimer = setInterval(() => {
    i = (i + 1) % loaderFrames.length;
    pre.innerHTML = loaderFrames[i];
  }, LOADER_FPS);
  scrollBottom();
  return pre;
}
function stopLoader(el) {
  if (loaderTimer) { clearInterval(loaderTimer); loaderTimer = null; }
  el.remove();
}

/* ---------- рендер сообщений ---------- */
function scrollBottom() { chatEl.scrollTop = chatEl.scrollHeight; }

function addUserMsg(text, extras) {
  const div = document.createElement('div');
  div.className = 'msg user';
  div.textContent = text || '(пусто)';
  if (extras?.length) {
    const chips = document.createElement('div');
    chips.className = 'chips';
    chips.textContent = extras.join('  ·  ');
    div.appendChild(chips);
  }
  chatEl.appendChild(div);
  scrollBottom();
}

/* markdown-lite: ссылки, жирный, код, переводы строк */
function mdLite(text) {
  let s = esc(text);
  s = s.replace(/\[([^\]\n]{1,120})\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank">$1</a>');
  s = s.replace(/\*\*([^*\n]{1,200})\*\*/g, '<b>$1</b>');
  s = s.replace(/`([^`\n]{1,200})`/g, '<code>$1</code>');
  return s;
}

function addAssistantMsg(answer, sources) {
  const div = document.createElement('div');
  div.className = 'msg assistant';
  div.innerHTML = mdLite(answer || '(пустой ответ)');
  chatEl.appendChild(div);

  const links = (sources || []).filter((s) => s.url);
  if (links.length) {
    const box = document.createElement('div');
    box.className = 'sources';
    box.textContent = '📎 Источники:';
    for (const s of links) {
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.textContent = `  ${s.index}. ${s.title || s.url}`;
      a.title = s.title || s.url;
      box.appendChild(a);
    }
    chatEl.appendChild(box);
  }
  scrollBottom();
}

function addErrorMsg(text) {
  const div = document.createElement('div');
  div.className = 'msg error';
  div.textContent = text;
  chatEl.appendChild(div);
  scrollBottom();
}

/* ---------- чипы вложений ---------- */
function refreshChips() {
  attachBar.classList.toggle('hidden', !pageCtx && !shotUri);
  if (pageCtx) {
    const label = pageCtx.selection
      ? `📄 Выделение: ${(pageCtx.title || 'страница').slice(0, 40)}`
      : `📄 ${(pageCtx.title || pageCtx.url || 'страница').slice(0, 46)}`;
    pageChip.innerHTML = `<span class="t"></span><span class="x" title="убрать">✕</span>`;
    pageChip.querySelector('.t').textContent = label;
    pageChip.querySelector('.x').onclick = () => { pageCtx = null; refreshChips(); };
  } else {
    pageChip.innerHTML = '';
  }
  if (shotUri) {
    shotChip.innerHTML = `<span class="t">👁 Скриншот готов</span><span class="x" title="убрать">✕</span>`;
    shotChip.querySelector('.x').onclick = () => { shotUri = null; refreshChips(); };
  } else {
    shotChip.innerHTML = '';
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/* ---------- «📄 Страница»: читабельный текст или выделение ---------- */
$('btnPage').addEventListener('click', async () => {
  try {
    const tab = await activeTab();
    if (!tab?.id) throw new Error('Нет активной вкладки');
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        url: location.href,
        title: document.title,
        selection: window.getSelection ? String(window.getSelection()) : '',
        text: document.body ? document.body.innerText : '',
      }),
    });
    const info = res?.result;
    if (!info) throw new Error('Не удалось прочитать страницу');
    const body = (info.selection || info.text || '').trim().slice(0, MAX_PAGE_TEXT);
    if (!body) throw new Error('На странице нет текста');
    pageCtx = {
      url: info.url || '',
      title: info.title || '',
      text: body,
      selection: Boolean(info.selection),
    };
    refreshChips();
  } catch (e) {
    addErrorMsg(`📄 ${e.message || e}\n(на служебных страницах chrome:// текст взять нельзя)`);
  }
});

/* ---------- «👁 Скриншот»: видимая область → vision-модель ---------- */
$('btnShot').addEventListener('click', async () => {
  try {
    const tab = await activeTab();
    if (!tab?.windowId) throw new Error('Нет активной вкладки');
    if (/^(chrome|edge|about|devtools|chrome-extension|view-source):/.test(tab.url || '')) {
      throw new Error('Скриншот нельзя сделать на служебной странице (chrome:// и т.п.)');
    }
    shotUri = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 80 });
    if (shotUri.length > 14_000_000) throw new Error('Скриншот слишком большой, попробуйте ещё раз');
    refreshChips();
  } catch (e) {
    const m = String(e.message || e);
    if (m.includes('activeTab') || m.includes('all_urls')) {
      addErrorMsg('👁 Нет разрешения на захват экрана.\nОткрой chrome://extensions → «Parts Ассистент» → «Сведения о расширении» → «Доступ к сайтам» = «На всех сайтах» и перезагрузи расширение.');
    } else {
      addErrorMsg(`👁 ${m}`);
    }
  }
});

/* ---------- отправка ---------- */
async function send() {
  if (busy) return;
  const text = inputEl.value.trim();
  if (!text && !pageCtx && !shotUri) return;

  const s = await getSettings();
  if (!s.token) {
    $('settings').classList.remove('hidden');
    $('settingsMsg').textContent = 'Нужен API-токен (см. README)';
    return;
  }

  const message = text
    || (shotUri ? 'Извлеки текст со скриншота и подскажи, что делать.' : 'Проанализируй страницу и кратко ответь, что на ней важно.');

  const body = { message };
  if (sessionId) body.session_id = sessionId;
  if (pageCtx) body.page = { url: pageCtx.url, title: pageCtx.title, text: pageCtx.text };
  if (shotUri) body.attachments = [shotUri];

  const extras = [];
  if (pageCtx) extras.push(pageCtx.selection ? '📄 выделение' : '📄 страница');
  if (shotUri) extras.push('👁 скриншот');
  addUserMsg(text, extras);
  inputEl.value = '';
  shotUri = null;
  refreshChips();
  busy = true;
  $('btnSend').disabled = true;
  const loader = startLoader();

  try {
    const resp = await fetch(`${s.backend}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': s.token },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      let detail = `${resp.status}`;
      try {
        const j = await resp.json();
        detail = j.detail || detail;
      } catch { /* тело не JSON */ }
      if (resp.status === 401 || resp.status === 403) {
        detail += ' — проверь API-токен в ⚙ настройках';
      }
      throw new Error(String(detail));
    }
    const data = await resp.json();
    sessionId = data.session_id || sessionId;
    stopLoader(loader);
    addAssistantMsg(data.answer, data.sources);
  } catch (e) {
    stopLoader(loader);
    addErrorMsg(`⚠ ${e.message || e}`);
  } finally {
    busy = false;
    $('btnSend').disabled = false;
  }
}

$('btnSend').addEventListener('click', send);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

refreshChips();
