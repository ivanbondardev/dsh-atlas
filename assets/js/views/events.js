/* DSH Map — runtime (Cordis) events and durable session-log events. */
(function () {
  'use strict'
  const { h, clear, t, util, i18n } = DSHMap

  const MODE_BADGE = { emit: 'accent', serial: 'warn', parallel: 'ok', waterfall: 'orange' }

  DSHMap.views.events = {
    scroll: false,
    init(el) {
      const ui = DSHMap.ui
      this.groupBy = DSHMap.util.storage.get('eventsGroup', 'udomain')
      // Grouping (`by`) is not a filter: it rides in the bar as an extra seg.
      this.grpSeg = h('div', { class: 'seg' })
      this.bar = ui.filterBar({
        key: 'q', chipKey: 'm', placeholder: t('ev.filter'), label: t('ev.filter'),
        onChange: () => this.renderList(), extra: this.grpSeg,
      })
      this.tabSeg = h('div', { class: 'seg' })
      const L = ui.layout.reference(el, { title: t('ev.title'), className: 'events-view', head: [this.tabSeg, this.bar.el] })
      this.count = L.count
      this.list = L.list
      this.detail = L.detail
      DSHMap.a11y.arrowNav(this.list, '.li')
    },
    tab(params) { return params.tab === 'session' ? 'session' : 'runtime' },
    /** Mode chips of a tab, with counts. */
    modeChips(tab) {
      const M = DSHMap.model
      const modes = tab === 'session' ? ['surface', 'log-only'] : ['emit', 'serial', 'parallel', 'waterfall']
      const src = tab === 'session' ? M.sessionEvents.map(e => e.kind) : M.events.map(e => e.mode)
      return modes.map(m => ({ id: m, label: m, count: src.filter(x => x === m).length }))
    },
    /**
     * Filter text (`q`), mode chip (`m`) and grouping (`by`) come from the
     * route; `by` is always written so a link keeps the grouping (2.2).
     */
    takeFilters(params) {
      const tab = this.tab(params)
      this.bar.setChips(this.modeChips(tab))
      if (params.by === 'udomain' || params.by === 'domain') this.groupBy = params.by
      const changed = this.bar.sync(params) || this.lastBy !== this.groupBy
      this.lastBy = this.groupBy
      if (tab === 'runtime' && params.by !== this.groupBy) DSHMap.router.replace({ by: this.groupBy })
      return changed
    },
    show(params) { this.takeFilters(params); this.renderAll(params) },
    update(params, prev) {
      const refilter = this.takeFilters(params)
      if (params.tab !== prev.tab) this.renderAll(params)
      else if (params.name !== prev.name) { if (refilter) this.renderGroup(this.tab(params)); this.renderList(); this.renderDetail(params) } else if (refilter) { this.renderGroup(this.tab(params)); this.renderList() }
    },
    renderAll(params) {
      const M = DSHMap.model
      const tab = this.tab(params)
      const seg = DSHMap.ui.tabs([['runtime', t('ev.tab.runtime'), M.events.length], ['session', t('ev.tab.session'), M.sessionEvents.length]], tab,
        id => DSHMap.router.setParams(id === 'session' ? { tab: 'session', name: null, m: null, by: null } : { tab: 'runtime', name: null, m: null }), t('ev.title'))
      this.tabSeg.replaceWith(seg)
      this.tabSeg = seg
      this.renderGroup(tab)
      this.renderList()
      this.renderDetail(params)
    },
    /** Grouping seg of the runtime tab: by universal domain or by name prefix. */
    renderGroup(tab) {
      this.grpSeg.classList.toggle('hidden', tab !== 'runtime')
      clear(this.grpSeg).append(...[['udomain', t('udomain')], ['domain', 'prefix/*']].map(([g, l]) => h('button', {
        class: this.groupBy === g ? 'on' : null,
        onclick: () => { this.groupBy = this.lastBy = g; DSHMap.util.storage.set('eventsGroup', g); DSHMap.router.replace({ by: g }); this.renderGroup(tab); this.renderList() },
      }, l)))
    },
    renderList() {
      const M = DSHMap.model
      const params = DSHMap.router.params
      const tab = this.tab(params)
      const q = this.bar.query()
      const mode = this.bar.chip()
      const list = clear(this.list)
      const items = (tab === 'session' ? M.sessionEvents : M.events)
        .filter(e => !mode || (tab === 'session' ? e.kind : e.mode) === mode)
        .filter(e => !q || `${e.name} ${e.description ?? ''}`.toLowerCase().includes(q))
      this.count.textContent = items.length
      const byDomain = new Map()
      for (const e of items) {
        const d = tab === 'runtime' && this.groupBy === 'udomain' ? `!${e.udomain}` : tab === 'runtime' && e.kind === 'undeclared' ? `~ ${t('ev.undeclared')}` : e.domain
        if (!byDomain.has(d)) byDomain.set(d, [])
        byDomain.get(d).push(e)
      }
      const UD = ['!session', '!agent', '!capability', '!framework']
      const domains = [...byDomain.keys()].sort((a, b) => (UD.indexOf(a) - UD.indexOf(b)) || (a.startsWith('~') ? 1 : 0) - (b.startsWith('~') ? 1 : 0) || (a < b ? -1 : 1))
      for (const d of domains) {
        const ud = d.startsWith('!') ? M.eventDomainById.get(d.slice(1)) : null
        list.appendChild(h('div', { class: 'li-group', title: ud ? i18n.pick(ud.blurb) : null }, h('span', null, ud ? [h('i', { class: 'mdot', style: `background:${ud.color}` }), ' ', i18n.pick(ud.title)] : d.startsWith('~') ? d.slice(2) : `${d}/*`), h('span', null, byDomain.get(d).length)))
        for (const e of byDomain.get(d).sort((a, b) => (a.name < b.name ? -1 : 1))) {
          const sel = e.name === params.name
          const meta = tab === 'session'
            ? h('span', { class: ['badge', e.kind === 'surface' ? 'accent' : null] }, e.kind)
            : [e.mode ? h('span', { class: ['badge', MODE_BADGE[e.mode]] }, e.mode) : null, h('span', { class: 'faint tiny nowrap' }, `${e.dispatchers.length}→${e.listeners.length}`)]
          const el = h('button', { class: ['li', sel ? 'is-selected' : null], ...DSHMap.ui.selAttrs(sel), onclick: () => DSHMap.router.setParams({ name: e.name }) },
            h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, e.name), h('div', { class: 'li-sub' }, util.firstSentence(e.description ?? '', 90))),
            h('div', { class: 'li-meta' }, meta))
          list.appendChild(el)
          if (sel) requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest' }))
        }
      }
      if (!items.length) list.appendChild(DSHMap.ui.noMatches(() => this.bar.reset()))
    },
    renderDetail(params) {
      const M = DSHMap.model
      const tab = this.tab(params)
      const root = clear(this.detail)
      root.scrollTop = 0
      const page = h('div', { class: 'page' })
      root.appendChild(page)
      if (!params.name) { this.renderOverview(page); return }
      if (tab === 'session') this.renderSession(page, M.seByName.get(params.name))
      else this.renderRuntime(page, M.evByName.get(params.name))
    },
    renderRuntime(page, e) {
      const M = DSHMap.model
      if (!e) { page.appendChild(DSHMap.ui.emptyState({ text: t('ev.select'), compact: true })); return }
      const inFlow = DSHMap.model.overview.turnFlow.some(s => s.name === e.name)
      page.append(
        h('div', { class: 'd-kicker' }, t('type.event'), e.mode ? h('span', { class: ['badge', MODE_BADGE[e.mode]] }, e.mode) : null, e.kind === 'undeclared' ? h('span', { class: 'badge' }, t('ev.undeclared')) : null, inFlow ? h('span', { class: 'badge accent' }, t('ev.lifecycle')) : null),
        h('h2', { class: 'd-title mono' }, e.name),
        h('div', { class: 'chips d-chips' }, DSHMap.ui.vocabBadge(M.eventDomainById.get(e.udomain), t('udomain'))),
        e.description ? h('p', { class: 'd-lead' }, e.description) : null,
        e.mode ? h('div', { class: 'mode-explain d-mt-3' }, t(`evmode.${e.mode}`)) : null,
      )
      if (e.declared || e.owner) {
        page.appendChild(h('dl', { class: 'kv d-mt-4' },
          e.owner ? [h('dt', null, t('ev.owner')), h('dd', null, DSHMap.ui.pkgChip(e.owner))] : null,
          e.declared ? [h('dt', null, t('ev.declared')), h('dd', null, DSHMap.ui.sourceLink(e.declared.path, e.declared.line))] : null,
          e.page ? [h('dt', null, 'docs'), h('dd', null, h('a', { href: M.github(e.page), target: '_blank', rel: 'noopener', class: 'mono small' }, e.page))] : null))
      }
      const rel = DSHMap.ui.relNode
      page.appendChild(h('div', { class: 'd-section' }, DSHMap.ui.relDiagram({
        left: [{ title: t('ev.dispatchers'), kind: 'owner', items: e.dispatchers.map(id => rel(id, e.dispatchVia?.[id] ?? null)) }],
        center: [h('b', null, e.name), h('span', null, e.mode ?? '')],
        right: [{ title: t('ev.listeners'), kind: 'consumer', items: e.listeners.map(id => rel(id)) }],
      })))
      if (e.code || e.signature) {
        page.appendChild(h('div', { class: 'd-section' }, h('h4', null, t('ev.signature')), DSHMap.ui.code(e.code ?? e.signature, 'typescript'),
          e.parameters?.length ? h('dl', { class: 'kv small d-mt-2' }, e.parameters.flatMap(pa => [h('dt', { class: 'mono' }, pa.name), h('dd', null, pa.description)])) : null))
      }
      page.append(...DSHMap.ui.refSections('event', e.name))
    },
    renderSession(page, e) {
      if (!e) { page.appendChild(DSHMap.ui.emptyState({ text: t('ev.select'), compact: true })); return }
      const inFlow = DSHMap.model.overview.turnFlow.some(s => s.name === e.name)
      page.append(
        h('div', { class: 'd-kicker' }, t('type.sessionEvent'), h('span', { class: ['badge', e.kind === 'surface' ? 'accent' : null] }, e.kind), inFlow ? h('span', { class: 'badge accent' }, t('ev.lifecycle')) : null),
        h('h2', { class: 'd-title mono' }, e.name),
        e.description ? h('p', { class: 'd-lead' }, e.description) : null,
        h('div', { class: 'mode-explain d-mt-3' }, t(`evkind.${e.kind}`)),
        h('dl', { class: 'kv d-mt-4' },
          e.owner ? [h('dt', null, t('ev.owner')), h('dd', null, DSHMap.ui.pkgChip(e.owner))] : null,
          e.source ? [h('dt', null, t('ev.declared')), h('dd', null, DSHMap.ui.sourceLink(e.source, e.line))] : null),
        e.code ? h('div', { class: 'd-section' }, h('h4', null, t('ev.declaration')), DSHMap.ui.code(e.code, 'typescript')) : null,
        DSHMap.evolution?.formatHistory(e.name),
      )
      const M = DSHMap.model
      const writers = M.tools.filter(tl => tl.writes.some(w => new RegExp(`(^|[^a-z/-])${DSHMap.util.reEscape(e.name)}($|[^a-z/-])`).test(w)))
      page.append(...DSHMap.ui.refSections('sessionEvent', e.name))
      if (writers.length) {
        page.appendChild(h('div', { class: 'd-section' }, h('h4', null, t('ev.writers'), h('span', { class: 'count' }, writers.length)),
          h('div', { class: 'chips' }, writers.map(tl => DSHMap.ui.toolChip(tl.key, tl.name)))))
      }
    },
    renderOverview(page) {
      const M = DSHMap.model
      page.append(
        h('h2', { class: 'detail-title' }, t('ev.title')),
        h('p', { class: 'muted' }, i18n.pick(DSHMap.model.overview.concepts.find(c => c.term === 'events')?.text)),
        h('h2', { class: 'section-title ev-turn-title' }, t('ov.turn'), h('span', { class: 'hint' }, t('ov.turn.hint'))),
        DSHMap.ui.turnFlow(),
        h('h2', { class: 'section-title' }, t('udomain')),
        h('div', { class: 'stack' }, M.vocab.eventDomains.map(d => h('div', { class: 'mode-explain row' }, h('span', { class: 'badge vocab', style: `--vc:${d.color}` }, `${i18n.pick(d.title)} · ${d.id === 'session' ? M.sessionEvents.length + M.events.filter(e => e.udomain === d.id).length : M.events.filter(e => e.udomain === d.id).length}`), h('span', null, i18n.pick(d.blurb))))),
        h('h2', { class: 'section-title' }, t('events.modes')),
        h('div', { class: 'stack' }, ['emit', 'serial', 'parallel', 'waterfall'].map(m => h('div', { class: 'mode-explain row' }, h('span', { class: ['badge', MODE_BADGE[m]] }, `${m} · ${M.events.filter(e => e.mode === m).length}`), h('span', null, t(`evmode.${m}`))))),
      )
      const busiest = [...M.events].sort((a, b) => b.listeners.length - a.listeners.length).slice(0, 14)
      const max = busiest[0]?.listeners.length || 1
      page.append(h('h2', { class: 'section-title' }, t('events.top')),
        h('div', { class: 'card' }, h('div', { class: 'bar-list' }, busiest.map(e => h('button', { class: 'bar-item link', onclick: () => DSHMap.router.setParams({ name: e.name, tab: 'runtime' }) },
          h('span', { class: 'bl mono' }, e.name),
          h('span', { class: 'bt' }, h('i', { style: `width:${(e.listeners.length / max * 100).toFixed(1)}%` })),
          h('span', { class: 'bv' }, e.listeners.length))))))
    },
  }
})()
