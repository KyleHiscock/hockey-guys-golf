// V4.9.9 polish layer — commissioner note + league leaders + full league attendance + roster-only handicap tracker
// buildDashboard, buildResults, buildSchedule handled by public.js — do NOT add them here

// ── Constants ─────────────────────────────────────────────────────────────────
const COMMISSIONER_NOTE_KEY = 'hggl2026_commissioner_note';
const ATTENDANCE_KEY        = 'hggl2026_bar_attendance';   // localStorage fallback only
const DEFAULT_COMMISSIONER_NOTE = 'Week 1 starts Tuesday, May 5. Please arrive early, check in with your group, and make sure GHIN scores are posted after the round.';

// Full player roster — keep in sync with DEFAULT_TEAMS in admin.js
const ALL_PLAYERS = [
  'Ritzy','Robby D',
  'Gener','Tony',
  'Hick','Greg',
  'Kyle','Gracey',
  'Drexy','Nick',
  'Ando','Kendrick',
  'CJ','Justyn',
  'Tank','Bob',
];
const LEAGUE_PLAYER_SET = new Set(ALL_PLAYERS.map(name => String(name).trim().toLowerCase()));
function isLeaguePlayerName(name) {
  return LEAGUE_PLAYER_SET.has(String(name || '').trim().toLowerCase());
}

