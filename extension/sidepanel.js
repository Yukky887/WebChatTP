/* Ассистент техподдержки — side panel: чат + контекст страницы + скриншоты.
   История чата привязана к API-токену и переживает переоткрытие панели;
   ответы оператора (эскалация) подхватываются опросом /api/chat/updates. */
import {
  LOADER_COLS, LOADER_ROWS, LOADER_FPS, LOADER_PAL, LOADER_FRAMES,
} from './loaderFrames.js';

const $ = (id) => document.getElementById(id);
const chatEl = $('chat'), inputEl = $('input'), attachBar = $('attachBar');
const pageChip = $('pageChip'), shotChip = $('shotChip');
const bannerEl = $('statusBanner'), btnCall = $('btnCallOperator');

const DEFAULT_BACKEND = 'http://sup5.tradesoft.corp:8100';
const MAX_PAGE_TEXT = 12000;
const POLL_MS = 5000;

let sessionId = null;      // сессия чата (хранится в chrome.storage)
let lastMsgId = 0;         // последнее полученное id сообщения (для after_id)
let lastStatus = null;     // статус сессии с сервера
let busy = false;
let pageCtx = null;        // {url, title, text, selection}
let shotUri = null;        // data:image/jpeg;base64,...

// Дедупликация: сервер возвращает и свои сообщения; локально отрисованные
// пропускаем по содержимому (lastLocalUser / lastLocalAssistant)
const seenIds = new Set();
let lastLocalUser = null;
let lastLocalAssistant = null;
let pollTimer = null;

/* ---------- настройки ---------- */
async function getSettings() {
  const s = await chrome.storage.local.get(['backend', 'token']);
  return {
    backend: (s.backend || DEFAULT_BACKEND).replace(/\/+$/, ''),
    token: s.token || '',
  };
}

/* Сессия чата привязана к паре (бэкенд, токен): сменил токен — новый чат */
async function restoreSession(s) {
  const st = await chrome.storage.local.get(['chatSession']);
  const cs = st.chatSession;
  if (cs && cs.backend === s.backend && cs.token === s.token && cs.sessionId) {
    sessionId = cs.sessionId;
  }
}
function saveSession(s) {
  if (!s) return;
  chrome.storage.local.set({ chatSession: { backend: s.backend, token: s.token, sessionId } });
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
  const prev = await getSettings();
  const next = {
    backend: $('inpBackend').value.trim() || DEFAULT_BACKEND,
    token: $('inpToken').value.trim(),
  };
  await chrome.storage.local.set(next);
  if (prev.backend !== next.backend || prev.token !== next.token) {
    resetChat(); // другой бэкенд/токен — старая сессия чужая
  }
  $('settingsMsg').textContent = 'Сохранено ✓';
  setTimeout(() => { $('settings').classList.add('hidden'); }, 900);
});

function resetChat() {
  sessionId = null;
  lastMsgId = 0;
  lastStatus = null;
  seenIds.clear();
  lastLocalUser = null;
  lastLocalAssistant = null;
  chatEl.innerHTML = '';
  refreshBanner();
}

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
let loaderTimer = null;   // анимация кадров
let loaderDelay = null;   // отложенный запуск
let currentLoader = null;

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
  if (el) el.remove();
}
/* Лоадер показываем не сразу: в чате со специалистом бэкенд отвечает
   мгновенно, и «ASCII-кот» успевал мелькнуть на долю секунды. */
