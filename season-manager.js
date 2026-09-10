(function () {
  'use strict';

  const HISTORY_URL = 'data/league-history.json';
  const state = {
    manifest: null,
    liveData: null,
    liveSeason: null,
    selectedSeason: null,
    archiveCache: {},
    booted: false
  };

  function cloneData(value) {
    if (value === undefined || value === null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getSetting(data, key) {
    if (!data) return '';
    const settings = data.settings || data.Settings || null;
    if (Array.isArray(settings)) {
      const row = settings.find(function (item) {
        return String(item && (item.Setting || item.setting || item.Key || item.key) || '').trim().toLowerCase() === key.toLowerCase();
      });
      if (row) return row.Value ?? row.value ?? row.SettingValue ?? row.settingValue ?? '';
    }
    if (settings && typeof settings === 'object') {
      if (settings[key] !== undefined) return settings[key];
      const actual = Object.keys(settings).find(function (k) { return k.toLowerCase() === key.toLowerCase(); });
      if (actual) return settings[actual];
    }
    if (data.metadata && key.toLowerCase() === 'seasonyear' && data.metadata.season) return data.metadata.season;
    return '';
  }

  function detectSeason(data) {
    const fromData = Number(getSetting(data, 'SeasonYear'));
    if (Number.isFinite(fromData) && fromData > 2000) return fromData;
    if (data && data.metadata && Number(data.metadata.season)) return Number(data.metadata.season);
    const direct = Number(data && (data.seasonYear || data.SeasonYear || data.season || data.year));
    if (Number.isFinite(direct) && direct > 2000) return direct;
    const manifestFallback = Number(state.manifest && state.manifest.currentSeasonFallback);
    if (Number.isFinite(manifestFallback) && manifestFallback > 2000) return manifestFallback;
    const titleMatch = String(document.title || '').match(/20\d{2}/);
    return titleMatch ? Number(titleMatch[0]) : new Date().getFullYear();
  }

  function addStylesheet() {
    if (document.getElementById('hggl-season-manager-css')) return;
    const link = document.createElement('link');
    link.id = 'hggl-season-manager-css';
    link.rel = 'stylesheet';
    link.href = 'season-manager.css?v=1.0.0';
    document.head.appendChild(link);
  }

  function injectSeasonSwitcher() {
    if (document.getElementById('season-switcher-wrap')) return;
    const nav = document.querySelector('.nav');
    if (!nav || !nav.parentNode) return;
    const wrap = document.createElement('div');
    wrap.id = 'season-switcher-wrap';
    wrap.className = 'season-switcher-wrap';
    wrap.innerHTML =
      '<div class="season-switcher-inner">' +
        '<div class="season-switcher-copy">' +
          '<span class="season-switcher-kicker">HGGL Season</span>' +
          '<span class="season-mode-status" id="season-mode-status">Current season</span>' +
        '</div>' +
        '<label class="season-select-label" for="hggl-season-select">Season</label>' +
        '<select id="hggl-season-select" class="season-select" aria-label="Choose HGGL season"></select>' +
      '</div>';
    nav.parentNode.insertBefore(wrap, nav);
    wrap.querySelector('#hggl-season-select').addEventListener('change', function (event) {
      selectSeason(Number(event.target.value));
    });
  }

  function injectHistoryNavigation() {
    const nav = document.querySelector('.nav');
    if (!nav || document.querySelector('[data-history-nav]')) return;
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.setAttribute('data-history-nav', '');
    btn.textContent = 'History';
    btn.addEventListener('click', function () {
      if (typeof show === 'function') show('history', btn);
      renderHistory();
    });
    const rulesButton = Array.from(nav.querySelectorAll('.nav-btn')).find(function (b) {
      return String(b.textContent || '').trim().toLowerCase() === 'rules';
    });
    if (rulesButton) nav.insertBefore(btn, rulesButton);
    else nav.appendChild(btn);
  }

  function injectHistorySection() {
    if (document.getElementById('history')) return;
    const content = document.querySelector('.content');
    if (!content) return;
    const section = document.createElement('div');
    section.id = 'history';
    section.className = 'section';
    section.innerHTML =
      '<div class="section-header"><span class="section-label">League History</span><div class="section-header-line"></div></div>' +
      '<p class="section-subtitle">Champions, championship teams, and the permanent HGGL season archive.</p>' +
      '<div id="history-container"><div class="history-loading">Loading league history...</div></div>';
    const rules = document.getElementById('rules');
    if (rules) content.insertBefore(section, rules);
    else content.appendChild(section);
  }

  function archiveYears() {
    return ((state.manifest && state.manifest.seasons) || [])
      .filter(function (s) { return !!s.archive; })
      .map(function (s) { return Number(s.year); })
      .filter(function (y) { return Number.isFinite(y); });
  }

  function renderSeasonOptions() {
    const select = document.getElementById('hggl-season-select');
    if (!select || !state.liveSeason) return;
    const years = Array.from(new Set([state.liveSeason].concat(archiveYears()))).sort(function (a, b) { return b - a; });
    select.innerHTML = years.map(function (year) {
      const suffix = year === state.liveSeason ? ' · Current' : ' · Archive';
      return '<option value="' + year + '">' + year + suffix + '</option>';
    }).join('');
    select.value = String(state.selectedSeason || state.liveSeason);
  }

  function setSeasonLabels(year, isArchive) {
    state.selectedSeason = year;
    document.body.classList.toggle('season-archive-mode', !!isArchive);
    document.title = 'Hockey Guys Golf League ' + year + (isArchive ? ' Archive' : '');

    const ticker = document.querySelector('.ticker-label');
    if (ticker) ticker.innerHTML = (isArchive ? 'ARCHIVE' : 'LIVE') + ' &nbsp;·&nbsp; ' + year;

    const standingsLabel = document.querySelector('#standings .section-label');
    if (standingsLabel) standingsLabel.textContent = year + ' Standings';
    const playoffsLabel = document.querySelector('#playoffs .section-label');
    if (playoffsLabel) playoffsLabel.textContent = year + ' Playoffs';

    const status = document.getElementById('season-mode-status');
    if (status) status.textContent = isArchive ? 'Final season archive · read only' : 'Current season · live data';

    const footerText = document.querySelector('.footer > div');
    if (footerText) footerText.innerHTML = 'Hockey Guys Golf League &nbsp;·&nbsp; ' + year + (isArchive ? ' Archive' : ' Season') + ' &nbsp;·&nbsp; Twin Hills · Spencerport NY';

    const select = document.getElementById('hggl-season-select');
    if (select) select.value = String(year);
  }

  function refreshVisiblePage() {
    if (typeof rebuildAll === 'function') rebuildAll();
    const active = document.querySelector('.section.active');
    if (!active) return;
    if (active.id === 'extras' && typeof buildExtras === 'function') buildExtras();
    if (active.id === 'stats' && typeof buildStats === 'function') buildStats();
    if (active.id === 'playoffs' && typeof buildPlayoffsPage === 'function') buildPlayoffsPage();
    if (active.id === 'history') renderHistory();
  }

  function setDataSourceLabel(year, isArchive) {
    try {
      if (typeof LEAGUE_DATA_SOURCE !== 'undefined') LEAGUE_DATA_SOURCE = isArchive ? (year + ' Archive') : 'Google Sheets';
      if (typeof LEAGUE_DATA_LAST_LOADED !== 'undefined' && isArchive) LEAGUE_DATA_LAST_LOADED = 'Final';
    } catch (e) {}
  }

  function applySeasonData(data, year, isArchive) {
    if (typeof applyLeagueDataFromSheet !== 'function') throw new Error('League data loader is not available.');
    applyLeagueDataFromSheet(cloneData(data));
    setDataSourceLabel(year, isArchive);
    setSeasonLabels(year, isArchive);
    refreshVisiblePage();
  }

  async function loadArchive(year) {
    if (state.archiveCache[year]) return state.archiveCache[year];
    const entry = ((state.manifest && state.manifest.seasons) || []).find(function (s) { return Number(s.year) === Number(year); });
    if (!entry || !entry.archive) throw new Error('No archive is configured for ' + year + '.');
    const response = await fetch(entry.archive + '?v=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load the ' + year + ' archive.');
    const data = await response.json();
    state.archiveCache[year] = data;
    return data;
  }

  async function selectSeason(year, options) {
    options = options || {};
    year = Number(year);
    if (!year || !state.liveSeason) return;

    const select = document.getElementById('hggl-season-select');
    if (select) select.disabled = true;
    try {
      if (year === state.liveSeason) {
        if (state.liveData) {
          applySeasonData(state.liveData, year, false);
        } else {
          const url = new URL(window.location.href);
          url.searchParams.delete('season');
          window.location.href = url.toString();
          return;
        }
      } else {
        const archive = await loadArchive(year);
        applySeasonData(archive, year, true);
      }

      if (options.updateUrl !== false) {
        const url = new URL(window.location.href);
        if (year === state.liveSeason) url.searchParams.delete('season');
        else url.searchParams.set('season', String(year));
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) {
      console.error('HGGL season switch failed:', error);
      alert(error.message || 'Could not switch seasons.');
      if (select) select.value = String(state.selectedSeason || state.liveSeason);
    } finally {
      if (select) select.disabled = false;
    }
  }

  function championCard(season) {
    const champ = season.champion || {};
    const runner = season.runnerUp || {};
    const players = (champ.players || []).join(' & ');
    const runnerPlayers = (runner.players || []).join(' & ');
    const isCurrent = Number(season.year) === Number(state.liveSeason);
    const hasArchive = !!season.archive;
    const modeLabel = isCurrent ? 'Current Season' : (hasArchive ? 'Season Archive' : 'League History');
    const finalLine = runner.team
      ? '<div class="history-final-line">Defeated ' + escapeHtml(runner.team) + (runnerPlayers ? ' (' + escapeHtml(runnerPlayers) + ')' : '') + (season.championshipResult ? ' · ' + escapeHtml(season.championshipResult) : '') + '</div>'
      : (season.formatNote ? '<div class="history-final-line">' + escapeHtml(season.formatNote) + '</div>' : '');
    return '<article class="history-champion-card">' +
      '<div class="history-year-row"><span class="history-year">' + escapeHtml(season.year) + '</span><span class="history-season-tag">' + modeLabel + '</span></div>' +
      '<div class="history-trophy">🏆</div>' +
      '<div class="history-champion-kicker">HGGL Champions</div>' +
      '<div class="history-champion-team">' + escapeHtml(champ.team || 'TBD') + '</div>' +
      '<div class="history-champion-players">' + escapeHtml(players || 'Players TBD') + '</div>' +
      finalLine +
      '<div class="history-card-meta">' +
        (champ.seed ? '<span>#' + escapeHtml(champ.seed) + ' playoff seed</span>' : '') +
        (season.matchesRecorded ? '<span>' + escapeHtml(season.matchesRecorded) + ' matches recorded</span>' : '') +
      '</div>' +
      (hasArchive ? '<button class="history-view-season" type="button" data-history-season="' + escapeHtml(season.year) + '">View ' + escapeHtml(season.year) + ' Season</button>' : '') +
    '</article>';
  }

  function renderHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;
    const seasons = ((state.manifest && state.manifest.seasons) || []).slice().sort(function (a, b) { return Number(b.year) - Number(a.year); });
    if (!seasons.length) {
      container.innerHTML = '<div class="no-results"><div class="no-results-icon">🏆</div><div class="no-results-text">No championship seasons have been archived yet.</div></div>';
      return;
    }

    const championCounts = {};
    seasons.forEach(function (season) {
      ((season.champion && season.champion.players) || []).forEach(function (player) {
        championCounts[player] = (championCounts[player] || 0) + 1;
      });
    });
    const playerLeaders = Object.keys(championCounts).sort(function (a, b) {
      return championCounts[b] - championCounts[a] || a.localeCompare(b);
    });

    container.innerHTML =
      '<div class="history-featured">' + championCard(seasons[0]) + '</div>' +
      '<div class="history-subhead"><span>Championship Archive</span><div></div></div>' +
      '<div class="history-table-wrap"><table class="history-table"><thead><tr><th>Season</th><th>Champion</th><th>Players</th><th>Runner-Up</th></tr></thead><tbody>' +
        seasons.map(function (season) {
          return '<tr>' +
            '<td>' + (season.archive
              ? '<button type="button" class="history-year-link" data-history-season="' + escapeHtml(season.year) + '">' + escapeHtml(season.year) + '</button>'
              : '<span class="history-year-static">' + escapeHtml(season.year) + '</span>') + '</td>' +
            '<td><strong>' + escapeHtml((season.champion || {}).team || '') + '</strong></td>' +
            '<td>' + escapeHtml(((season.champion || {}).players || []).join(' & ')) + '</td>' +
            '<td>' + escapeHtml((season.runnerUp || {}).team || '') + '</td>' +
          '</tr>';
        }).join('') +
      '</tbody></table></div>' +
      '<div class="history-subhead"><span>Championships by Player</span><div></div></div>' +
      '<div class="history-player-grid">' +
        playerLeaders.map(function (player) {
          const count = championCounts[player];
          return '<div class="history-player-chip"><span>' + escapeHtml(player) + '</span><strong>' + count + '</strong></div>';
        }).join('') +
      '</div>' +
      '<p class="history-footnote">Additional past champions can be added to the history file as older league records are confirmed. Each archived season remains read-only.</p>';

    container.querySelectorAll('[data-history-season]').forEach(function (button) {
      button.addEventListener('click', function () { selectSeason(Number(button.getAttribute('data-history-season'))); });
    });
  }

  async function loadManifest() {
    const response = await fetch(HISTORY_URL + '?v=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load league history.');
    state.manifest = await response.json();
    return state.manifest;
  }

  function waitForLiveData(timeoutMs) {
    timeoutMs = timeoutMs || 15000;
    return new Promise(function (resolve) {
      const started = Date.now();
      (function check() {
        try {
          if (typeof LEAGUE_API_DATA !== 'undefined' && LEAGUE_API_DATA) {
            resolve(LEAGUE_API_DATA);
            return;
          }
        } catch (e) {}
        if (Date.now() - started >= timeoutMs) {
          resolve(null);
          return;
        }
        setTimeout(check, 100);
      })();
    });
  }

  function guardArchiveRefresh() {
    try {
      if (typeof manualRefreshLeagueData !== 'function' || manualRefreshLeagueData.__seasonGuarded) return;
      const original = manualRefreshLeagueData;
      const guarded = async function (btn) {
        if (state.selectedSeason && state.liveSeason && state.selectedSeason !== state.liveSeason) {
          alert('Archived seasons are read-only. Switch to the current season to refresh live data.');
          return;
        }
        const answer = await original(btn);
        try {
          if (typeof LEAGUE_API_DATA !== 'undefined' && LEAGUE_API_DATA) {
            state.liveData = cloneData(LEAGUE_API_DATA);
            const detected = detectSeason(state.liveData);
            if (detected && detected !== state.liveSeason) {
              state.liveSeason = detected;
              state.selectedSeason = detected;
              renderSeasonOptions();
              setSeasonLabels(detected, false);
              renderHistory();
            }
          }
        } catch (e) {}
        return answer;
      };
      guarded.__seasonGuarded = true;
      manualRefreshLeagueData = guarded;
    } catch (e) {}
  }

  async function boot() {
    if (state.booted) return;
    state.booted = true;
    addStylesheet();
    injectSeasonSwitcher();
    injectHistoryNavigation();
    injectHistorySection();

    const manifestPromise = loadManifest().catch(function (error) {
      console.warn('HGGL history manifest unavailable:', error);
      state.manifest = { seasons: [] };
      return state.manifest;
    });

    const live = await waitForLiveData();
    state.liveData = live ? cloneData(live) : null;
    state.liveSeason = detectSeason(live);
    state.selectedSeason = state.liveSeason;

    await manifestPromise;
    state.liveSeason = detectSeason(live);
    state.selectedSeason = state.liveSeason;
    renderSeasonOptions();
    renderHistory();
    setSeasonLabels(state.liveSeason, false);
    guardArchiveRefresh();

    const requested = Number(new URL(window.location.href).searchParams.get('season'));
    if (requested && requested !== state.liveSeason && archiveYears().indexOf(requested) >= 0) {
      await selectSeason(requested, { updateUrl: false });
    }
  }

  window.HGGLSeason = {
    selectSeason: selectSeason,
    renderHistory: renderHistory,
    getState: function () {
      return {
        liveSeason: state.liveSeason,
        selectedSeason: state.selectedSeason,
        archives: archiveYears().slice()
      };
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);
})();