function escapeLeagueHtml(value) {
  return String(value || '').replace(/[&<>"']/g, ch =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

// ── Shared live data stores (populated from Sheets) ───────────────────────────
var ATTENDANCE_DATA_LIVE = null;
var HANDICAP_DATA_LIVE   = null;

function applyAttendanceFromSheet(data) {
  ATTENDANCE_DATA_LIVE = (data.attendance || []).filter(r => r.Week && r.Player);
}

function applyHandicapFromSheet(data) {
  HANDICAP_DATA_LIVE = (data.handicap || []).filter(r => r.Week && r.Player && r.GHINIndex !== '');
}

// ── Commissioner Note ─────────────────────────────────────────────────────────
function getCommissionerNote() {
  try {
    const saved = localStorage.getItem(COMMISSIONER_NOTE_KEY);
    return saved && saved.trim() ? saved : DEFAULT_COMMISSIONER_NOTE;
  } catch (err) {
    return DEFAULT_COMMISSIONER_NOTE;
  }
}

async function saveCommissionerNote() {
  const field = document.getElementById('commissioner-note-field');
  const msg   = document.getElementById('commissioner-note-success');
  if (!field) return;
  try {
    const note = field.value.trim();
    if (typeof postLeagueAction === 'function' && USE_GOOGLE_SHEETS_SYNC) {
      await postLeagueAction('saveCommissionerNote', { note });
      await fetchLeagueDataFromSheets(true);
    } else {
      localStorage.setItem(COMMISSIONER_NOTE_KEY, note);
    }
    if (msg) { msg.textContent = 'Commissioner note saved.'; msg.style.display = 'block'; }
    rebuildAll();
  } catch (err) {
    if (msg) { msg.textContent = 'Could not save: ' + err.message; msg.style.display = 'block'; }
  }
}

async function clearCommissionerNote() {
  const field = document.getElementById('commissioner-note-field');
  const msg   = document.getElementById('commissioner-note-success');
  try {
    if (field) field.value = DEFAULT_COMMISSIONER_NOTE;
    if (typeof postLeagueAction === 'function' && USE_GOOGLE_SHEETS_SYNC) {
      await postLeagueAction('saveCommissionerNote', { note: DEFAULT_COMMISSIONER_NOTE });
      await fetchLeagueDataFromSheets(true);
    } else {
      localStorage.removeItem(COMMISSIONER_NOTE_KEY);
    }
    if (msg) { msg.textContent = 'Commissioner note reset.'; msg.style.display = 'block'; }
    rebuildAll();
  } catch (err) {
    if (msg) { msg.textContent = 'Could not reset: ' + err.message; msg.style.display = 'block'; }
  }
}

function initCommissionerNoteEditor() {
  const field = document.getElementById('commissioner-note-field');
  if (field) field.value = getCommissionerNote();
}

function formatLastUpdated() {
  if (!RESULTS || !RESULTS.length) {
    return (typeof LEAGUE_DATA_SOURCE !== 'undefined' && LEAGUE_DATA_SOURCE === 'Google Sheets')
      ? 'Synced from Google Sheets.'
      : 'Standings update after Week 1 results are entered.';
  }
  const lastWeek = Math.max(...RESULTS.map(r => parseInt(r.week) || 0));
  return 'Updated through Week ' + lastWeek + '.';
}

// ── League Leaders (Top 3) ────────────────────────────────────────────────────
function getTopNTiers(sortedList, valueKey, n) {
  const tiers = [];
  let lastVal  = null;
  for (const p of sortedList) {
    const val = typeof valueKey === 'function' ? valueKey(p) : p[valueKey];
    if (lastVal !== null && Math.abs(val - lastVal) < 0.001) {
      tiers[tiers.length - 1].players.push(p);
    } else {
      if (tiers.length >= n) break;
      tiers.push({ value: val, players: [p] });
      lastVal = val;
    }
  }
  return tiers;
}

function getLeagueLeaders() {
  if (typeof computePlayerStats !== 'function') return null;
  const players = computePlayerStats();
  const list    = Object.values(players).filter(p => p.roundsPlayed > 0);
  if (!list.length) return null;

  const byGross = [...list].sort((a,b) =>
    (a.totalGross / a.roundsPlayed) - (b.totalGross / b.roundsPlayed));
  const lowGrossTiers = getTopNTiers(byGross, p => p.totalGross / p.roundsPlayed, 3);

  const withNet = list.filter(p => (p.totalNet || 0) > 0);
  const byNet   = [...withNet].sort((a,b) =>
    (a.totalNet / a.roundsPlayed) - (b.totalNet / b.roundsPlayed));
  const lowNetTiers = getTopNTiers(byNet, p => p.totalNet / p.roundsPlayed, 3);

  const withBirdies     = list.filter(p => (p.netBirdies || 0) > 0);
  const byBirdies       = [...withBirdies].sort((a,b) => (b.netBirdies||0) - (a.netBirdies||0));
  const mostBirdieTiers = getTopNTiers(byBirdies, p => p.netBirdies || 0, 3);

  return { lowGrossTiers, lowNetTiers, mostBirdieTiers };
}

const LEADER_MEDALS = ['🥇','🥈','🥉'];

function buildLeaderCategory(label, tiers, formatVal) {
  if (!tiers || !tiers.length) {
    return '<div class="leaders-category">' +
      '<div class="leaders-cat-label">' + label + '</div>' +
      '<div class="leaders-cat-empty">—</div>' +
    '</div>';
  }
  const rows = tiers.map((tier, i) => {
    const medal = LEADER_MEDALS[i] || (i + 1);
    const names = tier.players.map(p => escapeLeagueHtml(p.name)).join(' &amp; ');
    const val   = formatVal(tier.value);
    return '<div class="leaders-top3-row">' +
      '<span class="leaders-medal">' + medal + '</span>' +
      '<span class="leaders-top3-name">' + names + '</span>' +
      '<span class="leaders-top3-val">' + val + '</span>' +
    '</div>';
  }).join('');
  return '<div class="leaders-category">' +
    '<div class="leaders-cat-label">' + label + '</div>' +
    rows +
  '</div>';
}

function buildLeadersCardHTML() {
  const ll = getLeagueLeaders();
  if (!ll) return '<div class="dash-sub" style="margin-top:8px;">Leaders will appear after Week 1 scores are entered.</div>';
  return '<div class="leaders-top3-wrap">' +
    buildLeaderCategory('Low Gross Avg',  ll.lowGrossTiers,   v => v.toFixed(1)) +
    buildLeaderCategory('Low Net Avg',    ll.lowNetTiers,     v => v.toFixed(1)) +
    buildLeaderCategory('Net Birdies',    ll.mostBirdieTiers, v => v) +
  '</div>';
}

// ── Bar Attendance ────────────────────────────────────────────────────────────
function getAttendanceData() {
  if (ATTENDANCE_DATA_LIVE && ATTENDANCE_DATA_LIVE.length) {
    const weeks = {};
    ATTENDANCE_DATA_LIVE.forEach(r => {
      const wk   = String(parseInt(r.Week, 10));
      const name = String(r.Player || '').trim();
      const came = String(r.AtBar || '').trim().toLowerCase() === 'yes';
      if (!wk || !name) return;
      if (!weeks[wk]) weeks[wk] = {};
      weeks[wk][name] = came;
    });
    return { weeks, source: 'sheets' };
  }
  try {
    const raw = localStorage.getItem(ATTENDANCE_KEY);
    if (!raw) return { weeks: {}, source: 'local' };
    const parsed = JSON.parse(raw) || {};
    return { weeks: parsed.weeks || {}, source: 'local' };
  } catch (e) {
    return { weeks: {}, source: 'local' };
  }
}

function computeAttendanceStats() {
  const data     = getAttendanceData();
  const weeks    = data.weeks || {};
  const weekNums = Object.keys(weeks).map(Number).sort((a,b) => a - b);
  if (!weekNums.length) return [];

  const stats = {};
  ALL_PLAYERS.forEach(name => {
    stats[name] = { name, weeksTracked: 0, weeksAtBar: 0, streak: 0, perfectSoFar: false };
  });

  weekNums.forEach(wk => {
    const wkData = weeks[String(wk)] || {};
    ALL_PLAYERS.forEach(name => {
      if (!(name in wkData)) return;
      stats[name].weeksTracked++;
      if (wkData[name]) stats[name].weeksAtBar++;
    });
  });

  ALL_PLAYERS.forEach(name => {
    let streak = 0, active = true;
    for (let i = weekNums.length - 1; i >= 0; i--) {
      const wkData = weeks[String(weekNums[i])] || {};
      if (!(name in wkData)) continue;
      if (active && wkData[name]) { streak++; }
      else { active = false; }
    }
    stats[name].streak = streak;
    stats[name].perfectSoFar = stats[name].weeksTracked > 0 &&
      stats[name].weeksAtBar === stats[name].weeksTracked;
  });

  return Object.values(stats).filter(p => p.weeksTracked > 0);
}

function buildAttendanceCardHTML() {
  const all = computeAttendanceStats();
  if (!all.length) {
    return '<div class="dash-sub" style="margin-top:8px;">Bar attendance will appear after Week 1 is entered. 🍺</div>';
  }

  const sorted = [...all].sort((a,b) => {
    const pctA = a.weeksTracked > 0 ? (a.weeksAtBar / a.weeksTracked) : 0;
    const pctB = b.weeksTracked > 0 ? (b.weeksAtBar / b.weeksTracked) : 0;
    return pctB - pctA || b.weeksAtBar - a.weeksAtBar || b.streak - a.streak || a.name.localeCompare(b.name);
  });

  const totalWeeks = Math.max.apply(null, sorted.map(p => p.weeksTracked || 0));
  const maxPct = Math.max.apply(null, sorted.map(p => p.weeksTracked > 0 ? p.weeksAtBar / p.weeksTracked : 0));
  const maxCount = Math.max.apply(null, sorted.map(p => p.weeksAtBar || 0));
  const minPct = Math.min.apply(null, sorted.map(p => p.weeksTracked > 0 ? p.weeksAtBar / p.weeksTracked : 0));
  const minCount = Math.min.apply(null, sorted.map(p => p.weeksAtBar || 0));

  function attendanceStatusBadge(p) {
    const pct = p.weeksTracked > 0 ? (p.weeksAtBar / p.weeksTracked) : 0;
    const isTop = pct === maxPct && p.weeksAtBar === maxCount && p.weeksAtBar > 0;
    const isBottom = sorted.length > 1 && pct === minPct && p.weeksAtBar === minCount;
    if (isBottom) return '<span class="att-status att-status-ghost" title="Bottom of the bar attendance standings">👻</span>';
    if (isTop) return '<span class="att-status att-status-fire" title="Top of the bar attendance standings">🔥</span>';
    return '<span class="att-status att-status-cold" title="Middle of the pack">🥶</span>';
  }

  function attendRow(p, index) {
    const statusBadge = attendanceStatusBadge(p);
    const pct      = p.weeksTracked > 0 ? Math.round((p.weeksAtBar / p.weeksTracked) * 100) : 0;
    const barColor = pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : 'var(--ice)';
    const barWidth = Math.max(pct, 4);
    return '<div class="att-row">' +
      '<span class="att-medal">' + (index + 1) + '</span>' +
      '<div class="att-info">' +
        '<span class="att-name">' + escapeLeagueHtml(p.name) + statusBadge + '</span>' +
        '<div class="att-bar-wrap"><div class="att-bar" style="width:' + barWidth + '%;background:' + barColor + '"></div></div>' +
      '</div>' +
      '<span class="att-count">' + p.weeksAtBar + '<span class="att-of">/' + p.weeksTracked + '</span></span>' +
    '</div>';
  }

  const rows = sorted.map(attendRow).join('');
  return '<div class="att-section att-full-section">' +
    '<div class="att-section-label">🍺 Full League Attendance' + (totalWeeks ? ' · ' + totalWeeks + ' Week' + (totalWeeks === 1 ? '' : 's') : '') + '</div>' +
    rows +
  '</div>';
}

// ── Handicap Tracker ──────────────────────────────────────────────────────────
function computeHandicapStats() {
  if (!HANDICAP_DATA_LIVE || !HANDICAP_DATA_LIVE.length) return [];

  const byPlayer = {};
  HANDICAP_DATA_LIVE.forEach(r => {
    const name = String(r.Player || '').trim();
    const wk   = parseInt(r.Week, 10);
    const idx  = parseFloat(r.GHINIndex);
    if (!name || isNaN(wk) || isNaN(idx)) return;
    // Do not show subs in the public handicap tracker. The tracker is for regular league players only.
    if (!isLeaguePlayerName(name)) return;
    if (!byPlayer[name]) byPlayer[name] = [];
    byPlayer[name].push({ week: wk, index: idx });
  });

  const stats = [];
  Object.entries(byPlayer).forEach(([name, entries]) => {
    if (!entries.length) return;
    entries.sort((a,b) => a.week - b.week);

    // Dedupe: multiple entries same week → keep last
    const deduped = [];
    entries.forEach(e => {
      const last = deduped[deduped.length - 1];
      if (last && last.week === e.week) { last.index = e.index; }
      else { deduped.push({ ...e }); }
    });

    if (!deduped.length) return;
    const first    = deduped[0].index;
    const current  = deduped[deduped.length - 1].index;
    const hasTrend = deduped.length >= 2;
    const change   = hasTrend ? parseFloat((current - first).toFixed(1)) : null;
    stats.push({ name, first, current, change, hasTrend, history: deduped });
  });

  return stats;
}

function buildHandicapCardHTML() {
  const all = computeHandicapStats();
  if (!all.length) {
    return '<div class="dash-sub" style="margin-top:8px;">Handicap tracker will appear after GHIN indexes are saved.</div>';
  }

  const sorted = [...all].sort((a,b) => {
    if (a.hasTrend && b.hasTrend) return a.change - b.change || a.current - b.current || a.name.localeCompare(b.name);
    if (a.hasTrend !== b.hasTrend) return a.hasTrend ? -1 : 1;
    return a.current - b.current || a.name.localeCompare(b.name);
  });

  function hdcpRow(p, index) {
    let changeHtml = '<span class="hcp-change" style="color:var(--muted)">New</span>';
    if (p.hasTrend) {
      const sign       = p.change > 0 ? '+' : '';
      const arrow      = p.change < 0 ? '↓' : p.change > 0 ? '↑' : '→';
      const arrowColor = p.change < 0 ? 'var(--green)' : p.change > 0 ? 'var(--red)' : 'var(--muted)';
      const changeStr  = sign + p.change.toFixed(1);
      changeHtml = '<span class="hcp-change" style="color:' + arrowColor + '">' + arrow + ' ' + changeStr + '</span>';
    }
    return '<div class="hcp-row">' +
      '<span class="att-medal">' + (index + 1) + '</span>' +
      '<div class="att-info">' +
        '<span class="att-name">' + escapeLeagueHtml(p.name) + '</span>' +
        '<span class="hcp-detail">' + p.first.toFixed(1) + ' → <strong style="color:#fff">' + p.current.toFixed(1) + '</strong></span>' +
      '</div>' +
      changeHtml +
    '</div>';
  }

  return '<div class="att-section hcp-full-section">' +
    '<div class="att-section-label">📊 Full League Handicap Tracker</div>' +
    sorted.map(hdcpRow).join('') +
  '</div>';
}

// ── Admin: Attendance Editor ──────────────────────────────────────────────────
function buildAttendanceEditor() {
  const container = document.getElementById('attendance-tab');
  if (!container) return;

  const data        = getAttendanceData();
  const weeks       = data.weeks || {};
  const resultWeeks = (typeof RESULTS !== 'undefined' && RESULTS.length)
    ? [...new Set(RESULTS.map(r => r.week).filter(Boolean))].sort((a,b) => a - b)
    : [];
  const trackedWeeks = Object.keys(weeks).map(Number).sort((a,b) => a - b);
  const allWeekNums  = [...new Set([...resultWeeks, ...trackedWeeks])].sort((a,b) => a - b);
  if (!allWeekNums.length) allWeekNums.push(1);

  const selectedWeek = window._attEditorWeek || allWeekNums[allWeekNums.length - 1] || 1;
  window._attEditorWeek = selectedWeek;

  const weekOpts   = allWeekNums.map(w =>
    `<option value="${w}" ${w === selectedWeek ? 'selected' : ''}>Week ${w}</option>`).join('');
  const nextWeek   = Math.max(...allWeekNums) + 1;
  const newWeekOpt = `<option value="${nextWeek}">Week ${nextWeek} (new)</option>`;
  const wkData     = weeks[String(selectedWeek)] || {};
  const syncNote   = (typeof USE_GOOGLE_SHEETS_SYNC !== 'undefined' && USE_GOOGLE_SHEETS_SYNC)
    ? '<span style="color:var(--green);font-size:11px;letter-spacing:.5px;">● Synced to Google Sheets</span>'
    : '<span style="color:var(--gold);font-size:11px;letter-spacing:.5px;">⚠ Local only — Sheets unavailable</span>';

  const checkboxes = ALL_PLAYERS.map(name => {
    const checked = wkData[name] === true ? 'checked' : '';
    const safeId  = 'att_' + name.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
    return `<label class="att-check-label">
      <input type="checkbox" id="${safeId}" data-player="${escapeLeagueHtml(name)}" ${checked}
        style="width:16px;height:16px;accent-color:var(--gold);cursor:pointer;flex-shrink:0;">
      <span>${escapeLeagueHtml(name)}</span>
    </label>`;
  }).join('');

  container.innerHTML = `
    <div class="entry-card">
      <div class="entry-title">🍺 Bar Attendance</div>
      <p style="font-family:'Barlow Condensed',sans-serif;font-size:13px;color:var(--muted);margin-bottom:4px;line-height:1.5;">
        Check off who made it to the bar. Saves to Google Sheets — either commissioner can enter from any device.
      </p>
      <div style="margin-bottom:14px;">${syncNote}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
        <label class="field-label" style="margin:0;white-space:nowrap;">Week</label>
        <select class="field-select" id="att-week-select" style="flex:1;min-width:120px;max-width:200px;"
          onchange="window._attEditorWeek=parseInt(this.value);buildAttendanceEditor()">
          ${weekOpts}${newWeekOpt}
        </select>
        <div style="display:flex;gap:8px;">
          <button class="save-btn" onclick="attSelectAll(true)">All ✓</button>
          <button class="save-btn" onclick="attSelectAll(false)">None</button>
        </div>
      </div>
      <div class="att-check-grid">${checkboxes}</div>
      <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="submit-btn" onclick="saveAttendanceWeek()">✅ Save Week ${selectedWeek}</button>
        <button class="submit-btn danger-btn" onclick="clearAttendanceWeek(${selectedWeek})">Clear Week ${selectedWeek}</button>
      </div>
      <div class="success-msg" id="att-save-msg" style="display:none;margin-top:10px;"></div>
    </div>
    <div class="entry-card" style="margin-top:14px;">
      <div class="entry-title" style="font-size:14px;">Season Summary</div>
      <div id="att-summary-table">${buildAttendanceSummaryTable()}</div>
    </div>`;
}

function attSelectAll(checked) {
  document.querySelectorAll('#attendance-tab input[type="checkbox"]').forEach(cb => cb.checked = checked);
}

async function saveAttendanceWeek() {
  const weekEl = document.getElementById('att-week-select');
  const week   = parseInt(weekEl ? weekEl.value : (window._attEditorWeek || 1));
  const msg    = document.getElementById('att-save-msg');

  const players = ALL_PLAYERS.map(name => {
    const safeId = 'att_' + name.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
    const cb     = document.getElementById(safeId);
    return { name, atBar: cb ? cb.checked : false };
  });

  try {
    if (typeof postLeagueAction === 'function' && USE_GOOGLE_SHEETS_SYNC) {
      await postLeagueAction('saveAttendance', { week, players });
      await fetchLeagueDataFromSheets(true);
    } else {
      let stored = {};
      try { stored = JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || '{}'); } catch(e) {}
      if (!stored.weeks) stored.weeks = {};
      const wkData = {};
      players.forEach(p => { wkData[p.name] = p.atBar; });
      stored.weeks[String(week)] = wkData;
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(stored));
      rebuildAll();
    }
    if (msg) { msg.textContent = '✅ Week ' + week + ' attendance saved!'; msg.style.display = 'block'; }
    const summaryEl = document.getElementById('att-summary-table');
    if (summaryEl) summaryEl.innerHTML = buildAttendanceSummaryTable();
  } catch (err) {
    if (msg) { msg.textContent = '❌ Could not save: ' + err.message; msg.style.display = 'block'; }
  }
}

async function clearAttendanceWeek(week) {
  if (!confirm('Clear attendance for Week ' + week + '?')) return;
  const players = ALL_PLAYERS.map(name => ({ name, atBar: false }));
  try {
    if (typeof postLeagueAction === 'function' && USE_GOOGLE_SHEETS_SYNC) {
      await postLeagueAction('saveAttendance', { week, players });
      await fetchLeagueDataFromSheets(true);
    } else {
      let stored = {};
      try { stored = JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || '{}'); } catch(e) {}
      if (!stored.weeks) stored.weeks = {};
      delete stored.weeks[String(week)];
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(stored));
      rebuildAll();
    }
    buildAttendanceEditor();
  } catch (err) {
    alert('Could not clear: ' + err.message);
  }
}

