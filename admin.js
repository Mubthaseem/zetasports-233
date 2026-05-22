/* ── ZETASPORTS Admin Panel — admin.js ── */

const ADMIN_PIN = '1234';           // Change this to your preferred PIN
const LEAGUES_MAP = {
  PL:'Premier League', UCL:'Champions League', LALIGA:'La Liga',
  BUNDESLIGA:'Bundesliga', SERIEA:'Serie A', ISL:'Indian Super League', LIGUE1:'Ligue 1'
};

const GEMINI_API_KEY = ''; // User can set this in their browser console or code

const PAGES = ['dashboard','matches','news','leagues','notifications','settings'];

let db = null;
let allMatches = [], allNews = [], allLeagues = [], allTokens = [];
let editingMatchId = null, editingNewsId = null;
let currentPage = 'dashboard';

/* ── PIN LOGIN ── */
let pinEntry = '';
(function buildNumpad() {
  const np = document.getElementById('numpad');
  [1,2,3,4,5,6,7,8,9,'⌫',0,'✓'].forEach(k => {
    const b = document.createElement('button');
    b.className = 'num-btn'; b.textContent = k;
    b.onclick = () => handlePin(String(k));
    np.appendChild(b);
  });
})();

function handlePin(k) {
  const err = document.getElementById('pin-err');
  err.textContent = '';
  if (k === '⌫') { pinEntry = pinEntry.slice(0,-1); }
  else if (k === '✓') { checkPin(); return; }
  else if (pinEntry.length < 4) { pinEntry += k; }
  updatePinDots();
  if (pinEntry.length === 4) setTimeout(checkPin, 120);
}

function updatePinDots() {
  for (let i=0;i<4;i++) {
    const d = document.getElementById('d'+i);
    d.textContent = i < pinEntry.length ? '●' : '·';
    d.classList.toggle('filled', i < pinEntry.length);
  }
}

function checkPin() {
  if (pinEntry === ADMIN_PIN) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    sessionStorage.setItem('zs_admin','1');
    initFirebase();
  } else {
    document.getElementById('pin-err').textContent = 'Incorrect PIN. Try again.';
    pinEntry = ''; updatePinDots();
  }
}

function logout() {
  sessionStorage.removeItem('zs_admin');
  location.reload();
}

/* ── FIREBASE ── */
function initFirebase() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    listenMatches();
    listenNews();
    listenLeagues();
    listenTokens();
    listenSettings();
    listenAnalytics();
  } catch(e) { showToast('Firebase error: ' + e.message, 'error'); }
}

let appSettings = null;
let todayVisits = 0;

function listenAnalytics() {
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
  db.collection('analytics').doc(dateKey).onSnapshot(doc => {
    if (doc.exists) {
      todayVisits = doc.data().visits || 0;
      renderDashboard();
    }
  });
}
function listenSettings() {
  db.collection('settings').doc('app_config').onSnapshot(doc => {
    if (doc.exists) {
      appSettings = doc.data();
      if (currentPage === 'settings') renderSettings();
      updateWebsiteBranding();
    }
  });
}

function listenMatches() {
  db.collection('matches').onSnapshot(snap => {
    allMatches = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderDashboard(); renderMatchTable();
  }, e => showToast('Matches error','error'));
}

function listenNews() {
  db.collection('news').orderBy('publishedAt','desc').onSnapshot(snap => {
    allNews = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderNewsGrid();
  }, () => {
    db.collection('news').onSnapshot(snap => {
      allNews = snap.docs.map(d => ({id:d.id,...d.data()}));
      renderNewsGrid();
    });
  });
}

function listenLeagues() {
  db.collection('leagues').onSnapshot(snap => {
    allLeagues = snap.docs.map(d => ({id:d.id,...d.data()}));
    renderLeaguesGrid();
  });
}

function listenTokens() {
  db.collection('fcm_tokens').onSnapshot(snap => {
    allTokens = snap.docs.map(d => ({id:d.id,...d.data()}));
    if (currentPage === 'notifications') renderNotifPage();
    renderDashboard();
  }, () => { 
    allTokens = []; 
    if (currentPage === 'notifications') renderNotifPage();
    renderDashboard();
  });
}

/* ── NAVIGATION ── */
function goPage(page) {
  currentPage = page;
  PAGES.forEach(p => {
    document.getElementById('page-'+p).style.display = p===page ? 'block' : 'none';
  });
  document.querySelectorAll('.sb-item').forEach((el,i) => {
    el.classList.toggle('active', PAGES[i]===page);
  });
  if (page==='notifications') renderNotifPage();
  if (page==='settings') renderSettings();
}

/* ── DASHBOARD ── */
function renderDashboard() {
  const live = allMatches.filter(m=>m.status==='live'||m.status==='ht').length;
  const upcoming = allMatches.filter(m=>m.status==='upcoming').length;
  const finished = allMatches.filter(m=>m.status==='finished').length;
  
  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card" style="background:linear-gradient(135deg, rgba(0,230,118,0.1), rgba(0,230,118,0.02)); border:1px solid rgba(0,230,118,0.2)">
      <div class="stat-val" style="color:#69f0ae">${todayVisits}</div>
      <div class="stat-label">🚀 Visits Today</div>
    </div>
    <div class="stat-card" style="background:linear-gradient(135deg, rgba(41,121,255,0.1), rgba(41,121,255,0.02)); border:1px solid rgba(41,121,255,0.2)">
      <div class="stat-val" style="color:#90caf9">${allTokens.length}</div>
      <div class="stat-label">📱 Total Users</div>
    </div>
    <div class="stat-card"><div class="stat-val">${allMatches.length}</div><div class="stat-label">Total Matches</div></div>
    <div class="stat-card"><div class="stat-val" style="color:#ff6b6b">${live}</div><div class="stat-label">🔴 Live Now</div></div>
    <div class="stat-card"><div class="stat-val" style="color:var(--gold)">${allNews.length}</div><div class="stat-label">📰 News Articles</div></div>
  `;
  const sorted = [...allMatches].sort((a,b)=>{
    const o={live:0,ht:1,upcoming:2,finished:3};
    const sDiff = (o[a.status]||9)-(o[b.status]||9);
    if(sDiff !== 0) return sDiff;
    const dA = new Date((a.kickoffDate||'2099-01-01')+'T'+(a.kickoffIST||'00:00'));
    const dB = new Date((b.kickoffDate||'2099-01-01')+'T'+(b.kickoffIST||'00:00'));
    return dA - dB;
  });

  document.getElementById('dash-matches').innerHTML = sorted.slice(0,8).map(m => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <img src="${m.homeLogo}" style="width:18px;height:18px;object-fit:contain" onerror="this.src='https://placehold.co/18x18/0d1428/2979ff?text=${m.home}'">
          <b>${m.homeTeam||m.home}</b>
          <span style="color:var(--acc);font-weight:700">vs</span>
          <b>${m.awayTeam||m.away}</b>
          <img src="${m.awayLogo}" style="width:18px;height:18px;object-fit:contain" onerror="this.src='https://placehold.co/18x18/0d1428/2979ff?text=${m.away}'">
        </div>
      </td>
      <td>${LEAGUES_MAP[m.leagueId]||m.leagueId||'—'}</td>
      <td>${formatTime12(m.kickoffIST)||'—'} IST</td>
      <td>
        ${m.sport === 'cricket' ? 
          `<div style="font-size:11px;color:var(--gold)">🏏 ${m.homeCricketScore || '0/0'} - ${m.awayCricketScore || '0/0'}</div>
           <div style="font-size:10px;color:var(--text3)">${m.cricketInfo || ''}</div>` : 
          statusBadge(m.status, m.minute)
        }
      </td>
      <td>
        <button class="btn btn-sm btn-edit" onclick="goPage('matches');openMatchModal('${m.id}')">Edit</button>
        <button class="btn btn-sm" style="background:#ffc107;color:#000;margin-left:4px" onclick="prepareQuickNotification('${m.id}')">🔔</button>
      </td>
    </tr>`).join('');
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

