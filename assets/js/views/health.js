/* DSH Map — data health: the generator's report on unresolved references,
 * curated-content drift and upstream consistency (model.health). */
(function () {
  'use strict'
  const { h, svgIcon, t, fmt, i18n } = DSHMap

  const SEV_ORDER = { error: 0, warn: 1, info: 2 }
  const SEV_BADGE = { error: 'danger', warn: 'warn', info: null }

  /** Turn an item ref (pkg:, event:, profile: or a repository path) into a link. */
  function refLink(ref) {
    if (!ref) return null
    const M = DSHMap.model
    const [type, ...rest] = ref.split(':')
    const id = rest.join(':')
    if (type === 'pkg' && M.pkgById.has(id)) return () => DSHMap.nav.openPackage(id)
    if (type === 'event' && M.evByName.has(id)) return () => DSHMap.nav.openEvent(id)
    if (type === 'profile' && M.profileByName.has(id)) return () => DSHMap.nav.openProfile(id)
    if (!rest.length) return () => DSHMap.nav.openFile(ref)
    return null
  }

  DSHMap.views.health = {
    scroll: true,
    init(el) {
      const M = DSHMap.model
      const H = M.health
      const meta = M.meta
      const L = DSHMap.ui.layout.narrative(el, { className: 'health-page' })
      const page = L.body
      L.head({ title: t('health.title'), lead: t('health.lead') })

      page.append(
        h('div', { class: 'kpis health-kpis' },
          kpi(H.errors, t('health.errors'), H.errors ? 'danger' : 'ok'),
          kpi(H.warnings, t('health.warnings'), H.warnings ? 'warn' : 'ok'),
          kpi(H.infos, t('health.infos'), null)))

      // build facts and entity counts
      const counts = meta.counts ?? {}
      page.append(h('div', { class: 'two-col health-facts' },
        h('div', { class: 'card' },
          h('h3', null, t('health.sources')),
          h('dl', { class: 'kv' },
            h('dt', null, t('version.label')), h('dd', { class: 'mono' }, `${meta.versionId}${meta.version ? ` · ${meta.version}` : ''}`),
            meta.commit ? [h('dt', null, t('ov.commit')), h('dd', null, h('a', { class: 'mono', href: `${meta.repoUrl}/commit/${meta.commit.hash}`, target: '_blank', rel: 'noopener' }, meta.commit.hash.slice(0, 10)), ` · ${fmt.date(meta.commit.date)}`)] : null,
            h('dt', null, t('ov.generated')), h('dd', null, fmt.date(meta.generatedAt)),
            h('dt', null, 'data'), h('dd', { class: 'mono' }, meta.sourceBase ? t('health.light') : t('health.full')))),
        h('div', { class: 'card' },
          h('h3', null, t('health.counts')),
          h('div', { class: 'count-grid' }, Object.entries(counts).map(([k, v]) => h('div', null, h('b', null, fmt.num(v)), h('span', { class: 'faint mono tiny' }, k)))))))

      const checks = [...H.checks].sort((a, b) => (b.items.length ? 1 : 0) - (a.items.length ? 1 : 0) || SEV_ORDER[a.severity] - SEV_ORDER[b.severity])
      const failing = checks.filter(c => c.items.length)
      const passing = checks.filter(c => !c.items.length)
      for (const c of failing) {
        page.appendChild(h('div', { class: ['card', 'health-check', c.severity], id: `check-${c.id}` },
          h('div', { class: 'row health-check-head' },
            h('span', { class: ['badge', SEV_BADGE[c.severity]] }, t(`health.sev.${c.severity}`)),
            h('b', null, i18n.pick(c.title)),
            h('span', { class: 'count faint' }, c.items.length),
            h('span', { class: 'grow' }),
            h('span', { class: 'mono faint tiny' }, c.id)),
          h('p', { class: 'faint small health-about' }, i18n.pick(c.about)),
          h('ul', { class: 'health-items' }, c.items.map(it => {
            const go = refLink(it.ref)
            return h('li', null, go ? h('button', { class: ['link-btn', 'mono', 'small'], onclick: go }, it.text) : h('span', { class: 'mono small' }, it.text))
          }))))
      }
      if (passing.length) {
        page.appendChild(h('h2', { class: 'section-title' }, svgIcon('info', ''), ` ${t('health.ok')}`))
        page.appendChild(h('div', { class: 'chips' }, passing.map(c => h('span', { class: 'chip', title: i18n.pick(c.about) }, h('span', { class: 'dot health-ok-dot' }), i18n.pick(c.title)))))
      }
    },
  }

  function kpi(value, label, tone) {
    return h('div', { class: 'kpi health-kpi' }, h('b', { class: tone ? `tone-${tone}` : null }, fmt.num(value)), h('span', null, label))
  }
})()
