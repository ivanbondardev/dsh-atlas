/* DSH Map — source viewer: package file tree + highlighted file contents.
 * TypeScript files get symbol navigation from the package detail file
 * (phase 4.3): imported names link to their definition, exported
 * declarations list the packages that import them. */
(function () {
  'use strict'
  // Light builds: file text fetched from GitHub, by repository path.
  const remoteCache = new Map()
  const remoteFailed = new Map()
  const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|icns|woff2?|ttf|otf|pdf|zip|gz|tgz|zst|wasm|node|exe|dll|xlsx|docx|pptx)$/i
  const { h, clear, svgIcon, t, fmt } = DSHMap

  const HLJS_LANG = {
    ts: 'typescript', mts: 'typescript', cts: 'typescript', tsx: 'typescript',
    js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown', yaml: 'yaml', yml: 'yaml', css: 'css', scss: 'scss',
    html: 'xml', svg: 'xml', xml: 'xml', plist: 'xml', py: 'python', sh: 'bash', bash: 'bash', zsh: 'bash',
    swift: 'swift', toml: 'ini', ini: 'ini', patch: 'diff', diff: 'diff', rs: 'rust', c: 'c', h: 'c', cpp: 'cpp',
    m: 'objectivec', mm: 'objectivec', ps1: 'powershell', sql: 'sql',
  }
  const extOf = path => {
    const base = path.split('/').pop()
    if (base === 'Makefile') return 'makefile'
    const i = base.lastIndexOf('.')
    return i > 0 ? base.slice(i + 1).toLowerCase() : ''
  }

  const viewer = DSHMap.viewer = {
    isOpen: false,
    pkg: null,
    detail: null,
    path: null,
    mode: 'rendered',
    /** Files left by "go to definition", for the back button. */
    trail: [],
    mount() {
      this.title = h('h2', { class: 'path', id: 'viewer-title' })
      this.meta = h('div', { class: 'faint small nowrap' })
      this.actions = h('div', { class: 'row' })
      this.tree = h('nav', { class: 'viewer-tree', 'aria-label': t('a11y.viewer.tree') })
      // Up to ~600 files per package: the tree renders virtually (4.4) and moves focus by row.
      this.vtree = DSHMap.ui.virtual({ host: this.tree, nav: true, estimate: 26, key: r => r.key, render: r => this.treeRow(r) })
      // Scrollable code region: focusable so it scrolls from the keyboard.
      this.code = h('div', { class: 'viewer-code', tabindex: '0', role: 'region', 'aria-labelledby': 'viewer-title' })
      this.box = h('div', { class: 'viewer' },
        h('div', { class: 'viewer-head' }, svgIcon('file'), this.title, this.meta, this.actions,
          h('button', { class: 'icon-btn', title: t('close'), 'aria-label': t('close'), onclick: () => this.close() }, svgIcon('x'))),
        h('div', { class: 'viewer-body' }, this.tree, this.code))
      this.overlay = h('div', { class: 'overlay' }, this.box)
      this.overlay.addEventListener('click', e => { if (e.target === this.overlay) this.close() })
      document.body.appendChild(this.overlay)
      this.dialog = DSHMap.a11y.dialog(this.box, { labelledby: 'viewer-title', initial: () => this.code })
    },
    /**
     * The route owns the viewer (2.2): ?file=<path>&line=<n>. Opening,
     * switching files and closing go through the router, so Back closes the
     * viewer or returns to the file left by "go to definition".
     */
    syncFromParams(params) {
      const file = params.file ?? null
      const line = params.line ? Number(params.line) || null : null
      if (!file) { if (this.isOpen) this.hide(); this.requested = null; this.trail = []; return }
      const key = `${file}:${line ?? ''}`
      if (this.isOpen && key === this.requested) return
      this.requested = key
      // Back/Forward onto a file of the definition trail keeps the trail.
      const top = this.trail[this.trail.length - 1]
      let fromSymbol = this.following
      if (!fromSymbol && top && top.path === file) { this.trail.pop(); fromSymbol = true }
      this.following = false
      this.open(file, { line, fromSymbol })
    },
    async open(path, opts = {}) {
      const M = DSHMap.model
      if (!opts.fromSymbol) this.trail = []
      this.isOpen = true
      this.overlay.classList.add('open')
      this.dialog.open()
      this.path = path
      this.line = opts.line ?? null
      this.mode = 'rendered'
      clear(this.code).appendChild(h('div', { class: 'loading' }, h('div', { class: 'spinner' }), t('loading')))
      this.vtree.update([])
      this.renderHead(null)
      // The owner package comes from the `model` part, rendered Markdown needs marked and
      // symbol uses come from the evolution view (4.1).
      try { await DSHMap.viewLoader.preparePanel() } catch (e) {
        if (this.path === path) clear(this.code).appendChild(DSHMap.ui.errorState(e, { retry: () => this.open(path, opts) }))
        return
      }
      if (this.path !== path) return
      const owner = M.pkgOfPath(path)
      if (!owner) {
        this.pkg = null; this.detail = null
        this.tree.classList.add('hidden')
        this.renderFile()
        return
      }
      this.tree.classList.remove('hidden')
      try {
        const detail = await DSHMap.load('pkg', owner.id, owner.detail)
        if (this.path !== path) return
        this.pkg = owner
        this.detail = detail
        // Fall back to a sensible file when the requested one is unknown.
        const rel = path.slice(owner.dir.length + 1)
        if (!detail.files.some(f => f[0] === rel)) {
          const pick = detail.files.find(f => f[0] === 'src/index.ts') ?? detail.files.find(f => f[0] === 'README.md') ?? detail.files[0]
          if (pick && (rel === '' || rel === 'src/index.ts' || !rel.includes('.'))) this.path = `${owner.dir}/${pick[0]}`
        }
        this.renderTree()
        this.renderFile()
      } catch (e) {
        if (this.path === path) clear(this.code).appendChild(DSHMap.ui.errorState(e, { retry: () => this.open(path, opts) }))
      }
    },
    close() {
      if (DSHMap.router.params.file) DSHMap.router.setParams({ file: null, line: null })
      else this.hide()
    },
    hide() { this.isOpen = false; this.overlay.classList.remove('open'); this.code.querySelector('.viewer-pop')?.remove(); this.dialog.close() },
    /** Record the shown file in the route without re-opening it. */
    rememberFile() {
      this.requested = `${this.path}:${this.line ?? ''}`
      DSHMap.router.replace({ file: this.path, line: this.line ?? null })
    },
    renderHead(info) {
      const M = DSHMap.model
      this.title.textContent = this.path
      this.meta.textContent = info ? [info.lines ? t('viewer.lines', { n: fmt.num(info.lines) }) : null, fmt.bytes(info.bytes)].filter(Boolean).join(' · ') : ''
      clear(this.actions)
      if (this.trail.length) {
        const prev = this.trail[this.trail.length - 1]
        this.actions.appendChild(h('button', { class: 'btn small', title: `${t('viewer.back')}: ${prev.path}`, onclick: () => history.back() }, svgIcon('back'), prev.path.split('/').pop()))
      }
      const rec = this.symbolsOf()
      if (rec) this.actions.appendChild(h('span', { class: 'faint tiny nowrap' }, t('viewer.syms', { i: rec.i.length, e: rec.e.length })))
      const ext = extOf(this.path)
      if (info?.text && (ext === 'md' || ext === 'svg')) {
        this.actions.appendChild(h('div', { class: 'seg' },
          h('button', { class: this.mode === 'rendered' ? 'on' : null, onclick: () => { this.mode = 'rendered'; this.renderFile() } }, t('viewer.rendered')),
          h('button', { class: this.mode === 'source' ? 'on' : null, onclick: () => { this.mode = 'source'; this.renderFile() } }, t('viewer.source'))))
      }
      this.actions.append(
        DSHMap.ui.copyButton(() => this.path, { iconOnly: true }),
        h('a', { class: 'btn small', href: M.github(this.path, this.line), target: '_blank', rel: 'noopener' }, svgIcon('external'), 'GitHub'))
    },
    /** Flat rows of the package tree: open directories show their children (4.4). */
    renderTree() {
      if (this.treePkg !== this.pkg.id) {
        const root = {}
        for (const f of this.detail.files) {
          const parts = f[0].split('/')
          let node = root
          for (let i = 0; i < parts.length - 1; i++) node = (node[parts[i] + '/'] ??= {})
          node[parts[parts.length - 1]] = f
        }
        this.treeRoot = root
        this.treePkg = this.pkg.id
        this.openDirs = new Set(['src/'])
      }
      const activeRel = this.path.slice(this.pkg.dir.length + 1)
      const segs = activeRel.split('/')
      for (let i = 1; i < segs.length; i++) this.openDirs.add(segs.slice(0, i).join('/') + '/')
      this.activeRel = activeRel
      const rows = [{ key: ':pkg', kind: 'pkg' }]
      const walk = (node, depth, prefix) => {
        const entries = Object.entries(node).sort(([a], [b]) => {
          const ad = a.endsWith('/'), bd = b.endsWith('/')
          if (ad !== bd) return ad ? -1 : 1
          return a < b ? -1 : 1
        })
        for (const [name, val] of entries) {
          if (name.endsWith('/')) {
            const full = prefix + name
            const open = this.openDirs.has(full)
            rows.push({ key: `d:${full}`, kind: 'dir', name, full, depth, open })
            if (open) walk(val, depth + 1, full)
          } else rows.push({ key: `f:${val[0]}`, kind: 'file', name, f: val, depth })
        }
      }
      walk(this.treeRoot, 0, '')
      this.treeRows = rows
      this.vtree.update(rows)
      const at = rows.findIndex(r => r.kind === 'file' && r.f[0] === activeRel)
      if (at >= 0) requestAnimationFrame(() => this.vtree.scrollTo(at))
    },
    treeRow(r) {
      if (r.kind === 'pkg') return h('button', { class: 't dir', onclick: () => DSHMap.nav.openPackage(this.pkg.id) }, svgIcon('box', ''), this.pkg.short)
      if (r.kind === 'dir') {
        return h('button', {
          class: 't dir', style: `--depth:${r.depth}`, 'aria-expanded': String(r.open),
          onclick: () => {
            if (r.open) this.openDirs.delete(r.full); else this.openDirs.add(r.full)
            this.renderTree()
            const i = this.treeRows.findIndex(x => x.key === r.key)
            if (i >= 0) this.vtree.focusIndex(i)
          },
        }, h('span', { 'aria-hidden': 'true' }, r.open ? '▾' : '▸'), r.name.slice(0, -1))
      }
      const rel = r.f[0]
      const isActive = rel === this.activeRel
      return h('button', {
        class: ['t', 'leaf', isActive ? 'active' : null], 'aria-current': isActive ? 'page' : null, style: `--depth:${r.depth}`, title: rel,
        onclick: () => {
          this.path = `${this.pkg.dir}/${rel}`; this.line = null; this.mode = 'rendered'; this.rememberFile(); this.renderTree(); this.renderFile()
          const i = this.treeRows.findIndex(x => x.key === r.key)
          if (i >= 0) this.vtree.focusIndex(i)
        },
      }, h('span', { class: 'truncate' }, r.name), h('span', { class: 'l' }, r.f[3] === 't' ? 'test' : r.f[1] ? fmt.compact(r.f[1]) : ''))
    },
    renderFile() {
      const M = DSHMap.model
      clear(this.code)
      this.code.scrollTop = 0
      const rel = this.pkg ? this.path.slice(this.pkg.dir.length + 1) : null
      const entry = this.detail?.files.find(f => f[0] === rel)
      const text = (rel !== null ? this.detail?.sources?.[rel] : undefined) ?? remoteCache.get(this.path)
      this.renderHead(entry ? { lines: entry[1], bytes: entry[2], text } : null)
      if (text === undefined || text === null) {
        const binary = entry && !entry[1] && entry[2]
        // Light builds embed no file text: fetch it from GitHub at the generated commit.
        if (M.meta.sourceBase && !binary && !BINARY_EXT.test(this.path) && !remoteFailed.has(this.path)) {
          const wanted = this.path
          this.code.appendChild(h('div', { class: 'loading' }, h('div', { class: 'spinner' }), t('viewer.remote.loading')))
          fetch(`${M.meta.sourceBase}${wanted.split('/').map(encodeURIComponent).join('/')}`)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text() })
            .then(body => { remoteCache.set(wanted, body) })
            .catch(err => { remoteFailed.set(wanted, String(err.message ?? err)) })
            .finally(() => { if (this.isOpen && this.path === wanted) this.renderFile() })
          return
        }
        if (remoteFailed.has(this.path)) this.code.appendChild(h('p', { class: 'viewer-note faint small' }, t('viewer.remote.failed', { err: remoteFailed.get(this.path) })))
        this.code.appendChild(h('div', { class: 'viewer-note' },
          h('p', null, binary ? t('viewer.binary') : t('viewer.notEmbedded')),
          h('a', { class: 'btn primary', href: M.github(this.path, this.line), target: '_blank', rel: 'noopener' }, svgIcon('external'), 'GitHub')))
        return
      }
      const ext = extOf(this.path)
      if (ext === 'md' && this.mode === 'rendered') {
        const dir = this.path.split('/').slice(0, -1).join('/')
        const md = text.startsWith('---\n') ? text.slice(text.indexOf('\n---', 4) + 4) : text
        this.code.appendChild(h('div', { class: 'viewer-md' }, DSHMap.ui.markdown(md, dir)))
        return
      }
      if (ext === 'svg' && this.mode === 'rendered') {
        this.code.appendChild(h('div', { class: 'viewer-img' }, h('img', { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`, alt: this.path })))
        return
      }
      const lang = HLJS_LANG[ext] ?? (ext === 'makefile' ? 'makefile' : null)
      // highlight.js loads with the first highlighted file (4.1); symbol links follow the highlighting.
      if (lang && !window.hljs && !this.noHljs && text.length < 200000) {
        const wanted = this.path
        this.code.appendChild(DSHMap.ui.loading())
        DSHMap.vendor.need(['hljs']).catch(() => { this.noHljs = true /* plain text from now on */ }).finally(() => { if (this.isOpen && this.path === wanted) this.renderFile() })
        return
      }
      const codeEl = h('code')
      if (window.hljs && lang && hljs.getLanguage(lang) && text.length < 200000) {
        try { codeEl.innerHTML = hljs.highlight(text, { language: lang, ignoreIllegals: true }).value } catch { codeEl.textContent = text }
      } else codeEl.textContent = text
      const n = text.endsWith('\n') ? text.split('\n').length - 1 : text.split('\n').length
      const gutter = h('div', { class: 'gutter' }, Array.from({ length: Math.max(1, n) }, (_, i) => i + 1).join('\n'))
      const lines = h('div', { class: 'code-lines' }, gutter, h('pre', { class: 'hljs' }, codeEl))
      this.code.appendChild(lines)
      this.linkSymbols(codeEl)
      if (this.line) {
        requestAnimationFrame(() => {
          const lh = parseFloat(getComputedStyle(gutter).lineHeight) || 20
          const top = 12 + (this.line - 1) * lh
          lines.appendChild(h('div', { class: 'line-band', style: `top:${top}px;height:${lh}px` }))
          this.code.scrollTop = Math.max(0, top - this.code.clientHeight / 3)
        })
      }
    },

    /** Symbol record of the open file: { i: imports, e: exports } (see generator build.mjs pkgSymbols). */
    symbolsOf() {
      if (!this.pkg || !this.detail?.symbols) return null
      return this.detail.symbols.files?.[this.path.slice(this.pkg.dir.length + 1)] ?? null
    },

    /** Wrap imported names and exported declarations of the highlighted code in links. */
    linkSymbols(codeEl) {
      const rec = this.symbolsOf()
      if (!rec) return
      const S = this.detail.symbols
      const imports = new Map(rec.i.map(([local, , di]) => [local, di]))
      const exportsAt = new Map(rec.e.filter(([name]) => name !== 'default').map(([name, line]) => [`${name}@${line}`, name]))
      if (!imports.size && !exportsAt.size) return
      const ID = /[A-Za-z_$][\w$]*/g
      const walker = document.createTreeWalker(codeEl, NodeFilter.SHOW_TEXT)
      const jobs = []
      let line = 1
      let prevChar = ''
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.nodeValue
        const inert = n.parentElement?.closest('.hljs-comment, .hljs-string, .hljs-regexp')
        if (!inert) {
          const hits = []
          let ln = line, from = 0
          for (const m of text.matchAll(ID)) {
            for (let k = text.indexOf('\n', from); k >= 0 && k < m.index; k = text.indexOf('\n', k + 1)) ln++, from = k + 1
            const before = m.index ? text[m.index - 1] : prevChar
            if (before === '.' && !(m.index >= 3 && text.slice(m.index - 3, m.index) === '...')) continue
            const name = m[0]
            if (exportsAt.has(`${name}@${ln}`)) hits.push([m.index, name, 'def', ln])
            else if (imports.has(name)) hits.push([m.index, name, 'use', imports.get(name)])
          }
          if (hits.length) jobs.push([n, hits])
        }
        for (let k = text.indexOf('\n'); k >= 0; k = text.indexOf('\n', k + 1)) line++
        if (text) prevChar = text[text.length - 1]
      }
      const M = DSHMap.model
      for (const [node, hits] of jobs) {
        const text = node.nodeValue
        const frag = document.createDocumentFragment()
        let at = 0
        for (const [idx, name, kind, ref] of hits) {
          frag.appendChild(document.createTextNode(text.slice(at, idx)))
          if (kind === 'use') {
            const d = S.defs[ref]
            const owner = d[4] ? M.pkgById.get(d[4])?.short ?? d[4] : this.pkg.short
            frag.appendChild(h('span', { class: 'sym-link', role: 'link', title: `${t('sym.goto')} · ${owner}\n${d[3] ?? name}\n${d[0]}:${d[1]}`, onclick: e => { e.stopPropagation(); this.gotoDefinition(d, e.target) } }, name))
          } else {
            frag.appendChild(h('span', { class: 'sym-def', role: 'button', 'aria-haspopup': 'dialog', title: t('sym.uses'), onclick: e => { e.stopPropagation(); this.showUses(name, ref, e.target) } }, name))
          }
          at = idx + name.length
        }
        frag.appendChild(document.createTextNode(text.slice(at)))
        node.parentNode.replaceChild(frag, node)
      }
    },

    /** Follow an import to its definition [path, line, kind, signature, package]. */
    gotoDefinition(d, el) {
      const lineOf = this.lineAt(el)
      if (d[0] === this.path) { this.line = d[1]; this.rememberFile(); this.renderFile(); return }
      // The current entry keeps the line we left; the definition is a new entry.
      DSHMap.router.replace({ file: this.path, line: lineOf })
      this.trail.push({ path: this.path, line: lineOf })
      if (this.trail.length > 40) this.trail.shift()
      this.following = true
      DSHMap.router.setParams({ file: d[0], line: d[1] })
    },

    /** Line of an element inside the code block (1-based). */
    lineAt(el) {
      const pre = el.closest('code')
      if (!pre) return null
      const range = document.createRange()
      range.setStart(pre, 0)
      range.setEndBefore(el)
      return range.toString().split('\n').length
    },

    /** Popover with the importers of an exported declaration. */
    showUses(name, line, el) {
      this.code.querySelector('.viewer-pop')?.remove()
      const S = this.detail.symbols
      const row = (S.api ?? []).find(a => a[1] === this.path && a[2] === line && (a[0] === name || a[0].endsWith(`:${name}`)))
      const close = () => { pop.remove(); if (el.isConnected) el.focus() }
      const pop = h('div', { class: 'viewer-pop', role: 'dialog', 'aria-label': `${t('sym.uses')}: ${name}` },
        h('button', { class: 'icon-btn viewer-pop-close', title: t('close'), 'aria-label': t('close'), onclick: close }, svgIcon('x')),
        row && DSHMap.evolution ? DSHMap.evolution.usesCard(this.pkg.id, row[0], this.detail) : h('div', { class: 'small faint viewer-pop-note' }, h('b', { class: 'mono' }, name), h('p', null, t('sym.internal'))))
      const host = el.closest('.code-lines')
      pop.style.top = `${el.offsetTop + el.offsetHeight + 4}px`
      host.appendChild(pop)
      pop.addEventListener('click', e => e.stopPropagation())
      pop.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close() } })
      pop.querySelector('button')?.focus()
    },
  }
})()
