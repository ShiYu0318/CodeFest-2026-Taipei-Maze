// SPDX-License-Identifier: AGPL-3.0-or-later
const status = document.querySelector('#status');
const events = document.querySelector('#events');
const buttons = [...document.querySelectorAll('button')];
const bridge = window.flutterObject;
let pending = null;
let timer = null;
let waitingForDrain = false;

function record(message) {
  const item = document.createElement('li');
  item.textContent = message;
  events.prepend(item);
  while (events.children.length > 12) events.lastElementChild.remove();
}

function setEnabled(enabled) {
  for (const button of buttons) button.disabled = !enabled;
}

function send(name) {
  if (pending || waitingForDrain) return;
  pending = name;
  setEnabled(false);
  status.textContent = '等待 App 回覆…';
  timer = setTimeout(() => {
    waitingForDrain = true;
    status.textContent = '等待逾時；請先退出原生功能。遲到回覆清空前不發送新請求。';
    record('逾時不是成功，也不會自動重試。必要時關閉並重新開啟服務。');
  }, 60_000);
  try {
    bridge.postMessage(JSON.stringify({ name, data: null }));
  } catch {
    clearTimeout(timer);
    waitingForDrain = true;
    status.textContent = '橋接傳送失敗，請退出原生功能後關閉並重新開啟服務。';
  }
}

function onReply(event) {
  let reply;
  try { reply = JSON.parse(event.data); } catch { return; }
  if (!reply || reply.name !== pending) return;
  clearTimeout(timer);
  if (waitingForDrain) {
    record('已丟棄過期回覆，不採用其內容。');
    waitingForDrain = false;
  } else if (pending === 'qr_code_scan') {
    record(reply.data === null ? 'QR 掃描已取消。' : typeof reply.data === 'string' ? 'QR 回覆成功：收到字串，內容未保存。' : 'QR 回覆型別不符合字串／null 契約。');
  } else {
    record(`App 回覆成功：deviceinfo，資料型別為 ${typeof reply.data}，未顯示或保存資料值。`);
  }
  pending = null;
  status.textContent = 'App bridge 可用；可再次測試。';
  setEnabled(true);
}

if (!bridge || typeof bridge.postMessage !== 'function' || typeof bridge.addEventListener !== 'function') {
  status.textContent = '一般瀏覽器：無 flutterObject。請由台北通的「CodeFest 測試環境」開啟。';
  record('網頁載入成功；App 橋接尚未驗證。');
} else {
  bridge.addEventListener('message', onReply);
  status.textContent = '已偵測 App bridge，尚未測試往返。';
  setEnabled(true);
  document.querySelector('#probe').addEventListener('click', () => send('deviceinfo'));
  document.querySelector('#scan').addEventListener('click', () => send('qr_code_scan'));
  window.addEventListener('pagehide', () => {
    clearTimeout(timer);
    bridge.removeEventListener('message', onReply);
    pending = null;
    waitingForDrain = true;
    setEnabled(false);
  }, { once: true });
  window.addEventListener('pageshow', (event) => {
    // A BFCache restore does not rerun this module. Start a new document/session.
    if (event.persisted) window.location.reload();
  });
}
