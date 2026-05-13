/* GoalStream — app.js  Part 1: Data, Firebase, Navigation */

const LEAGUES = {
  EPL:        { name:'Premier League',       emoji:'⚽', country:'England',  color:'#3d195b' },
  UCL:        { name:'Champions League',     emoji:'⭐', country:'Europe',   color:'#003399' },
  LALIGA:     { name:'La Liga',              emoji:'🌞', country:'Spain',    color:'#ee8200' },
  BUNDESLIGA: { name:'Bundesliga',           emoji:'🦅', country:'Germany',  color:'#d20515' },
  SERIEA:     { name:'Serie A',              emoji:'🏟️', country:'Italy',    color:'#024594' },
  ISL:        { name:'Indian Super League',  emoji:'🏆', country:'India',    color:'#f58220' },
};

const TEAMS = {
  ARS:{ name:'Arsenal',      emoji:'🔴', bg:'#EF0107' },
  MCI:{ name:'Man City',     emoji:'🔵', bg:'#6CABDD' },
  LIV:{ name:'Liverpool',    emoji:'❤️',  bg:'#C8102E' },
  CHE:{ name:'Chelsea',      emoji:'💙', bg:'#034694' },
  MUN:{ name:'Man United',   emoji:'🔴', bg:'#DA020A' },
  TOT:{ name:'Tottenham',    emoji:'⚪', bg:'#132257' },
  RMA:{ name:'Real Madrid',  emoji:'⚽', bg:'#FEBE10' },
  BAY:{ name:'Bayern Munich',emoji:'🔴', bg:'#DC052D' },
  PSG:{ name:'PSG',          emoji:'🔵', bg:'#004170' },
  DOR:{ name:'Dortmund',     emoji:'🟡', bg:'#FDE100' },
  BAR:{ name:'Barcelona',    emoji:'🔵', bg:'#A50044' },
  ATM:{ name:'Atletico',     emoji:'🔴', bg:'#CE3524' },
  JUV:{ name:'Juventus',     emoji:'⚫', bg:'#1a1a1a' },
  INT:{ name:'Inter Milan',  emoji:'⚫', bg:'#010E80' },
  MUM:{ name:'Mumbai City',  emoji:'🟠', bg:'#F58220' },
  BEN:{ name:'Bengaluru FC', emoji:'🔵', bg:'#1B4F9D' },
  LEV:{ name:'Leverkusen',   emoji:'🔴', bg:'#E32219' },
  STU:{ name:'Stuttgart',    emoji:'🔴', bg:'#CC0000' },
};

const MOCK_MATCHES = [
  { id:'m1', home:'ARS', away:'MCI', homeScore:2, awayScore:1, status:'live',     minute:"67'", kickoffIST:'13:00', kickoffDate:'2026-05-12', leagueId:'EPL',        featured:true,  servers:[{label:'Server 1',url:'https://goalstream.live/s1'},{label:'Server 2',url:'https://goalstream.live/s2'},{label:'Server 3',url:'https://goalstream.live/s3'}] },
  { id:'m2', home:'RMA', away:'BAY', homeScore:1, awayScore:0, status:'ht',       minute:'HT',  kickoffIST:'13:30', kickoffDate:'2026-05-12', leagueId:'UCL',        featured:false, servers:[{label:'Server 1',url:'https://goalstream.live/s1'},{label:'Server 2',url:'https://goalstream.live/s2'}] },
  { id:'m3', home:'ATM', away:'BAR', homeScore:0, awayScore:1, status:'live',     minute:"55'", kickoffIST:'14:00', kickoffDate:'2026-05-12', leagueId:'LALIGA',     featured:false, servers:[{label:'Server 1',url:'https://goalstream.live/s1'},{label:'Server 2',url:'https://goalstream.live/s2'},{label:'Server 3',url:'https://goalstream.live/s3'}] },
  { id:'m4', home:'LIV', away:'CHE', homeScore:null, awayScore:null, status:'upcoming', kickoffIST:'18:30', kickoffDate:'2026-05-12', leagueId:'EPL',  featured:false, servers:[{label:'Server 1',url:'https://goalstream.live/s1'}] },
  { id:'m5', home:'PSG', away:'DOR', homeScore:null, awayScore:null, status:'upcoming', kickoffIST:'22:30', kickoffDate:'2026-05-12', leagueId:'UCL',  featured:false, servers:[{label:'Server 1',url:'https://goalstream.live/s1'},{label:'Server 2',url:'https://goalstream.live/s2'}] },
  { id:'m6', home:'JUV', away:'INT', homeScore:null, awayScore:null, status:'upcoming', kickoffIST:'21:00', kickoffDate:'2026-05-12', leagueId:'SERIEA',featured:false, servers:[{label:'Server 1',url:'https://goalstream.live/s1'},{label:'Server 2',url:'https://goalstream.live/s2'},{label:'Server 3',url:'https://goalstream.live/s3'}] },
  { id:'m7', home:'MUM', away:'BEN', homeScore:null, awayScore:null, status:'upcoming', kickoffIST:'20:00', kickoffDate:'2026-05-12', leagueId:'ISL',  featured:false, servers:[{label:'Server 1',url:'https://goalstream.live/s1'}] },
  { id:'m8', home:'MUN', away:'TOT', homeScore:1, awayScore:2, status:'finished', kickoffIST:'11:00', kickoffDate:'2026-05-12', leagueId:'EPL',        featured:false, servers:[] },
  { id:'m9', home:'LEV', away:'STU', homeScore:3, awayScore:1, status:'finished', kickoffIST:'10:30', kickoffDate:'2026-05-12', leagueId:'BUNDESLIGA', featured:false, servers:[] },
];

