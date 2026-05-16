/* ═══════════════════════════════════════
   花暦 — IndexedDB 写真管理
   db.js
═══════════════════════════════════════ */

const DB_NAME    = 'hanagoyomi_db';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('memberId',  'memberId',  { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

// ── 写真を保存 ──
// photo: { id, memberId, memberName, caption, dataUrl, createdAt }
async function savePhoto(photo) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(photo);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── 全写真を取得（新しい順）──
async function getAllPhotos() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const req   = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result.sort((a,b) => b.createdAt - a.createdAt));
    req.onerror   = () => reject(req.error);
  });
}

// ── メンバー別に写真を取得 ──
async function getPhotosByMember(memberId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('memberId');
    const req   = index.getAll(memberId);
    req.onsuccess = () => resolve(req.result.sort((a,b) => b.createdAt - a.createdAt));
    req.onerror   = () => reject(req.error);
  });
}

// ── 写真を削除 ──
async function deletePhoto(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── 写真枚数を取得 ──
async function countPhotos() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── 画像ファイル → Base64変換 ──
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    // 画像をリサイズして容量を抑える
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200; // 長辺の最大px
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else       { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}
