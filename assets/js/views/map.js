/* DSH Map — the package graph (Cytoscape.js). */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, fmt, util, i18n } = DSHMap

  // v3: size by dependents; migrate the previous default once.
  // Keep the web profile and hide packages no standard profile loads.
  const DEFAULTS = {
    v: 3,
    mode: 'groups',
    layout: 'force',
    edges: { peer: true, runtime: true, dev: false, optional: false, svc: false, evt: false },
    color: 'layer',
    size: 'dependents',
    profile: 'web',
    hideUnloaded: true,
    cutFocus: '',
    hiddenGroups: [],
    hiddenLayers: [],
    kinds: [],
    hideExp: false,
    hideTest: false,
    text: '',
    panel: true,
    depth: 1,
  }
  const saved = util.storage.get('map', {})
  if ((saved.v ?? 0) < 2) { delete saved.mode; delete saved.profile; saved.edges = { ...(saved.edges ?? {}), dev: false } }
  if ((saved.v ?? 0) < 3) delete saved.size
  const state = { ...DEFAULTS, ...saved, v: DEFAULTS.v, edges: { ...DEFAULTS.edges, ...(saved.edges ?? {}) } }
  /** Save the state as the next default and mirror it into the route. */
  const persist = () => { util.storage.set('map', state); writeUrl() }
  /** Animation length honouring prefers-reduced-motion. */
  const dur = ms => (DSHMap.a11y.reducedMotion() ? 0 : ms)

  const KIND_FILTERS = ['service', 'provider', 'tool', 'ui', 'bundle', 'command', 'app', 'library', 'experimental', 'test', 'vendor']
  const CUTS = ['layer', 'plane', 'shape', 'seam', 'lens', 'activity', 'age']
  // Role cuts and edge kinds name their CSS color token (app.css, 3.2).
  const SEAM_ROLES = [['definition', 'seam-definition'], ['provider', 'seam-provider'], ['consumer', 'seam-consumer'], ['none', 'role-none']]
  const LENS_ROLES = [['candidate', 'lens-candidate'], ['provider', 'lens-provider'], ['wrapper', 'lens-wrapper'], ['composition', 'lens-composition'], ['closure', 'lens-closure'], ['none', 'role-none']]
  const C = name => DSHMap.colors.get(name)
  const EDGE_COLORS = new Proxy({}, { get: (_, k) => C(`edge-${String(k)}`) })
  const EDGE_KINDS = ['peer', 'runtime', 'dev', 'optional', 'svc', 'evt']

  // ── readability (UI/UX roadmap 3.7) ────────────────────────────────────
  // Below LOD_ZOOM (and with nothing focused) the package graph draws one
  // aggregated link per pair of groups instead of package edges, and the
  // Groups overview draws only its backbone (links with MAJOR_LINKS+ package
  // dependencies, plus the strongest BACKBONE_PER_GROUP links of every group).
  // Package labels appear from PKG_LABEL_ZOOM; group labels scale to stay readable.
  const LOD_ZOOM = 1.1
  const PKG_LABEL_ZOOM = 0.75
  const MAJOR_LINKS = 6
  const BACKBONE_PER_GROUP = 2
  const aggWidth = n => Math.min(9, 0.8 + Math.log2(n + 1) * 1.2)
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  /** Zoom rounded to third-octave steps: label sizes change only between steps. */
  const zoomStep = z => 2 ** (Math.round(Math.log2(Math.max(z, 0.01)) * 3) / 3)
  /**
   * Show or hide elements, touching only those whose display changes (4.5):
   * a style bypass restyles the element even when the value is the same, and
   * the map has ~6000 of them. The last value is kept in the element's scratch.
   */
  const setDisplay = (eles, on) => {
    const v = on ? 'element' : 'none'
    eles.forEach(el => { if (el.scratch('_display') !== v) { el.scratch('_display', v); el.style('display', v) } })
  }
  /** Edges that are drawn or only held back by the level of detail (`.lod` has opacity 0, which Cytoscape counts as hidden). */
  const shown = edges => edges.filter(e => e.visible() || (e.hasClass('lod') && e.takesUpSpace() && e.source().visible() && e.target().visible()))

  // ── state in the route (UI/UX roadmap 2.2) ─────────────────────────────
  // `mode` is always written: it marks a route that carries the whole map
  // state, so a link reproduces the screen whatever the reader saved.
  // Other keys appear only when they differ from DEFAULTS. A route without
  // `mode` (the nav link, links from other views) keeps the current state.
  const EDGE_KEYS = Object.keys(DEFAULTS.edges)
  const HIDE_KEYS = [['unloaded', 'hideUnloaded'], ['exp', 'hideExp'], ['test', 'hideTest']]
  const URL_KEYS = ['mode', 'layout', 'cut', 'cf', 'size', 'profile', 'edges', 'hide', 'kinds', 'hg', 'hly', 'q', 'depth']
  const list = (arr, all) => (arr.length ? arr.join(',') : all ? 'none' : null)
  function toParams(s) {
    const out = Object.fromEntries(URL_KEYS.map(k => [k, null]))
    out.mode = s.mode
    if (s.layout !== DEFAULTS.layout) out.layout = s.layout
    if (s.color !== DEFAULTS.color) out.cut = s.color
    if (s.cutFocus) out.cf = s.cutFocus
    if (s.size !== DEFAULTS.size) out.size = s.size
    if (s.profile !== DEFAULTS.profile) out.profile = s.profile || 'any'
    const edges = EDGE_KEYS.filter(k => s.edges[k])
    if (edges.join() !== EDGE_KEYS.filter(k => DEFAULTS.edges[k]).join()) out.edges = list(edges, true)
    const hide = HIDE_KEYS.filter(([, f]) => s[f]).map(([k]) => k)
    if (hide.join() !== HIDE_KEYS.filter(([, f]) => DEFAULTS[f]).map(([k]) => k).join()) out.hide = list(hide, true)
    out.kinds = list(s.kinds)
    out.hg = list(s.hiddenGroups)
    out.hly = list(s.hiddenLayers)
    out.q = s.text.trim() || null
    if (s.depth !== DEFAULTS.depth) out.depth = String(s.depth)
    return out
  }
  /** Map state of a route that carries one (see toParams), validated against the model. */
  function fromParams(p) {
    const M = DSHMap.model
    const split = v => (v && v !== 'none' ? v.split(',').filter(Boolean) : [])
    const s = { ...DEFAULTS, edges: { ...DEFAULTS.edges }, panel: state.panel }
    if (['packages', 'groups'].includes(p.mode)) s.mode = p.mode
    if (['force', 'layers'].includes(p.layout)) s.layout = p.layout
    if (CUTS.includes(p.cut)) s.color = p.cut
    if (p.cf) s.cutFocus = p.cf
    if (['lines', 'dependents', 'commits'].includes(p.size)) s.size = p.size
    if (p.profile === 'any') s.profile = ''
    else if (M.profileByName.has(p.profile)) s.profile = p.profile
    if (p.edges) { const on = split(p.edges); for (const k of EDGE_KEYS) s.edges[k] = on.includes(k) }
    if (p.hide) { const on = split(p.hide); for (const [k, f] of HIDE_KEYS) s[f] = on.includes(k) }
    s.kinds = split(p.kinds).filter(k => KIND_FILTERS.includes(k))
    s.hiddenGroups = split(p.hg).filter(g => M.groupById.has(g))
    s.hiddenLayers = split(p.hly).filter(l => M.layers.some(x => x.id === l))
    s.text = p.q ?? ''
    if (p.depth === '2') s.depth = 2
    return s
  }
  const sameState = (a, b) => JSON.stringify(toParams(a)) === JSON.stringify(toParams(b))
  function writeUrl() {
    if (DSHMap.router.view !== 'map') return
    const want = toParams(state)
    const cur = DSHMap.router.params
    if (URL_KEYS.some(k => (want[k] ?? undefined) !== cur[k])) DSHMap.router.replace(want)
  }

  /**
   * Re-layout off the main thread (UI/UX roadmap 4.5). The worker is built
   * from source — layout.js's factory and d3-force wrapped as a function in
   * vendor/d3-force.worker.js — so it also runs from file:// pages. Without
   * workers the layout runs here, as before.
   */
  const layoutWorker = {
    worker: null,
    seq: 0,
    pending: new Map(),
    async start() {
      if (this.worker !== null) return this.worker
      try {
        await DSHMap.loadScript('vendor/d3-force.worker.js')
        const src = `(${self.DSHWorkerLibs.d3force.toString()})()\nconst layout = (${DSHMap.layout.factory.toString()})()\nonmessage = e => postMessage({ id: e.data.id, pos: layout.twoLevel(e.data.input, self.d3) })\n`
        const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
        this.worker = new Worker(url)
        setTimeout(() => URL.revokeObjectURL(url), 10000)
        this.worker.onmessage = e => { const fn = this.pending.get(e.data.id); this.pending.delete(e.data.id); fn?.(e.data.pos) }
        this.worker.onerror = e => { e.preventDefault?.(); this.fail() }
      } catch { this.worker = false /* no workers: lay out on the main thread */ }
      return this.worker
    },
    fail() {
      this.worker?.terminate?.()
      this.worker = false
      for (const fn of this.pending.values()) fn(null)
      this.pending.clear()
    },
    /** @returns {Promise<Map<string, {x, y}>>} */
    async twoLevel(input) {
      const local = () => DSHMap.layout.twoLevel(input, window.d3)
      const w = await this.start()
      if (!w) return local()
      const id = ++this.seq
      return new Promise(resolve => {
        this.pending.set(id, pos => resolve(pos ?? local()))
        w.postMessage({ id, input })
      })
    },
  }

  const view = DSHMap.views.map = {
    scroll: false,
    cy: null,
    focusRef: null,
    init(el) {
      this.el = el
      const M = DSHMap.model
      // On narrow screens the filter panel starts closed and overlays the graph.
      this.panelOpen = state.panel && window.innerWidth >= 860
      // The graph legend (3.7) starts as a toggle button on narrow screens.
      this.legendOpen = window.innerWidth > 860 && util.storage.get('mapLegend', true) !== false
      el.appendChild(h('div', { class: 'map-view' },
        this.side = h('div', { class: ['side', this.panelOpen ? null : 'collapsed'], id: 'map-side', role: 'region', 'aria-label': t('map.filters'), inert: this.panelOpen ? null : true }),
        this.wrap = h('div', { class: 'graph-wrap' },
          // Keyboard: arrows move to the nearest node in that direction, Enter opens it (map.kbd.help).
          this.graphEl = h('div', { class: 'graph', tabindex: '0', role: 'application', 'aria-label': t('a11y.graph'), 'aria-describedby': 'map-kbd-help map-status', onkeydown: e => this.onKey(e), onfocus: () => this.kbdEnter() }),
          h('p', { class: 'sr-only', id: 'map-kbd-help' }, t('map.kbd.help')),
          h('div', { class: 'graph-toolbar' },
            this.panelBtn = h('button', { class: 'icon-btn', title: t('map.panel'), 'aria-label': t('map.panel'), 'aria-expanded': String(this.panelOpen), 'aria-controls': 'map-side', onclick: () => this.togglePanel() }, svgIcon('sidebar')),
            this.listBtn = h('button', { class: 'icon-btn', title: t('map.asList'), 'aria-label': t('map.asList'), 'aria-pressed': 'false', onclick: () => this.toggleList() }, svgIcon('list'))),
          this.focusBar = h('div', { class: 'graph-focus-bar hidden' }),
          this.hint = h('div', { class: 'graph-hint' }, t('map.hint')),
          this.status = h('div', { class: 'graph-status', id: 'map-status' }),
          this.legend = h('div', { class: ['graph-legend', this.legendOpen ? null : 'collapsed'], role: 'region', 'aria-label': t('map.key') }),
          this.listEl = h('div', { class: 'graph-list hidden', role: 'region', 'aria-label': t('map.asList'), tabindex: '-1' }),
          h('div', { class: 'graph-zoom' },
            h('button', { class: 'icon-btn', title: t('map.zoomin'), 'aria-label': t('map.zoomin'), onclick: () => this.zoom(1.3) }, svgIcon('plus')),
            h('button', { class: 'icon-btn', title: t('map.zoomout'), 'aria-label': t('map.zoomout'), onclick: () => this.zoom(1 / 1.3) }, svgIcon('minus')),
            h('button', { class: 'icon-btn', title: t('map.fit'), 'aria-label': t('map.fit'), onclick: () => this.fit() }, svgIcon('fit')),
            this.relayoutBtn = h('button', { class: 'icon-btn', title: t('map.relayout'), 'aria-label': t('map.relayout'), onclick: () => this.relayout() }, svgIcon('shuffle')),
            h('button', { class: 'icon-btn', title: t('map.png'), 'aria-label': t('map.png'), onclick: () => this.exportPng() }, svgIcon('download'))))))
      setTimeout(() => this.hint.classList.add('hidden'), 9000)
      this.renderSide()
      this.offTheme = DSHMap.on('theme', () => { this.renderLegend(); if (this.cy) { this.cy.style(this.styles()); this.applyColors() } })
      this.offDrawer = DSHMap.on('drawer', ref => { if (DSHMap.router.view === 'map') this.applyFocus(ref) })
      this.ro = new ResizeObserver(() => { if (this.cy) { this.cy.resize(); this.maybeFit() } })
      this.ro.observe(this.graphEl)
      void M
    },
    dispose() {
      this.offTheme?.(); this.offDrawer?.(); this.ro?.disconnect()
      clearTimeout(this.dimTimer)
      this.cy?.destroy(); this.cy = null
    },
    show(params) {
      if ((params.d ?? null) !== this.focusRef) this.focusRef = null
      const fromUrl = this.takeUrl(params)
      this.takeHighlight(params)
      if (params.hl || fromUrl) this.renderSide()
      if (!this.cy) this.createGraph()
      else if (fromUrl) this.applyAll()
      else { if (params.hl) this.applyMode(false); this.applyVisibility() }
      writeUrl()
      requestAnimationFrame(() => {
        this.cy.resize()
        this.maybeFit()
        this.applyFocus(params.d ?? null, true)
        if (!params.d) this.fitHighlight()
      })
    },
    /** Fit the whole graph once, as soon as the container has a real size. */
    maybeFit() {
      if (this.didFit || !this.cy) return
      if (this.graphEl.clientWidth < 50 || this.graphEl.clientHeight < 50) return
      this.didFit = true
      this.cy.fit(this.cy.elements(':visible'), 30)
    },
    update(params, prev) {
      // The panel moved on: applying the route must not re-focus (and reveal) the old entity.
      if ((params.d ?? null) !== this.focusRef) this.focusRef = null
      // Back/Forward or a pasted link with another map state.
      if (this.takeUrl(params)) { this.renderSide(); this.applyAll() }
      if (params.hl !== prev?.hl) {
        this.takeHighlight(params)
        this.renderSide(); this.applyMode(false); this.applyVisibility()
        this.fitHighlight()
      }
      writeUrl()
      this.applyFocus(params.d ?? null)
    },
    /** Adopt the map state of the route; true when it changed anything. */
    takeUrl(params) {
      if (!params.mode) return false
      const next = fromParams(params)
      if (sameState(next, state)) return false
      Object.assign(state, next)
      util.storage.set('map', state)
      return true
    },
    /** Re-apply every encoding after a wholesale state change. */
    applyAll() {
      if (!this.cy) return
      this.applyLayout(false); this.applyMode(false); this.applyColors(); this.applySizes(); this.applyVisibility()
    },
    /** Read ?hl=<ids>&profile=<name> (tours, links): highlight a package set. */
    takeHighlight(params) {
      const M = DSHMap.model
      const ids = (params.hl ?? '').split(',').filter(id => M.pkgById.has(id))
      this.highlight = ids.length ? new Set(ids) : null
      if (!ids.length) return
      state.mode = 'packages'
      if (params.profile && M.profileByName.has(params.profile)) state.profile = params.profile
      for (const id of ids) {
        const p = M.pkgById.get(id)
        state.hiddenGroups = state.hiddenGroups.filter(g => g !== p.group)
        state.hiddenLayers = state.hiddenLayers.filter(l => l !== M.groupById.get(p.group).layer)
      }
      state.kinds = []
      state.cutFocus = ''
      persist()
    },
    fitHighlight() {
      if (!this.cy || !this.highlight) return
      const eles = this.cy.nodes('node.pkg').filter(n => this.highlight.has(n.id()))
      if (eles.length) setTimeout(() => this.fitTo(eles, 90), 350)
    },
    hide() { DSHMap.tooltip.hide() },
    /** Change map filters from other views. */
    setState(patch) {
      if (patch.cut) { patch = { ...patch, color: patch.cut, cutFocus: patch.cutFocus ?? '' }; delete patch.cut }
      Object.assign(state, patch)
      persist()
      if (this.cy) { this.renderSide(); this.applyMode(false); this.applyColors(); this.applyVisibility() }
    },

    // ── side panel ──────────────────────────────────────────────────────
    togglePanel() {
      this.panelOpen = !this.panelOpen
      if (window.innerWidth >= 860) { state.panel = this.panelOpen; persist() }
      this.side.classList.toggle('collapsed', !this.panelOpen)
      // A collapsed panel is off-screen: keep it out of the Tab order.
      this.side.inert = !this.panelOpen
      this.panelBtn.setAttribute('aria-expanded', String(this.panelOpen))
      setTimeout(() => this.cy?.resize(), 220)
    },
    renderSide() {
      const M = DSHMap.model
      const side = clear(this.side)
      const seg = (key, options, onChange, label) => h('div', { class: 'seg', 'aria-label': label }, options.map(([v, label]) =>
        h('button', { class: state[key] === v ? 'on' : null, onclick: () => { state[key] = v; persist(); this.renderSide(); onChange() } }, label)))

      side.append(
        h('h5', null, t('map.mode')),
        seg('mode', [['packages', t('map.mode.packages')], ['groups', t('map.mode.groups')]], () => this.applyMode(), t('map.mode')),
        h('h5', null, t('map.layout')),
        seg('layout', [['force', t('map.layout.force')], ['layers', t('map.layout.layers')]], () => this.applyLayout(true), t('map.layout')),
        h('h5', null, t('map.filter')),
        h('div', { class: 'input-wrap' }, svgIcon('search'),
          this.filterInput = h('input', {
            class: 'input', type: 'search', value: state.text, placeholder: t('map.filter.ph'), 'aria-label': t('map.filter'), 'aria-describedby': 'map-filter-help',
            oninput: util.debounce(e => { state.text = e.target.value; persist(); this.applyVisibility() }, 160),
            // Enter jumps to the first matching node in the graph.
            onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); state.text = e.target.value; this.applyVisibility(); this.kbdToMatch() } },
          })),
        h('p', { class: 'sr-only', id: 'map-filter-help' }, t('map.filter.help')),
      )

      // edges
      side.appendChild(h('h5', null, t('map.edges')))
      for (const k of EDGE_KINDS) {
        side.appendChild(h('label', { class: 'check' },
          h('input', { type: 'checkbox', checked: state.edges[k], onchange: e => { state.edges[k] = e.target.checked; persist(); this.applyVisibility(); this.renderLegend() } }),
          h('span', { class: ['swatch', `ek-${k}`, k === 'dev' || k === 'optional' ? 'dashed' : null] }),
          t(`edge.${k}`)))
      }

      // color & size
      side.append(
        h('h5', null, t('map.cut')),
        h('select', { class: 'input', 'aria-label': t('map.cut'), onchange: e => { state.color = e.target.value; state.cutFocus = ''; persist(); this.renderSide(); this.applyColors(); this.applyVisibility() } },
          CUTS.map(c => h('option', { value: c, selected: state.color === c }, t(`map.cut.${c}`)))),
        this.cutLegend(),
        h('h5', null, t('map.size')),
        seg('size', [['lines', t('map.size.lines')], ['dependents', t('map.size.dependents')], ['commits', t('map.size.commits')]], () => this.applySizes(), t('map.size')),
      )

      // profile
      const sel = h('select', { class: 'input', 'aria-label': t('map.profile'), onchange: e => { state.profile = e.target.value; persist(); this.renderSide(); this.applyVisibility() } },
        h('option', { value: '' }, t('map.profile.any')),
        M.profileOrder.map(p => h('option', { value: p, selected: state.profile === p }, `dsh --profile ${p}`)))
      side.append(h('h5', null, t('map.profile')), sel)
      side.appendChild(h('label', { class: 'check', title: t('map.hide.unloaded.d') }, h('input', { type: 'checkbox', checked: state.hideUnloaded, onchange: e => { state.hideUnloaded = e.target.checked; persist(); this.applyVisibility() } }), t('map.hide.unloaded', { n: M.packages.filter(p => !M.profileOrder.some(n => M.isActiveIn(p, n))).length })))
      const prof = state.profile && M.profileByName.get(state.profile)
      if (prof) {
        const shape = (cls) => h('i', { class: ['pres-key', cls] })
        side.append(h('div', { class: 'pres-legend' },
          h('div', null, shape('mount'), t('map.profile.legend.mount')),
          h('div', null, shape('dep'), t('map.profile.legend.dep')),
          h('div', null, shape('off'), t('map.profile.legend.off')),
          h('div', { class: 'faint tiny' }, t('map.profile.counts', { mounted: fmt.num(prof.mounted), loaded: fmt.num(prof.loaded) }))))
      }

      // kinds
      side.appendChild(h('h5', null, t('map.kinds'), h('button', { onclick: () => { state.kinds = []; persist(); this.renderSide(); this.applyVisibility() } }, t('map.reset'))))
      const kindWrap = h('div', { class: 'chips' })
      for (const k of KIND_FILTERS) {
        const on = state.kinds.includes(k)
        kindWrap.appendChild(h('button', {
          class: ['chip', 'link', on ? 'on' : null], 'aria-pressed': String(on),
          onclick: () => { state.kinds = on ? state.kinds.filter(x => x !== k) : [...state.kinds, k]; persist(); this.renderSide(); this.applyVisibility() },
        }, t(`kind.${k}`)))
      }
      side.append(kindWrap,
        h('label', { class: 'check check-gap' }, h('input', { type: 'checkbox', checked: state.hideExp, onchange: e => { state.hideExp = e.target.checked; persist(); this.applyVisibility() } }), t('map.hide.exp')),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: state.hideTest, onchange: e => { state.hideTest = e.target.checked; persist(); this.applyVisibility() } }), t('map.hide.test')))

      // Keep the sidebar and graph key consistent with package silhouettes.
      side.append(h('h5', null, t('map.shapes')), h('div', { class: 'shape-legend' },
        SHAPES.map(([id]) => h('div', null, shapeIcon(id), t(`map.shape.${id}`))),
        h('div', null, shapeIcon('owner'), t('map.shape.owner'))))

      // layers & groups legend
      side.appendChild(h('h5', { title: i18n.pick(M.vocab.layersNote) }, t('map.legend'), h('span', { class: 'faint h5-note' }, ` · ${t('interpretation')}`), h('button', { onclick: () => { state.hiddenGroups = []; state.hiddenLayers = []; persist(); this.renderSide(); this.applyVisibility() } }, t('show.all'))))
      for (const layer of M.layers) {
        const groups = M.groups.filter(g => g.layer === layer.id)
        if (!groups.length) continue
        const off = state.hiddenLayers.includes(layer.id)
        const count = groups.reduce((a, g) => a + g.packages.length, 0)
        const head = h('button', {
          class: ['legend-layer-head', off ? 'off' : null], title: i18n.pick(layer.blurb), 'aria-pressed': String(!off),
          onfocus: () => this.peekLayer(layer.id), onblur: () => this.peekLayer(null),
          onclick: () => { state.hiddenLayers = off ? state.hiddenLayers.filter(x => x !== layer.id) : [...state.hiddenLayers, layer.id]; persist(); this.renderSide(); this.applyVisibility() },
          onmouseenter: () => this.peekLayer(layer.id), onmouseleave: () => this.peekLayer(null),
        }, h('span', { class: 'dot', style: `--sw:${layer.color}` }), i18n.pick(layer.title), h('span', { class: 'count' }, count))
        const gl = h('div', { class: 'legend-groups' }, groups.map(g => {
          const goff = state.hiddenGroups.includes(g.id)
          return h('button', {
            class: ['g', goff ? 'off' : null], title: `${i18n.pick(g.title)} · ${g.packages.length}`, 'aria-pressed': String(!goff),
            onclick: e => {
              if (e.altKey || e.metaKey) { state.hiddenGroups = M.groups.map(x => x.id).filter(x => x !== g.id); state.hiddenLayers = [] }
              else state.hiddenGroups = goff ? state.hiddenGroups.filter(x => x !== g.id) : [...state.hiddenGroups, g.id]
              persist(); this.renderSide(); this.applyVisibility()
            },
            ondblclick: () => DSHMap.nav.openGroup(g.id),
          }, g.id)
        }))
        side.append(h('div', { class: 'legend-layer' }, head, gl))
      }
      side.appendChild(h('p', { class: 'faint tiny side-foot' }, t('map.groups.hint')))
      this.renderLegend()
    },

    // ── graph construction ──────────────────────────────────────────────
    createGraph() {
      const M = DSHMap.model
      const els = []
      for (const g of M.groups) {
        els.push({ group: 'nodes', data: { id: `g:${g.id}`, label: g.id, gid: g.id, color: M.groupColor(g.id) }, classes: 'grp' })
      }
      for (const p of M.packages) {
        const role = seamRole(p)
        const shape = role === 'definition' ? 'diamond' : role === 'provider' ? 'triangle' : p.kinds.includes('app') ? 'star' : p.kinds.includes('bundle') ? 'hexagon' : p.form ? 'ellipse' : 'round-rectangle'
        const cls = ['pkg']
        if (p.kinds.includes('experimental')) cls.push('exp')
        if (p.services.owns.length) cls.push('owner')
        if (p.form === 'service') cls.push('svcform')
        els.push({
          group: 'nodes',
          data: { id: p.id, parent: `g:${p.group}`, label: p.short, color: M.colorOf(p), size: p.size, shape, hiFs: 12 },
          position: p.pos ? { x: p.pos[0], y: p.pos[1] } : undefined,
          classes: cls.join(' '),
        })
      }
      M.edges.forEach((e, i) => els.push({ group: 'edges', data: { id: `d${i}`, source: e.s, target: e.t, type: e.type }, classes: `dep ${e.type}` }))
      M.svcEdges.forEach((e, i) => els.push({ group: 'edges', data: { id: `s${i}`, source: e.s, target: e.t, type: 'svc', key: e.key }, classes: 'svc' }))
      M.evtEdges.forEach((e, i) => els.push({ group: 'edges', data: { id: `v${i}`, source: e.s, target: e.t, type: 'evt', n: e.events.length }, classes: 'evt' }))
      // Group overview elements (mode = groups).
      for (const g of M.groups) {
        const st = M.groupStats.get(g.id)
        els.push({ group: 'nodes', data: { id: `go:${g.id}`, gid: g.id, label: `${g.id} · ${st.packages}`, color: M.groupColor(g.id), size: Math.round(Math.max(34, Math.min(150, 26 + Math.sqrt(st.srcLines) * 0.32))) }, classes: 'gov' })
      }
      // Backbone of the Groups overview: strong links plus the strongest links of every group.
      const backbone = new Set(M.groupEdges.filter(e => e.n >= MAJOR_LINKS))
      for (const g of M.groups) {
        M.groupEdges.filter(e => e.s === g.id || e.t === g.id).sort((a, b) => b.n - a.n).slice(0, BACKBONE_PER_GROUP).forEach(e => backbone.add(e))
      }
      M.groupEdges.forEach((e, i) => els.push({ group: 'edges', data: { id: `ge${i}`, source: `go:${e.s}`, target: `go:${e.t}`, n: e.n, w: aggWidth(e.n) }, classes: backbone.has(e) ? 'gedge' : 'gedge minor' }))
      // Aggregated links between group boxes for the zoomed-out package graph;
      // applyVisibility counts the visible package edges behind each one.
      const pairs = new Set()
      for (const e of M.edges) {
        const a = M.pkgById.get(e.s).group, b = M.pkgById.get(e.t).group
        if (a !== b) pairs.add(`${a}\u0000${b}`)
      }
      let pi = 0
      for (const k of pairs) {
        const [a, b] = k.split('\u0000')
        els.push({ group: 'edges', data: { id: `pe${pi++}`, source: `g:${a}`, target: `g:${b}`, n: 0, w: 1 }, classes: 'pgedge' })
      }

      const hasPositions = M.packages.every(p => p.pos)
      this.lodKey = null; this.labelZoom = undefined; this.dimmed = false
      this.cy = cytoscape({
        container: this.graphEl,
        elements: els,
        style: this.styles(),
        layout: { name: 'preset' },
        minZoom: 0.04,
        maxZoom: 5,
        boxSelectionEnabled: false,
        selectionType: 'single',
        pixelRatio: 'auto',
      })
      const cy = this.cy
      this.forcePositions = new Map(M.packages.map(p => [p.id, p.pos ? { x: p.pos[0], y: p.pos[1] } : null]))
      if (!hasPositions) this.runLayout(false, 20261019, true)

      cy.on('tap', 'node.pkg', e => DSHMap.nav.openPackage(e.target.id()))
      cy.on('tap', 'node.grp', e => DSHMap.nav.openGroup(e.target.data('gid')))
      cy.on('dbltap', 'node.grp', e => cy.animate({ fit: { eles: e.target, padding: 60 } }, { duration: dur(450) }))
      cy.on('tap', 'node.gov', e => DSHMap.nav.openGroup(e.target.data('gid')))
      cy.on('dbltap', 'node.gov', e => { state.mode = 'packages'; persist(); this.renderSide(); this.applyMode(); DSHMap.nav.showGroupOnMap(e.target.data('gid')) })
      cy.on('tap', e => { if (e.target === cy && DSHMap.drawer.isOpen) DSHMap.drawer.close() })
      cy.on('mouseover', 'node.pkg, node.gov, node.grp', e => this.hover(e))
      cy.on('mousemove', 'node', e => DSHMap.tooltip.move(e.originalEvent.clientX, e.originalEvent.clientY))
      cy.on('mouseout', 'node', () => this.unhover())
      cy.on('mouseover', 'edge', e => this.hoverEdge(e))
      cy.on('mouseout', 'edge', () => DSHMap.tooltip.hide())
      cy.on('viewport', () => DSHMap.tooltip.hide())
      // Level of detail and label sizes follow the zoom once it settles.
      cy.on('zoom', util.debounce(() => this.onZoomEnd(), 120))

      this.applyLayout(false)
      this.applyMode(false)
      this.applyColors()
      this.applySizes()
      this.applyVisibility()
    },
    onZoomEnd() {
      const cy = this.cy
      if (!cy) return
      this.applyLod()
      const step = zoomStep(cy.zoom())
      if (step !== this.labelZoom) { this.labelZoom = step; this.applyLabelZoom() }
    },
    /**
     * Group labels keep about 12px on screen at any zoom (3.7). Only the
     * group nodes (bypass) and the highlighted-label size of packages (data)
     * change: replacing the stylesheet would restyle all ~6000 elements (4.5).
     */
    applyLabelZoom() {
      const cy = this.cy
      if (!cy) return
      const z = this.labelZoom ?? 1
      const grpFs = clamp(12 / z, 15, 56), govFs = clamp(12 / z, 14, 52), hiFs = clamp(12 / z, 12, 32)
      cy.batch(() => {
        cy.nodes('.grp').style({ 'font-size': grpFs, 'text-outline-width': 2.5 * grpFs / 15 })
        cy.nodes('.gov').style({ 'font-size': govFs, 'text-outline-width': 2.2 * govFs / 14 })
        cy.nodes('.pkg').data('hiFs', hiFs)
      })
    },
    /** Level of detail (3.7): which edges the current zoom and focus draw. Only toggles classes. */
    applyLod() {
      const cy = this.cy
      if (!cy) return
      const overview = !this.focusRef && !this.highlight && cy.zoom() < LOD_ZOOM
      const neighbourhood = !this.focusRef && !this.highlight && !overview && cy.zoom() < 1.8
      const key = `${state.mode}:${overview}:${neighbourhood}`
      if (key === this.lodKey) return
      this.lodKey = key
      cy.batch(() => {
        cy.edges('.lod').removeClass('lod')
        if (state.mode === 'groups') { if (overview) cy.edges('.gedge.minor').addClass('lod') }
        else {
          cy.edges(overview ? '.dep' : '.pgedge').addClass('lod')
          if (overview) cy.edges('.pgedge.minor').addClass('lod')
          cy.edges('.dep').toggleClass('distant', neighbourhood)
        }
      })
    },

    styles() {
      const css = n => DSHMap.theme.css(n)
      const dark = DSHMap.theme.current === 'dark'
      const text = css('--text'), faint = css('--text-faint'), bg = css('--graph-bg')
      // Label sizes that follow the zoom are set by applyLabelZoom (bypass and data(hiFs)).
      const grpFs = 15, govFs = 14
      return [
        { selector: 'node', style: { 'label': 'data(label)', 'font-family': 'Inter, -apple-system, Segoe UI, sans-serif', 'color': text, 'text-outline-color': bg, 'text-outline-width': 2.2, 'font-size': 10, 'min-zoomed-font-size': 10 * PKG_LABEL_ZOOM, 'overlay-opacity': 0, 'transition-property': 'opacity', 'transition-duration': `${dur(150)}ms` } },
        { selector: 'node.pkg', style: { 'shape': 'data(shape)', 'width': 'data(size)', 'height': 'data(size)', 'background-color': 'data(color)', 'background-opacity': 0.92, 'border-width': 1.2, 'border-color': dark ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.9)', 'text-valign': 'bottom', 'text-margin-y': 3, 'z-index': 10 } },
        { selector: 'node.pkg.svcform', style: { 'border-width': 3, 'border-color': dark ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.25)' } },
        { selector: 'node.pkg.owner', style: { 'border-width': 3.4, 'border-color': text } },
        { selector: 'node.pkg.exp', style: { 'border-style': 'dashed', 'background-opacity': 0.6 } },
        { selector: 'node.grp', style: { 'shape': 'round-rectangle', 'background-color': 'data(color)', 'background-opacity': dark ? 0.07 : 0.06, 'border-width': 1.2, 'border-color': 'data(color)', 'border-opacity': 0.45, 'padding': 14, 'label': 'data(label)', 'text-valign': 'top', 'text-halign': 'center', 'text-margin-y': -4, 'font-size': grpFs, 'font-weight': 700, 'color': 'data(color)', 'text-outline-width': 2.5 * grpFs / 15, 'min-zoomed-font-size': 6, 'z-index': 1, 'corner-radius': 14 } },
        { selector: 'node.gov', style: { 'shape': 'round-rectangle', 'width': 'data(size)', 'height': 'data(size)', 'background-color': 'data(color)', 'background-opacity': 0.85, 'label': 'data(label)', 'text-valign': 'bottom', 'text-halign': 'center', 'text-margin-y': 5, 'font-size': govFs, 'text-outline-width': 2.2 * govFs / 14, 'font-weight': 700, 'border-width': 2, 'border-color': dark ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.12)', 'corner-radius': 12, 'min-zoomed-font-size': 6 } },
        { selector: 'node.layer-label', style: { 'shape': 'rectangle', 'width': 1, 'height': 1, 'background-opacity': 0, 'label': 'data(label)', 'font-size': 56, 'font-weight': 800, 'color': 'data(color)', 'text-halign': 'right', 'text-valign': 'center', 'text-outline-width': 0, 'events': 'no', 'min-zoomed-font-size': 4 } },
        { selector: 'edge', style: { 'width': 1, 'line-color': EDGE_COLORS.runtime, 'curve-style': 'bezier', 'control-point-step-size': 32, 'target-arrow-shape': 'triangle', 'target-arrow-color': EDGE_COLORS.runtime, 'arrow-scale': 0.65, 'opacity': dark ? 0.16 : 0.22, 'z-index': 2 } },
        { selector: 'edge.peer', style: { 'width': 1.15 } },
        { selector: 'edge.dev', style: { 'line-style': 'dashed', 'line-dash-pattern': [4, 3], 'opacity': dark ? 0.1 : 0.14 } },
        { selector: 'edge.optional', style: { 'line-color': EDGE_COLORS.optional, 'target-arrow-color': EDGE_COLORS.optional, 'line-style': 'dotted' } },
        { selector: 'edge.svc', style: { 'line-color': EDGE_COLORS.svc, 'target-arrow-color': EDGE_COLORS.svc, 'width': 1.4, 'line-style': 'dashed', 'line-dash-pattern': [6, 3], 'curve-style': 'bezier', 'control-point-step-size': 16, 'opacity': dark ? 0.42 : 0.5 } },
        { selector: 'edge.evt', style: { 'line-color': EDGE_COLORS.evt, 'target-arrow-color': EDGE_COLORS.evt, 'width': 'mapData(n, 1, 12, 1, 3.5)', 'curve-style': 'bezier', 'control-point-step-size': 16, 'opacity': dark ? 0.42 : 0.5 } },
        // aggregated links (3.7): width and opacity grow with the number of package dependencies
        { selector: 'edge.gedge, edge.pgedge', style: { 'width': 'data(w)', 'line-color': faint, 'target-arrow-color': faint, 'opacity': dark ? 'mapData(n, 1, 40, 0.22, 0.6)' : 'mapData(n, 1, 40, 0.26, 0.7)', 'curve-style': 'bezier', 'arrow-scale': 0.9 } },
        { selector: 'edge.distant.cross', style: { 'opacity': 0.035, 'events': 'no' } },
        // focus states
        { selector: '.faded', style: { 'opacity': dark ? 0.1 : 0.13 } },
        { selector: 'edge.faded', style: { 'opacity': 0, 'events': 'no' } },
        { selector: '.dimprof', style: { 'opacity': dark ? 0.12 : 0.15 } },
        { selector: 'node.pkg.dimcut', style: { 'opacity': dark ? 0.1 : 0.13 } },
        { selector: 'edge.dimcut', style: { 'opacity': dark ? 0.03 : 0.05 } },
        // hover (3.7): everything but the hovered node and its neighbours fades
        { selector: 'node.hover-dim', style: { 'opacity': dark ? 0.16 : 0.2 } },
        { selector: 'edge.hover-dim', style: { 'opacity': 0.015, 'events': 'no' } },
        // level of detail (3.7): edges kept out of the current zoom level
        { selector: 'edge.lod', style: { 'opacity': 0, 'events': 'no' } },
        { selector: 'node.pkg.profdep', style: { 'border-style': 'dashed', 'border-width': 2.6, 'border-color': css('--ok'), 'background-opacity': 0.55 } },
        { selector: 'node.focus', style: { 'border-width': 4, 'border-color': css('--accent'), 'z-index': 30, 'font-size': 13, 'font-weight': 700, 'opacity': 1 } },
        { selector: 'node.nb-out', style: { 'opacity': 1, 'border-width': 3, 'border-color': css('--accent'), 'z-index': 25 } },
        { selector: 'node.nb-in', style: { 'opacity': 1, 'border-width': 3, 'border-color': css('--orange'), 'z-index': 25 } },
        { selector: 'node.nb-out.nb-in', style: { 'border-color': css('--pink') } },
        { selector: 'node.nb2', style: { 'opacity': 0.85, 'z-index': 20 } },
        { selector: 'edge.e-out', style: { 'events': 'yes', 'opacity': 0.95, 'width': 2, 'line-color': css('--accent'), 'target-arrow-color': css('--accent'), 'z-index': 40, 'arrow-scale': 0.9 } },
        { selector: 'edge.e-in', style: { 'events': 'yes', 'opacity': 0.95, 'width': 2, 'line-color': css('--orange'), 'target-arrow-color': css('--orange'), 'z-index': 40, 'arrow-scale': 0.9 } },
        { selector: 'edge.e-2', style: { 'events': 'yes', 'opacity': 0.4, 'width': 1.2, 'z-index': 35 } },
        { selector: 'node.grp.gfocus', style: { 'border-width': 3, 'border-opacity': 1, 'background-opacity': 0.14 } },
        { selector: 'node.match', style: { 'border-width': 4, 'border-color': css('--warn'), 'opacity': 1, 'font-size': 12, 'font-weight': 700, 'z-index': 28 } },
        { selector: 'node.hover', style: { 'border-width': 3, 'border-color': text } },
        { selector: 'edge.hover', style: { 'events': 'yes', 'opacity': 0.85, 'width': 1.8, 'z-index': 39 } },
        { selector: 'edge.hover-out', style: { 'line-color': css('--accent'), 'target-arrow-color': css('--accent') } },
        { selector: 'edge.hover-in', style: { 'line-color': css('--orange'), 'target-arrow-color': css('--orange') } },
        // aggregated links keep their strength-encoding width when highlighted
        { selector: 'edge.gedge.hover, edge.gedge.e-out', style: { 'width': 'data(w)' } },
        { selector: 'node.peek', style: { 'opacity': 1 } },
        // labels of the nodes in play show at any zoom
        { selector: 'node.pkg.focus, node.pkg.match, node.pkg.hover, node.pkg.kbd', style: { 'font-size': 'data(hiFs)', 'min-zoomed-font-size': 0 } },
        // keyboard cursor (1.7): drawn on top of every other state
        { selector: 'node.kbd', style: { 'overlay-color': css('--focus'), 'overlay-opacity': 0.28, 'overlay-padding': 7, 'overlay-shape': 'round-rectangle', 'opacity': 1, 'z-index': 50 } },
      ]
    },

    // ── modes and layouts ───────────────────────────────────────────────
    applyMode(fit = true) {
      const cy = this.cy
      if (!cy) return
      const groups = state.mode === 'groups'
      cy.batch(() => {
        if (groups) this.placeGroupNodes()
        setDisplay(cy.nodes('.gov'), groups)
        setDisplay(cy.edges('.gedge'), groups)
      })
      this.applyVisibility()
      if (fit) cy.animate({ fit: { eles: cy.elements(':visible'), padding: 40 } }, { duration: dur(400) })
    },
    /** Put every group overview node at the centre of its packages in the current layout. */
    placeGroupNodes() {
      const cy = this.cy
      const M = DSHMap.model
      const centers = DSHMap.layout.groupCenters(M.packages.map(p => ({ id: p.id, group: p.group, size: packageSize(p) })), this.positions ?? this.forcePositions)
      for (const [gid, c] of centers) cy.$id(`go:${gid}`).position(c)
    },
    applyLayout(animate) {
      const cy = this.cy
      if (!cy) return
      cy.remove('node.layer-label')
      let positions
      if (state.layout === 'layers') {
        const { pos, labels } = layeredPositions()
        positions = pos
        cy.add(labels.map(l => ({ group: 'nodes', data: { id: `ll:${l.layer.id}`, label: i18n.pick(l.layer.title), color: l.layer.color }, position: { x: l.x, y: l.y }, classes: 'layer-label' })))
      } else {
        positions = DSHMap.layout.separate(layoutNodes(), this.forcePositions)
      }
      this.positions = positions
      const nodes = cy.nodes('.pkg')
      if (animate) {
        nodes.forEach(n => { const p = positions.get(n.id()); if (p) n.animate({ position: p }, { duration: dur(650), easing: 'ease-in-out-cubic' }) })
        if (state.mode === 'groups') {
          const centers = DSHMap.layout.groupCenters(DSHMap.model.packages.map(p => ({ id: p.id, group: p.group, size: packageSize(p) })), positions)
          for (const [gid, c] of centers) cy.$id(`go:${gid}`).animate({ position: c }, { duration: dur(650), easing: 'ease-in-out-cubic' })
        }
        setTimeout(() => cy.animate({ fit: { eles: cy.elements(':visible'), padding: 40 } }, { duration: dur(400) }), 680)
      } else {
        cy.batch(() => {
          nodes.forEach(n => { const p = positions.get(n.id()); if (p) n.position(p) })
          if (state.mode === 'groups') this.placeGroupNodes()
        })
      }
      setDisplay(cy.nodes('.layer-label'), state.mode !== 'groups')
    },
    /**
     * Re-run the clustered layout (new seed unless initial). The initial
     * layout of a build without positions runs synchronously; a re-layout
     * runs in the layout worker while the graph stays interactive.
     */
    runLayout(animate = true, seed, sync = false) {
      const M = DSHMap.model
      if (state.layout !== 'force') { state.layout = 'force'; persist(); this.renderSide() }
      const nodes = M.packages.map(p => ({ id: p.id, group: p.group, size: packageSize(p) }))
      const edges = M.edges.filter(e => e.type === 'peer' || e.type === 'runtime').map(e => ({ source: e.s, target: e.t }))
      const input = { nodes, edges, groups: M.groups.map(g => ({ id: g.id, layer: g.layer })), layerOrder: M.layers.map(l => l.id), seed: seed ?? Math.floor(Math.random() * 1e9) }
      if (sync) {
        this.forcePositions = DSHMap.layout.twoLevel(input, window.d3)
        this.applyLayout(animate)
        return
      }
      const run = this.layoutRun = (this.layoutRun ?? 0) + 1
      this.relayoutBtn?.setAttribute('aria-busy', 'true')
      this.relayoutBtn?.classList.add('busy')
      layoutWorker.twoLevel(input).then(pos => {
        if (run !== this.layoutRun || !this.cy) return
        this.relayoutBtn?.removeAttribute('aria-busy')
        this.relayoutBtn?.classList.remove('busy')
        this.forcePositions = pos
        if (state.layout === 'force') this.applyLayout(animate)
      })
    },
    relayout() {
      if (state.mode === 'groups') { state.mode = 'packages'; persist(); this.renderSide(); this.applyMode(false) }
      this.runLayout(true)
    },

    // ── visual encodings ────────────────────────────────────────────────
    applyColors() {
      const M = DSHMap.model
      const cy = this.cy
      if (!cy) return
      let colorOf
      if (state.color === 'activity') {
        const max = Math.max(...M.packages.map(p => p.git?.commits ?? 0))
        const scale = d3.scaleSequentialLog(d3.interpolateRgbBasis(DSHMap.colors.ramp('heat'))).domain([1, Math.max(2, max)])
        colorOf = p => scale(Math.max(1, p.git?.commits ?? 1))
      } else if (state.color === 'age') {
        const firsts = M.packages.map(p => p.git?.first).filter(Boolean).map(d => +new Date(d))
        const scale = d3.scaleSequential(d3.interpolateRgbBasis(DSHMap.colors.ramp('age'))).domain([Math.min(...firsts), Math.max(...firsts)])
        colorOf = p => p.git?.first ? scale(+new Date(p.git.first)) : C('c-unknown')
      } else if (state.color === 'plane') colorOf = p => M.planeById.get(p.plane)?.color ?? C('c-unknown')
      else if (state.color === 'shape') colorOf = p => M.shapeById.get(p.shape)?.color ?? C('c-unknown')
      else if (state.color === 'seam') colorOf = p => C(SEAM_ROLES.find(r => r[0] === seamRole(p))[1])
      else if (state.color === 'lens') colorOf = p => C(LENS_ROLES.find(r => r[0] === lensRole(p))[1])
      else colorOf = p => M.colorOf(p)
      cy.batch(() => M.packages.forEach(p => cy.$id(p.id).data('color', colorOf(p))))
    },
    /** Value of the current cut for a package (null for continuous scales). */
    cutValue(p) {
      if (state.color === 'layer') return DSHMap.model.groupById.get(p.group)?.layer
      if (state.color === 'plane') return p.plane
      if (state.color === 'shape') return p.shape
      if (state.color === 'seam') return seamRole(p)
      if (state.color === 'lens') return lensRole(p)
      return null
    },
    /** Legend of the current cut; clicking an entry focuses its packages. */
    /** Entries of a categorical cut as [id, color, label, about]; null for layers and continuous cuts. */
    cutItems() {
      const M = DSHMap.model
      if (state.color === 'plane') return M.vocab.planes.map(x => [x.id, x.color, i18n.pick(x.title), i18n.pick(x.blurb)])
      if (state.color === 'shape') return M.vocab.shapes.map(x => [x.id, x.color, i18n.pick(x.title), i18n.pick(x.blurb)])
      if (state.color === 'seam') return SEAM_ROLES.map(([id, c]) => [id, `var(--${c})`, t(`map.seam.${id}`), t(`map.seam.${id}.d`)])
      if (state.color === 'lens') return LENS_ROLES.map(([id, c]) => [id, `var(--${c})`, id === 'provider' || id === 'none' ? t(`map.lens.${id}`) : t(`lens.role.${id}`), id === 'provider' || id === 'none' ? '' : t(`lens.role.${id}.d`)])
      return null
    },
    cutLegend() {
      const M = DSHMap.model
      const items = this.cutItems()
      if (!items) return state.color === 'layer' ? h('div', { class: 'faint tiny cut-note' }, i18n.pick(M.vocab.layersNote)) : null
      const count = id => M.packages.filter(p => this.cutValue(p) === id).length
      return h('div', { class: 'cut-legend' },
        items.map(([id, color, label, about]) => h('div', {
          class: ['cut-item', state.cutFocus === id ? 'on' : null, state.cutFocus && state.cutFocus !== id ? 'off' : null], title: about,
          onclick: () => { state.cutFocus = state.cutFocus === id ? '' : id; persist(); this.renderSide(); this.applyVisibility() },
        }, h('span', { class: 'dot', style: `--sw:${color}` }), h('span', { class: 'grow' }, label), h('span', { class: 'count' }, count(id)))),
        state.color === 'lens' ? h('a', { class: 'tiny', onclick: () => DSHMap.nav.openRule('definitions-not-providers') }, t('map.lens.rule')) : null)
    },
    // ── graph legend (3.7): always over the graph, collapsible ─────────────
    toggleLegend() {
      this.legendOpen = !this.legendOpen
      if (window.innerWidth > 860) util.storage.set('mapLegend', this.legendOpen)
      this.renderLegend()
    },
    renderLegend() {
      const el = this.legend
      if (!el) return
      const M = DSHMap.model
      const groups = state.mode === 'groups'
      el.classList.toggle('collapsed', !this.legendOpen)
      const item = (mark, label, title) => h('li', { title: title || null }, mark, h('span', null, label))
      const dot = color => h('span', { class: 'gl-dot', style: `--sw:${color}`, 'aria-hidden': 'true' })
      const line = (cls, extra) => h('span', { class: ['gl-line', cls, extra], 'aria-hidden': 'true' })

      // colors: layers in Groups mode (group nodes are always layer-colored), else the current cut
      const cut = groups ? 'layer' : state.color
      let colors
      if (cut === 'activity' || cut === 'age') {
        const name = cut === 'activity' ? 'heat' : 'age'
        const steps = DSHMap.colors.ramp(name).map((_, i) => `var(--ramp-${name}-${i + 1})`)
        colors = h('div', { class: 'gl-ramp' },
          h('span', { class: 'gl-ramp-bar', style: `--ramp:linear-gradient(90deg, ${steps.join(', ')})`, 'aria-hidden': 'true' }),
          h('span', { class: 'gl-ramp-ends' }, h('span', null, t(`map.key.${cut}.lo`)), h('span', null, t(`map.key.${cut}.hi`))))
      } else {
        const items = cut === 'layer'
          ? M.layers.filter(l => M.groups.some(g => g.layer === l.id)).map(l => [l.id, l.color, i18n.pick(l.title), i18n.pick(l.blurb)])
          : this.cutItems() ?? []
        colors = h('ul', { class: 'gl-list' }, items.map(([id, color, label, about]) =>
          h('li', { class: !groups && state.cutFocus && state.cutFocus !== id ? 'off' : null, title: about || null }, dot(color), h('span', null, label))))
      }

      // edges: aggregated links, plus the enabled package edge kinds
      const edges = groups
        ? [item(line('gl-agg'), t('map.key.agg')), h('li', { class: 'gl-note' }, t('map.key.minor'))]
        : [...EDGE_KINDS.filter(k => state.edges[k]).map(k => item(line(`ek-${k}`, k === 'dev' || k === 'svc' ? 'dashed' : k === 'optional' ? 'dotted' : null), t(`edge.${k}`))),
          item(line('gl-agg'), t('map.key.agg')), h('li', { class: 'gl-note' }, t('map.key.zoom'))]

      clear(el).append(
        h('button', { class: 'gl-toggle', 'aria-expanded': String(this.legendOpen), 'aria-controls': 'map-key', onclick: () => this.toggleLegend() },
          svgIcon('layers'), h('span', null, t('map.key')), svgIcon('chevron', 'caret')),
        h('div', { class: 'gl-body', id: 'map-key', hidden: this.legendOpen ? null : true },
          !groups ? h('ul', { class: 'gl-list gl-shapes' }, SHAPES.map(([id]) => item(shapeIcon(id), t(`map.shape.${id}`)))) : null,
          h('details', { class: 'gl-details', open: groups ? true : null },
            h('summary', null, t('map.key.details')),
            h('div', { class: 'gl-title' }, t(`map.cut.${cut}`)), colors,
            h('div', { class: 'gl-title' }, t('map.edges')), h('ul', { class: 'gl-list' }, edges))))
    },
    applySizes() {
      const M = DSHMap.model
      const cy = this.cy
      if (!cy) return
      cy.batch(() => M.packages.forEach(p => cy.$id(p.id).data('size', packageSize(p))))
      this.applyLayout(false)
    },
    isVisible(p) {
      const M = DSHMap.model
      const g = M.groupById.get(p.group)
      if (state.hiddenGroups.includes(p.group) || state.hiddenLayers.includes(g.layer)) return false
      if (state.hideExp && p.kinds.includes('experimental')) return false
      if (state.hideTest && p.kinds.includes('test')) return false
      if (state.hideUnloaded && !this.highlight?.has(p.id) && !M.profileOrder.some(n => M.isActiveIn(p, n))) return false
      if (state.kinds.length) {
        const ks = new Set(p.kinds)
        if (M.isLibrary(p)) ks.add('library')
        if (!state.kinds.some(k => ks.has(k))) return false
      }
      return true
    },
    applyVisibility() {
      const M = DSHMap.model
      const cy = this.cy
      if (!cy) return
      const pkgMode = state.mode === 'packages'
      const vis = new Set()
      const q = state.text.trim().toLowerCase()
      // Counted here for the status line: `:visible` queries cost ~100 ms on this graph (4.5).
      const govShown = new Set()
      let shownEdges = 0
      cy.batch(() => {
        for (const p of M.packages) {
          const n = cy.$id(p.id)
          const show = pkgMode && this.isVisible(p)
          if (show) vis.add(p.id)
          setDisplay(n, show)
          const pres = state.profile ? M.presence(p, state.profile) : null
          n.toggleClass('dimprof', !!state.profile && !M.isActiveIn(p, state.profile))
          n.toggleClass('profdep', pres?.state === 'dep')
          n.toggleClass('match', (!!q && (p.short.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))) || !!this.highlight?.has(p.id))
          n.toggleClass('dimcut', (!!state.cutFocus && this.cutValue(p) !== state.cutFocus) || (!!this.highlight && !this.highlight.has(p.id)))
        }
        for (const g of M.groups) {
          const any = g.packages.some(id => vis.has(id))
          setDisplay(cy.$id(`g:${g.id}`), pkgMode && any)
          const gl = M.groupById.get(g.id)
          const gov = !pkgMode && !state.hiddenGroups.includes(g.id) && !state.hiddenLayers.includes(gl.layer)
          if (gov) govShown.add(`go:${g.id}`)
          setDisplay(cy.$id(`go:${g.id}`), gov)
        }
        if (!pkgMode) cy.edges('.gedge').forEach(e => { if (govShown.has(e.data('source')) && govShown.has(e.data('target'))) shownEdges++ })
        const agg = new Map() // visible package edges per pair of groups
        cy.edges('.dep, .svc, .evt').forEach(e => {
          const type = e.data('type')
          const show = pkgMode && state.edges[type] && vis.has(e.data('source')) && vis.has(e.data('target'))
          if (show) shownEdges++
          setDisplay(e, show)
          const hl = this.highlight
          e.toggleClass('dimcut', !!hl && !(hl.has(e.data('source')) && hl.has(e.data('target'))))
          if (e.hasClass('dep')) e.toggleClass('cross', M.pkgById.get(e.data('source')).group !== M.pkgById.get(e.data('target')).group)
          if (show && e.hasClass('dep')) {
            const k = `g:${M.pkgById.get(e.data('source')).group}\u0000g:${M.pkgById.get(e.data('target')).group}`
            agg.set(k, (agg.get(k) ?? 0) + 1)
          }
        })
        cy.edges('.pgedge').forEach(e => {
          const n = agg.get(`${e.data('source')}\u0000${e.data('target')}`) ?? 0
          if (e.data('n') !== n) e.data({ n, w: aggWidth(n) })
          setDisplay(e, !!n)
          e.toggleClass('dimcut', !!this.highlight)
        })
        // Keep only the two strongest visible aggregate links per group at overview scale.
        const backbone = cy.collection()
        cy.nodes('.grp').forEach(g => {
          g.connectedEdges('.pgedge').filter(e => e.data('n') > 0)
            .sort((a, b) => b.data('n') - a.data('n')).slice(0, BACKBONE_PER_GROUP)
            .forEach(e => backbone.merge(e))
        })
        cy.edges('.pgedge').addClass('minor')
        backbone.removeClass('minor')
        this.lodKey = null
        setDisplay(cy.nodes('.layer-label'), pkgMode)
      })
      if (q) {
        const matches = cy.nodes('node.pkg.match:visible')
        if (matches.length && matches.length < 40) cy.animate({ fit: { eles: matches, padding: 120 } }, { duration: dur(350) })
      }
      this.applyLod()
      this.updateStatus(pkgMode ? vis.size : govShown.size, shownEdges)
      if (this.focusRef) this.applyFocus(this.focusRef, false, true)
      this.renderList()
    },
    updateStatus(nodes, edges) {
      this.status.textContent = t('map.status', { nodes: fmt.num(nodes), edges: fmt.num(edges) })
    },
    peekLayer(layerId) {
      const cy = this.cy
      if (!cy || this.focusRef) return
      cy.batch(() => {
        cy.elements().removeClass('faded peek')
        if (!layerId) return
        const M = DSHMap.model
        cy.nodes('node.pkg, node.grp, node.gov').forEach(n => {
          const gid = n.data('gid') ?? M.pkgById.get(n.id())?.group
          const lid = M.groupById.get(gid)?.layer
          n.toggleClass('faded', lid !== layerId)
        })
        cy.edges().addClass('faded')
      })
    },

    // ── focus / hover ───────────────────────────────────────────────────
    applyFocus(ref, initial = false, silent = false) {
      const cy = this.cy
      if (!cy) return
      this.focusRef = ref
      clearTimeout(this.dimTimer); this.dimmed = false
      cy.batch(() => cy.elements().removeClass('faded focus nb-out nb-in nb2 e-out e-in e-2 gfocus hover hover-dim hover-out hover-in'))
      this.applyLod()
      if (!ref) { this.focusBar.classList.add('hidden'); return }
      const [type, ...rest] = ref.split(':')
      const id = rest.join(':')
      if (type === 'pkg') this.focusPackage(id, !silent)
      else if (type === 'group') this.focusGroup(id, !silent)
      else this.focusBar.classList.add('hidden')
      void initial
    },
    focusPackage(id, move) {
      const cy = this.cy
      const node = cy.$id(id)
      if (!node.length) return
      if (state.mode === 'groups') { state.mode = 'packages'; persist(); this.renderSide(); this.applyMode(false) }
      if (node.style('display') === 'none') {
        // Reveal a filtered-out package instead of silently ignoring it
        // (applyVisibility re-focuses it; once is enough if it stays hidden).
        if (this.revealing) return
        const M = DSHMap.model
        const p = M.pkgById.get(id)
        state.hiddenGroups = state.hiddenGroups.filter(g => g !== p.group)
        state.hiddenLayers = state.hiddenLayers.filter(l => l !== M.groupById.get(p.group).layer)
        state.kinds = []
        if (p.kinds.includes('experimental')) state.hideExp = false
        if (p.kinds.includes('test')) state.hideTest = false
        if (!M.profileOrder.some(n => M.isActiveIn(p, n))) state.hideUnloaded = false
        this.revealing = true
        try { persist(); this.renderSide(); this.applyVisibility() } finally { this.revealing = false }
        return
      }
      const outE = node.outgoers('edge:visible'), inE = node.incomers('edge:visible')
      const outN = outE.targets(), inN = inE.sources()
      let second = cy.collection()
      if (state.depth > 1) {
        const ring = outN.union(inN)
        const e2 = ring.connectedEdges(':visible').difference(outE).difference(inE)
        second = e2.connectedNodes().difference(ring).difference(node)
        e2.addClass('e-2')
        second.addClass('nb2')
        second.parents().addClass('nb2')
      }
      cy.batch(() => {
        cy.elements().addClass('faded')
        const keep = node.union(outN).union(inN).union(outE).union(inE).union(second).union(cy.edges('.e-2'))
        keep.removeClass('faded')
        keep.nodes().parents().removeClass('faded')
        node.addClass('focus')
        outN.addClass('nb-out'); inN.addClass('nb-in')
        outE.addClass('e-out'); inE.addClass('e-in')
      })
      this.renderFocusBar(DSHMap.model.pkgById.get(id).short, outN.length, inN.length)
      if (move) {
        const eles = node.union(outN).union(inN)
        this.fitTo(eles.length > 1 ? eles : node, eles.length > 1 ? 70 : 220)
      }
    },
    focusGroup(gid, move) {
      const cy = this.cy
      const M = DSHMap.model
      if (state.mode === 'groups') {
        const n = cy.$id(`go:${gid}`)
        cy.batch(() => {
          cy.elements().addClass('faded')
          const nb = n.closedNeighborhood()
          nb.removeClass('faded')
          n.connectedEdges().addClass('e-out')
        })
        this.renderFocusBar(gid, null, null)
        if (move) this.fitTo(n.closedNeighborhood(), 80)
        return
      }
      const box = cy.$id(`g:${gid}`)
      if (!box.length) return
      if (box.style('display') === 'none') {
        if (this.revealing) return
        state.hiddenGroups = state.hiddenGroups.filter(g => g !== gid)
        state.hiddenLayers = state.hiddenLayers.filter(l => l !== M.groupById.get(gid).layer)
        this.revealing = true
        try { persist(); this.renderSide(); this.applyVisibility() } finally { this.revealing = false }
        return
      }
      const kids = box.children(':visible')
      cy.batch(() => {
        cy.elements().addClass('faded')
        box.removeClass('faded').addClass('gfocus')
        kids.removeClass('faded')
        const inner = kids.connectedEdges(':visible').filter(e => kids.contains(e.source()) && kids.contains(e.target()))
        inner.removeClass('faded')
      })
      this.renderFocusBar(gid, null, null)
      if (move) this.fitTo(box, 60)
    },
    fitTo(eles, padding) {
      const cy = this.cy
      const drawerW = DSHMap.drawer.isOpen ? DSHMap.drawer.el.getBoundingClientRect().width : 0
      const w = cy.width() - drawerW, hgt = cy.height()
      if (w < 200) { cy.animate({ fit: { eles, padding } }, { duration: dur(450) }); return }
      const bb = eles.boundingBox()
      const zoom = Math.max(cy.minZoom(), Math.min(1.6, Math.min((w - padding * 2) / Math.max(bb.w, 1), (hgt - padding * 2) / Math.max(bb.h, 1))))
      const cx = (bb.x1 + bb.x2) / 2, cyy = (bb.y1 + bb.y2) / 2
      cy.animate({ zoom, pan: { x: w / 2 - cx * zoom, y: hgt / 2 - cyy * zoom } }, { duration: dur(450), easing: 'ease-in-out-cubic' })
    },
    renderFocusBar(label, nOut, nIn) {
      const bar = clear(this.focusBar)
      bar.classList.remove('hidden')
      bar.append(h('b', { class: 'mono' }, label))
      if (nOut !== null) {
        bar.append(h('div', { class: 'legend-inline' },
          h('span', { class: 'fb-out' }, `${t('map.focus.out')} ${nOut}`),
          h('span', { class: 'fb-in' }, `${t('map.focus.in')} ${nIn}`)),
        h('div', { class: 'seg', title: t('map.depth') }, [1, 2].map(d => h('button', { class: state.depth === d ? 'on' : null, onclick: () => { state.depth = d; persist(); this.applyFocus(this.focusRef, false, true) } }, `${d}`))))
      }
      bar.append(h('button', { class: 'btn small', onclick: () => DSHMap.drawer.close() }, t('map.focus.clear')))
    },
    hover(e) {
      const n = e.target
      const M = DSHMap.model
      const oe = e.originalEvent
      let content
      if (n.hasClass('pkg')) {
        const p = M.pkgById.get(n.id())
        content = h('div', null,
          h('div', { class: 'tt-title' }, h('span', { class: 'tt-dot', style: `--sw:${n.data('color') ?? M.colorOf(p)}` }), p.short),
          h('div', { class: 'tt-sub' }, p.id),
          h('div', { class: 'tt-body' }, util.firstSentence(p.role ?? p.description ?? '', 200)),
          h('div', { class: 'tt-stats' },
            h('span', null, `${fmt.num(p.stats.src.lines)} ${t('d.stats.src')}`),
            h('span', null, `↗ ${M.out.get(p.id).length}  ↙ ${M.in.get(p.id).length}`),
            p.git ? h('span', null, `${fmt.num(p.git.commits)} ${t('d.stats.commits')}`) : null),
          state.profile ? h('div', { class: 'tt-sub tt-gap' }, `${state.profile}: ${DSHMap.ui.presenceTitle(M.presence(p, state.profile)) || t('map.profile.legend.off')}`) : null)
        if (!this.focusRef) {
          this.cy.batch(() => {
            n.addClass('hover')
            shown(n.outgoers('edge')).addClass('hover hover-out')
            shown(n.incomers('edge')).addClass('hover hover-in')
          })
        }
      } else {
        const gid = n.data('gid')
        const g = M.groupById.get(gid)
        const st = M.groupStats.get(gid)
        content = h('div', null,
          h('div', { class: 'tt-title' }, gid),
          h('div', { class: 'tt-body' }, i18n.pick(g.title)),
          h('div', { class: 'tt-stats' }, h('span', null, `${st.packages} ${t('ov.kpi.packages')}`), h('span', null, `${fmt.num(st.srcLines)} ${t('d.stats.src')}`)))
        if (n.hasClass('gov') && !this.focusRef) this.cy.batch(() => { n.addClass('hover'); n.connectedEdges().addClass('hover') })
      }
      DSHMap.tooltip.show(content, oe.clientX, oe.clientY)
      if (!n.hasClass('grp')) this.scheduleDim(n)
    },
    unhover() {
      DSHMap.tooltip.hide()
      this.cy?.batch(() => this.cy.elements('.hover, .hover-out, .hover-in').removeClass('hover hover-out hover-in'))
      this.scheduleDim(null)
    },
    /** Hover dimming (3.7), slightly delayed so sweeping the pointer across nodes does not flicker. */
    scheduleDim(node) {
      clearTimeout(this.dimTimer)
      this.dimTimer = setTimeout(() => this.hoverDim(node), node && !this.dimmed ? 90 : 60)
    },
    /** Fade all but `node`, its neighbours and their links; null restores. Never while something is focused. */
    hoverDim(node) {
      const cy = this.cy
      if (!cy) return
      cy.batch(() => {
        cy.elements('.hover-dim').removeClass('hover-dim')
        this.dimmed = false
        if (!node || this.focusRef || node.removed() || !node.visible()) return
        const edges = shown(node.connectedEdges())
        const keep = node.union(edges).union(edges.connectedNodes())
        // A compound parent's opacity also fades its children: keep the boxes around kept nodes,
        // and do not fade packages twice inside a faded box.
        const dim = cy.elements(':visible').difference(keep).difference(keep.nodes().ancestors())
        dim.difference(dim.nodes('.pkg').filter(x => dim.contains(x.parent()))).addClass('hover-dim')
        this.dimmed = true
      })
    },
    hoverEdge(e) {
      const M = DSHMap.model
      const ed = e.target
      const type = ed.data('type')
      const oe = e.originalEvent
      let text
      if (ed.hasClass('gedge') || ed.hasClass('pgedge')) text = `${ed.source().data('gid')} → ${ed.target().data('gid')} · ${t('map.list.deps', { n: ed.data('n') })}`
      else {
        const a = M.pkgById.get(ed.data('source'))?.short, b = M.pkgById.get(ed.data('target'))?.short
        if (type === 'svc') text = `${a} → ctx.${ed.data('key')} (${b})`
        else if (type === 'evt') {
          const pair = M.evtEdges.find(x => x.s === ed.data('source') && x.t === ed.data('target'))
          text = `${a} → ${b}: ${pair?.events.slice(0, 6).join(', ')}${pair && pair.events.length > 6 ? '…' : ''}`
        } else text = `${a} → ${b} (${type})`
      }
      DSHMap.tooltip.show(text, oe.clientX, oe.clientY)
    },

    // ── keyboard (1.7) ──────────────────────────────────────────────────
    /** Nodes the keyboard cursor can land on in the current mode. */
    kbdNodes() { return this.cy.nodes(state.mode === 'groups' ? 'node.gov:visible' : 'node.pkg:visible') },
    kbdEnter() {
      if (!this.cy || (this.kbd && this.kbd.inside() && this.kbd.visible())) return
      const nodes = this.kbdNodes()
      if (!nodes.length) return
      const focus = this.focusRef ? nodes.filter(n => n.id() === this.focusRef.replace(/^pkg:/, '') || n.data('gid') === this.focusRef.replace(/^group:/, '')) : null
      const ext = this.cy.extent()
      const c = { x: (ext.x1 + ext.x2) / 2, y: (ext.y1 + ext.y2) / 2 }
      const near = nodes.reduce((best, n) => { const p = n.position(); const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; return !best || d < best.d ? { n, d } : best }, null)
      this.kbdSet(focus?.length ? focus[0] : near.n, false)
    },
    kbdSet(node, pan = true) {
      this.kbd?.removeClass('kbd')
      this.kbd = node.addClass('kbd')
      if (pan) {
        const bb = node.renderedBoundingBox()
        if (bb.x1 < 20 || bb.y1 < 20 || bb.x2 > this.cy.width() - 20 || bb.y2 > this.cy.height() - 20) this.cy.animate({ center: { eles: node } }, { duration: dur(200) })
      }
      DSHMap.a11y.announce(this.kbdLabel(node))
    },
    kbdLabel(node) {
      const M = DSHMap.model
      if (node.hasClass('gov')) { const st = M.groupStats.get(node.data('gid')); return `${node.data('gid')} · ${t('map.kbd.group', { n: st?.packages ?? 0 })}` }
      const p = M.pkgById.get(node.id())
      const out = shown(node.outgoers('edge')).length, inc = shown(node.incomers('edge')).length
      return `${p.short} · ${p.group} · ${t('map.kbd.edges', { out, in: inc })}`
    },
    /** Nearest visible node in an arrow direction (a 2:1 cone, ties broken by the cross axis). */
    kbdMove(dx, dy) {
      if (!this.kbd || !this.kbd.visible()) { this.kbdEnter(); return }
      const from = this.kbd.position()
      let best = null
      this.kbdNodes().forEach(n => {
        if (n === this.kbd || n.id() === this.kbd.id()) return
        const p = n.position()
        const along = (p.x - from.x) * dx + (p.y - from.y) * dy
        const across = Math.abs((p.x - from.x) * dy - (p.y - from.y) * dx)
        if (along <= 0 || across > along * 2) return
        const score = along + across * 2
        if (!best || score < best.score) best = { n, score }
      })
      if (best) this.kbdSet(best.n)
    },
    kbdToMatch() {
      const m = this.cy?.nodes('node.pkg.match:visible')
      if (!m?.length) return
      this.graphEl.focus()
      this.kbdSet(m[0])
    },
    onKey(e) {
      if (!this.cy || e.target !== this.graphEl || e.metaKey || e.ctrlKey) return
      const k = e.key
      const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[k]
      if (dir && !e.altKey) { e.preventDefault(); this.kbdMove(...dir); return }
      if (k === 'Enter' && this.kbd?.visible()) {
        e.preventDefault()
        const n = this.kbd
        // Shift+Enter mirrors a double click: zoom into a group / expand it into packages.
        if (n.hasClass('gov')) { if (e.shiftKey) n.emit('dbltap'); else DSHMap.nav.openGroup(n.data('gid')) }
        else DSHMap.nav.openPackage(n.id())
        return
      }
      if (k === '+' || k === '=') { e.preventDefault(); this.zoom(1.3) }
      else if (k === '-') { e.preventDefault(); this.zoom(1 / 1.3) }
      else if (k === '0') { e.preventDefault(); this.fit() }
      else if (k.length === 1 && /\S/.test(k) && k !== '/' && !e.altKey) {
        // Type to find: continue in the existing name filter.
        e.preventDefault()
        if (!this.panelOpen) this.togglePanel()
        this.filterInput.value += k
        this.filterInput.focus()
        this.filterInput.dispatchEvent(new Event('input'))
      }
    },

    // ── list alternative (1.7): visible nodes and edges as tables ─────────
    toggleList() {
      this.listOpen = !this.listOpen
      this.listBtn.setAttribute('aria-pressed', String(this.listOpen))
      this.listBtn.classList.toggle('active', this.listOpen)
      this.listEl.classList.toggle('hidden', !this.listOpen)
      this.graphEl.inert = this.listOpen
      if (this.listOpen) { this.renderList(); this.listEl.focus() }
    },
    renderList() {
      if (!this.listOpen || !this.cy) return
      const M = DSHMap.model
      const groups = state.mode === 'groups'
      const open = n => (groups ? DSHMap.nav.openGroup(n.data('gid')) : DSHMap.nav.openPackage(n.id()))
      const name = n => (groups ? n.data('gid') : M.pkgById.get(n.id())?.short ?? n.id())
      const nodeBtn = n => h('button', { class: 'link-btn mono', onclick: () => open(n) }, name(n))
      const nodes = this.kbdNodes().map(n => ({
        n,
        name: name(n),
        where: groups ? i18n.pick(M.layerById?.get(M.groupById.get(n.data('gid'))?.layer)?.title) ?? '' : M.pkgById.get(n.id())?.group ?? '',
        out: shown(n.outgoers('edge')).length,
        in: shown(n.incomers('edge')).length,
      }))
      // Aggregated box-to-box links are a drawing aid: the list shows the real edges.
      const edges = shown(this.cy.edges()).not('.pgedge').filter(e => e.source().visible() && e.target().visible()).map(e => ({
        e, from: name(e.source()), to: name(e.target()), n: e.data('n') ?? 0,
        kind: groups ? t('map.list.deps', { n: e.data('n') }) : t(`edge.${e.data('type')}`),
      }))
      const keep = key => sort => { this.listSort = { ...this.listSort, [key]: sort } }
      clear(this.listEl).append(
        h('h2', { class: 'section-title' }, t('map.list.nodes'), h('span', { class: 'hint' }, fmt.num(nodes.length))),
        DSHMap.ui.table({
          label: t('map.list.nodes'), sort: this.listSort?.nodes ?? { key: 'name', dir: 1 }, onSort: keep('nodes'),
          columns: [
            { key: 'name', label: t('map.list.name'), cell: r => nodeBtn(r.n) },
            { key: 'where', label: groups ? t('map.list.layer') : t('map.list.group') },
            { key: 'out', label: t('map.list.out'), num: true },
            { key: 'in', label: t('map.list.in'), num: true },
          ],
          rows: nodes,
        }),
        h('h2', { class: 'section-title' }, t('map.list.edges'), h('span', { class: 'hint' }, fmt.num(edges.length))),
        DSHMap.ui.table({
          label: t('map.list.edges'), sort: this.listSort?.edges ?? null, onSort: keep('edges'),
          columns: [
            { key: 'from', label: t('map.list.from'), cell: r => nodeBtn(r.e.source()) },
            { key: 'to', label: t('map.list.to'), cell: r => nodeBtn(r.e.target()) },
            { key: 'kind', label: t('map.list.kind'), sort: groups ? r => r.n : r => r.kind },
          ],
          rows: edges,
        }))
    },

    zoom(f) {
      const cy = this.cy
      cy.animate({ zoom: { level: cy.zoom() * f, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } } }, { duration: dur(200) })
    },
    fit() { this.cy.animate({ fit: { eles: this.cy.elements(':visible'), padding: 30 } }, { duration: dur(350) }) },
    exportPng() {
      const blob = this.cy.png({ output: 'blob', bg: DSHMap.theme.css('--graph-bg'), full: true, scale: 2, maxWidth: 8000, maxHeight: 8000 })
      const url = URL.createObjectURL(blob)
      const a = h('a', { href: url, download: 'dsh-map.png' })
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    },
  }

  const SHAPES = [
    ['definition', '<polygon points="7,1 13,7 7,13 1,7"/>'],
    ['provider', '<polygon points="7,1 13,13 1,13"/>'],
    ['plugin', '<circle cx="7" cy="7" r="5.5"/>'],
    ['library', '<rect x="1.5" y="2.5" width="11" height="9" rx="2.5"/>'],
    ['bundle', '<polygon points="7,1 12.5,4 12.5,10 7,13 1.5,10 1.5,4"/>'],
    ['app', '<polygon points="7,1 8.8,5 13,5.3 9.8,8.2 10.8,12.6 7,10.3 3.2,12.6 4.2,8.2 1,5.3 5.2,5"/>'],
  ]
  function shapeIcon(id) {
    const path = id === 'owner'
      ? '<circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="2"/>'
      : SHAPES.find(([key]) => key === id)[1]
    return h('span', { class: 'gl-shape', 'aria-hidden': 'true', html: `<svg viewBox="0 0 14 14" fill="currentColor">${path}</svg>` })
  }

  /** Role of a package in capability seams: definition > provider > consumer. */
  function seamRole(p) {
    const M = DSHMap.model
    const seams = k => M.svcByKey.get(k)?.mode === 'seam'
    if (p.services.owns.some(seams)) return 'definition'
    if (p.services.implements.some(seams)) return 'provider'
    if (p.services.consumes.some(seams)) return 'consumer'
    return 'none'
  }
  /** Role of a package in the provider-dependency lens (worst first). */
  function lensRole(p) {
    const rows = DSHMap.model.providerDeps
    const from = rows.filter(x => x.from === p.id).map(x => x.role)
    for (const r of ['candidate', 'wrapper', 'composition', 'closure']) if (from.includes(r)) return r
    if (rows.some(x => x.to === p.id)) return 'provider'
    return 'none'
  }

  /** Architecture-poster layout of the current model (see layout.js). */
  function packageSize(p) {
    return state.size === 'dependents'
      ? Math.round(Math.max(16, Math.min(84, 16 + Math.sqrt(DSHMap.model.inDegree(p.id)) * 7)))
      : state.size === 'commits'
        ? Math.round(Math.max(16, Math.min(84, 14 + Math.sqrt(p.git?.commits ?? 0) * 2.4)))
        : p.size
  }
  function layoutNodes() {
    return DSHMap.model.packages.map(p => ({ id: p.id, group: p.group, size: packageSize(p) }))
  }
  function layeredPositions() {
    const M = DSHMap.model
    return DSHMap.layout.layered({ layers: M.layers, groups: M.groups, lines: id => M.pkgById.get(id).stats.src.lines, size: id => packageSize(M.pkgById.get(id)) })
  }
})()
