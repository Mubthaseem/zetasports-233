/* ── ZETASPORTS app.js — Hash Router + All Screens ── */

/* ────────────────────────────────────────────────────
   GLOBALS
──────────────────────────────────────────────────── */
let db = null;
let allMatches = [], allNews = [], allLeagues = [];
let appSettings = { tablesEnabled: true };

const WIDGET_LEAGUE_MAP = {
  'EPL':39,'PL':39,'LALIGA':140,'BUNDESLIGA':78,
  'SERIEA':135,'UCL':2,'LIGUE1':61,'ISL':323,'IPL':1
};

const LEAGUE_EMOJI = {
  EPL:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', PL:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', LALIGA:'🇪🇸', BUNDESLIGA:'🇩🇪',
  SERIEA:'🇮🇹', UCL:'⭐', LIGUE1:'🇫🇷', ISL:'🇮🇳', IPL:'🏏'
};

/* ────────────────────────────────────────────────────
   INIT
──────────────────────────────────────────────────── */
function initApp() {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    listenData();
    recordVisit();
    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) splash.classList.add('hide');
    }, 1400);
  } catch(e) { console.error('Firebase init error:', e); }
}

async function recordVisit() {
  const today = new Date().toISOString().split('T')[0];
  const ref = db.collection('analytics').doc(today);
  try {
    await db.runTransaction(async t => {
      const doc = await t.get(ref);
      if (!doc.exists) t.set(ref, { visits: 1 });
      else t.update(ref, { visits: (doc.data().visits || 0) + 1 });
    });
  } catch(e) {}
}

/* ────────────────────────────────────────────────────
   FIREBASE LISTENERS
──────────────────────────────────────────────────── */
function listenData() {
  db.collection('matches').orderBy('kickoffDate', 'desc').onSnapshot(snap => {
    allMatches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const liveCount = allMatches.filter(m => m.status === 'live' || m.status === 'ht').length;
    const lcv = document.getElementById('live-count-val');
    if (lcv) lcv.textContent = liveCount;
    // Re-render current screen if it needs live data
    reRenderCurrentScreen();
  });

  db.collection('news').orderBy('publishedAt', 'desc').limit(20).onSnapshot(snap => {
    allNews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    reRenderCurrentScreen();
  }, () => {
    db.collection('news').onSnapshot(snap => {
      allNews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      reRenderCurrentScreen();
    });
  });

  db.collection('leagues').onSnapshot(snap => {
    allLeagues = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    reRenderCurrentScreen();
  });

  db.collection('settings').doc('app_config').onSnapshot(doc => {
    if (doc.exists) {
      appSettings = doc.data();
      applySettings();
    }
  });
}

function applySettings() {
  const tablesNav = document.getElementById('nav-standings');
  if (appSettings.tablesEnabled === false) {
    if (tablesNav) tablesNav.style.display = 'none';
    if (location.hash === '#/standings') location.hash = '#/';
  } else {
    if (tablesNav) tablesNav.style.display = 'flex';
  }
  reRenderCurrentScreen();
}

function reRenderCurrentScreen() {
  const hash = location.hash || '#/';
  if (hash === '#/' || hash === '') renderHome();
  else if (hash === '#/matches') renderMatches();
  else if (hash === '#/news') renderNews();
  else if (hash === '#/standings') renderStandings();
  else if (hash === '#/leagues') renderLeagues();
}

