// V2.9 polish layer: clearer typography + holes-won standings tiebreak + editable commissioner note
const COMMISSIONER_NOTE_KEY = 'hggl2026_commissioner_note';
const DEFAULT_COMMISSIONER_NOTE = 'Week 1 starts Tuesday, May 5. Please arrive early, check in with your group, and make sure GHIN scores are posted after the round.';

function escapeLeagueHtml(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

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
  const msg = document.getElementById('commissioner-note-success');
  if (!field) return;
  try {
    const note = field.value.trim();
    if (typeof postLeagueAction === 'function' && USE_GOOGLE_SHEETS_SYNC) {
      await postLeagueAction('saveCommissionerNote', { note });
      await fetchLeagueDataFromSheets(true);
    } else {
      localStorage.setItem(COMMISSIONER_NOTE_KEY, note);
    }
    if (msg) {
      msg.textContent = '✅ Commissioner note saved to Google Sheets.';
      msg.style.display = 'block';
    }
    rebuildAll();
  } catch (err) {
    if (msg) {
      msg.textContent = '⚠️ Note could not be saved: ' + err.message;
      msg.style.display = 'block';
    }
  }
}

async function clearCommissionerNote() {
  const field = document.getElementById('commissioner-note-field');
  const msg = document.getElementById('commissioner-note-success');
  try {
    if (field) field.value = DEFAULT_COMMISSIONER_NOTE;
    if (typeof postLeagueAction === 'function' && USE_GOOGLE_SHEETS_SYNC) {
      await postLeagueAction('saveCommissionerNote', { note: DEFAULT_COMMISSIONER_NOTE });
      await fetchLeagueDataFromSheets(true);
    } else {
      localStorage.removeItem(COMMISSIONER_NOTE_KEY);
    }
    if (msg) {
      msg.textContent = '✅ Commissioner note reset to the default.';
      msg.style.display = 'block';
    }
    rebuildAll();
  } catch (err) {
    if (msg) {
      msg.textContent = '⚠️ Note could not be reset: ' + err.message;
      msg.style.display = 'block';
    }
  }
}

function initCommissionerNoteEditor() {
  const field = document.getElementById('commissioner-note-field');
  if (field) field.value = getCommissionerNote();
}


function formatLastUpdated() {
  if (!RESULTS || !RESULTS.length) return (typeof LEAGUE_DATA_SOURCE !== 'undefined' && LEAGUE_DATA_SOURCE === 'Google Sheets') ? 'Synced from Google Sheets.' : 'Standings update after Week 1 results are entered.';
  const lastWeek = Math.max(...RESULTS.map(r => parseInt(r.week) || 0));
  return 'Updated through Week ' + lastWeek + '.';
}


function getLeagueLeaders() {
  if (typeof computePlayerStats !== 'function') return null;
  const players = computePlayerStats();
  const list = Object.values(players).filter(p => p.roundsPlayed > 0);
  if (!list.length) return null;

  // Low Gross — lowest avg gross per hole (season long)
  const minGross = Math.min(...list.map(p => p.totalGross / p.totalHoles));
  const lowGross = list.filter(p => (p.totalGross / p.totalHoles).toFixed(2) === minGross.toFixed(2));

  // Low Net — lowest avg net per hole
  const withNet = list.filter(p => p.totalNet !== undefined && p.totalHoles > 0);
  let lowNet = [];
  if (withNet.length) {
    const minNet = Math.min(...withNet.map(p => p.totalNet / p.totalHoles));
    lowNet = withNet.filter(p => (p.totalNet / p.totalHoles).toFixed(2) === minNet.toFixed(2));
  }

  // Most Net Birdies
  const maxBirdies = Math.max(...list.map(p => p.netBirdies || 0));
  const mostBirdies = maxBirdies > 0 ? list.filter(p => (p.netBirdies || 0) === maxBirdies) : [];

  return {
    lowGross: { players: lowGross, value: minGross },
    lowNet: { players: lowNet, value: lowNet.length ? lowNet[0].totalNet / lowNet[0].totalHoles : null },
    mostBirdies: { players: mostBirdies, value: maxBirdies }
  };
}

