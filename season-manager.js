/*
 * HGGL multi-season manager v2
 * 2027 preseason landing + frozen completed-season archives.
 */
(function () {
  'use strict';

  const CONFIG_URL = 'data/seasons/index.json';
  const HISTORY_URL = 'data/history.json';
  const SELECTED_SEASON_KEY = 'hggl_selected_season_v2';
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

  function isArchive(entry) {
    return !!entry && (entry.status === 'archive' || entry.status === 'final');
  }

  function isPreseason(entry) {
    return !!entry && (entry.status === 'preseason' || entry.status === 'upcoming');
  }

  function seasonChipLabel(entry) {
    if (isArchive(entry)) return 'Final';
    if (isPreseason(entry)) return 'Coming';
    return entry.status === 'current' ? 'Current' : String(entry.status || 'Season');
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
      .season-switcher{max-width:780px;margin:0 auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
      .season-switcher-label{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-right:3px;}
      .season-chip{appearance:none;border:1px solid rgba(255,255,255,.14);background:var(--dark3);color:var(--text);border-radius:999px;padding:6px 11px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:.18s ease;}
      .season-chip:hover{border-color:rgba(216,179,93,.65);color:#fff;}
      .season-chip.active{background:var(--gold);border-color:var(--gold);color:#101826;}
      .season-chip small{font-size:9px;opacity:.72;margin-left:4px;}
      .season-mode-banner{max-width:720px;margin:12px auto 0;padding:8px 12px;border:1px solid rgba(245,197,24,.28);background:rgba(245,197,24,.08);border-radius:8px;text-align:center;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:var(--gold);}
      .history-hero{border:1px solid rgba(245,197,24,.24);background:linear-gradient(145deg,rgba(245,197,24,.12),rgba(159,201,220,.04));border-radius:14px;padding:20px;margin-bottom:16px;}
      .history-kicker{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--gold);}
      .history-title{font-family:'Bebas Neue',sans-serif;font-size:38px;letter-spacing:2px;color:#fff;margin-top:3px;line-height:1;}
      .champion-grid{display:grid;gap:12px;}
      .champion-card{background:var(--dark3);border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:16px;position:relative;overflow:hidden;}
      .champion-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--gold);}
      .champion-season{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;color:var(--gold);}
      .champion-team{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:900;color:#fff;margin-top:2px;}
      .champion-players{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:var(--ice);margin-top:3px;}
      .champion-result{font-size:12px;color:var(--muted);margin-top:8px;line-height:1.45;}
      .history-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:18px;}
      .history-stat-card{background:var(--dark3);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:13px;}
      .history-stat-card b{display:block;font-family:'Bebas Neue',sans-serif;font-size:24px;color:var(--gold);letter-spacing:1px;}
      .history-stat-card span{font-family:'Barlow Condensed',sans-serif;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;}
      .history-player-table{width:100%;border-collapse:separate;border-spacing:0 6px;margin-top:10px;}
      .history-player-table th{font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);text-align:left;padding:0 10px 5px;}
      .history-player-table td{background:var(--dark3);padding:9px 10px;font-size:12px;}
      .history-player-table td:first-child{border-radius:8px 0 0 8px;font-weight:700;color:#fff;}
      .history-player-table td:last-child{border-radius:0 8px 8px 0;color:var(--gold);font-family:'Bebas Neue',sans-serif;font-size:18px;text-align:center;}

      body.season-archive #hero-weather{display:none!important;}
      body.season-archive .footer-admin-link{opacity:.45;}
      body.season-archive .data-status-mini{display:none!important;}
      body.season-preseason #hero-weather{display:none!important;}
      body.season-preseason .data-status-mini{display:none!important;}
      body.season-preseason #dashboard-container>*:not(.preseason-shell){display:none!important;}
      body.season-preseason #standings .view-toggle,
      body.season-preseason #standings #view-table,
      body.season-preseason #standings #view-cards,
      body.season-preseason #playoffs #playoffs-container>*:not(.preseason-placeholder),
      body.season-preseason #schedule #schedule-container>*:not(.preseason-placeholder),
      body.season-preseason #results #results-container>*:not(.preseason-placeholder),
      body.season-preseason #extras #extras-container>*:not(.preseason-placeholder),
      body.season-preseason #stats .stats-filter,
      body.season-preseason #stats #stats-leaders-banner,
      body.season-preseason #stats #stats-no-data,
      body.season-preseason #stats #stats-container{display:none!important;}

      .preseason-shell{display:block!important;}
      .preseason-hero-card{position:relative;overflow:hidden;border:1px solid rgba(216,179,93,.38);background:linear-gradient(135deg,rgba(216,179,93,.16),rgba(159,201,220,.075) 58%,rgba(255,255,255,.025));border-radius:18px;padding:30px 26px 26px;margin-bottom:14px;box-shadow:0 18px 42px rgba(0,0,0,.2);}
      .preseason-hero-card::after{content:'2027';position:absolute;right:-4px;bottom:-36px;font-family:'Bebas Neue',sans-serif;font-size:150px;letter-spacing:4px;color:rgba(255,255,255,.025);pointer-events:none;}
      .preseason-kicker{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:var(--gold);}
      .preseason-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(40px,7vw,62px);line-height:.95;letter-spacing:2px;color:#fff;margin:6px 0 12px;max-width:650px;}
      .preseason-copy{font-family:'Inter Tight','Barlow',sans-serif;font-size:15px;font-weight:600;line-height:1.5;color:#b9c6d5;max-width:675px;position:relative;z-index:1;}
      .preseason-badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px;position:relative;z-index:1;}
      .preseason-badge{border:1px solid rgba(216,179,93,.32);background:rgba(16,24,38,.56);border-radius:999px;padding:7px 12px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:900;letter-spacing:1.7px;text-transform:uppercase;color:var(--gold);}
      .preseason-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
      .preseason-card{background:linear-gradient(180deg,rgba(255,255,255,.048),rgba(255,255,255,.024));border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:18px;min-height:150px;}
      .preseason-card.wide{grid-column:1/-1;min-height:auto;}
      .preseason-card-label{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:var(--gold);}
      .preseason-card-value{font-family:'Bebas Neue',sans-serif;font-size:31px;line-height:1;letter-spacing:1.4px;color:#fff;margin:6px 0 8px;}
      .preseason-card-copy{font-family:'Inter Tight','Barlow',sans-serif;font-size:13px;line-height:1.45;color:var(--muted);}
      .preseason-placeholder{display:block!important;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.022));border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:26px 20px;text-align:center;margin-top:8px;}
      .preseason-placeholder-icon{font-size:30px;margin-bottom:9px;}
      .preseason-placeholder-title{font-family:'Bebas Neue',sans-serif;font-size:27px;letter-spacing:1.5px;color:#fff;}
      .preseason-placeholder-copy{font-family:'Inter Tight','Barlow',sans-serif;font-size:13px;line-height:1.45;color:var(--muted);max-width:500px;margin:5px auto 0;}
      .preseason-rules{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
      .preseason-rule{background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.022));border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:18px;}
      .preseason-rule strong{display:block;font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:7px;}
      .preseason-rule b{display:block;font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:1px;color:#fff;margin-bottom:4px;}
      .preseason-rule p{font-size:13px;line-height:1.45;color:var(--muted);}

      @media (max-width:700px){
        .nav{overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;}
        .nav::-webkit-scrollbar{display:none;}
        .nav .nav-btn{flex:0 0 auto;min-width:74px;padding-left:9px;padding-right:9px;}
        .history-stats,.preseason-grid,.preseason-rules{grid-template-columns:1fr;}
        .preseason-card.wide{grid-column:auto;}
        .preseason-hero-card{padding:22px 18px 20px;}
        .preseason-hero-card::after{font-size:105px;bottom:-24px;}
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
      button.innerHTML = esc(entry.year) + '<small>' + esc(seasonChipLabel(entry)) + '</small>';
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
        '<p class="section-subtitle">Past champions and all-time title leaders.</p>' +
        '<div id="history-container"><div class="no-results"><div class="no-results-icon">🏆</div><div class="no-results-text">Loading league history...</div></div></div>';
      const rulesSection = document.getElementById('rules');
      if (rulesSection) content.insertBefore(section, rulesSection); else content.appendChild(section);
    }
  }

  function setHeroFormat(parts) {
    const line = qs('.hero-format-line');
    if (!line) return;
    line.innerHTML = parts.map(function (part, idx) {
      return (idx ? '<span class="format-dot">&bull;</span>' : '') + '<span>' + esc(part) + '</span>';
    }).join('');
  }

  function updateSeasonLabels(entry) {
    const year = Number(entry.year);
    const archive = isArchive(entry);
    const preseason = isPreseason(entry);
    document.body.classList.toggle('season-archive', archive);
    document.body.classList.toggle('season-preseason', preseason);
    document.body.setAttribute('data-season', String(year));
    document.body.setAttribute('data-season-mode', archive ? 'final' : (preseason ? 'preseason' : 'current'));
    document.title = 'Hockey Guys Golf League ' + year;

    const ticker = qs('.ticker-label');
    if (ticker) {
      if (archive) ticker.innerHTML = 'FINAL &nbsp;·&nbsp; ' + year;
      else if (preseason) ticker.innerHTML = year + ' SEASON &nbsp;·&nbsp; COMING SOON';
      else ticker.innerHTML = 'LIVE &nbsp;·&nbsp; ' + year;
    }

    const standingsLabel = qs('#standings .section-label');
    if (standingsLabel) standingsLabel.textContent = year + ' Standings';
    const playoffLabel = qs('#playoffs .section-label');
    if (playoffLabel) playoffLabel.textContent = year + ' Playoffs';

    if (archive) {
      setHeroFormat(['2-Man Best Ball', 'Match Play', '9 Holes']);
      setText('#dashboard .section-subtitle', 'Final standings, results, playoff matchups, and season leaders from ' + year + '.');
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
        banner.textContent = year + ' FINAL SEASON';
        hero.appendChild(banner);
      }
    } else if (preseason) {
      setHeroFormat(['4 Teams', '4 Players Each', 'Format TBD']);
      const banner = document.getElementById('season-mode-banner');
      if (banner) banner.remove();
    }

    const footerText = qs('.footer > div');
    if (footerText) footerText.innerHTML = 'Hockey Guys Golf League &nbsp;·&nbsp; ' + year + ' Season &nbsp;·&nbsp; Twin Hills · Spencerport NY';
  }

  function installDataGuard(mode, year) {
    if (!originalApplyLeagueData) originalApplyLeagueData = window.applyLeagueDataFromSheet;
    const guardFlag = mode === 'archive' ? 'HGGL_ARCHIVE_MODE' : 'HGGL_PRESEASON_MODE';
    window[guardFlag] = true;

    if (typeof originalApplyLeagueData === 'function') {
      const guardedApply = function (data) {
        if (window.HGGL_ARCHIVE_MODE && !window.HGGL_ALLOW_ARCHIVE_APPLY) return false;
        if (window.HGGL_PRESEASON_MODE) return false;
        return originalApplyLeagueData(data);
      };
      try { window.applyLeagueDataFromSheet = guardedApply; } catch (e) {}
      try { applyLeagueDataFromSheet = guardedApply; } catch (e) {}
    }

    const blockedRefresh = async function () { return false; };
    try { window.fetchLeagueDataFromSheets = blockedRefresh; } catch (e) {}
    try { fetchLeagueDataFromSheets = blockedRefresh; } catch (e) {}

    if (mode === 'archive') {
      const archiveStatus = function () { return year + ' Final Season'; };
      try { window.getDataStatusLabel = archiveStatus; } catch (e) {}
      try { getDataStatusLabel = archiveStatus; } catch (e) {}
    }

    const blockedManualRefresh = async function (btn) {
      if (btn) {
        const old = btn.textContent;
        btn.textContent = mode === 'archive' ? year + ' Final' : '2027 Coming Soon';
        setTimeout(function () { btn.textContent = old || 'Refresh Data'; }, 1400);
      }
      return false;
    };
    try { window.manualRefreshLeagueData = blockedManualRefresh; } catch (e) {}
    try { manualRefreshLeagueData = blockedManualRefresh; } catch (e) {}
  }

  function placeholder(icon, title, copy) {
    return '<div class="preseason-placeholder"><div class="preseason-placeholder-icon">' + icon + '</div>' +
      '<div class="preseason-placeholder-title">' + esc(title) + '</div>' +
      '<div class="preseason-placeholder-copy">' + esc(copy) + '</div></div>';
  }

  function renderPreseason() {
    if (!activeSeasonEntry || !isPreseason(activeSeasonEntry)) return;
    document.body.classList.add('season-preseason');

    const weather = document.getElementById('hero-weather');
    if (weather) weather.style.display = 'none';

    setText('#dashboard .section-label', '2027 Season');
    setText('#dashboard .section-subtitle', 'Same 16 guys. Four new squads. One Cup.');

    const dash = document.getElementById('dashboard-container');
    if (dash) {
      let shell = dash.querySelector('.preseason-shell');
      if (!shell) {
        shell = document.createElement('div');
        shell.className = 'preseason-shell';
        dash.insertBefore(shell, dash.firstChild);
      }
      shell.innerHTML =
        '<div class="preseason-hero-card">' +
          '<div class="preseason-kicker">2027 HGGL</div>' +
          '<div class="preseason-title">FOUR TEAMS. ONE CUP.</div>' +
          '<div class="preseason-copy">Same 16 players. In 2027, HGGL reshuffles from eight 2-man teams into four 4-man squads, with a brand-new competition format still to be revealed.</div>' +
          '<div class="preseason-badges"><span class="preseason-badge">4 Teams</span><span class="preseason-badge">4 Players Each</span><span class="preseason-badge">16 Players</span><span class="preseason-badge">Format TBD</span></div>' +
        '</div>' +
        '<div class="preseason-grid">' +
          '<div class="preseason-card"><div class="preseason-card-label">The Shakeup</div><div class="preseason-card-value">2-MAN → 4-MAN</div><div class="preseason-card-copy">The player count stays the same. The teams do not. Four new squads take over in 2027.</div></div>' +
          '<div class="preseason-card"><div class="preseason-card-label">Competition</div><div class="preseason-card-value">FORMAT TBD</div><div class="preseason-card-copy">The 2-man best-ball format is out. The new 2027 competition format will be revealed when it is set.</div></div>' +
          '<div class="preseason-card wide"><div class="preseason-card-label">Reigning Champions</div><div class="preseason-card-value">PIN SHARKS</div><div class="preseason-card-copy">Drexy &amp; Nick enter the offseason with the Cup. Four new teams will be chasing it in 2027.</div></div>' +
        '</div>';
    }

    setText('#standings .section-label', '2027 Standings');
    setText('#standings-updated', 'The new 4-person teams and 2027 rosters will be revealed before the season.');
    let standingsPlaceholder = qs('#standings .preseason-placeholder');
    if (!standingsPlaceholder) {
      const stand = document.getElementById('standings');
      if (stand) stand.insertAdjacentHTML('beforeend', placeholder('🏒', 'TEAMS COMING SOON', 'Four-person squads are coming in 2027. Rosters and team names will be announced when they are set.'));
    }

    setText('#playoffs .section-label', '2027 Playoffs');
    setText('#playoffs .section-subtitle', 'The playoff setup will be announced with the new 2027 competition format.');
    const playoffContainer = document.getElementById('playoffs-container');
    if (playoffContainer && !playoffContainer.querySelector('.preseason-placeholder')) playoffContainer.insertAdjacentHTML('afterbegin', placeholder('🏆', 'NEW FORMAT. NEW ROAD TO THE CUP.', 'The playoff structure is being rebuilt around the new 4-person team format.'));

    setText('#schedule .section-label', '2027 Schedule');
    setText('#schedule .section-subtitle', 'League dates and matchups are coming.');
    const scheduleContainer = document.getElementById('schedule-container');
    if (scheduleContainer && !scheduleContainer.querySelector('.preseason-placeholder')) scheduleContainer.insertAdjacentHTML('afterbegin', placeholder('📅', '2027 SCHEDULE COMING SOON', 'The new season schedule will appear here once dates and teams are finalized.'));

    setText('#results .section-label', '2027 Results');
    setText('#results-updated', 'The scorecards start fresh in 2027.');
    const resultsContainer = document.getElementById('results-container');
    if (resultsContainer && !resultsContainer.querySelector('.preseason-placeholder')) resultsContainer.insertAdjacentHTML('afterbegin', placeholder('⛳', 'FRESH SEASON. FRESH SCORECARDS.', '2027 results will start here when the new format hits the course.'));

    setText('#extras .section-label', 'Skins & CTP');
    setText('#extras .section-subtitle', '2027 contests and side games will be announced with the new format.');
    const extrasContainer = document.getElementById('extras-container');
    if (extrasContainer && !extrasContainer.querySelector('.preseason-placeholder')) extrasContainer.insertAdjacentHTML('afterbegin', placeholder('🎯', '2027 SIDE GAMES TBD', 'Skins, closest-to-the-pin, and other contests will be updated when the format is finalized.'));

    setText('#stats .section-label', '2027 Player Stats');
    setText('#stats .section-subtitle', 'New season. New team format. Everybody starts at zero.');
    const stats = document.getElementById('stats');
    if (stats && !stats.querySelector('.preseason-placeholder')) stats.insertAdjacentHTML('beforeend', placeholder('📊', 'THE NUMBERS RESET IN 2027', 'Player stats and season leaders will populate once the new season begins.'));

    const rules = document.getElementById('rules');
    if (rules) {
      setText('#rules .section-label', '2027 League Format');
      setText('#rules .section-subtitle', 'The 2027 format is being built now. Here is what is confirmed.');
      let grid = rules.querySelector('.rules-grid');
      if (grid && !grid.classList.contains('preseason-rules')) {
        grid.className = 'preseason-rules';
        grid.innerHTML =
          '<div class="preseason-rule"><strong>Confirmed</strong><b>4 TEAMS · 4 PLAYERS</b><p>The same 16 players will be reorganized from eight 2-player teams into four 4-player squads.</p></div>' +
          '<div class="preseason-rule"><strong>Competition Format</strong><b>TBD</b><p>The 9-hole best-ball format is changing. The new format will be announced once finalized.</p></div>';
      }
    }
  }

  async function loadArchivedSeason(entry) {
    installDataGuard('archive', entry.year);
    const archiveFiles = Array.isArray(entry.files) && entry.files.length ? entry.files : [entry.data];
    const responses = await Promise.all(archiveFiles.map(function (path) {
      return fetch(path + '?v=' + encodeURIComponent(entry.version || '1'));
    }));
    const badResponse = responses.find(function (r) { return !r.ok; });
    if (badResponse) throw new Error('Could not load ' + entry.year + ' archive (' + badResponse.status + ').');
    const pieces = await Promise.all(responses.map(function (r) { return r.json(); }));
    const data = pieces.reduce(function (merged, piece) {
      Object.keys(piece || {}).forEach(function (key) {
        if (Array.isArray(piece[key]) && Array.isArray(merged[key])) merged[key] = merged[key].concat(piece[key]);
        else merged[key] = piece[key];
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
      container.innerHTML = '<div class="no-results"><div class="no-results-icon">🏆</div><div class="no-results-text">League champions will appear here.</div></div>';
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
      '<div class="history-hero"><div class="history-kicker">The Cup Lives Here</div><div class="history-title">HGGL Champions</div></div>' +
      '<div class="champion-grid">' + cards + '</div>' +
      '<div class="history-stats"><div class="history-stat-card"><b>' + champions.length + '</b><span>Championship Seasons</span></div><div class="history-stat-card"><b>' + esc(leaderNames.join(' · ')) + '</b><span>Most Championships (' + mostTitles + ')</span></div></div>' +
      '<div class="section-header" style="margin-top:24px;margin-bottom:8px"><span class="section-label" style="font-size:17px">Championships by Player</span><div class="section-header-line"></div></div>' +
      '<table class="history-player-table"><thead><tr><th>Player</th><th style="text-align:center">Titles</th></tr></thead><tbody>' + tableRows + '</tbody></table>';
  }

  async function init() {
    try {
      injectStyles();
      const responses = await Promise.all([fetch(CONFIG_URL + '?v=2'), fetch(HISTORY_URL + '?v=2')]);
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

      if (isPreseason(activeSeasonEntry)) {
        installDataGuard('preseason', activeSeasonEntry.year);
        renderPreseason();
        [300, 900, 1800, 3500].forEach(function (delay) { setTimeout(renderPreseason, delay); });
      } else if (isArchive(activeSeasonEntry) && (activeSeasonEntry.data || (activeSeasonEntry.files && activeSeasonEntry.files.length))) {
        await loadArchivedSeason(activeSeasonEntry);
      }
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