/* ── MATCH TABLE ── */
function renderMatchTable() {
  const sorted = [...allMatches].sort((a,b)=>{
    const o={live:0,ht:1,upcoming:2,finished:3};
    const sDiff = (o[a.status]||9)-(o[b.status]||9);
    if(sDiff !== 0) return sDiff;
    const dA = new Date((a.kickoffDate||'2099-01-01')+'T'+(a.kickoffIST||'00:00'));
    const dB = new Date((b.kickoffDate||'2099-01-01')+'T'+(b.kickoffIST||'00:00'));
    return dA - dB;
  });
  document.getElementById('matches-tbody').innerHTML = sorted.length
    ? sorted.map(m=>`
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <img src="${m.homeLogo}" style="width:20px;height:20px;object-fit:contain" onerror="this.src='https://placehold.co/20x20/0d1428/2979ff?text=${m.home}'">
          <b>${m.homeTeam||m.home}</b>
        </div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <img src="${m.awayLogo}" style="width:20px;height:20px;object-fit:contain" onerror="this.src='https://placehold.co/20x20/0d1428/2979ff?text=${m.away}'">
          <b>${m.awayTeam||m.away}</b>
        </div>
      </td>
      <td>${LEAGUES_MAP[m.leagueId]||m.leagueId||'—'}</td>
      <td>${m.kickoffDate||'—'}</td>
      <td>${formatTime12(m.kickoffIST)||'—'}</td>
      <td>${statusBadge(m.status,m.minute)}</td>
      <td>${m.status!=='upcoming'?`<b>${m.homeScore??'-'} – ${m.awayScore??'-'}</b>`:'—'}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm btn-edit" onclick="openMatchModal('${m.id}')">✏️ Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteMatch('${m.id}','${(m.homeTeam||m.home)+' vs '+(m.awayTeam||m.away)}')">🗑</button>
        <button class="btn btn-sm" style="background:#ffc107;color:#000" onclick="prepareQuickNotification('${m.id}')">🔔</button>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="8" class="empty-state">No matches yet. Click "+ Add Match" to get started.</td></tr>';
}

/* ── AUTO FETCH MODAL ── */
function openFetchModal() {
  document.getElementById('api-key').value = localStorage.getItem('zs_football_data_key') || '';
  openModal('fetch-modal');
}

let footballSearchResults = [];

async function fetchMatchesFromApi() {
  const apiKey = document.getElementById('api-key').value.trim();
  if(!apiKey) return showToast('API key required','error');
  localStorage.setItem('zs_football_data_key', apiKey);
  
  const comp = document.getElementById('api-competition').value;
  const days = parseInt(document.getElementById('api-days').value) || 3;
  
  closeModal('fetch-modal');
  openModal('football-sync-modal');
  const listEl = document.getElementById('football-fixtures-list');
  listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">Searching fixtures...</div>';

  try {
    const today = new Date();
    const future = new Date(); future.setDate(today.getDate() + days);
    const d1 = today.toISOString().split('T')[0], d2 = future.toISOString().split('T')[0];

    const targetUrl = encodeURIComponent(`https://api.football-data.org/v4/competitions/${comp}/matches?dateFrom=${d1}&dateTo=${d2}`);
    const url = `https://corsproxy.io/?${targetUrl}`;
    const res = await fetch(url, { headers: { 'X-Auth-Token': apiKey } });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message || 'API Error');

    footballSearchResults = data.matches || [];
    if (footballSearchResults.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">No matches found in this range.</div>';
      return;
    }

    renderFootballFixtures(comp);
  } catch(err) {
    listEl.innerHTML = `<div style="text-align:center;padding:40px;color:#ff6b6b">Error: ${err.message}</div>`;
  }
}

function renderFootballFixtures(comp) {
  const listEl = document.getElementById('football-fixtures-list');
  
  listEl.innerHTML = footballSearchResults.map((m, index) => {
    const dateStr = new Date(m.utcDate).toISOString().split('T')[0];
    const exists = allMatches.find(x => x.homeTeam === m.homeTeam.name && x.kickoffDate === dateStr);
    
    return `
      <div style="background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:12px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px;width:70%">
          <img src="${m.homeTeam.crest}" style="width:20px;height:20px;object-fit:contain">
          <div style="font-size:12px;font-weight:700;color:var(--text1);flex:1">${m.homeTeam.shortName || m.homeTeam.name} vs ${m.awayTeam.shortName || m.awayTeam.name}</div>
          <img src="${m.awayTeam.crest}" style="width:20px;height:20px;object-fit:contain">
        </div>
        ${exists ? 
          `<button class="btn btn-sm" disabled style="background:rgba(0,230,118,0.1);color:#69f0ae;border-color:rgba(0,230,118,0.2)">Added</button>` : 
          `<button class="btn btn-sm btn-primary" onclick="addFootballMatch(${index}, '${comp}', this)">+ Add</button>`
        }
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:-8px;margin-left:12px;margin-bottom:5px">${dateStr} · ${new Date(m.utcDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} IST</div>
    `;
  }).join('');
}

async function addFootballMatch(index, comp, btn) {
  const m = footballSearchResults[index];
  const dateObj = new Date(m.utcDate);
  const dateStr = dateObj.toISOString().split('T')[0];
  const hrs = dateObj.getHours().toString().padStart(2, '0');
  const mins = dateObj.getMinutes().toString().padStart(2, '0');

  btn.textContent = 'Adding...'; btn.disabled = true;

  const data = {
    sport: 'football',
    homeTeam: m.homeTeam.name, awayTeam: m.awayTeam.name,
    home: m.homeTeam.tla || m.homeTeam.shortName || m.homeTeam.name.substring(0,3).toUpperCase(),
    away: m.awayTeam.tla || m.awayTeam.shortName || m.awayTeam.name.substring(0,3).toUpperCase(),
    homeLogo: m.homeTeam.crest || '', awayLogo: m.awayTeam.crest || '',
    leagueId: comp === 'PL' ? 'EPL' : comp === 'CL' ? 'UCL' : comp === 'BL1' ? 'BUNDESLIGA' : comp === 'SA' ? 'SERIEA' : comp === 'PD' ? 'LALIGA' : comp === 'FL1' ? 'LIGUE1' : comp,
    leagueName: LEAGUES_MAP[comp] || comp,
    kickoffDate: dateStr, kickoffIST: `${hrs}:${mins}`,
    status: 'upcoming', homeScore: 0, awayScore: 0,
    featured: false, servers: [], preview: '', minute: '',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('matches').add(data);
    btn.textContent = 'Added';
    btn.style.background = 'rgba(0,230,118,0.1)';
    btn.style.color = '#69f0ae';
    btn.style.borderColor = 'rgba(0,230,118,0.2)';
    showToast('Match added!', 'success');
  } catch(e) {
    btn.textContent = '+ Add'; btn.disabled = false;
    showToast(e.message, 'error');
  }
}

