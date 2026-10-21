/* DSH Map — in-memory model: indexes, derived relations, colours, search. */
(function () {
  'use strict'
  const { t, i18n } = DSHMap

  /**
   * The model grows with the data parts (UI/UX roadmap 4.1, DSHMap.data):
   * `core` indexes the guide (tours, flows, rules, glossary), `model` every
   * entity list and the derived relations, `detail` the back-references from
   * document mentions. M.ready names the parts indexed so far; until a part
   * arrives its lists are empty, and views that need it wait (ui.js).
   */
  function build() {
    const D = DSHMap.store.main
    if (!D) throw new Error('dsh-data.js did not load')
    const M = { ready: new Set() }
    M.data = D
    buildCore(M, D)
    M.ready.add('core')
    const extend = () => {
      let changed = false
      if (!M.ready.has('model') && DSHMap.data.has('model')) { buildEntities(M, D); M.ready.add('model'); changed = true }
      if (M.ready.has('model') && !M.ready.has('detail') && DSHMap.data.has('detail')) { buildDetail(M); M.ready.add('detail'); changed = true }
      if (!changed) return
      M.rebuildSearch()
      DSHMap.emit('model', [...M.ready])
    }
    M.rebuildSearch = () => {
      const files = M.fileItems, symbols = M.symbolItems
      buildSearch(M)
      M.fileItems = files
      M.symbolItems = symbols
      DSHMap.emit('search-index')
    }
    buildSearch(M)
    extend()
    DSHMap.on('data-part', extend)
    return M
  }

  /** Part `core`: meta, layers, the guide and the glossary. */
  function buildCore(M, D) {
    M.meta = D.meta
    M.layers = D.layers
    M.layerById = new Map(D.layers.map(l => [l.id, l]))
    M.overview = D.overview
    M.health = D.health
    M.defaultProfile = D.overview.defaultProfile
    M.guide = D.guide
    M.vocab = D.guide.vocabulary
    M.planeById = new Map((M.vocab.planes ?? []).map(x => [x.id, x]))
    M.shapeById = new Map((M.vocab.shapes ?? []).map(x => [x.id, x]))
    M.eventDomainById = new Map((M.vocab.eventDomains ?? []).map(x => [x.id, x]))
    M.glossary = D.glossary ?? []
    M.tours = D.guide.tours
    M.tourById = new Map(M.tours.map(x => [x.id, x]))
    M.flowById = new Map(D.guide.flows.map(x => [x.id, x]))
    M.processById = new Map(D.guide.processes.map(x => [x.id, x]))
    M.ruleById = new Map(D.guide.rules.map(x => [x.id, x]))
    M.history = D.history
    M.edgeTypes = D.meta.edgeTypes
    M.isNote = id => id.startsWith('.agents/notes/')
    M.colorOfLayer = id => M.layerById.get(id)?.color ?? DSHMap.colors.get('c-unknown')
    const commit = M.meta.commit?.hash ?? 'HEAD'
    M.github = (path, line) => `${M.meta.repoUrl}/blob/${commit}/${path}${line ? `#L${line}` : ''}`
    M.githubTree = path => `${M.meta.repoUrl}/tree/${commit}/${path}`
    // Entity lists stay empty until the `model` part arrives.
    M.packages = []; M.pkgById = new Map(); M.groups = []; M.groupById = new Map()
    M.services = []; M.svcByKey = new Map(); M.clientServices = []; M.csByKey = new Map()
    M.events = []; M.evByName = new Map(); M.sessionEvents = []; M.seByName = new Map()
    M.tools = []; M.toolByKey = new Map(); M.slots = []; M.slotByKey = new Map()
    M.profiles = []; M.profileByName = new Map(); M.profileOrder = []
    M.docs = []; M.notes = []; M.docById = new Map(); M.gates = []; M.gateByName = new Map(); M.patterns = []
    M.capabilities = []; M.capById = new Map(); M.capsByPkg = new Map(); M.commands = []; M.envVars = []; M.envByName = new Map()
    M.scenarios = []; M.scenarioById = new Map(); M.headerClasses = []; M.classById = new Map()
    M.refs = { pkg: new Map(), svc: new Map(), event: new Map(), sessionEvent: new Map(), doc: new Map() }
    M.pkgOfPath = () => null
  }

  /** Part `detail`: back-references entity → documents / decisions mentioning it. */
  function buildDetail(M) {
    M.refs = { pkg: new Map(), svc: new Map(), event: new Map(), sessionEvent: new Map(), doc: new Map() }
    const addRef = (m, k, id) => { if (!m.has(k)) m.set(k, []); m.get(k).push(id) }
    for (const d of [...M.docs, ...M.notes]) {
      const mm = d.mentions
      if (!mm) continue
      mm.pkgs.forEach(k => addRef(M.refs.pkg, k, d.id))
      mm.svcs.forEach(k => addRef(M.refs.svc, k, d.id))
      mm.events.forEach(k => addRef(M.refs.event, k, d.id))
      mm.sessionEvents.forEach(k => addRef(M.refs.sessionEvent, k, d.id))
      mm.links.forEach(k => { if (k !== d.id) addRef(M.refs.doc, k, d.id) })
    }
  }

  /** Part `model`: entity lists, indexes and derived relations. */
  function buildEntities(M, D) {
    M.groups = D.groups
    M.groupById = new Map(D.groups.map(g => [g.id, g]))
    M.packages = D.packages
    M.pkgById = new Map(D.packages.map(p => [p.id, p]))
    M.services = D.services
    M.svcByKey = new Map(D.services.map(s => [s.key, s]))
    M.events = D.events
    M.evByName = new Map(D.events.map(e => [e.name, e]))
    M.sessionEvents = D.sessionEvents
    M.seByName = new Map(D.sessionEvents.map(e => [e.name, e]))
    // Keys are set on the data objects themselves, so the `detail` part merges into these very tools.
    for (const tl of D.tools) tl.key = `${tl.pkg}#${tl.name}`
    M.tools = D.tools
    M.toolByKey = new Map(M.tools.map(tl => [tl.key, tl]))
    M.slots = D.slots ?? []
    M.slotByKey = new Map(M.slots.map(s => [s.key, s]))
    // ── customization (phase 3) ──────────────────────────────────────────
    M.customize = D.customize ?? null
    M.profiles = D.composition.profiles
    M.profileByName = new Map(M.profiles.map(p => [p.name, p]))
    // Display order of profiles (generator/curated/overview.yaml).
    M.profileOrder = D.overview.profileOrder.filter(n => M.profileByName.has(n))
    M.extras = D.composition.extras

    // ── guide: upstream docs, decisions, gates ──────────────────────────
    M.clientServices = D.clientServices ?? []
    M.csByKey = new Map(M.clientServices.map(s => [s.key, s]))
    M.docs = D.docs ?? []
    M.notes = D.notes?.list ?? []
    M.archivedNotes = D.notes?.archived ?? 0
    M.docById = new Map([...M.docs, ...M.notes].map(d => [d.id, d]))
    M.gates = D.gates ?? []
    M.gateByName = new Map(M.gates.map(g => [g.name, g]))
    M.patterns = D.patterns ?? []
    M.lens = D.lens ?? {}
    // Lens: dependencies on concrete seam providers (packages/README.md#dependencies).
    // ── usage (phase 2) and recorded scenarios ─────────────────────────
    M.usage = D.usage
    M.capabilities = D.usage?.capabilities ?? []
    M.capById = new Map(M.capabilities.map(c => [c.id, c]))
    M.capsByPkg = new Map()
    for (const c of M.capabilities) for (const id of c.packages) { if (!M.capsByPkg.has(id)) M.capsByPkg.set(id, []); M.capsByPkg.get(id).push(c.id) }
    M.commands = D.usage?.commands ?? []
    M.envVars = D.usage?.disk.env ?? []
    M.envByName = new Map(M.envVars.map(v => [v.name, v]))
    M.scenarios = D.scenarios?.list ?? []
    M.scenarioById = new Map(M.scenarios.map(s => [s.id, s]))
    M.headerClasses = D.scenarios?.classes ?? []
    M.classById = new Map(M.headerClasses.map(c => [c.cls, c]))
    /** Agent contexts of a profile: profile-wide rows and each agent preset (tools and packages). */
    M.toolContexts = profile => D.usage?.model.contexts[profile] ?? []
    /**
     * State of a capability in a profile (and optionally an agent preset):
     * on / cond / dep when any of its packages is active there, else null.
     */
    M.capabilityState = (cap, profile, preset) => {
      const states = cap.packages.map(id => M.presence(M.pkgById.get(id), profile)?.state).filter(s => s && s !== 'off')
      if (preset) {
        const ctxs = M.toolContexts(profile)
        const active = ['profile', `preset:${preset}`].map(id => ctxs.find(x => x.id === id)?.packages ?? []).flat()
        if (cap.packages.some(id => active.includes(id))) return 'on'
        return states.includes('dep') ? 'dep' : null
      }
      return states.includes('on') ? 'on' : states.includes('cond') ? 'cond' : states.includes('dep') ? 'dep' : null
    }
    /** Status of a capability: experimental (all packages experimental), default (active in a shipped profile) or optional. */
    M.capabilityStatus = cap => {
      if (cap.packages.every(id => M.pkgById.get(id)?.group === 'experimental')) return 'experimental'
      return M.profileOrder.some(n => M.capabilityState(cap, n)) ? 'default' : 'optional'
    }

    M.providerDeps = M.lens['provider-deps'] ?? []
    M.providerDepsOf = id => M.providerDeps.filter(x => x.from === id || x.to === id)

    // ── dependency edges ────────────────────────────────────────────────
    M.edges = D.edges.map(([s, tt, ty]) => ({ s: D.packages[s].id, t: D.packages[tt].id, type: M.edgeTypes[ty] }))
    M.out = new Map()
    M.in = new Map()
    for (const p of M.packages) { M.out.set(p.id, []); M.in.set(p.id, []) }
    for (const e of M.edges) {
      M.out.get(e.s).push({ id: e.t, type: e.type })
      M.in.get(e.t).push({ id: e.s, type: e.type })
    }
    M.inDegree = (id, types = ['peer', 'runtime']) => M.in.get(id).filter(x => types.includes(x.type)).length

    // ── service and event edges (package level) ─────────────────────────
    M.svcEdges = []
    for (const s of M.services) {
      if (!s.owner) continue
      for (const c of s.consumers) if (c !== s.owner) M.svcEdges.push({ s: c, t: s.owner, key: s.key, role: 'consumer' })
      for (const c of s.implementations) if (c !== s.owner) M.svcEdges.push({ s: c, t: s.owner, key: s.key, role: 'provider' })
    }
    const evPairs = new Map()
    for (const e of M.events) {
      for (const d of e.dispatchers) for (const l of e.listeners) {
        if (d === l) continue
        const k = `${d}\u0000${l}`
        if (!evPairs.has(k)) evPairs.set(k, { s: d, t: l, events: [] })
        evPairs.get(k).events.push(e.name)
      }
    }
    M.evtEdges = [...evPairs.values()]

    // ── group aggregates ────────────────────────────────────────────────
    M.groupStats = new Map()
    for (const g of M.groups) {
      const pk = g.packages.map(id => M.pkgById.get(id))
      M.groupStats.set(g.id, {
        packages: pk.length,
        srcLines: pk.reduce((a, p) => a + p.stats.src.lines, 0),
        testLines: pk.reduce((a, p) => a + p.stats.test.lines, 0),
        commits: pk.reduce((a, p) => a + (p.git?.commits ?? 0), 0),
      })
    }
    const gEdges = new Map()
    for (const e of M.edges) {
      if (e.type !== 'peer' && e.type !== 'runtime') continue
      const a = M.pkgById.get(e.s).group, b = M.pkgById.get(e.t).group
      if (a === b) continue
      const k = `${a}\u0000${b}`
      gEdges.set(k, (gEdges.get(k) ?? 0) + 1)
    }
    M.groupEdges = [...gEdges.entries()].map(([k, n]) => { const [s, tt] = k.split('\u0000'); return { s, t: tt, n } })

    // ── helpers ─────────────────────────────────────────────────────────
    M.layerOf = p => M.layerById.get(M.groupById.get(p.group)?.layer) ?? M.layers[M.layers.length - 1]
    M.colorOf = p => M.layerOf(p).color
    M.groupColor = gid => M.colorOfLayer(M.groupById.get(gid)?.layer)
    M.isLibrary = p => !p.form && !p.kinds.includes('bundle') && !p.kinds.includes('app')
    const sortedDirs = [...M.packages].sort((a, b) => b.dir.length - a.dir.length)
    M.pkgOfPath = path => {
      if (!path) return null
      const clean = path.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '')
      for (const p of sortedDirs) if (clean === p.dir || clean.startsWith(`${p.dir}/`)) return p
      return null
    }
    M.pkgLabel = p => p.short
    M.profileState = (p, profile) => p.profiles?.[profile] ?? null
    /**
     * Effective presence of a package in a profile:
     * on / cond — mounted by a profile row (unconditionally / under a !!js condition);
     * dep — not an active row but loaded as a peer/runtime dependency of one
     *       (cond: only conditional mounts pull it in; via: the packages that do);
     * off — a row exists but is disabled and nothing loads the package; null — absent.
     */
    M.presence = (p, profile) => {
      const mount = p.profiles?.[profile] ?? null
      if (mount === 'on' || mount === 'cond') return { state: mount, cond: mount === 'cond', via: [] }
      const dep = p.loadedIn?.[profile]
      if (dep) return { state: 'dep', cond: dep.state === 'cond', via: dep.via }
      return mount ? { state: mount, cond: false, via: [] } : null
    }
    M.isActiveIn = (p, profile) => ['on', 'cond', 'dep'].includes(M.presence(p, profile)?.state)

    // Totals for the overview.
    M.totals = {
      srcLines: M.packages.reduce((a, p) => a + p.stats.src.lines, 0),
      srcTsLines: M.packages.reduce((a, p) => a + (p.stats.langs.ts ?? 0) + (p.stats.langs.tsx ?? 0), 0),
      testLines: M.packages.reduce((a, p) => a + p.stats.test.lines, 0),
    }

  }

  // ── search ────────────────────────────────────────────────────────────
  function buildSearch(M) {
    const items = []
    for (const p of M.packages) {
      items.push({ type: 'package', id: p.id, title: p.short, sub: `${p.id} · ${p.role ?? p.description ?? ''}`, text: `${p.short} ${p.id} ${p.dir} ${p.role ?? ''} ${p.description ?? ''}`.toLowerCase(), key: p.short.toLowerCase(), boost: 6, color: M.colorOf(p) })
    }
    for (const g of M.groups) {
      items.push({ type: 'group', id: g.id, title: g.id, sub: `${i18n.pick(g.title)} · ${g.path}`, text: `${g.id} ${g.title.en} ${g.title.uk} ${g.path}`.toLowerCase(), key: g.id.toLowerCase(), boost: 8, color: M.groupColor(g.id) })
    }
    for (const s of M.services) {
      items.push({ type: 'service', id: s.key, title: `ctx.${s.key}`, sub: s.title, text: `ctx.${s.key} ${s.key} ${s.title} ${s.api?.type ?? ''}`.toLowerCase(), key: `ctx.${s.key}`.toLowerCase(), boost: 7 })
    }
    for (const e of M.events) {
      items.push({ type: 'event', id: e.name, title: e.name, sub: `${e.mode ?? ''} · ${DSHMap.util.firstSentence(e.description ?? '', 90)}`, text: `${e.name} ${e.description ?? ''}`.toLowerCase(), key: e.name.toLowerCase(), boost: 4 })
    }
    for (const e of M.sessionEvents) {
      items.push({ type: 'sessionEvent', id: e.name, title: e.name, sub: `${e.kind} · ${DSHMap.util.firstSentence(e.description ?? '', 90)}`, text: `${e.name} ${e.description ?? ''}`.toLowerCase(), key: e.name.toLowerCase(), boost: 3 })
    }
    for (const tl of M.tools) {
      const p = M.pkgById.get(tl.pkg)
      items.push({ type: 'tool', id: tl.key, title: tl.name, sub: `${p?.short ?? tl.pkgName} · ${DSHMap.util.firstSentence(tl.description ?? '', 90)}`, text: `${tl.name} ${tl.pkgName} ${tl.description ?? ''}`.toLowerCase(), key: tl.name.toLowerCase(), boost: 5 })
    }
    for (const s of M.clientServices) {
      items.push({ type: 'service', id: s.key, title: `ctx.${s.key}`, sub: `client · ${s.type}`, text: `ctx.${s.key} ${s.key} client ${s.type}`.toLowerCase(), key: `ctx.${s.key}`.toLowerCase(), boost: 6 })
    }
    for (const d of M.docs) {
      items.push({ type: 'doc', id: d.id, title: d.label ?? d.title, sub: `${d.section} · ${d.id}`, text: `${d.title} ${d.label ?? ''} ${d.id} ${(d.headings ?? []).map(x => x[1]).join(' ')}`.toLowerCase(), key: (d.label ?? d.title).toLowerCase(), boost: 5 })
    }
    for (const n of M.notes) {
      items.push({ type: 'note', id: n.id, title: n.title, sub: `${n.status} · ${n.cls} · ${n.date ?? ''}`, text: `${n.title} ${n.cls} ${n.status}`.toLowerCase(), key: n.title.toLowerCase(), boost: 1 })
    }
    for (const g of M.glossary) {
      items.push({ type: 'term', id: g.term, title: g.term, sub: DSHMap.util.firstSentence(g.text.replace(/[*`]/g, ''), 110), text: `${g.aliases.join(' ')} ${g.text}`.toLowerCase(), key: g.aliases[0] ?? g.term.toLowerCase(), boost: 9 })
    }
    for (const tr of M.tours) {
      items.push({ type: 'tour', id: tr.id, title: i18n.pick(tr.title), sub: i18n.pick(tr.blurb), text: `${tr.title.uk} ${tr.title.en} tour тур`.toLowerCase(), key: i18n.pick(tr.title).toLowerCase(), boost: 7 })
    }
    for (const r of M.guide.rules) {
      items.push({ type: 'rule', id: r.id, title: i18n.pick(r.title), sub: r.gates.length ? r.gates.join(', ') : 'review', text: `${r.title.uk} ${r.title.en} ${r.id} ${r.gates.join(' ')}`.toLowerCase(), key: i18n.pick(r.title).toLowerCase(), boost: 4 })
    }
    for (const p of M.guide.processes) {
      items.push({ type: 'process', id: p.id, title: i18n.pick(p.title), sub: p.channel ?? '', text: `${p.title.uk} ${p.title.en} ${p.id} process процес`.toLowerCase(), key: i18n.pick(p.title).toLowerCase(), boost: 4 })
    }
    for (const f of M.guide.flows) {
      items.push({ type: 'flow', id: f.id, title: i18n.pick(f.title), sub: i18n.pick(f.blurb), text: `${f.title.uk} ${f.title.en} ${f.id} flow потік`.toLowerCase(), key: i18n.pick(f.title).toLowerCase(), boost: 4 })
    }
    for (const c of M.capabilities) {
      items.push({ type: 'capability', id: c.id, title: i18n.pick(c.title), sub: i18n.pick(c.blurb), text: `${c.title.uk} ${c.title.en} ${c.id} ${c.enable.map(e => e.value ?? '').join(' ')} capability можливість`.toLowerCase(), key: i18n.pick(c.title).toLowerCase(), boost: 7 })
    }
    for (const c of M.commands) {
      if (c.kind === 'ui-decorate') continue
      items.push({ type: 'command', id: c.name, title: `/${c.name}`, sub: `${M.pkgById.get(c.pkg)?.short ?? c.pkg}${c.description ? ` · ${c.description}` : ''}`, text: `/${c.name} ${c.name} ${c.description ?? ''} slash command команда`.toLowerCase(), key: `/${c.name}`, boost: 8 })
    }
    for (const v of M.envVars) {
      items.push({ type: 'env', id: v.name, title: v.name, sub: v.text ? i18n.pick(v.text) : [...v.patch.map(x => x.row), ...v.src.map(id => M.pkgById.get(id)?.short)].filter(Boolean).slice(0, 4).join(', '), text: `${v.name} env змінна середовища`.toLowerCase(), key: v.name.toLowerCase(), boost: v.test ? 1 : 5 })
    }
    for (const s of M.scenarios) {
      items.push({ type: 'scenario', id: s.id, title: s.id, sub: `${s.profile ?? ''} · ${DSHMap.util.firstSentence(s.task ?? '', 100)}`, text: `${s.id} ${s.composition ?? ''} ${s.headerClass ?? ''} ${s.task ?? ''} scenario сценарій snapshot`.toLowerCase(), key: s.name.toLowerCase(), boost: 2 })
    }
    for (const s of M.slots) {
      items.push({ type: 'slot', id: s.key, title: s.key, sub: `${s.kind} · ${s.scope} · ${s.summary ?? ''}`, text: `${s.key} ${s.summary ?? ''} slot слот ui`.toLowerCase(), key: s.key.toLowerCase(), boost: 4 })
    }
    for (const x of M.customize?.extensions ?? []) {
      items.push({ type: 'extension', id: x.id, title: i18n.pick(x.title), sub: i18n.pick(x.what), text: `${x.title.uk} ${x.title.en} ${x.what.uk} ${x.what.en} extension розширення`.toLowerCase(), key: i18n.pick(x.title).toLowerCase(), boost: 6 })
    }
    for (const s of M.customize?.skills ?? []) {
      items.push({ type: 'skill', id: s.file, title: s.name, sub: `${s.kind} · ${DSHMap.util.firstSentence(s.description ?? '', 100)}`, text: `${s.name} ${s.description ?? ''} skill скіл`.toLowerCase(), key: s.name.toLowerCase(), boost: 3 })
    }
    for (const p of M.packages) {
      for (const f of p.config?.fields ?? []) {
        items.push({ type: 'config', id: `${p.id}#${f.name}`, pkg: p.id, field: f.name, title: `${p.short}.${f.name}`, sub: `${f.type}${f.default ? ` = ${f.default}` : ''}${f.doc ? ` · ${DSHMap.util.firstSentence(f.doc, 90)}` : ''}`, text: `${f.name} ${p.short} ${f.doc ?? ''} config`.toLowerCase(), key: f.name.toLowerCase(), boost: 0 })
      }
    }
    for (const pr of M.profiles) {
      items.push({ type: 'profile', id: pr.name, title: `dsh --profile ${pr.name}`, sub: pr.bundles.join(' + '), text: `profile ${pr.name} ${pr.bundles.join(' ')}`.toLowerCase(), key: pr.name, boost: 6 })
    }
    M.searchItems = items
    M.fileItems = null
    M.symbolItems = null

    M.ensureFileIndex = () => {
      if (M.fileItems || !DSHMap.store.tree) return
      const out = []
      const walk = (node, prefix) => {
        for (const c of node) {
          if (c.length === 2) walk(c[1], prefix ? `${prefix}/${c[0]}` : c[0])
          else {
            const path = prefix ? `${prefix}/${c[0]}` : c[0]
            out.push({ type: 'file', id: path, title: c[0], sub: path, text: path.toLowerCase(), key: c[0].toLowerCase(), boost: 0, lines: c[1] })
          }
        }
      }
      walk(DSHMap.store.tree.root, '')
      M.fileItems = out
    }

    /** Public symbols (data/symbols.js, phase 4.3): [key, pkg, path, line, kind, uses]. */
    M.ensureSymbolIndex = () => {
      if (M.symbolItems || !DSHMap.store.symbols) return
      M.symbolItems = DSHMap.store.symbols.map(r => {
        const name = r[0].includes(':') ? r[0].slice(r[0].indexOf(':') + 1) : r[0]
        const owner = M.pkgById.get(r[1])
        return { type: 'symbol', id: `${r[1]}#${r[0]}`, row: r, title: name, sub: `${r[4]} · ${owner?.short ?? r[1]}${r[0] !== name ? `/${r[0].slice(0, r[0].indexOf(':'))}` : ''} · ${t('sym.imports', { n: r[5] })}`, text: `${name} ${owner?.short ?? ''} ${r[4]}`.toLowerCase(), key: name.toLowerCase(), boost: Math.min(4, Math.log2(1 + r[5])) - 1, color: owner ? M.colorOf(owner) : null }
      })
    }

    /** Synchronous search (fallback without workers; tests). */
    M.search = (query, limit = 60) => {
      const pools = [items, ...(query.trim().length >= 2 ? [M.fileItems ?? [], M.symbolItems ?? []] : [])]
      return rank(pools.map(pool => pool.map(it => [it.key, it.text, it.boost, it.title.length])), query, limit).map(([pi, i]) => pools[pi][i])
    }
  }

  /**
   * Rank search rows: pools of [key, text, boost, titleLength] → [[pool, index]]
   * best first. Self-contained: the search worker runs its source (4.3).
   */
  function rank(pools, query, limit) {
    function scoreToken(q, key, text) {
      if (key === q) return 100
      if (key.startsWith(q)) return 85 - Math.min(20, key.length - q.length) * 0.5
      const ki = key.indexOf(q)
      if (ki >= 0) return 70 - Math.min(ki, 20)
      const ti = text.indexOf(q)
      if (ti >= 0) {
        const boundary = ti === 0 || /[\s/@._-]/.test(text[ti - 1])
        return (boundary ? 50 : 40) - Math.min(ti, 400) * 0.02
      }
      if (q.length < 3) return 0
      // subsequence over the key only
      let from = 0, gaps = 0, last = -1
      for (const ch of q) {
        const j = key.indexOf(ch, from)
        if (j < 0) return 0
        if (last >= 0) gaps += j - last - 1
        last = j; from = j + 1
      }
      return Math.max(1, 25 - gaps)
    }
    const q = query.trim().toLowerCase()
    if (!q) return []
    const tokens = q.split(/\s+/).filter(Boolean)
    const scored = []
    pools.forEach((pool, pi) => {
      for (let i = 0; i < pool.length; i++) {
        const row = pool[i]
        let total = 0
        for (const tok of tokens) {
          const sc = scoreToken(tok, row[0], row[1])
          if (!sc) { total = 0; break }
          total += sc
        }
        if (total) scored.push([total + row[2], row[3], pi, i])
      }
    })
    scored.sort((a, b) => b[0] - a[0] || a[1] - b[1])
    return scored.slice(0, limit).map(x => [x[2], x[3]])
  }

  /**
   * Search off the main thread (4.3). The worker is built from a Blob URL of
   * rank()'s source, so it also runs from file:// pages; it holds the rows of
   * each pool (base items, files, symbols) and answers queries with
   * positions. Without Worker support queries run synchronously.
   */
  const searcher = {
    worker: null,
    seq: 0,
    pending: new Map(),
    pools: { base: null, file: null, symbol: null },
    sent: { base: null, file: null, symbol: null },
    init() {
      if (this.worker !== null) return
      try {
        const src = `${rank.toString()}\nconst pools = {}\nonmessage = e => {\n  const m = e.data\n  if (m.type === 'pool') { pools[m.name] = m.rows; return }\n  const names = m.pools.filter(n => pools[n])\n  postMessage({ id: m.id, hits: rank(names.map(n => pools[n]), m.q, m.limit).map(([p, i]) => [names[p], i]) })\n}`
        const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
        this.worker = new Worker(url)
        URL.revokeObjectURL(url)
        this.worker.onmessage = e => { const fn = this.pending.get(e.data.id); this.pending.delete(e.data.id); fn?.(e.data.hits) }
        this.worker.onerror = () => { this.fail() }
      } catch { this.worker = false /* no workers (or blocked): search on the main thread */ }
    },
    fail() {
      this.worker?.terminate?.()
      this.worker = false
      for (const fn of this.pending.values()) fn(null)
      this.pending.clear()
    },
    /** Hand a pool to the worker once per list object. */
    sync(name, list) {
      this.pools[name] = list
      if (!this.worker || this.sent[name] === list || !list) return
      this.sent[name] = list
      this.worker.postMessage({ type: 'pool', name, rows: list.map(it => [it.key, it.text, it.boost, it.title.length]) })
    },
    /** @returns {Promise<object[]>} items, best first */
    query(M, query, limit = 60) {
      this.init()
      this.sync('base', M.searchItems)
      this.sync('file', M.fileItems)
      this.sync('symbol', M.symbolItems)
      const names = query.trim().length >= 2 ? ['base', 'file', 'symbol'] : ['base']
      if (!this.worker) return Promise.resolve(M.search(query, limit))
      const id = ++this.seq
      // The worker answers in message order: positions refer to the pools as of this query.
      const pools = { ...this.pools }
      return new Promise(resolve => {
        this.pending.set(id, hits => resolve(hits ? hits.map(([n, i]) => pools[n][i]).filter(Boolean) : M.search(query, limit)))
        this.worker.postMessage({ type: 'query', id, q: query, limit, pools: names.filter(n => this.pools[n]) })
      })
    },
  }
  DSHMap.searcher = searcher

  DSHMap.buildModel = build
})()