const MOCK_NEWS = [
  { id:'n1', title:'Arsenal edge Man City in a Premier League thriller at the Emirates', category:'Match Report',      emoji:'⚽', gradient:'linear-gradient(135deg,#1a0a2e,#3d195b)', articleUrl:'https://www.bbc.com/sport/football', publishedAt:'2h ago' },
  { id:'n2', title:'Real Madrid advance to UCL Semi-Finals after Mbappe opener',         category:'Champions League',    emoji:'⭐', gradient:'linear-gradient(135deg,#0a1a3e,#003399)', articleUrl:'https://www.uefa.com',               publishedAt:'3h ago' },
  { id:'n3', title:"Barcelona's Lamine Yamal breaks La Liga scoring record at 18",       category:'Feature',             emoji:'🌟', gradient:'linear-gradient(135deg,#2e0a10,#a50044)', articleUrl:'https://www.espn.com',               publishedAt:'5h ago' },
  { id:'n4', title:'ISL 2025-26: Mumbai City crowned champions for the third time',      category:'Indian Football',     emoji:'🇮🇳', gradient:'linear-gradient(135deg,#1a0e00,#f58220)', articleUrl:'https://the-aiff.com',              publishedAt:'1d ago' },
  { id:'n5', title:"Premier League Golden Boot race: Salah leads with 27 goals",         category:'Analysis',            emoji:'👟', gradient:'linear-gradient(135deg,#0a1a0a,#2d5a1b)', articleUrl:'https://www.premierleague.com',      publishedAt:'1d ago' },
  { id:'n6', title:'UEFA announces expanded Champions League format for 2027-28 season', category:'News',                emoji:'📢', gradient:'linear-gradient(135deg,#0a0a1a,#1a1a4a)', articleUrl:'https://www.uefa.com',               publishedAt:'2d ago' },
];

/* ── State ─────────────────────────────────────────────────── */
const S = {
  screen: 'home',
  prevScreen: null,
  filter: 'all',
  leagueFilter: null,
  matchId: null,
  homeDateFilter: 'today',
  matches: [...MOCK_MATCHES],
  news: [...MOCK_NEWS],
  standings: {},
  standingLeague: 'PL',
};

/* ── Helpers ────────────────────────────────────────────────── */
const getMatch  = id  => S.matches.find(m => m.id === id);
const getTeam   = code => TEAMS[code]  || { name:code, emoji:'⚽', bg:'#333' };
const getLeague = id   => LEAGUES[id]  || { name:id, emoji:'🌐', country:'', color:'#555' };

function getDisplayName(fullName, shortName) {
  if (fullName.length > 11) return shortName || teamInitials(fullName);
  return fullName;
}

function teamInitials(name) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 3);
}

