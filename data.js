/* ═══════════════════════════════════════
   ひなたカレンダー — メンバーデータ
   data.js（日向坂46版）
═══════════════════════════════════════ */


/* ── 月名定数 ── */
const MONTHS_JP = ['睦月','如月','弥生','卯月','皐月','水無月','文月','葉月','長月','神無月','霜月','師走'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_JP    = ['日','月','火','水','木','金','土'];

/* ── 通知パネル用 ── */
function buildNotifications() {
  const today = new Date(); today.setHours(0,0,0,0);
  const events = loadEvents();
  const notes  = [];
  events.forEach(e => {
    const d = new Date(e.date + 'T00:00:00');
    const diff = Math.round((d - today) / 86400000);
    if (diff >= 0 && diff <= 7) notes.push({ icon: e.emoji || '✿', title: e.name, sub: diff === 0 ? '今日！' : `あと${diff}日` });
  });
  ACTIVE_MEMBERS.forEach(m => {
    const diff = daysUntilBirthday(m.birthday);
    if (diff <= 7) notes.push({ icon: '🎂', title: `${m.name}の誕生日`, sub: diff === 0 ? '今日！' : `あと${diff}日` });
  });
  return notes;
}

function updateNotifBtn() {
  const btn = document.getElementById('notifToggleBtn');
  if (!btn) return;
  if (!('Notification' in window)) { btn.textContent = '通知非対応'; btn.disabled = true; return; }
  const perm = Notification.permission;
  if (perm === 'granted') { btn.classList.add('notif-on'); btn.textContent = '🔔 通知ON'; }
  else { btn.classList.remove('notif-on'); btn.textContent = '🔔 通知を許可する'; }
}

/* ── 誕生日まで何日か ── */
function daysUntilBirthday(birthday) {
  const today = new Date(); today.setHours(0,0,0,0);
  const parts = birthday.split('-');
  const mm = parseInt(parts[parts.length - 2]);
  const dd = parseInt(parts[parts.length - 1]);
  let next = new Date(today.getFullYear(), mm - 1, dd);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next - today) / 86400000);
}

