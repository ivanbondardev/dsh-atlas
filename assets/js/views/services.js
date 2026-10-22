/* DSH Map — services (ctx.*) and capability seams. */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, fmt, util, i18n } = DSHMap

  const MODES = ['core', 'seam', 'bundle', 'service']
  const MODE_BADGE = { core: 'danger', seam: 'accent', bundle: 'pink', service: 'ok', client: 'orange' }

  const { relDiagram, relNode } = DSHMap.ui

  DSHMap.views.services = {
    scroll: false,
    init(el) {
      const M = DSHMap.model
      this.fb = DSHMap.ui.filterBar({
        key: 'q', chipKey: 'mode', placeholder: t('svc.filter'), label: t('svc.filter'),
        chips: [...MODES.map(m => ({ id: m, label: t(`svcmode.${m}`), count: M.services.filter(s => s.mode === m).length })), { id: 'client', label: 'client', count: M.clientServices.length }],
        onChange: () => this.renderList(DSHMap.router.params.key),
      })
      const L = DSHMap.ui.layout.reference(el, { title: t('svc.title'), className: 'svc-view', head: [this.fb.el] })
      L.count.textContent = M.services.length + M.clientServices.length
      this.list = L.list
      this.detail = L.detail
      DSHMap.a11y.arrowNav(this.list, '.li')
    },
    /** Filter text (`q`) and mode chip (`mode`) live in the route. */
    get mode() { return this.fb.chip() },
    show(params) { this.fb.sync(params); this.renderList(params.key); this.renderDetail(params.key) },
    update(params, prev) {
      const refilter = this.fb.sync(params)
      if (params.key !== prev.key) { this.renderList(params.key); this.renderDetail(params.key) } else if (refilter) this.renderList(params.key)
    },
    renderList(selected) {
      const M = DSHMap.model
      const q = this.fb.query()
      const list = clear(this.list)
      for (const mode of MODES) {
        if (this.mode && this.mode !== mode) continue
        const items = M.services.filter(s => s.mode === mode).filter(s => {
          if (!q) return true
          const owner = M.pkgById.get(s.owner)
          return `ctx.${s.key} ${s.title} ${owner?.short ?? ''} ${s.api?.type ?? ''}`.toLowerCase().includes(q)
        }).sort((a, b) => (a.key < b.key ? -1 : 1))
        if (!items.length) continue
        list.appendChild(h('div', { class: 'li-group' }, h('span', null, t(`svcmode.${mode}`)), h('span', null, items.length)))
        for (const s of items) {
          const owner = M.pkgById.get(s.owner)
          const el = h('button', { class: ['li', s.key === selected ? 'is-selected' : null], ...DSHMap.ui.selAttrs(s.key === selected), onclick: () => DSHMap.router.setParams({ key: s.key }) },
            h('span', { class: 'cdot', style: `background:${owner ? M.colorOf(owner) : 'var(--c-unknown)'}` }),
            h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, `ctx.${s.key}`), h('div', { class: 'li-sub' }, s.title)),
            h('div', { class: 'li-meta' },
              s.implementations.length ? h('span', { class: 'badge ok', title: t('svc.impls') }, `⇢${s.implementations.length}`) : null,
              s.consumers.length ? h('span', { class: 'badge orange', title: t('svc.consumers') }, `⇠${s.consumers.length}`) : null))
          list.appendChild(el)
          if (s.key === selected) requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest' }))
        }
      }
      if (!this.mode || this.mode === 'client') {
        const items = M.clientServices.filter(s => !q || `ctx.${s.key} ${s.type} ${M.pkgById.get(s.owner)?.short ?? ''}`.toLowerCase().includes(q))
        if (items.length) list.appendChild(h('div', { class: 'li-group' }, h('span', null, t('svc.client')), h('span', null, items.length)))
        for (const s of items) {
          const owner = M.pkgById.get(s.owner)
          const el = h('button', { class: ['li', s.key === selected ? 'is-selected' : null], ...DSHMap.ui.selAttrs(s.key === selected), onclick: () => DSHMap.router.setParams({ key: s.key }) },
            h('span', { class: 'cdot', style: `background:${owner ? M.colorOf(owner) : 'var(--c-unknown)'}` }),
            h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, `ctx.${s.key}`), h('div', { class: 'li-sub' }, s.type)),
            h('div', { class: 'li-meta' }, s.consumers.length ? h('span', { class: 'badge orange', title: t('svc.client.consumers') }, `⇠${s.consumers.length}`) : null))
          list.appendChild(el)
          if (s.key === selected) requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest' }))
        }
      }
      if (!list.children.length) list.appendChild(DSHMap.ui.noMatches(() => this.fb.reset()))
    },
    renderClient(page, s) {
      const M = DSHMap.model
      page.append(
        h('div', { class: 'd-kicker' }, t('type.service'), h('span', { class: 'badge orange' }, 'client')),
        h('div', { class: 'row wrap svc-head' }, h('h2', { class: 'd-title mono-title' }, `ctx.${s.key}`), this.contextButton(s)),
        h('div', { class: 'd-sub' }, `${t('svc.client.type')}: ${s.type}`),
        h('div', { class: 'mode-explain svc-explain' }, t('svc.client.d')),
        h('dl', { class: 'kv svc-kv' },
          h('dt', null, t('svc.owner')), h('dd', null, DSHMap.ui.pkgChip(s.owner)),
          h('dt', null, t('svc.client.declared')), h('dd', null, DSHMap.ui.sourceLink(s.source, s.line))))
      page.appendChild(h('div', { class: 'd-section' }, relDiagram({
        left: [{ title: t('svc.owner'), kind: 'owner', items: [relNode(s.owner)] }],
        center: [h('b', null, `ctx.${s.key}`), h('span', null, 'client')],
        right: [{ title: t('svc.client.consumers'), kind: 'consumer', items: s.consumers.map(id => relNode(id)) }],
      })))
      page.append(...DSHMap.ui.refSections('svc', s.key))
      void M
    },
    /** Every seam with its definition and the provider active in each profile. */
    seamTable() {
      const M = DSHMap.model
      const seams = M.services.filter(s => s.mode === 'seam').sort((a, b) => b.implementations.length - a.implementations.length || (a.key < b.key ? -1 : 1))
      const short = id => M.pkgById.get(id)?.short ?? id
      const multi = seams.filter(s => s.implementations.length > 1).length
      const cell = (s, n) => {
        const a = s.active?.[n]
        if (!a?.providers?.length) return h('span', { class: 'faint small' }, s.implementations.length ? '—' : '')
        return h('div', { class: 'chips' }, a.providers.map(x => h('button', { class: ['chip', 'link', 'mono', x.how === 'dep' ? 'dep' : null], title: x.how === 'dep' ? t('svc.active.via', { via: x.via.map(short).join(', ') }) : t('svc.active.mount'), onclick: e => { e.stopPropagation(); DSHMap.nav.openPackage(x.pkg) } }, short(x.pkg), x.state === 'cond' ? ' ◐' : '')))
      }
      return h('div', null,
        h('h2', { class: 'section-title' }, t('svc.seams')),
        h('p', { class: 'muted small' }, t('svc.seams.lead', { n: seams.length, multi })),
        DSHMap.ui.table({
          className: 'seam-table', card: true, label: t('svc.seams'),
          sort: { key: 'n', dir: -1 },
          columns: [
            { key: 'key', label: 'ctx.*', className: 'mono nowrap', cell: s => `ctx.${s.key}` },
            { key: 'owner', label: t('svc.active.def'), className: 'mono small', sort: s => (s.owner ? short(s.owner) : ''), cell: s => (s.owner ? short(s.owner) : '—') },
            { key: 'n', label: '#', num: true, sort: s => s.implementations.length, cell: s => s.implementations.length },
            ...M.profileOrder.map(n => ({ key: `p:${n}`, label: n, sort: false, cell: s => cell(s, n) })),
          ],
          rows: seams,
          row: s => ({ class: 'clickable', onclick: () => DSHMap.router.setParams({ key: s.key }) }),
        }))
    },
    /** "Copy context" for a service: its description for an LLM prompt. */
    contextButton(s) {
      if (!DSHMap.customize?.serviceContext) return null
      return DSHMap.ui.copyButton(() => DSHMap.customize.serviceContext(s), { label: t('d.context'), done: t('d.context.done') })
    },
    renderDetail(key) {
      const M = DSHMap.model
      const root = clear(this.detail)
      const s = key ? M.svcByKey.get(key) : null
      const page = h('div', { class: 'page' })
      root.appendChild(page)
      root.scrollTop = 0
      if (!s && key && M.csByKey.has(key)) { this.renderClient(page, M.csByKey.get(key)); return }
      if (!s) { this.renderOverview(page); return }
      const owner = M.pkgById.get(s.owner)
      const injectors = M.packages.filter(p => p.config?.inject?.includes(s.key) && p.id !== s.owner && !s.consumers.includes(p.id) && !s.implementations.includes(p.id)).map(p => p.id)

      page.append(
        h('div', { class: 'd-kicker' }, t('type.service'), h('span', { class: ['badge', MODE_BADGE[s.mode]] }, t(`svcmode.${s.mode}`))),
        h('div', { class: 'row wrap svc-head' }, h('h2', { class: 'd-title mono-title' }, `ctx.${s.key}`), this.contextButton(s)),
        s.api?.type ? h('div', { class: 'd-sub' }, `${t('svc.type')}: ${s.api.type}`) : null,
        h('p', { class: 'd-lead svc-lead' }, s.title),
        s.api?.description ? h('p', { class: 'd-text' }, s.api.description) : null,
        h('div', { class: 'mode-explain svc-explain' }, t(`svcmode.${s.mode}.d`)),
        s.note ? h('div', { class: 'd-section' }, h('h4', null, t('svc.note')), h('p', { class: 'd-text flush' }, s.note)) : null,
      )

      page.appendChild(h('div', { class: 'd-section' }, relDiagram({
        left: [
          { title: t('svc.owner'), kind: 'owner', items: owner ? [relNode(owner.id)] : [] },
          { title: t('svc.impls'), kind: 'provider', items: s.implementations.map(id => relNode(id)) },
        ],
        center: [h('b', null, `ctx.${s.key}`), h('span', null, s.api?.type ?? s.title)],
        right: [
          { title: t('svc.consumers'), kind: 'consumer', items: s.consumers.map(id => relNode(id)) },
          { title: t('svc.injectors'), kind: 'inject', items: injectors.slice(0, 30).map(id => relNode(id)) },
          { title: t('svc.companions'), kind: 'companion', items: s.companions.map(id => relNode(id, 'event gate')) },
        ],
      })))

      page.appendChild(this.activeTable(s))
      page.append(...DSHMap.ui.refSections('svc', s.key))

      if (s.api?.methods?.length) {
        page.appendChild(h('div', { class: 'd-section' },
          h('h4', null, t('svc.methods'), h('span', { class: 'count' }, s.api.methods.length), h('span', { class: 'faint tiny h4-note' }, t('svc.methods.src'))),
          h('div', { class: 'method-list' }, s.api.methods.map(m => h('details', { class: 'fold' },
            h('summary', { class: 'mono small' }, m.signature),
            h('div', { class: 'fold-body small' },
              h('p', { class: 'method-desc' }, m.description),
              m.parameters.length ? h('dl', { class: 'kv' }, m.parameters.flatMap(pa => [h('dt', { class: 'mono' }, pa.name), h('dd', null, pa.description)])) : null,
              m.returns ? h('div', null, h('b', null, '→ '), m.returns) : null,
              m.throws?.length ? h('div', { class: 'faint' }, `throws: ${m.throws.join('; ')}`) : null))))))
      }

      if (s.api?.code) {
        page.appendChild(h('div', { class: 'd-section' },
          h('h4', null, t('svc.api')),
          DSHMap.ui.code(s.api.code, 'typescript'),
          h('div', { class: 'row wrap small svc-api-links' },
            s.api.source ? h('span', null, svgIcon('file', ''), ' ', DSHMap.ui.sourceLink(s.api.source.replace(/^(\.\.\/)+/, ''))) : null,
            s.api.page ? h('a', { href: M.github(s.api.page), target: '_blank', rel: 'noopener' }, svgIcon('book', ''), ' ', s.api.page) : null,
            s.api.types ? h('span', { class: 'faint' }, `Types: ${s.api.types}`) : null)))
      }
    },
    /** Which package defines and provides the service in every profile. */
    activeTable(s) {
      const M = DSHMap.model
      const ui = DSHMap.ui
      const cell = (x, id) => {
        const chip = ui.pkgChip(id)
        const note = x.how === 'dep'
          ? t('svc.active.via', { via: x.via.map(v => M.pkgById.get(v)?.short ?? v).join(', ') })
          : t('svc.active.mount')
        return h('div', { class: 'row wrap svc-active-cell' }, chip,
          h('span', { class: ['badge', x.how === 'dep' ? 'ok' : null] }, note),
          x.state === 'cond' ? h('span', { class: 'badge warn' }, t('comp.state.cond')) : null)
      }
      return h('div', { class: 'd-section' },
        h('h4', null, t('svc.active')),
        h('p', { class: 'faint small svc-hint' }, t('svc.active.hint')),
        ui.table({
          sortable: false, card: true, label: t('svc.active'),
          columns: [
            { key: 'profile', label: t('type.profile'), className: 'mono nowrap', cell: n => h('button', { class: 'link-btn inherit', onclick: () => DSHMap.nav.openProfile(n) }, n) },
            { key: 'def', label: t('svc.active.def'), cell: n => { const a = s.active?.[n]; return a?.owner && s.owner ? cell(a.owner, s.owner) : h('span', { class: 'faint' }, '—') } },
            { key: 'prov', label: t('svc.active.providers'), cell: n => { const a = s.active?.[n]; return a?.providers.length ? h('div', { class: 'stack svc-providers' }, a.providers.map(x => cell(x, x.pkg))) : h('span', { class: 'faint small' }, s.implementations.length ? t('svc.active.none') : '—') } },
          ],
          rows: M.profileOrder,
        }))
    },
    renderOverview(page) {
      const M = DSHMap.model
      page.append(
        h('p', { class: 'muted ref-lead' }, i18n.pick(DSHMap.model.overview.concepts.find(c => c.term === 'capability seam')?.text)),
        h('div', { class: 'concepts svc-concepts' }, MODES.map(m => h('button', { class: 'card concept', onclick: () => { DSHMap.router.replace({ mode: m }); this.fb.sync(DSHMap.router.params); this.renderList(DSHMap.router.params.key) } },
          h('h4', null, h('span', { class: ['badge', MODE_BADGE[m]] }, t(`svcmode.${m}`)), h('span', { class: 'en' }, `${M.services.filter(s => s.mode === m).length}`)),
          h('p', null, t(`svcmode.${m}.d`))))))
      page.appendChild(this.seamTable())
      // Most connected services.
      const ranked = [...M.services].sort((a, b) => (b.consumers.length + b.implementations.length) - (a.consumers.length + a.implementations.length)).slice(0, 16)
      const max = ranked[0].consumers.length + ranked[0].implementations.length
      page.append(h('h2', { class: 'section-title' }, t('svc.mostConnected')),
        h('div', { class: 'card' }, h('div', { class: 'bar-list' }, ranked.map(s => h('button', { class: 'bar-item link', onclick: () => DSHMap.router.setParams({ key: s.key }) },
          h('span', { class: 'bl mono' }, `ctx.${s.key}`),
          h('span', { class: 'bt split' },
            h('i', { class: 'impl', style: `width:${(s.implementations.length / max * 100).toFixed(1)}%` }),
            h('i', { class: 'cons', style: `width:${(s.consumers.length / max * 100).toFixed(1)}%` })),
          h('span', { class: 'bv' }, `${s.implementations.length} / ${s.consumers.length}`))))),
        h('div', { class: 'row small muted svc-legend' },
          h('span', null, h('i', { class: 'mdot impl' }), ' ', t('svc.impls')),
          h('span', null, h('i', { class: 'mdot cons' }), ' ', t('svc.consumers'))))
    },
  }
})()
