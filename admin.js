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

async function fetchMatchesFromApi() {
  const apiKey = document.getElementById('api-key').value.trim();
  if(!apiKey) { showToast('API key required','error'); return; }
  
  localStorage.setItem('zs_football_data_key', apiKey);
  const comp = document.getElementById('api-competition').value;
  const days = parseInt(document.getElementById('api-days').value) || 3;
  
  const btn = document.getElementById('btn-fetch-run');
  btn.textContent = 'Fetching...'; btn.disabled = true;

  try {
    const today = new Date();
    const future = new Date(); future.setDate(today.getDate() + days);
    
    // YYYY-MM-DD format
    const d1 = today.toISOString().split('T')[0];
    const d2 = future.toISOString().split('T')[0];



    const url = `/api/football/competitions/${comp}/matches?dateFrom=${d1}&dateTo=${d2}`;
    
    const res = await fetch(url, { headers: { 'X-Auth-Token': apiKey } });
    const data = await res.json();
    
    if(!res.ok) throw new Error(data.message || 'API Error');
    if(!data.matches || data.matches.length === 0) {
      showToast('No upcoming matches found in this date range.', 'error');
      btn.textContent = 'Start Fetch'; btn.disabled = false;
      return;
    }

    let added = 0, updated = 0;
    for(let m of data.matches) {
      const matchDateObj = new Date(m.utcDate);
      const hrs = matchDateObj.getHours().toString().padStart(2, '0');
      const mins = matchDateObj.getMinutes().toString().padStart(2, '0');
      const dateStr = matchDateObj.toISOString().split('T')[0];

      // Check if match already exists (same teams on same day)
      const isExist = allMatches.find(x => 
        (x.homeTeam === m.homeTeam.name || x.home === m.homeTeam.tla) && 
        x.kickoffDate === dateStr
      );

      const matchData = {
        homeTeam: m.homeTeam.name, awayTeam: m.awayTeam.name,
        home: m.homeTeam.tla || m.homeTeam.shortName || m.homeTeam.name.substring(0,3).toUpperCase(),
        away: m.awayTeam.tla || m.awayTeam.shortName || m.awayTeam.name.substring(0,3).toUpperCase(),
        homeLogo: m.homeTeam.crest || '',
        awayLogo: m.awayTeam.crest || '',
        leagueId: comp === 'PL' ? 'EPL' : comp === 'CL' ? 'UCL' : comp === 'BL1' ? 'BUNDESLIGA' : comp === 'SA' ? 'SERIEA' : comp === 'PD' ? 'LALIGA' : comp === 'FL1' ? 'LIGUE1' : comp,
        kickoffDate: dateStr,
        kickoffIST: `${hrs}:${mins}`,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if(isExist) {
        // Update existing match (status, scores, etc. are preserved unless you want to override)
        await db.collection('matches').doc(isExist.id).update(matchData);
        updated++;
      } else {
        // Add new match
        const newMatch = {
          ...matchData,
          status: 'upcoming',
          homeScore: 0, awayScore: 0,
          featured: false, servers: [], preview: '', minute: '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('matches').add(newMatch);
        added++;
      }
    }
    
    closeModal('fetch-modal');
    showToast(`Done! Added ${added} new and updated ${updated} existing match(es).`, 'success');
  } catch(err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Start Fetch'; btn.disabled = false;
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
    logo: document.getElementById('lg-logo').value.trim()
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
  t.textContent = msg;
  t.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ t.className=''; },3000);
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
    const res = await fetch('/api/send-notification', {
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
    await fetch('/api/send-notification', {
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
  const l = document.getElementById('f-leagueName').value.trim() || LEAGUES_MAP[document.getElementById('f-leagueId').value];
  
  if (!h || !a) { showToast('Enter Team names first!','error'); return; }
  
  const key = localStorage.getItem('zs_gemini_key') || GEMINI_API_KEY;
  if (!key) { 
    const p = prompt('Please enter your Gemini API Key (get one for free at aistudio.google.com):');
    if (!p) return;
    localStorage.setItem('zs_gemini_key', p);
  }

  const btn = document.querySelector('[onclick="generateAIPreview()"]');
  const oldTxt = btn.textContent;
  btn.textContent = '⌛ Generating...';
  btn.disabled = true;

  const promptStr = `Write a short, engaging 2-paragraph football match preview for ${h} vs ${a} in the ${l}. Include form summary and key prediction. No markdown, just plain text.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${localStorage.getItem('zs_gemini_key')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptStr }] }] })
    });
    const data = await res.json();
    const text = data.candidates[0].content.parts[0].text;
    document.getElementById('f-preview').value = text;
    showToast('AI Preview Generated! ✓', 'success');
  } catch(e) {
    showToast('AI Error: ' + e.message, 'error');
  } finally {
    btn.textContent = oldTxt;
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

  document.getElementById('s-admobBannerId').value = appSettings.admobBannerId || '';
  document.getElementById('s-admobInterstitialId').value = appSettings.admobInterstitialId || '';
  document.getElementById('s-admobAppOpenId').value = appSettings.admobAppOpenId || '';
  document.getElementById('s-admobNativeId').value = appSettings.admobNativeId || '';
  document.getElementById('s-admobRewardedId').value = appSettings.admobRewardedId || '';
  document.getElementById('s-admobRewardedInterId').value = appSettings.admobRewardedInterId || '';
  document.getElementById('s-cricketApiKey').value = appSettings.cricketApiKey || '';
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
