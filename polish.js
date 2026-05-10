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

// Returns an array of up to `n` ranked tiers for a sorted list.
// Players tied at the same value share a rank slot.
function getTopNTiers(sortedList, valueKey, n) {
  const tiers = [];
  let lastVal = null;
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
  const list = Object.values(players).filter(p => p.roundsPlayed > 0);
  if (!list.length) return null;

  // Low Gross avg — ascending sort, top 3 tiers
  const byGross = [...list].sort((a, b) =>
    (a.totalGross / a.roundsPlayed) - (b.totalGross / b.roundsPlayed));
  const lowGrossTiers = getTopNTiers(byGross, p => p.totalGross / p.roundsPlayed, 3);

  // Low Net avg — ascending sort, top 3 tiers
  const withNet = list.filter(p => (p.totalNet || 0) > 0);
  const byNet = [...withNet].sort((a, b) =>
    (a.totalNet / a.roundsPlayed) - (b.totalNet / b.roundsPlayed));
  const lowNetTiers = getTopNTiers(byNet, p => p.totalNet / p.roundsPlayed, 3);

  // Most Net Birdies — descending sort, top 3 tiers
  const withBirdies = list.filter(p => (p.netBirdies || 0) > 0);
  const byBirdies = [...withBirdies].sort((a, b) => (b.netBirdies || 0) - (a.netBirdies || 0));
  const mostBirdieTiers = getTopNTiers(byBirdies, p => p.netBirdies || 0, 3);

  return { lowGrossTiers, lowNetTiers, mostBirdieTiers };
}

const LEADER_MEDALS = ['🥇', '🥈', '🥉'];

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
    const val = formatVal(tier.value);
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
    buildLeaderCategory('Low Gross Avg', ll.lowGrossTiers, v => v.toFixed(1)) +
    buildLeaderCategory('Low Net Avg', ll.lowNetTiers, v => v.toFixed(1)) +
    buildLeaderCategory('Net Birdies', ll.mostBirdieTiers, v => v) +
  '</div>';
}

function polishSectionCopy() {
  const standingsUpdated = document.getElementById('standings-updated');
  if (standingsUpdated) standingsUpdated.textContent = formatLastUpdated();
}

polishSectionCopy();
rebuildAll();
initCommissionerNoteEditor();
