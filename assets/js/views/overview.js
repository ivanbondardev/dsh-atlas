/* DSH Map — overview / landing page. */
(function () {
  'use strict'
  const { h, svgIcon, t, fmt, util, i18n } = DSHMap

  DSHMap.views.overview = {
    scroll: true,
    init(el) {
      const M = DSHMap.model
      const meta = M.meta
      const L = DSHMap.ui.layout.narrative(el, { className: 'overview-page' })
      L.head({ title: t('ov.title'), tools: h('span', { class: 'page-tag' }, svgIcon('box', ''), t('ov.tag')) })
      const page = L.body

      // hero
      const commit = meta.commit
      page.appendChild(h('div', { class: 'hero' },
        h('div', { class: 'hero-main' },
          h('p', null, t('ov.lead')),
          h('p', null, t('ov.lead2')),
          h('div', { class: 'hero-meta' },
            meta.version ? h('span', { class: 'chip mono' }, `${t('ov.version')} ${meta.version}`) : null,
            commit ? h('button', { class: 'chip link mono', href: `${meta.repoUrl}/commit/${commit.hash}`, target: '_blank', rel: 'noopener', title: commit.subject }, svgIcon('git', ''), `${t('ov.commit')} ${commit.hash.slice(0, 10)} · ${fmt.date(commit.date)}`) : null,
            h('span', { class: 'chip' }, `${t('ov.generated')} ${fmt.date(meta.generatedAt)}`),
            meta.node ? h('span', { class: 'chip mono' }, `node ${meta.node}`) : null),
          h('div', { class: 'row hero-actions' },
            h('a', { class: 'btn primary', href: '#/map' }, svgIcon('map'), t('ov.open.map')),
            h('a', { class: 'btn', href: '#/code' }, svgIcon('grid'), t('ov.open.code')),
            h('a', { class: 'btn', href: meta.repoUrl, target: '_blank', rel: 'noopener' }, svgIcon('external'), 'GitHub'))),
        h('div', { class: 'kpis kpis-side' },
          kpi(M.packages.length, t('ov.kpi.packages'), '#/map'),
          kpi(M.groups.length, t('ov.kpi.groups'), '#/map'),
          kpi(M.totals.srcLines, t('ov.kpi.lines'), '#/code'),
          kpi(M.services.length, t('ov.kpi.services'), '#/services'),
          kpi(M.events.length + M.sessionEvents.length, t('ov.kpi.events'), '#/events'),
          kpi(M.tools.length, t('ov.kpi.tools'), '#/tools'),
          kpi(M.profiles.length, t('ov.kpi.profiles'), '#/composition'),
          kpi(M.history?.commits ?? 0, t('ov.kpi.commits'), '#/history'))))

      // layers poster
      page.appendChild(h('h2', { class: 'section-title' }, t('ov.layers'), h('span', { class: 'badge warn no-caps' }, t('interpretation')), h('span', { class: 'hint' }, t('ov.layers.hint'))))
      page.appendChild(h('div', { class: 'mode-explain layers-note' }, i18n.pick(M.vocab.layersNote), ' ', h('a', { href: '#/start' }, `${t('nav.start')} →`)))
      const poster = h('div', { class: 'layers-poster' })
      for (const layer of M.layers) {
        const groups = M.groups.filter(g => g.layer === layer.id).sort((a, b) => M.groupStats.get(b.id).srcLines - M.groupStats.get(a.id).srcLines)
        if (!groups.length) continue
        poster.appendChild(h('div', { class: 'lp-row', style: `--lc:${layer.color}` },
          h('div', { class: 'lp-label' }, h('b', null, i18n.pick(layer.title)), h('span', null, i18n.pick(layer.blurb))),
          h('div', { class: 'lp-groups' }, groups.map(g => {
            const st = M.groupStats.get(g.id)
            return h('button', { class: 'lp-group', title: g.summary ?? '', onclick: () => DSHMap.nav.showGroupOnMap(g.id) },
              h('b', null, g.id), h('span', null, `${i18n.pick(g.title)} · ${st.packages}`))
          }))))
      }
      page.appendChild(poster)

      // boot + turn flow
      page.appendChild(h('h2', { class: 'section-title' }, t('ov.boot'), h('span', { class: 'hint' }, t('ov.boot.hint'))))
      page.appendChild(h('div', { class: 'flow' }, M.overview.bootSteps.map((s, i) => h('button', { class: 'flow-step', onclick: () => DSHMap.nav.to(s.to) },
        h('div', { class: 'k' }, `${i + 1}`), h('b', null, i18n.pick(s.title)), h('span', null, i18n.pick(s.text))))))
      const profRow = h('div', { class: 'chips profile-row' }, M.profileOrder.map(n => M.profileByName.get(n)).map(p =>
        h('button', { class: 'chip link mono', onclick: () => DSHMap.nav.openProfile(p.name) }, `dsh --profile ${p.name}`, h('span', { class: 'count' }, p.bundles.map(b => M.pkgById.get(b)?.short ?? b).join(' + ')))))
      page.appendChild(profRow)

      page.appendChild(h('h2', { class: 'section-title' }, t('ov.turn'), h('span', { class: 'hint' }, t('ov.turn.hint'))))
      page.appendChild(turnFlow())

      // concepts
      page.appendChild(h('h2', { class: 'section-title' }, t('ov.concepts')))
      page.appendChild(h('div', { class: 'concepts' }, M.overview.concepts.map(c => DSHMap.ui.cardClick(h('div', { class: 'card concept clickable' },
        h('h4', null, h('button', { onclick: () => DSHMap.nav.to(c.to) }, i18n.pick(c.title)), h('span', { class: 'en' }, c.term)), DSHMap.ui.gtext('p', null, i18n.pick(c.text))), () => DSHMap.nav.to(c.to)))))

      // repository areas + languages
      page.appendChild(h('h2', { class: 'section-title' }, t('ov.areas')))
      const areas = [...meta.areas].sort((a, b) => b.lines - a.lines)
      const maxA = Math.max(...areas.map(a => a.lines))
      const langs = Object.entries(meta.totals.byLang).filter(([, v]) => v.lines > 0).sort((a, b) => b[1].lines - a[1].lines)
      const totalLines = langs.reduce((a, [, v]) => a + v.lines, 0)
      const top = langs.slice(0, 9)
      const rest = langs.slice(9).reduce((a, [, v]) => a + v.lines, 0)
      page.appendChild(h('div', { class: 'two-col' },
        h('div', { class: 'card' }, h('div', { class: 'bar-list' }, areas.map(a => h('button', { class: 'bar-item link', title: a.caption ? i18n.pick(a.caption) : a.name, onclick: () => DSHMap.nav.openCodePath(a.name) },
          h('span', { class: 'bl mono' }, `${a.name}/`),
          h('span', { class: 'bt' }, h('i', { style: `width:${(a.lines / maxA * 100).toFixed(1)}%` })),
          h('span', { class: 'bv' }, fmt.compact(a.lines)))))),
        h('div', { class: 'card' },
          h('h3', null, t('ov.langs')),
          h('div', { class: 'stacked-bar' }, [...top.map(([l, v]) => h('i', { style: `width:${(v.lines / totalLines * 100).toFixed(2)}%;background:${DSHMap.colors.v(`lang-${l}`, 'lang-other')}`, title: `${l}: ${fmt.num(v.lines)}` })), rest ? h('i', { style: `width:${(rest / totalLines * 100).toFixed(2)}%` }) : null]),
          h('div', { class: 'lang-legend' }, top.map(([l, v]) => h('span', null, h('i', { style: `background:${DSHMap.ui.langColor(l)}` }), `${l} ${(v.lines / totalLines * 100).toFixed(1)}%`))),
          h('div', { class: 'sep' }),
          h('div', { class: 'small muted' }, areas.filter(a => a.caption).slice(0, 8).map(a => h('div', { class: 'row area-caption' }, h('b', { class: 'mono' }, `${a.name}/`), h('span', { class: 'faint' }, i18n.pick(a.caption))))))))

      // biggest and most central packages
      const biggest = [...M.packages].sort((a, b) => b.stats.src.lines - a.stats.src.lines).slice(0, 12)
      const central = [...M.packages].map(p => [p, M.inDegree(p.id)]).sort((a, b) => b[1] - a[1]).slice(0, 12)
      const bars = (rows, val, max) => h('div', { class: 'bar-list' }, rows.map(([p, v]) => h('button', { class: 'bar-item link', onclick: () => DSHMap.nav.openPackage(p.id), title: p.role ?? p.description ?? '' },
        h('span', { class: 'bl mono' }, p.short),
        h('span', { class: 'bt' }, h('i', { style: `width:${(v / max * 100).toFixed(1)}%;background:${M.colorOf(p)}` })),
        h('span', { class: 'bv' }, val(v)))))
      page.appendChild(h('div', { class: 'two-col ov-bars' },
        h('div', { class: 'card' }, h('h3', null, t('ov.biggest')), bars(biggest.map(p => [p, p.stats.src.lines]), v => fmt.compact(v), biggest[0].stats.src.lines)),
        h('div', { class: 'card' }, h('h3', null, t('ov.central')), bars(central, v => fmt.num(v), central[0][1]))))

      page.appendChild(h('p', { class: 'faint small ov-foot' }, t('unofficial'), ' · ', h('a', { href: 'vendor/LICENSES.txt', target: '_blank' }, 'third-party licenses')))
    },
  }

  function kpi(value, label, href) {
    return h('a', { class: 'kpi', href }, h('b', null, fmt.num(value)), h('span', null, label))
  }

  function turnFlow() {
    const M = DSHMap.model
    const wrap = h('div', { class: 'flow' })
    for (const step of M.overview.turnFlow) {
      const ev = step.log ? M.seByName.get(step.name) : M.evByName.get(step.name)
      if (!ev) continue
      const sub = step.log
        ? t('ov.sessionLog')
        : `${ev.mode} · ${ev.listeners.length} ${t(`n.listeners.${fmt.plural(ev.listeners.length, { one: 'one', few: 'few', many: 'many', other: 'other' })}`)}`
      wrap.appendChild(h('button', {
        class: ['flow-step', step.log ? 'fs-log' : 'fs-live'],
        title: util.firstSentence(ev.description ?? '', 240),
        onclick: () => (step.log ? DSHMap.nav.openSessionEvent(step.name) : DSHMap.nav.openEvent(step.name)),
      },
      h('div', { class: 'k' }, step.log ? 'log' : 'live'),
      h('b', null, step.name),
      h('span', null, step.text ? i18n.pick(step.text) : sub),
      step.text ? h('div', { class: 'faint tiny flow-sub' }, sub) : null))
    }
    return wrap
  }
  DSHMap.ui.turnFlow = turnFlow
})()