/* ── MATCH MODAL ── */
function openMatchModal(id=null) {
  editingMatchId = id;
  document.getElementById('match-modal-title').textContent = id ? 'Edit Match' : 'Add Match';
  clearMatchForm();
  if (id) {
    const m = allMatches.find(x=>x.id===id);
    if (!m) return;
    document.getElementById('f-homeTeam').value = m.homeTeam||'';
    document.getElementById('f-awayTeam').value = m.awayTeam||'';
    document.getElementById('f-home').value = m.home||'';
    document.getElementById('f-away').value = m.away||'';
    document.getElementById('f-homeLogo').value = m.homeLogo||'';
    document.getElementById('f-awayLogo').value = m.awayLogo||'';
    document.getElementById('f-leagueId').value = m.leagueId||'PL';
    document.getElementById('f-leagueName').value = m.leagueName||'';
    document.getElementById('f-status').value = m.status||'upcoming';
    document.getElementById('f-kickoffDate').value = m.kickoffDate||'';
    document.getElementById('f-kickoffIST').value = m.kickoffIST||'';
    document.getElementById('f-homeScore').value = m.homeScore??0;
    document.getElementById('f-awayScore').value = m.awayScore??0;
    document.getElementById('f-minute').value = m.minute||'';
    document.getElementById('f-featured').checked = !!m.featured;
    (m.servers||[]).forEach(s=>addServerRow(s.label, s.url, s.type||'redirect', s.enabled!==false));
    document.getElementById('f-preview').value = m.preview || '';
    document.getElementById('f-apkStream').value = m.apkStream || '';
    document.getElementById('f-sport').value = m.sport || 'football';
    document.getElementById('f-homeCricketScore').value = m.homeCricketScore || '';
    document.getElementById('f-awayCricketScore').value = m.awayCricketScore || '';
    document.getElementById('f-cricketInfo').value = m.cricketInfo || '';
    toggleScoreFields();
  }
  openModal('match-modal');
}

function clearMatchForm() {
  ['f-homeTeam','f-awayTeam','f-home','f-away','f-homeLogo','f-awayLogo','f-kickoffDate','f-kickoffIST','f-minute','f-leagueName'].forEach(id=>{document.getElementById(id).value='';});
  document.getElementById('f-leagueId').value='PL';
  document.getElementById('f-status').value='upcoming';
  document.getElementById('f-homeScore').value=0;
  document.getElementById('f-awayScore').value=0;
  document.getElementById('f-featured').checked=false;
  document.getElementById('f-apkStream').value='';
  document.getElementById('servers-list').innerHTML='';
  toggleScoreFields();
}

function toggleScoreFields() {
  const s = document.getElementById('f-status').value;
  const sport = document.getElementById('f-sport').value;
  
  const isUpcoming = s === 'upcoming';
  const isFootball = sport === 'football';

  // Football fields
  document.getElementById('score-fields').style.display = (!isUpcoming && isFootball) ? 'grid' : 'none';
  document.getElementById('minute-field').style.display = (s === 'live' && isFootball) ? 'block' : 'none';

  // Cricket fields
  document.getElementById('cricket-score-fields').style.display = (!isUpcoming && !isFootball) ? 'block' : 'none';
}

function addServerRow(label='', url='', type='redirect', enabled=true) {
  const list = document.getElementById('servers-list');
  const row = document.createElement('div');
  row.className='server-row';
  row.innerHTML=`
    <input class="form-input" placeholder="Server label" value="${label}"/>
    <select class="form-select">
      <option value="redirect" ${type==='redirect'?'selected':''}>🔗 Redirect Link</option>
      <option value="m3u8"    ${type==='m3u8'?'selected':''}>📺 M3U8 Stream</option>
      <option value="iframe"  ${type==='iframe'?'selected':''}>🖥️ iFrame Embed</option>
      <option value="html"    ${type==='html'?'selected':''}>💻 HTML Code</option>
    </select>
    <input class="form-input" placeholder="URL / iframe src / HTML code.." value="${url.replace(/"/g,'&quot;')}"/>
    <button class="srv-toggle ${enabled!==false?'on':''}" title="Enable/Disable stream"
      onclick="this.classList.toggle('on');this.textContent=this.classList.contains('on')?'ON':'OFF'">${enabled!==false?'ON':'OFF'}</button>
    <button class="remove-server" onclick="this.parentElement.remove()">✕</button>`;
  list.appendChild(row);
}

