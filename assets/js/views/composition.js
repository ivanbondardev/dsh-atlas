/* DSH Map — profile composition: bundle stacks, effective plugin rows,
 * profile comparison matrix and optional bundles. */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, fmt, util, i18n } = DSHMap

  const state = { showOff: util.storage.get('comp.showOff', true) }

  DSHMap.views.composition = {
    scroll: false,
    init(el) {
      this.el = el
      this.L = DSHMap.ui.layout.reference(el, { title: t('comp.title'), className: 'comp-view', head: [h('div', { class: 'faint small' }, t('comp.hint')), this.picker = h('div', { class: 'comp-picker' })] })
    },
    show(params) { this.render(params) },
    update(params, prev) {
      if (params.profile !== prev.profile || params.tab !== prev.tab || params.origin !== prev.origin || params.q !== prev.q || params.off !== prev.off) this.render(params)
    },
    render(params) {
      const M = DSHMap.model
      const ui = DSHMap.ui
      const profiles = M.profileOrder
      const profileName = M.profileByName.has(params.profile) ? params.profile : profiles[0]
      const tab = ['rows', 'matrix', 'optional'].includes(params.tab) ? params.tab : 'rows'
      const prof = M.profileByName.get(profileName)
      const go = patch => DSHMap.router.go('composition', { ...DSHMap.router.params, ...patch }, { replace: true })

      // list: profile picker + layer stack of the chosen profile
      clear(this.picker).appendChild(ui.tabs(profiles.map(n => [n, n]), profileName, n => go({ profile: n, origin: null }), t('type.profile')))
      this.renderStack(clear(this.L.list), prof, params, tab)

      // detail: tabs + rows / matrix / optional bundles
      const root = clear(this.L.detail)
      root.appendChild(h('div', { class: 'comp-tabs' },
        ui.tabs([['rows', t('comp.tab.rows')], ['matrix', t('comp.tab.matrix')], ['optional', t('comp.tab.optional')]], tab, k => go({ tab: k })),
        h('div', { class: 'grow' }),
        tab === 'rows' ? h('button', { class: 'btn small', onclick: () => DSHMap.nav.mapWith({ profile: profileName }) }, svgIcon('map'), t('comp.onmap')) : null))

      if (tab === 'rows') this.renderRows(root, prof, params)
      else if (tab === 'matrix') this.renderMatrix(root, profiles, params)
      else this.renderOptional(root)
    },

    // ── layer stack of one profile ──────────────────────────────────────
    renderStack(list, prof, params, tab) {
      const M = DSHMap.model
      const stack = h('div', { class: 'comp-stack' })
      list.appendChild(stack)
      stack.appendChild(h('div', { class: 'd-kicker comp-stack-title' }, t('comp.stack')))
      stack.appendChild(h('div', { class: 'layer-card profile' }, h('div', { class: 'lc-k' }, t('type.profile')), h('b', null, `dsh --profile ${prof.name}`), h('div', { class: 'lc-n' }, `$DSH_HOME/profiles/${prof.name}`)))
      const countRows = (rows, origin) => {
        let ins = 0
        const walk = list => list.forEach(r => { if (r.origin === origin) ins++; if (r.children) walk(r.children) })
        walk(rows)
        return ins
      }
      const countOverrides = (rows, origin) => {
        let n = 0
        const walk = list => list.forEach(r => { n += r.overrides.filter(o => o.origin === origin).length; if (r.children) walk(r.children) })
        walk(rows)
        return n
      }
      for (const b of prof.bundles) {
        const p = M.pkgById.get(b)
        const active = tab === 'rows' && params.origin === b
        // The origin filter only applies to the rows tab: picking a bundle elsewhere opens it.
        const pick = () => DSHMap.router.setParams({ origin: active ? null : b, ...(tab === 'rows' ? {} : { tab: 'rows' }) }, { replace: true })
        const card = h('div', { class: ['layer-card', 'bundle', active ? 'is-selected' : null], ...DSHMap.ui.selAttrs(active) },
          h('div', { class: 'lc-k' }, t('comp.layer.bundle')),
          h('b', null, h('button', { class: 'link-btn inherit', 'aria-pressed': String(active), onclick: pick }, p?.short ?? b)),
          h('div', { class: 'lc-n' }, `+${countRows(prof.rows, b)} · ${t('comp.overridden', { by: countOverrides(prof.rows, b) })}`),
          p ? h('div', { class: 'small lc-foot' }, h('button', { class: 'link-btn', onclick: () => DSHMap.nav.openPackage(p.id) }, t('d.readme'))) : null)
        card.addEventListener('click', e => { if (e.target.closest('button, a, input, select, textarea, summary')) return; pick() })
        stack.append(h('div', { class: 'stack-arrow' }, '↓'), card)
      }
      for (const k of ['comp.user.profile', 'comp.user.home', 'comp.user.overlay']) {
        stack.append(h('div', { class: 'stack-arrow' }, '↓'), h('div', { class: 'layer-card user' }, h('div', { class: 'lc-k' }, t('comp.layer.user')), h('b', null, t(k))))
      }
      stack.append(h('div', { class: 'stack-arrow' }, '↓'), h('div', { class: 'layer-card loader' }, h('div', { class: 'lc-k' }, t('boot.tree')), h('b', null, 'Cordis Loader'), h('div', { class: 'lc-n' }, t('boot.tree.d'))))
    },

    // ── rows of one profile ─────────────────────────────────────────────
    renderRows(root, prof, params) {
      const M = DSHMap.model
      const ui = DSHMap.ui
      // The route carries the toggle (2.2); localStorage only seeds it.
      if (params.off === '1' || params.off === '0') state.showOff = params.off === '1'
      if (params.off !== (state.showOff ? '1' : '0')) DSHMap.router.replace({ off: state.showOff ? '1' : '0' })
      const showOff = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: state.showOff }), t('comp.show.off'))
      const counter = h('span', { class: 'faint small' })
      const fb = ui.filterBar({ key: 'q', placeholder: t('comp.filter'), label: t('comp.filter'), onChange: () => draw(), extra: h('div', { class: 'row comp-filter-extra' }, showOff, counter) })
      fb.sync(params)
      root.appendChild(h('div', { class: 'comp-toolbar sticky' }, fb.el))

      const columns = [
        { key: 'id', label: t('comp.col.id'), className: 'id', cell: ({ r }) => [r.children ? '▾ ' : '', r.id ?? '—'] },
        { key: 'pkg', label: t('comp.col.pkg'), className: 'pkg', cell: ({ r }) => {
          const p = r.pkg ? M.pkgById.get(r.pkg) : null
          const label = r.group ? t('comp.group', { iso: (r.isolate ?? []).join(', ') || '—' }) : r.presetId ? t('comp.preset', { id: r.presetId }) : null
          return [p ? h('span', { class: 'row rows-pkg' }, h('span', { class: 'cdot', style: `background:${M.colorOf(p)}` }), r.spec) : h('span', { class: 'faint' }, r.spec ?? ''), label ? h('div', { class: 'faint tiny' }, label) : null]
        } },
        { key: 'state', label: t('comp.col.state'), cell: ({ r }) => [ui.stateBadge(r.state), r.expr ? h('div', { class: 'mono faint tiny rows-expr' }, r.expr) : null] },
        { key: 'origin', label: t('comp.col.origin'), cell: ({ r }) => [h('span', { class: 'origin' }, M.pkgById.get(r.origin)?.short ?? r.origin), r.overrides.length ? h('div', { class: 'tiny rows-over' }, t('comp.overridden', { by: r.overrides.map(o => `${M.pkgById.get(o.origin)?.short ?? o.origin} (${o.fields.join(', ')})`).join('; ') })) : null] },
        { key: 'config', label: t('comp.col.config'), cell: ({ r }) => {
          if (!r.config) return null
          const pre = h('pre', { class: 'cfg-pre hidden' }, r.config)
          return [h('button', { class: 'chip link', onclick: e => { e.stopPropagation(); pre.classList.toggle('hidden') } }, t('comp.config.show')), pre]
        } },
      ]
      const table = ui.table({
        columns, rows: [], sortable: false, card: true, className: 'rows-table', label: t('comp.tab.rows'),
        empty: ui.noMatches(() => { fb.reset(); if (params.origin) DSHMap.router.setParams({ origin: null }, { replace: true }) }),
        row: ({ r, depth, off }) => {
          const p = r.pkg ? M.pkgById.get(r.pkg) : null
          return { class: ['clickable', depth ? 'child' : null, r.children ? 'grp' : null, off && r.state !== 'off' ? 'dim' : null], style: depth ? `--depth:${depth}` : null, onclick: () => p && DSHMap.nav.openPackage(p.id) }
        },
      })
      root.appendChild(h('div', { class: 'comp-rows' }, table))

      const draw = () => {
        const q = fb.query()
        const collect = (rows, depth, parentOff) => {
          const out = []
          for (const r of rows) {
            const off = parentOff || r.state === 'off'
            const kids = r.children ? collect(r.children, depth + 1, off) : []
            const text = `${r.id ?? ''} ${r.spec ?? ''}`.toLowerCase()
            const selfMatch = (!q || text.includes(q)) && (!params.origin || r.origin === params.origin || r.overrides.some(o => o.origin === params.origin))
            if ((selfMatch && (state.showOff || !off)) || kids.length) out.push({ r, depth, off })
            out.push(...kids)
          }
          return out
        }
        const flat = collect(prof.rows, 0, false)
        counter.textContent = t('comp.rows', { n: flat.length })
        table.update(flat)
      }
      showOff.querySelector('input').addEventListener('change', e => { state.showOff = e.target.checked; util.storage.set('comp.showOff', state.showOff); DSHMap.router.replace({ off: state.showOff ? '1' : '0' }); draw() })
      draw()
    },

    // ── comparison matrix ───────────────────────────────────────────────
    renderMatrix(root, profiles, params) {
      const M = DSHMap.model
      const fb = DSHMap.ui.filterBar({
        key: 'q', placeholder: t('map.filter'), label: t('map.filter'), onChange: () => draw(),
        extra: h('div', { class: 'row wrap comp-filter-extra' },
          h('span', { class: 'faint small' }, t('comp.matrix.hint')),
          h('span', { class: 'row small muted comp-legend' },
            h('span', null, h('i', { class: 'mdot on' }), ' ', t('comp.state.on')),
            h('span', null, h('i', { class: 'mdot cond' }), ' ', t('comp.state.cond')),
            h('span', null, h('i', { class: 'mdot dep' }), ' ', t('comp.state.dep')),
            h('span', null, h('i', { class: 'mdot off' }), ' ', t('comp.state.off')))),
      })
      fb.sync(params)
      root.appendChild(h('div', { class: 'comp-toolbar' }, fb.el))
      const host = h('div', { class: 'comp-matrix' })
      root.appendChild(host)
      const draw = () => {
        const q = fb.query()
        const pk = M.packages.filter(p => (Object.keys(p.profiles ?? {}).length || Object.keys(p.loadedIn ?? {}).length) && (!q || p.short.includes(q) || p.id.includes(q)))
        const byGroup = new Map()
        for (const p of pk) { if (!byGroup.has(p.group)) byGroup.set(p.group, []); byGroup.get(p.group).push(p) }
        const groups = M.groups.filter(g => byGroup.has(g.id))
        const totals = Object.fromEntries(profiles.map(n => [n, {
          mounted: pk.filter(p => ['on', 'cond'].includes(M.presence(p, n)?.state)).length,
          dep: pk.filter(p => M.presence(p, n)?.state === 'dep').length,
        }]))
        const tbody = h('tbody')
        for (const g of groups) {
          tbody.appendChild(h('tr', null, h('td', { class: 'mpkg mgrp', style: `color:${M.groupColor(g.id)}` }, h('button', { onclick: () => DSHMap.nav.openGroup(g.id) }, `${g.id}/`)), profiles.map(() => h('td'))))
          for (const p of byGroup.get(g.id).sort((a, b) => (a.short < b.short ? -1 : 1))) {
            tbody.appendChild(h('tr', null,
              h('td', { class: 'mpkg sub' }, h('button', { title: p.role ?? '', onclick: () => DSHMap.nav.openPackage(p.id) }, p.short)),
              profiles.map(n => {
                const pr = M.presence(p, n)
                return h('td', { class: 'mcell', title: pr ? `${n}: ${DSHMap.ui.presenceTitle(pr)}` : '' }, h('i', { class: ['mdot', pr?.state ?? 'none', pr?.state === 'dep' && pr.cond ? 'cond' : null] }))
              })))
          }
        }
        if (!pk.length) { clear(host).appendChild(DSHMap.ui.noMatches(() => fb.reset())); return }
        clear(host).appendChild(h('table', { class: 'matrix' },
          h('thead', null, h('tr', null, h('th', { class: 'mcorner' }, `${pk.length} ${t('ov.kpi.packages')}`), profiles.map(n => h('th', null, h('button', { onclick: () => DSHMap.router.go('composition', { profile: n, tab: 'rows' }) }, n, h('span', { class: 'faint tiny mtot' }, `${totals[n].mounted} + ${totals[n].dep}`)))))),
          tbody))
      }
      draw()
    },

    // ── optional bundles ────────────────────────────────────────────────
    renderOptional(root) {
      const M = DSHMap.model
      const page = h('div', { class: 'comp-optional' })
      root.appendChild(page)
      page.appendChild(h('p', { class: 'muted ref-lead' }, t('comp.optional.hint')))
      const grid = h('div', { class: 'tool-grid wide' })
      page.appendChild(grid)
      for (const x of M.extras) {
        const p = M.pkgById.get(x.id)
        const mounts = []
        const walk = rows => rows.forEach(r => { if (r.pkg) mounts.push(r); if (r.children) walk(r.children) })
        walk(x.rows)
        const open = () => DSHMap.nav.openPackage(x.id)
        const card = h('div', { class: 'tool-card' },
          h('div', { class: 'row' }, p?.icon ? h('img', { class: 'tc-icon', src: p.icon, alt: '' }) : null, h('b', null, h('button', { class: 'link-btn inherit', onclick: open }, p?.short ?? x.id)), h('span', { class: ['badge', x.kind === 'optional' ? 'accent' : 'warn'] }, t(`comp.optional.kind.${x.kind}`))),
          h('p', null, p?.role ?? p?.description ?? ''),
          mounts.length ? h('div', { class: 'chips' }, mounts.slice(0, 12).map(r => DSHMap.ui.pkgChip(r.pkg))) : null,
          x.patchTargets.length ? h('div', { class: 'tc-foot' }, t('comp.patches.targets', { ids: x.patchTargets.join(', ') })) : null)
        card.addEventListener('click', e => { if (e.target.closest('button, a, input, select, textarea, summary')) return; open() })
        grid.appendChild(card)
      }
    },
  }
})()
