/*
 * HGGL 2027 Captain Reveal
 * Mystery cards used during preseason; designed to accept real captain photos later.
 */
(function () {
  'use strict';

  function enforce2027DefaultOnRoot() {
    var params = new URLSearchParams(window.location.search);
    if (params.has('season')) return false;

    var selected = document.body.getAttribute('data-season');
    if (selected === '2027') {
      try {
        localStorage.setItem('hggl_selected_season_v2', '2027');
        sessionStorage.removeItem('hggl_force_2027_once');
      } catch (e) {}
      return false;
    }

    try {
      localStorage.setItem('hggl_selected_season_v2', '2027');
      if (sessionStorage.getItem('hggl_force_2027_once') !== '1') {
        sessionStorage.setItem('hggl_force_2027_once', '1');
        window.location.reload();
        return true;
      }
    } catch (e) {}

    return false;
  }

  if (enforce2027DefaultOnRoot()) return;

  function injectStyles() {
    if (document.getElementById('hggl-captain-reveal-styles')) return;
    var style = document.createElement('style');
    style.id = 'hggl-captain-reveal-styles';
    style.textContent = `
      .captain-reveal{margin:18px 0 14px;padding:22px 20px 20px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018));position:relative;overflow:hidden;}
      .captain-reveal:before{content:'';position:absolute;left:0;top:0;width:100%;height:2px;background:linear-gradient(90deg,transparent,var(--gold),rgba(159,201,220,.8),var(--gold),transparent);opacity:.8;}
      .captain-reveal-head{text-align:center;margin-bottom:17px;position:relative;z-index:1;}
      .captain-reveal-kicker{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:var(--gold);}
      .captain-reveal-title{font-family:'Bebas Neue',sans-serif;font-size:34px;line-height:1;letter-spacing:2px;color:#fff;margin:5px 0 6px;}
      .captain-reveal-copy{font-family:'Inter Tight','Barlow',sans-serif;font-size:13px;font-weight:600;line-height:1.45;color:var(--muted);}
      .captain-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;}
      .captain-card{position:relative;overflow:hidden;border:1px solid rgba(216,179,93,.22);border-radius:15px;background:linear-gradient(160deg,rgba(216,179,93,.09),rgba(16,24,38,.9) 44%,rgba(159,201,220,.055));box-shadow:0 12px 26px rgba(0,0,0,.16);}
      .captain-card:after{content:'C';position:absolute;right:7px;top:3px;font-family:'Bebas Neue',sans-serif;font-size:52px;line-height:1;color:rgba(216,179,93,.055);pointer-events:none;}
      .captain-portrait{height:172px;position:relative;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;background:radial-gradient(circle at 50% 35%,rgba(159,201,220,.1),transparent 39%),linear-gradient(180deg,rgba(255,255,255,.018),rgba(0,0,0,.14));border-bottom:1px solid rgba(255,255,255,.07);}
      .captain-silhouette{position:absolute;left:50%;bottom:-2px;transform:translateX(-50%);width:112px;height:150px;filter:drop-shadow(0 10px 18px rgba(0,0,0,.3));}
      .captain-head{position:absolute;width:66px;height:66px;border-radius:50%;left:23px;top:13px;background:linear-gradient(145deg,#334051,#202938);box-shadow:inset 0 0 0 1px rgba(255,255,255,.04);}
      .captain-shoulders{position:absolute;width:112px;height:82px;left:0;bottom:0;border-radius:58px 58px 12px 12px;background:linear-gradient(145deg,#303c4c,#1d2532);box-shadow:inset 0 0 0 1px rgba(255,255,255,.035);}
      .captain-question{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);z-index:3;font-family:'Bebas Neue',sans-serif;font-size:72px;line-height:1;color:var(--gold);text-shadow:0 4px 16px rgba(0,0,0,.6);}
      .captain-card-body{padding:12px 10px 13px;text-align:center;}
      .captain-number{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:900;letter-spacing:2.2px;text-transform:uppercase;color:var(--gold);}
      .captain-status{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:1.3px;color:#fff;margin-top:2px;}
      .captain-card:hover{transform:translateY(-2px);border-color:rgba(216,179,93,.42);transition:transform .18s ease,border-color .18s ease;}
      @media (max-width:760px){.captain-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.captain-portrait{height:158px;}.captain-reveal{padding:19px 15px 16px;}}
      @media (max-width:420px){.captain-grid{gap:8px;}.captain-portrait{height:145px;}.captain-silhouette{transform:translateX(-50%) scale(.9);transform-origin:bottom center;}.captain-question{font-size:62px;}.captain-card-body{padding:10px 7px 11px;}.captain-status{font-size:18px;}.captain-reveal-title{font-size:30px;}}
    `;
    document.head.appendChild(style);
  }

  function card(n) {
    var num = String(n).padStart(2, '0');
    return '<div class="captain-card" aria-label="2027 captain ' + n + ' reveal coming soon">' +
      '<div class="captain-portrait">' +
        '<div class="captain-silhouette" aria-hidden="true"><div class="captain-head"></div><div class="captain-shoulders"></div></div>' +
        '<div class="captain-question" aria-hidden="true">?</div>' +
      '</div>' +
      '<div class="captain-card-body"><div class="captain-number">Captain ' + num + '</div><div class="captain-status">REVEAL COMING</div></div>' +
    '</div>';
  }

  function renderCaptainReveal() {
    if (!document.body.classList.contains('season-preseason') || document.body.getAttribute('data-season') !== '2027') return false;
    var shell = document.querySelector('#dashboard-container .preseason-shell');
    if (!shell) return false;
    if (shell.querySelector('.captain-reveal')) return true;

    var hero = shell.querySelector('.preseason-hero-card');
    if (!hero) return false;

    var section = document.createElement('section');
    section.className = 'captain-reveal';
    section.innerHTML =
      '<div class="captain-reveal-head">' +
        '<div class="captain-reveal-kicker">2027 Captain Reveal</div>' +
        '<div class="captain-reveal-title">WHO GETS THE C?</div>' +
        '<div class="captain-reveal-copy">Four captains. Four new squads. Names coming soon.</div>' +
      '</div>' +
      '<div class="captain-grid">' + card(1) + card(2) + card(3) + card(4) + '</div>';

    hero.insertAdjacentElement('afterend', section);
    return true;
  }

  injectStyles();
  if (!renderCaptainReveal()) {
    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      if (renderCaptainReveal() || attempts >= 40) clearInterval(timer);
    }, 200);
  }
})();