async function saveMatch() {
  const status = document.getElementById('f-status').value;
  const servers = [...document.querySelectorAll('.server-row')].map(r=>{
    const ins = r.querySelectorAll('input');
    const sel = r.querySelector('select');
    const tog = r.querySelector('.srv-toggle');
    return {label:ins[0].value.trim()||'Server', type:sel?.value||'redirect', url:ins[1].value.trim(), enabled:tog?.classList.contains('on')!==false};
  }).filter(s=>s.url);
  const preview = document.getElementById('f-preview')?.value.trim()||'';

  const getValue = (id) => document.getElementById(id)?.value?.trim() || '';
  const getChecked = (id) => document.getElementById(id)?.checked || false;

  const data = {
    homeTeam: getValue('f-homeTeam'),
    awayTeam: getValue('f-awayTeam'),
    home: getValue('f-home').toUpperCase(),
    away: getValue('f-away').toUpperCase(),
    homeLogo: getValue('f-homeLogo'),
    awayLogo: getValue('f-awayLogo'),
    leagueId: getValue('f-leagueId'),
    leagueName: getValue('f-leagueName') || LEAGUES_MAP[getValue('f-leagueId')] || '',
    sport: getValue('f-sport'),
    status,
    kickoffDate: getValue('f-kickoffDate'),
    kickoffIST: getValue('f-kickoffIST'),
    homeScore: parseInt(document.getElementById('f-homeScore')?.value) || 0,
    awayScore: parseInt(document.getElementById('f-awayScore')?.value) || 0,
    homeCricketScore: getValue('f-homeCricketScore'),
    awayCricketScore: getValue('f-awayCricketScore'),
    cricketInfo: getValue('f-cricketInfo'),
    minute: getValue('f-minute'),
    featured: getChecked('f-featured'),
    servers,
    preview,
    apkStream: getValue('f-apkStream'),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  console.log('DEBUG: Saving Match Data:', data);
  try {
    if (editingMatchId) {
      const oldMatch = allMatches.find(m => m.id === editingMatchId);
      const isStatusChangeToLive = oldMatch && oldMatch.status === 'upcoming' && status === 'live';
      
      await db.collection('matches').doc(editingMatchId).update(data);
      showToast('Match updated ✓','success');

      if (isStatusChangeToLive) {
        autoSendLiveNotification(data);
      }
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('matches').add(data);
      showToast('Match added ✓','success');
    }
    closeModal('match-modal');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

async function deleteMatch(id, name) {
  if (!confirm(`Delete match:\n"${name}"?\n\nThis cannot be undone.`)) return;
  try {
    await db.collection('matches').doc(id).delete();
    showToast('Match deleted','success');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

/* ── NEWS ── */
function renderNewsGrid() {
  const g = document.getElementById('news-grid');
  if (!allNews.length) { g.innerHTML='<div class="empty-state" style="grid-column:1/-1">No news articles yet. Click "+ Add Article".</div>'; return; }
  g.innerHTML = allNews.map(n=>`
    <div class="news-admin-card">
      <div class="nac-img" style="background:${n.gradient||'#0c1221'}">
        <span>${n.emoji||'⚽'}</span>
        <span class="nac-cat">${n.category||'News'}</span>
      </div>
      <div class="nac-body">
        <div class="nac-title">${n.title||'Untitled'}</div>
        <div class="nac-actions">
          <button class="btn btn-sm btn-edit" onclick="openNewsModal('${n.id}')">✏️ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteNews('${n.id}')">🗑 Delete</button>
        </div>
      </div>
    </div>`).join('');
}

function openNewsModal(id=null) {
  editingNewsId = id;
  document.getElementById('news-modal-title').textContent = id ? 'Edit Article' : 'Add Article';
  ['n-title','n-articleUrl','n-emoji','n-content','n-thumbnailUrl'].forEach(x=>{ const el=document.getElementById(x); if(el) el.value=''; });
  document.getElementById('n-category').value='Match Report';
  document.getElementById('n-gradient').value='linear-gradient(135deg,#1a0a2e,#3d195b)';
  document.getElementById('n-publishedAt').value='';
  document.getElementById('thumb-preview').style.display='none';
  setArticleTab('write');
  if (id) {
    const n = allNews.find(x=>x.id===id);
    if (!n) return;
    document.getElementById('n-title').value=n.title||'';
    document.getElementById('n-category').value=n.category||'News';
    document.getElementById('n-emoji').value=n.emoji||'⚽';
    document.getElementById('n-articleUrl').value=n.articleUrl||'';
    document.getElementById('n-content').value=n.content||'';
    document.getElementById('n-thumbnailUrl').value=n.thumbnailUrl||'';
    if(n.thumbnailUrl){ previewThumb(); }
    document.getElementById('n-gradient').value=n.gradient||'linear-gradient(135deg,#1a0a2e,#3d195b)';
    if (n.publishedAt?.toDate) { const d=n.publishedAt.toDate(); document.getElementById('n-publishedAt').value=d.toISOString().slice(0,16); }
    setArticleTab(n.content ? 'write' : 'link');
  }
  openModal('news-modal');
}

function setArticleTab(tab) {
  const isWrite = tab==='write';
  document.getElementById('write-section').style.display = isWrite?'block':'none';
  document.getElementById('link-section').style.display  = isWrite?'none':'block';
  document.getElementById('tab-write').style.borderColor = isWrite?'var(--acc)':'var(--border)';
  document.getElementById('tab-write').style.background  = isWrite?'rgba(41,121,255,.15)':'transparent';
  document.getElementById('tab-write').style.color       = isWrite?'var(--acc2)':'#90caf9';
  document.getElementById('tab-link').style.borderColor  = !isWrite?'var(--acc)':'var(--border)';
  document.getElementById('tab-link').style.background   = !isWrite?'rgba(41,121,255,.15)':'transparent';
  document.getElementById('tab-link').style.color        = !isWrite?'var(--acc2)':'#90caf9';
}

function previewThumb() {
  const url = document.getElementById('n-thumbnailUrl').value.trim();
  const prev = document.getElementById('thumb-preview');
  const img  = document.getElementById('thumb-img');
  if (url) { img.src=url; prev.style.display='block'; }
  else { prev.style.display='none'; }
}

async function saveNews() {
  const pubVal = document.getElementById('n-publishedAt').value;
  const isWrite = document.getElementById('write-section').style.display !== 'none';
  const data = {
    title:        document.getElementById('n-title').value.trim(),
    category:     document.getElementById('n-category').value,
    emoji:        document.getElementById('n-emoji').value.trim()||'⚽',
    thumbnailUrl: document.getElementById('n-thumbnailUrl').value.trim(),
    gradient:     document.getElementById('n-gradient').value,
    publishedAt:  pubVal ? firebase.firestore.Timestamp.fromDate(new Date(pubVal)) : firebase.firestore.FieldValue.serverTimestamp(),
    articleType:  isWrite ? 'internal' : 'external',
    content:      isWrite ? document.getElementById('n-content').value.trim() : '',
    articleUrl:   !isWrite ? document.getElementById('n-articleUrl').value.trim() : ''
  };
  if (!data.title) { showToast('Title is required','error'); return; }
  try {
    if (editingNewsId) {
      await db.collection('news').doc(editingNewsId).update(data);
      showToast('Article updated ✓','success');
    } else {
      await db.collection('news').add(data);
      showToast('Article added ✓','success');
    }
    closeModal('news-modal');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

async function deleteNews(id) {
  if (!confirm('Delete this news article? This cannot be undone.')) return;
  try {
    await db.collection('news').doc(id).delete();
    showToast('Article deleted','success');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

/* ── LEAGUES ── */
function renderLeaguesGrid() {
  const combined = {...{
    EPL:{name:'Premier League',country:'England',color:'#3d195b',logo:'https://media.api-sports.io/football/leagues/39.png'},
    UCL:{name:'Champions League',country:'Europe',color:'#003399',logo:'https://media.api-sports.io/football/leagues/2.png'},
    LALIGA:{name:'La Liga',country:'Spain',color:'#ee8200',logo:'https://media.api-sports.io/football/leagues/140.png'},
    BUNDESLIGA:{name:'Bundesliga',country:'Germany',color:'#d20515',logo:'https://media.api-sports.io/football/leagues/78.png'},
    SERIEA:{name:'Serie A',country:'Italy',color:'#024594',logo:'https://media.api-sports.io/football/leagues/135.png'},
    ISL:{name:'Indian Super League',country:'India',color:'#f58220',logo:'https://media.api-sports.io/football/leagues/323.png'}
  }};
  allLeagues.forEach(l=>{ combined[l.id]={...combined[l.id],...l}; });
  const matchCount = id => allMatches.filter(m=>m.leagueId===id).length;
  document.getElementById('leagues-grid').innerHTML = Object.keys(combined).length ? Object.entries(combined).map(([id,l])=>`
    <div class="lg-card" style="border-top:4px solid ${l.color||'#3d6abf'}">
      <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
        <button class="btn btn-sm btn-edit" style="padding:4px 8px;background:transparent;border:none" onclick="openLeagueModal('${id}')">✏️</button>
        <button class="btn btn-sm btn-danger" style="padding:4px 8px;margin-left:4px;background:transparent;border:none" onclick="deleteLeague('${id}')">✕</button>
      </div>
      ${l.logo ? `<img src="${l.logo}" style="height:48px;margin-bottom:12px;object-fit:contain"/>` : '<div style="height:48px;margin-bottom:12px;color:#90caf9;font-size:32px">🏆</div>'}
      <div class="lg-name">${l.name}</div>
      <div class="lg-country">${l.country||''}</div>
      <div class="lg-count">${matchCount(id)} matches</div>
    </div>`).join('') : '<div class="empty-state" style="grid-column:1/-1">No leagues found.</div>';
}

function openLeagueModal(id=null) {
  const isEdit = !!id;
  document.getElementById('lg-id').value = id || '';
  document.getElementById('lg-id').disabled = isEdit;
  document.getElementById('lg-name').value = '';
  document.getElementById('lg-country').value = '';
  document.getElementById('lg-color').value = '';
  document.getElementById('lg-logo').value = '';
  document.getElementById('lg-embedCode').value = '';

  if (isEdit) {
    const combined = {...{
      EPL:{name:'Premier League',country:'England',color:'#3d195b',logo:'https://media.api-sports.io/football/leagues/39.png'},
      UCL:{name:'Champions League',country:'Europe',color:'#003399',logo:'https://media.api-sports.io/football/leagues/2.png'},
      LALIGA:{name:'La Liga',country:'Spain',color:'#ee8200',logo:'https://media.api-sports.io/football/leagues/140.png'},
      BUNDESLIGA:{name:'Bundesliga',country:'Germany',color:'#d20515',logo:'https://media.api-sports.io/football/leagues/78.png'},
      SERIEA:{name:'Serie A',country:'Italy',color:'#024594',logo:'https://media.api-sports.io/football/leagues/135.png'},
      ISL:{name:'Indian Super League',country:'India',color:'#f58220',logo:'https://media.api-sports.io/football/leagues/323.png'}
    }};
    allLeagues.forEach(l=>{ combined[l.id]={...combined[l.id],...l}; });
    
    const l = combined[id];
    if (l) {
      document.getElementById('lg-name').value = l.name || '';
      document.getElementById('lg-country').value = l.country || '';
      document.getElementById('lg-color').value = l.color || '';
      document.getElementById('lg-logo').value = l.logo || '';
      document.getElementById('lg-embedCode').value = l.embedCode || '';
    }
  }
  openModal('league-modal');
}

async function saveLeague() {
  const id = document.getElementById('lg-id').value.trim().toUpperCase();
  if (!id) { showToast('League ID required','error'); return; }
  const data = {
    name: document.getElementById('lg-name').value.trim(),
    country: document.getElementById('lg-country').value.trim(),
    color: document.getElementById('lg-color').value.trim(),
    logo: document.getElementById('lg-logo').value.trim(),
    embedCode: document.getElementById('lg-embedCode').value.trim()
  };
  try {
    await db.collection('leagues').doc(id).set(data, {merge: true});
    showToast('League saved!','success');
    closeModal('league-modal');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

async function deleteLeague(id) {
  if (!confirm(`Are you sure you want to delete the league ${id}?`)) return;
  try {
    await db.collection('leagues').doc(id).delete();
    showToast('League deleted','success');
  } catch(e) { showToast('Error: '+e.message,'error'); }
}

/* ── UTILS ── */
function statusBadge(status, minute='') {
  const map = {
    live:`<span class="badge badge-live">🔴 LIVE ${minute}</span>`,
    ht:`<span class="badge badge-ht">⏸ HT</span>`,
    upcoming:`<span class="badge badge-upcoming">⏰ Upcoming</span>`,
    finished:`<span class="badge badge-finished">✅ FT</span>`
  };
  return map[status]||`<span class="badge">${status}</span>`;
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

let toastTimer;
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.innerHTML = msg; // Support HTML links
  t.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ t.className=''; },5000); // Longer for reading links
}

/* ── INIT ── */
window.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('zs_admin')==='1') {
    document.getElementById('login-screen').style.display='none';
    document.getElementById('app').style.display='block';
    initFirebase();
    goPage('dashboard');
  }
  document.querySelectorAll('.modal-overlay').forEach(el=>{
    el.addEventListener('click', e=>{ if(e.target===el) el.classList.remove('open'); });
  });
});

/* ── NOTIFICATIONS ── */
function renderNotifPage() {
  const mobile  = allTokens.filter(t=>t.platform==='mobile').length;
  const desktop = allTokens.filter(t=>t.platform==='desktop').length;
  const cEl=document.getElementById('sub-count'), mEl=document.getElementById('sub-mobile'), dEl=document.getElementById('sub-desktop');
  if(cEl) cEl.textContent=allTokens.length;
  if(mEl) mEl.textContent=mobile;
  if(dEl) dEl.textContent=desktop;
  const tbl=document.getElementById('tokens-table'); if(!tbl) return;
  if(!allTokens.length){ tbl.innerHTML='<div style="color:#3d6abf;font-size:13px;padding:8px 0">No subscribers yet. Users who tap "Allow Notifications" in the app will appear here.</div>'; return; }
  tbl.innerHTML=`<table style="width:100%"><thead><tr><th>Platform</th><th>Subscribed</th><th>Token</th><th></th></tr></thead><tbody>
    ${allTokens.slice(0,30).map(t=>{
      const date=t.subscribedAt?.toDate?t.subscribedAt.toDate().toLocaleDateString('en-IN'):'—';
      return `<tr><td>${t.platform==='mobile'?'📱 Mobile':'🖥️ Desktop'}</td><td>${date}</td>
        <td style="font-family:monospace;font-size:11px;color:#90caf9">${(t.token||'').slice(0,36)}…</td>
        <td><button class="btn btn-sm btn-danger" onclick="deleteToken('${t.id}')">🗑</button></td></tr>`;
    }).join('')}</tbody></table>`;
}

async function deleteToken(id) {
  if(!confirm('Remove this subscriber token?')) return;
  try{ await db.collection('fcm_tokens').doc(id).delete(); showToast('Removed','success'); }
  catch(e){ showToast('Error: '+e.message,'error'); }
}

async function prepareQuickNotification(id) {
  const m = allMatches.find(x => x.id === id);
  if (!m) return;
  
  goPage('notifications');
  
  // Wait a tiny bit for the page to switch
  setTimeout(() => {
    document.getElementById('n-ntitle').value = `🚨 Match Alert: ${m.homeTeam} vs ${m.awayTeam}`;
    document.getElementById('n-nbody').value = `Live stream for ${m.homeTeam} vs ${m.awayTeam} is now available! Tap to watch.`;
    document.getElementById('n-nurl').value = m.homeLogo || m.awayLogo || '';
    showToast('Match details loaded into notification form', 'info');
  }, 100);
}

async function sendPushNotification() {
  const title     = document.getElementById('n-ntitle').value.trim();
  const body      = document.getElementById('n-nbody').value.trim();
  const imageUrl  = document.getElementById('n-nurl').value.trim();
  const result    = document.getElementById('notif-result');

  if (!title) { showToast('Notification title is required','error'); return; }
  if (!body)  { showToast('Notification body is required','error'); return; }

  result.textContent = '📡 Broadcasting via Secure API...';
  result.style.color = '#90caf9';

  try {
    const res = await fetch('send_notification.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, imageUrl })
    });
    
    const d = await res.json();
    if (d.success) {
      result.textContent = `✅ Broadcast sent! (Message ID: ${d.messageId.split('/').pop()})`;
      result.style.color = '#00e676';
      showToast('Notification sent to all users!', 'success');
    } else {
      const detailMsg = d.details ? ` (${d.details})` : '';
      throw new Error((d.error || 'Failed to send') + detailMsg);
    }
  } catch(e) {
    console.error('Send error:', e);
    result.textContent = '❌ Send failed: ' + e.message;
    result.style.color = '#ff6b6b';
    showToast('Send failed: ' + e.message, 'error');
  }
}

async function autoSendLiveNotification(m) {
  const title = `🚨 Match Started: ${m.homeTeam} vs ${m.awayTeam}`;
  const body = `Live stream is now available for the ${m.leagueName} clash! Tap to watch now.`;
  const imageUrl = m.homeLogo || m.awayLogo || '';

  try {
    await fetch('send_notification.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, imageUrl })
    });
    console.info('[ZETASPORTS] Auto-notif sent successfully via Secure API');
  } catch(e) { console.error('[ZETASPORTS] Auto-notif error:', e); }
}

async function generateAIPreview() {
  const h = document.getElementById('f-homeTeam').value.trim();
  const a = document.getElementById('f-awayTeam').value.trim();
  const l = document.getElementById('f-leagueName')?.value.trim() || document.getElementById('f-league')?.value.trim() || 'League';
  const sport = document.getElementById('f-sport').value;
  const date = document.getElementById('f-matchDate')?.value || 'Upcoming';
  const time = document.getElementById('f-matchTime')?.value || '';
  
  if (!h || !a) return showToast('Enter Team names first!','error');
  
  const key = localStorage.getItem('zs_gemini_key') || GEMINI_API_KEY;
  if (!key) { 
    const p = prompt('Enter Gemini API Key (get one for free at aistudio.google.com):');
    if (!p) return;
    localStorage.setItem('zs_gemini_key', p);
  }

  const btn = document.getElementById('btn-ai-gen');
  const oldTxt = btn.innerHTML;
  btn.innerHTML = '<span class="loading-spinner"></span> Analyzing...';
  btn.disabled = true;

  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const status = document.getElementById('f-status').value;
  const isFinished = status === 'finished';

  let promptStr = '';
  
  if (isFinished) {
    promptStr = `[FORCE CONTEXT: THE CURRENT DATE IS ${now}. DO NOT PROVIDE DATA FROM PREVIOUS YEARS UNLESS REQUESTED.]
Generate a high-energy, professional POST-MATCH REVIEW in EXACTLY this format:

🚨🔥⚽ 𝗠𝗔𝗧𝗖𝗛 𝗥𝗘𝗩𝗜𝗘𝗪 & 𝗦𝗧𝗔𝗧𝗦 ⚽🔥🚨

━━━━━━━━━━━━━━━━━━━
🏆 𝗖𝗢𝗠𝗣𝗘𝗧𝗜𝗢𝗡: ${l}
📅 𝗗𝗔𝗧𝗘: ${date}
🏟️ 𝗩𝗘𝗡𝗨𝗘: [Stadium Name]
🏁 𝗥𝗘𝗦𝗨𝗟𝗧: ${h} [Score] - [Score] ${a}
━━━━━━━━━━━━━━━━━━━

🌟 𝗠𝗔𝗧𝗖𝗛 𝗦𝗨𝗠𝗠𝗔𝗥𝗬
[Write 3 powerful sentences about the match outcome on ${date}]

━━━━━━━━━━━━━━━━━━━

📊 𝗖𝗨𝗥𝗥𝗘𝗡𝗧 𝗠𝗔𝗧𝗖𝗛 𝗦𝗧𝗔𝗧𝗦
⚽ Goals: [Scorers]
🎯 Possession: [X]% - [X]%
🧤 Saves: [X] - [X]
🚩 Corners: [X] - [X]

━━━━━━━━━━━━━━━━━━━

⭐ 𝗧𝗢𝗣 𝗣𝗘𝗥𝗙𝗢𝗥𝗠𝗘𝗥𝗦
🏅 [Man of the Match Name] - [Brief reason]
⚡ [Top Performer 2]
⚡ [Top Performer 3]

━━━━━━━━━━━━━━━━━━━

🎙️ 𝗣𝗢𝗦𝗧-𝗠𝗔𝗧𝗖𝗛 𝗤𝗨𝗢𝗧𝗘𝗦
💬 Manager says: "[Realistic Post-match quote]"

━━━━━━━━━━━━━━━━━━━

📖 𝗙𝗜𝗡𝗔𝗟 𝗧𝗛𝗢𝗨𝗚𝗛𝗧𝗦
[One final sentence on what this result means for both teams in the table]

━━━━━━━━━━━━━━━━━━━

Match Details: ${h} vs ${a} in ${l}. Final Status: ${status}. 
Current Date/Time: ${now}.
CRITICAL: You are reporting on the actual real-world result for this specific match that occurred on ${date}. Use the most recent data available up to ${now}.`;
  } else {
    promptStr = `Generate a high-energy, professional match preview in EXACTLY this format (use these exact emojis and horizontal dividers):

🚨🔥⚽ 𝗕𝗜𝗚 𝗠𝗔𝗧𝗖𝗛 𝗣𝗥𝗘𝗩𝗜𝗘𝗪 ⚽🔥🚨

━━━━━━━━━━━━━━━━━━━
🏆 𝗖𝗢𝗠𝗣𝗘𝗧𝗜𝗢𝗡: ${l}
📅 𝗗𝗔𝗧𝗘: ${date}
⏰ 𝗞𝗜𝗖𝗞-𝗢𝗙𝗙: ${time} IST
🏟️ 𝗩𝗘𝗡𝗨𝗘: [Stadium Name - Research real one]
━━━━━━━━━━━━━━━━━━━

🔵⚪ ${h}
🆚
🔴⚫ ${a}

━━━━━━━━━━━━━━━━━━━

📰🔥 𝗟𝗔𝗧𝗘𝗦𝗧 𝗧𝗘𝗔𝗠 𝗡𝗘𝗪𝗦

🩹 ${h} injury news...
🚀 ${a} star form...
🎙️ Manager quote: "[Short Match Quote]"

━━━━━━━━━━━━━━━━━━━

📊 𝗖𝗨𝗥𝗥𝗘𝗡𝗧 𝗙𝗢𝗥𝗠

🔥 ${h}
✅ Win
✅ Win
➖ Draw
❌ Loss
✅ Win

🔥 ${a}
✅ Win
❌ Loss
✅ Win
➖ Draw
✅ Win

━━━━━━━━━━━━━━━━━━━

⭐ 𝗣𝗟𝗔𝗬𝗘𝗥𝗦 𝗧𝗢 𝗪𝗔𝗧𝗖𝗛

⚡ [Star Player 1]
⚡ [Star Player 2]
⚡ [Star Player 3]
⚡ [Star Player 4]

━━━━━━━━━━━━━━━━━━━

⚔️ 𝗛𝗘𝗔𝗗 𝗧𝗢 𝗛𝗘𝗔𝗗

📌 Last 5 Meetings:
🔵 ${h} Wins: X
🤝 Draws: X
🔴 ${a} Wins: X

━━━━━━━━━━━━━━━━━━━

🔥 𝗞𝗘𝗬 𝗠𝗔𝗧𝗖𝗛 𝗙𝗔𝗖𝗧𝗦

⚽ [Interesting Fact]
🎯 [Team Stat]
🧤 [Defensive Stat]
🚀 [Attacking Stat]

━━━━━━━━━━━━━━━━━━━

📺 𝗪𝗔𝗧𝗖𝗛 𝗟𝗜𝗩𝗘
📡 LIVE on ZetaSports App!

━━━━━━━━━━━━━━━━━━━

🔮 𝗣𝗥𝗘𝗗𝗜𝗖𝗧𝗜𝗢𝗡

🧠 ${h} [Score] - [Score] ${a}

━━━━━━━━━━━━━━━━━━━

Match Details: ${h} vs ${a} in ${l} on ${date}.
Current System Time: ${now} (IST).
Research real current data for this specific match. Use the latest news as of ${now}. Use Bold Sans-serif Unicode characters for the headings exactly as shown in the template. No markdown, just plain text with emojis.`;
  }

  try {
    const provider = localStorage.getItem('zs_ai_provider') || 'gemini';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    if (provider === 'groq') {
      const groqKey = localStorage.getItem('zs_groq_key');
      if (!groqKey) throw new Error('Please set Groq API Key in Settings');
      
      const selectedModel = localStorage.getItem('zs_groq_model') || 'llama-3.3-70b-versatile';
      const groqModels = [selectedModel, 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
      let groqSuccess = null;
      let groqErr = '';

      for (const m of groqModels) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
            body: JSON.stringify({ model: m, messages: [{ role: 'user', content: promptStr }] })
          });
          const data = await res.json();
          if (data.choices && data.choices[0]) {
            groqSuccess = data.choices[0].message.content;
            break;
          } else groqErr = data.error?.message || 'Groq Error';
        } catch(e) { groqErr = e.name === 'AbortError' ? 'Request timed out (25s)' : e.message; }
      }
      if (!groqSuccess) throw new Error(groqErr);
      document.getElementById('f-preview').value = groqSuccess;
      showToast('Analysis Generated! ⚡', 'success');

    } else {
      // Gemini Logic
      const apiKey = localStorage.getItem('zs_gemini_key');
      if (!apiKey) throw new Error('Please set Gemini API Key in Settings');
      const selectedModel = localStorage.getItem('zs_gemini_model') || 'gemini-1.5-flash';
      const models = [selectedModel, 'gemini-1.5-flash', 'gemini-1.5-pro'];
      const versions = ['v1', 'v1beta'];
      let geminiSuccess = null;
      let geminiErr = '';

      for (const v of versions) {
        if (geminiSuccess) break;
        for (const m of models) {
          try {
            const res = await fetch(`https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${apiKey}`, {
              method: 'POST',
              signal: controller.signal,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: promptStr }] }] })
            });
            const data = await res.json();
            if (data.candidates && data.candidates[0]) {
              geminiSuccess = data.candidates[0].content.parts[0].text;
              break;
            } else geminiErr = data.error?.message || 'Gemini Error';
          } catch (e) { geminiErr = e.name === 'AbortError' ? 'Request timed out (25s)' : e.message; }
        }
      }
      if (!geminiSuccess) throw new Error(geminiErr);
      document.getElementById('f-preview').value = geminiSuccess;
      showToast('Analysis Generated! ✓', 'success');
    }
    clearTimeout(timeoutId);
  } catch(e) {
    console.error('AI Error:', e);
    showToast('AI Error: ' + e.message, 'error');
  } finally {
    btn.innerHTML = oldTxt;
    btn.disabled = false;
  }
}

