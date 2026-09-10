/*
 * HGGL multi-season archive layer
 * Keeps the current Google Sheet as the live-season source while allowing
 * completed seasons to render from frozen JSON snapshots in this repository.
 */
(function () {
  'use strict';

  const CONFIG_URL = 'data/seasons/index.json';
  const HISTORY_URL = 'data/history.json';
  const SELECTED_SEASON_KEY = 'hggl_selected_season';
  let seasonConfig = null;
  let historyData = null;
  let activeSeasonEntry = null;
  let originalApplyLeagueData = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function setText(selector, text) {
    const el = qs(selector);
    if (el) el.textContent = text;
  }

  function requestedSeason(config) {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = Number(params.get('season'));
    if (fromUrl && config.seasons.some(function (s) { return Number(s.year) === fromUrl; })) return fromUrl;

    try {
      const saved = Number(localStorage.getItem(SELECTED_SEASON_KEY));
      if (saved && config.seasons.some(function (s) { return Number(s.year) === saved; })) return saved;
    } catch (e) {}

    return Number(config.defaultSeason || config.currentSeason || (config.seasons[0] && config.seasons[0].year));
  }

  function switchSeason(year) {
    try { localStorage.setItem(SELECTED_SEASON_KEY, String(year)); } catch (e) {}
    const url = new URL(window.location.href);
    url.searchParams.set('season', String(year));
    window.location.href = url.toString();
  }

  function injectStyles() {
    if (document.getElementById('hggl-season-manager-styles')) return;
    const style = document.createElement('style');
    style.id = 'hggl-season-manager-styles';
    style.textContent = `
      .season-switcher-wrap{background:#0f151d;border-bottom:1px solid rgba(255,255,255,.08);padding:10px 16px;}
      .season-switcher{max-width:720px;margin:0 auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
      .season-switcher-label{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-right:3px;}
      .season-chip{appearance:none;border:1px solid rgba(255,255,255,.14);background:var(--dark3);color:var(--text);border-radius:999px;padding:6px 11px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:.18s ease;}
      .season-chip:hover{border-color:rgba(46,204,64,.65);color:#fff;}
      .season-chip.active{background:var(--green);border-color:var(--green);color:#071009;}
      .season-chip small{font-size:9px;opacity:.72;margin-left:4px;}
      .season-mode-banner{max-width:720px;margin:12px auto 0;padding:8px 12px;border:1px solid rgba(245,197,24,.28);background:rgba(245,197,24,.08);border-radius:8px;text-align:center;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold);}
      .history-hero{border:1px solid rgba(245,197,24,.24);background:linear-gradient(145deg,rgba(245,197,24,.12),rgba(46,204,64,.05));border-radius:14px;padding:20px;margin-bottom:16px;}
      .history-kicker{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--gold);}
      .history-title{font-family:'Bebas Neue',sans-serif;font-size:38px;letter-spacing:2px;color:#fff;margin-top:3px;line-height:1;}
      .history-copy{color:var(--muted);font-size:13px;line-height:1.5;margin-top:8px;}
      .champion-grid{display:grid;gap:12px;}
      .champion-card{background:var(--dark3);border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:16px;position:relative;overflow:hidden;}
      .champion-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--gold);}
      .champion-season{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;color:var(--gold);}
      .champion-team{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:900;color:#fff;margin-top:2px;}
      .champion-players{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:var(--ice);margin-top:3px;}
      .champion-result{font-size:12px;color:var(--muted);margin-top:8px;line-height:1.45;}
      .history-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:18px;}
      .history-stat-card{background:var(--dark3);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:13px;}
      .history-stat-card b{display:block;font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--green);letter-spacing:1px;}
      .history-stat-card span{font-family:'Barlow Condensed',sans-serif;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;}
      .history-player-table{width:100%;border-collapse:separate;border-spacing:0 6px;margin-top:10px;}
      .history-player-table th{font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);text-align:left;padding:0 10px 5px;}
      .history-player-table td{background:var(--dark3);padding:9px 10px;font-size:12px;}
      .history-player-table td:first-child{border-radius:8px 0 0 8px;font-weight:700;color:#fff;}
      .history-player-table td:last-child{border-radius:0 8px 8px 0;color:var(--gold);font-family:'Bebas Neue',sans-serif;font-size:18px;text-align:center;}
      .history-footnote{font-size:11px;color:var(--muted);line-height:1.45;margin-top:14px;}
      body.season-archive #hero-weather{display:none!important;}
      body.season-archive .footer-admin-link{opacity:.45;}
      @media (max-width:700px){
        .nav{overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
        .nav::-webkit-scrollbar{display:none;}
        .nav .nav-btn{flex:0 0 auto;min-width:74px;padding-left:9px;padding-right:9px;}
        .history-stats{grid-template-columns:1fr;}
      }
    `;
    document.head.appendChild(style);
  }

  function injectSeasonSwitcher(config, selectedYear) {
    if (document.getElementById('season-switcher-wrap')) return;
    const nav = qs('.nav');
    if (!nav) return;
    const wrap = document.createElement('div');
    wrap.id = 'season-switcher-wrap';
    wrap.className = 'season-switcher-wrap';
    const inner = document.createElement('div');
    inner.className = 'season-switcher';
    const label = document.createElement('span');
    label.className = 'season-switcher-label';
    label.textContent = 'Season';
    inner.appendChild(label);
    config.seasons.slice().sort(function (a, b) { return Number(b.year) - Number(a.year); }).forEach(function (entry) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'season-chip' + (Number(entry.year) === Number(selectedYear) ? ' active' : '');
      button.innerHTML = esc(entry.year) + '<small>' + esc(entry.status === 'current' ? 'Current' : 'Archive') + '</small>';
      button.addEventListener('click', function () { switchSeason(entry.year); });
      inner.appendChild(button);
    });
    wrap.appendChild(inner);
    nav.parentNode.insertBefore(wrap, nav);
  }

  function injectHistoryNavAndSection() {
    const nav = qs('.nav');
    if (nav && !qs('[data-history-nav]', nav)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-btn';
      button.setAttribute('data-history-nav', 'true');
      button.textContent = 'History';
      button.addEventListener('click', function () {
        if (typeof window.show === 'function') window.show('history', button);
        renderHistory();
      });
      const rulesBtn = Array.from(nav.querySelectorAll('.nav-btn')).find(function (btn) {
        return btn.textContent.trim().toLowerCase() === 'rules';
      });
      if (rulesBtn) nav.insertBefore(button, rulesBtn); else nav.appendChild(button);
    }
    if (!document.getElementById('history')) {
      const content = qs('.content');
      if (!content) return;
      const section = document.createElement('div');
      section.id = 'history';
      section.className = 'section';
      section.innerHTML = '<div class="section-header"><span class="section-label">League History</span><div class="section-header-line"></div></div>' +
        '<p class="section-subtitle">Champions and league records from completed HGGL seasons.</p>' +
        '<div id="history-container"><div class="no-results"><div class="no-results-icon">🏆</div><div class="no-results-text">Loading league history...</div></div></div>';
      const rulesSection = document.getElementById('rules');
      if (rulesSection) content.insertBefore(section, rulesSection); else content.appendChild(section);
    }
  }

  function updateSeasonLabels(entry) {
    const year = Number(entry.year);
    const isArchive = entry.status === 'archive';
    document.body.classList.toggle('season-archive', isArchive);
    document.body.setAttribute('data-season', String(year));
    document.body.setAttribute('data-season-mode', isArchive ? 'archive' : 'current');
    document.title = 'Hockey Guys Golf League ' + year;
    const ticker = qs('.ticker-label');
    if (ticker) ticker.innerHTML = (isArchive ? 'ARCHIVE' : 'LIVE') + ' &nbsp;·&nbsp; ' + year;
    const standingsLabel = qs('#standings .section-label');
    if (standingsLabel) standingsLabel.textContent = year + ' Standings';
    const playoffLabel = qs('#playoffs .section-label');
    if (playoffLabel) playoffLabel.textContent = year + ' Playoffs';
    if (isArchive) {
      setText('#dashboard .section-subtitle', 'Final standings, results, playoff matchups, and season leaders from the ' + year + ' archive.');
      setText('#standings-updated', 'Final ' + year + ' regular-season standings.');
      setText('#playoffs .section-subtitle', 'Final ' + year + ' playoff bracket and championship results.');
      setText('#schedule .section-subtitle', 'Final weekly matchups, tee times, and front/back nine assignments.');
      setText('#results-updated', 'Final ' + year + ' match results.');
      setText('#extras .section-subtitle', 'Final ' + year + ' net skins and closest-to-the-pin results.');
      setText('#stats .section-subtitle', 'Final ' + year + ' individual scoring trends and season leaders.');
      const hero = qs('.hero-inner');
      if (hero && !document.getElementById('season-mode-banner')) {
        const banner = document.createElement('div');
        banner.id = 'season-mode-banner';
        banner.className = 'season-mode-banner';
        banner.textContent = year + ' FINAL SEASON ARCHIVE · READ ONLY';
        hero.appendChild(banner);
      }
    }
    const footerText = qs('.footer > div');
    if (footerText) footerText.innerHTML = 'Hockey Guys Golf League &nbsp;·&nbsp; ' + year + ' Season &nbsp;·&nbsp; Twin Hills · Spencerport NY';
  }

  function installArchiveGuards(year) {
    window.HGGL_ARCHIVE_MODE = true;
    if (!originalApplyLeagueData) originalApplyLeagueData = window.applyLeagueDataFromSheet;
    if (typeof originalApplyLeagueData === 'function') {
      const guardedApply = function (data) {
        if (window.HGGL_ARCHIVE_MODE && !window.HGGL_ALLOW_ARCHIVE_APPLY) return false;
        return originalApplyLeagueData(data);
      };
      try { window.applyLeagueDataFromSheet = guardedApply; } catch (e) {}
      try { applyLeagueDataFromSheet = guardedApply; } catch (e) {}
    }
    const blockedRefresh = async function () { return false; };
    try { window.fetchLeagueDataFromSheets = blockedRefresh; } catch (e) {}
    try { fetchLeagueDataFromSheets = blockedRefresh; } catch (e) {}
    const archiveStatus = function () { return year + ' Season Archive · Final'; };
    try { window.getDataStatusLabel = archiveStatus; } catch (e) {}
    try { getDataStatusLabel = archiveStatus; } catch (e) {}
    const archiveManualRefresh = async function (btn) {
      if (btn) {
        const old = btn.textContent;
        btn.textContent = 'Archive · Read Only';
        setTimeout(function () { btn.textContent = old || 'Refresh Data'; }, 1400);
      }
      return false;
    };
    try { window.manualRefreshLeagueData = archiveManualRefresh; } catch (e) {}
    try { manualRefreshLeagueData = archiveManualRefresh; } catch (e) {}
  }

  async function loadArchivedSeason(entry) {
    installArchiveGuards(entry.year);
    const archiveFiles = Array.isArray(entry.files) && entry.files.length ? entry.files : [entry.data];
    const responses = await Promise.all(archiveFiles.map(function (path) {
      return fetch(path + '?v=' + encodeURIComponent(entry.version || '1'));
    }));
    const badResponse = responses.find(function (r) { return !r.ok; });
    if (badResponse) throw new Error('Could not load ' + entry.year + ' archive (' + badResponse.status + ').');
    const pieces = await Promise.all(responses.map(function (r) { return r.json(); }));
    const data = pieces.reduce(function (merged, piece) {
      Object.keys(piece || {}).forEach(function (key) {
        if (Array.isArray(piece[key]) && Array.isArray(merged[key])) merged[key] = merged[key].concat(piece[key]); else merged[key] = piece[key];
      });
      return merged;
    }, {});
    const applyFn = originalApplyLeagueData || window.applyLeagueDataFromSheet;
    if (typeof applyFn !== 'function') throw new Error('League renderer is not available.');
    window.HGGL_ALLOW_ARCHIVE_APPLY = true;
    try { applyFn(data); } finally { window.HGGL_ALLOW_ARCHIVE_APPLY = false; }
    if (typeof window.rebuildAll === 'function') window.rebuildAll();
    if (typeof window.buildExtras === 'function') window.buildExtras();
    if (typeof window.buildPlayoffsPage === 'function') window.buildPlayoffsPage();
    if (typeof window.initCommissionerNoteEditor === 'function') window.initCommissionerNoteEditor();
    setTimeout(function () {
      window.HGGL_ALLOW_ARCHIVE_APPLY = true;
      try { applyFn(data); } finally { window.HGGL_ALLOW_ARCHIVE_APPLY = false; }
      if (typeof window.rebuildAll === 'function') window.rebuildAll();
      if (typeof window.buildExtras === 'function') window.buildExtras();
      if (typeof window.buildPlayoffsPage === 'function') window.buildPlayoffsPage();
    }, 900);
  }

  function renderHistory() {
    const container = document.getElementById('history-container');
    if (!container || !historyData) return;
    const champions = (historyData.champions || []).slice().sort(function (a, b) { return Number(b.season) - Number(a.season); });
    if (!champions.length) {
      container.innerHTML = '<div class="no-results"><div class="no-results-icon">🏆</div><div class="no-results-text">No confirmed league champions have been archived yet.</div></div>';
      return;
    }
    const playerCounts = {};
    champions.forEach(function (season) {
      (season.players || []).forEach(function (player) { playerCounts[player] = (playerCounts[player] || 0) + 1; });
    });
    const playerRows = Object.keys(playerCounts).sort(function (a, b) { return playerCounts[b] - playerCounts[a] || a.localeCompare(b); });
    const cards = champions.map(function (season) {
      let result = '';
      if (season.runnerUp) result = 'Defeated ' + esc(season.runnerUp) + (season.result ? ' · ' + esc(season.result) : '');
      else if (season.note) result = esc(season.note);
      return '<div class="champion-card">' +
        '<div class="champion-season">🏆 ' + esc(season.season) + ' Champions</div>' +
        '<div class="champion-team">' + esc(season.team) + '</div>' +
        '<div class="champion-players">' + esc((season.players || []).join(' · ')) + '</div>' +
        (result ? '<div class="champion-result">' + result + '</div>' : '') +
      '</div>';
    }).join('');
    const mostTitles = Math.max.apply(null, playerRows.map(function (name) { return playerCounts[name]; }));
    const leaderNames = playerRows.filter(function (name) { return playerCounts[name] === mostTitles; });
    const tableRows = playerRows.map(function (name) { return '<tr><td>' + esc(name) + '</td><td>' + playerCounts[name] + '</td></tr>'; }).join('');
    container.innerHTML =
      '<div class="history-hero"><div class="history-kicker">The Cup Lives Here</div><div class="history-title">HGGL Champions</div><div class="history-copy">A permanent record of confirmed Hockey Guys Golf League champions. Additional historical seasons can be added as old league records are verified.</div></div>' +
      '<div class="champion-grid">' + cards + '</div>' +
      '<div class="history-stats"><div class="history-stat-card"><b>' + champions.length + '</b><span>Confirmed Seasons</span></div><div class="history-stat-card"><b>' + esc(leaderNames.join(' · ')) + '</b><span>Most Championships (' + mostTitles + ')</span></div></div>' +
      '<div class="section-header" style="margin-top:24px;margin-bottom:8px"><span class="section-label" style="font-size:17px">Championships by Player</span><div class="section-header-line"></div></div>' +
      '<table class="history-player-table"><thead><tr><th>Player</th><th style="text-align:center">Titles</th></tr></thead><tbody>' + tableRows + '</tbody></table>' +
      '<div class="history-footnote">Only seasons supported by confirmed league records are shown. Missing seasons are intentionally left out until the champion can be verified.</div>';
  }

  async function init() {
    try {
      injectStyles();
      const responses = await Promise.all([fetch(CONFIG_URL + '?v=1'), fetch(HISTORY_URL + '?v=1')]);
      if (!responses[0].ok) throw new Error('Season index could not be loaded.');
      seasonConfig = await responses[0].json();
      historyData = responses[1].ok ? await responses[1].json() : { champions: [] };
      const year = requestedSeason(seasonConfig);
      activeSeasonEntry = seasonConfig.seasons.find(function (s) { return Number(s.year) === Number(year); }) || seasonConfig.seasons[0];
      if (!activeSeasonEntry) throw new Error('No HGGL season is configured.');
      injectSeasonSwitcher(seasonConfig, activeSeasonEntry.year);
      injectHistoryNavAndSection();
      updateSeasonLabels(activeSeasonEntry);
      renderHistory();
      if (activeSeasonEntry.status === 'archive' && (activeSeasonEntry.data || (activeSeasonEntry.files && activeSeasonEntry.files.length))) await loadArchivedSeason(activeSeasonEntry);
    } catch (err) {
      console.error('HGGL season manager failed:', err);
      const wrap = document.getElementById('season-switcher-wrap');
      if (wrap) wrap.title = err.message;
    }
  }

  window.HGGLSeasonManager = {
    init: init,
    switchSeason: switchSeason,
    renderHistory: renderHistory,
    getActiveSeason: function () { return activeSeasonEntry; },
    getConfig: function () { return seasonConfig; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