function scheduleLoader(delay = 700) {
  cancelLoader();
  loaderDelay = setTimeout(() => {
    loaderDelay = null;
    currentLoader = startLoader();
  }, delay);
}
function cancelLoader() {
  if (loaderDelay) { clearTimeout(loaderDelay); loaderDelay = null; }
  if (currentLoader) { stopLoader(currentLoader); currentLoader = null; }
}
/* Признак «чат ведёт специалист» — лоадер и ответы бота в нём не нужны */
function isEscalated(status = lastStatus) {
  return status === 'waiting_operator' || status === 'operator_active';
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

function addOperatorMsg(text) {
  const div = document.createElement('div');
  div.className = 'msg operator';
  div.innerHTML = mdLite(text || '');
  chatEl.appendChild(div);
  scrollBottom();
}

function addNote(text) {
  const div = document.createElement('div');
  div.className = 'note';
  div.textContent = text;
  chatEl.appendChild(div);
  scrollBottom();
}

function addErrorMsg(text) {
  const div = document.createElement('div');
  div.className = 'msg error';
  div.textContent = text;
  chatEl.appendChild(div);
  scrollBottom();
}

/* Сообщение с сервера (история/поллинг). Локально отрисованные свои
   сообщения пропускаем (echo-дедупликация по содержимому). */
function renderServerMessage(m) {
  if (seenIds.has(m.id)) return;
  const content = m.content || '';
  if (m.role === 'user' && lastLocalUser && content.trim() === lastLocalUser) {
    seenIds.add(m.id);
    lastLocalUser = null;
    if (m.id > lastMsgId) lastMsgId = m.id;
    return;
  }
  if (m.role === 'assistant' && lastLocalAssistant && content === lastLocalAssistant) {
    seenIds.add(m.id);
    lastLocalAssistant = null;
    if (m.id > lastMsgId) lastMsgId = m.id;
    return;
  }
  seenIds.add(m.id);
  if (m.role === 'user') addUserMsg(content);
  else if (m.role === 'operator') addOperatorMsg(content);
  else addAssistantMsg(content, m.sources);
  if (m.id > lastMsgId) lastMsgId = m.id;
}

/* Плашка статуса эскалации над полем ввода */
function refreshBanner() {
  // кнопку вызова прячем, когда специалист уже вызван/подключился
  btnCall.classList.toggle('hidden', isEscalated() || lastStatus === 'closed');
  if (!sessionId || !lastStatus || lastStatus === 'active') {
    bannerEl.classList.add('hidden');
    bannerEl.textContent = '';
    return;
  }
  bannerEl.classList.remove('hidden');
  bannerEl.textContent = {
    waiting_operator: '🔴 Ждём специалиста техподдержки…',
    operator_active: '🧑‍💼 Специалист техподдержки отвечает',
    closed: '✔ Диалог завершён — новый вопрос откроет его заново',
  }[lastStatus] || '';
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

/* ---------- история чата: догрузка при открытии панели ---------- */
async function loadHistory(s) {
  try {
    const resp = await fetch(
      `${s.backend}/api/chat/updates?session_id=${encodeURIComponent(sessionId)}&after_id=0`,
      { headers: { 'X-API-Key': s.token } },
    );
    if (resp.status === 403 || resp.status === 404) {
      // сессия чужая/удалена — начинаем новую
      sessionId = null;
      saveSession(s);
      return;
    }
    if (!resp.ok) return;
    const data = await resp.json();
    lastStatus = data.session_status || null;
    chatEl.innerHTML = '';
    seenIds.clear();
    lastMsgId = 0;
    lastLocalUser = null;
    lastLocalAssistant = null;
    for (const m of data.messages || []) renderServerMessage(m);
    refreshBanner();
  } catch { /* бэкенд недоступен — начнём с пустой ленты */ }
}

/* ---------- поллинг обновлений: ответы оператора и статусы ---------- */
function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(poll, POLL_MS);
}

async function poll() {
  if (!sessionId || busy) return;
  const s = await getSettings();
  try {
    const resp = await fetch(
      `${s.backend}/api/chat/updates?session_id=${encodeURIComponent(sessionId)}&after_id=${lastMsgId}`,
      { headers: { 'X-API-Key': s.token } },
    );
    if (!resp.ok) return;
    const data = await resp.json();
    if (data.session_status && data.session_status !== lastStatus) {
      lastStatus = data.session_status;
      refreshBanner();
    }
    for (const m of data.messages || []) renderServerMessage(m);
  } catch { /* сеть пропала — молча, следующий тик повторит */ }
}

/* ---------- отправка ---------- */
async function doSend(message, opts = {}) {
  const text = (message || '').trim();
  const s = await getSettings();
  if (!s.token) {
    $('settings').classList.remove('hidden');
    $('settingsMsg').textContent = 'Нужен API-токен (см. README)';
    return;
  }

  const body = { message: text };
  if (sessionId) body.session_id = sessionId;
  if (opts.program) body.program = opts.program;
  if (opts.callOperator) body.call_operator = true;
  if (pageCtx) body.page = { url: pageCtx.url, title: pageCtx.title, text: pageCtx.text };
  if (shotUri) body.attachments = [shotUri];

  const extras = [];
  if (opts.program) extras.push(`⚙ ${opts.program}`);
  if (pageCtx) extras.push(pageCtx.selection ? '📄 выделение' : '📄 страница');
  if (shotUri) extras.push('👁 скриншот');
  addUserMsg(text, extras);
  lastLocalUser = text;
  inputEl.value = '';
  shotUri = null;
  refreshChips();
  // В переписке со специалистом (и при вызове) лоадер не нужен вообще
  const humanChat = isEscalated() || Boolean(opts.callOperator);
  busy = true;
  $('btnSend').disabled = true;
  btnCall.disabled = true;
  if (!humanChat) scheduleLoader();

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
    saveSession(s);
    if (data.session_status) {
      lastStatus = data.session_status;
      refreshBanner();
    }
    cancelLoader();
    if (data.operator_called) {
      // флаг call_operator: бот поставлен на паузу — это статус, а не ответ
      addNote('✅ Специалист техподдержки вызван — ждём подключения.');
    } else if (isEscalated(data.session_status)) {
      addNote('⏳ Специалист техподдержки на линии — сообщение передано.');
    } else if (data.needs_program_selection) {
      // бэкенд не понял, о какой программе речь, — даём выбрать чипами;
      // выбранный вопрос уйдёт повторно уже с program
      addProgramPicker(data.suggestions || ['Parts.Intellect', 'Parts.Resource'], text);
    } else {
      lastLocalAssistant = data.answer || '';
      addAssistantMsg(data.answer, data.sources);
    }
    // оператор мог ответить, пока грузился ответ бота — забрать сразу
    setTimeout(poll, 800);
  } catch (e) {
    cancelLoader();
    addErrorMsg(`⚠ ${e.message || e}`);
  } finally {
    busy = false;
    $('btnSend').disabled = false;
    btnCall.disabled = false;
    refreshBanner();
  }
}