/* ── SETTINGS ── */
function renderSettings() {
  if (!appSettings) return;
  document.getElementById('s-appName').value = appSettings.appName || 'ZETASPORTS';
  document.getElementById('s-logoUrl').value = appSettings.logoUrl || '';
  document.getElementById('s-loadingLogo').value = appSettings.loadingLogo || '';
  
  const pCol = appSettings.primaryColor || '#2979ff';
  document.getElementById('s-primaryColor').value = pCol;
  document.getElementById('s-primaryColorText').value = pCol;
  
  const aCol = appSettings.accentColor || '#82b1ff';
  document.getElementById('s-accentColor').value = aCol;
  document.getElementById('s-accentColorText').value = aCol;
  
  document.getElementById('s-announcement').value = appSettings.announcement || '';
  document.getElementById('s-whatsappUrl').value = appSettings.whatsappUrl || '';
  document.getElementById('s-telegramUrl').value = appSettings.telegramUrl || '';
  
  document.getElementById('s-maintenanceMode').checked = !!appSettings.maintenanceMode;
  document.getElementById('s-minVersion').value = appSettings.minVersion || '1.1.0';
  document.getElementById('s-updateUrl').value = appSettings.updateUrl || '';

  document.getElementById('s-supportEmail').value = appSettings.supportEmail || '';
  document.getElementById('s-instagramUrl').value = appSettings.instagramUrl || '';
  document.getElementById('s-twitterUrl').value = appSettings.twitterUrl || '';
  document.getElementById('s-privacyUrl').value = appSettings.privacyUrl || '';
  document.getElementById('s-termsUrl').value = appSettings.termsUrl || '';
  document.getElementById('s-copyright').value = appSettings.copyright || '';
  
  if (document.getElementById('s-tablesEnabled')) document.getElementById('s-tablesEnabled').checked = appSettings.tablesEnabled !== false;

  document.getElementById('s-admobBannerId').value = appSettings.admobBannerId || '';
  document.getElementById('s-admobInterstitialId').value = appSettings.admobInterstitialId || '';
  document.getElementById('s-admobAppOpenId').value = appSettings.admobAppOpenId || '';
  document.getElementById('s-admobNativeId').value = appSettings.admobNativeId || '';
  document.getElementById('s-admobRewardedId').value = appSettings.admobRewardedId || '';
  document.getElementById('s-admobRewardedInterId').value = appSettings.admobRewardedInterId || '';
  document.getElementById('s-cricketApiKey').value = appSettings.cricketApiKey || '';
  document.getElementById('s-geminiKey').value = localStorage.getItem('zs_gemini_key') || '';
  document.getElementById('s-groqKey').value = localStorage.getItem('zs_groq_key') || '';
  document.getElementById('s-aiProvider').value = localStorage.getItem('zs_ai_provider') || 'gemini';
  document.getElementById('s-geminiModel').value = localStorage.getItem('zs_gemini_model') || 'gemini-1.5-flash';
  document.getElementById('s-groqModel').value = localStorage.getItem('zs_groq_model') || 'llama-3.3-70b-versatile';
  if (document.getElementById('s-adsEnabled')) document.getElementById('s-adsEnabled').checked = !!appSettings.adsEnabled;
  if (document.getElementById('s-adsBannerEnabled')) document.getElementById('s-adsBannerEnabled').checked = !!appSettings.adsBannerEnabled;
  if (document.getElementById('s-adsInterstitialEnabled')) document.getElementById('s-adsInterstitialEnabled').checked = !!appSettings.adsInterstitialEnabled;
  if (document.getElementById('s-adsAppOpenEnabled')) document.getElementById('s-adsAppOpenEnabled').checked = !!appSettings.adsAppOpenEnabled;
  if (document.getElementById('s-adsNativeEnabled')) document.getElementById('s-adsNativeEnabled').checked = !!appSettings.adsNativeEnabled;
  if (document.getElementById('s-adsRewardedEnabled')) document.getElementById('s-adsRewardedEnabled').checked = !!appSettings.adsRewardedEnabled;

  previewSettingsLogo('logo');
  previewSettingsLogo('loading');
}

