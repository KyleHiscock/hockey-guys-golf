/* HGGL 2026 Playoffs Module
   Adds frozen regular-season seeds, reseeded playoff rounds, playoff-mode dashboard,
   and a dedicated Playoffs page without touching the core scoring engine.
*/
(function () {
  'use strict';

  const HGGL_PLAYOFF_VERSION = 'v5.0.2-playoffs';

  const FALLBACK_SEEDS = [
    {seed:1, name:'Fairway Enforcers', w:10, l:4,  hw:48, hl:30, hdiff:18, matches:14},
    {seed:2, name:'2 Cocks 1 Ball',    w:8,  l:6,  hw:48, hl:40, hdiff:8,  matches:14},
    {seed:3, name:'Zambogeys',         w:8,  l:6,  hw:42, hl:40, hdiff:2,  matches:14},
    {seed:4, name:'Putting Goons',     w:8,  l:6,  hw:37, hl:42, hdiff:-5, matches:14},
    {seed:5, name:'Pin Sharks',        w:7,  l:7,  hw:41, hl:38, hdiff:3,  matches:14},
    {seed:6, name:'Bombs Away',        w:6,  l:8,  hw:36, hl:44, hdiff:-8, matches:14},
    {seed:7, name:'Foot Wedge Crew',   w:6,  l:8,  hw:35, hl:43, hdiff:-8, matches:14},
    {seed:8, name:'Rough Riders',      w:3,  l:11, hw:39, hl:49, hdiff:-10,matches:14}
  ];

  const ROUND_INFO = {
    15: {label:'Quarterfinals', short:'QF', date:'Aug 25, 2026', side:'Front 9'},
    16: {label:'Semifinals', short:'SF', date:'Sep 1, 2026', side:'Back 9'},
    17: {label:'Championship', short:'FINAL', date:'Sep 8, 2026', side:'Front 9'}
  };

  const TEE_TIMES = ['4:20 PM','4:28 PM','4:36 PM','4:44 PM'];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function norm(name) {
    try {
      return typeof normalizeTeamName === 'function'
        ? normalizeTeamName(name)
        : String(name || '').trim();
    } catch (e) {
      return String(name || '').trim();
    }
  }

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function rawField(row, keys) {
    if (!row) return '';
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
    }
    const compactWanted = keys.map(k => String(k).toLowerCase().replace(/[^a-z0-9]/g,''));
    for (const key of Object.keys(row)) {
      const compact = String(key).toLowerCase().replace(/[^a-z0-9]/g,'');
      if (compactWanted.includes(compact) && row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return row[key];
      }
    }
    return '';
  }

  function getSeedRows() {
    const fallbackByName = {};
    FALLBACK_SEEDS.forEach(s => { fallbackByName[norm(s.name)] = s; });

    let rawTeams = [];
    try {
      if (typeof LEAGUE_API_DATA !== 'undefined' &&
          LEAGUE_API_DATA &&
          Array.isArray(LEAGUE_API_DATA.teams)) {
        rawTeams = LEAGUE_API_DATA.teams;
      }
    } catch (e) {}

    const fromSheet = rawTeams.map(row => {
      const name = norm(rawField(row, ['Display Name','Short Name','Team','name']));
      const fb = fallbackByName[name];
      const seed = num(rawField(row, ['Playoff Seed','PlayoffSeed','Seed']), fb ? fb.seed : NaN);
      if (!name || !Number.isFinite(seed)) return null;
      return {
        seed,
        name,
        w: num(rawField(row, ['Reg Season W','RegSeasonW','Regular Season W']), fb ? fb.w : 0),
        l: num(rawField(row, ['Reg Season L','RegSeasonL','Regular Season L']), fb ? fb.l : 0),
        hw: num(rawField(row, ['Reg Season HW','RegSeasonHW','Regular Season HW']), fb ? fb.hw : 0),
        hl: fb ? fb.hl : 0,
        hdiff: fb ? fb.hdiff : 0,
        matches: fb ? fb.matches : 14,
        sheetStatus: String(rawField(row, ['Playoff Status','PlayoffStatus']) || '')
      };
    }).filter(Boolean);

    const source = fromSheet.length === 8 ? fromSheet : FALLBACK_SEEDS.map(s => ({...s}));
    return source.sort((a,b) => a.seed - b.seed);
  }

  function seedRowByName(name) {
    const n = norm(name);
    return getSeedRows().find(s => norm(s.name) === n) || null;
  }

  function applyFrozenRegularSeasonRecords() {
    if (typeof TEAMS === 'undefined' || !Array.isArray(TEAMS)) return;
    const seeds = getSeedRows();
    TEAMS.forEach(team => {
      const row = seeds.find(s => norm(s.name) === norm(team.name));
      if (!row) return;
      team.w = row.w;
      team.l = row.l;
      team.holesWon = row.hw;
      team.holesLost = row.hl;
      team.holeDiff = row.hdiff;
      team.matches = row.matches;
      team.playoffSeed = row.seed;
    });
  }

  function playoffResults(week) {
    if (typeof RESULTS === 'undefined' || !Array.isArray(RESULTS)) return [];
    return RESULTS.filter(r => Number(r.week) === Number(week));
  }

  function resultDisplay(r) {
    let info = null;
    try {
      if (typeof getDisplayedResultInfo === 'function') info = getDisplayedResultInfo(r);
    } catch (e) {}
    return {
      winner: norm((info && info.winner) || r.winner || ''),
      text: String((info && info.matchResult) || r.matchResult || r.resultText || '').trim()
    };
  }

  function findMatchResult(teamA, teamB, week) {
    if (!teamA || !teamB) return null;
    const a = norm(teamA.name || teamA);
    const b = norm(teamB.name || teamB);
    const r = playoffResults(week).find(row => {
      const t1 = norm(row.team1 || '');
      const t2 = norm(row.team2 || '');
      return (t1 === a && t2 === b) || (t1 === b && t2 === a);
    });
    if (!r) return null;
    const display = resultDisplay(r);
    if (display.winner !== a && display.winner !== b) return null;
    return {
      winner: display.winner,
      loser: display.winner === a ? b : a,
      text: display.text,
      raw: r
    };
  }

  function buildQuarterfinals() {
    const seeds = getSeedRows();
    const bySeed = {};
    seeds.forEach(s => { bySeed[s.seed] = s; });
    const pairs = [[1,8],[2,7],[3,6],[4,5]];
    return pairs.map((pair, i) => {
      const a = bySeed[pair[0]];
      const b = bySeed[pair[1]];
      return {
        week:15, match:i+1, time:TEE_TIMES[i],
        teamA:a, teamB:b,
        result:findMatchResult(a,b,15)
      };
    });
  }

  function buildSemifinals() {
    const qf = buildQuarterfinals();
    const winners = qf.map(m => m.result && m.result.winner).filter(Boolean);
    if (winners.length !== 4) {
      return [
        {week:16, match:1, time:TEE_TIMES[0], teamA:null, teamB:null,
         placeholderA:'Highest Remaining Seed', placeholderB:'Lowest Remaining Seed', result:null},
        {week:16, match:2, time:TEE_TIMES[1], teamA:null, teamB:null,
         placeholderA:'2nd-Highest Remaining Seed', placeholderB:'2nd-Lowest Remaining Seed', result:null}
      ];
    }
    const rows = winners.map(seedRowByName).filter(Boolean).sort((a,b) => a.seed - b.seed);
    const pairs = [[rows[0], rows[3]], [rows[1], rows[2]]];
    return pairs.map((pair, i) => ({
      week:16, match:i+1, time:TEE_TIMES[i],
      teamA:pair[0], teamB:pair[1],
      result:findMatchResult(pair[0], pair[1], 16)
    }));
  }

  function buildFinal() {
    const sf = buildSemifinals();
    const winners = sf.map(m => m.result && m.result.winner).filter(Boolean);
    if (winners.length !== 2) {
      return {
        week:17, match:1, time:TEE_TIMES[0], teamA:null, teamB:null,
        placeholderA:'Semifinal Winner', placeholderB:'Semifinal Winner', result:null
      };
    }
    const rows = winners.map(seedRowByName).filter(Boolean).sort((a,b) => a.seed - b.seed);
    return {
      week:17, match:1, time:TEE_TIMES[0],
      teamA:rows[0], teamB:rows[1],
      result:findMatchResult(rows[0], rows[1], 17)
    };
  }

  function currentPhase() {
    const finalMatch = buildFinal();
    if (finalMatch.result) return {week:17, state:'complete', champion:finalMatch.result.winner};
    const sf = buildSemifinals();
    if (sf.every(m => m.result)) return {week:17, state:'active', champion:''};
    const qf = buildQuarterfinals();
    if (qf.every(m => m.result)) return {week:16, state:'active', champion:''};
    return {week:15, state:'active', champion:''};
  }

  function computedTeamStatus(name) {
    const n = norm(name);
    const finalMatch = buildFinal();
    if (finalMatch.result && norm(finalMatch.result.winner) === n) return 'Champion';

    const all = buildQuarterfinals().concat(buildSemifinals()).concat([buildFinal()]);
    for (const m of all) {
      if (!m.result) continue;
      if (norm(m.result.loser) === n) return 'Eliminated';
    }
    return 'Alive';
  }

  function logoForTeam(team, cls) {
    if (!team) return '<div class="po-logo-placeholder">?</div>';
    try {
      if (typeof logoImg === 'function') return logoImg(team.name, cls || 'po-logo', 'po-logo-placeholder');
    } catch (e) {}
    const initials = String(team.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();
    return '<div class="po-logo-placeholder">' + esc(initials) + '</div>';
  }

  function teamLineHtml(team, placeholder, match, slot) {
    if (!team) {
      return '<div class="po-team-line po-team-placeholder">' +
        '<div class="po-seed-pill">?</div>' +
        '<div class="po-logo-placeholder">?</div>' +
        '<div class="po-team-copy"><div class="po-team-name">' + esc(placeholder || 'TBD') + '</div>' +
        '<div class="po-team-record">Awaiting prior round</div></div></div>';
    }

    const teamName = norm(team.name);
    const isWinner = !!(match.result && norm(match.result.winner) === teamName);
    const isLoser = !!(match.result && norm(match.result.loser) === teamName);
    const statusClass = isWinner ? ' is-winner' : (isLoser ? ' is-loser' : '');
    const tag = isWinner ? '<span class="po-team-tag">ADVANCES</span>' :
                isLoser ? '<span class="po-team-tag eliminated">ELIMINATED</span>' : '';

    return '<div class="po-team-line' + statusClass + '">' +
      '<div class="po-seed-pill">' + esc(team.seed) + '</div>' +
      logoForTeam(team, 'po-logo') +
      '<div class="po-team-copy">' +
        '<div class="po-team-name">' + esc(team.name) + tag + '</div>' +
        '<div class="po-team-record">' + esc(team.w) + '-' + esc(team.l) + ' · ' + esc(team.hw) + ' HW</div>' +
      '</div></div>';
  }

  function matchCardHtml(match) {
    const info = ROUND_INFO[match.week];
    const result = match.result
      ? '<div class="po-result"><span>FINAL</span> ' + esc(match.result.winner) +
          (match.result.text ? ' · ' + esc(match.result.text) : '') + '</div>'
      : '<div class="po-result pending"><span>' + (match.week === 15 ? 'UP NEXT' : 'TBD') + '</span> ' +
          (match.week === 15 ? 'Higher seed tees first' : 'Reseed after prior round') + '</div>';

    return '<div class="po-match-card' + (match.result ? ' is-complete' : '') + '">' +
      '<div class="po-match-meta"><span>Match ' + esc(match.match) + '</span><strong>' + esc(match.time) + '</strong></div>' +
      teamLineHtml(match.teamA, match.placeholderA, match, 'A') +
      '<div class="po-vs-line"><span>VS</span></div>' +
      teamLineHtml(match.teamB, match.placeholderB, match, 'B') +
      result +
      '<div class="po-side">' + esc(info.side) + '</div>' +
    '</div>';
  }

  function roundColumnHtml(week, matches, reseedLabel) {
    const info = ROUND_INFO[week];
    return '<div class="po-round-col">' +
      (reseedLabel ? '<div class="po-reseed-badge">↻ ' + esc(reseedLabel) + '</div>' : '') +
      '<div class="po-round-head"><div class="po-round-kicker">WEEK ' + esc(week) + '</div>' +
      '<div class="po-round-title">' + esc(info.label) + '</div>' +
      '<div class="po-round-date">' + esc(info.date) + ' · ' + esc(info.side) + '</div></div>' +
      '<div class="po-round-matches">' + matches.map(matchCardHtml).join('') + '</div>' +
    '</div>';
  }

  function seedTableHtml() {
    const rows = getSeedRows();
    return '<div class="po-seeds-panel">' +
      '<div class="po-panel-head"><div><span>LOCKED</span> FINAL REGULAR-SEASON SEEDS</div>' +
      '<div class="po-panel-note">Record → Holes Won tiebreaker</div></div>' +
      '<div class="po-seeds-grid">' +
      rows.map(row => {
        const status = computedTeamStatus(row.name);
        return '<div class="po-seed-row status-' + status.toLowerCase() + '">' +
          '<div class="po-seed-number">#' + esc(row.seed) + '</div>' +
          logoForTeam(row, 'po-seed-logo') +
          '<div class="po-seed-team"><strong>' + esc(row.name) + '</strong><span>' +
            esc(row.w) + '-' + esc(row.l) + ' · ' + esc(row.hw) + ' HW</span></div>' +
          '<div class="po-status">' + esc(status) + '</div>' +
        '</div>';
      }).join('') +
      '</div></div>';
  }

  function buildPlayoffsPage() {
    const container = document.getElementById('playoffs-container');
    if (!container) return;

    const qf = buildQuarterfinals();
    const sf = buildSemifinals();
    const finalMatch = buildFinal();
    const phase = currentPhase();
    const currentInfo = ROUND_INFO[phase.week];

    let championHtml = '';
    if (phase.champion) {
      const champ = seedRowByName(phase.champion);
      championHtml = '<div class="po-champion-banner">' +
        '<div class="po-champion-trophy">🏆</div>' +
        '<div><span>2026 HGGL CHAMPIONS</span><strong>' + esc(phase.champion) + '</strong></div>' +
        (champ ? logoForTeam(champ, 'po-champion-logo') : '') +
      '</div>';
    }

    container.innerHTML =
      '<div class="playoffs-hero-card">' +
        '<div class="po-hero-kicker">THE ROAD TO THE CUP</div>' +
        '<div class="po-hero-title">2026 HGGL PLAYOFFS</div>' +
        '<div class="po-hero-stage">' + esc(currentInfo.label) + ' · ' + esc(currentInfo.date) + ' · ' + esc(currentInfo.side) + '</div>' +
        '<div class="po-format-strip">' +
          '<span>8 TEAMS</span><b>•</b><span>3 ROUNDS</span><b>•</b><span>RESEED EACH ROUND</span><b>•</b><span>HIGH SEED TEES FIRST</span>' +
        '</div>' +
      '</div>' +
      championHtml +
      '<div class="po-bracket-grid">' +
        roundColumnHtml(15, qf, '') +
        roundColumnHtml(16, sf, 'RESEED') +
        roundColumnHtml(17, [finalMatch], 'RESEED') +
      '</div>' +
      '<div class="po-reseed-explainer"><strong>How reseeding works:</strong> after each round, the highest remaining seed plays the lowest remaining seed. The other two remaining teams play each other.</div>' +
      seedTableHtml();
  }

  function compactTeam(team, placeholder, match) {
    if (!team) return '<div class="poh-team placeholder"><span class="poh-seed">?</span><span>' + esc(placeholder || 'TBD') + '</span></div>';
    const n = norm(team.name);
    const winner = match.result && norm(match.result.winner) === n;
    const loser = match.result && norm(match.result.loser) === n;
    return '<div class="poh-team' + (winner ? ' winner' : '') + (loser ? ' loser' : '') + '">' +
      '<span class="poh-seed">' + esc(team.seed) + '</span>' +
      logoForTeam(team, 'poh-logo') +
      '<span>' + esc(team.name) + '</span>' +
      (winner ? '<b>✓</b>' : '') +
    '</div>';
  }

  function buildHomePlayoffPicture() {
    const container = document.getElementById('playoff-picture-container');
    if (!container) return;
    const phase = currentPhase();
    let matches = phase.week === 15 ? buildQuarterfinals() :
                  phase.week === 16 ? buildSemifinals() : [buildFinal()];

    container.innerHTML = '<div class="poh-list">' + matches.map(m =>
      '<div class="poh-match">' +
        '<div class="poh-time">' + esc(m.time) + '</div>' +
        '<div class="poh-pair">' +
          compactTeam(m.teamA, m.placeholderA, m) +
          '<div class="poh-vs">VS</div>' +
          compactTeam(m.teamB, m.placeholderB, m) +
        '</div>' +
        (m.result ? '<div class="poh-result">FINAL · ' + esc(m.result.winner) +
          (m.result.text ? ' · ' + esc(m.result.text) : '') + '</div>' : '') +
      '</div>'
    ).join('') + '</div>' +
    '<button class="po-view-bracket" type="button" onclick="show(\'playoffs\',document.querySelector(\'.nav-btn[data-playoffs-nav]\'));buildPlayoffsPage();">VIEW FULL PLAYOFF BRACKET →</button>';
  }

  function decorateDashboard() {
    const panel = document.querySelector('.playoff-dashboard');
    if (!panel) return;
    const phase = currentPhase();
    const info = ROUND_INFO[phase.week];
    const title = panel.querySelector('.panel-title');
    const note = panel.querySelector('.dash-empty');
    if (title) {
      title.textContent = phase.champion
        ? '🏆 2026 HGGL CHAMPION'
        : '🏆 2026 HGGL PLAYOFFS · ' + info.label.toUpperCase();
    }
    if (note) {
      note.textContent = phase.champion
        ? phase.champion + ' has won the 2026 Hockey Guys Golf League championship.'
        : info.date + ' · ' + info.side + ' · Higher remaining seed is placed in the earlier tee time.';
    }
  }

  function decorateStandings() {
    const sub = document.getElementById('standings-updated');
    if (sub) {
      sub.textContent = 'Final regular-season standings · 2026 playoff seeds are locked. Tied records are seeded by total holes won.';
    }
  }

  function ensureWeek(week, date, side) {
    if (typeof SCHEDULE_WEEKS === 'undefined' || !Array.isArray(SCHEDULE_WEEKS)) return null;
    let obj = SCHEDULE_WEEKS.find(w => Number(w.week) === Number(week));
    if (!obj) {
      obj = {week, date, side, status:'', matchups:[]};
      SCHEDULE_WEEKS.push(obj);
      SCHEDULE_WEEKS.sort((a,b) => Number(a.week)-Number(b.week));
    }
    obj.date = obj.date || date;
    obj.side = side;
    return obj;
  }

  function scheduleMatchFromBracket(match, defaultStatus) {
    const home = match.teamA ? match.teamA.name : (match.placeholderA || 'TBD');
    const away = match.teamB ? match.teamB.name : (match.placeholderB || 'TBD');
    return {
      time: match.time,
      home,
      away,
      status: match.result ? 'Complete' : defaultStatus,
      matchId: 'W' + match.week + 'M' + match.match
    };
  }

  function syncPlayoffScheduleModel() {
    if (typeof SCHEDULE_WEEKS === 'undefined' || !Array.isArray(SCHEDULE_WEEKS)) return;

    const qf = buildQuarterfinals();
    const sf = buildSemifinals();
    const fm = buildFinal();

    const w15 = ensureWeek(15, ROUND_INFO[15].date, ROUND_INFO[15].side);
    const w16 = ensureWeek(16, ROUND_INFO[16].date, ROUND_INFO[16].side);
    const w17 = ensureWeek(17, ROUND_INFO[17].date, ROUND_INFO[17].side);

    if (w15) {
      w15.status = qf.every(m => m.result) ? 'completed' : '';
      w15.matchups = qf.map(m => scheduleMatchFromBracket(m, 'Scheduled'));
    }
    if (w16) {
      const participantsKnown = sf.every(m => m.teamA && m.teamB);
      w16.status = participantsKnown && sf.every(m => m.result) ? 'completed' : '';
      w16.matchups = sf.map(m => scheduleMatchFromBracket(m, participantsKnown ? 'Scheduled' : 'TBD'));
    }
    if (w17) {
      const participantsKnown = !!(fm.teamA && fm.teamB);
      w17.status = fm.result ? 'completed' : '';
      w17.matchups = [scheduleMatchFromBracket(fm, participantsKnown ? 'Scheduled' : 'TBD')];
    }
  }

  function installPatches() {
    if (window.__HGGL_PLAYOFF_PATCHED__) return;
    window.__HGGL_PLAYOFF_PATCHED__ = true;

    const coreRebuildAll = (typeof rebuildAll === 'function') ? rebuildAll : null;

    if (typeof buildPlayoffPicture === 'function') {
      buildPlayoffPicture = buildHomePlayoffPicture;
    }

    window.buildPlayoffsPage = buildPlayoffsPage;

    if (coreRebuildAll) {
      rebuildAll = function () {
        applyFrozenRegularSeasonRecords();
        syncPlayoffScheduleModel();
        coreRebuildAll();
        buildPlayoffsPage();
        decorateDashboard();
        decorateStandings();
      };
    }

    try { console.log('Hockey Guys Golf League playoffs ' + HGGL_PLAYOFF_VERSION); } catch (e) {}
  }

  function boot() {
    installPatches();
    applyFrozenRegularSeasonRecords();
    syncPlayoffScheduleModel();
    if (typeof rebuildAll === 'function') {
      rebuildAll();
    } else {
      buildHomePlayoffPicture();
      buildPlayoffsPage();
      decorateDashboard();
      decorateStandings();
    }
  }

  // index.html loads this file after public.js and polish.js at the end of <body>.
  // Boot immediately so any in-flight Google Sheets refresh uses the playoff-aware rebuild.
  boot();
})();
