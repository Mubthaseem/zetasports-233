/* ── ZETASPORTS Public App — app.js ── */

let db = null;
let allMatches = [], allNews = [], allLeagues = [];
let currentScreen = 'home';

const WIDGET_LEAGUE_MAP = {
  'EPL': 39, 'PL': 39, 'LALIGA': 140, 'BUNDESLIGA': 78, 'SERIEA': 135, 'UCL': 2, 'LIGUE1': 61, 'ISL': 323
};

function initApp() {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    
    setupNavigation();
    listenData();
    recordVisit();

    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) splash.classList.add('hide');
    }, 1200);
  } catch(e) { console.error('Firebase init error:', e); }
}

async function recordVisit() {
  const today = new Date().toISOString().split('T')[0];
  const ref = db.collection('analytics').doc(today);
  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(ref);
      if (!doc.exists) t.set(ref, { visits: 1 });
      else t.update(ref, { visits: (doc.data().visits || 0) + 1 });
    });
  } catch(e) { console.error('Visit error:', e); }
}

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
      const screen = btn.getAttribute('data-screen');
      goScreen(screen);
    };
  });
  
  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.onclick = () => goScreen('home');
}

function goScreen(screen) {
  currentScreen = screen;
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('active', s.id === 'screen-' + screen);
  });
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-screen') === screen);
  });
  
  const backBtn = document.getElementById('back-btn');
  const logo = document.getElementById('header-logo');
  const title = document.getElementById('header-title');

  if (screen === 'detail') {
    backBtn?.classList.remove('hidden');
    logo?.classList.add('hidden');
    title?.classList.remove('hidden');
  } else {
    backBtn?.classList.add('hidden');
    logo?.classList.remove('hidden');
    title?.classList.add('hidden');
  }

  if (screen === 'home') renderHome();
}

function listenData() {
  db.collection('matches').orderBy('kickoffDate', 'desc').onSnapshot(snap => {
    allMatches = snap.docs.map(d => ({id:d.id, ...d.data()}));
    const liveCount = allMatches.filter(m => m.status==='live'||m.status==='ht').length;
    const lcv = document.getElementById('live-count-val');
    if (lcv) lcv.textContent = liveCount;
    if (currentScreen === 'home') renderHome();
  });

  db.collection('news').orderBy('publishedAt', 'desc').limit(10).onSnapshot(snap => {
    allNews = snap.docs.map(d => ({id:d.id, ...d.data()}));
    if (currentScreen === 'home') renderHome();
  });
}

function renderHome() {
  const homeEl = document.getElementById('screen-home');
  if (!homeEl) return;
  const live = allMatches.filter(m => m.status === 'live' || m.status === 'ht');
  const upcoming = allMatches.filter(m => m.status === 'upcoming');

  homeEl.innerHTML = `
    <section class="home-section" style="padding:15px">
      <div class="section-header" style="margin-bottom:15px">
        <h2 style="color:var(--text1);font-family:'Rajdhani'">🔴 Live Matches</h2>
      </div>
      <div class="matches-grid" style="display:grid;gap:12px">
        ${live.length ? live.map(m => matchCard(m)).join('') : '<div class="empty" style="color:var(--text3);padding:20px;text-align:center">No live matches currently.</div>'}
      </div>
    </section>

    <section class="home-section" style="padding:15px">
      <div class="section-header" style="margin-bottom:15px">
        <h2 style="color:var(--text1);font-family:'Rajdhani'">⏰ Upcoming Fixtures</h2>
      </div>
      <div class="matches-grid" style="display:grid;gap:12px">
        ${upcoming.slice(0,8).map(m => matchCard(m)).join('')}
      </div>
    </section>

    <section class="home-section" style="padding:15px">
      <div class="section-header" style="margin-bottom:15px">
        <h2 style="color:var(--text1);font-family:'Rajdhani'">📰 Latest News</h2>
      </div>
      <div class="news-grid" style="display:grid;gap:12px">
        ${allNews.map(n => newsCard(n)).join('')}
      </div>
    </section>
  `;
}

function matchCard(m) {
  const isCricket = m.sport === 'cricket';
  return `
    <div class="match-card" onclick="openMatchDetail('${m.id}')" style="background:var(--card);border:1px solid var(--border);border-radius:15px;padding:15px;cursor:pointer">
      <div class="mc-header" style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:11px;color:var(--text3)">
        <span>${m.leagueName || m.leagueId}</span>
        ${m.status === 'live' ? '<span style="color:#ff6b6b;font-weight:700">🔴 LIVE</span>' : ''}
      </div>
      <div class="mc-teams" style="display:flex;align-items:center;justify-content:space-between">
        <div class="mct-side" style="text-align:center;width:30%">
          <img src="${m.homeLogo}" style="width:32px;height:32px;object-fit:contain" onerror="this.src='https://placehold.co/32x32/1a1a2e/ffffff?text=${m.home}'">
          <div style="font-size:12px;margin-top:5px;font-weight:700">${m.home}</div>
        </div>
        <div class="mct-center" style="text-align:center;flex:1">
          <div style="font-size:18px;font-weight:900;letter-spacing:1px">
            ${isCricket ? `${m.homeCricketScore||'0/0'} - ${m.awayCricketScore||'0/0'}` : `${m.homeScore} - ${m.awayScore}`}
          </div>
          <div style="font-size:10px;color:var(--acc2);margin-top:3px">${m.status === 'live' ? m.minute+"'" : formatTime(m.kickoffIST)}</div>
        </div>
        <div class="mct-side" style="text-align:center;width:30%">
          <img src="${m.awayLogo}" style="width:32px;height:32px;object-fit:contain" onerror="this.src='https://placehold.co/32x32/1a1a2e/ffffff?text=${m.away}'">
          <div style="font-size:12px;margin-top:5px;font-weight:700">${m.away}</div>
        </div>
      </div>
    </div>
  `;
}