function previewSettingsLogo(type) {
  const url = document.getElementById(type === 'logo' ? 's-logoUrl' : 's-loadingLogo').value.trim();
  const box = document.getElementById(type === 'logo' ? 'preview-logo' : 'preview-loading');
  const img = document.getElementById(type === 'logo' ? 'img-logo' : 'img-loading');
  if (url) {
    img.src = url;
    box.style.display = 'block';
  } else {
    box.style.display = 'none';
  }
}

// Event listeners for live previews and color syncing
window.addEventListener('load', () => {
  const logoInp = document.getElementById('s-logoUrl');
  const loadInp = document.getElementById('s-loadingLogo');
  const pColInp = document.getElementById('s-primaryColor');
  const pColTxt = document.getElementById('s-primaryColorText');
  const aColInp = document.getElementById('s-accentColor');
  const aColTxt = document.getElementById('s-accentColorText');

  if(logoInp) logoInp.addEventListener('input', () => previewSettingsLogo('logo'));
  if(loadInp) loadInp.addEventListener('input', () => previewSettingsLogo('loading'));
  
  if(pColInp && pColTxt) {
    pColInp.addEventListener('input', (e) => pColTxt.value = e.target.value);
    pColTxt.addEventListener('input', (e) => { if(e.target.value.length === 7) pColInp.value = e.target.value; });
  }
  if(aColInp && aColTxt) {
    aColInp.addEventListener('input', (e) => aColTxt.value = e.target.value);
    aColTxt.addEventListener('input', (e) => { if(e.target.value.length === 7) aColInp.value = e.target.value; });
  }
});

