// V4.7 polish layer — commissioner note + league leaders only
// buildDashboard, buildResults, buildSchedule are all handled by public.js
// DO NOT add buildDashboard, buildResults, or buildSchedule here

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
    if (msg) { msg.textContent = 'Commissioner note saved.'; msg.style.display = 'block'; }
    rebuildAll();
  } catch (err) {
    if (msg) { msg.textContent = 'Could not save: ' + err.message; msg.style.display = 'block'; }
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

// ── League Leaders ────────────────────────────────────────────────────────────
function getLeagueLeaders() {
  if (typeof computePlayerStats !== 'function') return null;
  const players = computePlayerStats();
  const list = Object.values(players).filter(p => p.roundsPlayed > 0);
  if (!list.length) return null;

  const minGross = Math.min(...list.map(p => p.totalGross / p.roundsPlayed));
  const lowGross = list.filter(p => Math.abs((p.totalGross / p.roundsPlayed) - minGross) < 0.001);

  const withNet = list.filter(p => (p.totalNet || 0) > 0 && p.roundsPlayed > 0);
  let lowNet = [], minNet = null;
  if (withNet.length) {
    minNet = Math.min(...withNet.map(p => p.totalNet / p.roundsPlayed));
    lowNet = withNet.filter(p => Math.abs((p.totalNet / p.roundsPlayed) - minNet) < 0.001);
  }

  const maxBirdies = Math.max(...list.map(p => p.netBirdies || 0));
  const mostBirdies = maxBirdies > 0 ? list.filter(p => (p.netBirdies || 0) === maxBirdies) : [];

  return {
    lowGross: { players: lowGross, value: minGross },
    lowNet: { players: lowNet, value: minNet },
    mostBirdies: { players: mostBirdies, value: maxBirdies }
  };
}

function formatLeaderNames(players) {
  if (!players || !players.length) return 'TBD';
  return players.map(p => p.name).join(' & ');
}

function buildLeadersCardHTML() {
  const ll = getLeagueLeaders();
  if (!ll) return '<div class="dash-sub" style="margin-top:8px;">Leaders will appear after Week 1 scores are entered.</div>';
  return '<div class="leaders-strip">' +
    '<div class="leader-row">' +
      '<span class="leader-cat">Low Gross</span>' +
      '<span class="leader-val">' + (ll.lowGross.value !== null ? ll.lowGross.value.toFixed(1) : '—') + '</span>' +
      '<span class="leader-name-sm">' + formatLeaderNames(ll.lowGross.players) + '</span>' +
    '</div>' +
    '<div class="leader-row">' +
      '<span class="leader-cat">Low Net</span>' +
      '<span class="leader-val">' + (ll.lowNet.value !== null ? ll.lowNet.value.toFixed(1) : '—') + '</span>' +
      '<span class="leader-name-sm">' + formatLeaderNames(ll.lowNet.players) + '</span>' +
    '</div>' +
    '<div class="leader-row">' +
      '<span class="leader-cat">Net Birdies</span>' +
      '<span class="leader-val">' + (ll.mostBirdies.value > 0 ? ll.mostBirdies.value : '—') + '</span>' +
      '<span class="leader-name-sm">' + formatLeaderNames(ll.mostBirdies.players) + '</span>' +
    '</div>' +
  '</div>';
}

function polishSectionCopy() {
  const standingsUpdated = document.getElementById('standings-updated');
  if (standingsUpdated) standingsUpdated.textContent = formatLastUpdated();
}

polishSectionCopy();
rebuildAll();
initCommissionerNoteEditor();