/* ────────────────────────────────────────────────────
   HASH ROUTER
──────────────────────────────────────────────────── */
function route() {
  const hash = location.hash || '#/';

  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  // Reset nav active
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Reset header
  const backBtn = document.getElementById('back-btn');
  const logo = document.getElementById('header-logo');
  const title = document.getElementById('header-title');

  if (hash.startsWith('#/match/')) {
    const id = hash.replace('#/match/', '');
    showScreen('match');
    backBtn.classList.remove('hidden');
    logo.classList.add('hidden');
    title.classList.remove('hidden');
    title.textContent = 'Match Details';
    renderMatchDetail(id);

  } else if (hash.startsWith('#/article/')) {
    const id = hash.replace('#/article/', '');
    showScreen('article');
    backBtn.classList.remove('hidden');
    logo.classList.add('hidden');
    title.classList.remove('hidden');
    title.textContent = 'Article';
    renderArticle(id);

  } else if (hash === '#/matches') {
    showScreen('matches');
    setNavActive('nav-matches');
    setHeader(false);
    renderMatches();

  } else if (hash === '#/news') {
    showScreen('news');
    setNavActive('nav-news');
    setHeader(false);
    renderNews();

  } else if (hash === '#/standings') {
    showScreen('standings');
    setNavActive('nav-standings');
    setHeader(false);
    renderStandings();

  } else if (hash === '#/leagues') {
    showScreen('leagues');
    setNavActive('nav-leagues');
    setHeader(false);
    renderLeagues();

  } else {
    showScreen('home');
    setNavActive('nav-home');
    setHeader(false);
    renderHome();
  }
}

function showScreen(name) {
  const el = document.getElementById('screen-' + name);
  if (el) el.classList.add('active');
}

