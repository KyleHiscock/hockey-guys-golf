// V4.9 polish layer — commissioner note + league leaders (top 3) + bar attendance leaderboard
// buildDashboard, buildResults, buildSchedule are all handled by public.js
// DO NOT add buildDashboard, buildResults, or buildSchedule here

// ── Constants ─────────────────────────────────────────────────────────────────
const COMMISSIONER_NOTE_KEY = 'hggl2026_commissioner_note';
const ATTENDANCE_KEY        = 'hggl2026_bar_attendance';
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

function escapeLeagueHtml(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
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

  const withBirdies    = list.filter(p => (p.netBirdies || 0) > 0);
  const byBirdies      = [...withBirdies].sort((a,b) => (b.netBirdies||0) - (a.netBirdies||0));
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
// Storage format:
//   { weeks: { "1": { "Ritzy": true, "Robby D": false, ... }, "2": {...} } }

function getAttendanceData() {
  try {
    const raw = localStorage.getItem(ATTENDANCE_KEY);
    if (!raw) return { weeks: {} };
    return JSON.parse(raw) || { weeks: {} };
  } catch (e) {
    return { weeks: {} };
  }
}

function saveAttendanceData(data) {
  try {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save attendance data', e);
  }
}

// Returns per-player summary across all weeks that have been entered
// { name, weeksPlayed, weeksAtBar, streak, perfectSoFar }
function computeAttendanceStats() {
  const data    = getAttendanceData();
  const weeks   = data.weeks || {};
  const weekNums = Object.keys(weeks).map(Number).sort((a,b) => a - b);
  if (!weekNums.length) return [];

  const stats = {};
  ALL_PLAYERS.forEach(name => {
    stats[name] = { name, weeksTracked: 0, weeksAtBar: 0, streak: 0, streakActive: true };
  });

  weekNums.forEach(wk => {
    const wkData = weeks[String(wk)] || {};
    ALL_PLAYERS.forEach(name => {
      if (!(name in wkData)) return; // week not tracked for this player
      const came = !!wkData[name];
      stats[name].weeksTracked++;
      if (came) stats[name].weeksAtBar++;
    });
  });

  // Streak: consecutive most-recent weeks at bar (scan weeks descending)
  ALL_PLAYERS.forEach(name => {
    let streak = 0;
    let active = true;
    for (let i = weekNums.length - 1; i >= 0; i--) {
      const wk     = weekNums[i];
      const wkData = weeks[String(wk)] || {};
      if (!(name in wkData)) continue; // skip weeks not tracked for player
      if (active && !!wkData[name]) {
        streak++;
      } else {
        active = false;
      }
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
    return '<div class="dash-sub" style="margin-top:8px;">Bar attendance tracking starts after Week 1. 🍺</div>';
  }

  // Sort by weeksAtBar desc, then streak desc, then alpha
  const sorted = [...all].sort((a,b) =>
    b.weeksAtBar - a.weeksAtBar || b.streak - a.streak || a.name.localeCompare(b.name));

  const top3    = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3).reverse(); // worst first → reverse so worst is at bottom

  function attendRow(p, medal, isBottom) {
    const streakBadge = p.streak >= 2
      ? '<span class="att-streak">🔥' + p.streak + '</span>'
      : '';
    const perfectBadge = p.perfectSoFar
      ? '<span class="att-perfect">🏅</span>'
      : '';
    const pct = p.weeksTracked > 0
      ? Math.round((p.weeksAtBar / p.weeksTracked) * 100)
      : 0;
    const barColor = isBottom ? 'var(--red)' : 'var(--green)';
    const barWidth = Math.max(pct, 4);

    return '<div class="att-row">' +
      '<span class="att-medal">' + medal + '</span>' +
      '<div class="att-info">' +
        '<span class="att-name">' + escapeLeagueHtml(p.name) + perfectBadge + streakBadge + '</span>' +
        '<div class="att-bar-wrap">' +
          '<div class="att-bar" style="width:' + barWidth + '%;background:' + barColor + '"></div>' +
        '</div>' +
      '</div>' +
      '<span class="att-count">' + p.weeksAtBar + '<span class="att-of">/' + p.weeksTracked + '</span></span>' +
    '</div>';
  }

  const topRows = top3.map((p, i) =>
    attendRow(p, LEADER_MEDALS[i], false)).join('');

  const bottomRows = [...bottom3].reverse().map((p, i) => {
    // medals for bottom 3: 💀 style ranking (worst = last place)
    const bottomMedals = ['😬','😅','🍺'];
    return attendRow(p, bottomMedals[i] || '😬', true);
  }).join('');

  return '<div class="att-section">' +
      '<div class="att-section-label">🍺 Most Loyal</div>' +
      topRows +
    '</div>' +
    '<div class="att-divider"></div>' +
    '<div class="att-section">' +
      '<div class="att-section-label">👻 Bar Ghosts</div>' +
      bottomRows +
    '</div>';
}

// ── Admin: Attendance Editor ──────────────────────────────────────────────────
// Called from admin.html when the commissioner opens the Bar tab

function buildAttendanceEditor() {
  const container = document.getElementById('attendance-tab');
  if (!container) return;

  const data    = getAttendanceData();
  const weeks   = data.weeks || {};

  // Figure out which weeks have results so we can pre-populate the week selector
  const resultWeeks = (typeof RESULTS !== 'undefined' && RESULTS.length)
    ? [...new Set(RESULTS.map(r => r.week).filter(Boolean))].sort((a,b)=>a-b)
    : [];

  const trackedWeeks = Object.keys(weeks).map(Number).sort((a,b)=>a-b);
  const allWeekNums  = [...new Set([...resultWeeks, ...trackedWeeks])].sort((a,b)=>a-b);
  // Always include at least week 1 and whatever the highest result week is
  if (!allWeekNums.length) allWeekNums.push(1);

  const selectedWeek = window._attEditorWeek || allWeekNums[allWeekNums.length - 1] || 1;
  window._attEditorWeek = selectedWeek;

  const weekOpts = allWeekNums.map(w =>
    `<option value="${w}" ${w === selectedWeek ? 'selected' : ''}>Week ${w}</option>`).join('');

  // Also allow adding a new week beyond tracked ones
  const nextWeek = Math.max(...allWeekNums) + 1;
  const newWeekOpt = `<option value="${nextWeek}">Week ${nextWeek} (new)</option>`;

  const wkData  = weeks[String(selectedWeek)] || {};

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
      <p style="font-family:'Barlow Condensed',sans-serif;font-size:13px;color:var(--muted);margin-bottom:16px;line-height:1.5;">
        Check off who made it to the bar after the round. This updates the leaderboard on the public home page.
      </p>
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

function saveAttendanceWeek() {
  const weekEl = document.getElementById('att-week-select');
  const week   = parseInt(weekEl ? weekEl.value : (window._attEditorWeek || 1));
  const data   = getAttendanceData();
  if (!data.weeks) data.weeks = {};

  const wkData = {};
  ALL_PLAYERS.forEach(name => {
    const safeId = 'att_' + name.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'');
    const cb     = document.getElementById(safeId);
    wkData[name] = cb ? cb.checked : false;
  });

  data.weeks[String(week)] = wkData;
  saveAttendanceData(data);

  const msg = document.getElementById('att-save-msg');
  if (msg) { msg.textContent = '✅ Week ' + week + ' attendance saved!'; msg.style.display = 'block'; }

  // Refresh summary and rebuild dashboard card
  const summaryEl = document.getElementById('att-summary-table');
  if (summaryEl) summaryEl.innerHTML = buildAttendanceSummaryTable();
  rebuildAll();
}

function clearAttendanceWeek(week) {
  if (!confirm('Clear attendance for Week ' + week + '?')) return;
  const data = getAttendanceData();
  if (data.weeks) delete data.weeks[String(week)];
  saveAttendanceData(data);
  buildAttendanceEditor();
  rebuildAll();
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
}

// ── Init ──────────────────────────────────────────────────────────────────────
polishSectionCopy();
rebuildAll();
initCommissionerNoteEditor();
