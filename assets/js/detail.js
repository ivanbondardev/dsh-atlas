/* DSH Map — drawer content: package and group detail pages. */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, fmt, util, i18n } = DSHMap

  function section(title, count, ...body) {
    const flat = body.flat().filter(Boolean)
    if (!flat.length) return null
    return h('div', { class: 'd-section' },
      h('h3', null, title, count !== null && count !== undefined ? h('span', { class: 'count' }, count) : null),
      flat)
  }
  function subList(label, items, render) {
    if (!items?.length) return null
    return [h('div', { class: 'd-sub-h' }, `${label} · ${items.length}`), DSHMap.ui.chipList(items, render)]
  }

  function recentMonths(n = 12) {
    const M = DSHMap.model
    const last = M.history?.last ?? new Date().toISOString().slice(0, 10)
    const end = new Date(`${last.slice(0, 7)}-01T00:00:00Z`)
    const out = []
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1))
      out.push(d.toISOString().slice(0, 7))
    }
    const first = M.history?.first?.slice(0, 7)
    return first ? out.filter(m => m >= first) : out
  }

  // ── package ─────────────────────────────────────────────────────────────
  function renderPackage(id, root) {
    const add = node => { if (node) root.appendChild(node) }
    const M = DSHMap.model
    const ui = DSHMap.ui
    const p = M.pkgById.get(id)
    if (!p) { root.appendChild(DSHMap.ui.emptyState({ text: `Unknown package ${id}`, compact: true })); return }
    const layer = M.layerOf(p)
    const group = M.groupById.get(p.group)

    const kinds = [...p.kinds]
    if (!kinds.length && M.isLibrary(p)) kinds.push('library')
    DSHMap.append(root,
      h('div', { class: 'd-kicker' },
        h('button', { class: 'chip link', onclick: () => DSHMap.nav.openGroup(p.group) },
          h('span', { class: 'dot', style: `background:${layer.color}` }), i18n.pick(layer.title), ' · ', p.group)),
      h('h2', { class: 'd-title' }, p.icon ? h('img', { src: p.icon, alt: '' }) : null, p.short),
      h('div', { class: 'd-sub' }, `${p.id}${p.version ? ` @ ${p.version}` : ''}`),
      h('div', { class: 'chips d-mt-2' },
        kinds.map(k => h('span', { class: ['badge', k === 'experimental' ? 'warn' : k === 'service' ? 'accent' : k === 'provider' ? 'ok' : k === 'tool' ? 'orange' : k === 'ui' ? 'pink' : null] }, t(`kind.${k}`))),
        p.form ? h('span', { class: 'badge' }, t(`form.${p.form}`)) : null,
        ui.vocabBadge(M.planeById.get(p.plane), t('plane')),
        p.shape !== 'other' ? ui.vocabBadge(M.shapeById.get(p.shape), t('shape')) : null,
        p.private ? h('span', { class: 'badge danger' }, t('d.private')) : null,
        DSHMap.evolution?.badge(p)),
      p.role ? h('p', { class: 'd-lead' }, p.role) : null,
      p.summary ? h('p', { class: 'd-text' }, p.summary) : (p.description ? h('p', { class: 'd-text' }, p.description) : null),
      h('div', { class: 'd-actions' },
        h('button', { class: 'btn small', onclick: () => DSHMap.nav.showOnMap(p.id) }, svgIcon('target'), t('d.onmap')),
        h('button', { class: 'btn small', onclick: () => DSHMap.nav.openFile(`${p.dir}/${pickMainFile(p)}`) }, svgIcon('code'), t('d.code')),
        h('button', { class: 'btn small', onclick: () => DSHMap.nav.openCodePath(p.dir) }, svgIcon('grid'), 'Treemap'),
        h('a', { class: 'btn small', href: M.githubTree(p.dir), target: '_blank', rel: 'noopener' }, svgIcon('external'), t('d.github')),
        DSHMap.customize ? DSHMap.customize.copyButton(() => DSHMap.customize.packageContext(p), t('d.context'), t('d.context.done')) : null),
    )

    // stats
    const s = p.stats
    root.appendChild(h('div', { class: 'stat-grid' },
      stat(fmt.num(s.src.lines), t('d.stats.src')),
      stat(fmt.num(s.src.files), t('d.stats.files')),
      stat(fmt.num(s.test.lines), t('d.stats.tests')),
      stat(fmt.num(p.git?.commits ?? 0), t('d.stats.commits')),
      stat(p.git ? fmt.date(p.git.first) : '—', t('d.stats.first')),
      stat(p.git ? fmt.date(p.git.last) : '—', t('d.stats.last')),
    ))

    // profiles
    const present = M.profileOrder
    const pres = Object.fromEntries(present.map(n => [n, M.presence(p, n)]))
    const anyProfile = present.some(n => pres[n])
    const depProfiles = present.filter(n => pres[n]?.state === 'dep')
    const glyph = st => (st === 'on' ? '●' : st === 'cond' ? '◐' : st === 'dep' ? '◌' : '○')
    add(section(t('d.profiles'), null,
      anyProfile
        ? h('div', { class: 'profile-pills d-pills' }, present.map(n => {
          const pr = pres[n]
          const st = pr?.state
          const cls = st === 'dep' && pr.cond ? 'dep cond' : st ?? 'off'
          return h(st ? 'button' : 'span', { class: ['ppill', ...cls.split(' ')], title: ui.presenceTitle(pr), onclick: st ? () => DSHMap.router.go('composition', { profile: n, tab: st === 'dep' ? 'matrix' : 'rows', q: p.short }) : null }, glyph(st), n)
        }))
        : h('div', { class: 'faint small' }, t('d.profiles.none')),
      depProfiles.length ? [h('div', { class: 'd-sub-h' }, t('map.profile.legend.dep')),
        h('div', { class: 'small d-via-grid' }, depProfiles.flatMap(n => [
          h('span', { class: 'mono faint' }, n),
          h('div', { class: 'chips' }, pres[n].via.map(id => ui.pkgChip(id))),
        ]))] : null,
      p.optionalIn?.length ? [h('div', { class: 'd-sub-h' }, t('d.optionalIn')), ui.chipList(p.optionalIn, x => ui.pkgChip(x))] : null,
    ))

    // configure: patch snippets per profile (phase 3.2)
    if (DSHMap.customize) add(DSHMap.customize.configureSection(p, section))

    // services
    add(section(t('d.services'), (p.services.owns.length + p.services.implements.length + p.services.consumes.length) || null,
      subList(t('d.svc.owns'), p.services.owns, k => ui.svcChip(k)),
      subList(t('d.svc.implements'), p.services.implements, k => ui.svcChip(k)),
      subList(t('d.svc.consumes'), p.services.consumes, k => ui.svcChip(k)),
    ))

    // events
    add(section(t('d.events'), null,
      subList(t('d.ev.owns'), p.events.owns, n => ui.eventChip(n)),
      subList(t('d.ev.dispatches'), p.events.dispatches.filter(n => !p.events.owns.includes(n)), n => ui.eventChip(n)),
      subList(t('d.ev.listens'), p.events.listens, n => ui.eventChip(n)),
      subList(t('d.ev.session'), p.events.session, n => ui.sessionEventChip(n)),
    ))

    // capabilities and slash commands (usage view)
    const caps = M.capsByPkg.get(p.id) ?? []
    const cmds = M.commands.filter(c => c.pkg === p.id)
    if (caps.length || cmds.length) {
      add(section(t('d.usage'), null,
        caps.length ? h('div', { class: 'chips' }, caps.map(id => h('button', { class: 'chip link', onclick: () => DSHMap.nav.openCapability(id) }, svgIcon('terminal'), i18n.pick(M.capById.get(id).title)))) : null,
        cmds.length ? h('div', { class: 'chips d-mt-2' }, cmds.map(c => h('button', { class: 'chip link mono', title: c.description ?? '', onclick: () => DSHMap.nav.openCommand(c.name) }, `/${c.name}`, h('span', { class: 'count' }, t(`usage.cmd.${c.kind}`))))) : null))
    }

    // tools
    if (p.tools.length) {
      add(section(t('d.tools'), p.tools.length, ui.chipList(p.tools, n => ui.toolChip(`${p.id}#${n}`, n))))
    }

    // config
    if (p.config) {
      add(section(t('d.config'), null,
        p.config.inject?.length ? [h('div', { class: 'd-sub-h' }, t('d.config.inject')), ui.chipList(p.config.inject, k => M.svcByKey.has(k) ? ui.svcChip(k) : h('span', { class: 'chip mono' }, `ctx.${k}`))] : null,
        p.config.code ? h('details', { class: 'fold d-mt-2' }, h('summary', null, 'interface Config'), h('div', { class: 'fold-body' }, ui.code(p.config.code, 'typescript'), p.config.source ? h('div', { class: 'small d-mt-1' }, ui.sourceLink(p.config.source)) : null)) : null,
      ))
    }

    // provider-dependency lens (packages/README.md#dependencies)
    const lensRows = M.providerDepsOf(p.id)
    if (lensRows.length) {
      const badge = { wrapper: 'ok', composition: 'accent', closure: 'pink', candidate: 'warn' }
      add(section(t('lens.provider-deps'), lensRows.length,
        h('div', { class: 'stack d-lens' }, lensRows.slice(0, 12).map(x => h('div', { class: 'row wrap small' },
          ui.pkgChip(x.from), '→', ui.pkgChip(x.to), h('span', { class: ['badge', badge[x.role]], title: t(`lens.role.${x.role}.d`) }, t(`lens.role.${x.role}`)), h('span', { class: 'faint' }, x.services.map(k => `ctx.${k}`).join(', '))))),
        h('button', { class: ['link-btn', 'tiny'], onclick: () => DSHMap.nav.openRule('definitions-not-providers') }, t('map.lens.rule'))))
    }

    // documents and decisions mentioning the package
    for (const sec of ui.refSections('pkg', p.id)) add(sec)

    // dependencies
    const depTypes = ['peer', 'runtime', 'dev', 'optional']
    const depCount = depTypes.reduce((a, k) => a + (p.deps[k]?.length ?? 0), 0)
    add(section(t('d.deps'), depCount || null,
      depTypes.map(k => subList(t(`edge.${k}`), p.deps[k], x => ui.pkgChip(x))),
    ))
    const incoming = M.in.get(p.id)
    if (incoming.length) {
      const byType = {}
      for (const e of incoming) (byType[e.type] ??= []).push(e.id)
      add(section(t('d.dependents'), incoming.length,
        depTypes.map(k => subList(t(`edge.${k}`), byType[k], x => ui.pkgChip(x))),
      ))
    }
    const ext = p.external ?? {}
    const extCount = Object.values(ext).reduce((a, r) => a + Object.keys(r).length, 0)
    if (extCount) {
      add(section(t('d.external'), extCount,
        Object.entries(ext).map(([k, rec]) => [h('div', { class: 'd-sub-h' }, k), h('div', { class: 'chips' }, Object.entries(rec).map(([n, v]) => h('button', { class: 'chip link mono', href: `https://www.npmjs.com/package/${n}`, target: '_blank', rel: 'noopener', title: v }, n, h('span', { class: 'count' }, v))))]),
      ))
    }

    // client plugin
    if (p.client) {
      add(section(t('d.client'), null,
        h('dl', { class: 'kv' }, h('dt', null, t('d.client.platform')), h('dd', null, p.client.platform ?? '—')),
        p.client.inject?.length ? [h('div', { class: 'd-sub-h' }, t('d.client.inject')), ui.chipList(p.client.inject, x => ui.pkgChip(x))] : null,
      ))
    }
    if (p.bundle?.length) {
      add(section(t('d.bundle'), p.bundle.length,
        h('div', { class: 'chips' }, p.bundle.map(f => h('button', { class: 'chip link mono', onclick: () => DSHMap.nav.openFile(`${p.dir}/${f.replace(/^\.\//, '')}`) }, f))),
        M.profiles.some(pr => pr.bundles.includes(p.id))
          ? h('div', { class: 'chips d-mt-2' }, M.profiles.filter(pr => pr.bundles.includes(p.id)).map(pr => h('button', { class: 'chip link', onclick: () => DSHMap.nav.openProfile(pr.name) }, `profile: ${pr.name}`)))
          : null,
      ))
    }
    if (p.migration) {
      add(section(t('d.migration'), null, h('div', { class: 'chips' }, h('span', { class: 'badge accent' }, `v${p.migration.from} → v${p.migration.to}`), h('span', { class: 'chip mono' }, p.migration.migration))))
    }
    if (p.bin?.length || p.scripts?.length) {
      add(section(p.bin?.length ? t('d.bin') : t('d.scripts'), null,
        p.bin?.length ? h('div', { class: 'chips' }, p.bin.map(b => h('span', { class: 'chip mono' }, b))) : null,
        p.scripts?.length ? [h('div', { class: 'd-sub-h' }, t('d.scripts')), h('div', { class: 'chips' }, p.scripts.slice(0, 40).map(b => h('span', { class: 'chip mono' }, b)))] : null,
      ))
    }
    if (p.exports?.length > 1) {
      add(section(t('d.exports'), p.exports.length, h('div', { class: 'chips' }, p.exports.map(x => h('span', { class: 'chip mono' }, x)))))
    }

    // activity
    if (p.git?.monthly) {
      const months = recentMonths(12)
      add(section(t('d.activity'), null, ui.sparkline(p.git.monthly, months, { w: 400, h: 44, color: layer.color }),
        h('div', { class: 'row faint tiny d-spark-axis' }, h('span', null, fmt.month(months[0])), h('span', null, fmt.month(months[months.length - 1])))))
    }

    // files + readme (lazy)
    // README gate sections: what the model sees, what the package does not do (lazy)
    const blocksSlot = h('div')
    if (p.readmeBlocks?.modelExperience || p.readmeBlocks?.limitations) root.appendChild(blocksSlot)
    // usage examples: tests, example overlays, README code (phase 3.8)
    const examples = DSHMap.customize?.examplesSection(p, section) ?? null
    if (examples) root.appendChild(examples.node)
    // public API: exported symbols with their importers (phase 4.3)
    const api = DSHMap.evolution?.apiSection(p, section) ?? null
    if (api?.node) root.appendChild(api.node)
    const filesSlot = h('div', null, h('div', { class: 'loading' }, h('div', { class: 'spinner' }), t('loading')))
    const readmeSlot = h('div')
    root.append(section(t('d.files'), null, filesSlot), readmeSlot)
    DSHMap.load('pkg', p.id, p.detail).then(detail => {
      if (DSHMap.drawer.ref !== `pkg:${p.id}`) return
      for (const [key, icon, cls] of [['modelExperience', 'eye', 'mx'], ['limitations', 'info', 'kl']]) {
        if (!detail[key]) continue
        blocksSlot.appendChild(h('div', { class: ['d-section', 'readme-block', cls] }, h('h4', null, svgIcon(icon), t(`d.${key}`), h('span', { class: 'faint tiny d-h-tag' }, 'README')), ui.markdown(detail[key], p.dir)))
      }
      examples?.fill(detail)
      api?.fill(detail)
      clear(filesSlot).appendChild(fileList(p, detail))
      if (detail.readme) {
        readmeSlot.appendChild(section(t('d.readme'), null, ui.markdown(detail.readme, p.dir)))
      }
    }).catch(err => {
      if (DSHMap.drawer.ref !== `pkg:${p.id}`) return
      clear(filesSlot).appendChild(ui.errorState(err, { retry: () => DSHMap.drawer.rerender() }))
    })
  }

  function pickMainFile(p) {
    // Best guess at the entry point; the viewer falls back to the first file.
    if (p.python) return 'README.md'
    if (p.stats.src.files) return 'src/index.ts'
    return 'package.json'
  }

  function stat(v, label) { return h('div', { class: 'stat' }, h('b', null, v), h('span', null, label)) }

  function fileList(p, detail) {
    const wrap = h('div', { class: 'stack' })
    const groups = { s: [], o: [], t: [] }
    for (const f of detail.files) groups[f[3]]?.push(f)
    const block = (key, label, limit) => {
      const list = groups[key]
      if (!list.length) return null
      const box = h('div', { class: 'file-list' })
      box.appendChild(h('div', { class: 'f dir' }, h('span', { class: 'n' }, `${label} · ${list.length}`), h('span', { class: 'l' }, `${fmt.num(list.reduce((a, f) => a + f[1], 0))}`)))
      const render = f => h('button', { class: 'f', title: f[0], onclick: () => DSHMap.nav.openFile(`${p.dir}/${f[0]}`) },
        svgIcon('file'), h('span', { class: 'n' }, f[0]), h('span', { class: 'l' }, f[1] ? fmt.num(f[1]) : fmt.bytes(f[2])))
      list.slice(0, limit).forEach(f => box.appendChild(render(f)))
      if (list.length > limit) {
        const more = h('button', { class: 'f', onclick: () => { const rest = list.slice(limit).map(render); more.replaceWith(...rest); rest[0]?.focus() } }, h('span', { class: 'n faint' }, t('more', { n: list.length - limit })))
        box.appendChild(more)
      }
      return box
    }
    wrap.append(...[block('s', t('d.files.src'), 40), block('o', t('d.files.other'), 15), block('t', t('d.files.test'), 8)].filter(Boolean))
    return wrap
  }

  // ── group ───────────────────────────────────────────────────────────────
  function renderGroup(id, root) {
    const add = node => { if (node) root.appendChild(node) }
    const M = DSHMap.model
    const ui = DSHMap.ui
    const g = M.groupById.get(id)
    if (!g) { root.appendChild(DSHMap.ui.emptyState({ text: `Unknown group ${id}`, compact: true })); return }
    const layer = M.layerById.get(g.layer)
    const st = M.groupStats.get(id)
    DSHMap.append(root,
      h('div', { class: 'd-kicker' }, h('span', { class: 'dot sq', style: `background:${layer.color}` }), `${t('type.group')} · ${i18n.pick(layer.title)}`),
      h('h2', { class: 'd-title' }, g.id),
      h('div', { class: 'd-sub' }, `${g.path}/`),
      h('p', { class: 'd-lead' }, i18n.pick(g.title)),
      g.summary ? h('p', { class: 'd-text' }, g.summary) : null,
      h('div', { class: 'd-actions' },
        h('button', { class: 'btn small', onclick: () => DSHMap.nav.showGroupOnMap(g.id) }, svgIcon('target'), t('d.onmap')),
        h('button', { class: 'btn small', onclick: () => DSHMap.nav.openCodePath(g.path === '.' ? '' : g.path) }, svgIcon('grid'), 'Treemap'),
        g.path !== '.' ? h('a', { class: 'btn small', href: M.githubTree(g.path), target: '_blank', rel: 'noopener' }, svgIcon('external'), t('d.github')) : null),
      h('div', { class: 'stat-grid' },
        stat(fmt.num(st.packages), t('ov.kpi.packages')),
        stat(fmt.num(st.srcLines), t('d.group.lines')),
        stat(fmt.num(st.commits), t('d.stats.commits'))),
    )
    const pk = g.packages.map(pid => M.pkgById.get(pid)).sort((a, b) => b.stats.src.lines - a.stats.src.lines)
    const table = ui.table({
      rows: pk, label: t('d.group.packages'), className: 'd-pkg-table',
      sort: { key: 'lines', dir: -1 },
      row: p => ({ class: 'clickable', onclick: () => DSHMap.nav.openPackage(p.id) }),
      columns: [
        { key: 'name', label: t('type.package'), sort: p => p.short, cell: p => [h('div', { class: 'd-pkg-name' }, p.short), h('div', { class: 'faint small' }, util.firstSentence(p.role ?? p.description ?? '', 120))] },
        { key: 'lines', label: t('d.stats.src'), num: true, className: 'faint small nowrap', sort: p => p.stats.src.lines, cell: p => fmt.num(p.stats.src.lines) },
      ],
    })
    add(section(t('d.group.packages'), pk.length, table))

    const out = M.groupEdges.filter(e => e.s === id).sort((a, b) => b.n - a.n)
    const inn = M.groupEdges.filter(e => e.t === id).sort((a, b) => b.n - a.n)
    const gchip = (gid, n) => h('button', { class: 'chip link mono', onclick: () => DSHMap.nav.openGroup(gid) }, h('span', { class: 'dot', style: `background:${M.groupColor(gid)}` }), gid, h('span', { class: 'count' }, n))
    if (out.length) add(section(t('d.group.out'), out.length, h('div', { class: 'chips' }, out.map(e => gchip(e.t, e.n)))))
    if (inn.length) add(section(t('d.group.in'), inn.length, h('div', { class: 'chips' }, inn.map(e => gchip(e.s, e.n)))))
    if (g.readme) add(section(t('d.readme'), null, ui.markdown(g.readme, g.path === '.' ? '' : g.path)))
  }

  DSHMap.detail = {
    render(ref, root) {
      const idx = ref.indexOf(':')
      const type = ref.slice(0, idx), id = ref.slice(idx + 1)
      if (type === 'pkg') renderPackage(id, root)
      else if (type === 'group') renderGroup(id, root)
      else root.appendChild(DSHMap.ui.emptyState({ text: ref, compact: true }))
    },
    recentMonths,
  }
})()