/* ── 年齢自動計算 ── */
function calcAge(birthday) {
  if (!birthday || birthday.length < 10) return null;
  const today = new Date();
  const [y, m, d] = birthday.split('-').map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m ||
     (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

/* ── アバター要素生成 ── */
function avatarHTML(m, size = 48) {
  const isImg = m.avatar && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(m.avatar);
  if (isImg) {
    return `<img src="${m.avatar}" alt="${m.name}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;">`;
  }
  return `<span style="font-size:${size*0.55}px;line-height:1">${m.avatar || '🌻'}</span>`;
}

/* ── メンバー一覧 ── */
const MEMBERS = [
  { id:  1, enabled: true, name: '金村 美玖', nameRoma: 'Miku Kanemura', role: '', gen: '2期生', birthday: '2002-09-10', avatar: 'member/kanemura.png', color: '#e8a020', bg: 'linear-gradient(145deg,#e8a020,#f0c060)', height: '', mbti: '', fav: '', memo: '' },
  { id:  2, enabled: true, name: '小坂 菜緒', nameRoma: 'Nao Kosaka', role: '', gen: '2期生', birthday: '2002-09-07', avatar: 'member/kosaka.png', color: '#e05080', bg: 'linear-gradient(145deg,#e05080,#f080a8)', height: '', mbti: '', fav: '', memo: '' },
  { id:  3, enabled: false, name: '松田 好花', nameRoma: 'Konoka Matsuda', role: '', gen: '2期生', birthday: '1999-04-27', avatar: 'member/matsuda.png', color: '#40a070', bg: 'linear-gradient(145deg,#40a070,#70c898)', height: '', mbti: '', fav: '', memo: '' },
  { id:  4, enabled: true, name: '上村 ひなの', nameRoma: 'Hinano Kamimura', role: '', gen: '3期生', birthday: '2004-04-12', avatar: 'member/kamimura.png', color: '#d060c0', bg: 'linear-gradient(145deg,#d060c0,#e898d8)', height: '', mbti: '', fav: '', memo: '' },
  { id:  5, enabled: true, name: '髙橋 未来虹', nameRoma: 'Mikuni Takahashi', role: '', gen: '3期生', birthday: '2003-09-27', avatar: 'member/takahashi.png', color: '#2080d0', bg: 'linear-gradient(145deg,#2080d0,#60a8f0)', height: '', mbti: '', fav: '', memo: '' },
  { id:  6, enabled: true, name: '森本 茉莉', nameRoma: 'Marii Morimoto', role: '', gen: '3期生', birthday: '2004-02-23', avatar: 'member/morimoto.png', color: '#c04040', bg: 'linear-gradient(145deg,#c04040,#e07070)', height: '', mbti: '', fav: '', memo: '' },
  { id:  7, enabled: true, name: '山口 陽世', nameRoma: 'Haruyo Yamaguchi', role: '', gen: '3期生', birthday: '2004-02-23', avatar: 'member/yamaguchi.png', color: '#a06030', bg: 'linear-gradient(145deg,#a06030,#c88850)', height: '', mbti: '', fav: '', memo: '' },
  { id:  8, enabled: true, name: '石塚 瑶季', nameRoma: 'Tamaki Ishizuka', role: '', gen: '4期生', birthday: '2004-08-06', avatar: 'member/ishizuka.png', color: '#6040c0', bg: 'linear-gradient(145deg,#6040c0,#9070e0)', height: '', mbti: '', fav: '', memo: '' },
  { id:  9, enabled: true, name: '小西 夏菜実', nameRoma: 'Nanami Konishi', role: '', gen: '4期生', birthday: '2004-10-03', avatar: 'member/konishi.png', color: '#20a0a0', bg: 'linear-gradient(145deg,#20a0a0,#50c8c8)', height: '', mbti: '', fav: '', memo: '' },
  { id: 10, enabled: true, name: '清水 理央', nameRoma: 'Rio Shimizu', role: '', gen: '4期生', birthday: '2005-01-15', avatar: 'member/shimizu.png', color: '#e06020', bg: 'linear-gradient(145deg,#e06020,#f09050)', height: '', mbti: '', fav: '', memo: '' },
  { id: 11, enabled: true, name: '正源司 陽子', nameRoma: 'Yoko Shogenji', role: '', gen: '4期生', birthday: '2007-02-14', avatar: 'member/shogenji.png', color: '#c020a0', bg: 'linear-gradient(145deg,#c020a0,#e050c8)', height: '', mbti: '', fav: '', memo: '' },
  { id: 12, enabled: true, name: '竹内 希来里', nameRoma: 'Kirari Takeuchi', role: '', gen: '4期生', birthday: '2006-02-20', avatar: 'member/takeuchi.png', color: '#3060e0', bg: 'linear-gradient(145deg,#3060e0,#6090f8)', height: '', mbti: '', fav: '', memo: '' },
  { id: 13, enabled: true, name: '平尾 帆夏', nameRoma: 'Honoka Hirao', role: '', gen: '4期生', birthday: '2003-07-31', avatar: 'member/hirao.png', color: '#e04060', bg: 'linear-gradient(145deg,#e04060,#f07090)', height: '', mbti: '', fav: '', memo: '' },
  { id: 14, enabled: true, name: '平岡 海月', nameRoma: 'Mitsuki Hiraoka', role: '', gen: '4期生', birthday: '2002-04-09', avatar: 'member/hiraoka.png', color: '#2090c0', bg: 'linear-gradient(145deg,#2090c0,#50b8e8)', height: '', mbti: '', fav: '', memo: '' },
  { id: 15, enabled: true, name: '藤嶌 果歩', nameRoma: 'Kaho Fujishima', role: '', gen: '4期生', birthday: '2006-08-07', avatar: 'member/fujishima.png', color: '#80c020', bg: 'linear-gradient(145deg,#80c020,#a8e050)', height: '', mbti: '', fav: '', memo: '' },
  { id: 16, enabled: true, name: '宮地 すみれ', nameRoma: 'Sumire Miyachi', role: '', gen: '4期生', birthday: '2005-12-31', avatar: 'member/miyachi.png', color: '#8020c0', bg: 'linear-gradient(145deg,#8020c0,#b050e8)', height: '', mbti: '', fav: '', memo: '' },
  { id: 17, enabled: true, name: '山下 葉留花', nameRoma: 'Haruka Yamashita', role: '', gen: '4期生', birthday: '2003-05-20', avatar: 'member/yamashita.png', color: '#e08020', bg: 'linear-gradient(145deg,#e08020,#f0a850)', height: '', mbti: '', fav: '', memo: '' },
  { id: 18, enabled: true, name: '渡辺 莉奈', nameRoma: 'Rina Watanabe', role: '', gen: '4期生', birthday: '2009-02-07', avatar: 'member/watanabe.png', color: '#20c060', bg: 'linear-gradient(145deg,#20c060,#50e090)', height: '', mbti: '', fav: '', memo: '' },
  { id: 19, enabled: true, name: '大田 美月', nameRoma: 'Mizuki Ota', role: '', gen: '5期生', birthday: '2006-12-07', avatar: 'member/ota.png', color: '#e02060', bg: 'linear-gradient(145deg,#e02060,#f05090)', height: '', mbti: '', fav: '', memo: '' },
  { id: 20, enabled: true, name: '大野 愛実', nameRoma: 'Manami Ono', role: '', gen: '5期生', birthday: '2007-05-05', avatar: 'member/ono.png', color: '#20b0e0', bg: 'linear-gradient(145deg,#20b0e0,#60d0f8)', height: '', mbti: '', fav: '', memo: '' },
  { id: 21, enabled: true, name: '片山 紗希', nameRoma: 'Saki Katayama', role: '', gen: '5期生', birthday: '2006-12-26', avatar: 'member/katayama.png', color: '#c06080', bg: 'linear-gradient(145deg,#c06080,#e090a8)', height: '', mbti: '', fav: '', memo: '' },
  { id: 22, enabled: true, name: '蔵盛 妃那乃', nameRoma: 'Hinano Kuramori', role: '', gen: '5期生', birthday: '2006-01-23', avatar: 'member/kuramori.png', color: '#6080e0', bg: 'linear-gradient(145deg,#6080e0,#90a8f8)', height: '', mbti: '', fav: '', memo: '' },
  { id: 23, enabled: true, name: '坂井 新奈', nameRoma: 'Niina Sakai', role: '', gen: '5期生', birthday: '2009-03-14', avatar: 'member/sakai.png', color: '#e0a040', bg: 'linear-gradient(145deg,#e0a040,#f0c070)', height: '', mbti: '', fav: '', memo: '' },
  { id: 24, enabled: true, name: '佐藤 優羽', nameRoma: 'Yu Sato', role: '', gen: '5期生', birthday: '2006-09-10', avatar: 'member/sato.png', color: '#40c080', bg: 'linear-gradient(145deg,#40c080,#70e0a8)', height: '', mbti: '', fav: '', memo: '' },
  { id: 25, enabled: true, name: '下田 衣珠季', nameRoma: 'Izuki Shimoda', role: '', gen: '5期生', birthday: '2006-12-26', avatar: 'member/shimoda.png', color: '#a040a0', bg: 'linear-gradient(145deg,#a040a0,#c870c8)', height: '', mbti: '', fav: '', memo: '' },
  { id: 26, enabled: true, name: '高井 俐香', nameRoma: 'Rika Takai', role: '', gen: '5期生', birthday: '2007-08-01', avatar: 'member/takai.png', color: '#e06040', bg: 'linear-gradient(145deg,#e06040,#f09070)', height: '', mbti: '', fav: '', memo: '' },
  { id: 27, enabled: true, name: '鶴崎 仁香', nameRoma: 'Niko Tsurusaki', role: '', gen: '5期生', birthday: '2004-03-27', avatar: 'member/tsurusaki.png', color: '#40a0c0', bg: 'linear-gradient(145deg,#40a0c0,#70c8e0)', height: '', mbti: '', fav: '', memo: '' },
  { id: 28, enabled: true, name: '松尾 桜', nameRoma: 'Sakura Matsuo', role: '', gen: '5期生', birthday: '2005-06-08', avatar: 'member/matsuo.png', color: '#e040a0', bg: 'linear-gradient(145deg,#e040a0,#f070c0)', height: '', mbti: '', fav: '', memo: '' },
];

const ACTIVE_MEMBERS = MEMBERS.filter(m => m.enabled);

/* ── ローカルストレージ ── */
function loadOshi()   { try { return new Set(JSON.parse(localStorage.getItem('hinata_oshi') || '[]')); } catch { return new Set(); } }
function saveOshi(s)  { try { localStorage.setItem('hinata_oshi', JSON.stringify([...s])); } catch {} }
function loadEvents() { try { return JSON.parse(localStorage.getItem('hinata_events') || '[]'); } catch { return []; } }
function saveEvents(a){ localStorage.setItem('hinata_events', JSON.stringify(a)); }