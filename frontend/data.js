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

/* ════════════════════════════════════════
   VENUES（ライブ会場一覧）
   ここに会場データを追加・編集してください
   ════════════════════════════════════════ */
const VENUES = [

  /* ── 東京・関東 ── */
  {
    id: 1,
    name: '国立競技場',
    nameRoma: 'Japan National Stadium',
    area: '東京・関東',
    address: '〒160-0013 東京都新宿区霞ヶ丘町10-1',
    access: '都営大江戸線「国立競技場駅」徒歩3分 / JR「信濃町駅」徒歩5分',
    capacity: '約68,000人',
    photo: 'venue/national_stadium.jpg',
    mapUrl: 'https://maps.google.com/?q=国立競技場+新宿区霞ヶ丘町10-1',
    memo: '日向坂46 全国ツアーの聖地',
  },
  {
    id: 2,
    name: 'ぴあアリーナMM',
    nameRoma: 'Pia Arena MM',
    area: '東京・関東',
    address: '〒220-0012 神奈川県横浜市西区みなとみらい3-4-1',
    access: 'みなとみらい線「みなとみらい駅」徒歩8分 / JR・市営地下鉄「桜木町駅」徒歩10分',
    capacity: '約10,000人',
    photo: 'venue/pia_arena_mm.jpg',
    mapUrl: 'https://maps.google.com/?q=ぴあアリーナMM+横浜市西区みなとみらい3-4-1',
    memo: '',
  },
  {
    id: 3,
    name: 'Zepp Haneda（TOKYO）',
    nameRoma: 'Zepp Haneda Tokyo',
    area: '東京・関東',
    address: '〒144-0041 東京都大田区羽田空港2-6-5 FLIGHT OF DREAMS 2F',
    access: '東京モノレール・京急空港線「天空橋駅」直結',
    capacity: '約2,500人',
    photo: 'venue/zepp_haneda.jpg',
    mapUrl: 'https://maps.google.com/?q=Zepp+Haneda+Tokyo+大田区羽田空港2-6-5',
    memo: '',
  },
  {
    id: 4,
    name: 'さいたまスーパーアリーナ',
    nameRoma: 'Saitama Super Arena',
    area: '東京・関東',
    address: '〒330-0854 埼玉県さいたま市中央区新都心8番地',
    access: 'JR京浜東北・高崎・宇都宮線「さいたま新都心駅」徒歩3分',
    capacity: '約37,000人（コンサートモード）',
    photo: 'venue/saitama_super_arena.jpg',
    mapUrl: 'https://maps.google.com/?q=さいたまスーパーアリーナ+さいたま市中央区新都心8',
    memo: '',
  },
  {
    id: 5,
    name: '日本武道館',
    nameRoma: 'Nippon Budokan',
    area: '東京・関東',
    address: '〒102-8321 東京都千代田区北の丸公園2-3',
    access: '東京メトロ東西線・半蔵門線「九段下駅」徒歩5分',
    capacity: '約14,000人',
    photo: 'venue/nippon_budokan.jpg',
    mapUrl: 'https://maps.google.com/?q=日本武道館+千代田区北の丸公園2-3',
    memo: '',
  },
  {
    id: 6,
    name: 'K-Arena Yokohama',
    nameRoma: 'K-Arena Yokohama',
    area: '東京・関東',
    address: '〒220-0012 神奈川県横浜市西区みなとみらい6-2-14',
    access: 'みなとみらい線「みなとみらい駅」徒歩5分 / JR「桜木町駅」徒歩10分',
    capacity: '約20,000人',
    photo: 'venue/k_arena_yokohama.jpg',
    mapUrl: 'https://maps.google.com/?q=K-Arena+Yokohama+横浜市西区みなとみらい6-2-14',
    memo: '',
  },

  /* ── 大阪・関西 ── */
  {
    id: 7,
    name: 'YANMAR STADIUM NAGAI',
    nameRoma: 'Yanmar Stadium Nagai',
    area: '大阪・関西',
    address: '〒546-0034 大阪府大阪市東住吉区長居公園1-1',
    access: 'Osaka Metro御堂筋線「長居駅」徒歩5分',
    capacity: '約47,000人',
    photo: 'venue/nagai_stadium.jpg',
    mapUrl: 'https://maps.google.com/?q=ヤンマースタジアム長居+大阪市東住吉区長居公園1-1',
    memo: '',
  },
  {
    id: 8,
    name: 'Zepp Osaka Bayside',
    nameRoma: 'Zepp Osaka Bayside',
    area: '大阪・関西',
    address: '〒554-0022 大阪府大阪市此花区桜島2-1-33',
    access: 'JRゆめ咲線「桜島駅」徒歩5分',
    capacity: '約2,500人',
    photo: 'venue/zepp_osaka.jpg',
    mapUrl: 'https://maps.google.com/?q=Zepp+Osaka+Bayside+大阪市此花区桜島2-1-33',
    memo: '',
  },
  {
    id: 9,
    name: '大阪城ホール',
    nameRoma: 'Osaka-Jo Hall',
    area: '大阪・関西',
    address: '〒540-0002 大阪府大阪市中央区大阪城3-1',
    access: 'JR大阪環状線「大阪城公園駅」徒歩5分 / 地下鉄中央線「森ノ宮駅」徒歩8分',
    capacity: '約16,000人',
    photo: 'venue/osaka_jo_hall.jpg',
    mapUrl: 'https://maps.google.com/?q=大阪城ホール+大阪市中央区大阪城3-1',
    memo: '',
  },
  {
    id: 10,
    name: '京セラドーム大阪',
    nameRoma: 'Kyocera Dome Osaka',
    area: '大阪・関西',
    address: '〒550-0023 大阪府大阪市西区千代崎3丁目中2-1',
    access: 'JR環状線「大正駅」徒歩10分 / 地下鉄長堀鶴見緑地線「ドーム前千代崎駅」すぐ',
    capacity: '約55,000人',
    photo: 'venue/kyocera_dome.jpg',
    mapUrl: 'https://maps.google.com/?q=京セラドーム大阪+大阪市西区千代崎3丁目中2-1',
    memo: '',
  },

  /* ── 名古屋・東海 ── */
  {
    id: 11,
    name: '名古屋ガイシホール',
    nameRoma: 'Nippon Gaishi Hall',
    area: '名古屋・東海',
    address: '〒457-0833 愛知県名古屋市南区芝府町1-1',
    access: '名鉄常滑線「道徳駅」徒歩5分 / JR・名鉄「金山駅」よりバス',
    capacity: '約10,000人',
    photo: 'venue/gaishi_hall.jpg',
    mapUrl: 'https://maps.google.com/?q=名古屋ガイシホール+名古屋市南区芝府町1-1',
    memo: '',
  },
  {
    id: 12,
    name: 'Zepp Nagoya',
    nameRoma: 'Zepp Nagoya',
    area: '名古屋・東海',
    address: '〒450-0002 愛知県名古屋市中村区名駅4-5-26',
    access: 'JR・地下鉄「名古屋駅」徒歩10分',
    capacity: '約2,500人',
    photo: 'venue/zepp_nagoya.jpg',
    mapUrl: 'https://maps.google.com/?q=Zepp+Nagoya+名古屋市中村区名駅4-5-26',
    memo: '',
  },
  {
    id: 13,
    name: 'バンテリンドーム ナゴヤ',
    nameRoma: 'Vantelin Dome Nagoya',
    area: '名古屋・東海',
    address: '〒462-0011 愛知県名古屋市北区大曽根町4-1',
    access: 'JR中央線・地下鉄名城線「大曽根駅」徒歩5分',
    capacity: '約49,000人',
    photo: 'venue/vantelin_dome.jpg',
    mapUrl: 'https://maps.google.com/?q=バンテリンドームナゴヤ+名古屋市北区大曽根町4-1',
    memo: '',
  },

  /* ── 福岡・九州 ── */
  {
    id: 14,
    name: 'みずほPayPayドーム福岡',
    nameRoma: 'Mizuho PayPay Dome Fukuoka',
    area: '福岡・九州',
    address: '〒810-0065 福岡県福岡市中央区地行浜2-2-2',
    access: '地下鉄空港線「唐人町駅」徒歩15分 / 西鉄バス「PayPayドーム前」すぐ',
    capacity: '約38,000人',
    photo: 'venue/paypay_dome.jpg',
    mapUrl: 'https://maps.google.com/?q=みずほPayPayドーム福岡+福岡市中央区地行浜2-2-2',
    memo: '',
  },
  {
    id: 15,
    name: 'Zepp Fukuoka',
    nameRoma: 'Zepp Fukuoka',
    area: '福岡・九州',
    address: '〒812-0025 福岡県福岡市博多区店屋町1-1',
    access: '地下鉄空港線「祇園駅」徒歩7分 / JR「博多駅」徒歩15分',
    capacity: '約2,500人',
    photo: 'venue/zepp_fukuoka.jpg',
    mapUrl: 'https://maps.google.com/?q=Zepp+Fukuoka+福岡市博多区店屋町1-1',
    memo: '',
  },
  {
    id: 16,
    name: 'マリンメッセ福岡',
    nameRoma: 'Marine Messe Fukuoka',
    area: '福岡・九州',
    address: '〒812-0031 福岡県福岡市博多区沖浜町7-1',
    access: '地下鉄箱崎線「貝塚駅」よりバス / JR「博多駅」よりバス約20分',
    capacity: '約10,000人',
    photo: 'venue/marine_messe.jpg',
    mapUrl: 'https://maps.google.com/?q=マリンメッセ福岡+福岡市博多区沖浜町7-1',
    memo: '',
  },
];