function buildAttendanceSummaryTable() {
  const all = computeAttendanceStats();
  if (!all.length) return '<p style="font-family:\'Barlow Condensed\',sans-serif;font-size:13px;color:var(--muted);">No attendance tracked yet.</p>';

  const sorted = [...all].sort((a,b) =>
    b.weeksAtBar - a.weeksAtBar || b.streak - a.streak || a.name.localeCompare(b.name));

  const rows = sorted.map((p, i) => {
    const pct       = p.weeksTracked > 0 ? Math.round((p.weeksAtBar / p.weeksTracked) * 100) : 0;
    const streakStr = p.streak >= 2 ? '🔥' + p.streak : (p.streak === 1 ? '🍺1' : '—');
    const perfect   = p.perfectSoFar ? '🏅' : '';
    return `<tr>
      <td style="padding:7px 8px;font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--gold);width:28px;">${i+1}</td>
      <td style="padding:7px 8px;font-family:'Inter Tight',sans-serif;font-size:13px;font-weight:700;color:#fff;">${escapeLeagueHtml(p.name)} ${perfect}</td>
      <td style="padding:7px 8px;font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--green);text-align:center;">${p.weeksAtBar}/${p.weeksTracked}</td>
      <td style="padding:7px 8px;font-family:'Barlow Condensed',sans-serif;font-size:13px;color:var(--muted);text-align:center;">${pct}%</td>
      <td style="padding:7px 8px;font-size:13px;text-align:center;">${streakStr}</td>
    </tr>`;
  }).join('');

  return `<table style="width:100%;border-collapse:separate;border-spacing:0 5px;">
    <thead><tr>
      <th style="font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:1.5px;color:var(--muted);font-weight:700;text-transform:uppercase;padding:4px 8px;text-align:left;">#</th>
      <th style="font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:1.5px;color:var(--muted);font-weight:700;text-transform:uppercase;padding:4px 8px;text-align:left;">Player</th>
      <th style="font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:1.5px;color:var(--muted);font-weight:700;text-transform:uppercase;padding:4px 8px;text-align:center;">Visits</th>
      <th style="font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:1.5px;color:var(--muted);font-weight:700;text-transform:uppercase;padding:4px 8px;text-align:center;">%</th>
      <th style="font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:1.5px;color:var(--muted);font-weight:700;text-transform:uppercase;padding:4px 8px;text-align:center;">Streak</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ── Section copy polish ───────────────────────────────────────────────────────
function polishSectionCopy() {
  const standingsUpdated = document.getElementById('standings-updated');
  if (standingsUpdated) standingsUpdated.textContent = formatLastUpdated();

  // Always refresh these cards on rebuild in case Sheets data has arrived
  const attCard = document.getElementById('bar-attendance-card');
  if (attCard && typeof buildAttendanceCardHTML === 'function') {
    attCard.innerHTML = '<div class="dash-label">🍺 Bar Attendance</div>' + buildAttendanceCardHTML();
  }
  const hcpCard = document.getElementById('handicap-tracker-card');
  if (hcpCard && typeof buildHandicapCardHTML === 'function') {
    hcpCard.innerHTML = '<div class="dash-label">📊 Handicap Tracker</div>' + buildHandicapCardHTML();
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
polishSectionCopy();
rebuildAll();
initCommissionerNoteEditor();
