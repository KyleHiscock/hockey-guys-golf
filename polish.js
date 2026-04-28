// V4.6 polish layer — commissioner note only
// buildDashboard, buildResults, buildSchedule are handled by public.js
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
      msg.textContent = 'Commissioner note saved to Google Sheets.';
      msg.style.display = 'block';
    }
    rebuildAll();
  } catch (err) {
    if (msg) {
      msg.textContent = 'Note could not be saved: ' + err.message;
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
      msg.textContent = 'Commissioner note reset to the default.';
      msg.style.display = 'block';
    }
    rebuildAll();
  } catch (err) {
    if (msg) {
      msg.textContent = 'Note could not be reset: ' + err.message;
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

function polishSectionCopy() {
  const standingsUpdated = document.getElementById('standings-updated');
  if (standingsUpdated) standingsUpdated.textContent = formatLastUpdated();
}

polishSectionCopy();
rebuildAll();
initCommissionerNoteEditor();
