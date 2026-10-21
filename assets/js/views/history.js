/* DSH Map — git history: weekly commits, package growth, activity heatmap. */
(function () {
  'use strict'
  const { h, clear, t, fmt, i18n } = DSHMap

  i18n.extend({
    uk: { 'hist.weekly.aria': '{title}: {n} тижнів, найбільше {max} комітів за тиждень', 'hist.cumulative.aria': '{title}: {n} пакетів з {first} до {last}' },
    en: { 'hist.weekly.aria': '{title}: {n} weeks, at most {max} commits per week', 'hist.cumulative.aria': '{title}: {n} packages from {first} to {last}' },
  })

  DSHMap.views.history = {
    scroll: true,
    init(el) {
      this.el = el
      this.L = DSHMap.ui.layout.narrative(el, { className: 'history-page' })
      this.page = this.L.root
      this.ro = new ResizeObserver(() => { if (this.drawn && DSHMap.router.view === 'history' && Math.abs(this.page.clientWidth - this.lastW) > 30) this.render() })
      this.ro.observe(this.page)
      this.offTheme = DSHMap.on('theme', () => { if (this.drawn) this.render() })
    },
    dispose() { this.ro?.disconnect(); this.offTheme?.() },
    show() { requestAnimationFrame(() => this.render()) },
    render() {
      const M = DSHMap.model
      const H = M.history
      const page = clear(this.L.body)
      this.drawn = true
      this.lastW = this.page.clientWidth
      if (!H) {
        this.L.head({ title: t('nav.history') })
        page.appendChild(DSHMap.ui.emptyState({ icon: 'info', text: t('hist.nogit') }))
        return
      }
      this.L.head({
        title: t('nav.history'),
        lead: [t('hist.range', { first: fmt.date(H.first), last: fmt.date(H.last) }),
          `${fmt.num(H.commits)} ${t('ov.kpi.commits')}`, `${fmt.num(H.commitsWithMerges)} ${t('history.withMerges')}`].join(' · '),
      })

      // weekly commits
      page.appendChild(h('h2', { class: 'section-title' }, t('hist.weekly')))
      const c1 = h('div', { class: 'card chart', role: 'img', 'aria-label': t('hist.weekly.aria', { title: t('hist.weekly'), n: H.weekly.length, max: fmt.num(Math.max(0, ...H.weekly.map(w => w[1]))) }) })
      page.appendChild(c1)
      weeklyChart(c1, H.weekly)

      // cumulative package count
      page.appendChild(h('h2', { class: 'section-title' }, t('hist.cumulative')))
      const grown = M.packages.filter(p => p.git?.first)
      const firsts = grown.map(p => p.git.first).sort()
      const c2 = h('div', { class: 'card chart', role: 'img', 'aria-label': t('hist.cumulative.aria', { title: t('hist.cumulative'), n: grown.length, first: fmt.date(firsts[0]), last: fmt.date(firsts[firsts.length - 1]) }) })
      page.appendChild(c2)
      growthChart(c2, grown)

      // heatmap
      page.appendChild(h('h2', { class: 'section-title' }, t('hist.heat')))
      page.appendChild(h('div', { class: 'card heat' }, heatmap(H.areaMonthly)))

      // lists
      const active = [...M.packages].filter(p => p.git).sort((a, b) => b.git.commits - a.git.commits).slice(0, 15)
      const recent = [...M.packages].filter(p => p.git).sort((a, b) => (b.git.last < a.git.last ? -1 : b.git.last > a.git.last ? 1 : b.git.commits - a.git.commits)).slice(0, 15)
      const newest = [...M.packages].filter(p => p.git).sort((a, b) => (b.git.first < a.git.first ? -1 : b.git.first > a.git.first ? 1 : 0)).slice(0, 15)
      const months = DSHMap.detail.recentMonths(8)
      const list = (title, rows, val) => h('div', { class: 'card' }, h('h3', null, title), h('div', { class: 'stack hist-list' }, rows.map(p => h('button', { class: 'row hist-row', onclick: () => DSHMap.nav.openPackage(p.id), title: p.role ?? '' },
        h('span', { class: 'hist-dot', style: `background:${M.colorOf(p)}` }),
        h('span', { class: 'mono small grow truncate' }, p.short),
        DSHMap.ui.sparkline(p.git.monthly, months, { w: 70, h: 16, color: M.colorOf(p) }),
        h('span', { class: 'faint small nowrap hist-val' }, val(p))))))
      page.appendChild(h('h2', { class: 'section-title' }, t('history.packages')))
      page.appendChild(h('div', { class: 'hist-lists' },
        list(t('hist.active'), active, p => `${fmt.num(p.git.commits)}`),
        list(t('hist.recent'), recent, p => fmt.date(p.git.last)),
        list(t('hist.newest'), newest, p => fmt.date(p.git.first))))
    },
  }

  function axisStyle(sel) {
    sel.selectAll('text').attr('fill', 'var(--text-faint)').style('font-size', 'var(--fs-xs)')
    sel.selectAll('path,line').attr('stroke', 'var(--border-strong)')
  }

  function weeklyChart(host, weekly) {
    const W = Math.max(320, host.clientWidth - 36), H = 220, m = { t: 10, r: 10, b: 26, l: 40 }
    const data = weekly.map(([d, n]) => ({ d: new Date(`${d}T00:00:00`), n }))
    const x = d3.scaleBand().domain(data.map(d => +d.d)).range([m.l, W - m.r]).padding(0.18)
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.n) || 1]).nice().range([H - m.b, m.t])
    const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H)
    svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r)).tickFormat('')).call(g => g.selectAll('line').attr('stroke', 'var(--border)').attr('stroke-dasharray', '2 3')).call(g => g.select('.domain').remove())
    const fmtTick = d3.timeFormat('%d.%m')
    const every = Math.ceil(data.length / 10)
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickValues(data.filter((_, i) => i % every === 0).map(d => +d.d)).tickFormat(v => fmtTick(new Date(v)))).call(axisStyle)
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5)).call(axisStyle)
    svg.append('g').selectAll('rect').data(data).join('rect')
      .attr('x', d => x(+d.d)).attr('y', d => y(d.n)).attr('width', x.bandwidth()).attr('height', d => y(0) - y(d.n)).attr('rx', 2)
      .attr('fill', 'var(--accent)').attr('opacity', 0.85)
      .on('mousemove', (e, d) => DSHMap.tooltip.show(`${fmt.date(d.d.toISOString().slice(0, 10))}: ${fmt.num(d.n)} ${t('code.commits')}`, e.clientX, e.clientY))
      .on('mouseleave', () => DSHMap.tooltip.hide())
  }

  function growthChart(host, pkgs) {
    const W = Math.max(320, host.clientWidth - 36), H = 220, m = { t: 10, r: 14, b: 26, l: 40 }
    const sorted = [...pkgs].sort((a, b) => (a.git.first < b.git.first ? -1 : 1))
    const byDay = d3.rollups(sorted, v => v, p => p.git.first).sort((a, b) => (a[0] < b[0] ? -1 : 1))
    let acc = 0
    const data = byDay.map(([d, list]) => { acc += list.length; return { d: new Date(`${d}T00:00:00`), n: acc, list } })
    const x = d3.scaleTime().domain(d3.extent(data, d => d.d)).range([m.l, W - m.r])
    const y = d3.scaleLinear().domain([0, acc]).nice().range([H - m.b, m.t])
    const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H)
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.l - m.r)).tickFormat('')).call(g => g.selectAll('line').attr('stroke', 'var(--border)').attr('stroke-dasharray', '2 3')).call(g => g.select('.domain').remove())
    svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%d.%m'))).call(axisStyle)
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5)).call(axisStyle)
    const area = d3.area().x(d => x(d.d)).y0(y(0)).y1(d => y(d.n)).curve(d3.curveStepAfter)
    const line = d3.line().x(d => x(d.d)).y(d => y(d.n)).curve(d3.curveStepAfter)
    svg.append('path').datum(data).attr('d', area).attr('fill', 'var(--accent)').attr('opacity', 0.14)
    svg.append('path').datum(data).attr('d', line).attr('fill', 'none').attr('stroke', 'var(--accent)').attr('stroke-width', 2)
    svg.append('g').selectAll('circle').data(data).join('circle')
      .attr('cx', d => x(d.d)).attr('cy', d => y(d.n)).attr('r', d => Math.min(7, 2 + Math.sqrt(d.list.length)))
      .attr('fill', 'var(--accent)').attr('stroke', 'var(--panel)').attr('stroke-width', 1.5).style('cursor', 'pointer')
      .on('mousemove', (e, d) => DSHMap.tooltip.show(h('div', null, h('div', { class: 'tt-title' }, `${fmt.date(d.d.toISOString().slice(0, 10))} · +${d.list.length} → ${d.n}`), h('div', { class: 'tt-body mono hist-tt' }, d.list.slice(0, 12).map(p => p.short).join(', ') + (d.list.length > 12 ? ' …' : ''))), e.clientX, e.clientY))
      .on('mouseleave', () => DSHMap.tooltip.hide())
      .on('click', (e, d) => { DSHMap.tooltip.hide(); DSHMap.nav.openPackage(d.list[0].id) })
  }

  function heatmap(rows) {
    const months = [...new Set(rows.map(r => r[1]))].sort()
    const areas = d3.rollups(rows, v => d3.sum(v, r => r[2]), r => r[0]).sort((a, b) => b[1] - a[1]).map(r => r[0])
    const val = new Map(rows.map(r => [`${r[0]}\u0000${r[1]}`, r[2]]))
    const max = d3.max(rows, r => r[2]) || 1
    const scale = d3.scaleSequentialLog(d3.interpolateRgbBasis(DSHMap.colors.ramp('heat'))).domain([1, max])
    const table = h('table', null,
      h('thead', null, h('tr', null, h('th'), months.map(mo => h('th', null, fmt.month(mo))))),
      h('tbody', null, areas.map(a => h('tr', null,
        h('td', { class: 'hl' }, a === '(root)' ? '(root)' : `${a}/`),
        months.map(mo => {
          const n = val.get(`${a}\u0000${mo}`) ?? 0
          return h('td', { class: ['hc', n ? null : 'zero'], style: n ? `background:${scale(n)}` : null, title: `${a} · ${mo}: ${n}` }, n >= 100 ? fmt.compact(n) : n || '')
        })))))
    return table
  }
})()
