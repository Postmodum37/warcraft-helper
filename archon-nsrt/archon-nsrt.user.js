// ==UserScript==
// @name         Archon → NSRT reminder note
// @namespace    https://github.com/Postmodum37/warcraft-helper
// @version      0.1.0
// @description  Copy a top log's cooldown timings from Archon's raid rotation page as a Northern Sky Raid Tools reminder note, with NSRT's own phase timing.
// @match        https://www.archon.gg/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @connect      www.warcraftlogs.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // NSRT counts reminder `time` from the start of the current phase and detects
  // phases itself, per boss (NorthernSkyRaidTools/EncounterAlerts/MidnightS2).
  // Each transition is the WarcraftLogs event that marks NSRT's switch: the first
  // event of `type` with one of `abilityId`, more than `minDelay` seconds after
  // the previous phase started. Bosses without NSRT phase detection stay in
  // phase 1 for the whole fight.
  const ENCOUNTERS = {
    3379: { name: 'Nymrissa Wavecaller', transitions: [] },
    3470: {
      name: "Nek'zali the Soulcoiler",
      transitions: [
        // boss1 channels right after the 1.5s Ritual of Awakening cast completes.
        { phase: 1.5, type: 'cast', abilityId: 1295124 },
        // First boss2 cast start 25s+ into 1.5 with no timeline event active:
        // Echo of Jawae's Soul Transfer (its earlier Hungering Pyre is skipped).
        { phase: 1.75, type: 'begincast', abilityId: 1292248, minDelay: 25 },
        // boss1 channels as the last Echo dies and Nek'zali gains this aura.
        { phase: 2, type: 'applybuff', abilityId: 1290003 },
      ],
    },
    // +1 when the timeline adds 8+ events at once, 5s+ after the last change: the
    // next stage's timers, as Vitriolic Stasis fades from both bosses. Phase 6 is
    // past Mythic's berserk but reachable on Heroic.
    3445: {
      name: 'Entombed Sentinels',
      transitions: [2, 3, 4, 5, 6].map((phase) => ({ phase, type: 'removebuff', abilityId: [1284588, 1284606], minDelay: 5 })),
    },
    3455: { name: 'Vashnik the Malignant', transitions: [] },
    // +1 when the timeline restarts the empowered boss's timers, 40s+ into phase 1
    // and 100s+ into later phases. That happens as the empowered boss (in any
    // order) debuffs itself, 1-3s after Mor'zahi's empower buff.
    3497: {
      name: 'The Lost Explorers',
      transitions: [2, 3, 4, 5].map((phase) => ({
        phase,
        type: 'applydebuff',
        abilityId: [1292784, 1292785, 1292786],
        minDelay: phase === 2 ? 40 : 100,
      })),
    },
    3420: { name: 'Sszorak', transitions: [] },
    3421: { name: 'The Twin Fangs', transitions: [] },
    3429: {
      name: 'The Coiled Altar',
      transitions: [
        // Malacrass's Dreadful Presence adds the 70s Eternal Nightfall timer.
        { phase: 2, type: 'cast', abilityId: 1288624 },
        // First Malacrass channel with no timeline event active: Soulbinding.
        { phase: 2.5, type: 'cast', abilityId: 1304032 },
        // The phase 3 timers arrive with Zul'jan's Defilement of the Coiled Altar.
        { phase: 3, type: 'cast', abilityId: 1298381 },
      ],
    },
    3492: { name: "Ula'tek", transitions: [] },
  };

  const LABEL_URL = /warcraftlogs\.com\/reports\/(\w+)\?fight=(\d+)/;

  function parseLabelUrl(url) {
    const m = LABEL_URL.exec(url || '');
    return m && { code: m[1], fightId: Number(m[2]) };
  }

  // The "Cooldowns" timeline holding a row: its ability categories and top-log rows.
  function cooldownGrid(pageProps, labelUrl) {
    const section = pageProps.page.sections.find((s) => s.component === 'BuildsCooldownsSection');
    const grid = Object.values(section?.props.eventTimelineGridsByFacetId || {}).find((g) => g.rows.some((r) => r.labelUrl === labelUrl));
    if (!grid) return null;
    const encounterId = grid.categories.find((c) => c.id === 'encounter')?.abilities[0]?.scope.encounterId;
    return { encounterId, categories: grid.categories, row: grid.rows.find((r) => r.labelUrl === labelUrl) };
  }

  // Abilities the player can be reminded of: every category except the boss's own.
  function playerAbilities(categories) {
    return categories
      .filter((c) => c.id !== 'encounter')
      .flatMap((c) => c.abilities.map((a) => ({ ...a, category: c.label })));
  }

  const abilityIds = (transition) => [].concat(transition.abilityId);

  function eventFilter(transitions) {
    return `ability.id in (${[...new Set(transitions.flatMap(abilityIds))].join(',')})`;
  }

  // Phase start times in ms from pull: [{ phase: 1, start: 0 }, ...], up to the
  // last phase the fight reached. `log`: { fightStart, events } as WCL returns them.
  function phaseStarts(transitions, log) {
    const events = log.events
      .map((e) => ({ ...e, at: e.timestamp - log.fightStart }))
      .sort((a, b) => a.at - b.at);
    const starts = [{ phase: 1, start: 0 }];
    for (const t of transitions) {
      const earliest = starts[starts.length - 1].start + (t.minDelay || 0) * 1000;
      const found = events.find((e) => e.at > earliest && e.type === t.type && abilityIds(t).includes(e.abilityGameID));
      if (!found) break;
      starts.push({ phase: t.phase, start: found.at });
    }
    return starts;
  }

  // NSRT matches whitespace-separated tags against the character name without realm.
  function nsrtTag(input) {
    const tags = input.split(/[\s,]+/).filter(Boolean).map((t) => t.replace(/-.*$/, ''));
    return tags.length ? tags.join(' ') : 'everyone';
  }

  // The phase `t` (ms from the pull) falls in.
  function phaseAt(starts, t) {
    return starts.filter((s) => s.start <= t).pop() || starts[0];
  }

  // `at`: ms into the phase.
  function reminderLine({ tag, at, spellId, phase }) {
    return `tag:${tag};time:${Math.round(at / 100) / 10};spellid:${spellId};ph:${phase}`;
  }

  function reminderLines(rowEvents, spellIds, starts, tag) {
    const wanted = new Set(spellIds);
    return rowEvents
      .filter((e) => wanted.has(e.ability.id))
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((e) => {
        const current = phaseAt(starts, e.timestamp);
        return reminderLine({ tag, at: e.timestamp - current.start, spellId: e.ability.id, phase: current.phase });
      });
  }

  function buildNote({ encounterId, name, difficulty, lines }) {
    // `;` separates fields in NSRT notes, so keep it out of the note name.
    return [`EncounterID:${encounterId};Name:${name.replace(/;/g, ',')};Difficulty:${difficulty}`, ...lines].join('\n');
  }

  const core = { ENCOUNTERS, parseLabelUrl, cooldownGrid, playerAbilities, eventFilter, phaseStarts, phaseAt, nsrtTag, reminderLine, reminderLines, buildNote };
  if (typeof module === 'object' && module.exports) {
    module.exports = core;
    return;
  }

  const ROTATION_PATH = /^\/wow\/builds\/([^/]+)\/([^/]+)\/raid\/rotation\/([^/]+)\/[^/]+/;

  function gmRequest(details) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        ...details,
        onload: (r) => (r.status >= 200 && r.status < 300 ? resolve(r.responseText) : reject(new Error(`HTTP ${r.status}: ${r.responseText.slice(0, 200)}`))),
        onerror: () => reject(new Error(`Request to ${details.url} failed`)),
      });
    });
  }

  async function wclToken({ id, secret }) {
    const cached = GM_getValue('wclToken');
    if (cached && cached.expires > Date.now() + 60000) return cached.token;
    const body = await gmRequest({
      method: 'POST',
      url: 'https://www.warcraftlogs.com/oauth/token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${btoa(`${id}:${secret}`)}` },
      data: 'grant_type=client_credentials',
    });
    const { access_token: token, expires_in: expiresIn } = JSON.parse(body);
    GM_setValue('wclToken', { token, expires: Date.now() + expiresIn * 1000 });
    return token;
  }

  const LOG_QUERY = `query ($code: String!, $fight: Int!, $filter: String!, $start: Float) {
    reportData { report(code: $code) {
      fights(fightIDs: [$fight]) { startTime }
      events(fightIDs: [$fight], hostilityType: Enemies, filterExpression: $filter, startTime: $start, endTime: 1e13, limit: 10000) { data nextPageTimestamp }
    } }
  }`;

  async function fetchLog({ code, fightId }, transitions, credentials) {
    const token = await wclToken(credentials);
    const variables = { code, fight: fightId, filter: eventFilter(transitions), start: 0 };
    const events = [];
    let report;
    do {
      const body = await gmRequest({
        method: 'POST',
        url: 'https://www.warcraftlogs.com/api/v2/client',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        data: JSON.stringify({ query: LOG_QUERY, variables }),
      });
      const json = JSON.parse(body);
      if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
      report = json.data.reportData.report;
      events.push(...report.events.data);
      variables.start = report.events.nextPageTimestamp;
    } while (variables.start);
    if (!report.fights[0]) throw new Error(`Fight ${fightId} not found in report ${code}.`);
    return { fightStart: report.fights[0].startTime, events };
  }

  const pagePropsCache = new Map();

  async function currentPageProps() {
    const path = location.pathname;
    if (!pagePropsCache.has(path)) {
      const next = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
      // __NEXT_DATA__ only describes the first page; client-side navigation needs a fresh copy.
      const res = await fetch(`/_next/data/${next.buildId}${path}.json`);
      if (!res.ok) throw new Error(`Archon page data: HTTP ${res.status}`);
      pagePropsCache.set(path, (await res.json()).pageProps);
    }
    return pagePropsCache.get(path);
  }

  const css = `
    .nsrt-btn { position: absolute; right: 2px; top: 3px; z-index: 2; padding: 0 4px; height: 18px; font: 600 10px/18px sans-serif;
      color: #fff; background: #7b3fe4; border: 0; border-radius: 3px; cursor: pointer; opacity: .85; }
    .nsrt-btn:hover { opacity: 1; }
    .nsrt-panel { position: fixed; top: 70px; right: 16px; z-index: 100000; width: 440px; max-height: calc(100vh - 90px); overflow: auto;
      padding: 14px; color: #ddd; background: #1d1b22; border: 1px solid #7b3fe4; border-radius: 6px; font: 13px/1.4 sans-serif; box-shadow: 0 8px 30px #000a; }
    .nsrt-panel h3 { margin: 0 0 8px; font-size: 15px; color: #fff; }
    .nsrt-panel label { display: block; margin: 4px 0; }
    .nsrt-panel input[type=text], .nsrt-panel input[type=password] { width: 100%; box-sizing: border-box; padding: 4px; color: #fff; background: #111; border: 1px solid #555; }
    .nsrt-panel textarea { width: 100%; height: 180px; box-sizing: border-box; color: #cfc; background: #111; border: 1px solid #555; font: 11px/1.35 monospace; }
    .nsrt-panel fieldset { margin: 8px 0; border: 1px solid #444; }
    .nsrt-panel .nsrt-status { margin: 6px 0; color: #e8c46a; white-space: pre-line; }
    .nsrt-panel .nsrt-actions { display: flex; gap: 8px; margin-top: 8px; }
    .nsrt-panel button { padding: 4px 12px; color: #fff; background: #7b3fe4; border: 0; border-radius: 3px; cursor: pointer; }
    .nsrt-panel button.nsrt-secondary { background: #444; }`;

  function el(tag, props = {}, children = []) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  }

  const clock = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

  async function openPanel(labelUrl) {
    document.querySelector('.nsrt-panel')?.remove();
    const status = el('div', { className: 'nsrt-status', textContent: 'Loading…' });
    status.setAttribute('aria-live', 'polite');
    const panel = el('div', { className: 'nsrt-panel' }, [el('h3', { textContent: 'NSRT reminder note' }), status]);
    document.body.append(panel);
    try {
      await renderPanel(panel, status, labelUrl);
    } catch (err) {
      status.textContent = err.message;
      panel.append(el('div', { className: 'nsrt-actions' }, [el('button', { className: 'nsrt-secondary', textContent: 'Close', onclick: () => panel.remove() })]));
    }
  }

  async function renderPanel(panel, status, labelUrl) {
    const [, specSlug, classSlug, difficultySlug] = ROTATION_PATH.exec(location.pathname) || [];
    const grid = cooldownGrid(await currentPageProps(), labelUrl);
    if (!grid) throw new Error('This row is not in the page data. Reload the page and try again.');
    const { row } = grid;
    const encounter = ENCOUNTERS[grid.encounterId];
    if (!encounter) throw new Error(`No NSRT phase rules for encounter ${grid.encounterId} yet, so phase timings would be wrong.`);
    const phased = encounter.transitions.length > 0;
    const difficulty = difficultySlug[0].toUpperCase() + difficultySlug.slice(1);

    const specKey = `spells:${classSlug}-${specSlug}`;
    const castsOf = (ability) => row.events.filter((e) => ability.ids.includes(e.ability.id));
    const abilities = playerAbilities(grid.categories).filter((a) => castsOf(a).length);
    const saved = GM_getValue(specKey);
    const isChecked = (a) => (saved ? a.ids.some((id) => saved.includes(id)) : a.isSelected);

    const tagInput = el('input', { type: 'text', value: GM_getValue('tag', ''), placeholder: 'Character name (or spec ID, e.g. 257)' });
    const boxes = abilities.map((a) => {
      const box = el('input', { type: 'checkbox', checked: isChecked(a) });
      box.dataset.ids = a.ids.join(',');
      return el('label', {}, [box, ` ${a.name} ×${castsOf(a).length} `, el('small', { textContent: `(${a.category})` })]);
    });
    const idInput = el('input', { type: 'text', value: GM_getValue('wclClientId', '') });
    const secretInput = el('input', { type: 'password', value: GM_getValue('wclClientSecret', '') });
    const credentials = el('fieldset', {}, [
      el('legend', { textContent: 'WarcraftLogs API client (for phase timing)' }),
      el('small', { innerHTML: 'Create one at <a href="https://www.warcraftlogs.com/api/clients/" target="_blank">warcraftlogs.com/api/clients</a>; stored in your userscript manager only. Press Enter to load.' }),
      el('label', {}, ['Client ID', idInput]),
      el('label', {}, ['Client secret', secretInput]),
    ]);
    const preview = el('textarea', { readOnly: true });
    preview.setAttribute('aria-label', 'NSRT note');
    const copy = el('button', { textContent: 'Copy note' });
    const close = el('button', { className: 'nsrt-secondary', textContent: 'Close', onclick: () => panel.remove() });

    panel.querySelector('h3').textContent = `NSRT note — #${row.rankingLabel} ${row.label} · ${encounter.name} (${difficulty})`;
    panel.append(
      el('label', {}, ['Tag (who sees it)', tagInput]),
      el('fieldset', {}, [el('legend', { textContent: 'Spells' }), ...boxes]),
      ...(phased ? [credentials] : []),
      preview,
      el('div', { className: 'nsrt-actions' }, [copy, close]),
    );

    // Without the log's phase changes a phased boss would get pull-relative times, so show no note at all.
    let starts = phased ? null : [{ phase: 1, start: 0 }];
    const phaseNote = () => {
      if (!phased) return 'NSRT has no phase detection here: times are from the pull.';
      const changes = starts.slice(1).map((s) => `ph ${s.phase} at ${clock(s.start)}`).join(', ');
      const warning = difficultySlug === 'mythic' ? '' : '\nPhase rules were checked on Mythic logs only.';
      return `Phases in this log: ${changes || 'none found'}.${warning}`;
    };
    const render = () => {
      const spellIds = boxes.flatMap((b) => (b.firstChild.checked ? b.firstChild.dataset.ids.split(',').map(Number) : []));
      GM_setValue('tag', tagInput.value.trim());
      GM_setValue(specKey, spellIds);
      copy.disabled = !starts;
      if (!starts) {
        preview.value = '';
        return;
      }
      const lines = reminderLines(row.events, spellIds, starts, nsrtTag(tagInput.value));
      preview.value = buildNote({ encounterId: grid.encounterId, name: `${encounter.name} ${specSlug} #${row.rankingLabel}`, difficulty, lines });
    };
    const refresh = async () => {
      try {
        if (phased) {
          const creds = { id: idInput.value.trim(), secret: secretInput.value.trim() };
          GM_setValue('wclClientId', creds.id);
          GM_setValue('wclClientSecret', creds.secret);
          if (!creds.id || !creds.secret) throw new Error('Enter your WarcraftLogs client ID and secret, then press Enter.');
          status.textContent = 'Reading phase changes from WarcraftLogs…';
          starts = phaseStarts(encounter.transitions, await fetchLog(parseLabelUrl(labelUrl), encounter.transitions, creds));
        }
        status.textContent = phaseNote();
      } catch (err) {
        status.textContent = err.message;
        if (/401|invalid_client/i.test(err.message)) GM_setValue('wclToken', null);
      }
      render();
    };

    tagInput.addEventListener('input', render);
    boxes.forEach((b) => b.firstChild.addEventListener('change', render));
    [idInput, secretInput].forEach((i) => i.addEventListener('keydown', (e) => e.key === 'Enter' && refresh()));
    copy.addEventListener('click', () => {
      GM_setClipboard(preview.value, 'text');
      copy.textContent = 'Copied!';
      setTimeout(() => (copy.textContent = 'Copy note'), 1500);
    });
    await refresh();
  }

  function addButtons() {
    if (!ROTATION_PATH.test(location.pathname)) return;
    const labels = document.querySelectorAll('.builds-cooldowns-section a.event-timeline-grid__row-label[href*="warcraftlogs.com/reports/"]');
    for (const label of labels) {
      if (label.querySelector('.nsrt-btn')) continue;
      label.style.position = 'relative';
      label.append(el('button', {
        className: 'nsrt-btn',
        textContent: 'NSRT',
        title: 'Make an NSRT reminder note from this log',
        onclick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          openPanel(label.href);
        },
      }));
    }
  }

  document.head.append(el('style', { textContent: css }));
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      addButtons();
    });
  }).observe(document.body, { childList: true, subtree: true });
  addButtons();
})();
