/* DSH Map — zoomable treemap of the whole repository. */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, fmt, util, i18n } = DSHMap

  // The route carries both (2.2); localStorage only seeds them when it does not.
  const METRICS = ['lines', 'bytes', 'files'], COLORS = ['lang', 'churn', 'area']
  const state = { metric: util.storage.get('code.metric', 'lines'), color: util.storage.get('code.color', 'lang') }
  function takeParams(params) {
    if (METRICS.includes(params.metric)) state.metric = params.metric
    if (COLORS.includes(params.color)) state.color = params.color
  }

  let root = null // { name, path, children?, lines, bytes, files, churn, langs, lang }

  /** Convert the compact tree into objects with aggregated statistics. */
  function buildTree() {
    const raw = DSHMap.store.tree
    const langs = raw.langs
    const conv = (node, prefix) => {
      if (node.length === 2) {
        const path = prefix ? `${prefix}/${node[0]}` : node[0]
        const d = { name: node[0], path, children: [], lines: 0, bytes: 0, files: 0, churn: 0, langs: {} }
        for (const c of node[1]) {
          const k = conv(c, path)
          d.children.push(k)
          d.lines += k.lines; d.bytes += k.bytes; d.files += k.files; d.churn += k.churn
          if (k.children) for (const [l, v] of Object.entries(k.langs)) d.langs[l] = (d.langs[l] ?? 0) + v
          else d.langs[k.lang] = (d.langs[k.lang] ?? 0) + Math.max(k.lines, 1)
        }
        let best = null, bv = -1
        for (const [l, v] of Object.entries(d.langs)) if (v > bv) { bv = v; best = l }
        d.lang = best
        return d
      }
      const path = prefix ? `${prefix}/${node[0]}` : node[0]
      return { name: node[0], path, lines: node[1], bytes: node[2], files: 1, lang: langs[node[3]], churn: node[4] }
    }
    root = conv(['source', raw.root], '')
    // The repository root has an empty path.
    root.path = ''
    const fix = (n, prefix) => { if (n.children) for (const c of n.children) { c.path = prefix ? `${prefix}/${c.name}` : c.name; fix(c, c.path) } }
    fix(root, '')
  }

  function findNode(path) {
    if (!path) return root
    let node = root
    for (const seg of path.split('/')) {
      const next = node.children?.find(c => c.name === seg)
      if (!next) return node
      node = next
    }
    return node
  }

  const metricOf = n => (state.metric === 'bytes' ? n.bytes : state.metric === 'files' ? n.files : n.lines)

  DSHMap.views.code = {
    scroll: false,
    init(el) {
      this.el = el
      el.appendChild(h('div', { class: 'code-view' },
        this.top = h('div', { class: 'code-top' }),
        h('div', { class: 'treemap-wrap' },
          this.tm = h('div', { class: 'treemap', role: 'group', 'aria-label': t('a11y.treemap'), 'aria-describedby': 'tm-kbd-help', onkeydown: e => this.onKey(e) }),
          h('p', { class: 'sr-only', id: 'tm-kbd-help' }, t('code.kbd.help')),
          this.side = h('div', { class: 'treemap-side' }))))
      this.ro = new ResizeObserver(util.debounce(() => { if (root && DSHMap.router.view === 'code') this.draw() }, 80))
      this.ro.observe(this.tm)
      this.offTheme = DSHMap.on('theme', () => { if (root) this.draw() })
    },
    dispose() { this.ro?.disconnect(); this.offTheme?.() },
    async show(params) {
      if (!root) {
        clear(this.tm).appendChild(DSHMap.ui.loading(t('code.loading')))
        try { await DSHMap.load('tree', null, `${DSHMap.model.meta.dataPath}/tree.js`) } catch (e) {
          clear(this.tm).appendChild(DSHMap.ui.errorState(e, { retry: () => this.show(DSHMap.router.params) }))
          return
        }
        buildTree()
      }
      takeParams(params)
      this.path = params.path ?? ''
      this.draw()
    },
    update(params, prev) {
      if (!root || (params.path === prev.path && params.metric === prev.metric && params.color === prev.color)) return
      takeParams(params)
      this.path = params.path ?? ''
      this.draw()
    },
    hide() { DSHMap.tooltip.hide() },

    go(path) { DSHMap.router.setParams({ path: path || null }) },

    draw() {
      const node = findNode(this.path)
      if (!node.children) {
        // A file path: show its folder and open the file in the viewer.
        DSHMap.router.go('code', { ...DSHMap.router.params, path: node.path.split('/').slice(0, -1).join('/') || null, file: node.path }, { replace: true })
        return
      }
      if (DSHMap.router.view === 'code' && (DSHMap.router.params.metric !== state.metric || DSHMap.router.params.color !== state.color)) DSHMap.router.replace({ metric: state.metric, color: state.color })
      this.renderTop(node)
      this.renderSide(node)
      this.renderMap(node)
    },
    renderTop(node) {
      // The folder path is in the global breadcrumbs (2.4).
      const segs = node.path ? node.path.split('/') : []
      const seg = (key, opts, label) => h('div', { class: 'seg', 'aria-label': label }, opts.map(([v, l]) => h('button', { class: state[key] === v ? 'on' : null, onclick: () => { state[key] = v; util.storage.set(`code.${key}`, v); this.draw() } }, l)))
      clear(this.top).append(
        h('button', { class: 'icon-btn', title: t('code.up'), 'aria-label': t('code.up'), 'aria-keyshortcuts': 'Backspace', onclick: () => this.go(segs.slice(0, -1).join('/')), disabled: segs.length ? null : true }, svgIcon('back')),
        h('span', { class: 'grow' }),
        h('span', { class: 'faint small' }, t('code.metric')),
        seg('metric', [['lines', t('code.metric.lines')], ['bytes', t('code.metric.bytes')], ['files', t('code.metric.files')]], t('code.metric')),
        h('span', { class: 'faint small' }, t('code.color')),
        seg('color', [['lang', t('code.color.lang')], ['churn', t('code.color.churn')], ['area', t('code.color.area')]], t('code.color')))
    },
    colorFn(node) {
      const M = DSHMap.model
      if (state.color === 'churn') {
        const max = Math.max(1, d3.max(collectFiles(root), f => f.churn))
        const scale = d3.scaleSequentialLog(d3.interpolateRgbBasis(DSHMap.colors.ramp('heat'))).domain([1, max]).clamp(true)
        return n => (n.children ? scale(Math.max(1, n.churn / Math.max(1, n.files))) : scale(Math.max(1, n.churn)))
      }
      if (state.color === 'area') {
        return n => {
          const parts = n.path.split('/')
          if (parts[0] === 'packages' && parts[1]) return M.groupColor(parts[1])
          return DSHMap.colors.area(parts[0])
        }
      }
      void node
      return n => DSHMap.ui.langColor(n.lang)
    },
    renderMap(node) {
      const box = clear(this.tm)
      const W = box.clientWidth, H = box.clientHeight
      if (!W || !H) return
      const hier = d3.hierarchy(node, d => d.children).sum(d => (d.children ? 0 : Math.max(0, metricOf(d)))).sort((a, b) => b.value - a.value)
      d3.treemap().size([W, H]).tile(d3.treemapSquarify.ratio(1.2)).paddingOuter(3).paddingTop(d => (d.depth === 1 && d.children ? 20 : 3)).paddingInner(2).round(true)(hier)
      const color = this.colorFn(node)
      const frag = document.createDocumentFragment()
      const nodes = hier.descendants().filter(d => d.depth >= 1 && d.depth <= 2)
      for (const d of nodes) {
        const w = d.x1 - d.x0, hh = d.y1 - d.y0
        if (w < 2 || hh < 2) continue
        const n = d.data
        const isFrame = d.depth === 1 && d.children
        // Tiles take roving focus (see onKey); the click handler below serves mouse and Enter.
        // White labels on dark tiles, dark labels on light ones (WCAG 1.4.3).
        const light = !isFrame && luminance(color(n)) > 0.19
        const el = h('div', {
          class: ['tm-node', n.children ? 'dir' : null, isFrame ? 'frame' : null, light ? 'light-bg' : null], role: 'button', tabindex: '-1', 'data-path': n.path,
          'aria-label': `${n.children ? t('type.dir') : t('type.file')} ${n.name}, ${valueLabel(n)}`,
          style: `left:${d.x0}px;top:${d.y0}px;width:${w}px;height:${hh}px;${isFrame ? '' : `background:${color(n)}`}`,
        })
        if (isFrame || w > 46 && hh > 18) {
          const label = h('div', { class: 'tm-label' }, n.name, (!isFrame && hh > 34 && w > 60) ? h('small', null, valueLabel(n)) : (isFrame ? h('span', { class: 'faint tm-frame-val' }, valueLabel(n)) : null))
          el.appendChild(label)
        }
        el.addEventListener('mousemove', e => { e.stopPropagation(); DSHMap.tooltip.show(tip(n), e.clientX, e.clientY) })
        el.addEventListener('mouseleave', () => DSHMap.tooltip.hide())
        el.addEventListener('focus', () => { const r = el.getBoundingClientRect(); DSHMap.tooltip.show(tip(n), r.left + r.width / 2, r.top + Math.min(r.height, 30)) })
        el.addEventListener('blur', () => DSHMap.tooltip.hide())
        el.addEventListener('click', e => {
          e.stopPropagation()
          DSHMap.tooltip.hide()
          if (n.children) this.go(n.path)
          else DSHMap.nav.openFile(n.path)
        })
        frag.appendChild(el)
      }
      box.appendChild(frag)
      // One tile in the Tab order: the folder we came back from, else the first one.
      const tiles = box.querySelectorAll('.tm-node')
      const back = this.returnPath && [...tiles].find(x => x.dataset.path === this.returnPath)
      const first = back ?? tiles[0]
      if (first) first.tabIndex = 0
      if (this.refocus && first) first.focus()
      this.refocus = false
      this.returnPath = null
    },
    /** Arrows: nearest tile in that direction; Enter: open (click); Backspace: one level up. */
    onKey(e) {
      const tile = e.target.closest?.('.tm-node')
      if (!tile || e.altKey || e.ctrlKey || e.metaKey) return
      const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key]
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.refocus = true; tile.click(); return }
      if (e.key === 'Backspace') {
        if (!this.path) return
        e.preventDefault()
        this.refocus = true
        this.returnPath = this.path
        this.go(this.path.split('/').slice(0, -1).join('/'))
        return
      }
      if (!dir) return
      e.preventDefault()
      const c = r => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 })
      const from = c(tile.getBoundingClientRect())
      let best = null
      for (const el of this.tm.querySelectorAll('.tm-node')) {
        if (el === tile) continue
        const p = c(el.getBoundingClientRect())
        const along = (p.x - from.x) * dir[0] + (p.y - from.y) * dir[1]
        const across = Math.abs((p.x - from.x) * dir[1] - (p.y - from.y) * dir[0])
        if (along <= 0) continue
        const score = along + across * 2
        if (!best || score < best.score) best = { el, score }
      }
      if (!best) return
      tile.tabIndex = -1
      best.el.tabIndex = 0
      best.el.focus()
    },
    renderSide(node) {
      const M = DSHMap.model
      const side = clear(this.side)
      const pkg = M.packages.find(p => p.dir === node.path)
      const grp = M.groups.find(g => g.path === node.path)
      side.append(
        h('div', { class: 'd-kicker' }, node.children ? t('type.dir') : t('type.file')),
        h('div', { class: 'tm-side-path' }, `${node.path || 'source'}/`),
        h('div', { class: 'stat-grid' },
          stat(fmt.num(node.files), t('code.files')),
          stat(fmt.num(node.lines), t('ov.area.lines')),
          stat(fmt.bytes(node.bytes), t('code.metric.bytes')),
          stat(fmt.num(node.churn), t('code.commits'))))
      if (pkg) side.appendChild(h('button', { class: 'btn small', onclick: () => DSHMap.nav.openPackage(pkg.id) }, svgIcon('box'), `${t('type.package')}: ${pkg.short}`))
      if (grp) side.appendChild(h('button', { class: 'btn small', onclick: () => DSHMap.nav.openGroup(grp.id) }, svgIcon('layers'), `${t('type.group')}: ${grp.id}`))
      if (!node.path && M.meta.areas) {
        // nothing extra at the repository root
      }
      const langs = Object.entries(node.langs).sort((a, b) => b[1] - a[1]).slice(0, 10)
      const total = langs.reduce((a, [, v]) => a + v, 0) || 1
      side.append(h('h5', null, t('code.languages')),
        h('div', { class: 'bar-list' }, langs.map(([l, v]) => h('div', { class: 'bar-item' },
          h('span', { class: 'bl mono' }, l),
          h('span', { class: 'bt' }, h('i', { style: `width:${(v / total * 100).toFixed(1)}%;background:${DSHMap.ui.langColor(l)}` })),
          h('span', { class: 'bv' }, `${(v / total * 100).toFixed(0)}%`)))))
      const files = collectFiles(node)
      const topBig = [...files].sort((a, b) => b.lines - a.lines).slice(0, 8)
      const topHot = [...files].sort((a, b) => b.churn - a.churn).slice(0, 8)
      const fileRows = (list, val) => h('div', { class: 'file-list' }, list.map(f => h('button', { class: 'f', title: f.path, onclick: () => DSHMap.nav.openFile(f.path) }, h('span', { class: 'n' }, f.path.slice(node.path ? node.path.length + 1 : 0)), h('span', { class: 'l' }, val(f)))))
      side.append(
        h('h5', null, t('code.largest')),
        fileRows(topBig, f => fmt.compact(f.lines)),
        h('h5', null, t('code.churn')),
        fileRows(topHot, f => `${f.churn}×`))
    },
  }

  const filesCache = new WeakMap()
  function collectFiles(node) {
    if (filesCache.has(node)) return filesCache.get(node)
    const out = []
    const walk = n => { if (n.children) n.children.forEach(walk); else out.push(n) }
    walk(node)
    filesCache.set(node, out)
    return out
  }

  /** WCAG relative luminance of a CSS colour. */
  function luminance(c) {
    const rgb = d3.rgb(c)
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b)
  }

  function stat(v, label) { return h('div', { class: 'stat' }, h('b', null, v), h('span', null, label)) }

  function valueLabel(n) {
    if (state.metric === 'bytes') return fmt.bytes(n.bytes)
    if (state.metric === 'files') return `${fmt.num(n.files)} ${t('code.files')}`
    return fmt.compact(n.lines)
  }

  function tip(n) {
    return h('div', null,
      h('div', { class: 'tt-title' }, h('span', { class: 'tt-swatch', style: `background:${DSHMap.ui.langColor(n.lang)}` }), n.name),
      h('div', { class: 'tt-sub' }, n.path),
      h('div', { class: 'tt-stats' },
        h('span', null, `${fmt.num(n.lines)} ${t('ov.area.lines')}`),
        h('span', null, fmt.bytes(n.bytes)),
        n.children ? h('span', null, `${fmt.num(n.files)} ${t('code.files')}`) : h('span', null, n.lang),
        h('span', null, `${fmt.num(n.churn)} ${t('code.commits')}`)))
  }
})()