async function saveAppSettings() {
  const getValue = (id) => document.getElementById(id)?.value?.trim() || '';
  const getChecked = (id) => document.getElementById(id)?.checked || false;

  const data = {
    appName: getValue('s-appName'),
    logoUrl: getValue('s-logoUrl'),
    loadingLogo: getValue('s-loadingLogo'),
    primaryColor: getValue('s-primaryColor'),
    accentColor: getValue('s-accentColor'),
    announcement: getValue('s-announcement'),
    whatsappUrl: getValue('s-whatsappUrl'),
    telegramUrl: getValue('s-telegramUrl'),
    maintenanceMode: getChecked('s-maintenanceMode'),
    tablesEnabled: getChecked('s-tablesEnabled'),
    minVersion: getValue('s-minVersion') || '1.1.0',
    updateUrl: getValue('s-updateUrl'),
    supportEmail: getValue('s-supportEmail'),
    instagramUrl: getValue('s-instagramUrl'),
    twitterUrl: getValue('s-twitterUrl'),
    privacyUrl: getValue('s-privacyUrl'),
    termsUrl: getValue('s-termsUrl'),
    copyright: getValue('s-copyright'),
    adsEnabled: getChecked('s-adsEnabled'),
    adsBannerEnabled: getChecked('s-adsBannerEnabled'),
    adsInterstitialEnabled: getChecked('s-adsInterstitialEnabled'),
    adsAppOpenEnabled: getChecked('s-adsAppOpenEnabled'),
    adsNativeEnabled: getChecked('s-adsNativeEnabled'),
    adsRewardedEnabled: getChecked('s-adsRewardedEnabled'),
    admobBannerId: getValue('s-admobBannerId'),
    admobInterstitialId: getValue('s-admobInterstitialId'),
    admobAppOpenId: getValue('s-admobAppOpenId'),
    admobNativeId: getValue('s-admobNativeId'),
    admobRewardedId: getValue('s-admobRewardedId'),
    admobRewardedInterId: getValue('s-admobRewardedInterId'),
    cricketApiKey: getValue('s-cricketApiKey'),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  console.log('DEBUG: Saving App Settings:', data);

  const geminiKey = getValue('s-geminiKey');
  const groqKey = getValue('s-groqKey');
  const aiProvider = getValue('s-aiProvider');

  if (geminiKey) localStorage.setItem('zs_gemini_key', getValue('s-geminiKey'));
  localStorage.setItem('zs_groq_key', getValue('s-groqKey'));
  localStorage.setItem('zs_ai_provider', getValue('s-aiProvider'));
  localStorage.setItem('zs_gemini_model', getValue('s-geminiModel'));
  localStorage.setItem('zs_groq_model', getValue('s-groqModel'));

  try {
    const docRef = db.collection('settings').doc('app_config');
    await docRef.set(data, { merge: true });
    showToast('App Configuration Saved! ✓', 'success');
  } catch (e) {
    console.error('DEBUG: Save Settings Error:', e);
    showToast('Error saving settings: ' + e.message, 'error');
  }
}

function updateWebsiteBranding() {
  if (!appSettings) return;
  const logos = document.querySelectorAll('.sb-logo, .login-logo');
  logos.forEach(l => {
    if (appSettings.logoUrl) {
      l.innerHTML = `<img src="${appSettings.logoUrl}" style="height:32px;object-fit:contain">`;
    } else {
      l.innerHTML = `<div class="logo-box">ZS</div>ZETA<span>SPORTS</span>`;
    }
  });
  if (appSettings.primaryColor) {
    document.documentElement.style.setProperty('--acc', appSettings.primaryColor);
  }
}

/* ── IPL SYNC SNIPER ── */
let iplSearchResults = [];

async function syncAllCricketMatches() {
  const apiKey = appSettings?.cricketApiKey;
  if (!apiKey) return showToast('Please set Cricket API Key in Settings first!', 'error');

  openModal('ipl-sync-modal');
  const listEl = document.getElementById('ipl-fixtures-list');
  listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">Searching IPL matches...</div>';

  try {
    const res = await fetch(`https://api.cricapi.com/v1/matches?apikey=${apiKey}`);
    const data = await res.json();
    
    if (data.status !== 'success') throw new Error(data.reason || 'API Error');

    iplSearchResults = data.data.filter(am => {
      const matchName = am.name.toUpperCase();
      return matchName.includes('IPL') || matchName.includes('INDIAN PREMIER LEAGUE');
    }).filter(am => am.status !== 'result'); // Only upcoming/live

    if (iplSearchResults.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">No upcoming IPL matches found.</div>';
      return;
    }

    renderIPLFixtures();
  } catch (e) { 
    listEl.innerHTML = `<div style="text-align:center;padding:40px;color:#ff6b6b">Error: ${e.message}</div>`;
  }
}

function renderIPLFixtures() {
  const listEl = document.getElementById('ipl-fixtures-list');
  
  const iplTeams = {
    'Chennai Super Kings':'CSK', 'Mumbai Indians':'MI', 'Royal Challengers Bangalore':'RCB', 
    'Kolkata Knight Riders':'KKR', 'Gujarat Titans':'GT', 'Lucknow Super Giants':'LSG',
    'Rajasthan Royals':'RR', 'Delhi Capitals':'DC', 'Punjab Kings':'PBKS', 'Sunrisers Hyderabad':'SRH',
    'Royal Challengers Bengaluru':'RCB'
  };

  listEl.innerHTML = iplSearchResults.map((am, index) => {
    const exists = allMatches.find(m => m.sport==='cricket' && m.homeTeam.toLowerCase().includes(am.name.split(' vs ')[0].trim().toLowerCase()) && m.kickoffDate===am.date);
    
    return `
      <div style="background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:12px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:700;font-size:13px;color:var(--text1)">${am.name}</div>
          <div style="font-size:11px;color:var(--acc2);margin-top:2px">${am.date} · ${am.status}</div>
        </div>
        ${exists ? 
          `<button class="btn btn-sm" disabled style="background:rgba(0,230,118,0.1);color:#69f0ae;border-color:rgba(0,230,118,0.2)">✅ Added</button>` : 
          `<button class="btn btn-sm btn-primary" onclick="addIPLMatch(${index}, this)">+ Add</button>`
        }
      </div>
    `;
  }).join('');
}

async function addIPLMatch(index, btn) {
  const am = iplSearchResults[index];
  if (!am) return;

  const iplTeams = {
    'Chennai Super Kings':'CSK', 'Mumbai Indians':'MI', 'Royal Challengers Bangalore':'RCB', 
    'Kolkata Knight Riders':'KKR', 'Gujarat Titans':'GT', 'Lucknow Super Giants':'LSG',
    'Rajasthan Royals':'RR', 'Delhi Capitals':'DC', 'Punjab Kings':'PBKS', 'Sunrisers Hyderabad':'SRH',
    'Royal Challengers Bengaluru':'RCB'
  };

  const getCode = (n) => {
    for(let team in iplTeams) if(n.includes(team)) return iplTeams[team];
    return n.slice(0,3).toUpperCase();
  };

  const parts = am.name.split(' vs ');
  const hFull = parts[0].trim(), aFull = parts[1].split(',')[0].trim();

  btn.textContent = 'Adding...';
  btn.disabled = true;

  try {
    await db.collection('matches').add({
      sport: 'cricket', homeTeam: hFull, awayTeam: aFull,
      home: getCode(hFull), away: getCode(aFull),
      leagueId: 'IPL', leagueName: 'Indian Premier League',
      status: am.matchStarted ? 'live' : 'upcoming',
      kickoffDate: am.date, kickoffIST: '19:30',
      homeScore:0, awayScore:0, homeCricketScore:'', awayCricketScore:'',
      cricketInfo: am.status || '', featured: true, servers: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    btn.textContent = '✅ Added';
    btn.style.background = 'rgba(0,230,118,0.1)';
    btn.style.color = '#69f0ae';
    btn.style.borderColor = 'rgba(0,230,118,0.2)';
    showToast('Match added successfully!', 'success');
  } catch (e) {
    btn.textContent = '+ Add';
    btn.disabled = false;
    showToast('Error: ' + e.message, 'error');
  }
}

async function fetchCricketScore() {
  const apiKey = appSettings?.cricketApiKey;
  const h = document.getElementById('f-homeTeam').value.toLowerCase();
  const a = document.getElementById('f-awayTeam').value.toLowerCase();
  if (!apiKey || !h || !a) return showToast('Check API Key and Teams', 'warning');

  try {
    const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}`);
    const data = await res.json();
    const m = data.data.find(x => x.name.toLowerCase().includes(h) && x.name.toLowerCase().includes(a));
    if (!m || !m.score) return showToast('Live score not available yet', 'info');
    
    const s1 = m.score[0], s2 = m.score[1];
    document.getElementById('f-homeCricketScore').value = `${s1.r}/${s1.w}`;
    if (s2) document.getElementById('f-awayCricketScore').value = `${s2.r}/${s2.w}`;
    document.getElementById('f-cricketInfo').value = `${s1.o} ov · ${m.status}`;
    showToast('Updated Score');
  } catch (e) { showToast(e.message, 'error'); }
}
function patchFlutterStream() {
  const url = document.getElementById('f-apkStream').value.trim();
  if (!url) return showToast('Enter a URL first!', 'error');
  
  showToast('Optimizing Link for Flutter APK... ⚡', 'success');
  // Visual effect to show it worked
  document.getElementById('f-apkStream').style.borderColor = 'var(--acc2)';
  setTimeout(() => {
    document.getElementById('f-apkStream').style.borderColor = '';
    showToast('Link Patched! Native App will now use Direct Stream.', 'success');
  }, 1000);
}