function newsCard(n) {
  return `
    <div class="news-card" onclick="window.open('${n.articleUrl||'#'}', '_blank')" style="background:var(--card);border-radius:12px;padding:12px;display:flex;gap:12px;align-items:center;cursor:pointer">
      <div class="nc-img" style="width:50px;height:50px;border-radius:10px;background:${n.gradient||'#1a1a2e'};display:flex;align-items:center;justify-content:center;font-size:24px">
        ${n.emoji||'⚽'}
      </div>
      <div class="nc-body">
        <h3 style="font-size:14px;margin:0;line-height:1.3">${n.title}</h3>
        <p style="font-size:11px;color:var(--text3);margin:4px 0 0">${n.category||'News'}</p>
      </div>
    </div>
  `;
}

function openMatchDetail(id) {
  const m = allMatches.find(x => x.id === id);
  if (!m) return;
  
  goScreen('detail');
  const detailEl = document.getElementById('screen-detail');
  const isCricket = m.sport === 'cricket';
  const leagueId = WIDGET_LEAGUE_MAP[m.leagueId] || 39;

  detailEl.innerHTML = `
    <div class="match-hero" style="background:linear-gradient(to bottom, #1a2980, #26d0ce);padding:40px 20px;text-align:center;color:#fff">
      <div class="mh-teams" style="display:flex;align-items:center;justify-content:space-around">
        <div class="mh-team">
          <img src="${m.homeLogo}" style="width:64px;height:64px;object-fit:contain" onerror="this.src='https://placehold.co/64x64/1a1a2e/ffffff?text=${m.home}'">
          <h3 style="margin-top:10px">${m.homeTeam||m.home}</h3>
        </div>
        <div class="mh-score" style="text-align:center">
           ${isCricket ? `<h1 style="font-size:32px;margin:0">${m.homeCricketScore||'0/0'} - ${m.awayCricketScore||'0/0'}</h1><p style="font-size:12px;opacity:0.8">${m.cricketInfo||''}</p>` : `<h1 style="font-size:40px;margin:0">${m.homeScore} - ${m.awayScore}</h1><p style="font-size:14px;opacity:0.8">${m.status==='live'?m.minute+"'":'Upcoming'}</p>`}
        </div>
        <div class="mh-team">
          <img src="${m.awayLogo}" style="width:64px;height:64px;object-fit:contain" onerror="this.src='https://placehold.co/64x64/1a1a2e/ffffff?text=${m.away}'">
          <h3 style="margin-top:10px">${m.awayTeam||m.away}</h3>
        </div>
      </div>
    </div>

    <div class="stream-zone" style="padding:20px">
      <h3 style="margin-bottom:15px;font-family:'Rajdhani'">🎥 Select Video Server</h3>
      <div class="server-grid" style="display:grid;gap:10px">
        ${m.servers && m.servers.length ? m.servers.map((s,i) => `
          <button class="btn-srv" onclick="playStream('${s.url}','${s.type}')" style="background:var(--card);border:1px solid var(--border);padding:15px;border-radius:12px;color:var(--text1);text-align:left;cursor:pointer;font-weight:600">🎥 Server ${i+1} - ${s.label}</button>
        `).join('') : '<p style=\"color:var(--text3)\">No servers available yet.</p>'}
      </div>
        ${m.servers && m.servers.length ? m.servers.map((s,i) => `
          <button class="btn-srv" onclick="playStream('${s.url}','${s.type}')" style="background:var(--card);border:1px solid var(--border);padding:15px;border-radius:12px;color:var(--text1);text-align:left;cursor:pointer;font-weight:600">🎥 Server ${i+1} - ${s.label}</button>
        `).join('') : '<p style="color:var(--text3)">No servers available yet.</p>'}
      </div>
    </div>

    ${!isCricket ? `
    <div class="stats-zone" style="margin:20px;background:var(--card);border-radius:15px;overflow:hidden;border:1px solid var(--border)">
      <div style="padding:12px;font-weight:700;border-bottom:1px solid var(--border);background:rgba(255,255,255,0.02)">📊 Live Stats & Table</div>
      <iframe src="https://www.scoreaxis.com/widget/standings/${leagueId}?autoHeight=1&font=Inter&links=0&color=2979ff" 
              style="width:100%;border:none;height:450px"></iframe>
    </div>` : ''}
  `;
}

function playStream(url, type) {
  window.open(url, '_blank');
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  let hh = parseInt(h);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${hh}:${m} ${ampm}`;
}

document.addEventListener('DOMContentLoaded', initApp);

