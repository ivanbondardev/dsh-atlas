/* DSH Map — architecture: C4-style levels (context, processes, groups,
 * packages), runtime flows (upstream Mermaid diagrams and curated
 * sequences) and the architecture rules with their gates and lenses. */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, util, i18n } = DSHMap

  i18n.extend({
    uk: {
      'arch.title': 'Архітектура',
      'arch.tab.context': 'L0 · Контекст',
      'arch.tab.processes': 'L1 · Процеси',
      'arch.tab.flows': 'Потоки',
      'arch.tab.rules': 'Правила',
      'arch.levels': 'Рівні деталізації',
      'arch.level.0': 'Контекст: dsh, люди й зовнішні системи',
      'arch.level.1': 'Процеси ОС і канали між ними',
      'arch.level.2': 'Групи пакетів (карта в режимі «Групи»)',
      'arch.level.3': 'Пакети та їхні залежності',
      'arch.level.4': 'Файли (treemap і переглядач коду)',
      'arch.channel': 'Канал',
      'arch.start': 'Як запускається',
      'arch.lifetime': 'Час життя',
      'arch.lifetime.per-run': 'на запуск профілю',
      'arch.lifetime.long-lived': 'довгоживучий',
      'arch.lifetime.per-call': 'на виклик',
      'arch.lifetime.per-connection': 'на з’єднання',
      'arch.lifetime.per-client': 'на клієнт',
      'arch.lifetime.per-task': 'на задачу',
      'arch.packages': 'Пакети',
      'arch.refs': 'Джерела',
      'arch.diagram': 'Схема процесів',
      'arch.processes.lead': 'Процеси запущеного харнесу. Вбудований вебсервер і Worker-и живуть усередині процесу dsh; решта — окремі процеси ОС. Опис зібрано з README й вихідників (посилання в кожній картці).',
      'arch.context.lead': 'Рівень L0: що оточує dsh. Кожна система прив’язана до пакетів, які з нею говорять.',
      'arch.flows.lead': 'Готові діаграми upstream рендеряться з документів (вузли з назвами пакетів, сервісів і подій клікабельні); потоки, яких upstream не має однією діаграмою, зібрано як послідовності кроків із перевіреними посиланнями.',
      'arch.flow.source': 'Діаграма з',
      'arch.flow.actor': 'де',
      'arch.rules.lead': 'Інваріанти архітектури: правило → навіщо → як перевіряється. Частину правил перевіряють скрипти verify-*/check-*, частина тримається лише на рев’ю.',
      'arch.rule.gates': 'Перевіряє',
      'arch.rule.review': 'лише рев’ю',
      'arch.rule.doc': 'Джерело',
      'arch.rule.lens': 'Лінза',
      'arch.lens.show': 'Показати на карті',
      'arch.lens.lead': 'Перевірка правила «розширення залежать від визначень сервісів, а не від провайдерів» за даними карти: усі peer/runtime-залежності від провайдера шва, який не є його визначенням. Більшість легітимні — класифікація пояснює чому.',
      'arch.gates.all': 'Усі механічні перевірки ({n})',
      'arch.gates.unmapped': 'не прив’язані до правила вище',
      'arch.patterns': 'Захисні патерни — правила рев’ю ({n})',
      'arch.patterns.lead': 'docs/defensive-patterns: кожен патерн — вимога, яку репозиторій тримає на рев’ю.',
    },
    en: {
      'arch.title': 'Architecture',
      'arch.tab.context': 'L0 · Context',
      'arch.tab.processes': 'L1 · Processes',
      'arch.tab.flows': 'Flows',
      'arch.tab.rules': 'Rules',
      'arch.levels': 'Levels of detail',
      'arch.level.0': 'Context: dsh, people and external systems',
      'arch.level.1': 'OS processes and the channels between them',
      'arch.level.2': 'Package groups (the map in Groups mode)',
      'arch.level.3': 'Packages and their dependencies',
      'arch.level.4': 'Files (treemap and code viewer)',
      'arch.channel': 'Channel',
      'arch.start': 'How it starts',
      'arch.lifetime': 'Lifetime',
      'arch.lifetime.per-run': 'per profile run',
      'arch.lifetime.long-lived': 'long-lived',
      'arch.lifetime.per-call': 'per call',
      'arch.lifetime.per-connection': 'per connection',
      'arch.lifetime.per-client': 'per client',
      'arch.lifetime.per-task': 'per task',
      'arch.packages': 'Packages',
      'arch.refs': 'Sources',
      'arch.diagram': 'Process diagram',
      'arch.processes.lead': 'The processes of a running harness. The embedded web server and Workers live inside the dsh process; the rest are separate OS processes. Facts come from READMEs and sources (linked on every card).',
      'arch.context.lead': 'Level L0: what surrounds dsh. Every system is tied to the packages that talk to it.',
      'arch.flows.lead': 'Upstream diagrams render from their documents (nodes naming packages, services and events are clickable); flows upstream has no single diagram for are curated step sequences with validated links.',
      'arch.flow.source': 'Diagram from',
      'arch.flow.actor': 'in',
      'arch.rules.lead': 'Architecture invariants: rule → why → how it is checked. Some are enforced by verify-*/check-* scripts, others only by review.',
      'arch.rule.gates': 'Checked by',
      'arch.rule.review': 'review only',
      'arch.rule.doc': 'Source',
      'arch.rule.lens': 'Lens',
      'arch.lens.show': 'Show on the map',
      'arch.lens.lead': 'The rule “extensions depend on Service Definitions, never providers” checked against the map data: every peer/runtime dependency on a seam provider that is not its definition. Most are legitimate — the classification says why.',
      'arch.gates.all': 'All mechanical checks ({n})',
      'arch.gates.unmapped': 'not tied to a rule above',
      'arch.patterns': 'Defensive patterns — review rules ({n})',
      'arch.patterns.lead': 'docs/defensive-patterns: every pattern is a requirement the repository enforces in review.',
    },
  })

  const TABS = ['context', 'processes', 'flows', 'rules']
  const ROLE_BADGE = { wrapper: 'ok', composition: 'accent', closure: 'pink', candidate: 'warn' }

  DSHMap.views.architecture = {
    scroll: true,
    init(el) {
      this.L = DSHMap.ui.layout.narrative(el, { className: 'arch-page' })
      this.root = this.L.root
      this.el = el
      this.panes = DSHMap.ui.panes(this.L.body, this, [])
    },
    tab(params) { return TABS.includes(params.tab) ? params.tab : 'context' },
    show(params) { this.render(params) },
    update(params, prev) {
      if (this.tab(params) !== this.tab(prev) || params.flow !== prev.flow) this.render(params)
      else this.select(params)
    },
    render(params) {
      const tab = this.tab(params)
      this.L.head({ title: t('arch.title'), tabs: DSHMap.ui.tabs(TABS.map(id => [id, t(`arch.tab.${id}`)]), tab, id => DSHMap.router.go('architecture', { tab: id }), t('arch.title')) })
      // Tabs seen before come back from the pane cache (4.5).
      this.panes.show(`${tab}|${tab === 'flows' ? params.flow ?? '' : ''}`, body => {
        body.appendChild(levels(tab))
        if (tab === 'context') this.renderContext(body)
        else if (tab === 'processes') this.renderProcesses(body)
        else if (tab === 'flows') this.renderFlows(body, params)
        else this.renderRules(body)
      }, this.el)
      setTimeout(() => this.select(params), 150)
    },
    /** Scroll to and mark the selected card (process, rule). */
    select(params) {
      const id = params.process ?? params.rule ?? null
      const el = id ? this.root.querySelector(`[data-card="${CSS.escape(id)}"]`) : null
      DSHMap.ui.selectOnly(this.root, el)
      if (el) el.scrollIntoView({ block: 'center', behavior: DSHMap.a11y.reducedMotion() ? 'auto' : 'smooth' })
    },

    // ── L0 ──────────────────────────────────────────────────────────────
    renderContext(body) {
      const M = DSHMap.model
      const ctx = M.guide.context
      body.appendChild(h('p', { class: 'muted' }, t('arch.context.lead')))
      const toProcesses = () => DSHMap.router.go('architecture', { tab: 'processes' })
      const center = DSHMap.ui.cardClick(h('div', { class: 'ctx-center card' },
        h('div', { class: 'ctx-logo' }, DSHMap.svgIcon('logo')),
        h('h3', null, h('button', { onclick: toProcesses }, i18n.pick(ctx.title))),
        DSHMap.ui.gtext('p', null, i18n.pick(ctx.blurb)),
        h('div', { class: 'chips' }, M.profileOrder.map(n => h('button', { class: 'chip link mono', onclick: e => { e.stopPropagation(); DSHMap.nav.openProfile(n) } }, n)))), toProcesses)
      const actor = a => h('div', { class: ['card', 'ctx-actor', a.kind === 'person' ? 'person' : null], 'data-card': a.id },
        h('div', { class: 'row' }, h('b', null, i18n.pick(a.title)), a.kind === 'person' ? h('span', { class: 'badge accent' }, t('arch.person')) : null),
        DSHMap.ui.gtext('p', { class: 'small muted' }, i18n.pick(a.blurb)),
        a.channel ? h('div', { class: 'small' }, h('span', { class: 'faint' }, `${t('arch.channel')}: `), i18n.pick(a.channel)) : null,
        DSHMap.ui.chipList(a.packages, id => DSHMap.ui.pkgChip(id), 8),
        refChips(a.refs))
      const actors = ctx.actors
      const half = Math.ceil(actors.length / 2)
      body.appendChild(h('div', { class: 'ctx-grid' },
        h('div', { class: 'ctx-col' }, actors.slice(0, half).map(actor)),
        center,
        h('div', { class: 'ctx-col' }, actors.slice(half).map(actor))))
    },

    // ── L1 ──────────────────────────────────────────────────────────────
    renderProcesses(body) {
      const M = DSHMap.model
      const list = M.guide.processes
      body.appendChild(h('p', { class: 'muted' }, t('arch.processes.lead')))
      // Generated Mermaid flowchart of the process tree.
      const esc = s => String(s).replace(/"/g, "'")
      const lines = ['flowchart LR']
      for (const p of list) lines.push(`  ${p.id.replace(/-/g, '_')}["${esc(i18n.pick(p.title))}"]`)
      for (const p of list) if (p.parent) lines.push(`  ${p.parent.replace(/-/g, '_')} -->|"${esc((p.channel ?? '').split(/[,·:]/)[0].trim().slice(0, 34))}"| ${p.id.replace(/-/g, '_')}`)
      const sdk = list.find(p => p.id === 'sdk-client')
      if (sdk && list.some(p => p.id === 'dsh')) lines.push('  sdk_client -.->|"dsh --profile sdk"| dsh')
      const diagram = h('div', { class: 'card arch-diagram' }, h('h3', null, t('arch.diagram')))
      body.appendChild(diagram)
      const holder = h('pre')
      diagram.appendChild(holder)
      const box = DSHMap.ui.mermaidBlock(lines.join('\n'), holder)
      const wire = () => {
        for (const g of box.querySelectorAll('g.node')) {
          const id = list.find(p => g.id.includes(`-${p.id.replace(/-/g, '_')}-`))?.id
          if (!id) continue
          g.classList.add('mm-link')
          g.addEventListener('click', () => DSHMap.router.setParams({ process: id }, { replace: true }))
          if (!g.hasAttribute('tabindex')) DSHMap.ui.keyLink(g, i18n.pick(M.processById.get(id)?.title))
        }
      }
      new MutationObserver((_, obs) => { if (box.querySelector('svg')) { obs.disconnect(); wire() } }).observe(box, { childList: true, subtree: true })

      const byParent = new Map()
      for (const p of list) { const k = p.parent ?? ''; if (!byParent.has(k)) byParent.set(k, []); byParent.get(k).push(p) }
      const tree = h('div', { class: 'proc-tree' })
      const walk = (parent, depth) => (byParent.get(parent) ?? []).forEach(p => { tree.appendChild(processCard(p, depth)); walk(p.id, depth + 1) })
      walk('', 0)
      body.appendChild(tree)
    },

    // ── flows ───────────────────────────────────────────────────────────
    renderFlows(body, params) {
      const M = DSHMap.model
      const flows = M.guide.flows
      const sel = M.flowById.get(params.flow) ?? flows[0]
      body.appendChild(h('p', { class: 'muted' }, t('arch.flows.lead')))
      body.appendChild(h('div', { class: 'chips flow-picker' }, flows.map(f => h('button', {
        class: ['chip', 'link', f.id === sel?.id ? 'on' : null], 'aria-pressed': String(f.id === sel?.id), onclick: () => DSHMap.router.setParams({ flow: f.id }),
      }, f.diagram ? '◇ ' : '→ ', i18n.pick(f.title)))))
      if (!sel) return
      const card = h('div', { class: 'card flow-card' },
        h('h3', null, i18n.pick(sel.title)),
        DSHMap.ui.gtext('p', { class: 'muted' }, i18n.pick(sel.blurb)),
        sel.processes.length ? h('div', { class: 'chips' }, sel.processes.map(id => h('button', { class: 'chip link', onclick: () => DSHMap.nav.openProcess(id) }, svgIcon('box'), i18n.pick(M.processById.get(id).title)))) : null)
      body.appendChild(card)
      if (sel.diagram) {
        const d = M.docById.get(sel.diagram)
        card.appendChild(h('div', { class: 'small flow-source' }, `${t('arch.flow.source')} `, DSHMap.ui.docChip(sel.diagram)))
        const slot = h('div', null, DSHMap.ui.loading())
        card.appendChild(slot)
        DSHMap.load('doc', d.id, d.file).then(rec => {
          clear(slot)
          const blocks = [...rec.body.matchAll(/^\s*```mermaid\s*\n([\s\S]*?)\n\s*```/gm)].map(m => m[1])
          for (const src of blocks) { const pre = h('pre'); slot.appendChild(pre); DSHMap.ui.mermaidBlock(src, pre) }
        }).catch(err => { clear(slot).appendChild(DSHMap.ui.errorState(err, { retry: () => this.render(DSHMap.router.params) })) })
      } else {
        card.appendChild(h('ol', { class: 'flow-steps' }, sel.steps.map(s => h('li', null,
          h('div', { class: 'fs-text' }, DSHMap.ui.gtext('span', null, i18n.pick(s.text)),
            s.actor ? h('span', { class: 'faint small' }, ` · ${t('arch.flow.actor')} `, h('button', { class: 'link-btn', onclick: () => DSHMap.nav.openProcess(s.actor) }, i18n.pick(M.processById.get(s.actor)?.title))) : null),
          refChips(s.refs)))))
      }
    },

    // ── rules ───────────────────────────────────────────────────────────
    renderRules(body) {
      const M = DSHMap.model
      const rules = M.guide.rules
      body.appendChild(h('p', { class: 'muted' }, t('arch.rules.lead')))
      const areas = Object.keys(M.guide.ruleAreas)
      for (const area of areas) {
        const list = rules.filter(r => r.area === area)
        if (!list.length) continue
        body.appendChild(h('h2', { class: 'section-title' }, i18n.pick(M.guide.ruleAreas[area]), h('span', { class: 'hint' }, list.length)))
        body.appendChild(h('div', { class: 'rule-grid' }, list.map(ruleCard)))
      }
      body.appendChild(lensSection())
      const used = new Set(rules.flatMap(r => r.gates))
      body.appendChild(h('details', { class: 'fold arch-gates' },
        h('summary', null, t('arch.gates.all', { n: M.gates.length })),
        h('div', { class: 'fold-body' }, DSHMap.ui.table({
          head: false, rows: M.gates, label: t('arch.gates.all', { n: M.gates.length }),
          columns: [
            { key: 'name', className: 'mono nowrap', cell: g => [g.file ? h('button', { class: 'link-btn', onclick: () => DSHMap.nav.openFile(g.file) }, g.name) : g.name, used.has(g.name) ? null : h('div', { class: 'faint tiny' }, t('arch.gates.unmapped'))] },
            { key: 'summary', className: 'small', cell: g => g.summary ?? '—' },
          ],
        }))))
      const pages = [...new Set(M.patterns.map(p => p.page))]
      body.appendChild(h('details', { class: 'fold arch-patterns' },
        h('summary', null, t('arch.patterns', { n: M.patterns.length })),
        h('div', { class: 'fold-body' }, h('p', { class: 'faint small' }, t('arch.patterns.lead')),
          pages.map(pg => [h('div', { class: 'd-sub-h' }, h('button', { class: 'link-btn', onclick: () => DSHMap.nav.openDoc(pg) }, pg.split('/').pop())),
            h('div', { class: 'stack' }, M.patterns.filter(p => p.page === pg).map(p => h('div', { class: 'pattern' },
              h('button', { class: ['link-btn', 'pattern-title'], onclick: () => DSHMap.nav.openDoc(`${p.page}#${p.anchor}`) }, p.title),
              p.text ? h('div', { class: 'small muted' }, util.firstSentence(p.text, 260)) : null)))]))))
    },
  }

  function levels(tab) {
    const steps = [
      [0, () => DSHMap.router.go('architecture', { tab: 'context' }), tab === 'context'],
      [1, () => DSHMap.router.go('architecture', { tab: 'processes' }), tab === 'processes'],
      [2, () => DSHMap.nav.mapWith({ mode: 'groups' }), false],
      [3, () => DSHMap.nav.mapWith({ mode: 'packages' }), false],
      [4, () => DSHMap.router.go('code'), false],
    ]
    return h('div', { class: 'levels' }, h('span', { class: 'faint small' }, `${t('arch.levels')}:`), steps.map(([n, go, on]) => h('button', { class: ['level', on ? 'on' : null], 'aria-pressed': String(on), onclick: go, title: t(`arch.level.${n}`) }, h('b', null, `L${n}`), h('span', null, t(`arch.level.${n}`)))))
  }

  function processCard(p, depth) {
    const M = DSHMap.model
    return h('div', { class: 'card proc-card', 'data-card': p.id, style: `--depth:${depth}` },
      h('div', { class: 'row wrap' },
        depth ? h('span', { class: 'faint' }, '└') : null,
        h('b', null, i18n.pick(p.title)),
        p.lifetime ? h('span', { class: 'badge' }, t(`arch.lifetime.${p.lifetime}`)) : null,
        p.parent ? h('span', { class: 'faint tiny' }, `← ${i18n.pick(M.processById.get(p.parent)?.title)}`) : null),
      DSHMap.ui.gtext('p', { class: 'small muted proc-blurb' }, i18n.pick(p.blurb)),
      h('dl', { class: 'kv small' },
        p.start ? [h('dt', null, t('arch.start')), h('dd', { class: 'mono' }, i18n.pick(p.start))] : null,
        p.channel ? [h('dt', null, t('arch.channel')), h('dd', null, p.channel)] : null),
      p.packages.length ? DSHMap.ui.chipList(p.packages, id => DSHMap.ui.pkgChip(id), 10) : null,
      refChips(p.refs))
  }

  const refChips = refs => DSHMap.ui.refChips(refs)

  function ruleCard(r) {
    const M = DSHMap.model
    const docLink = r.doc ? (r.doc.doc ? DSHMap.ui.docChip(r.doc.doc.split('#')[0]) : h('button', { class: 'chip link mono', onclick: () => DSHMap.nav.openFile(r.doc.file) }, svgIcon('file'), r.doc.file)) : null
    return h('div', { class: 'card rule-card', 'data-card': r.id },
      h('div', { class: 'row rule-head' }, svgIcon('shield', 'rule-icon'), h('b', null, i18n.pick(r.title))),
      DSHMap.ui.gtext('p', { class: 'small muted' }, i18n.pick(r.why)),
      h('dl', { class: 'kv small' },
        h('dt', null, t('arch.rule.gates')),
        h('dd', null, r.gates.length
          ? h('div', { class: 'chips' }, r.gates.map(g => { const gate = M.gateByName.get(g); return h('button', { class: 'chip link mono', title: gate?.summary ?? g, onclick: () => gate?.file && DSHMap.nav.openFile(gate.file) }, g) }), r.review ? h('span', { class: 'badge warn' }, t('arch.rule.review')) : null)
          : h('span', { class: 'badge warn' }, t('arch.rule.review'))),
        docLink ? [h('dt', null, t('arch.rule.doc')), h('dd', null, docLink)] : null,
        r.lens ? [h('dt', null, t('arch.rule.lens')), h('dd', null, h('button', { class: 'link-btn', onclick: () => document.getElementById(`lens-${r.lens}`)?.scrollIntoView({ behavior: DSHMap.a11y.reducedMotion() ? 'auto' : 'smooth' }) }, t(`lens.${r.lens}`)))] : null))
  }

  function lensSection() {
    const M = DSHMap.model
    const rows = M.providerDeps
    const roles = ['candidate', 'wrapper', 'composition', 'closure']
    const short = id => M.pkgById.get(id)?.short ?? id
    return h('div', { class: 'card lens-card', id: 'lens-provider-deps' },
      h('div', { class: 'row wrap lens-head' },
        h('h3', null, t('lens.provider-deps')),
        h('button', { class: 'btn small', onclick: () => DSHMap.nav.mapWith({ cut: 'lens', mode: 'packages' }) }, svgIcon('map'), t('arch.lens.show'))),
      h('p', { class: 'small muted' }, t('arch.lens.lead')),
      h('div', { class: 'chips lens-roles' }, roles.map(r => h('span', { class: ['badge', ROLE_BADGE[r]], title: t(`lens.role.${r}.d`) }, `${t(`lens.role.${r}`)} · ${rows.filter(x => x.role === r).length}`))),
      roles.map(role => {
        const list = rows.filter(x => x.role === role)
        if (!list.length) return null
        const table = DSHMap.ui.table({
          head: false, rows: list, label: t(`lens.role.${role}`),
          columns: [
            { key: 'from', cell: x => DSHMap.ui.pkgChip(x.from) },
            { key: 'arrow', className: 'faint', cell: () => '→' },
            { key: 'to', cell: x => DSHMap.ui.pkgChip(x.to) },
            { key: 'services', cell: x => h('div', { class: 'chips' }, x.services.map(k => DSHMap.ui.svcChip(k))) },
            { key: 'note', className: 'small faint' },
          ],
        })
        return role === 'candidate'
          ? h('div', null, h('div', { class: 'd-sub-h' }, `${t(`lens.role.${role}`)} — ${t(`lens.role.${role}.d`)}`), table)
          : h('details', { class: 'fold' }, h('summary', null, `${t(`lens.role.${role}`)} · ${list.length} — ${t(`lens.role.${role}.d`)}`), h('div', { class: 'fold-body' }, table))
      }),
      void short)
  }
})()