function formatLeaderNames(players) {
  if (!players || !players.length) return 'TBD';
  return players.map(p => p.name).join(' & ');
}
function buildDashboard() {
  const container = document.getElementById('dashboard-container');
  if(!container) return;
  const sorted = getSortedStandings();
  const leader = sorted[0];
  const nextWeek = SCHEDULE_WEEKS.find(w => !RESULTS.some(r => parseInt(r.week) === w.week)) || SCHEDULE_WEEKS[SCHEDULE_WEEKS.length-1];
  const lastResult = RESULTS[RESULTS.length-1];
  const miniRows = sorted.slice(0,4).map((t,i)=>`<div class="mini-standings-row">
    <div class="mini-rank">${i+1}</div>
    <div class="mini-team">${logoImg(t.name,'mini-logo','m-placeholder')}<div class="mini-team-name">${t.name}</div></div>
    <div class="mini-record">${t.w}-${t.l}<span class="mini-hw">${t.holesWon || 0} HW</span></div>
  </div>`).join('');
  const nextHtml = nextWeek ? nextWeek.matchups.map(m=>`<div class="matchup-card">
    <span class="m-time">${m.time}</span>
    <div class="m-team right"><span class="m-name">${m.home}</span>${logoImg(m.home,'m-logo','m-placeholder')}</div>
    <div class="vs-badge">VS</div>
    <div class="m-team">${logoImg(m.away,'m-logo','m-placeholder')}<span class="m-name">${m.away}</span></div>
  </div>`).join('') : '<div class="dash-empty">Schedule coming soon.</div>';

  container.innerHTML = `
    <div class="dashboard-panel update-card">
      <div class="update-icon">📣</div>
      <div>
        <div class="update-title">Commissioner Note</div>
        <div class="update-copy">${escapeLeagueHtml(getCommissionerNote()).replace(/\n/g, '<br>')}</div>
      </div>
    </div>
    <div class="dashboard-grid dashboard-grid-two">
      <div class="dash-card league-leaders-card" id="league-leaders-card">
        <div class="dash-label">League Leaders</div>
        ${(function(){
          const ll = getLeagueLeaders();
          if (!ll) return '<div class="dash-sub" style="margin-top:6px;">Stats will appear after Week 1 scores are entered.</div>';
          return '<div class="leaders-strip">' +
            '<div class="leader-row"><span class="leader-cat">Low Gross</span><span class="leader-val">' + (ll.lowGross.value ? ll.lowGross.value.toFixed(1) + '/hole' : '—') + '</span><span class="leader-name-sm">' + formatLeaderNames(ll.lowGross.players) + '</span></div>' +
            '<div class="leader-row"><span class="leader-cat">Low Net</span><span class="leader-val">' + (ll.lowNet.value !== null ? ll.lowNet.value.toFixed(1) + '/hole' : '—') + '</span><span class="leader-name-sm">' + formatLeaderNames(ll.lowNet.players) + '</span></div>' +
            '<div class="leader-row"><span class="leader-cat">Net Birdies</span><span class="leader-val">' + (ll.mostBirdies.value > 0 ? ll.mostBirdies.value : '—') + '</span><span class="leader-name-sm">' + formatLeaderNames(ll.mostBirdies.players) + '</span></div>' +
          '</div>';
        })()}
      </div>
      <div class="dash-card ice"><div class="dash-label">Latest Result</div><div class="dash-value">${lastResult ? lastResult.matchResult : 'TBD'}</div><div class="dash-sub">${lastResult ? `${lastResult.team1} vs ${lastResult.team2}` : 'Results will appear after Week 1.'}</div></div>
    </div>
    <div class="dashboard-two">
      <div class="dashboard-panel"><div class="panel-title">Next Matchups · Week ${nextWeek ? nextWeek.week : 'TBD'}</div>${nextHtml}</div>
      <div class="dashboard-panel"><div class="panel-title">Standings Snapshot</div>${miniRows || '<div class="dash-empty">Standings will populate after scores are entered.</div>'}</div>
    </div>
    <div class="dashboard-panel playoff-dashboard"><div class="panel-title">If Playoffs Started Today</div><div class="dash-empty" style="margin-bottom:10px">Opening-round bracket based on current standings. If teams have the same record, total holes won is the standings tiebreaker. All 8 teams make it, then teams reseed after each round.</div><div id="playoff-picture-container"></div></div>`;
  buildPlayoffPicture();
}

