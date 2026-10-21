/* DSH Map — recorded scenarios: the upstream snapshot corpus
 * (snapshots/<surface>/<scenario>) as a list and a Session-log player. Every
 * log line links to its session-event declaration and owning package; the
 * header class links to the rendered system prompt and tool schemas. */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, util, i18n } = DSHMap

  i18n.extend({
    uk: {
      'sc.title': 'Записані сценарії',
      'sc.filter': 'Сценарій, задача, композиція…',
      'sc.lead': 'Корпус snapshots/ upstream: кожен сценарій запускається через dsh зі штатним профілем і записує журнал сесії, який є і вхідними даними реплею, і очікуваним результатом. Це найкоротший шлях побачити, як dsh поводиться насправді.',
      'sc.surfaces': 'Поверхні',
      'sc.recording.live': 'записано наживо',
      'sc.recording.authored': 'написано вручну',
      'sc.profile': 'Профіль',
      'sc.composition': 'Композиція',
      'sc.class': 'Клас заголовка',
      'sc.recording': 'Запис',
      'sc.policy': 'Дозволи',
      'sc.preset': 'Пресет агента',
      'sc.models': 'Модель',
      'sc.turns': 'Ходи / кроки',
      'sc.end': 'Завершення',
      'sc.format': 'Формат',
      'sc.task': 'Задача',
      'sc.toolsUsed': 'Викликані інструменти',
      'sc.events': 'Події журналу',
      'sc.timeline': 'Журнал сесії',
      'sc.role': 'Роль',
      'sc.role.parent': 'батьківська сесія',
      'sc.role.child': 'дочірня {n}',
      'sc.ref': 'Посилається на журнал',
      'sc.patch': 'Патч сценарію (cordis.yml)',
      'sc.manifest': 'snapshot.yml',
      'sc.prompt': 'Промпт і схеми інструментів класу',
      'sc.play': 'Програти',
      'sc.pause': 'Пауза',
      'sc.prev': 'Назад',
      'sc.next': 'Далі',
      'sc.speed': 'Швидкість',
      'sc.classes': 'Класи заголовків із відрендереним промптом ({n})',
      'sc.classes.lead': 'Для кожного класу один сценарій-власник зберігає system-prompt.expected.md і tool-schemas.expected.json — те, що реально отримала модель.',
      'sc.declared': 'декларація',
      'sc.empty': 'Оберіть сценарій ліворуч.',
      'sc.position': 'Позиція в журналі',
      'sc.filter.label': 'Фільтр сценаріїв',
      'sc.col.tools': 'Інструменти',
      'sc.col.lines': 'Рядків промпту',
    },
    en: {
      'sc.title': 'Recorded scenarios',
      'sc.filter': 'Scenario, task, composition…',
      'sc.lead': 'The upstream snapshots/ corpus: every scenario runs through dsh with a shipped profile and records a Session log that is both replay input and expected output. It is the shortest way to see how dsh actually behaves.',
      'sc.surfaces': 'Surfaces',
      'sc.recording.live': 'recorded live',
      'sc.recording.authored': 'authored',
      'sc.profile': 'Profile',
      'sc.composition': 'Composition',
      'sc.class': 'Header class',
      'sc.recording': 'Recording',
      'sc.policy': 'Permissions',
      'sc.preset': 'Agent preset',
      'sc.models': 'Model',
      'sc.turns': 'Turns / steps',
      'sc.end': 'Ended',
      'sc.format': 'Format',
      'sc.task': 'Task',
      'sc.toolsUsed': 'Tools called',
      'sc.events': 'Log events',
      'sc.timeline': 'Session log',
      'sc.role': 'Role',
      'sc.role.parent': 'parent session',
      'sc.role.child': 'child {n}',
      'sc.ref': 'References the log',
      'sc.patch': 'Scenario patch (cordis.yml)',
      'sc.manifest': 'snapshot.yml',
      'sc.prompt': 'Prompt and tool schemas of the class',
      'sc.play': 'Play',
      'sc.pause': 'Pause',
      'sc.prev': 'Back',
      'sc.next': 'Next',
      'sc.speed': 'Speed',
      'sc.classes': 'Header classes with a rendered prompt ({n})',
      'sc.classes.lead': 'For every class one owning scenario keeps system-prompt.expected.md and tool-schemas.expected.json — what the model actually received.',
      'sc.declared': 'declaration',
      'sc.empty': 'Pick a scenario on the left.',
      'sc.position': 'Position in the log',
      'sc.filter.label': 'Filter scenarios',
      'sc.col.tools': 'Tools',
      'sc.col.lines': 'Prompt lines',
    },
  })

  DSHMap.views.scenarios = {
    scroll: false,
    init(el) {
      const ui = DSHMap.ui
      this.surface = 'all'
      // Surface chips keep the old route key `surface` (no chip = all).
      this.bar = ui.filterBar({
        key: 'q', chipKey: 'surface', placeholder: t('sc.filter'), label: t('sc.filter.label'),
        chips: this.surfaceChips(), onChange: () => { this.surface = this.bar.chip() || 'all'; this.renderList(DSHMap.router.params.id) },
      })
      const L = ui.layout.reference(el, { title: t('sc.title'), className: 'scenarios-view', head: [this.bar.el] })
      this.count = L.count
      this.list = L.list
      this.detail = L.detail
      // ~250 recordings: the list renders virtually (4.4) and moves focus by item itself.
      this.vlist = DSHMap.ui.virtual({
        host: this.list, nav: true, estimate: 52,
        key: it => (it.group ? `g:${it.group}` : it.s.id),
        skip: it => !!it.group,
        render: it => this.renderItem(it),
      })
    },
    surfaceChips() {
      const M = DSHMap.model
      return [...new Set(M.scenarios.map(s => s.surface))].map(s => ({ id: s, label: s, count: M.scenarios.filter(x => x.surface === s).length }))
    },
    /** Filter text (`q`) and surface (`surface`) come from the route; true when either changed. */
    takeFilters(params) {
      const changed = this.bar.sync(params)
      this.surface = this.bar.chip() || 'all'
      return changed
    },
    show(params) { this.takeFilters(params); this.renderList(params.id); this.renderDetail(params) },
    update(params, prev) {
      const refilter = this.takeFilters(params)
      if (params.id !== prev.id || params.role !== prev.role) { this.renderList(params.id); this.renderDetail(params) } else {
        if (refilter) this.renderList(params.id)
        if (params.at !== prev.at) this.player?.go(Number(params.at ?? 0), false)
      }
    },
    hide() { this.player?.stop() },
    renderList(selected) {
      const M = DSHMap.model
      const q = this.bar.query()
      const list = this.list
      const groups = new Map()
      let n = 0
      for (const s of M.scenarios) {
        if (this.surface !== 'all' && s.surface !== this.surface) continue
        if (q && !`${s.id} ${s.composition ?? ''} ${s.headerClass ?? ''} ${s.task ?? ''} ${Object.keys(s.summary?.tools ?? {}).join(' ')}`.toLowerCase().includes(q)) continue
        if (!groups.has(s.surface)) groups.set(s.surface, [])
        groups.get(s.surface).push(s)
        n++
      }
      this.count.textContent = n
      this.selected = selected
      const rows = []
      for (const [surface, items] of groups) {
        rows.push({ group: surface, n: items.length })
        for (const s of items) rows.push({ s })
      }
      list.querySelector(':scope > .state-box')?.remove()
      this.vlist.update(rows)
      const at = rows.findIndex(it => it.s?.id === selected)
      if (at >= 0) requestAnimationFrame(() => this.vlist.scrollTo(at))
      if (!groups.size) list.appendChild(DSHMap.ui.noMatches(() => this.bar.reset()))
    },
    renderItem(it) {
      if (it.group) return h('div', { class: 'li-group' }, h('span', null, it.group), h('span', null, it.n))
      const s = it.s
      const sel = s.id === this.selected
      return h('button', { class: ['li', sel ? 'is-selected' : null], ...DSHMap.ui.selAttrs(sel), onclick: () => DSHMap.router.go('scenarios', { ...DSHMap.ui.keepParams('q', 'surface'), id: s.id }) },
        h('span', { class: ['rec-dot', s.recording], title: t(`sc.recording.${s.recording}`) }),
        h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, s.name), h('div', { class: 'li-sub' }, s.task ? util.firstSentence(s.task, 90) : s.composition)),
        h('div', { class: 'li-meta' }, h('span', { class: 'faint tiny' }, s.summary?.events ?? '')))
    },
    renderDetail(params) {
      const M = DSHMap.model
      this.player?.stop()
      this.player = null
      const root = clear(this.detail)
      root.scrollTop = 0
      const page = h('div', { class: 'page' })
      root.appendChild(page)
      const s = M.scenarioById.get(params.id)
      if (!s) { this.renderOverview(page); return }
      const S = s.summary ?? {}
      const cls = s.headerClass ? M.classById.get(s.headerClass) : null
      const ui = DSHMap.ui
      page.append(
        h('div', { class: 'd-kicker' }, svgIcon('film'), `${t('type.scenario')} · ${s.surface}`),
        h('h2', { class: 'd-title mono' }, s.name),
        h('div', { class: 'd-actions' },
          h('button', { class: 'btn small', onclick: () => DSHMap.nav.openFile(`${s.dir}/snapshot.yml`) }, svgIcon('file'), t('sc.manifest')),
          s.roles[0] ? h('button', { class: 'btn small', onclick: () => DSHMap.nav.openFile(s.roles[0].file) }, svgIcon('code'), s.roles[0].file.split('/').pop()) : null,
          ui.githubLink(s.dir, 'GitHub')),
        h('dl', { class: 'kv d-mt-3' },
          h('dt', null, t('sc.profile')), h('dd', null, s.profile ? h('button', { class: 'chip link mono', onclick: () => DSHMap.nav.openProfile(s.profile) }, s.profile) : '—'),
          h('dt', null, t('sc.composition')), h('dd', { class: 'mono' }, s.composition ?? '—'),
          h('dt', null, t('sc.class')), h('dd', null, cls?.file ? h('button', { class: ['link-btn', 'mono'], onclick: () => DSHMap.router.go('usage', { tab: 'model', profile: cls.profile ?? undefined, preset: cls.preset ?? undefined }) }, s.headerClass) : h('span', { class: 'mono' }, s.headerClass ?? '—')),
          h('dt', null, t('sc.recording')), h('dd', null, h('span', { class: ['badge', s.recording === 'live' ? 'ok' : null] }, t(`sc.recording.${s.recording}`) ?? s.recording)),
          S.preset ? [h('dt', null, t('sc.preset')), h('dd', { class: 'mono' }, S.preset)] : null,
          h('dt', null, t('sc.policy')), h('dd', { class: 'mono small' }, [S.permission, S.sandbox, S.approval].filter(Boolean).join(' · ') || '—'),
          S.models?.length ? [h('dt', null, t('sc.models')), h('dd', { class: 'mono small' }, S.models.join(', '))] : null,
          h('dt', null, t('sc.turns')), h('dd', null, `${S.turns ?? 0} / ${S.steps ?? 0}`),
          S.endReason ? [h('dt', null, t('sc.end')), h('dd', { class: 'mono' }, S.endReason)] : null,
          h('dt', null, t('sc.format')), h('dd', null, `v${S.version ?? '?'}`, s.sessionFormat ? h('span', { class: 'faint small' }, ` · pinned v${s.sessionFormat.version}${s.sessionFormat.coverage?.length ? ` (${s.sessionFormat.coverage.join(', ')})` : ''}`) : null),
          s.sessionRef ? [h('dt', null, t('sc.ref')), h('dd', null, h('button', { class: ['link-btn', 'mono', 'small'], onclick: () => { const id = s.sessionRef.split('/').slice(1, 3).join('/'); if (M.scenarioById.has(id)) DSHMap.nav.openScenario(id); else DSHMap.nav.openFile(s.sessionRef) } }, s.sessionRef))] : null),
        s.task ? h('div', { class: 'd-section' }, h('h4', null, t('sc.task')), h('div', { class: 'callout' }, s.task)) : null)
      const tools = Object.entries(S.tools ?? {})
      if (tools.length) page.appendChild(h('div', { class: 'd-section' }, h('h4', null, t('sc.toolsUsed'), h('span', { class: 'count' }, tools.length)), h('div', { class: 'chips' }, tools.map(([n, c]) => { const tl = M.tools.find(x => x.name === n); return h(tl ? 'button' : 'span', { class: ['chip', 'mono', tl ? 'link' : null], onclick: tl ? () => DSHMap.nav.openTool(tl.key) : null }, n, h('span', { class: 'count' }, c)) }))))
      const types = Object.entries(S.types ?? {}).sort((a, b) => b[1] - a[1])
      if (types.length) page.appendChild(h('div', { class: 'd-section' }, h('h4', null, t('sc.events'), h('span', { class: 'count' }, S.events)), h('div', { class: 'chips' }, types.map(([n, c]) => seChip(n, c)))))

      // player
      const roleIdx = Math.max(0, s.roles.findIndex(r => String(r.role) === String(params.role ?? 0)))
      const playerHost = h('div', { class: 'd-section' }, h('h4', null, t('sc.timeline')),
        s.roles.length > 1 ? h('div', { class: 'seg sc-roles' }, s.roles.map((r, i) => h('button', { class: i === roleIdx ? 'on' : null, onclick: () => DSHMap.router.setParams({ role: String(r.role), at: null }) }, r.role === 0 ? t('sc.role.parent') : t('sc.role.child', { n: r.role }), h('span', { class: 'count' }, ` ${r.events}`)))) : null)
      const slot = h('div')
      playerHost.appendChild(slot)
      page.appendChild(playerHost)
      const extras = h('div')
      page.appendChild(extras)
      const load = () => {
        clear(slot).appendChild(ui.loading())
        DSHMap.load('snap', s.id, s.file).then(body => {
          if (DSHMap.router.params.id !== s.id) return
          const role = body.roles[roleIdx]
          clear(slot)
          if (role) this.player = player(slot, role.lines, Number(params.at ?? 0))
          if (body.patch) extras.appendChild(h('details', { class: 'fold d-mt-3' }, h('summary', null, t('sc.patch')), h('div', { class: 'fold-body' }, ui.code(body.patch, 'yaml'), h('button', { class: ['link-btn', 'tiny', 'mono'], onclick: () => DSHMap.nav.openFile(body.patchFile) }, body.patchFile))))
          extras.appendChild(h('details', { class: 'fold d-mt-2' }, h('summary', null, t('sc.manifest')), h('div', { class: 'fold-body' }, ui.code(body.manifest, 'yaml'))))
        }).catch(err => { if (DSHMap.router.params.id === s.id) clear(slot).appendChild(ui.errorState(err, { retry: load })) })
      }
      load()
      if (cls?.file) {
        const box = h('details', { class: 'fold d-mt-2' }, h('summary', null, t('sc.prompt'), h('span', { class: 'faint small' }, ` · ${cls.cls} · ${i18n.tn('lines', cls.promptLines)}`)))
        const inner = h('div', { class: 'fold-body' })
        box.appendChild(inner)
        const loadClass = () => {
          clear(inner).appendChild(ui.loading())
          DSHMap.load('snapClass', cls.cls, cls.file).then(own => {
            const names = (own.schemas?.initial ?? []).map(x => x.name)
            clear(inner).append(h('div', { class: 'chips sc-schemas' }, names.map(n => h('span', { class: 'chip mono' }, n))), h('pre', { class: 'code prompt-text' }, own.prompt ?? ''), h('button', { class: ['link-btn', 'tiny', 'mono'], onclick: () => DSHMap.nav.openScenario(own.scenario) }, own.scenario))
          }).catch(err => { clear(inner).appendChild(ui.errorState(err, { retry: loadClass })) })
        }
        box.addEventListener('toggle', () => { if (box.open && !inner.childNodes.length) loadClass() })
        page.appendChild(box)
      }
    },
    renderOverview(page) {
      const M = DSHMap.model
      const by = {}
      for (const s of M.scenarios) by[s.surface] = (by[s.surface] ?? 0) + 1
      const live = M.scenarios.filter(s => s.recording === 'live').length
      page.append(h('h2', { class: 'detail-title' }, t('sc.title')), DSHMap.ui.gtext('p', { class: 'muted' }, t('sc.lead')),
        h('div', { class: 'stat-grid' }, Object.entries(by).map(([k, n]) => h('div', { class: 'stat' }, h('b', null, n), h('span', null, k))), h('div', { class: 'stat' }, h('b', null, live), h('span', null, t('sc.recording.live')))),
        h('p', { class: 'faint small d-mt-3' }, svgIcon('info', 'inline-icon'), t('sc.empty')))
      const owners = M.headerClasses.filter(c => c.file)
      page.append(h('h2', { class: 'section-title' }, t('sc.classes', { n: owners.length }), h('span', { class: 'hint' }, t('sc.classes.lead'))),
        DSHMap.ui.table({
          card: true, className: 'sc-classes', label: t('sc.classes', { n: owners.length }), rows: owners,
          row: c => ({ class: 'clickable', onclick: () => DSHMap.nav.openScenario(c.owner) }),
          columns: [
            { key: 'cls', label: t('sc.class'), className: 'mono', cell: c => h('b', null, c.cls) },
            { key: 'profile', label: t('sc.profile'), className: 'mono small', cell: c => c.profile ?? '' },
            { key: 'preset', label: t('sc.preset'), className: 'mono small faint', cell: c => c.preset ?? '' },
            { key: 'tools', label: t('sc.col.tools'), num: true, className: 'small', sort: c => c.tools?.initial.length ?? 0, cell: c => t('sc.tools.n', { n: c.tools?.initial.length ?? 0 }) },
            { key: 'promptLines', label: t('sc.col.lines'), num: true, className: 'small faint', cell: c => i18n.tn('lines', c.promptLines) },
            { key: 'scenarios', label: t('nav.scenarios'), num: true, className: 'small faint', sort: c => c.scenarios.length, cell: c => c.scenarios.length },
          ],
        }))
    },
  }

  function seChip(name, count) {
    const M = DSHMap.model
    const known = M.seByName.has(name)
    return h(known ? 'button' : 'span', { class: ['chip', 'mono', known ? 'link' : null], title: known ? M.seByName.get(name).description ?? '' : '', onclick: known ? () => DSHMap.nav.openSessionEvent(name) : null }, name, count !== undefined ? h('span', { class: 'count' }, count) : null)
  }

  /** One-line summary of a Session log record. */
  function summarize(l) {
    const d = l.data ?? {}
    const text = msg => (msg?.content ?? []).map(c => c.type === 'text' ? c.text : c.type === 'reasoning' ? `💭 ${c.text}` : c.type === 'tool-call' ? `→ ${c.name}(${String(c.arguments ?? '').slice(0, 80)})` : `[${c.type}]`).join(' ')
    switch (l.type) {
      case 'session': return `v${l.version} · ${l.agentPreset ?? ''} · depth ${l.delegationDepth ?? 0}`
      case 'turn/start': case 'turn/end': return `turn ${d.turn}${d.reason ? ` · ${d.reason.kind}` : ''}`
      case 'step/start': case 'step/end': return `turn ${d.turn} · step ${d.step}`
      case 'tool/call': return `${d.name}(${String(d.arguments ?? '').slice(0, 160)})`
      case 'tool/result': return `${d.message?.isError ? '✗ ' : ''}${text(d.message)}`
      case 'user/message': case 'assistant/message': return text(d.message ?? d)
      case 'system/message': return text(d.message)
      case 'agent/inbox/spliced': return d.inserted?.length ? text(d.inserted[0]) : `removed ${d.removedCount ?? 0}`
      case 'permission/preset': return d.preset
      case 'sandbox/mode': return d.mode
      case 'approval/policy': return d.policy
      case 'request/context': return `${d.provider}/${d.model} · ${d.contextWindow ?? ''}`
      case 'session/title': return d.title
      default: return JSON.stringify(d).slice(0, 200)
    }
  }

  /** Event-by-event player of one Session log. */
  function player(host, lines, start) {
    const M = DSHMap.model
    let at = Math.min(Math.max(0, start), lines.length - 1)
    let timer = null
    let speed = 2
    const rows = []
    const detail = h('div', { class: 'player-detail' })
    const status = h('span', { class: 'mono small' })
    const playBtn = h('button', { class: 'btn small', onclick: () => (timer ? stop() : play()) })
    const bar = h('input', { type: 'range', min: 0, max: lines.length - 1, value: at, class: 'player-range', 'aria-label': t('sc.position') })
    bar.addEventListener('input', () => go(Number(bar.value)))
    const speedSel = h('select', { class: 'input player-speed', 'aria-label': t('sc.speed'), onchange: e => { speed = Number(e.target.value); if (timer) { stop(); play() } } }, [1, 2, 4, 8].map(v => h('option', { value: v, selected: v === speed }, `${v}×`)))
    const list = h('div', { class: 'timeline' })
    DSHMap.a11y.arrowNav(list, '.tl-row')
    lines.forEach((l, i) => {
      const se = M.seByName.get(l.type)
      const row = h('button', { class: ['tl-row', `tl-${l.type.replace(/\W+/g, '-')}`], onclick: () => go(i) },
        h('span', { class: 'tl-i mono faint' }, i),
        h('span', { class: ['tl-type', 'mono', se ? 'known' : null] }, l.type, l.surfaceOp ? h('span', { class: 'faint' }, ' ·s') : null),
        h('span', { class: 'tl-sum' }, util.firstSentence(summarize(l), 220)))
      rows.push(row)
      list.appendChild(row)
    })
    host.append(h('div', { class: 'player-bar row wrap' },
      h('button', { class: 'btn small', title: t('sc.prev'), 'aria-label': t('sc.prev'), onclick: () => go(at - 1) }, svgIcon('back')), playBtn,
      h('button', { class: 'btn small', title: t('sc.next'), 'aria-label': t('sc.next'), onclick: () => go(at + 1) }, svgIcon('next')),
      bar, status, h('span', { class: 'faint small' }, t('sc.speed')), speedSel), h('div', { class: 'player' }, list, detail))
    function paintBtn() { clear(playBtn).append(svgIcon(timer ? 'pause' : 'play'), timer ? t('sc.pause') : t('sc.play')) }
    function go(i, push = true) {
      at = Math.min(Math.max(0, i), lines.length - 1)
      rows.forEach((r, k) => { r.classList.toggle('cur', k === at); r.classList.toggle('past', k < at); if (k === at) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current') })
      rows[at].scrollIntoView({ block: 'nearest' })
      bar.value = at
      status.textContent = `${at + 1} / ${lines.length}`
      const l = lines[at]
      const se = M.seByName.get(l.type)
      clear(detail).append(
        h('div', { class: 'row wrap' }, seChip(l.type),
          se?.owner ? DSHMap.ui.pkgChip(se.owner) : null,
          se?.source ? h('button', { class: ['link-btn', 'tiny', 'mono'], onclick: () => DSHMap.nav.openFile(se.source.replace(/^(\.\.\/)+/, '')) }, t('sc.declared')) : null,
          l.surfaceOp ? h('span', { class: 'badge' }, `surface: ${l.surfaceOp}`) : null),
        se?.description ? h('p', { class: 'small muted' }, util.firstSentence(se.description, 260)) : null,
        DSHMap.ui.code(JSON.stringify(l, null, 2), 'json'))
      if (push) DSHMap.router.setParams({ at: at ? String(at) : null }, { replace: true })
    }
    function play() {
      if (at >= lines.length - 1) go(0)
      timer = setInterval(() => { if (at >= lines.length - 1) { stop(); return } go(at + 1) }, 1000 / speed)
      paintBtn()
    }
    function stop() { clearInterval(timer); timer = null; paintBtn() }
    paintBtn()
    go(at, false)
    return { go, stop }
  }
})()
