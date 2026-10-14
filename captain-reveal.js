/*
 * HGGL 2027 Draft + Team Reveal
 * Shows the completed captain/draft setup, hides the old live ticker, and blocks
 * legacy 2026 Sheet rendering while 2027 preseason is selected.
 */
(function () {
  'use strict';

  var scheduled = false;
  var legacyGuardsInstalled = false;
  var originalApplyLeagueDataFromSheet = null;
  var originalRebuildAll = null;

  var TEAMS_2027 = [
    { captain: 'Tony', number: 1, initial: 'T', picks: [
      { pick: 1, player: 'Drexy' },
      { pick: 8, player: 'Robby D' },
      { pick: 9, player: 'Justyn' }
    ]},
    { captain: 'Nick', number: 2, initial: 'N', picks: [
      { pick: 2, player: 'Greg' },
      { pick: 7, player: 'Tank' },
      { pick: 10, player: 'Gener' }
    ]},
    { captain: 'Kyle', number: 3, initial: 'K', picks: [
      { pick: 3, player: 'Sam Cino' },
      { pick: 6, player: 'Ando' },
      { pick: 11, player: 'Kendrick' }
    ]},
    { captain: 'Hick', number: 4, initial: 'H', picks: [
      { pick: 4, player: 'Gracey' },
      { pick: 5, player: 'Ritzy' },
      { pick: 12, player: 'CJ' }
    ]}
  ];

  var DRAFT_2027 = [
    { pick: 1, player: 'Drexy', captain: 'Tony' },
    { pick: 2, player: 'Greg', captain: 'Nick' },
    { pick: 3, player: 'Sam Cino', captain: 'Kyle' },
    { pick: 4, player: 'Gracey', captain: 'Hick' },
    { pick: 5, player: 'Ritzy', captain: 'Hick' },
    { pick: 6, player: 'Ando', captain: 'Kyle' },
    { pick: 7, player: 'Tank', captain: 'Nick' },
    { pick: 8, player: 'Robby D', captain: 'Tony' },
    { pick: 9, player: 'Justyn', captain: 'Tony' },
    { pick: 10, player: 'Gener', captain: 'Nick' },
    { pick: 11, player: 'Kendrick', captain: 'Kyle' },
    { pick: 12, player: 'CJ', captain: 'Hick' }
  ];

  function is2027Preseason() {
    return !!document.body &&
      document.body.classList.contains('season-preseason') &&
      document.body.getAttribute('data-season') === '2027';
  }

  function installLegacyRenderGuards() {
    if (legacyGuardsInstalled) return true;

    if (typeof window.applyLeagueDataFromSheet !== 'function' || typeof window.rebuildAll !== 'function') {
      return false;
    }

    originalApplyLeagueDataFromSheet = window.applyLeagueDataFromSheet;
    originalRebuildAll = window.rebuildAll;

    window.applyLeagueDataFromSheet = function () {
      if (is2027Preseason()) return;
      return originalApplyLeagueDataFromSheet.apply(this, arguments);
    };

    window.rebuildAll = function () {
      if (is2027Preseason()) return;
      return originalRebuildAll.apply(this, arguments);
    };

    legacyGuardsInstalled = true;
    return true;
  }

  function injectStyles() {
    if (document.getElementById('hggl-2027-draft-styles')) return;

    var style = document.createElement('style');
    style.id = 'hggl-2027-draft-styles';
    style.textContent = `
      body.season-preseason[data-season="2027"] .ticker-wrap{display:none!important;}

      .preseason-shell .team-reveal{display:block!important;margin:14px 0;padding:22px 20px 20px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018));position:relative;overflow:hidden;}
      .preseason-shell .team-reveal:before{content:'';position:absolute;left:0;top:0;width:100%;height:2px;background:linear-gradient(90deg,transparent,var(--gold),rgba(159,201,220,.8),var(--gold),transparent);opacity:.85;}
      .team-reveal-head{text-align:center;margin-bottom:17px;position:relative;z-index:1;}
      .team-reveal-kicker{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:var(--gold);}
      .team-reveal-title{font-family:'Bebas Neue',sans-serif;font-size:36px;line-height:1;letter-spacing:2px;color:#fff;margin:5px 0 6px;}
      .team-reveal-copy{font-family:'Inter Tight','Barlow',sans-serif;font-size:13px;font-weight:600;line-height:1.45;color:var(--muted);}

      .team-grid-2027{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;}
      .team-card-2027{position:relative;overflow:hidden;border:1px solid rgba(216,179,93,.25);border-radius:15px;background:linear-gradient(160deg,rgba(216,179,93,.09),rgba(16,24,38,.92) 46%,rgba(159,201,220,.055));box-shadow:0 12px 26px rgba(0,0,0,.16);}
      .team-card-2027:after{content:'C';position:absolute;right:8px;top:4px;font-family:'Bebas Neue',sans-serif;font-size:54px;line-height:1;color:rgba(216,179,93,.055);pointer-events:none;}
      .team-card-top{padding:16px 14px 13px;border-bottom:1px solid rgba(255,255,255,.07);text-align:center;}
      .captain-avatar-2027{width:72px;height:72px;margin:0 auto 10px;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;background:linear-gradient(145deg,#334051,#202938);border:1px solid rgba(159,201,220,.18);box-shadow:inset 0 0 0 1px rgba(255,255,255,.03),0 8px 18px rgba(0,0,0,.22);}
      .captain-avatar-2027 span{font-family:'Bebas Neue',sans-serif;font-size:39px;line-height:1;color:#fff;letter-spacing:1px;}
      .captain-avatar-2027 b{position:absolute;right:-4px;bottom:-2px;width:25px;height:25px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--gold);color:#101826;border:2px solid #182230;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:900;}
      .team-temp-name{font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:var(--muted);}
      .captain-name-2027{font-family:'Bebas Neue',sans-serif;font-size:29px;line-height:1;color:#fff;letter-spacing:1.5px;margin-top:3px;}
      .captain-order-2027{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:900;letter-spacing:1.7px;text-transform:uppercase;color:var(--gold);margin-top:4px;}
      .team-roster-2027{padding:11px 12px 13px;}
      .team-roster-label{font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:900;letter-spacing:1.8px;text-transform:uppercase;color:var(--muted);margin:0 2px 6px;}
      .team-player-row{display:flex;align-items:center;gap:8px;padding:7px 7px;border-radius:9px;background:rgba(255,255,255,.028);margin-top:5px;border:1px solid rgba(255,255,255,.045);}
      .team-player-pick{min-width:27px;height:23px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:rgba(216,179,93,.12);border:1px solid rgba(216,179,93,.24);font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:900;color:var(--gold);}
      .team-player-name{font-family:'Inter Tight','Barlow',sans-serif;font-size:12px;font-weight:700;color:#eef5fb;}

      .draft-board-2027{margin-top:14px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.018));padding:18px;}
      .draft-board-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:12px;}
      .draft-board-kicker{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:var(--gold);}
      .draft-board-title{font-family:'Bebas Neue',sans-serif;font-size:29px;line-height:1;color:#fff;letter-spacing:1.5px;margin-top:3px;}
      .draft-board-note{font-family:'Inter Tight','Barlow',sans-serif;font-size:11px;font-weight:600;color:var(--muted);text-align:right;}
      .draft-rounds{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}
      .draft-round{border:1px solid rgba(255,255,255,.065);border-radius:12px;background:rgba(16,24,38,.48);padding:11px;}
      .draft-round-title{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:900;letter-spacing:1.8px;text-transform:uppercase;color:var(--gold);margin-bottom:5px;}
      .draft-pick-row{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:7px;padding:7px 4px;border-top:1px solid rgba(255,255,255,.05);}
      .draft-pick-row:first-of-type{border-top:0;}
      .draft-pick-num{font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--gold);line-height:1;}
      .draft-pick-player{font-family:'Inter Tight','Barlow',sans-serif;font-size:12px;font-weight:750;color:#fff;}
      .draft-pick-captain{font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:var(--ice);}

      @media (max-width:760px){
        .team-grid-2027{grid-template-columns:repeat(2,minmax(0,1fr));}
        .draft-rounds{grid-template-columns:1fr;}
        .draft-board-head{align-items:flex-start;flex-direction:column;}
        .draft-board-note{text-align:left;}
        .preseason-shell .team-reveal{padding:19px 15px 16px;}
      }
      @media (max-width:420px){
        .team-grid-2027{gap:8px;}
        .team-card-top{padding:13px 9px 11px;}
        .captain-avatar-2027{width:62px;height:62px;}
        .captain-avatar-2027 span{font-size:34px;}
        .captain-name-2027{font-size:25px;}
        .team-roster-2027{padding:9px;}
        .team-player-row{padding:6px 5px;gap:6px;}
        .team-player-name{font-size:11px;}
        .team-reveal-title{font-size:31px;}
      }
    `;
    document.head.appendChild(style);
  }

  function teamCard(team) {
    var roster = team.picks.map(function (pick) {
      return '<div class="team-player-row">' +
        '<span class="team-player-pick">#' + pick.pick + '</span>' +
        '<span class="team-player-name">' + pick.player + '</span>' +
      '</div>';
    }).join('');

    return '<article class="team-card-2027" aria-label="Captain ' + team.captain + ' 2027 roster">' +
      '<div class="team-card-top">' +
        '<div class="captain-avatar-2027" aria-hidden="true"><span>' + team.initial + '</span><b>C</b></div>' +
        '<div class="team-temp-name">Team Name TBD</div>' +
        '<div class="captain-name-2027">' + team.captain + '</div>' +
        '<div class="captain-order-2027">Captain #' + team.number + '</div>' +
      '</div>' +
      '<div class="team-roster-2027">' +
        '<div class="team-roster-label">Drafted Roster</div>' +
        roster +
      '</div>' +
    '</article>';
  }

  function draftRound(round) {
    var start = (round - 1) * 4;
    var picks = DRAFT_2027.slice(start, start + 4).map(function (pick) {
      return '<div class="draft-pick-row">' +
        '<span class="draft-pick-num">#' + pick.pick + '</span>' +
        '<span class="draft-pick-player">' + pick.player + '</span>' +
        '<span class="draft-pick-captain">' + pick.captain + '</span>' +
      '</div>';
    }).join('');

    return '<div class="draft-round">' +
      '<div class="draft-round-title">Round ' + round + '</div>' +
      picks +
    '</div>';
  }

  function makeTeamsReveal() {
    var section = document.createElement('section');
    section.className = 'team-reveal';
    section.innerHTML =
      '<div class="team-reveal-head">' +
        '<div class="team-reveal-kicker">2027 Draft Complete</div>' +
        '<div class="team-reveal-title">THE TEAMS ARE SET.</div>' +
        '<div class="team-reveal-copy">Four captains. Three picks each. Team names are still coming, but the 2027 rosters are locked in.</div>' +
      '</div>' +
      '<div class="team-grid-2027">' + TEAMS_2027.map(teamCard).join('') + '</div>' +
      '<div class="draft-board-2027">' +
        '<div class="draft-board-head">' +
          '<div><div class="draft-board-kicker">2027 HGGL Draft</div><div class="draft-board-title">12 PICKS · 3 ROUNDS</div></div>' +
          '<div class="draft-board-note">Draft order shown by overall pick.</div>' +
        '</div>' +
        '<div class="draft-rounds">' + draftRound(1) + draftRound(2) + draftRound(3) + '</div>' +
      '</div>';
    return section;
  }

  function ensure2027UI() {
    installLegacyRenderGuards();
    if (!is2027Preseason()) return false;

    var ticker = document.querySelector('.ticker-wrap');
    if (ticker && ticker.style.display !== 'none') ticker.style.display = 'none';

    var dash = document.getElementById('dashboard-container');
    if (!dash) return false;

    var shell = dash.querySelector('.preseason-shell');
    if (!shell) return false;

    Array.prototype.forEach.call(dash.querySelectorAll('.captain-reveal,.team-reveal'), function (el) {
      if (!shell.contains(el)) el.remove();
    });

    var existing = shell.querySelector('.team-reveal');
    if (existing) return true;

    var reveal = makeTeamsReveal();
    var hero = shell.querySelector('.preseason-hero-card');
    if (hero) hero.insertAdjacentElement('afterend', reveal);
    else shell.insertBefore(reveal, shell.firstChild);
    return true;
  }

  function queueEnsure() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      ensure2027UI();
    });
  }

  injectStyles();
  installLegacyRenderGuards();
  ensure2027UI();

  var observer = new MutationObserver(queueEnsure);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-season']
  });

  var attempts = 0;
  var timer = setInterval(function () {
    attempts += 1;
    installLegacyRenderGuards();
    ensure2027UI();
    if (attempts >= 120) clearInterval(timer);
  }, 250);
})();