function buildResults() {
  const container = document.getElementById('results-container');
  const updated = document.getElementById('results-updated');
  if(updated) updated.textContent = formatLastUpdated();
  if(!RESULTS.length) {
    container.innerHTML = `<div class="no-results"><div class="no-results-icon">🏌️</div><div class="no-results-text">No final results yet<br>Week 1 results will appear here after scorecards are saved.</div></div>`;
    return;
  }
  const byWeek = {};
  RESULTS.forEach(r => { if(!byWeek[r.week]) byWeek[r.week]=[]; byWeek[r.week].push(r); });
  container.innerHTML = Object.keys(byWeek).sort((a,b)=>b-a).map(week => `
    <div class="results-week">
      <div class="results-week-header">Week ${week} Results</div>
      ${byWeek[week].map(r => {
        const t1win = r.winner === r.team1;
        const t2win = r.winner === r.team2;
        return `<div class="result-card">
          <div class="result-teams">
            <div class="result-team">
              ${logoImg(r.team1,'result-logo','result-placeholder')}
              <span class="result-name${t1win?' winner':''}">${r.team1}</span>
            </div>
            <div class="result-score-block">
              <div class="result-matchplay">${r.matchResult}</div>
              <div class="result-side">${r.side}</div>
            </div>
            <div class="result-team right">
              <span class="result-name${t2win?' winner':''}">${r.team2}</span>
              ${logoImg(r.team2,'result-logo','result-placeholder')}
            </div>
          </div>
          <div class="result-detail">${r.playerLine}${(r.team1HolesWon !== undefined || r.team2HolesWon !== undefined) ? ` · Holes won: ${r.team1} ${r.team1HolesWon || 0}, ${r.team2} ${r.team2HolesWon || 0}` : ''}</div>
        </div>`;
      }).join('')}
    </div>`).join('');
}

function buildSchedule() {
  const el = document.getElementById('schedule-container');
  if(!el) return;
  el.innerHTML = SCHEDULE_WEEKS.map(w => `
    <div class="week-block">
      <div class="week-label">Week ${w.week} · ${w.date} · ${w.side}</div>
      ${w.matchups.map(m => `
        <div class="matchup-card">
          <span class="m-time">${m.time}</span>
          <div class="m-team right"><span class="m-name">${m.home}</span>${logoImg(m.home,'m-logo','m-placeholder')}</div>
          <div class="vs-badge">VS</div>
          <div class="m-team">${logoImg(m.away,'m-logo','m-placeholder')}<span class="m-name">${m.away}</span></div>
        </div>`).join('')}
    </div>`).join('');
}

function polishSectionCopy() {
  const copy = {
    'dashboard-container':'Quick glance at the next tee times, current standings, latest result, and playoff matchups if the bracket started today.',
    'schedule-container':'Weekly matchups, tee times, and front/back nine assignments.',
    'results-container':'Final match results will show here once scores are saved.',
  };
  const standingsUpdated = document.getElementById('standings-updated');
  if(standingsUpdated) standingsUpdated.textContent = formatLastUpdated();
}

polishSectionCopy();
rebuildAll();
initCommissionerNoteEditor();
