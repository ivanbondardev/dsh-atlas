/* DSH Map — namespace, data channel, DOM and formatting helpers.
 * Classic script (no modules) so the site also works from file:// URLs.
 * Data files call DSHMap.receive(kind, key, payload). */
(function () {
  'use strict'

  const store = { main: null, pkg: new Map(), doc: new Map(), snap: new Map(), snapClass: new Map(), fp: new Map(), tree: null, versions: null, docsSearch: null, fpIndex: null, symbols: null }
  /** Data kinds delivered as a single payload (key null). */
  const SINGLE = new Set(['tree', 'docsSearch', 'fpIndex', 'symbols'])
  const waiters = new Map()
  const listeners = new Map()
  const loadedScripts = {}
  // index.html defines a stub that queues data scripts arriving before this file (4.1).
  const early = window.DSHMap ?? {}
  /** Build stamp of the app scripts: lazily loaded views and libraries carry it too. */
  const STAMP = (() => {
    try { return new URL(document.currentScript.src).searchParams.get('v') } catch { return null /* no stamp: plain URLs */ }
  })()
  /** A script that has not loaded after this long counts as failed (4.2): the page offers Retry. */
  const LOAD_TIMEOUT = 45000

  /**
   * Insert a classic script (works from file:// URLs). Rejects on error or
   * after LOAD_TIMEOUT; the element is removed then, so a retry starts afresh.
   */
  function insertScript(src, onTimeout) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = src
      s.async = true
      const timer = setTimeout(() => { s.remove(); onTimeout?.(); reject(new Error(DSHMap.t('err.timeout', { src: src.split('?')[0] }))) }, LOAD_TIMEOUT)
      s.onload = () => { clearTimeout(timer); resolve() }
      s.onerror = () => { clearTimeout(timer); s.remove(); reject(new Error(DSHMap.t('err.load', { src: src.split('?')[0] }))) }
      document.head.appendChild(s)
    })
  }

  const DSHMap = window.DSHMap = {
    store,
    views: {},
    STAMP,

    /** Called by every generated data script. */
    receive(kind, key, payload) {
      if (kind === 'main') store.main = payload
      else if (kind === 'part') data.apply(key, payload)
      else if (kind === 'tree') store.tree = payload
      else if (kind === 'pkg') store.pkg.set(key, payload)
      else if (kind === 'versions') store.versions = payload
      else if (kind === 'doc') store.doc.set(key, payload)
      else if (kind === 'docsSearch') store.docsSearch = payload
      else if (kind === 'snap') store.snap.set(key, payload)
      else if (kind === 'snapClass') store.snapClass.set(key, payload)
      else if (kind === 'fp') store.fp.set(key, payload)
      else if (kind === 'fpIndex') store.fpIndex = payload
      else if (kind === 'symbols') store.symbols = payload
      const w = waiters.get(`${kind}:${key ?? ''}`)
      if (w) { waiters.delete(`${kind}:${key ?? ''}`); w.forEach(([fn]) => fn(payload)) }
      if (kind === 'main') DSHMap.emit('data-core')
    },

    /**
     * Load a data script once and resolve with its payload.
     * @param {string} kind 'pkg' | 'tree' | 'doc' | 'docsSearch' | 'snap' | 'snapClass' | 'fp' | 'fpIndex' | 'symbols' | 'part'
     * @param {string|null} key package id for 'pkg', document path for 'doc', scenario id for 'snap', header class for 'snapClass', version id for 'fp', part name for 'part'
     * @param {string} src relative script URL
     */
    load(kind, key, src) {
      const have = kind === 'part' ? data.loaded.has(key) || null : SINGLE.has(kind) ? store[kind] : store[kind] instanceof Map ? store[kind].get(key) : null
      if (have) return Promise.resolve(have)
      const id = `${kind}:${key ?? ''}`
      return new Promise((resolve, reject) => {
        const first = !waiters.has(id)
        if (first) waiters.set(id, [])
        waiters.get(id).push([resolve, reject])
        if (!first) return
        // Version lazily loaded data with the build stamp so a regenerated map is never mixed with cached files.
        const v = store.main?.meta?.generatedAt
        const fail = err => { const w = waiters.get(id) ?? []; waiters.delete(id); w.forEach(([, rej]) => rej(err)) }
        insertScript(v ? `${src}?v=${encodeURIComponent(v)}` : src).then(() => {
          // A script that loaded without calling receive() (wrong or stale file).
          if (waiters.has(id)) fail(new Error(DSHMap.t('err.load', { src })))
        }, fail)
      })
    },

    /** Load a third-party or app script once (lazily loaded libraries and views). */
    loadScript(src) {
      loadedScripts[src] ??= insertScript(STAMP && !src.includes('?') ? `${src}?v=${encodeURIComponent(STAMP)}` : src).catch(err => { delete loadedScripts[src]; throw err })
      return loadedScripts[src]
    },

    on(evt, fn) {
      if (!listeners.has(evt)) listeners.set(evt, new Set())
      listeners.get(evt).add(fn)
      return () => listeners.get(evt).delete(fn)
    },
    emit(evt, payload) {
      for (const fn of listeners.get(evt) ?? []) {
        try { fn(payload) } catch (e) { console.error(e) }
      }
    },
  }

  // ── data parts (UI/UX roadmap 4.1) ───────────────────────────────────
  /**
   * The main model arrives in parts (generator/lib/split.mjs): `core` with
   * dsh-data.js (header, "Start here"), then `model` (entity lists: indexes,
   * search, overview, map) and `detail` (heavy per-entity fields merged into
   * the `model` entities by position). Builds without meta.parts (archived
   * versions) are whole: every part counts as loaded.
   */
  const PART_ORDER = ['core', 'model', 'detail']
  const at = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)
  const data = DSHMap.data = {
    loaded: new Set(),
    pending: new Map(),
    ALL: ['model', 'detail'],
    has(name) {
      if (name === 'core') return !!store.main
      return this.loaded.has(name) || (!!store.main && !store.main.meta?.parts)
    },
    hasAll(names) { return names.every(n => this.has(n)) },
    /** Merge a part into store.main (same rules as mergePart in generator/lib/split.mjs). */
    apply(name, payload) {
      const main = store.main
      if (!main || this.loaded.has(name)) return
      if (name === 'detail') {
        for (const [dotted, rows] of Object.entries(payload)) {
          const target = at(main, dotted)
          if (target == null) continue
          if (Array.isArray(target)) rows.forEach((row, i) => { if (row && target[i]) Object.assign(target[i], row) })
          else Object.assign(target, rows)
        }
      } else Object.assign(main, payload)
      this.loaded.add(name)
      DSHMap.emit('data-part', name)
    },
    /**
     * Load parts (and the ones they build on) in order; resolves once all
     * are merged and the model has indexed them.
     * @param {string[]} names e.g. ['model'] or DSHMap.data.ALL
     */
    need(names = this.ALL) {
      const want = PART_ORDER.filter(n => n !== 'core' && PART_ORDER.indexOf(n) <= Math.max(...names.map(x => PART_ORDER.indexOf(x))))
      return want.reduce((p, n) => p.then(() => this.one(n)), Promise.resolve())
    },
    one(name) {
      if (this.has(name)) return Promise.resolve()
      if (!this.pending.has(name)) {
        const file = store.main?.meta?.parts?.[name]
        const dir = store.main?.meta?.dataPath ?? 'data'
        DSHMap.emit('data-loading', name)
        const p = DSHMap.load('part', name, `${dir}/${file}`)
          .then(() => { this.pending.delete(name) }, err => { this.pending.delete(name); DSHMap.emit('data-failed', name); throw err })
        this.pending.set(name, p)
      }
      return this.pending.get(name)
    },
    /** Stages for the loading indicator: [{ name, done, active }]. */
    stages() { return PART_ORDER.map(n => ({ name: n, done: this.has(n), active: this.pending.has(n) })) },
  }

  // ── lazily loaded libraries (4.1) ────────────────────────────────────
  /**
   * Vendored libraries load on the first view that needs them. Markdown
   * (marked + DOMPurify) is small and shared by most views; Cytoscape, D3,
   * highlight.js, js-yaml and Mermaid wait for their views.
   */
  const VENDORS = {
    md: ['vendor/marked.umd.js', 'vendor/purify.min.js'],
    cytoscape: ['vendor/cytoscape.min.js'],
    d3: ['vendor/d3.min.js'],
    hljs: ['vendor/highlight.min.js'],
    yaml: ['vendor/js-yaml.min.js'],
    mermaid: ['vendor/mermaid.min.js'],
  }
  const vendorReady = { md: () => window.marked && window.DOMPurify, cytoscape: () => window.cytoscape, d3: () => window.d3, hljs: () => window.hljs, yaml: () => window.jsyaml, mermaid: () => window.mermaid }
  DSHMap.vendor = {
    has(name) { return !!vendorReady[name]?.() },
    need(names) {
      return Promise.all(names.map(n => (this.has(n) ? null : Promise.all(VENDORS[n].map(src => DSHMap.loadScript(src))).then(() => { if (n === 'md') window.marked?.setOptions?.({ gfm: true, breaks: false }); DSHMap.emit('vendor', n) })))).then(() => undefined)
    },
  }

  // ── DOM helpers ───────────────────────────────────────────────────────
  /**
   * Create an element. attrs: class, style (string|object), on<Event>, dataset,
   * html (trusted/sanitized markup only), title, any attribute.
   */
  function h(tag, attrs, ...children) {
    const el = tag === 'svg' || attrs?.svg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag)
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false || k === 'svg') continue
        if (k === 'class') el.setAttribute('class', Array.isArray(v) ? v.filter(Boolean).join(' ') : v)
        else if (k === 'style') {
          if (typeof v === 'string') el.style.cssText = v
          else for (const [sk, sv] of Object.entries(v)) { if (sv !== undefined && sv !== null) el.style.setProperty(sk, sv) }
        } else if (k === 'dataset') Object.assign(el.dataset, v)
        else if (k === 'html') el.innerHTML = v
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v)
        else if (v === true) el.setAttribute(k, '')
        else el.setAttribute(k, v)
      }
    }
    append(el, children)
    if (typeof attrs?.onclick === 'function' && !isInteractive(el)) makeOperable(el, attrs)
    return el
  }

  // Elements that take focus and activate with the keyboard on their own.
  const INTERACTIVE = new Set(['button', 'input', 'select', 'textarea', 'summary', 'option', 'label'])
  function isInteractive(el) {
    const tag = el.tagName.toLowerCase()
    return INTERACTIVE.has(tag) || (tag === 'a' && el.hasAttribute('href'))
  }
  /** Dev builds: served from a local host or opened with ?dev. */
  const DEV = (() => {
    try { return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || new URLSearchParams(location.search).has('dev') } catch { return false }
  })()
  const warned = new Set()
  /**
   * Keyboard fallback for a click handler on a non-interactive tag: focusable,
   * Enter/Space activate it. Without an explicit `role` it is a bug (use
   * <button> or <a href>), reported once per class in dev builds; an explicit
   * role (e.g. tr rows, symbol links inside code) marks the choice as deliberate.
   */
  function makeOperable(el, attrs) {
    const tag = el.tagName.toLowerCase()
    // Clickable table rows are a deliberate pattern: the row keeps its role and
    // gets keyboard access (each row also links its entity elsewhere in the page).
    if (!attrs.role && tag !== 'tr') {
      // List items and cells keep their structural role.
      if (tag !== 'li' && tag !== 'td' && tag !== 'th') el.setAttribute('role', 'button')
      if (DEV) {
        const key = `${tag}.${el.getAttribute('class') ?? ''}`
        if (!warned.has(key)) { warned.add(key); console.warn(`[a11y] onclick on <${tag}${el.className ? ` class="${el.className}"` : ''}>: use <button> or <a href>`, el) }
      }
    }
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0
    el.addEventListener('keydown', e => {
      if (e.target !== el || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click() }
    })
  }
  function append(el, children) {
    for (const c of children) {
      if (c === null || c === undefined || c === false) continue
      if (Array.isArray(c)) append(el, c)
      else if (c instanceof Node) el.appendChild(c)
      else el.appendChild(document.createTextNode(String(c)))
    }
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el }
  function svgIcon(name, cls) {
    const span = document.createElement('span')
    span.innerHTML = ICONS[name] ?? ''
    const svg = span.firstElementChild
    if (svg && cls) svg.setAttribute('class', cls)
    // Icons are decorative: controls carry their own text or aria-label.
    if (svg) { svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false') }
    return svg ?? span
  }

  // Lucide-style 24px stroke icons (MIT-compatible shapes drawn for this app).
  const S = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
  const ICONS = {
    logo: `<svg viewBox="0 0 32 32" fill="none"><rect x="1" y="1" width="30" height="30" rx="8" fill="url(#lg)"/><defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32"><stop style="stop-color:var(--logo-a)"/><stop offset="1" style="stop-color:var(--logo-b)"/></linearGradient></defs><g stroke="white" stroke-width="1.8" stroke-linecap="round"><path d="M10 11.5 16 9l6 2.5M10 11.5v8M22 11.5v8M10 19.5l6 3 6-3M16 9v13.5" opacity=".55"/></g><g fill="white"><circle cx="16" cy="9" r="2.4"/><circle cx="10" cy="11.5" r="2"/><circle cx="22" cy="11.5" r="2"/><circle cx="10" cy="19.5" r="2"/><circle cx="22" cy="19.5" r="2"/><circle cx="16" cy="22.5" r="2.4"/></g></svg>`,
    home: S('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>'),
    map: S('<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="7" r="2.5"/><circle cx="12" cy="17" r="2.5"/><circle cx="4.5" cy="17.5" r="1.5"/><path d="M8.2 7.2 10.8 15M15.9 8.8l-2.7 6M8.5 6.2l7-.9M6 17.5h3.5"/>'),
    layers: S('<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/><path d="m3 17.5 9 5 9-5" opacity=".6"/>'),
    plug: S('<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0V8z"/><path d="M12 17v4"/>'),
    zap: S('<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>'),
    tool: S('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z"/>'),
    code: S('<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>'),
    clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    search: S('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon: S('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
    refresh: S('<path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5"/>'),
    monitor: S('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'),
    x: S('<path d="M18 6 6 18M6 6l12 12"/>'),
    back: S('<path d="M15 18l-6-6 6-6"/>'),
    plus: S('<path d="M12 5v14M5 12h14"/>'),
    minus: S('<path d="M5 12h14"/>'),
    fit: S('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    target: S('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
    external: S('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    file: S('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
    folder: S('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    book: S('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>'),
    sidebar: S('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'),
    shuffle: S('<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'),
    image: S('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>'),
    copy: S('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
    git: S('<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 8.5v7M18 11.5c0 4-6 3-10.5 5.5"/>'),
    globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
    filter: S('<path d="M3 5h18l-7 8v6l-4 2v-8z"/>'),
    box: S('<path d="m21 8-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>'),
    grid: S('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
    download: S('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
    terminal: S('<path d="m4 17 6-5-6-5M12 19h8"/>'),
    list: S('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
    compass: S('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
    flow: S('<rect x="3" y="3" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M6 8v4a2 2 0 0 0 2 2h8a2 2 0 0 1 2 2"/>'),
    doc: S('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
    flag: S('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'),
    play: S('<path d="m7 4 13 8-13 8z"/>'),
    next: S('<path d="m9 18 6-6-6-6"/>'),
    shield: S('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>'),
    film: S('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
    key: S('<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.2-8.2M16 7l3 3M14 9l2 2"/>'),
    disk: S('<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>'),
    eye: S('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    pause: S('<path d="M8 5v14M16 5v14"/>'),
    chevron: S('<path d="m6 9 6 6 6-6"/>'),
    link: S('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    sliders: S('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
  }

  // ── formatting ────────────────────────────────────────────────────────
  const fmt = {
    num(n) {
      if (n === null || n === undefined || Number.isNaN(n)) return '—'
      return Math.round(n).toLocaleString(DSHMap.i18n?.locale() ?? 'uk-UA').replace(/,/g, ' ')
    },
    compact(n) {
      if (n === null || n === undefined) return '—'
      const k = ['', DSHMap.t('fmt.k'), DSHMap.t('fmt.m')]
      if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}${k[2]}`
      if (n >= 1e4) return `${(n / 1e3).toFixed(0)}${k[1]}`
      if (n >= 1e3) return `${(n / 1e3).toFixed(1)}${k[1]}`
      return String(n)
    },
    bytes(b) {
      if (b === null || b === undefined) return '—'
      const u = DSHMap.t('fmt.bytes').split(' ')
      let i = 0
      while (b >= 1024 && i < u.length - 1) { b /= 1024; i++ }
      return `${b.toFixed(b >= 100 || i === 0 ? 0 : 1)} ${u[i]}`
    },
    date(iso) {
      if (!iso) return '—'
      const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
      return d.toLocaleDateString(DSHMap.i18n?.locale() ?? 'uk-UA', { year: 'numeric', month: 'short', day: 'numeric' })
    },
    month(ym) {
      const d = new Date(`${ym}-01T00:00:00`)
      return d.toLocaleDateString(DSHMap.i18n?.locale() ?? 'uk-UA', { month: 'short', year: '2-digit' })
    },
    plural(n, forms) {
      // forms: { one, few, many } for uk; { one, other } for en
      const lang = DSHMap.i18n?.lang ?? 'uk'
      if (lang === 'uk') {
        const m10 = n % 10, m100 = n % 100
        if (m10 === 1 && m100 !== 11) return forms.one
        if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms.few
        return forms.many
      }
      return n === 1 ? forms.one : forms.other
    },
  }

  const util = {
    debounce(fn, ms) {
      let t
      return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) }
    },
    storage: {
      get(k, d) { try { const v = localStorage.getItem(`dshmap:${k}`); return v === null ? d : JSON.parse(v) } catch { return d } },
      set(k, v) { try { localStorage.setItem(`dshmap:${k}`, JSON.stringify(v)) } catch { /* storage unavailable */ } },
    },
    /** First sentence of a text, for compact summaries. */
    firstSentence(text, max = 180) {
      if (!text) return ''
      const clean = String(text).replace(/\s+/g, ' ').trim()
      const m = /^(.{20,}?[.!?])(\s|$)/.exec(clean)
      let s = m ? m[1] : clean
      if (s.length > max) s = `${s.slice(0, max - 1).trimEnd()}…`
      return s
    },
    /** Escape regex metacharacters. */
    reEscape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') },
    copy(text) {
      // The async API refuses without focus or permission (and on file:// in some browsers): fall back to a selection copy.
      const legacy = () => {
        const active = document.activeElement
        const ta = h('textarea', { class: 'sr-only', 'aria-hidden': 'true' }, text)
        document.body.appendChild(ta); ta.select()
        let ok = false
        try { ok = document.execCommand('copy') } finally { ta.remove(); active?.focus?.({ preventScroll: true }) }
        return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'))
      }
      if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).catch(legacy)
      return legacy()
    },
  }

  /** Append children like h() does: arrays flatten, null/false are skipped (native append prints "null"). */
  const appendAll = (el, ...children) => { append(el, children); return el }
  Object.assign(DSHMap, { h, clear, svgIcon, ICONS, fmt, util, append: appendAll })

  // Data scripts that ran before this file (index.html queues them).
  for (const args of early.queue ?? []) DSHMap.receive(...args)
  DSHMap.boot = early.boot ?? null
})()
