/* DSH Map — model-facing tool catalog. */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, fmt, util, i18n } = DSHMap

  DSHMap.views.tools = {
    scroll: false,
    init(el) {
      const ui = DSHMap.ui
      this.fb = ui.filterBar({
        key: 'q', placeholder: t('tools.filter'), label: t('tools.filter'),
        onChange: () => { this.renderList(DSHMap.router.params.key); if (!DSHMap.router.params.key) this.renderDetail(null) },
      })
      const L = ui.layout.reference(el, { title: t('tools.title'), className: 'tools-view', head: [this.fb.el] })
      L.count.textContent = DSHMap.model.tools.length
      this.list = L.list
      this.detail = L.detail
      DSHMap.a11y.arrowNav(this.list, '.li')
    },
    show(params) { this.fb.sync(params); this.renderList(params.key); this.renderDetail(params.key) },
    update(params, prev) {
      const refilter = this.fb.sync(params)
      if (params.key !== prev.key) { this.renderList(params.key); this.renderDetail(params.key) } else if (refilter) { this.renderList(params.key); if (!params.key) this.renderDetail(null) }
    },
    filtered() {
      const q = this.fb.query()
      return DSHMap.model.tools.filter(tl => !q || `${tl.name} ${tl.pkgName} ${tl.description ?? ''}`.toLowerCase().includes(q))
    },
    renderList(selected) {
      const M = DSHMap.model
      const list = clear(this.list)
      const byPkg = new Map()
      for (const tl of this.filtered()) {
        if (!byPkg.has(tl.pkg)) byPkg.set(tl.pkg, [])
        byPkg.get(tl.pkg).push(tl)
      }
      const pkgs = [...byPkg.keys()].sort((a, b) => (M.pkgById.get(a)?.short ?? a) < (M.pkgById.get(b)?.short ?? b) ? -1 : 1)
      for (const pid of pkgs) {
        const p = M.pkgById.get(pid)
        list.appendChild(h('button', { class: 'li-group tool-pkg', onclick: () => DSHMap.nav.openPackage(pid) }, h('span', { class: 'tool-pkg-name' }, p?.short ?? pid), h('span', null, byPkg.get(pid).length)))
        for (const tl of byPkg.get(pid)) {
          const sel = tl.key === selected
          const nParams = Object.keys(tl.schema?.properties ?? {}).length
          const el = h('button', { class: ['li', sel ? 'is-selected' : null], ...DSHMap.ui.selAttrs(sel), onclick: () => DSHMap.router.setParams({ key: tl.key }) },
            h('span', { class: 'cdot sq', style: `background:${p ? M.colorOf(p) : 'var(--c-unknown)'}` }),
            h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, tl.name), h('div', { class: 'li-sub' }, util.firstSentence(stripMd(tl.description), 90))),
            h('div', { class: 'li-meta' }, h('span', { class: 'faint tiny' }, t('tools.params.short', { n: nParams }))))
          list.appendChild(el)
          if (sel) requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest' }))
        }
      }
      if (!pkgs.length) list.appendChild(DSHMap.ui.noMatches(() => this.fb.reset()))
    },
    renderDetail(key) {
      const M = DSHMap.model
      const root = clear(this.detail)
      root.scrollTop = 0
      const page = h('div', { class: 'page' })
      root.appendChild(page)
      const tl = key ? M.toolByKey.get(key) : null
      if (!tl) { this.renderGrid(page); return }
      const p = M.pkgById.get(tl.pkg)
      page.append(
        h('div', { class: 'd-kicker' }, t('type.tool'), p ? DSHMap.ui.pkgChip(p.id) : null),
        h('h2', { class: 'd-title mono-title' }, p?.icon ? h('img', { src: p.icon, alt: '' }) : null, tl.name),
        tl.description ? DSHMap.ui.markdown(tl.description, p?.dir) : null,
      )
      // where the tool is registered: profiles and Web agent presets
      const ctxs = M.profileOrder.flatMap(n => M.toolContexts(n).filter(x => x.preset || !M.toolContexts(n).some(y => y.preset)).map(x => ({ n, x, hit: x.tools.find(y => y.name === tl.name) })))
      const hits = ctxs.filter(c => c.hit)
      page.appendChild(h('div', { class: 'd-section' }, h('h4', null, t('tools.contexts'), h('span', { class: 'count' }, hits.length)),
        hits.length ? h('div', { class: 'profile-pills' }, ctxs.map(c => h(c.hit ? 'button' : 'span', { class: ['ppill', c.hit ? c.hit.state : 'off absent'], title: c.hit ? `row ${c.hit.row}` : '', onclick: c.hit ? () => DSHMap.router.go('usage', { tab: 'model', profile: c.n, preset: c.x.preset ?? undefined }) : null }, c.hit ? (c.hit.state === 'cond' ? '◐' : '●') : '○', c.x.preset ? `${c.n}·${c.x.preset}` : c.n)))
          : h('div', { class: 'faint small' }, t('tools.contexts.none')),
        M.usage.model.toolNotes[tl.name] ? h('p', { class: 'small muted tool-note' }, svgIcon('info', 'inline-icon'), i18n.pick(M.usage.model.toolNotes[tl.name])) : null))
      // parameters
      const props = tl.schema?.properties ?? {}
      const required = new Set(tl.schema?.required ?? [])
      if (Object.keys(props).length) {
        const rows = []
        const addRows = (obj, req, depth) => {
          for (const [name, def] of Object.entries(obj)) {
            rows.push(h('tr', { class: depth ? 'nested' : null, style: depth ? `--depth:${depth}` : null },
              h('td', { class: 'pname' }, depth ? `↳ ${name}` : name, req.has(name) ? h('span', { class: 'req' }, ` ${t('tools.required')}`) : null),
              h('td', { class: 'ptype' }, typeLabel(def)),
              h('td', null, def.description ? h('div', { class: 'small' }, def.description) : null, def.enum ? h('div', { class: 'chips' }, def.enum.map(v => h('span', { class: 'chip mono' }, JSON.stringify(v)))) : null, def.default !== undefined ? h('div', { class: 'faint tiny' }, `default: ${JSON.stringify(def.default)}`) : null)))
            const nested = def.type === 'object' ? def.properties : def.type === 'array' && def.items?.type === 'object' ? def.items.properties : null
            const nreq = new Set(def.type === 'object' ? def.required ?? [] : def.items?.required ?? [])
            if (nested && depth < 2) addRows(nested, nreq, depth + 1)
          }
        }
        addRows(props, required, 0)
        page.appendChild(h('div', { class: 'd-section' }, h('h4', null, t('tools.params'), h('span', { class: 'count' }, Object.keys(props).length)),
          h('table', { class: 'params' }, h('thead', null, h('tr', null, h('th', null, t('tools.col.name')), h('th', null, t('tools.col.type')), h('th', null, t('tools.col.desc')))), h('tbody', null, rows))))
      }
      // requires / writes
      if (tl.requires.length) page.appendChild(h('div', { class: 'd-section' }, h('h4', null, t('tools.requires')), h('div', { class: 'chips' }, tl.requires.map(r => linkify(r)))))
      if (tl.writes.length) page.appendChild(h('div', { class: 'd-section' }, h('h4', null, t('tools.writes')), h('div', { class: 'chips' }, tl.writes.map(r => linkify(r)))))
      if (tl.aliases.length) page.appendChild(h('div', { class: 'd-section' }, h('h4', null, t('tools.aliases')), h('div', { class: 'chips' }, tl.aliases.map(a => h('span', { class: 'chip mono' }, a)))))
      if (tl.note) page.appendChild(h('div', { class: 'd-section' }, h('h4', null, t('tools.note')), h('p', { class: 'd-text flush' }, tl.note)))
      if (tl.schema) page.appendChild(h('div', { class: 'd-section' }, h('details', { class: 'fold' }, h('summary', null, t('tools.schema')), h('div', { class: 'fold-body' }, DSHMap.ui.code(JSON.stringify(tl.schema, null, 2), 'json')))))
      if (tl.source) page.appendChild(h('div', { class: 'd-section small' }, 'Source: ', DSHMap.ui.sourceLink(tl.source.replace(/^(\.\.\/)+/, ''))))
    },
    renderGrid(page) {
      const M = DSHMap.model
      const tools = this.filtered()
      page.append(h('p', { class: 'muted ref-lead' }, t('tools.lead')))
      if (!tools.length) { page.appendChild(DSHMap.ui.noMatches(() => this.fb.reset())); return }
      page.appendChild(h('div', { class: 'tool-grid' }, tools.map(tl => {
        const p = M.pkgById.get(tl.pkg)
        return h('button', { class: 'tool-card', onclick: () => DSHMap.router.setParams({ key: tl.key }) },
          h('div', { class: 'row' }, h('span', { class: 'cdot sq', style: `background:${p ? M.colorOf(p) : 'var(--c-unknown)'}` }), h('b', null, tl.name)),
          h('p', null, util.firstSentence(stripMd(tl.description), 200)),
          h('div', { class: 'tc-foot' }, h('span', { class: 'mono' }, p?.short ?? tl.pkgName), h('span', { class: 'grow' }), h('span', null, i18n.tn('params', Object.keys(tl.schema?.properties ?? {}).length))))
      })))
    },
  }

  function stripMd(s) { return (s ?? '').replace(/`/g, '').replace(/\*\*/g, '') }

  function typeLabel(def) {
    if (!def) return ''
    if (def.enum && !def.type) return 'enum'
    if (Array.isArray(def.type)) return def.type.join(' | ')
    if (def.type === 'array') return `${typeLabel(def.items) || 'any'}[]`
    if (def.anyOf || def.oneOf) return (def.anyOf ?? def.oneOf).map(typeLabel).join(' | ')
    return def.type ?? 'any'
  }

  /** Turn "ctx.fs (execution time)" or "tool/call" into navigable chips. */
  function linkify(text) {
    const M = DSHMap.model
    const svc = /ctx\.([A-Za-z0-9_]+)/.exec(text)
    if (svc && M.svcByKey.has(svc[1])) {
      const rest = text.replace(svc[0], '').trim()
      return h('button', { class: 'chip link mono', title: text, onclick: () => DSHMap.nav.openService(svc[1]) }, `ctx.${svc[1]}`, rest ? h('span', { class: 'count' }, rest) : null)
    }
    const evName = /([a-z-]+\/[a-z-/]+)/.exec(text)?.[1]
    if (evName && M.seByName.has(evName)) return h('button', { class: 'chip link mono', title: text, onclick: () => DSHMap.nav.openSessionEvent(evName) }, text)
    if (evName && M.evByName.has(evName)) return h('button', { class: 'chip link mono', title: text, onclick: () => DSHMap.nav.openEvent(evName) }, text)
    return h('span', { class: 'chip' }, text)
  }
})()
