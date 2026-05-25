/* ─────────────────────────────────────
   pwa-check.js
   ホーム画面以外からのアクセスをブロック
───────────────────────────────────── */
(function() {
  var isPWA = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
    || new URLSearchParams(window.location.search).get('pwa') === '1'
    || document.referrer.includes(location.hostname); // アプリ内遷移

  if (!isPWA) {
    // index.htmlにリダイレクト（インストール案内を表示）
    window.location.replace('index.html');
  }
})();