/* Пикер программы: кликабельные чипы вместо пустого ответа бэкенда */
function addProgramPicker(suggestions, originalMessage) {
  const div = document.createElement('div');
  div.className = 'msg assistant';
  const label = document.createElement('div');
  label.textContent = 'О какой программе вопрос?';
  div.appendChild(label);
  const row = document.createElement('div');
  row.className = 'programs';
  for (const name of suggestions) {
    const b = document.createElement('button');
    b.className = 'program-chip';
    b.textContent = name;
    b.onclick = () => {
      div.remove();
      if (!busy) doSend(originalMessage, { program: name });
    };
    row.appendChild(b);
  }
  div.appendChild(row);
  chatEl.appendChild(div);
  scrollBottom();
}

function send() {
  const text = inputEl.value.trim();
  if (!text && !pageCtx && !shotUri) return;
  doSend(text || (shotUri ? 'Извлеки текст со скриншота и подскажи, что делать.' : 'Проанализируй страницу и кратко ответь, что на ней важно.'));
}

$('btnSend').addEventListener('click', send);

/* Кнопка «Позвать специалиста»: тот же флаг call_operator, что и в админке,
   бэкенд сам переводит сессию в waiting_operator и ставит бота на паузу. */
btnCall.addEventListener('click', () => {
  if (busy || isEscalated()) return;
  doSend('Позвать специалиста техподдержки', { callOperator: true });
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

/* ---------- старт: настройки → сессия → история → поллинг ---------- */
(async () => {
  const s = await getSettings();
  await restoreSession(s);
  refreshChips();
  if (sessionId) await loadHistory(s);
  startPolling();
})();