function setNavActive(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function setHeader(showBack, titleText = '') {
  const backBtn = document.getElementById('back-btn');
  const logo = document.getElementById('header-logo');
  const title = document.getElementById('header-title');
  if (showBack) {
    backBtn.classList.remove('hidden');
    logo.classList.add('hidden');
    title.classList.remove('hidden');
    title.textContent = titleText;
  } else {
    backBtn.classList.add('hidden');
    logo.classList.remove('hidden');
    title.classList.add('hidden');
  }
}

/* ────────────────────────────────────────────────────
   HOME SCREEN
──────────────────────────────────────────────────── */
let homeFilterDate = 'today'; // 'yesterday' | 'today' | 'tomorrow'

function getDateStr(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function renderHome() {
  const el = document.getElementById('screen-home');
  if (!el) return;

  // Trending = featured matches or live matches
  const trending = allMatches
    .filter(m => m.featured || m.status === 'live' || m.status === 'ht')
    .sort((a, b) => {
      const o = { live: 0, ht: 1, upcoming: 2, finished: 3 };
      return (o[a.status] || 9) - (o[b.status] || 9);
    });

  // Date filtered matches
  const dateMap = { yesterday: getDateStr(-1), today: getDateStr(0), tomorrow: getDateStr(1) };
  const targetDate = dateMap[homeFilterDate];
  const filtered = allMatches.filter(m => m.kickoffDate === targetDate)
    .sort((a, b) => {
      const o = { live: 0, ht: 1, upcoming: 2, finished: 3 };
      return (o[a.status] || 9) - (o[b.status] || 9);
    });

  el.innerHTML = `
    <!-- Trending Matches -->
    ${trending.length ? `
    <div class="section-head">
      <div class="section-title">⚡ Trending Matches</div>
    </div>
    <div class="trending-scroll">
      ${trending.slice(0, 6).map(m => trendingCard(m)).join('')}
    </div>` : ''}

    <!-- Date Filter -->
    <div class="date-filter">
      <button class="date-chip ${homeFilterDate === 'yesterday' ? 'active' : ''}" onclick="setHomeFilter('yesterday')">Yesterday</button>
      <button class="date-chip ${homeFilterDate === 'today' ? 'active' : ''}" onclick="setHomeFilter('today')">Today</button>
      <button class="date-chip ${homeFilterDate === 'tomorrow' ? 'active' : ''}" onclick="setHomeFilter('tomorrow')">Tomorrow</button>
    </div>

    <!-- Date Filtered Matches -->
    <div id="date-matches-zone">
      ${filtered.length
        ? `<div class="match-list-body">${filtered.map(m => matchCard(m)).join('')}</div>`
        : `<div class="no-matches-state">
            <div class="nms-icon">🏟️</div>
            <div class="nms-title">No Matches</div>
            <div class="nms-sub">No matches scheduled for this date.</div>
          </div>`}
    </div>

    <!-- Latest News -->
    <div class="section-head" style="margin-top:16px">
      <div class="section-title">📰 Latest News</div>
      <a href="#/news" class="see-all-btn">See all</a>
    </div>
    <div class="news-row">
      ${allNews.length
        ? allNews.slice(0, 10).map(n => newsCardSm(n)).join('')
        : '<div class="empty-state">No news yet</div>'}
    </div>
    <div style="height:20px"></div>
  `;
}

function setHomeFilter(filter) {
  homeFilterDate = filter;
  renderHome();
}

function trendingCard(m) {
  const isLive = m.status === 'live' || m.status === 'ht';
  const isUpcoming = m.status === 'upcoming';

  return `
    <a class="trending-banner" href="#/match/${m.id}">
      <div class="tb-overlay"></div>
      <div class="tb-content">
        <div class="tb-top">
          <div class="tb-league">${m.leagueId || 'LEAGUE'}</div>
          ${isLive
            ? `<div class="tb-live">🔴 LIVE ${m.minute || ''}</div>`
            : isUpcoming
            ? `<div class="tb-upcoming">UPCOMING</div>`
            : `<div class="tb-upcoming" style="color:var(--text3)">FT</div>`}
        </div>
        <div class="tb-main">
          <div class="tb-team">
            <div class="tb-crest-wrap">
              <img src="${m.homeLogo}" alt="${m.home}" onerror="this.style.display='none'">
            </div>
            <div class="tb-team-name">${m.homeTeam || m.home}</div>
          </div>
          <div class="tb-center">
            ${isUpcoming
              ? `<div class="tb-vs">VS</div><div class="tb-time">${formatTime(m.kickoffIST)}</div>`
              : `<div class="tb-score">${m.homeScore ?? 0} : ${m.awayScore ?? 0}</div>
                 <div class="tb-time">${m.status === 'live' ? m.minute + "'" : 'FT'}</div>`}
          </div>
          <div class="tb-team">
            <div class="tb-crest-wrap">
              <img src="${m.awayLogo}" alt="${m.away}" onerror="this.style.display='none'">
            </div>
            <div class="tb-team-name">${m.awayTeam || m.away}</div>
          </div>
        </div>
        <div class="tb-footer">
          <div class="tb-date">${m.kickoffDate || ''}</div>
          <div class="tb-watch">WATCH NOW →</div>
        </div>
      </div>
    </a>
  `;
}

/* ────────────────────────────────────────────────────
   MATCHES SCREEN
──────────────────────────────────────────────────── */

function renderMatches() {
  const el = document.getElementById('screen-matches');
  if (!el) return;

  const live = allMatches.filter(m => m.status === 'live' || m.status === 'ht');
  const upcoming = allMatches.filter(m => m.status === 'upcoming')
    .sort((a, b) => new Date((a.kickoffDate||'') + 'T' + (a.kickoffIST||'00:00')) - new Date((b.kickoffDate||'') + 'T' + (b.kickoffIST||'00:00')));
  const finished = allMatches.filter(m => m.status === 'finished')
    .sort((a, b) => new Date(b.kickoffDate||'') - new Date(a.kickoffDate||''));

  el.innerHTML = `
    <div class="section-head"><div class="section-title">🔴 Live Now</div></div>
    <div class="match-list-body">
      ${live.length ? live.map(m => matchCard(m)).join('') : '<div class="empty-state">No live matches</div>'}
    </div>

    <div class="section-head" style="margin-top:8px"><div class="section-title">⏰ Upcoming</div></div>
    <div class="match-list-body">
      ${upcoming.length ? upcoming.map(m => matchCard(m)).join('') : '<div class="empty-state">No upcoming matches</div>'}
    </div>

    <div class="section-head" style="margin-top:8px"><div class="section-title">✅ Finished</div></div>
    <div class="match-list-body">
      ${finished.length ? finished.slice(0,10).map(m => matchCard(m)).join('') : '<div class="empty-state">No finished matches</div>'}
    </div>
    <div style="height:20px"></div>
  `;
}

/* ────────────────────────────────────────────────────
   NEWS SCREEN
──────────────────────────────────────────────────── */
function renderNews() {
  const el = document.getElementById('screen-news');
  if (!el) return;

  if (!allNews.length) {
    el.innerHTML = '<div class="empty-state" style="margin-top:60px">No news articles yet</div>';
    return;
  }

  el.innerHTML = `
    <div class="section-head"><div class="section-title">📰 All Articles</div></div>
    <div class="news-full-grid">
      ${allNews.map(n => newsCardFull(n)).join('')}
    </div>
    <div style="height:20px"></div>
  `;
}

/* ────────────────────────────────────────────────────
   STANDINGS SCREEN
──────────────────────────────────────────────────── */
function renderStandings() {
  const el = document.getElementById('screen-standings');
  if (!el) return;

  const leagues = [
    { id: 'EPL',       name: 'Premier League',    widgetId: 39  },
    { id: 'LALIGA',    name: 'La Liga',            widgetId: 140 },
    { id: 'UCL',       name: 'Champions League',   widgetId: 2   },
    { id: 'BUNDESLIGA',name: 'Bundesliga',         widgetId: 78  },
    { id: 'SERIEA',    name: 'Serie A',            widgetId: 135 },
    { id: 'LIGUE1',    name: 'Ligue 1',            widgetId: 61  },
  ];

  el.innerHTML = `
    <div class="section-head"><div class="section-title">📊 League Tables</div></div>
    <div class="standings-tabs" id="standings-tabs">
      ${leagues.map((l, i) => `
        <button class="std-tab ${i===0?'active':''}" onclick="switchStandingsTab('${l.id}', this)">
          ${LEAGUE_EMOJI[l.id] || '🏆'} ${l.name}
        </button>
      `).join('')}
    </div>
    ${leagues.map((l, i) => {
      const dbL = allLeagues.find(al => al.id === l.id) || {};
      const embed = dbL.embedCode || '';
      return `
      <div class="standings-panel ${i===0?'active':''}" id="std-panel-${l.id}">
        <div style="background:var(--card);border:1px solid var(--border);border-radius:15px;overflow:hidden;margin:12px" id="embed-container-${l.id}">
          ${embed ? '' : `<div style="padding:40px 20px;text-align:center;color:var(--text3);font-size:13px">No table configured. Add embed code in Admin Panel.</div>`}
        </div>
      </div>
    `}).join('')}
    <div style="height:20px"></div>
  `;

  // Inject script tags correctly
  leagues.forEach((l) => {
    const dbL = allLeagues.find(al => al.id === l.id) || {};
    if (dbL.embedCode) {
      injectHTMLSafe(`embed-container-${l.id}`, dbL.embedCode);
    }
  });
}

function switchStandingsTab(id, btn) {
  document.querySelectorAll('.std-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.standings-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const panel = document.getElementById('std-panel-' + id);
  if (panel) panel.classList.add('active');
}

/* ────────────────────────────────────────────────────
   LEAGUES SCREEN
──────────────────────────────────────────────────── */
function renderLeagues() {
  const el = document.getElementById('screen-leagues');
  if (!el) return;

  const defaultLeagues = {
    EPL:      { name:'Premier League',    country:'England', color:'#3d195b', logo:'https://media.api-sports.io/football/leagues/39.png' },
    UCL:      { name:'Champions League',  country:'Europe',  color:'#003399', logo:'https://media.api-sports.io/football/leagues/2.png' },
    LALIGA:   { name:'La Liga',           country:'Spain',   color:'#ee8200', logo:'https://media.api-sports.io/football/leagues/140.png' },
    BUNDESLIGA:{ name:'Bundesliga',       country:'Germany', color:'#d20515', logo:'https://media.api-sports.io/football/leagues/78.png' },
    SERIEA:   { name:'Serie A',           country:'Italy',   color:'#024594', logo:'https://media.api-sports.io/football/leagues/135.png' },
    LIGUE1:   { name:'Ligue 1',           country:'France',  color:'#0057a8', logo:'https://media.api-sports.io/football/leagues/61.png' },
    ISL:      { name:'Indian Super League',country:'India',  color:'#f58220', logo:'https://media.api-sports.io/football/leagues/323.png' },
    IPL:      { name:'IPL Cricket',        country:'India',  color:'#d4af37', logo:'' },
  };

  const combined = { ...defaultLeagues };
  allLeagues.forEach(l => { combined[l.id] = { ...(combined[l.id] || {}), ...l }; });

  const matchCount = id => allMatches.filter(m => m.leagueId === id).length;

  el.innerHTML = `
    <div class="section-head"><div class="section-title">🏆 Leagues</div></div>
    <div class="leagues-public-grid">
      ${Object.entries(combined).map(([id, l]) => `
        <div class="league-pub-card" style="border-top: 3px solid ${l.color || '#2979ff'}" onclick="location.hash='#/standings'">
          ${l.logo ? `<img src="${l.logo}" class="league-pub-logo" onerror="this.style.display='none'">` : `<div style="font-size:40px;margin-bottom:10px">${LEAGUE_EMOJI[id]||'🏆'}</div>`}
          <div class="league-pub-name">${l.name}</div>
          <div class="league-pub-country">${l.country || ''}</div>
          <div class="league-pub-matches">${matchCount(id)} matches</div>
        </div>
      `).join('')}
    </div>
    <div style="height:20px"></div>
  `;
}

/* ────────────────────────────────────────────────────
   MATCH DETAIL SCREEN
──────────────────────────────────────────────────── */
function renderMatchDetail(id) {
  const el = document.getElementById('screen-match');
  if (!el) return;

  // Try to find from cache, or load from Firestore
  const m = allMatches.find(x => x.id === id);
  if (!m) {
    el.innerHTML = '<div class="empty-state" style="margin-top:80px">Loading match...</div>';
    db.collection('matches').doc(id).get().then(doc => {
      if (doc.exists) {
        const match = { id: doc.id, ...doc.data() };
        allMatches.push(match);
        renderMatchDetail(id);
      } else {
        el.innerHTML = '<div class="empty-state" style="margin-top:80px">Match not found.</div>';
      }
    });
    return;
  }

  const isCricket = m.sport === 'cricket';
  const leagueId = WIDGET_LEAGUE_MAP[m.leagueId] || 39;
  const enabledServers = (m.servers || []).filter(s => s.enabled !== false && s.url);

  const scoreDisplay = isCricket
    ? `<div class="dh-score">${m.homeCricketScore || '—'}</div>
       <div class="dh-score-sep">vs</div>
       <div class="dh-score">${m.awayCricketScore || '—'}</div>`
    : `<div class="dh-score">${m.homeScore ?? 0} – ${m.awayScore ?? 0}</div>`;

  const statusDisplay = isCricket
    ? (m.cricketInfo || m.status)
    : (m.status === 'live' ? `🔴 LIVE ${m.minute || ''}` : m.status === 'ht' ? '⏸ Half Time' : m.status === 'finished' ? '✅ Full Time' : `⏰ ${formatTime(m.kickoffIST)} IST`);

  el.innerHTML = `
    <!-- Hero -->
    <div class="detail-hero">
      <button class="share-btn" onclick="shareContent('${m.homeTeam || m.home} vs ${m.awayTeam || m.away}', '#/match/${m.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
      </button>
      <div class="detail-hero-glow"></div>
      <div class="dh-league">${LEAGUE_EMOJI[m.leagueId] || '🏆'} ${m.leagueName || m.leagueId}</div>
      <div class="dh-teams">
        <div class="dh-team">
          <div class="dh-crest">
            <img src="${m.homeLogo}" alt="${m.homeTeam}" onerror="this.parentElement.innerHTML='${(m.home||'?')[0]}'">
          </div>
          <div class="dh-name">${m.homeTeam || m.home}</div>
        </div>
        <div class="dh-score-box">
          ${scoreDisplay}
          <div class="dh-status ${m.status}">${statusDisplay}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">${m.kickoffDate || ''}</div>
        </div>
        <div class="dh-team">
          <div class="dh-crest">
            <img src="${m.awayLogo}" alt="${m.awayTeam}" onerror="this.parentElement.innerHTML='${(m.away||'?')[0]}'">
          </div>
          <div class="dh-name">${m.awayTeam || m.away}</div>
        </div>
      </div>
    </div>

    <!-- Match Preview / Analysis -->
    ${m.preview ? `
    <div class="detail-section">
      <div class="detail-section-title">📝 Match Preview</div>
      <div class="match-preview-box">${m.preview.split('\n').filter(l=>l.trim()).map(l=>`<p>${l}</p>`).join('')}</div>
    </div>` : ''}

    <!-- Stream Servers -->
    <div class="detail-section">
      <div class="detail-section-title">🎥 Watch Live</div>
      ${enabledServers.length
        ? enabledServers.map((s, i) => `
          <div class="server-tile" onclick="playStream('${s.url}', '${s.type || 'redirect'}', '${m.homeTeam || m.home}', '${m.awayTeam || m.away}')">
            <div class="server-icon">📺</div>
            <div class="server-info">
              <div class="server-name">Server ${i + 1}${s.label ? ' — ' + s.label : ''}</div>
              <div class="server-type">${s.type === 'm3u8' ? 'HD Live Stream' : s.type === 'iframe' ? 'Embedded Player' : 'Live Stream'}</div>
            </div>
            <div class="play-icon">▶</div>
          </div>`)
          .join('')
        : `<div class="empty-state">No streams available yet. Check back soon!</div>`}
    </div>

    <!-- Video Player Area (hidden until stream selected) -->
    <div id="video-zone" class="detail-section" style="display:none">
      <div class="detail-section-title" id="video-title">Now Playing</div>
      <div class="video-container" id="video-container"></div>
    </div>

    <!-- League Table -->
    ${!isCricket && appSettings.tablesEnabled !== false && (allLeagues.find(l => l.id === m.leagueId)?.embedCode) ? `
    <div class="detail-section">
      <div class="detail-section-title">📊 League Table</div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:15px;overflow:hidden" id="match-embed-container">
      </div>
    </div>` : ''}

    <div style="height:30px"></div>
  `;

  const embedCode = allLeagues.find(l => l.id === m.leagueId)?.embedCode;
  if (!isCricket && appSettings.tablesEnabled !== false && embedCode) {
    injectHTMLSafe('match-embed-container', embedCode);
  }
}

/* ────────────────────────────────────────────────────
   STREAM PLAYER
──────────────────────────────────────────────────── */
function playStream(url, type, home, away) {
  const zone = document.getElementById('video-zone');
  const container = document.getElementById('video-container');
  const titleEl = document.getElementById('video-title');

  if (!zone || !container) return;

  // Scroll to the video zone
  zone.style.display = 'block';
  if (titleEl) titleEl.textContent = `▶ ${home} vs ${away}`;

  // Clean up previous player
  container.innerHTML = '';

  if (type === 'redirect') {
    window.open(url, '_blank');
    zone.style.display = 'none';
    return;
  }

  if (type === 'iframe') {
    container.style.aspectRatio = '16/9';
    container.innerHTML = `<iframe src="${url}" allowfullscreen allow="autoplay; fullscreen" style="width:100%;height:100%;border:none"></iframe>`;
  } else if (type === 'html') {
    container.style.aspectRatio = '16/9';
    container.innerHTML = url;
  } else if (type === 'm3u8') {
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.style.width = '100%';
    video.style.borderRadius = '12px';
    container.appendChild(video);

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    }
  }

  zone.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ────────────────────────────────────────────────────
   ARTICLE SCREEN
──────────────────────────────────────────────────── */
function renderArticle(id) {
  const el = document.getElementById('screen-article');
  if (!el) return;

  const n = allNews.find(x => x.id === id);
  if (!n) {
    el.innerHTML = '<div class="empty-state" style="margin-top:80px">Loading article...</div>';
    db.collection('news').doc(id).get().then(doc => {
      if (doc.exists) {
        const article = { id: doc.id, ...doc.data() };
        allNews.push(article);
        renderArticle(id);
      } else {
        el.innerHTML = '<div class="empty-state" style="margin-top:80px">Article not found.</div>';
      }
    });
    return;
  }

  // If external article, redirect
  if (n.articleType === 'external' && n.articleUrl) {
    window.open(n.articleUrl, '_blank');
    history.back();
    return;
  }

  const pubDate = n.publishedAt?.toDate
    ? n.publishedAt.toDate().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
    : '';

  // Format content: split by newlines, wrap paragraphs
  const formattedContent = (n.content || '')
    .split('\n')
    .reduce((acc, line) => {
      if (!line.trim()) return acc + '</p><p class="article-para">';
      return acc + line + ' ';
    }, '<p class="article-para">')
    + '</p>';

  el.innerHTML = `
    <div class="article-hero" style="background:${n.gradient || 'linear-gradient(135deg,#0d1f4a,#05080f)'}">
      <div class="article-hero-emoji">${n.emoji || '📰'}</div>
      <div class="article-hero-cat">${n.category || 'News'}</div>
    </div>
    <div class="article-body">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
        <h1 class="article-title" style="flex:1;">${n.title}</h1>
        <button class="share-btn-alt" onclick="shareContent('${n.title.replace(/'/g, "\\'")}', '#/article/${n.id}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </button>
      </div>
      ${pubDate ? `<div class="article-meta">📅 ${pubDate}</div>` : ''}
      <div class="article-divider"></div>
      ${n.thumbnailUrl ? `<img src="${n.thumbnailUrl}" class="article-thumbnail" alt="${n.title}">` : ''}
      <div class="article-content">
        ${formattedContent}
      </div>
    </div>
    <div style="height:40px"></div>
  `;

  // Update header title
  const headerTitle = document.getElementById('header-title');
  if (headerTitle) headerTitle.textContent = n.category || 'Article';
}

/* ────────────────────────────────────────────────────
   CARD COMPONENTS
──────────────────────────────────────────────────── */
function matchCard(m) {
  const isCricket = m.sport === 'cricket';
  const isLive = m.status === 'live' || m.status === 'ht';

  const scoreOrTime = isCricket
    ? `<div class="mc-cricket-score">${m.homeCricketScore || '0/0'} vs ${m.awayCricketScore || '0/0'}</div>`
    : m.status === 'upcoming'
      ? `<div class="mc-time">${formatTime(m.kickoffIST)}</div>`
      : `<div class="mc-score">${m.homeScore ?? 0} – ${m.awayScore ?? 0}</div>`;

  const statusLabel = m.status === 'live'
    ? `<div class="mc-status live">🔴 LIVE ${m.minute || ''}</div>`
    : m.status === 'ht'
    ? `<div class="mc-status ht">⏸ HT</div>`
    : m.status === 'finished'
    ? `<div class="mc-status ft">FT</div>`
    : `<div class="mc-status upcoming">${m.kickoffDate || ''}</div>`;

  return `
    <a class="match-card ${isLive ? 'is-live' : ''}" href="#/match/${m.id}">
      <div class="mc-team left-team">
        <div class="mc-crest-wrap">
          <img src="${m.homeLogo}" class="mc-crest-img" alt="${m.homeTeam||m.home}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <span class="mc-crest-fallback" style="display:none">${(m.home||'?')[0]}</span>
        </div>
        <div class="mc-name">${m.homeTeam || m.home}</div>
      </div>
      <div class="mc-center">
        ${scoreOrTime}
        ${statusLabel}
      </div>
      <div class="mc-team right-team">
        <div class="mc-crest-wrap">
          <img src="${m.awayLogo}" class="mc-crest-img" alt="${m.awayTeam||m.away}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <span class="mc-crest-fallback" style="display:none">${(m.away||'?')[0]}</span>
        </div>
        <div class="mc-name">${m.awayTeam || m.away}</div>
      </div>
    </a>
  `;
}

function newsCardSm(n) {
  const isInternal = n.articleType === 'internal' || (n.content && n.content.trim());
  const href = isInternal ? `#/article/${n.id}` : (n.articleUrl || '#');
  const target = isInternal ? '' : 'target="_blank"';

  const imgContent = n.thumbnailUrl
    ? `<img src="${n.thumbnailUrl}" class="news-thumb-img" alt="${n.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      + `<div class="news-thumb-emoji" style="display:none">${n.emoji || '📰'}</div>`
    : `<div class="news-thumb-emoji">${n.emoji || '📰'}</div>`;

  return `
    <a class="news-card-sm" href="${href}" ${target}>
      <div class="news-img-sm" style="background:${n.gradient || '#0d1428'}">
        ${imgContent}
        <div class="news-cat-badge">${n.category || 'News'}</div>
      </div>
      <div class="news-card-body">
        <h3 class="news-card-title">${n.title}</h3>
        <div class="news-card-meta">${n.publishedAt?.toDate ? n.publishedAt.toDate().toLocaleDateString('en-IN') : ''}</div>
      </div>
    </a>
  `;
}


function newsCardFull(n) {
  const isInternal = n.articleType === 'internal' || (n.content && n.content.trim());
  const href = isInternal ? `#/article/${n.id}` : (n.articleUrl || '#');
  const target = isInternal ? '' : 'target="_blank"';

  return `
    <a class="news-card-full" href="${href}" ${target}>
      <div class="ncf-img" style="background:${n.gradient || '#1a1a2e'}">
        <span style="font-size:44px">${n.emoji || '📰'}</span>
        ${isInternal ? '<div class="ncf-internal-badge">Full Article</div>' : ''}
      </div>
      <div class="ncf-body">
        <div class="ncf-cat">${n.category || 'News'}</div>
        <h3 class="ncf-title">${n.title}</h3>
        <div class="ncf-meta">${n.publishedAt?.toDate ? n.publishedAt.toDate().toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : ''}</div>
      </div>
      <div class="ncf-arrow">›</div>
    </a>
  `;
}

/* ────────────────────────────────────────────────────
   UTILS
──────────────────────────────────────────────────── */
function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  let hh = parseInt(h);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${hh}:${m} ${ampm}`;
}

/* ────────────────────────────────────────────────────
   BOOTSTRAP
──────────────────────────────────────────────────── */
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', () => {
  initApp();
  route();
});

/* ────────────────────────────────────────────────────
   SHARE API
──────────────────────────────────────────────────── */
async function shareContent(title, path) {
  const url = window.location.origin + window.location.pathname + path;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: title,
        text: 'Check this out on ZetaSports!',
        url: url
      });
    } catch (err) {
      console.log('Error sharing:', err);
    }
  } else {
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      const toast = document.createElement('div');
      toast.className = 'toast show';
      toast.textContent = 'Link copied to clipboard!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }
}

// Utility to inject HTML strings that contain <script> tags
function injectHTMLSafe(containerId, htmlString) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = ''; // Clear container
  const fragment = document.createRange().createContextualFragment(htmlString);
  container.appendChild(fragment);
}