function formatLocalTime(dateStr, timeStr) {
  if(!dateStr || !timeStr) return timeStr || 'TBD';
  try {
    // Treat the input as IST (+05:30)
    const dt = new Date(`${dateStr}T${timeStr}:00+05:30`);
    // This automatically converts to the user's local device time
    return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch(e) {
    return timeStr;
  }
}

function formatDate(val) {
  if (!val) return '';
  // Handle Firestore Timestamp
  if (val.seconds) {
    return new Date(val.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return val;
}

function formatTime12(time24) {
  if(!time24) return '';
  const p = time24.split(':');
  if(p.length < 2) return time24;
  let h = parseInt(p[0]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${p[1]} ${ampm}`;
}

function crest(code, size=38, logoUrl=null) {
  const t   = getTeam(code);
  const ini = teamInitials(t.name);
  const fs  = Math.round(size * .3);
  const fallbackCss = `width:${size}px;height:${size}px;font-size:${fs}px;background:${t.bg}22;border-color:${t.bg}44;color:var(--text1);font-weight:800;letter-spacing:.5px;flex-shrink:0`;
  if (logoUrl) {
    return `<div class="mc-crest mc-crest-logo" style="width:${size}px;height:${size}px;flex-shrink:0;background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1)">
      <img src="${logoUrl}" alt="${t.name}" class="crest-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <span class="crest-init" style="${fallbackCss};display:none">${ini}</span>
    </div>`;
  }
  return `<div class="mc-crest" style="${fallbackCss}">${ini}</div>`;
}

function statusBadge(m) {
  if (m.status==='live')     return `<span class="mc-status live">🔴 ${m.minute}</span>`;
  if (m.status==='ht')       return `<span class="mc-status ht">⏸ HT</span>`;
  if (m.status==='finished') return `<span class="mc-status ft">FT</span>`;
  return `<span class="mc-status upcoming">${formatTime12(m.kickoffIST)}</span>`;
}

function scoreCenter(m) {
  if (m.status==='upcoming') return `<div class="mc-vs">VS</div><div class="mc-time">${formatTime12(m.kickoffIST)}</div>`;
  return `<div class="mc-score">${m.homeScore ?? '-'}&nbsp;–&nbsp;${m.awayScore ?? '-'}</div>`;
}

function empty(title, sub) {
  return `<div class="empty"><div class="empty-icon">🏟️</div><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div></div>`;
}

/* ── Firebase ───────────────────────────────────────────────── */
let db = null;

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') return;
    if (!FIREBASE_CONFIG || FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
      console.info('[ZETASPORTS] Demo mode — configure firebase-config.js to connect Firestore.');
      return;
    }
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    db.collection('matches').onSnapshot(snap => {
      if (snap.docs.length > 0) {
        S.matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        refresh();
      } else {
        console.info('[ZETASPORTS] Firestore matches empty — keeping mock data.');
      }
    }, err => console.warn('[ZETASPORTS] Matches listener error:', err));
    
    db.collection('standings').onSnapshot(snap => {
      snap.docs.forEach(d => { S.standings[d.id] = d.data(); });
      if(S.screen === 'standings') showStandings();
    });

    db.collection('news').orderBy('publishedAt', 'desc').onSnapshot(snap => {
      if (snap.docs.length > 0) {
        S.news = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (S.screen === 'news') showNews();
      } else {
        console.info('[ZETASPORTS] Firestore news empty — keeping mock data.');
      }
    }, err => console.warn('[ZETASPORTS] News listener error:', err));
    
    db.collection('settings').doc('app_config').onSnapshot(doc => {
      if (doc.exists) {
        S.config = doc.data();
        updateWebBranding();
        refresh();
      }
    });

    setupFCM();
  } catch (e) { console.warn('[ZETASPORTS] Firebase error — running on mock data.', e); }
}

function updateHeader(liveCount) {
  const countEl = document.getElementById('live-count-val');
  const pillEl  = document.getElementById('live-pill');
  if (countEl) countEl.textContent = liveCount || 0;
  if (pillEl) {
    pillEl.style.opacity = liveCount > 0 ? '1' : '0';
    pillEl.style.pointerEvents = liveCount > 0 ? 'auto' : 'none';
  }
}

function updateWebBranding() {
  const c = S.config;
  if (!c) return;
  const logoContainer = document.getElementById('header-logo');
  if (logoContainer) {
    if (c.logoUrl) {
      logoContainer.innerHTML = `<img src="${c.logoUrl}" style="height:32px;object-fit:contain">`;
    } else {
      logoContainer.innerHTML = `<div class="logo-box">ZS</div><span class="logo-text">ZETA<span class="logo-accent">SPORTS</span></span>`;
    }
  }
  if (c.primaryColor) {
    document.documentElement.style.setProperty('--accent', c.primaryColor);
  }
}

function setupFCM() {
  // Show permission prompt after 4s if not yet asked
  if (!localStorage.getItem('zs_notif_asked')) {
    setTimeout(showNotifPrompt, 4000);
  } else if (localStorage.getItem('zs_notif_asked') === 'granted') {
    registerFCMToken();
  }
}

function showNotifPrompt() {
  if (!('Notification' in window) || Notification.permission !== 'default') return;
  const el = document.createElement('div');
  el.id = 'notif-prompt';
  el.innerHTML = `
    <div class="np-icon">🔔</div>
    <div class="np-title">Stay Updated on Every Match!</div>
    <div class="np-sub">Get instant alerts for goals, kick-offs and live match updates — right on your device.</div>
    <div class="np-btns">
      <button class="np-allow" onclick="allowNotifications()">⚡ Allow Notifications</button>
      <button class="np-later" onclick="dismissNotifPrompt()">Later</button>
    </div>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 80);
}

function dismissNotifPrompt() {
  localStorage.setItem('zs_notif_asked', 'dismissed');
  const el = document.getElementById('notif-prompt');
  if (el) { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }
}

async function allowNotifications() {
  dismissNotifPrompt();
  const permission = await Notification.requestPermission();
  localStorage.setItem('zs_notif_asked', permission);
  if (permission === 'granted') registerFCMToken();
}

async function registerFCMToken() {
  try {
    if (!FIREBASE_CONFIG.vapidKey || FIREBASE_CONFIG.vapidKey === 'YOUR_VAPID_PUBLIC_KEY') return;
    const reg = await navigator.serviceWorker?.register('./sw.js');
    const token = await firebase.messaging().getToken({
      vapidKey: FIREBASE_CONFIG.vapidKey,
      serviceWorkerRegistration: reg
    });
    if (token && db) {
      await db.collection('fcm_tokens').doc(token).set({
        token, platform: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
        subscribedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.info('[ZETASPORTS] FCM token saved');
    }
  } catch (e) { console.warn('[ZETASPORTS] FCM token error:', e); }
}

function refresh() {
  const liveCount = S.matches.filter(m => m.status==='live' || m.status==='ht').length;
  updateHeader(liveCount);

  if (S.screen === 'home')      showHome();
  if (S.screen === 'matches')   showMatches();
  if (S.screen === 'standings') showStandings();
}

/* ── Navigation ─────────────────────────────────────────────── */
function setupNav() {
  document.querySelectorAll('.nav-item[data-screen]').forEach(b =>
    b.addEventListener('click', () => go(b.dataset.screen))
  );
  document.getElementById('back-btn').addEventListener('click', () => go(S.prevScreen || 'home'));
}

function go(screen, params = {}) {
  const isDetail = screen === 'detail';
  if (isDetail) { S.prevScreen = S.screen; S.matchId = params.id; }
  else S.screen = screen;

  // Page transition loader
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.className = 'loading';
    setTimeout(() => { loader.className = 'done'; setTimeout(() => loader.className='', 400); }, 350);
  }

  // Clear any active countdown
  if (window._countdownInterval) { clearInterval(window._countdownInterval); window._countdownInterval = null; }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${screen}`).classList.add('active');

  const backBtn  = document.getElementById('back-btn');
  const logo     = document.getElementById('header-logo');
  const titleEl  = document.getElementById('header-title');
  const nav      = document.getElementById('bottom-nav');

  backBtn.classList.toggle('hidden', !isDetail);
  logo.classList.toggle('hidden', isDetail);
  titleEl.classList.toggle('hidden', !isDetail);
  nav.classList.toggle('hidden', isDetail);

  if (isDetail) {
    const m = getMatch(params.id);
    titleEl.textContent = m ? `${getTeam(m.home).name} vs ${getTeam(m.away).name}` : 'Match';
  }

  document.querySelectorAll('.nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.screen === screen)
  );

  window.scrollTo(0, 0);

  if (screen === 'home')    showHome();
  else if (screen === 'matches') showMatches();
  else if (screen === 'detail')  showDetail(params.id);
  else if (screen === 'news')    showNews();
  else if (screen === 'standings') showStandings();
  else if (screen === 'leagues') showLeagues();
}

/* ── HOME ───────────────────────────────────────────────────── */
function setHomeDateFilter(val) {
  S.homeDateFilter = val;
  showHome();
}

function showHome() {
  const live = S.matches.filter(m => m.status==='live' || m.status==='ht');
  const trending = S.matches.filter(m => m.featured);
  
  const today = new Date();
  let targetDateStr = '';
  if(S.homeDateFilter === 'today') {
    targetDateStr = today.toISOString().split('T')[0];
  } else if (S.homeDateFilter === 'tomorrow') {
    const tmr = new Date(); tmr.setDate(today.getDate() + 1);
    targetDateStr = tmr.toISOString().split('T')[0];
  } else if (S.homeDateFilter === 'yesterday') {
    const yest = new Date(); yest.setDate(today.getDate() - 1);
    targetDateStr = yest.toISOString().split('T')[0];
  }

  const dateMatches = S.matches.filter(m => m.kickoffDate === targetDateStr);
  
  const dateChipsHtml = `
    <div class="date-filter">
      <button onclick="setHomeDateFilter('yesterday')" class="date-chip ${S.homeDateFilter==='yesterday'?'active':''}">Yesterday</button>
      <button onclick="setHomeDateFilter('today')" class="date-chip ${S.homeDateFilter==='today'?'active':''}">Today</button>
      <button onclick="setHomeDateFilter('tomorrow')" class="date-chip ${S.homeDateFilter==='tomorrow'?'active':''}">Tomorrow</button>
    </div>
  `;

  const byLeague = {};
  dateMatches.forEach(m => { 
    if(!byLeague[m.leagueId]) byLeague[m.leagueId]=[]; 
    byLeague[m.leagueId].push(m); 
  });

  document.getElementById('screen-home').innerHTML = `
    <!-- Trending Section -->
    ${trending.length ? `
      <div class="trending-container">
        <div class="section-header"><i class="bolt">⚡</i><h2>Trending Matches</h2></div>
        <div class="trending-scroll">
          ${trending.map(m => trendingBanner(m)).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Live Matches -->
    ${live.length ? `
      <div class="section-header"><i class="dot" style="color:var(--red)">●</i><h2>Live Now</h2></div>
      <div class="live-list">
        ${live.map(m => matchCard(m)).join('')}
      </div>
    ` : ''}

    ${dateChipsHtml}

    <div class="league-list-wrap">
      ${Object.entries(byLeague).map(([lid, ms]) => `
        <div class="league-section">
          <div class="league-header">
            <span class="l-emoji">${getLeague(lid).emoji}</span>
            <h3>${(getLeague(lid).name || lid).toUpperCase()}</h3>
          </div>
          ${ms.map(m => matchCard(m)).join('')}
        </div>
      `).join('')}
      ${!dateMatches.length ? empty('No Matches','No matches for this date.') : ''}
    </div>

    <div class="section-header" style="margin-top:16px;"><h2>Latest News</h2></div>
    <div class="news-row">${S.news.slice(0,5).map(newsCardSm).join('')}</div>
    
    ${communityBanner()}

    <div style="height:12px"></div>
  `;
}

function communityBanner() {
  const c = S.config;
  if (!c || (!c.whatsappUrl && !c.telegramUrl)) return '';
  return `
    <div class="community-banner">
      <div class="cb-title">📢 Join our official Community</div>
      <div class="cb-sub">Get daily match updates and VIP tips directly on your phone!</div>
      <div class="cb-btns">
        ${c.whatsappUrl ? `<a href="${c.whatsappUrl}" target="_blank" class="cb-btn wa">Join WhatsApp</a>` : ''}
        ${c.telegramUrl ? `<a href="${c.telegramUrl}" target="_blank" class="cb-btn tg">Join Telegram</a>` : ''}
      </div>
    </div>
  `;
}

function featuredBanner(m) {
  const h=getTeam(m.home), a=getTeam(m.away), l=getLeague(m.leagueId);
  const localTime = formatLocalTime(m.kickoffDate, m.kickoffIST);
  const scoreHtml = m.status==='upcoming'
    ? `<div style="font-size:20px;font-weight:700;color:var(--accent);font-family:'Rajdhani',sans-serif">${localTime}</div>`
    : `<div class="banner-score">${m.homeScore}<span class="banner-score-sep">–</span>${m.awayScore}</div>`;
  const badge = m.status==='live' ? `<span class="banner-live-dot"></span>🔴 ${m.minute}` : m.status==='ht' ? '⏸ HALF TIME' : 'UPCOMING';
  return `
  <div class="featured-banner" onclick="go('detail',{id:'${m.id}'})">
    <div class="banner-glow"></div>
    <div class="banner-top">
      <div class="banner-league"><span class="banner-league-dot"></span>${l.emoji} ${l.name}</div>
      <div class="banner-live-badge">${badge}</div>
    </div>
    <div class="banner-body">
      <div class="banner-team left">${crest(m.home,58,m.homeLogo)}<div class="banner-team-name">${h.name}</div></div>
      <div class="banner-center">${scoreHtml}${m.status!=='upcoming'?`<div class="banner-minute">${m.status==='ht'?'Half Time':m.minute}</div>`:''}</div>
      <div class="banner-team right">${crest(m.away,58,m.awayLogo)}<div class="banner-team-name">${a.name}</div></div>
    </div>
    <div class="banner-footer">
      <span class="banner-info">📍 ${m.kickoffDate} · ${localTime}</span>
      <div class="banner-watch-btn">▶ Watch Now</div>
    </div>
  </div>`;
}

function liveCard(m) {
  const h=getTeam(m.home), a=getTeam(m.away), l=getLeague(m.leagueId);
  return `<div class="live-mini-card" onclick="go('detail',{id:'${m.id}'})">
    <div class="lmc-badge"><span class="live-dot-sm"></span>&nbsp;${m.status==='ht'?'HT':m.minute}</div>
    <div class="lmc-teams">${h.name} vs ${a.name}</div>
    <div class="lmc-score">${m.homeScore} – ${m.awayScore}</div>
    <div class="lmc-league">${l.emoji} ${l.name}</div>
  </div>`;
}

function upcomingItem(m) {
  const h=getTeam(m.home), a=getTeam(m.away), l=getLeague(m.leagueId);
  return `<div class="upcoming-item" onclick="go('detail',{id:'${m.id}'})">
    <div class="ui-league-badge" style="background:${l.color}22">${l.emoji}</div>
    <div class="ui-teams">
      <div class="ui-matchup">${h.name} <span style="color:var(--text3)">vs</span> ${a.name}</div>
      <div class="ui-league">${l.name}</div>
    </div>
    <div><div class="ui-time">${formatLocalTime(m.kickoffDate, m.kickoffIST)}</div><div class="ui-date">Local Time</div></div>
  </div>`;
}

function newsCardSm(n) {
  const action = n.articleType==='internal' ? `showArticle('${n.id}')` : `window.open('${n.articleUrl}','_blank')`;
  const thumb = n.thumbnailUrl ? `<img src="${n.thumbnailUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">` : `<span>${n.emoji||'⚽'}</span>`;
  return `<div class="news-card-sm" onclick="${action}">
    <div class="news-img-sm" style="background:${n.gradient||'linear-gradient(135deg,#0a2a0a,#051a05)'}">
      ${thumb}
      <span class="news-cat-badge">${n.category}</span>
    </div>
    <div class="news-card-body">
      <div class="news-card-title">${n.title}</div>
      <div class="news-card-meta">${formatDate(n.publishedAt)}</div>
    </div>
  </div>`;
}

/* ── MATCH LIST ─────────────────────────────────────────────── */
function showMatches() {
  const tabs = ['all','live','upcoming','finished'];
  let matches = S.leagueFilter ? S.matches.filter(m => m.leagueId===S.leagueFilter) : S.matches;
  const filtered = S.filter==='all' ? matches : matches.filter(m =>
    S.filter==='live' ? (m.status==='live'||m.status==='ht') : m.status===S.filter
  );
  const byLeague = {};
  filtered.forEach(m => { if(!byLeague[m.leagueId]) byLeague[m.leagueId]=[]; byLeague[m.leagueId].push(m); });
  document.getElementById('screen-matches').innerHTML = `
    <div class="match-tabs">
      ${tabs.map(t=>`<button class="match-tab${S.filter===t?' active':''}" onclick="setFilter('${t}')">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}
    </div>
    <div class="match-list-body">
      ${S.leagueFilter ? `<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;font-size:12px;color:var(--accent)">${getLeague(S.leagueFilter).emoji} <b>${getLeague(S.leagueFilter).name}</b><button onclick="clearLeagueFilter()" style="margin-left:auto;color:var(--text3);font-size:11px;background:var(--bg3);padding:3px 10px;border-radius:20px;border:1px solid var(--border)">Clear ✕</button></div>` : ''}
      ${Object.entries(byLeague).map(([lid,ms])=>leagueGroup(lid,ms)).join('')}
      ${!filtered.length ? empty('No Matches','No matches for this filter.') : ''}
    </div>
  `;
}

function leagueGroup(lid, ms) {
  const l=getLeague(lid);
  const lc=ms.filter(m=>m.status==='live'||m.status==='ht').length;
  return `<div class="league-group">
    <div class="league-group-header"><span class="lgh-emoji">${l.emoji}</span>${l.name}${lc?`<span class="lgh-live-pill"><span class="live-dot-sm"></span>&nbsp;${lc} LIVE</span>`:''}
    </div>
    ${ms.map(matchCard).join('')}
  </div>`;
}

function trendingBanner(m) {
  const isLive = m.status === 'live';
  return `
    <div class="trending-banner" onclick="go('detail',{id:'${m.id}'})">
      <div class="tb-overlay"></div>
      <div class="tb-content">
        <div class="tb-top">
          <span class="tb-league">${(getLeague(m.leagueId).name || m.leagueId || '').toUpperCase()}</span>
          ${isLive ? `<span class="tb-live">● ${m.minute}</span>` : `<span class="tb-upcoming">UPCOMING</span>`}
        </div>
        <div class="tb-main">
          <div class="tb-team">
            <div class="tb-crest-wrap">${crest(m.home, 48, m.homeLogo)}</div>
            <span class="tb-team-name">${getDisplayName(m.homeTeam, m.home)}</span>
          </div>
          <div class="tb-center">
            ${m.status === 'upcoming' ? `<div class="tb-vs">VS</div>` : `<div class="tb-score">${m.homeScore} - ${m.awayScore}</div>`}
            <div class="tb-time">${formatLocalTime(m.kickoffDate, m.kickoffIST)}</div>
          </div>
          <div class="tb-team">
            <div class="tb-crest-wrap">${crest(m.away, 48, m.awayLogo)}</div>
            <span class="tb-team-name">${getDisplayName(m.awayTeam, m.away)}</span>
          </div>
        </div>
        <div class="tb-footer">
          <span class="tb-date">${m.kickoffDate}</span>
          <span class="tb-watch">WATCH NOW →</span>
        </div>
      </div>
    </div>
  `;
}

function matchCard(m, compact=false) {
  const h=getTeam(m.home), a=getTeam(m.away);
  const isLive=m.status==='live'||m.status==='ht';
  const scoreHtml = m.status==='upcoming' ? `<div class="match-time">${formatLocalTime(m.kickoffDate, m.kickoffIST)}</div>` : `<div class="match-score">${m.homeScore ?? '0'} – ${m.awayScore ?? '0'}</div>`;
  const statusHtml = isLive ? `<div class="match-time live">● LIVE ${m.minute}</div>` : m.status==='upcoming' ? '' : `<div class="match-time">FINISHED</div>`;
  
  return `<div class="match-card ${compact?'compact':''}" onclick="go('detail',{id:'${m.id}'}); event.stopPropagation();">
    <div class="match-team home">
      ${crest(m.home, 28, m.homeLogo)}
      <span class="team-name">${getDisplayName(h.name, m.home)}</span>
    </div>
    <div class="match-center">
      ${scoreHtml}
      ${statusHtml}
    </div>
    <div class="match-team away">
      <span class="team-name">${getDisplayName(a.name, m.away)}</span>
      ${crest(m.away, 28, m.awayLogo)}
    </div>
  </div>`;
}

function setFilter(f) { S.filter=f; showMatches(); }
function clearLeagueFilter() { S.leagueFilter=null; showMatches(); }

/* ── MATCH DETAIL ───────────────────────────────────────────── */
function showDetail(id) {
  const m=getMatch(id); if(!m){go('home');return;}
  const h=getTeam(m.home), a=getTeam(m.away), l=getLeague(m.leagueId);
  const localTime = formatLocalTime(m.kickoffDate, m.kickoffIST);
  const statusCls = m.status === 'live' ? 'live' : m.status === 'ht' ? 'ht' : m.status === 'finished' ? 'finished' : 'upcoming';
  const statusTxt = m.status === 'live' ? `🔴 ${m.minute}` : m.status === 'ht' ? '⏸ Half Time' : m.status === 'finished' ? '⏹ Full Time' : `⏰ ${localTime}`;
  const scoreDisp = m.status === 'upcoming' ? `<span style="color:var(--text3)">–</span>&nbsp;:&nbsp;<span style="color:var(--text3)">–</span>` : `${m.homeScore}&nbsp;:&nbsp;${m.awayScore}`;
  // Only show enabled servers (enabled !== false)
  const enabledServers = (m.servers||[]).filter(s => s.enabled !== false);
  document.getElementById('screen-detail').innerHTML = `
    <div class="detail-hero">
      <div class="detail-hero-glow"></div>
      <div class="dh-league">${l.emoji} ${l.name}</div>
      <div class="dh-teams">
        <div class="dh-team">${crest(m.home,64,m.homeLogo)}<div class="dh-name">${h.name}</div></div>
        <div class="dh-score-box"><div class="dh-score">${scoreDisp}</div><div class="dh-status ${statusCls}">${statusTxt}</div></div>
        <div class="dh-team">${crest(m.away,64,m.awayLogo)}<div class="dh-name">${a.name}</div></div>
      </div>
    </div>
    ${m.status==='upcoming' ? `<div class="countdown-bar"><div class="countdown-label">⏱ Kicks off in</div><div class="countdown-timer" id="countdown-el">--:--:--</div></div>` : ''}
    <div class="match-info-grid">
      <div class="mig-item"><div class="mig-label">League</div><div class="mig-value">${l.name}</div></div>
      <div class="mig-item"><div class="mig-label">Date</div><div class="mig-value">${m.kickoffDate||'—'}</div></div>
      <div class="mig-item"><div class="mig-label">Kick-off</div><div class="mig-value">${localTime} (Local)</div></div>
      <div class="mig-item"><div class="mig-label">Status</div><div class="mig-value" style="text-transform:capitalize">${m.status}</div></div>
    </div>
    ${m.preview ? `<div class="psi-preview"><div class="psi-preview-title">📋 Match Preview</div><div class="psi-preview-text">${m.preview}</div></div>` : ''}
    <div class="servers-section">
      <div class="servers-title">📡 Watch Streams</div>
      <div class="servers-grid">
        ${enabledServers.length ? enabledServers.map((s,i)=>serverBtn(s,i,m.id)).join('') : '<div class="no-servers">No streams available for this match.</div>'}
      </div>
    </div>
    ${communityBanner()}
  `;
  // Start countdown if upcoming
  if (m.status === 'upcoming' && m.kickoffDate && m.kickoffIST) {
    startCountdown(m.kickoffDate, m.kickoffIST);
  }
}

function startCountdown(date, timeIST) {
  const el = document.getElementById('countdown-el');
  if (!el) return;
  const kickoff = new Date(`${date}T${timeIST}:00+05:30`).getTime();
  const tick = () => {
    const diff = kickoff - Date.now();
    if (diff <= 0) { el.textContent = '🟢 Starting!'; clearInterval(window._countdownInterval); return; }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  tick();
  window._countdownInterval = setInterval(tick, 1000);
}


function serverBtn(s, i, matchId) {
  const typeIcons = { m3u8:'📺', iframe:'🖥️', html:'💻', redirect:'🔗' };
  const icon = typeIcons[s.type] || ['📺','🖥️','📱','📡'][i] || '📡';
  const typeLabel = { m3u8:'M3U8', iframe:'iFrame', html:'HTML', redirect:'Link' }[s.type] || 'Stream';
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({...s, matchId}))));
  return `<button class="server-btn" onclick="showPlayer('${encoded}')">
    <div class="server-icon">${icon}</div>
    <div class="server-label-wrap">
      <span class="server-label">${s.label||`Server ${i+1}`}</span>
      <span class="server-type-tag">${typeLabel}</span>
    </div>
    <span class="server-arrow">▶</span>
  </button>`;
}

/* ── VIDEO PLAYER (YouTube-style) ───────────────────────────── */
let _hlsInstance = null;
let _currentMatchId = null;
let _currentServers = [];

function showPlayer(encoded) {
  let s;
  try { s = JSON.parse(decodeURIComponent(escape(atob(encoded)))); } catch(e) { return; }

  // Redirect — just open in new tab
  if (!s.type || s.type === 'redirect') { window.open(s.url, '_blank'); return; }

  const old = document.getElementById('player-overlay');
  if (old) old.remove();
  if (_hlsInstance) { _hlsInstance.destroy(); _hlsInstance = null; }

  // Get match data for info panel
  const m = S.matches.find(x => x.id === s.matchId);
  _currentMatchId = s.matchId;
  _currentServers = m?.servers || [];

  const el = document.createElement('div');
  el.id = 'player-overlay';
  el.dataset.m3u8 = s.url || '';
  el.innerHTML = buildPlayerHTML(s, m);
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('open'), 20);
  if (s.type === 'm3u8') setTimeout(() => initHLS(s.url), 200);
}

function buildPlayerHTML(s, m) {
  // ── Video area ──
  let videoContent = '';
  if (s.type === 'm3u8') {
    videoContent = `<div class="player-m3u8-wrap">
      <video id="hls-video" controls autoplay playsinline preload="auto"
        style="width:100%;height:100%;background:#000;display:block"></video>
      <div class="player-loading" id="player-loading">
        <div class="player-spinner"></div>
        <div style="margin-top:10px;font-size:12px;color:#90caf9">Loading stream…</div>
      </div></div>`;
  } else if (s.type === 'iframe') {
    videoContent = `<iframe src="${s.url}" class="player-iframe"
      allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"
      sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`;
  } else if (s.type === 'html') {
    videoContent = `<div class="player-html-wrap">${s.url}</div>`;
  }

  // ── Match info ──
  let matchSection = '';
  if (m) {
    const h = getTeam(m.home), a = getTeam(m.away), l = getLeague(m.leagueId);
    const isLive = m.status==='live'||m.status==='ht';
    const statusColor = m.status==='live'?'var(--red)':m.status==='ht'?'var(--gold)':m.status==='finished'?'var(--text3)':'var(--blue)';
    const statusTxt = m.status==='live'?`🔴 LIVE · ${m.minute}`:m.status==='ht'?'⏸ HALF TIME':m.status==='finished'?'⏹ FULL TIME':`⏰ ${m.kickoffIST} IST`;
    const scoreDisp = m.status==='upcoming' ? 'vs' : `${m.homeScore} : ${m.awayScore}`;
    const homeCrest = m.homeLogo ? `<img src="${m.homeLogo}" class="psi-crest-img" onerror="this.style.display='none'">` : `<div class="psi-crest-init" style="background:var(--accent-dim)">${(m.home||'H').slice(0,3)}</div>`;
    const awayCrest = m.awayLogo ? `<img src="${m.awayLogo}" class="psi-crest-img" onerror="this.style.display='none'">` : `<div class="psi-crest-init" style="background:var(--accent-dim)">${(m.away||'A').slice(0,3)}</div>`;

    // Server tabs
    const serverTabs = _currentServers.filter(sv=>sv.type!=='redirect').map((sv,i)=>{
      const enc = btoa(unescape(encodeURIComponent(JSON.stringify({...sv, matchId:m.id}))));
      const active = sv.url===s.url && sv.label===s.label ? 'active' : '';
      return `<button class="ps-tab ${active}" onclick="switchServer('${enc}')">${sv.label||`S${i+1}`}</button>`;
    }).join('');

    matchSection = `
      <!-- Live Score Section -->
      <div class="psi-score-section">
        <div class="psi-status" style="color:${statusColor}">${statusTxt}</div>
        <div class="psi-teams">
          <div class="psi-team">${homeCrest}<span class="psi-team-name">${h.name}</span></div>
          <div class="psi-scorebox">
            <div class="psi-score">${scoreDisp}</div>
            <div class="psi-league">${l.emoji} ${l.name}</div>
          </div>
          <div class="psi-team right">${awayCrest}<span class="psi-team-name">${a.name}</span></div>
        </div>
      </div>

      <!-- Server Switcher -->
      ${serverTabs ? `<div class="ps-switcher">
        <div class="ps-switcher-label">📡 Switch Stream</div>
        <div class="ps-tabs">${serverTabs}</div>
      </div>` : ''}

      <!-- Match Info Grid -->
      <div class="psi-info-grid">
        <div class="psi-info-item"><div class="psi-info-label">Date</div><div class="psi-info-val">${m.kickoffDate||'—'}</div></div>
        <div class="psi-info-item"><div class="psi-info-label">Kick-off IST</div><div class="psi-info-val">${m.kickoffIST||'TBD'}</div></div>
        <div class="psi-info-item"><div class="psi-info-label">League</div><div class="psi-info-val">${l.name}</div></div>
        <div class="psi-info-item"><div class="psi-info-label">Status</div><div class="psi-info-val" style="color:${statusColor};text-transform:capitalize">${m.status}</div></div>
      </div>`;
  }

  return `
    <div class="player-topbar">
      <button class="player-back-btn" onclick="closePlayer()">← Back</button>
      <div class="player-info">
        <span class="player-server-name">${s.label||'Stream'}</span>
        <span class="player-type-badge">${(s.type||'live').toUpperCase()}</span>
      </div>
      <button class="player-fullscreen-btn" onclick="togglePlayerFullscreen()">⛶</button>
    </div>
    <div class="player-video-area" id="player-viewport">
      ${videoContent}
      ${s.type==='m3u8'?`<div class="player-overlay-btns">
        <button class="pcb-btn" onclick="retryHLS()">🔄 Retry</button>
        <button class="pcb-btn" onclick="togglePlayerFullscreen()">⛶ Fullscreen</button>
      </div>`:''}
    </div>
    <div class="player-scroll-body">${matchSection}</div>`;
}

function switchServer(encoded) {
  let s;
  try { s = JSON.parse(decodeURIComponent(escape(atob(encoded)))); } catch(e) { return; }
  if (_hlsInstance) { _hlsInstance.destroy(); _hlsInstance = null; }
  const vp = document.getElementById('player-viewport');
  const topbar = document.querySelector('.player-info');
  if (topbar) {
    topbar.querySelector('.player-server-name').textContent = s.label||'Stream';
    topbar.querySelector('.player-type-badge').textContent = (s.type||'live').toUpperCase();
  }
  // Update active tab
  document.querySelectorAll('.ps-tab').forEach(t=>t.classList.remove('active'));
  event?.target?.classList.add('active');
  if (!vp) return;
  if (s.type==='m3u8') {
    vp.innerHTML = `<div class="player-m3u8-wrap"><video id="hls-video" controls autoplay playsinline style="width:100%;height:100%;background:#000"></video><div class="player-loading" id="player-loading"><div class="player-spinner"></div><div style="margin-top:10px;font-size:12px;color:#90caf9">Loading…</div></div></div><div class="player-overlay-btns"><button class="pcb-btn" onclick="retryHLS()">🔄 Retry</button><button class="pcb-btn" onclick="togglePlayerFullscreen()">⛶ Fullscreen</button></div>`;
    document.getElementById('player-overlay').dataset.m3u8 = s.url;
    setTimeout(()=>initHLS(s.url),200);
  } else if (s.type==='iframe') {
    vp.innerHTML=`<iframe src="${s.url}" class="player-iframe" allowfullscreen allow="autoplay;encrypted-media"></iframe>`;
  } else if (s.type==='html') {
    vp.innerHTML=`<div class="player-html-wrap">${s.url}</div>`;
  }
}

function initHLS(url) {
  const video = document.getElementById('hls-video');
  const loading = document.getElementById('player-loading');
  if (!video) return;

  const hideLoading = () => { if (loading) loading.style.display = 'none'; };

  if (typeof Hls !== 'undefined' && Hls.isSupported()) {
    _hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: true });
    _hlsInstance.loadSource(url);
    _hlsInstance.attachMedia(video);
    _hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      hideLoading();
      video.play().catch(() => {});
    });
    _hlsInstance.on(Hls.Events.ERROR, (e, data) => {
      if (data.fatal) {
        if (loading) { loading.innerHTML = `<div style="text-align:center;color:#ff6b6b">⚠️ Stream error.<br><button class="pcb-btn" style="margin-top:10px" onclick="retryHLS()">Retry</button></div>`; loading.style.display='flex'; }
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS (Safari/iOS)
    video.src = url;
    video.addEventListener('loadedmetadata', () => { hideLoading(); video.play().catch(() => {}); });
  } else {
    if (loading) loading.innerHTML = `<div style="color:#ff6b6b;text-align:center">⚠️ HLS not supported in this browser</div>`;
  }
}

function retryHLS() {
  const el = document.getElementById('player-overlay');
  const url = el?.dataset.m3u8;
  if (!url) return;
  const loading = document.getElementById('player-loading');
  if (loading) { loading.style.display='flex'; loading.innerHTML=`<div class="player-spinner"></div><div style="margin-top:12px;font-size:13px;color:#90caf9">Retrying…</div>`; }
  if (_hlsInstance) { _hlsInstance.destroy(); _hlsInstance = null; }
  setTimeout(() => initHLS(url), 500);
}

function closePlayer() {
  if (_hlsInstance) { _hlsInstance.destroy(); _hlsInstance = null; }
  const el = document.getElementById('player-overlay');
  if (el) { el.classList.remove('open'); setTimeout(() => el.remove(), 350); }
}

function togglePlayerFullscreen() {
  const vp = document.getElementById('player-viewport');
  if (!vp) return;
  if (!document.fullscreenElement) {
    (vp.requestFullscreen || vp.webkitRequestFullscreen || vp.mozRequestFullScreen).call(vp);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }
}

/* ── NEWS ───────────────────────────────────────────────────── */
function showNews() {
  document.getElementById('screen-news').innerHTML = `
    <div class="section-head" style="padding-top:16px"><span class="section-title">Latest News</span></div>
    <div class="news-grid">${S.news.map(newsFullCard).join('')}</div>
  `;
}

function newsFullCard(n) {
  const action = n.articleType==='internal' ? `showArticle('${n.id}')` : `window.open('${n.articleUrl||'#'}','_blank')`;
  const thumb = n.thumbnailUrl
    ? `<img src="${n.thumbnailUrl}" class="nfc-thumb" onerror="this.style.display='none'">`
    : `<div class="nfc-img" style="background:${n.gradient||'linear-gradient(135deg,#0a2a0a,#051a05)'}"><span>${n.emoji||'⚽'}</span><span class="nfc-cat" style="background:rgba(0,0,0,.75);color:var(--accent);border:1px solid var(--border2)">${n.category}</span></div>`;
  const label = n.articleType==='internal' ? 'Read Article →' : 'Tap to read →';
  return `<div class="news-full-card" onclick="${action}">
    ${thumb}
    ${n.thumbnailUrl?`<div class="nfc-cat-over"><span class="nfc-cat" style="background:rgba(0,0,0,.75);color:var(--accent);border:1px solid var(--border2)">${n.category}</span></div>`:''}
    <div class="nfc-body"><div class="nfc-title">${n.title}</div><div class="nfc-meta">${formatDate(n.publishedAt)} · ${label}</div></div>
  </div>`;
}

/* ── IN-APP ARTICLE READER ── */
function showArticle(id) {
  const n = S.news.find(x=>x.id===id); if(!n) return;
  const paragraphs = (n.content||'').split(/\n\n+/).filter(Boolean)
    .map(p=>`<p class="article-p">${p.replace(/\n/g,'<br>')}</p>`).join('');
  const thumb = n.thumbnailUrl
    ? `<img src="${n.thumbnailUrl}" class="article-thumb" onerror="this.style.display='none'">`
    : `<div class="article-hero-grad" style="background:${n.gradient||'linear-gradient(135deg,#0a2a0a,#051a05)'}"><span style="font-size:48px">${n.emoji||'⚽'}</span></div>`;
  const el = document.createElement('div');
  el.id = 'article-overlay';
  el.innerHTML = `
    <div class="article-reader">
      <div class="article-hdr">
        <button class="back-btn-art" onclick="closeArticle()">&#8592;</button>
        <span class="article-hdr-label">${n.category}</span>
      </div>
      ${thumb}
      <div class="article-body">
        <div class="article-cat">${n.category}</div>
        <h1 class="article-title">${n.title}</h1>
        <div class="article-date">${formatDate(n.publishedAt)}</div>
        <div class="article-content">${paragraphs||'<p class="article-p" style="color:var(--text2)">No content available.</p>'}</div>
      </div>
    </div>`;
  document.body.appendChild(el);
  setTimeout(()=>el.classList.add('open'),30);
}

function closeArticle() {
  const el = document.getElementById('article-overlay');
  if(el){ el.classList.remove('open'); setTimeout(()=>el.remove(),350); }
}

/* ── STANDINGS ──────────────────────────────────────────────── */
function showStandings() {
  const leagues = { PL:'Premier League', PD:'La Liga', SA:'Serie A', BL1:'Bundesliga', FL1:'Ligue 1' };
  const data = S.standings[S.standingLeague];
  
  document.getElementById('screen-standings').innerHTML = `
    <div class="section-head" style="padding-top:16px"><span class="section-title">League Tables</span></div>
    <div class="league-chips" style="display:flex;gap:8px;padding:0 16px 12px;overflow-x:auto;scrollbar-width:none">
      ${Object.entries(leagues).map(([id,name])=>`
        <button class="chip ${S.standingLeague===id?'active':''}" onclick="setStandingLeague('${id}')">${name}</button>
      `).join('')}
    </div>
    <div class="standings-table-wrap" style="padding:0 12px 20px">
      <div class="standings-header" style="display:flex;padding:12px 14px;background:var(--card);border-radius:12px 12px 0 0;font-size:11px;font-weight:700;color:var(--text3);border:1px solid var(--border);border-bottom:none">
        <div style="width:24px">#</div>
        <div style="flex:1">TEAM</div>
        <div style="width:28px;text-align:center">P</div>
        <div style="width:28px;text-align:center">W</div>
        <div style="width:28px;text-align:center">D</div>
        <div style="width:28px;text-align:center">L</div>
        <div style="width:32px;text-align:center;color:var(--accent)">PTS</div>
      </div>
      <div class="standings-body" style="background:var(--bg);border:1px solid var(--border);border-radius:0 0 12px 12px;overflow:hidden">
        ${!data ? `<div style="padding:40px;text-align:center;color:var(--text3);font-size:13px">Loading table data...</div>` : data.table.map((row,i)=>`
          <div style="display:flex;align-items:center;padding:12px 14px;border-bottom:1px solid var(--border);font-size:12px;${i%2===0?'background:var(--card2)':''}">
            <div style="width:24px;font-weight:700;color:${i<4?'var(--accent)':'var(--text2)'}">${row.position}</div>
            <div style="flex:1;display:flex;align-items:center;gap:8px;font-weight:600;color:var(--text1)">
              <img src="${row.crest}" style="width:20px;height:20px;object-fit:contain">
              <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${row.teamName}</span>
            </div>
            <div style="width:28px;text-align:center;color:var(--text2)">${row.played}</div>
            <div style="width:28px;text-align:center;color:var(--text2)">${row.won}</div>
            <div style="width:28px;text-align:center;color:var(--text3)">${row.drawn}</div>
            <div style="width:28px;text-align:center;color:var(--red)">${row.lost}</div>
            <div style="width:32px;text-align:center;font-weight:800;color:var(--accent2)">${row.points}</div>
          </div>
        `).join('')}
      </div>
      ${data ? `<div style="font-size:10px;color:var(--text3);margin-top:10px;text-align:center">Last synced: ${new Date(data.updatedAt).toLocaleString()}</div>` : ''}
    </div>
  `;
}

function setStandingLeague(id) { S.standingLeague=id; showStandings(); }

/* ── LEAGUES ────────────────────────────────────────────────── */
function showLeagues() {
  document.getElementById('screen-leagues').innerHTML = `
    <div class="section-head" style="padding-top:16px"><span class="section-title">All Leagues</span></div>
    <div class="leagues-grid">
      ${Object.entries(LEAGUES).map(([id,l])=>{
        const count=S.matches.filter(m=>m.leagueId===id).length;
        return `<div class="league-card${S.leagueFilter===id?' active-filter':''}" onclick="filterByLeague('${id}')">
          <div class="lc-emoji">${l.emoji}</div>
          <div class="lc-name">${l.name}</div>
          <div class="lc-country">${l.country}</div>
          <div class="lc-count">${count} match${count!==1?'es':''}</div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function filterByLeague(id) {
  S.leagueFilter = S.leagueFilter===id ? null : id;
  S.filter='all';
  showLeagues();
  go('matches');
}

/* ── LIVE TICKER ────────────────────────────────────────────── */
function startTicker() {
  setInterval(()=>{
    S.matches.filter(m=>m.status==='live').forEach(m=>{
      const cur=parseInt(m.minute)||0;
      if(cur<90) m.minute=`${cur+1}'`;
    });
    refresh();
  }, 60000);
}

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  console.info('[ZETASPORTS] Initializing Application...');
  try {
    initFirebase();
    setupNav();
    go('home');
    startTicker();
    console.info('[ZETASPORTS] Init Complete.');
  } catch (e) {
    console.error('[ZETASPORTS] Initialization Crash:', e);
  } finally {
    // ALWAYS hide splash screen after app renders (~2s minimum for animation)
    const splash = document.getElementById('splash-screen');
    if (splash) {
      setTimeout(() => {
        splash.classList.add('hide');
        console.info('[ZETASPORTS] Splash hidden.');
      }, 2000);
    }
  }
});
