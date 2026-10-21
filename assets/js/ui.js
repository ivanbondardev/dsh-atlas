/* DSH Map — application shell: header, hash router, views, drawer,
 * command palette, tooltip, theme and language switching. */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, util, i18n } = DSHMap

  const VIEW_ORDER = [
    ['start', 'compass'],
    ['overview', 'home'],
    ['map', 'map'],
    ['architecture', 'flow'],
    ['usage', 'terminal'],
    ['scenarios', 'film'],
    ['customize', 'sliders'],
    ['composition', 'layers'],
    ['services', 'plug'],
    ['events', 'zap'],
    ['tools', 'tool'],
    ['docs', 'doc'],
    ['code', 'code'],
    ['history', 'clock'],
    ['evolution', 'git'],
    ['health', 'info'],
  ]
  const ICON_OF = new Map(VIEW_ORDER)
  // Header menus: the three questions of the main ROADMAP plus reference.
  const NAV_GROUPS = [
    ['understand', ['start', 'overview', 'architecture', 'map']],
    ['use', ['usage', 'scenarios', 'tools']],
    ['change', ['customize', 'composition', 'services', 'events']],
    ['reference', ['docs', 'code', 'history', 'evolution', 'health']],
  ]
  const GROUP_ICON = { understand: 'compass', use: 'play', change: 'sliders', reference: 'book' }
  const groupOf = view => NAV_GROUPS.find(([, views]) => views.includes(view))?.[0] ?? null
  // Not restored when returning to the last route (2.5): overlays and one-shot actions.
  const TRANSIENT = ['file', 'line', 'tour', 'step']

  // ── lazily loaded views (UI/UX roadmap 4.1) ─────────────────────────────
  /**
   * What a view needs before it renders: its script (assets/js/views/<id>.js,
   * except "Start here", which index.html loads), helper scripts, data parts
   * (DSHMap.data) and vendored libraries (DSHMap.vendor). By default a view
   * needs the whole model and the Markdown renderer.
   */
  const VIEW_NEEDS = {
    start: { parts: [], vendors: [] },
    overview: { parts: ['model'] },
    map: { parts: ['model'], vendors: ['md', 'cytoscape', 'd3'], scripts: ['assets/js/layout.js'] },
    code: { vendors: ['md', 'd3'] },
    history: { vendors: ['md', 'd3'] },
    customize: { vendors: ['md', 'yaml'], scripts: ['assets/js/patch.js'] },
    evolution: { scripts: ['assets/js/evodiff.js'] },
    // The event panel shows the payload history of the evolution view.
    events: { scripts: ['assets/js/evodiff.js', 'assets/js/views/evolution.js'] },
    // "Copy as context" of a service comes from the customize view.
    services: { vendors: ['md', 'yaml'], scripts: ['assets/js/patch.js', 'assets/js/views/customize.js'] },
  }
  /**
   * The detail panel and the source viewer borrow sections from two views:
   * configure / examples / "copy as context" (customize.js) and the API,
   * stability badge and symbol uses (evolution.js).
   */
  const PANEL_SCRIPTS = ['assets/js/patch.js', 'assets/js/evodiff.js', 'assets/js/views/customize.js', 'assets/js/views/evolution.js']
  /** Skeleton shape while a view loads: master/detail reference, canvas or narrative page. */
  const VIEW_SHAPE = { docs: 'reference', events: 'reference', tools: 'reference', services: 'reference', scenarios: 'reference', composition: 'reference', map: 'canvas', code: 'canvas' }
  const needsOf = view => ({ parts: DSHMap.data.ALL, vendors: ['md'], scripts: [], ...VIEW_NEEDS[view] })
  const views = DSHMap.viewLoader = {
    /** Everything the view needs is here. */
    ready(view) {
      const n = needsOf(view)
      return !!DSHMap.views[view] && DSHMap.data.hasAll(n.parts) && n.vendors.every(v => DSHMap.vendor.has(v))
    },
    /** Load the view's script, helpers, data parts and libraries. */
    prepare(view) {
      const n = needsOf(view)
      const scripts = n.scripts.reduce((p, src) => p.then(() => DSHMap.loadScript(src)), Promise.resolve())
        .then(() => (DSHMap.views[view] ? null : DSHMap.loadScript(`assets/js/views/${view}.js`)))
      return Promise.all([scripts, DSHMap.data.need(n.parts), DSHMap.vendor.need(n.vendors)]).then(() => {
        if (!DSHMap.views[view]) throw new Error(t('err.load', { src: `assets/js/views/${view}.js` }))
      })
    },
  }
  /** Everything the detail panel and the source viewer need (data, Markdown, borrowed sections). */
  views.panelReady = () => DSHMap.data.hasAll(DSHMap.data.ALL) && DSHMap.vendor.has('md') && DSHMap.vendor.has('yaml') && !!DSHMap.customize && !!DSHMap.evolution
  views.preparePanel = () => Promise.all([
    DSHMap.data.need(DSHMap.data.ALL),
    DSHMap.vendor.need(['md', 'yaml']),
    PANEL_SCRIPTS.reduce((p, src) => p.then(() => DSHMap.loadScript(src)), Promise.resolve()),
  ]).then(() => undefined)
  /** Run fn once the `model` part is indexed (navigation helpers resolve entities by id). */
  const whenModel = fn => {
    if (DSHMap.model.ready.has('model')) return fn()
    DSHMap.data.need(['model']).then(fn, err => DSHMap.ui.toast(String(err?.message ?? err)))
    return undefined
  }

  // ── theme ───────────────────────────────────────────────────────────────
  /**
   * Theme (3.6): the choice is "system", "light" or "dark"; `current` is the
   * theme in effect. "system" follows prefers-color-scheme live.
   */
  const systemMq = window.matchMedia?.('(prefers-color-scheme: light)')
  const PREFS = ['system', 'light', 'dark']
  const theme = DSHMap.theme = {
    pref: PREFS.includes(util.storage.get('theme', null)) ? util.storage.get('theme', null) : 'system',
    current: 'dark',
    resolve() { return this.pref === 'system' ? (systemMq?.matches ? 'light' : 'dark') : this.pref },
    apply() {
      this.current = this.resolve()
      document.documentElement.dataset.theme = this.current
      const link = document.getElementById('hljs-theme')
      if (link) link.href = this.current === 'dark' ? 'vendor/hljs-dark.min.css' : 'vendor/hljs-light.min.css'
    },
    /** Cycle system → light → dark. */
    toggle() { this.set(PREFS[(PREFS.indexOf(this.pref) + 1) % PREFS.length]) },
    set(pref) {
      const before = this.current
      this.pref = pref
      util.storage.set('theme', pref)
      this.apply()
      if (this.current !== before) DSHMap.emit('theme', this.current)
      DSHMap.emit('theme-pref', pref)
    },
    icon() { return { system: 'monitor', light: 'sun', dark: 'moon' }[this.pref] },
    label() { return t('theme.toggle', { mode: t(`theme.${this.pref}`) }) },
    /** Resolve a CSS custom property to its current value. */
    css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() },
  }
  theme.apply()
  systemMq?.addEventListener?.('change', () => {
    if (theme.pref !== 'system') return
    theme.apply()
    DSHMap.emit('theme', theme.current)
  })

  /**
   * Data colors live in app.css (3.2). Canvas libraries (Cytoscape, D3 ramps,
   * luminance checks) need resolved values: get() caches them per theme.
   * Inline styles can use v() instead and follow the theme by themselves.
   */
  const colors = DSHMap.colors = {
    cache: new Map(),
    get(name, fallback = 'c-unknown') {
      const key = `${theme.current}:${name}`
      if (!this.cache.has(key)) this.cache.set(key, theme.css(`--${name}`) || (fallback ? this.get(fallback, null) : ''))
      return this.cache.get(key)
    },
    /** `var(--name, var(--fallback))` for inline styles. */
    v(name, fallback = 'c-unknown') { return `var(--${name}, var(--${fallback}))` },
    /** Steps --ramp-<name>-1…n as an array of resolved colors. */
    ramp(name) {
      const out = []
      for (let i = 1; ; i++) { const c = theme.css(`--ramp-${name}-${i}`); if (!c) break; out.push(c) }
      return out
    },
    lang(l) { return this.get(`lang-${l}`, 'lang-other') },
    area(a) { return this.get(`area-${String(a).replace(/^\./, '')}`, 'area-other') },
  }
  DSHMap.on('theme', () => colors.cache.clear())

  // ── router ──────────────────────────────────────────────────────────────
  const clean = params => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  /**
   * Hash router. The whole screen lives in `#/<view>?<params>`: the view's
   * own state (tabs, selection, filters, modes), the detail panel (`d`) and
   * the source viewer (`file`, `line`). Navigation pushes history entries;
   * view state that the view already shows (typing in a filter, a toggle)
   * rewrites the current entry with replace() without re-rendering.
   */
  const router = DSHMap.router = {
    view: null,
    params: {},
    /** Hash last rendered by sync(): popstate, hashchange and nested go() calls run it once. */
    synced: null,
    runs: 0,
    parse(hash = location.hash) {
      const raw = hash.replace(/^#\/?/, '')
      const [path, query = ''] = raw.split('?')
      const view = VIEW_ORDER.some(([v]) => v === path) ? path : 'start'
      const params = Object.fromEntries(new URLSearchParams(query))
      return { view, params }
    },
    href(view, params = {}) {
      const qs = new URLSearchParams(clean(params)).toString()
      return `#/${view}${qs ? `?${qs}` : ''}`
    },
    go(view, params = {}, opts = {}) {
      const href = this.href(view, params)
      if (opts.replace) history.replaceState(history.state, '', href)
      else if (location.hash !== href) history.pushState(this.entryState(view, params), '', href)
      this.sync()
    },
    setParams(patch, opts = {}) {
      this.go(this.view ?? 'start', clean({ ...this.params, ...patch }), opts)
    },
    /**
     * Rewrite the current history entry with view state the page already
     * shows (filters, modes). Nothing re-renders; Back skips the change.
     */
    replace(patch) {
      if (!this.view) return
      const next = clean({ ...this.params, ...patch })
      const href = this.href(this.view, next)
      this.params = next
      this.synced = href
      if (location.hash !== href) history.replaceState(history.state, '', href)
      remember(href)
    },
    /**
     * History state of a new entry: `dDepth` counts the detail-panel steps
     * leading to it, so the panel's Back button is the browser Back (2.3).
     */
    entryState(view, params) {
      const d = params.d, prev = this.params.d
      if (!d) return null
      if (!prev || view !== this.view) return { dDepth: 1 }
      const depth = history.state?.dDepth ?? 1
      return { dDepth: prev === d ? depth : depth + 1 }
    },
    /** First render: an empty hash returns to the last route (2.5); the start page is for first visits. */
    start() {
      if (!location.hash.replace(/^#\/?/, '')) {
        const last = util.storage.get('lastRoute', null)
        history.replaceState(null, '', typeof last === 'string' && last.startsWith('#/') ? last : '#/start')
      }
      this.sync()
    },
    /** View whose content is on screen (it lags behind `view` while that one loads). */
    shown: null,
    sync() {
      const hash = location.hash
      if (hash === this.synced) return
      this.synced = hash
      const run = ++this.runs
      const { view, params } = this.parse(hash)
      const prevParams = this.params
      this.view = view
      this.params = params
      if (!views.ready(view)) {
        // Skeleton now; the view renders once its script, data and libraries are in (4.1, 4.2).
        shell.showPending(view)
        drawer.syncFromParams(this.params)
        DSHMap.viewer.syncFromParams(this.params)
        shell.renderCrumbs()
        remember(location.hash)
        const retry = () => {
          if (this.runs !== run) return
          shell.showPending(view)
          views.prepare(view).then(() => { if (this.runs === run) { this.synced = null; this.sync() } }, err => { if (this.runs === run) shell.showFailed(view, err, retry) })
        }
        retry()
        return
      }
      const viewChanged = view !== this.shown
      this.shown = view
      shell.showView(view, params, viewChanged, prevParams)
      // A view may have navigated while rendering (that nested sync did the rest).
      if (this.runs !== run) return
      drawer.syncFromParams(this.params)
      DSHMap.viewer.syncFromParams(this.params)
      shell.renderCrumbs()
      remember(location.hash)
    },
  }
  /** Last route for 2.5, without overlays and one-shot actions. */
  function remember(hash) {
    const { view, params } = router.parse(hash)
    for (const k of TRANSIENT) delete params[k]
    util.storage.set('lastRoute', router.href(view, params))
  }
  // Fragment navigation fires popstate (Back/Forward, links, typed URLs); sync() ignores repeats.
  window.addEventListener('popstate', () => router.sync())

  // ── navigation helpers ────────────────────────────────────────────────
  DSHMap.nav = {
    openPackage(id) { router.setParams({ d: `pkg:${id}` }) },
    openGroup(id) { router.setParams({ d: `group:${id}` }) },
    showOnMap(id) { router.go('map', { d: `pkg:${id}` }) },
    /** Open the map with changed filters (the map script may not be loaded yet). */
    mapWith(patch, params = {}) {
      const apply = () => { DSHMap.views.map.setState(patch); router.go('map', params) }
      if (DSHMap.views.map) apply()
      else views.prepare('map').then(apply, err => DSHMap.ui.toast(String(err?.message ?? err)))
    },
    showGroupOnMap(gid) { router.go('map', { d: `group:${gid}` }) },
    openService(key) { router.go('services', { key, d: router.params.d }) },
    openEvent(name) { router.go('events', { tab: 'runtime', name, d: router.params.d }) },
    openSessionEvent(name) { router.go('events', { tab: 'session', name, d: router.params.d }) },
    openTool(key) { router.go('tools', { key, d: router.params.d }) },
    openProfile(name) { router.go('composition', { profile: name, tab: 'rows' }) },
    openCodePath(path) { router.go('code', { path }) },
    /** The source viewer lives in the route: ?file=<path>&line=<n> over the current view. */
    openFile(path, opts = {}) { router.setParams({ file: path, line: opts.line ?? null }) },
    /** Open a document or decision (path[#anchor]) in the Docs view. */
    openDoc(ref) {
      if (!DSHMap.model.ready.has('model')) return whenModel(() => this.openDoc(ref))
      const [id, anchor] = String(ref).split('#')
      if (!DSHMap.model.docById.has(id)) { this.openFile(id); return }
      router.go('docs', { doc: id, a: anchor })
    },
    openFlow(id) { router.go('architecture', { tab: 'flows', flow: id }) },
    openProcess(id) { router.go('architecture', { tab: 'processes', process: id }) },
    openRule(id) { router.go('architecture', { tab: 'rules', rule: id }) },
    openTerm(term) { router.go('docs', { c: 'glossary', term }) },
    openTour(id) { DSHMap.tour?.start(id) },
    openCapability(id) { router.go('usage', { tab: 'capabilities', cap: id }) },
    openCommand(name) { if (!DSHMap.model.ready.has('model')) return whenModel(() => this.openCommand(name)); const c = DSHMap.model.commands.find(x => x.name === name && x.kind === 'host') ?? DSHMap.model.commands.find(x => x.name === name); const cap = c && DSHMap.model.capsByPkg.get(c.pkg)?.[0]; router.go('usage', { tab: 'capabilities', cap }) },
    openEnv(name) { router.go('usage', { tab: 'disk', env: name }) },
    openScenario(id, at) { router.go('scenarios', { id, at }) },
    openExtension(id) { router.go('customize', { tab: 'catalog', x: id }) },
    openSlot(key) { router.go('customize', { tab: 'slots', slot: key }) },
    openConfigKey(pkgId, field) { if (!DSHMap.model.ready.has('model')) return whenModel(() => this.openConfigKey(pkgId, field)); const p = DSHMap.model.pkgById.get(pkgId); router.go('customize', { tab: 'config', cfg: field ?? p?.short }) },
    openSkill(file) { this.openFile(file) },
    /** Open an evolution tab (changes / format / stability / symbols) with its parameters. */
    openEvolution(tab, params = {}) { router.go('evolution', { tab, ...params }) },
    /** Public symbol row of data/symbols.js: [key, pkg, path, line, …] → its definition. */
    openSymbol(row) { this.openFile(row[2], { line: row[3] }) },
    /** Show a set of packages highlighted on the map (optionally under a profile filter). */
    highlight(ids, profile) { router.go('map', { hl: ids.join(','), profile: profile ?? undefined }) },
    /** Follow a curated link target (see generator/curated/tours.yaml for the kinds). */
    to(link) {
      if (!link) return
      if (link.tool && !DSHMap.model.ready.has('model')) { whenModel(() => this.to(link)); return }
      const M = DSHMap.model
      if (link.package) this.openPackage(link.package)
      else if (link.group) this.showGroupOnMap(link.group)
      else if (link.highlight) this.highlight(link.highlight, link.profile)
      else if (link.service) this.openService(link.service)
      else if (link.event) this.openEvent(link.event)
      else if (link.sessionEvent) this.openSessionEvent(link.sessionEvent)
      else if (link.tool) { const tl = M.tools.find(x => x.name === link.tool); if (tl) this.openTool(tl.key) }
      else if (link.profile) this.openProfile(link.profile)
      else if (link.doc) this.openDoc(link.doc)
      else if (link.file) this.openFile(link.file)
      else if (link.flow) this.openFlow(link.flow)
      else if (link.process) this.openProcess(link.process)
      else if (link.rule) this.openRule(link.rule)
      else if (link.view) router.go(link.view, link.params ?? {})
    },
    /** Short label of a link target for chips and tour steps. */
    label(link) {
      if (!link) return ''
      const M = DSHMap.model
      if (link.package) return M.pkgById.get(link.package)?.short ?? link.package
      if (link.highlight) return link.highlight.map(id => M.pkgById.get(id)?.short ?? id).join(', ')
      if (link.service) return `ctx.${link.service}`
      if (link.doc) { const [id, a] = link.doc.split('#'); const d = M.docById.get(id); return `${d?.label ?? d?.title ?? id}${a ? ` § ${a}` : ''}` }
      if (link.flow) return i18n.pick(M.flowById.get(link.flow)?.title)
      if (link.process) return i18n.pick(M.processById.get(link.process)?.title)
      if (link.rule) return i18n.pick(M.ruleById.get(link.rule)?.title)
      if (link.view) return t(`nav.${link.view}`)
      if (link.profile) return `dsh --profile ${link.profile}`
      return link.event ?? link.sessionEvent ?? link.tool ?? link.file ?? link.group ?? ''
    },
  }

  // ── shell ───────────────────────────────────────────────────────────────
  const shell = DSHMap.shell = {
    els: {},
    init() {
      const app = document.getElementById('app')
      clear(app)
      const nav = h('nav', { class: 'nav', 'aria-label': t('a11y.nav'), 'data-i18n-aria': 'a11y.nav' })
      const skip = h('a', { class: 'skip-link', href: '#main', 'data-i18n': 'a11y.skip', onclick: e => { e.preventDefault(); this.focusMain() } }, t('a11y.skip'))
      const healthSlot = h('span', { class: 'health-slot' })
      const header = h('header', { class: 'header' },
        h('a', { class: 'brand', href: '#/start', title: t('unofficial') },
          svgIcon('logo'),
          h('div', null, h('div', { 'data-i18n': 'brand' }, t('brand')), h('small', { 'data-i18n': 'brand.sub' }, t('brand.sub')))),
        healthSlot,
        nav,
        h('div', { class: 'header-tools' },
          h('button', { class: 'search-trigger', 'aria-label': t('a11y.search'), 'data-i18n-aria': 'a11y.search', 'aria-haspopup': 'dialog', 'aria-keyshortcuts': 'Control+K Meta+K /', onclick: () => palette.open() },
            svgIcon('search'), h('span', { 'data-i18n': 'search.trigger' }, t('search.trigger')), h('kbd', { 'aria-hidden': 'true' }, navigator.platform?.includes('Mac') ? '⌘K' : 'Ctrl K')),
          versionPicker(),
          h('button', { class: 'icon-btn', id: 'lang-btn', title: t('lang.toggle'), 'aria-label': t('lang.toggle'), lang: i18n.lang === 'uk' ? 'en' : 'uk', onclick: () => i18n.set(i18n.lang === 'uk' ? 'en' : 'uk') }, t('lang.other')),
          h('button', { class: 'icon-btn', id: 'theme-btn', title: theme.label(), 'aria-label': theme.label(), onclick: () => theme.toggle() }, svgIcon(theme.icon())),
        ))
      const viewHost = h('main', { class: 'view-host', id: 'main', tabindex: '-1' })
      const drawerEl = h('aside', { class: 'drawer' })
      const main = h('div', { class: 'main' }, viewHost, drawerEl)
      // Where am I: Group › View › Tab › Entity, plus the share link of the whole screen (2.4, 2.6).
      const crumbList = h('ol', { class: 'crumbs-list' })
      const crumbs = h('div', { class: 'crumbs-global' },
        h('nav', { class: 'crumbs-nav', 'aria-label': t('a11y.where'), 'data-i18n-aria': 'a11y.where' }, crumbList),
        h('button', { class: 'btn small share-btn', title: t('share.title'), 'data-i18n-title': 'share.title', onclick: () => this.share() },
          svgIcon('link'), h('span', { 'data-i18n': 'share' }, t('share'))))
      // Background loading of the data parts (4.2): a thin bar along the top edge.
      const loadBar = h('div', { class: 'load-bar', role: 'progressbar', 'aria-label': t('load.bar'), 'data-i18n-aria': 'load.bar', 'aria-valuemin': '0', 'aria-valuemax': '100' }, h('span'))
      app.append(skip, header, crumbs, main, loadBar)
      this.els = { header, nav, viewHost, main, healthSlot, crumbList, loadBar }
      const paintBar = () => {
        const st = DSHMap.data.stages()
        const done = st.filter(x => x.done).length
        const busy = st.some(x => x.active)
        const pct = Math.round((done / st.length) * 100)
        loadBar.classList.toggle('on', busy)
        loadBar.classList.toggle('failed', false)
        loadBar.setAttribute('aria-valuenow', String(pct))
        loadBar.firstChild.style.width = `${busy ? Math.max(pct, (done + 0.5) / st.length * 100) : pct}%`
      }
      DSHMap.on('data-loading', paintBar)
      DSHMap.on('data-part', paintBar)
      DSHMap.on('data-failed', () => { paintBar(); loadBar.classList.add('on', 'failed'); setTimeout(() => loadBar.classList.remove('on'), 4000) })
      // Entity names and the health of the model appear once the `model` part is indexed.
      DSHMap.on('model', () => this.renderCrumbs())
      paintBar()
      this.renderNav()
      document.addEventListener('click', e => { if (this.openMenu && !this.els.nav.contains(e.target)) this.closeMenu() })
      drawer.mount(drawerEl)
      tooltip.mount()
      palette.mount()
      DSHMap.viewer.mount()

      DSHMap.on('theme-pref', () => {
        const btn = document.getElementById('theme-btn')
        clear(btn).appendChild(svgIcon(theme.icon()))
        btn.title = theme.label()
        btn.setAttribute('aria-label', theme.label())
        DSHMap.ui.toast(theme.label())
      })
      DSHMap.on('lang', () => this.relocalize())

      document.addEventListener('keydown', e => {
        const tag = (e.target.tagName || '').toLowerCase()
        const typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.toggle(); return }
        if (e.key === 'Escape') {
          if (this.openMenu) this.closeMenu()
          else if (palette.isOpen) palette.close()
          else if (DSHMap.viewer.isOpen) DSHMap.viewer.close()
          else if (drawer.isOpen) drawer.close()
          return
        }
        if (!typing && e.key === '/') { e.preventDefault(); palette.open() }
      })
    },
    /**
     * Four disclosure menus (2.1). Group labels stay visible at every width;
     * narrow headers drop the icons. "Data health" lives under Reference,
     * its badge next to the logo.
     */
    renderNav() {
      const nav = clear(this.els.nav)
      this.openMenu = null
      const H = DSHMap.model.health
      const issues = H && (H.errors || H.warnings) ? { n: H.errors || H.warnings, cls: H.errors ? 'danger' : 'warn' } : null
      const badge = () => (issues ? h('span', { class: ['nav-badge', issues.cls], 'aria-hidden': 'true' }, issues.n) : null)
      const healthLabel = issues ? `${t('nav.health')} (${issues.n})` : t('nav.health')
      clear(this.els.healthSlot).append(issues ? h('a', { class: ['health-badge', issues.cls], href: '#/health', title: healthLabel, 'aria-label': healthLabel }, svgIcon('info'), issues.n) : '')
      const list = h('ul', { class: 'nav-groups' })
      for (const [gid, views] of NAV_GROUPS) {
        const menuId = `nav-menu-${gid}`
        const active = views.includes(router.view)
        const btn = h('button', {
          class: ['nav-group', active ? 'active' : null], 'aria-expanded': 'false', 'aria-controls': menuId, 'data-group': gid,
          onclick: () => (this.openMenu === gid ? this.closeMenu() : this.showMenu(gid)),
          onkeydown: e => { if (e.key === 'ArrowDown') { e.preventDefault(); this.showMenu(gid, true) } },
        }, svgIcon(GROUP_ICON[gid]), h('span', null, t(`nav.group.${gid}`)), views.includes('health') ? badge() : null, svgIcon('chevron', 'caret'))
        const menu = h('ul', { class: 'nav-menu', id: menuId, hidden: true }, views.map(v => h('li', null,
          h('a', { href: `#/${v}`, 'data-view': v, class: router.view === v ? 'active' : null, 'aria-current': router.view === v ? 'page' : null, 'aria-label': v === 'health' ? healthLabel : null, onclick: () => this.closeMenu() },
            svgIcon(ICON_OF.get(v)),
            h('span', { class: 'nm-text' }, h('b', null, t(`nav.${v}`), v === 'health' ? badge() : null), h('small', null, t(`nav.${v}.d`)))))))
        menu.addEventListener('keydown', e => {
          const links = [...menu.querySelectorAll('a')]
          const i = links.indexOf(document.activeElement)
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); links[(i + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length]?.focus() }
          else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); links[e.key === 'Home' ? 0 : links.length - 1]?.focus() }
        })
        list.appendChild(h('li', { class: 'nav-item' }, btn, menu))
      }
      nav.appendChild(list)
      if (nav.dataset.wired) return
      nav.dataset.wired = '1'
      nav.addEventListener('keydown', e => {
        if (e.key === 'Escape' && this.openMenu) { e.stopPropagation(); const gid = this.openMenu; this.closeMenu(); nav.querySelector(`[data-group="${gid}"]`)?.focus() }
      })
      nav.addEventListener('focusout', e => { if (this.openMenu && !nav.contains(e.relatedTarget)) this.closeMenu() })
    },
    showMenu(gid, focusFirst = false) {
      if (this.openMenu && this.openMenu !== gid) this.closeMenu()
      const btn = this.els.nav.querySelector(`[data-group="${gid}"]`)
      const menu = document.getElementById(`nav-menu-${gid}`)
      this.openMenu = gid
      btn.setAttribute('aria-expanded', 'true')
      menu.hidden = false
      if (focusFirst) (menu.querySelector('a.active') ?? menu.querySelector('a'))?.focus()
    },
    closeMenu() {
      const gid = this.openMenu
      if (!gid) return
      this.openMenu = null
      this.els.nav.querySelector(`[data-group="${gid}"]`)?.setAttribute('aria-expanded', 'false')
      const menu = document.getElementById(`nav-menu-${gid}`)
      if (menu) menu.hidden = true
    },
    /** Global breadcrumbs (2.4): Group › View › Tab › Entity › detail panel. */
    renderCrumbs() {
      const list = clear(this.els.crumbList)
      const items = crumbsOf(router.view, router.params)
      items.forEach((it, i) => {
        const last = i === items.length - 1
        const cls = ['crumb', it.mono ? 'mono' : null, it.group ? 'group' : null]
        list.appendChild(h('li', { class: cls },
          last ? h('span', { 'aria-current': 'page', title: it.title ?? null }, it.label)
            : it.href ? h('a', { href: it.href, title: it.title ?? null }, it.label)
              : h('span', { title: it.title ?? null }, it.label)))
      })
    },
    /** Copy the URL of the whole screen: view, tabs, filters, selection, panel (2.6). */
    share() {
      const url = location.href
      util.copy(url).then(() => DSHMap.ui.toast(t('share.done')), () => this.shareFallback(url))
    },
    /** No clipboard access: show the link selected, ready for ⌘C / Ctrl+C. */
    shareFallback(url) {
      const btn = document.querySelector('.share-btn')
      document.querySelector('.share-pop')?.remove()
      const input = h('input', { class: 'input mono', readonly: true, value: url, 'aria-label': t('share.failed') })
      const pop = h('div', { class: 'share-pop', role: 'dialog', 'aria-label': t('share') }, h('div', { class: 'small faint' }, t('share.failed')), input)
      const outside = e => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('pointerdown', outside, true) } }
      const close = () => { pop.remove(); document.removeEventListener('pointerdown', outside, true); btn?.focus() }
      input.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close() } })
      document.addEventListener('pointerdown', outside, true)
      btn.parentElement.appendChild(pop)
      input.focus()
      input.select()
    },
    /** Header menus: mark the view's group and link. */
    markNav(view) {
      const group = groupOf(view)
      for (const b of this.els.nav.querySelectorAll('.nav-group')) b.classList.toggle('active', b.dataset.group === group)
      for (const a of this.els.nav.querySelectorAll('a[data-view]')) {
        a.classList.toggle('active', a.dataset.view === view)
        if (a.dataset.view === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current')
      }
    },
    /** Placeholder section shown while a view loads or failed to. */
    pendingEl() {
      this.els.pending ??= this.els.viewHost.appendChild(h('section', { class: 'view view-pending', 'aria-busy': 'true' }))
      for (const [id] of VIEW_ORDER) DSHMap.views[id]?.el?.classList.remove('active')
      this.els.pending.classList.add('active')
      return this.els.pending
    },
    /** Skeleton of the view's layout with the loading stages (4.2). */
    showPending(view) {
      this.closeMenu?.()
      this.markNav(view)
      for (const [id] of VIEW_ORDER) if (id !== view && id === router.shown) DSHMap.views[id]?.hide?.()
      router.shown = null
      document.title = `${t(`nav.${view}`)} · ${t('brand')}`
      const el = clear(this.pendingEl())
      el.setAttribute('aria-busy', 'true')
      el.append(h('h1', { class: 'sr-only' }, t(`nav.${view}`)), DSHMap.ui.skeleton(VIEW_SHAPE[view] ?? 'narrative', { title: t(`nav.${view}`), status: true }))
    },
    showFailed(view, err, retry) {
      const el = clear(this.pendingEl())
      el.removeAttribute('aria-busy')
      el.append(h('h1', { class: 'sr-only' }, t(`nav.${view}`)), DSHMap.ui.errorState(err, { retry }))
    },
    showView(view, params, viewChanged, prevParams) {
      this.closeMenu?.()
      this.markNav(view)
      this.els.pending?.classList.remove('active')
      const def = DSHMap.views[view]
      if (!def) return
      if (!def.el) {
        def.el = h('section', { class: ['view', def.scroll ? 'scroll' : null], tabindex: def.scroll ? '0' : null })
        this.els.viewHost.appendChild(def.el)
      }
      // A language switch left this view in the old language (4.5): rebuild it now.
      if (def.inited && def.stale) { def.dispose?.(); clear(def.el); def.inited = false; viewChanged = true }
      def.stale = false
      if (!def.inited) { def.inited = true; def.init(def.el); this.ensureHeading(view) }
      for (const [id] of VIEW_ORDER) {
        const v = DSHMap.views[id]
        if (v?.el) v.el.classList.toggle('active', id === view)
      }
      if (viewChanged) {
        for (const [id] of VIEW_ORDER) if (id !== view) DSHMap.views[id]?.hide?.()
        def.show?.(params)
        this.ensureHeading(view)
        document.title = `${t(`nav.${view}`)} · ${t('brand')}`
      } else {
        def.update?.(params, prevParams)
        this.ensureHeading(view)
      }
    },
    /** Every view has one <h1>: views without a visible title get a visually hidden one. */
    ensureHeading(view) {
      const el = DSHMap.views[view]?.el
      if (!el) return
      // Layouts render their own <h1> on show: drop the fallback then.
      const fallback = el.querySelector(':scope > h1.sr-only[data-i18n]')
      if (fallback && el.querySelectorAll('h1').length > 1) { fallback.remove(); el.removeAttribute('aria-label') }
      if (el.querySelector('h1')) return
      el.prepend(h('h1', { class: 'sr-only', 'data-i18n': `nav.${view}` }, t(`nav.${view}`)))
      el.setAttribute('aria-label', t(`nav.${view}`))
    },
    /** Skip link target: the active view's heading, else the main region. */
    focusMain() {
      const el = DSHMap.views[router.view]?.el
      const target = el?.querySelector('h1') ?? this.els.viewHost
      if (!target.hasAttribute('tabindex')) target.tabIndex = -1
      target.focus()
    },
    relocalize() {
      document.title = `${t(`nav.${router.view}`)} · ${t('brand')}`
      for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n)
      const lb = document.getElementById('lang-btn')
      lb.textContent = t('lang.other')
      lb.title = t('lang.toggle')
      const tb = document.getElementById('theme-btn')
      tb.title = theme.label()
      tb.setAttribute('aria-label', theme.label())
      lb.setAttribute('aria-label', t('lang.toggle'))
      lb.lang = i18n.lang === 'uk' ? 'en' : 'uk'
      for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria))
      for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle)
      this.renderNav()
      this.renderCrumbs()
      DSHMap.model.rebuildSearch?.()
      // Only the visible view is rebuilt now; the others are marked stale and
      // rebuild when shown next (4.5). Their state lives in the route.
      for (const [id] of VIEW_ORDER) {
        const v = DSHMap.views[id]
        if (v?.inited && id !== router.shown) v.stale = true
      }
      const cur = router.shown && DSHMap.views[router.shown]
      if (cur?.inited) {
        cur.dispose?.()
        clear(cur.el)
        cur.inited = true
        cur.init(cur.el)
        this.ensureHeading(router.shown)
        cur.show?.(router.params)
      } else if (router.view && !router.shown) this.showPending(router.view)
      drawer.rerender()
      palette.relocalize()
    },
  }

  // ── drawer ──────────────────────────────────────────────────────────────
  const drawer = DSHMap.drawer = {
    el: null,
    isOpen: false,
    ref: null,
    mount(el) {
      this.el = el
      this.head = h('div', { class: 'drawer-head' })
      this.body = h('div', { class: 'drawer-body' })
      // Non-modal: the map and lists stay usable beside it; focus moves in on open and back on close.
      this.dialog = DSHMap.a11y.dialog(el, { modal: false, label: t('a11y.detail') })
      el.setAttribute('aria-hidden', 'true')
      el.inert = true
      const resize = h('div', { class: 'drawer-resize', role: 'separator', 'aria-orientation': 'vertical', 'aria-label': t('a11y.resize'), tabindex: '0' })
      el.append(resize, this.head, this.body)
      resize.addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        const cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--drawer-w'), 10) || 480
        const w = Math.max(360, Math.min(window.innerWidth - 200, cur + (e.key === 'ArrowLeft' ? 40 : -40)))
        document.documentElement.style.setProperty('--drawer-w', `${w}px`)
        util.storage.set('drawerWidth', w)
        DSHMap.emit('drawer-resize')
      })
      const saved = util.storage.get('drawerWidth', null)
      if (saved) document.documentElement.style.setProperty('--drawer-w', `${saved}px`)
      resize.addEventListener('mousedown', e => {
        e.preventDefault()
        const move = ev => {
          const w = Math.max(360, Math.min(window.innerWidth - 200, window.innerWidth - ev.clientX))
          document.documentElement.style.setProperty('--drawer-w', `${w}px`)
        }
        const up = () => {
          document.removeEventListener('mousemove', move)
          document.removeEventListener('mouseup', up)
          util.storage.set('drawerWidth', parseInt(getComputedStyle(document.documentElement).getPropertyValue('--drawer-w'), 10))
          DSHMap.emit('drawer-resize')
        }
        document.addEventListener('mousemove', move)
        document.addEventListener('mouseup', up)
      })
    },
    syncFromParams(params) {
      const ref = params.d ?? null
      if (ref === this.ref) return
      if (!ref) { this._close(); return }
      this.ref = ref
      this.render()
      if (!this.isOpen) {
        this.isOpen = true
        this.el.classList.add('open')
        this.el.removeAttribute('aria-hidden')
        this.el.inert = false
      }
      // Move focus in when the panel opened from a user action (not on page load).
      if (document.activeElement && document.activeElement !== document.body && !this.el.contains(document.activeElement)) this.dialog.open(this.head.querySelector('.d-focus') ?? this.el.querySelector('.d-title') ?? this.el)
      else if (this.el.contains(document.activeElement)) this.el.querySelector('.d-title')?.focus({ preventScroll: true })
      DSHMap.emit('drawer', ref)
    },
    open(ref) { router.setParams({ d: ref }) },
    close() { router.setParams({ d: null }) },
    /** Earlier panel steps are earlier history entries (router.entryState): Back is the browser Back. */
    canGoBack() { return (history.state?.dDepth ?? 1) > 1 },
    back() {
      if (this.canGoBack()) history.back()
      else this.close()
    },
    _close() {
      this.ref = null
      if (this.isOpen) {
        this.isOpen = false
        this.el.classList.remove('open')
        this.dialog.close()
        this.el.setAttribute('aria-hidden', 'true')
        this.el.inert = true
      }
      DSHMap.emit('drawer', null)
    },
    rerender() { if (this.ref) this.render() },
    render() {
      const ref = this.ref
      clear(this.head)
      const back = this.canGoBack()
      this.head.append(
        h('button', { class: 'icon-btn', title: t('back'), 'aria-label': t('back'), onclick: () => this.back(), disabled: back ? null : true }, svgIcon('back')),
        h('div', { class: 'grow' }),
        h('button', { class: 'icon-btn', title: t('close'), 'aria-label': t('close'), onclick: () => this.close() }, svgIcon('x')),
      )
      clear(this.body)
      this.body.scrollTop = 0
      // The panel shows the whole entity: wait for the detail part, Markdown and its borrowed sections (4.1, 4.2).
      if (!views.panelReady()) {
        this.body.appendChild(DSHMap.ui.skeleton('detail', { status: true }))
        const retry = () => views.preparePanel().then(
          () => { if (this.ref === ref) this.render() },
          err => { if (this.ref === ref) clear(this.body).appendChild(DSHMap.ui.errorState(err, { retry: () => { clear(this.body).appendChild(DSHMap.ui.skeleton('detail', { status: true })); retry() } })) })
        retry()
        return
      }
      DSHMap.detail.render(ref, this.body)
      this.labelFromTitle()
    },
    /** Name the panel after the entity title (detail renders it, possibly late). */
    labelFromTitle() {
      const title = this.body.querySelector('.d-title')
      if (!title) { this.el.removeAttribute('aria-labelledby'); this.el.setAttribute('aria-label', t('a11y.detail')); return }
      title.id ||= DSHMap.a11y.id('d-title')
      title.tabIndex = -1
      this.el.setAttribute('aria-labelledby', title.id)
      this.el.removeAttribute('aria-label')
    },
  }

  // ── tooltip ─────────────────────────────────────────────────────────────
  const tooltip = DSHMap.tooltip = {
    el: null,
    mount() { this.el = h('div', { class: 'tooltip' }); document.body.appendChild(this.el) },
    show(content, x, y) {
      clear(this.el)
      if (typeof content === 'string') this.el.textContent = content
      else this.el.appendChild(content)
      this.el.classList.add('show')
      this.move(x, y)
    },
    move(x, y) {
      const r = this.el.getBoundingClientRect()
      let left = x + 14, top = y + 14
      if (left + r.width > window.innerWidth - 8) left = x - r.width - 14
      if (top + r.height > window.innerHeight - 8) top = y - r.height - 14
      this.el.style.left = `${Math.max(8, left)}px`
      this.el.style.top = `${Math.max(8, top)}px`
    },
    hide() { this.el?.classList.remove('show') },
  }

  // ── command palette ─────────────────────────────────────────────────────
  const TYPE_ICON = { symbol: 'ƒ', slot: 'UI', extension: 'EXT', skill: 'SK', config: 'CFG', capability: 'CAP', command: '/', env: '$', scenario: 'REC', package: 'PK', group: 'GR', service: 'ctx', event: 'EV', sessionEvent: 'LOG', tool: 'TL', profile: 'PR', file: 'F', doc: 'DOC', note: 'ADR', term: 'Aa', tour: '▶', rule: 'RL', process: 'PS', flow: 'FL' }
  /** Debounce of the search input (4.3): a burst of keystrokes runs one query. */
  const SEARCH_DEBOUNCE = 100
  const palette = DSHMap.palette = {
    isOpen: false,
    results: [],
    active: 0,
    /** Lazily loaded indexes that failed: kind → error (shown with Retry, 4.3). */
    issues: new Map(),
    seq: 0,
    mount() {
      // Combobox pattern: focus stays in the input, aria-activedescendant names the active option.
      this.input = h('input', {
        type: 'text', placeholder: t('search.placeholder'), spellcheck: 'false', autocomplete: 'off',
        role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'palette-results', 'aria-autocomplete': 'list', 'aria-label': t('a11y.search'),
      })
      this.list = h('div', { class: 'palette-results', id: 'palette-results', role: 'listbox', 'aria-label': t('a11y.results') })
      this.notice = h('div', { class: 'palette-notice', hidden: true })
      this.status = h('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite' })
      this.foot = h('div', { class: 'palette-foot', 'aria-hidden': 'true' })
      this.box = h('div', { class: 'palette' },
        h('div', { class: 'palette-input' }, svgIcon('search'), this.input, h('kbd', { 'aria-hidden': 'true' }, 'Esc')),
        this.notice, this.list, this.status, this.foot)
      this.overlay = h('div', { class: 'overlay' }, this.box)
      this.overlay.addEventListener('click', e => { if (e.target === this.overlay) this.close() })
      document.body.appendChild(this.overlay)
      this.dialog = DSHMap.a11y.dialog(this.box, { label: t('a11y.search'), initial: () => this.input })
      this.renderFoot()
      const debounced = util.debounce(() => this.run(), SEARCH_DEBOUNCE)
      this.input.addEventListener('input', () => { this.active = 0; this.dirty = true; debounced() })
      this.input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1) }
        // Enter right after typing: wait for the query of the current text.
        else if (e.key === 'Enter') { e.preventDefault(); (this.dirty ? this.run() : Promise.resolve()).then(() => this.pick(this.results[this.active])) }
      })
      // One listener for the whole list: hovering moves the active option, nothing re-renders.
      this.list.addEventListener('mousemove', e => {
        const row = e.target.closest?.('.palette-item')
        if (!row) return
        const i = Number(row.dataset.i)
        if (i !== this.active) { this.active = i; this.markActive() }
      })
      this.list.addEventListener('click', e => {
        const row = e.target.closest?.('.palette-item')
        if (row) this.pick(this.results[Number(row.dataset.i)])
      })
      // New parts of the model widen the index: refresh an open palette.
      DSHMap.on('search-index', () => { if (this.isOpen) { this.loadIndexes(); this.run() } })
    },
    renderFoot() {
      clear(this.foot).append(
        h('span', null, h('kbd', null, '↑'), ' ', h('kbd', null, '↓'), ' ', t('search.hint.move')),
        h('span', null, h('kbd', null, '↵'), ' ', t('search.hint.open')),
        h('span', null, h('kbd', null, 'Esc'), ' ', t('search.hint.close')),
      )
    },
    relocalize() {
      this.input.placeholder = t('search.placeholder')
      this.input.setAttribute('aria-label', t('a11y.search'))
      this.box.setAttribute('aria-label', t('a11y.search'))
      this.list.setAttribute('aria-label', t('a11y.results'))
      this.renderFoot()
      this.renderNotice()
    },
    toggle() { this.isOpen ? this.close() : this.open() },
    open() {
      this.isOpen = true
      this.overlay.classList.add('open')
      this.input.value = ''
      this.results = []
      this.run()
      this.dialog.open(this.input)
      this.loadIndexes()
      // The entity index comes with the `model` part (4.1): fetch it now if the page has not yet.
      if (!DSHMap.model.ready.has('model')) DSHMap.data.need(['model']).catch(err => { this.issues.set('model', err); this.renderNotice() })
    },
    /** Files (tree.js) and public symbols (symbols.js) load on first open. */
    loadIndexes() {
      const M = DSHMap.model
      const want = [['tree', 'tree', `${M.meta.dataPath}/tree.js`, () => M.ensureFileIndex()]]
      // The symbol file is named by the `model` part.
      const symFile = M.data.evolution?.symbols?.file
      if (symFile) want.push(['symbols', 'symbols', symFile, () => M.ensureSymbolIndex()])
      for (const [issue, kind, src, ensure] of want) {
        if (DSHMap.store[kind]) { ensure(); continue }
        this.issues.delete(issue)
        DSHMap.load(kind, null, src).then(() => { ensure(); this.renderNotice(); if (this.isOpen) this.run() }, err => { this.issues.set(issue, err); this.renderNotice() })
      }
      this.renderNotice()
    },
    /** What the results do not cover yet: indexes still loading or failed to load (with Retry). */
    renderNotice() {
      const n = clear(this.notice)
      const parts = []
      if (!DSHMap.model.ready.has('model') && !this.issues.has('model')) parts.push(h('span', { class: 'faint' }, t('search.indexing')))
      for (const [kind, err] of this.issues) {
        parts.push(h('span', { class: 'palette-issue', role: 'alert' }, svgIcon('info'), t(`search.failed.${kind}`), ' ',
          h('button', { class: 'link-btn', title: String(err?.message ?? err), onclick: () => this.retry(kind) }, t('ui.retry'))))
      }
      n.hidden = !parts.length
      n.append(...parts)
    },
    retry(kind) {
      this.issues.delete(kind)
      if (kind === 'model') DSHMap.data.need(['model']).catch(err => { this.issues.set('model', err); this.renderNotice() })
      else this.loadIndexes()
      this.renderNotice()
      this.input.focus()
    },
    close() { this.isOpen = false; this.overlay.classList.remove('open'); this.dialog.close() },
    move(d) {
      if (!this.results.length) return
      this.active = (this.active + d + this.results.length) % this.results.length
      this.markActive()
    },
    /** Move the active option: only the previous and the new row change. */
    markActive() {
      const prev = this.activeEl
      const el = this.list.querySelector(`#po-${this.active}`)
      if (prev && prev !== el) { prev.classList.remove('active'); prev.setAttribute('aria-selected', 'false') }
      this.activeEl = el
      if (el) {
        el.classList.add('active')
        el.setAttribute('aria-selected', 'true')
        this.input.setAttribute('aria-activedescendant', el.id)
        el.scrollIntoView({ block: 'nearest' })
      } else this.input.removeAttribute('aria-activedescendant')
    },
    /** Query the index (in the search worker) and render the latest answer only. */
    run() {
      const q = this.input.value
      const seq = ++this.seq
      this.dirty = false
      const pending = q.trim() ? DSHMap.searcher.query(DSHMap.model, q) : Promise.resolve(defaultSuggestions())
      return pending.then(raw => {
        if (seq !== this.seq) return
        // Group by type, ordering groups by their best-scoring result.
        const order = []
        const byType = new Map()
        for (const it of raw) {
          if (!byType.has(it.type)) { byType.set(it.type, []); order.push(it.type) }
          byType.get(it.type).push(it)
        }
        this.results = order.flatMap(tp => byType.get(tp))
        if (this.active >= this.results.length) this.active = 0
        this.renderList()
      })
    },
    renderList() {
      clear(this.list)
      this.activeEl = null
      this.input.removeAttribute('aria-activedescendant')
      const announce = () => { this.status.textContent = this.results.length ? t('a11y.results.count', { n: this.results.length }) : t('search.empty') }
      clearTimeout(this.statusTimer)
      this.statusTimer = setTimeout(announce, 350)
      if (!this.results.length) { this.list.appendChild(h('div', { class: 'empty', role: 'presentation' }, t('search.empty'))); return }
      let group = null
      const q = this.input.value.trim()
      const frag = document.createDocumentFragment()
      this.results.forEach((it, i) => {
        if (it.type !== group?.dataset.type) {
          const gid = `pg-${i}`
          group = h('div', { role: 'group', 'aria-labelledby': gid, 'data-type': it.type },
            h('div', { class: 'palette-group', id: gid, role: 'presentation' }, t(`type.${it.type}`)))
          frag.appendChild(group)
        }
        // Options are not focusable: the input keeps focus. Clicks and hover are delegated to the list.
        const row = h('div', { class: 'palette-item', id: `po-${i}`, role: 'option', 'aria-selected': 'false', tabindex: '-1', 'data-i': i },
          h('div', { class: 'pi-icon', 'aria-hidden': 'true', style: it.color ? `--pi-c:${it.color}` : null }, TYPE_ICON[it.type] ?? '•'),
          h('div', { class: 'pi-main' },
            h('div', { class: 'pi-title', html: highlight(it.title, q) }),
            h('div', { class: 'pi-sub' }, it.sub ?? '')))
        group.appendChild(row)
      })
      this.list.appendChild(frag)
      this.markActive()
    },
    pick(it) {
      if (!it) return
      this.close()
      const nav = DSHMap.nav
      switch (it.type) {
        case 'package': nav.openPackage(it.id); break
        case 'group': nav.openGroup(it.id); break
        case 'service': nav.openService(it.id); break
        case 'event': nav.openEvent(it.id); break
        case 'sessionEvent': nav.openSessionEvent(it.id); break
        case 'tool': nav.openTool(it.id); break
        case 'profile': nav.openProfile(it.id); break
        case 'file': nav.openFile(it.id); break
        case 'doc': case 'note': nav.openDoc(it.id); break
        case 'term': nav.openTerm(it.id); break
        case 'tour': nav.openTour(it.id); break
        case 'rule': nav.openRule(it.id); break
        case 'process': nav.openProcess(it.id); break
        case 'flow': nav.openFlow(it.id); break
        case 'capability': nav.openCapability(it.id); break
        case 'command': nav.openCommand(it.id); break
        case 'env': nav.openEnv(it.id); break
        case 'scenario': nav.openScenario(it.id); break
        case 'slot': nav.openSlot(it.id); break
        case 'extension': nav.openExtension(it.id); break
        case 'skill': nav.openSkill(it.id); break
        case 'config': nav.openConfigKey(it.pkg, it.field); break
        case 'symbol': nav.openSymbol(it.row); break
        default: break
      }
    },
  }

  /** Header select of archived data versions (data/versions.js); hidden with a single version. */
  function versionPicker() {
    const list = DSHMap.store.versions ?? []
    if (list.length < 2) return null
    const current = DSHMap.model.meta.versionId
    const label = v => `${v.id === 'latest' ? t('version.latest') : v.id}${v.version && v.id !== v.version ? ` · ${v.version}` : ''}`
    return h('select', {
      class: 'input version-select', title: t('version.label'),
      onchange: e => {
        const url = new URL(location.href)
        if (e.target.value === 'latest') url.searchParams.delete('version')
        else url.searchParams.set('version', e.target.value)
        location.href = url.toString()
      },
    }, list.map(v => h('option', { value: v.id, selected: v.id === current }, label(v))))
  }

  /**
   * Breadcrumb items of a route: [{ label, href?, mono?, group?, title? }].
   * Group › View › Tab › Entity, then the entity of the detail panel.
   */
  function crumbsOf(view, p) {
    const M = DSHMap.model
    const V = DSHMap.views
    const out = []
    const gid = groupOf(view)
    if (gid) out.push({ label: t(`nav.group.${gid}`), group: true })
    out.push({ label: t(`nav.${view}`), href: router.href(view) })
    const tab = (label, params) => out.push({ label, href: router.href(view, params) })
    const ent = (label, mono = false) => { if (label) out.push({ label, mono }) }
    // Tabs and entities come from the view (and the model): none while it loads.
    switch (V[view] && M.ready.has('model') ? view : null) {
      case 'architecture': {
        const tb = V.architecture.tab(p)
        tab(t(`arch.tab.${tb}`), { tab: tb })
        if (tb === 'flows') ent(i18n.pick(M.flowById.get(p.flow)?.title))
        if (tb === 'processes') ent(i18n.pick(M.processById.get(p.process)?.title))
        if (tb === 'rules') ent(i18n.pick(M.ruleById.get(p.rule)?.title))
        break
      }
      case 'usage': {
        const tb = V.usage.tab(p)
        tab(t(`usage.tab.${tb}`), { tab: tb })
        if (tb === 'capabilities' && p.cap) ent(i18n.pick(M.capById.get(p.cap)?.title) || p.cap)
        if (tb === 'disk' && p.env) ent(`$${p.env}`, true)
        if (tb === 'model' && p.profile) ent(`dsh --profile ${p.profile}${p.preset ? ` · ${p.preset}` : ''}`, true)
        break
      }
      case 'customize': {
        const tb = V.customize.tab(p)
        tab(t(`cz.tab.${tb}`), { tab: tb })
        if (tb === 'slots') ent(p.slot, true)
        else if (tb === 'recipes') ent(p.track)
        else if (tb === 'sandbox' || tb === 'config') ent(p.profile ? `dsh --profile ${p.profile}` : null, true)
        else ent(p.x ?? p.ev ?? p.cfg, true)
        break
      }
      case 'evolution': {
        const tb = V.evolution.tab(p)
        tab(t(`evo.tab.${tb}`), { tab: tb })
        if (tb === 'changes' && p.from && p.to) ent(`${p.from} → ${p.to}`, true)
        if (tb === 'format') ent(p.ev, true)
        if (tb === 'stability' && p.kind) ent(t(`stab.kind.${p.kind}`))
        break
      }
      case 'events': {
        const tb = V.events.tab(p)
        tab(t(`ev.tab.${tb}`), { tab: tb })
        ent(p.name, true)
        break
      }
      case 'docs': {
        const c = V.docs.coll(p)
        tab(t(`docs.tab.${c}`), { c })
        if (p.term) ent(p.term)
        else if (p.doc) { const d = M.docById.get(p.doc); ent(d?.label ?? d?.title ?? p.doc) }
        break
      }
      case 'composition': {
        const name = M.profileByName.has(p.profile) ? p.profile : M.profileOrder[0]
        tab(`dsh --profile ${name}`, { profile: name })
        if (p.tab) ent(t(`comp.tab.${p.tab}`))
        break
      }
      case 'services': ent(p.key ? `ctx.${p.key}` : null, true); break
      case 'tools': ent(p.key ? M.toolByKey.get(p.key)?.name ?? p.key : null, true); break
      case 'scenarios': ent(p.id ? M.scenarioById.get(p.id)?.name ?? p.id : null); break
      case 'code': {
        const segs = (p.path ?? '').split('/').filter(Boolean)
        segs.forEach((s, i) => out.push({ label: s, mono: true, href: router.href('code', { path: segs.slice(0, i + 1).join('/') }) }))
        break
      }
      default: break
    }
    if (p.d) {
      const i = p.d.indexOf(':')
      const type = p.d.slice(0, i), id = p.d.slice(i + 1)
      const label = type === 'pkg' ? M.pkgById.get(id)?.short ?? id : id
      out.push({ label, mono: true, title: t(type === 'pkg' ? 'type.package' : 'type.group') })
    }
    return out
  }

  function defaultSuggestions() {
    const M = DSHMap.model
    const pick = M.overview.searchSuggestions
    const out = M.searchItems.filter(it => (it.type === 'package' && pick.packages.includes(it.id)) || (it.type === 'service' && pick.services.includes(it.id)) || it.type === 'profile')
    return out.sort((a, b) => ['profile', 'package', 'service'].indexOf(a.type) - ['profile', 'package', 'service'].indexOf(b.type))
  }

  function highlight(title, q) {
    const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
    if (!q) return esc(title)
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length)
    // One alternation pass over the raw title (longest token first), escaping
    // the pieces afterwards, so every token is marked and none matches inside
    // an entity or an earlier <mark>.
    const re = new RegExp(`(${tokens.map(util.reEscape).join('|')})`, 'ig')
    return title.split(re).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join('')
  }

  // ── small shared widgets ────────────────────────────────────────────────
  DSHMap.ui = {
    /** Short global notice (bottom centre), announced politely. */
    toast(text) {
      let el = document.getElementById('toast')
      if (!el) { el = h('div', { class: 'toast', id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(el) }
      el.textContent = text
      el.classList.add('show')
      clearTimeout(el._timer)
      el._timer = setTimeout(() => el.classList.remove('show'), 2200)
    },
    /**
     * Keep a text filter in the route (2.2): typing rewrites `key` of the
     * current history entry, then calls onChange. The returned function puts
     * the route's value back into the input (show, Back/Forward, links) and
     * says whether it changed.
     */
    bindFilter(input, key, onChange, ms = 120) {
      input.addEventListener('input', util.debounce(() => { router.replace({ [key]: input.value.trim() ? input.value : null }); onChange() }, ms))
      return params => {
        const v = params[key] ?? ''
        if (input.value === v) return false
        input.value = v
        return true
      }
    },
    /** Pick the listed keys of the current route (filters to carry into a new entry). */
    keepParams(...keys) {
      return Object.fromEntries(keys.filter(k => router.params[k] !== undefined).map(k => [k, router.params[k]]))
    },
    /** Clickable package chip with layer dot. */
    pkgChip(id, opts = {}) {
      const M = DSHMap.model
      const p = M.pkgById.get(id)
      if (!p) return h('span', { class: 'chip mono' }, id)
      return h('button', {
        class: 'chip link mono',
        title: p.role ?? p.description ?? p.id,
        onclick: e => { e.stopPropagation(); (opts.onClick ?? (() => DSHMap.nav.openPackage(id)))() },
      }, h('span', { class: 'dot', style: `background:${M.colorOf(p)}` }), p.short, opts.suffix ? h('span', { class: 'count' }, opts.suffix) : null)
    },
    chipList(ids, render, limit = 40) {
      const wrap = h('div', { class: 'chips' })
      const list = [...ids]
      const show = list.slice(0, limit)
      show.forEach(x => wrap.appendChild(render(x)))
      if (list.length > limit) {
        // The rest renders in frame-sized chunks so a list of thousands never blocks input (4.4).
        const more = h('button', {
          class: 'chip link',
          onclick: () => {
            const focus = more === document.activeElement
            more.remove()
            let i = limit
            const chunk = () => {
              const frag = document.createDocumentFragment()
              const end = Math.min(list.length, i + 200)
              for (; i < end; i++) frag.appendChild(render(list[i]))
              const first = frag.firstChild
              wrap.appendChild(frag)
              if (focus && end === Math.min(list.length, limit + 200)) first?.focus?.()
              if (i < list.length) requestAnimationFrame(chunk)
            }
            chunk()
          },
        }, t('more', { n: list.length - limit }))
        wrap.appendChild(more)
      }
      return wrap
    },
    svcChip(key) {
      return h('button', { class: 'chip link mono', onclick: e => { e.stopPropagation(); DSHMap.nav.openService(key) } }, `ctx.${key}`)
    },
    eventChip(name) {
      const ev = DSHMap.model.evByName.get(name)
      return h('button', { class: 'chip link mono', title: ev?.mode ?? '', onclick: e => { e.stopPropagation(); DSHMap.nav.openEvent(name) } }, name)
    },
    sessionEventChip(name) {
      return h('button', { class: 'chip link mono', onclick: e => { e.stopPropagation(); DSHMap.nav.openSessionEvent(name) } }, name)
    },
    toolChip(key, label) {
      return h('button', { class: 'chip link mono', onclick: e => { e.stopPropagation(); DSHMap.nav.openTool(key) } }, label)
    },
    /** Highlighted code block. */
    code(text, lang) {
      const code = h('code', { class: lang ? `language-${lang}` : null })
      code.textContent = text
      if (lang) this.highlight(code, lang)
      return h('pre', { class: 'code' }, code)
    },
    /**
     * Syntax-highlight a <code> element. highlight.js loads on the first code
     * block (4.1): until then the block shows plain text.
     */
    highlight(code, lang) {
      const run = () => {
        if (!lang || !hljs.getLanguage(lang)) return
        try { code.innerHTML = hljs.highlight(code.textContent, { language: lang, ignoreIllegals: true }).value } catch { /* plain text fallback */ }
      }
      if (window.hljs) run()
      else DSHMap.vendor.need(['hljs']).then(run, () => { /* stays plain */ })
    },
    /** Inline Markdown subset of curated text: `code` spans only. */
    mdInline(text) {
      const out = []
      String(text ?? '').split(/(`[^`]+`)/).forEach(part => out.push(part.startsWith('`') && part.endsWith('`') ? h('code', null, part.slice(1, -1)) : part))
      return h('span', null, out)
    },
    /** Markdown → sanitized element; relative links resolve against baseDir. */
    markdown(md, baseDir) {
      const el = h('div', { class: 'md' })
      if (!md) return el
      let html = md
      try { html = window.marked ? marked.parse(md, { gfm: true }) : md } catch { html = md }
      html = window.DOMPurify ? DOMPurify.sanitize(html, { ADD_ATTR: ['target'] }) : ''
      el.innerHTML = html
      for (const pre of el.querySelectorAll('pre code')) {
        const cls = [...pre.classList].find(c => c.startsWith('language-'))
        const lang = cls?.slice(9)
        if (lang && lang !== 'mermaid') DSHMap.ui.highlight(pre, lang)
      }
      for (const a of el.querySelectorAll('a[href]')) DSHMap.ui.wireLink(a, baseDir)
      DSHMap.ui.anchorHeadings(el)
      DSHMap.ui.autolink(el)
      for (const code of el.querySelectorAll('pre code.language-mermaid')) DSHMap.ui.mermaidBlock(code.textContent, code.parentElement)
      for (const img of el.querySelectorAll('img[src]')) {
        const src = img.getAttribute('src')
        if (!/^(https?:|data:)/.test(src)) img.remove()
      }
      return el
    },
    /** Route Markdown links: package READMEs open in the drawer, sources in the viewer, the rest on GitHub. */
    wireLink(a, baseDir) {
      const href = a.getAttribute('href')
      if (/^(https?:|mailto:)/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; return }
      if (href.startsWith('#')) {
        // In-document anchor: scroll within the rendered Markdown.
        a.addEventListener('click', e => {
          e.preventDefault()
          const target = a.closest('.md')?.querySelector(`[id="${CSS.escape(decodeURIComponent(href.slice(1)))}"]`)
          target?.scrollIntoView({ behavior: DSHMap.a11y.reducedMotion() ? 'auto' : 'smooth', block: 'start' })
        })
        return
      }
      const [pathPart, frag] = href.split('#')
      const resolved = resolvePath(baseDir ?? '', pathPart)
      const M = DSHMap.model
      a.addEventListener('click', e => {
        e.preventDefault()
        if (M.docById.has(resolved)) { DSHMap.nav.openDoc(`${resolved}${frag ? `#${frag}` : ''}`); return }
        const pkg = M.packages.find(p => resolved === `${p.dir}/README.md` || resolved === p.dir || resolved === `${p.dir}/`)
        if (pkg) { DSHMap.nav.openPackage(pkg.id); return }
        const grp = M.groups.find(g => resolved === `${g.path}/README.md`)
        if (grp) { DSHMap.nav.openGroup(grp.id); return }
        const owner = M.pkgOfPath(resolved)
        if (owner && /\.[a-z0-9]+$/i.test(resolved)) { DSHMap.nav.openFile(resolved); return }
        window.open(/\.[a-z0-9]+$/i.test(resolved) ? M.github(resolved) : M.githubTree(resolved), '_blank', 'noopener')
      })
      a.title = resolved
    },
    githubLink(path, label, line) {
      return h('a', { class: 'btn small', href: DSHMap.model.github(path, line), target: '_blank', rel: 'noopener' }, svgIcon('external'), label ?? t('d.github'))
    },
    sourceLink(path, line) {
      // Prefer the in-map viewer when the file is embedded in a package.
      const M = DSHMap.model
      const owner = M.pkgOfPath(path)
      return h('a', {
        class: 'mono small', href: M.github(path, line), target: '_blank', rel: 'noopener',
        onclick: owner ? (e => { e.preventDefault(); DSHMap.nav.openFile(path, { line }) }) : null,
      }, `${path}${line ? `:${line}` : ''}`)
    },
    stateBadge(state) {
      return h('span', { class: ['state', state] }, t(`comp.state.${state}`))
    },
    /** Tooltip text of a package's presence in a profile (see model.presence). */
    presenceTitle(pres) {
      if (!pres) return ''
      if (pres.state !== 'dep') return t(`comp.state.${pres.state}`)
      const M = DSHMap.model
      const via = pres.via.map(id => M.pkgById.get(id)?.short ?? id).join(', ')
      return `${t('presence.dep', { via })}${pres.cond ? ` (${t('presence.dep.cond')})` : ''}`
    },
    sparkline(monthly, months, opts = {}) {
      const w = opts.w ?? 240, hh = opts.h ?? 36
      const vals = months.map(m => monthly?.[m] ?? 0)
      const max = Math.max(1, ...vals)
      const bw = w / vals.length
      const color = opts.color ?? 'var(--accent)'
      const bars = vals.map((v, i) => `<rect x="${(i * bw + 1).toFixed(1)}" y="${(hh - (v / max) * (hh - 2)).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${((v / max) * (hh - 2)).toFixed(1)}" rx="1.5" fill="${color}"><title>${months[i]}: ${v}</title></rect>`).join('')
      const el = h('div', { html: `<svg class="spark" width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}">${bars}</svg>` })
      return el
    },
  }

  DSHMap.ui.langColor = lang => colors.lang(lang)

  function resolvePath(base, rel) {
    if (!rel) return base
    if (rel.startsWith('/')) return rel.slice(1)
    const parts = base ? base.split('/') : []
    for (const seg of rel.split('/')) {
      if (seg === '..') parts.pop()
      else if (seg !== '.' && seg !== '') parts.push(seg)
    }
    return parts.join('/')
  }
  DSHMap.util.resolvePath = resolvePath
})()
