/* DSH Map — upstream documentation, decisions (Agent Notes) and glossary
 * inside the map: Markdown + Mermaid, entity autolinks, back-references,
 * full-text search. Structure follows the official site manifest. */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, fmt, util, i18n } = DSHMap

  i18n.extend({
    uk: {
      'docs.title': 'Документація',
      'docs.tab.site': 'Сайт',
      'docs.tab.more': 'Ще',
      'docs.tab.decisions': 'Рішення',
      'docs.tab.glossary': 'Глосарій',
      'docs.filter': 'Фільтр за назвою…',
      'docs.fulltext': 'шукати в тексті',
      'docs.fulltext.loading': 'Завантажую індекс тексту…',
      'docs.fulltext.hits': '{n} документів містять «{q}»',
      'docs.coll.home': 'Головна',
      'docs.coll.guide': 'Посібник',
      'docs.coll.develop': 'Розробка',
      'docs.coll.reference': 'Довідник',
      'docs.coll.more': 'Поза сайтом',
      'docs.lead': 'Документи dsh читаються тут, з автопосиланнями на пакети, сервіси ctx.* і події. Структура — як на офіційному сайті документації (website/docs.ts); документи поза сайтом — у вкладці «Ще».',
      'docs.start': 'З чого почати',
      'docs.toc': 'Зміст',
      'docs.mentions': 'Згадані сутності',
      'docs.onsite': 'на сайті',
      'docs.words': '{n} слів',
      'docs.diagrams': '{n} діаграм',
      'docs.decisions.lead': 'Agent Notes — записи рішень: проблема, рішення, відкинуті альтернативи й наслідки. Статус закодовано в шляху (.agents/notes/<статус>/<клас>/). Архівні ({n}) заморожені й тут не показані.',
      'docs.note.status.implemented': 'реалізовано',
      'docs.note.status.proposed': 'запропоновано',
      'docs.note.status.rejected': 'відхилено',
      'docs.note.reason': 'Чому відхилено',
      'docs.glossary.lead': 'Канонічні терміни dsh із docs/glossary.md та визначення з docs/architecture.md. Ці терміни підсвічуються підказками по всій карті.',
      'docs.glossary.source': 'Джерело',
      'docs.glossary.mentions': 'Документи, що використовують термін',
      'docs.none': 'Оберіть документ ліворуч.',
    },
    en: {
      'docs.title': 'Documentation',
      'docs.tab.site': 'Site',
      'docs.tab.more': 'More',
      'docs.tab.decisions': 'Decisions',
      'docs.tab.glossary': 'Glossary',
      'docs.filter': 'Filter by title…',
      'docs.fulltext': 'search full text',
      'docs.fulltext.loading': 'Loading the text index…',
      'docs.fulltext.hits': '{n} documents contain “{q}”',
      'docs.coll.home': 'Home',
      'docs.coll.guide': 'Guide',
      'docs.coll.develop': 'Develop',
      'docs.coll.reference': 'Reference',
      'docs.coll.more': 'Outside the site',
      'docs.lead': 'The dsh documents read here, with autolinks to packages, ctx.* services and events. The structure follows the official documentation site (website/docs.ts); documents outside the site are under “More”.',
      'docs.start': 'Where to start',
      'docs.toc': 'Contents',
      'docs.mentions': 'Mentioned entities',
      'docs.onsite': 'on the site',
      'docs.words': '{n} words',
      'docs.diagrams': '{n} diagrams',
      'docs.decisions.lead': 'Agent Notes are decision records: problem, decision, rejected alternatives and consequences. The status is encoded in the path (.agents/notes/<status>/<class>/). The {n} archived notes are frozen and not shown here.',
      'docs.note.status.implemented': 'implemented',
      'docs.note.status.proposed': 'proposed',
      'docs.note.status.rejected': 'rejected',
      'docs.note.reason': 'Why rejected',
      'docs.glossary.lead': 'Canonical dsh terms from docs/glossary.md plus the definitions of docs/architecture.md. These terms get tooltips throughout the map.',
      'docs.glossary.source': 'Source',
      'docs.glossary.mentions': 'Documents using the term',
      'docs.none': 'Pick a document on the left.',
    },
  })

  const STATUS_BADGE = { implemented: 'ok', proposed: 'accent', rejected: 'danger' }
  const START_DOCS = ['docs/architecture.md', 'docs/cordis-primer.md', 'docs/glossary.md', 'docs/agent-lifecycle.md', 'docs/tool-execution-pipeline.md', 'docs/capability-seams.md', 'docs/cookbook/extension-cookbook.md', 'docs/user/guide/index.md']

  DSHMap.views.docs = {
    scroll: false,
    init(el) {
      const ui = DSHMap.ui
      this.fulltext = h('input', { type: 'checkbox' })
      this.clsChips = h('div', { class: 'chips' })
      // Text (`q`) and decision status (`st`) live in the filter bar; the
      // full-text toggle (`ft`) and decision class (`cls`) ride along as extras.
      this.bar = ui.filterBar({
        key: 'q', chipKey: 'st', placeholder: t('docs.filter'), label: t('docs.filter'),
        onChange: () => { this.renderClassChips(this.coll(DSHMap.router.params)); this.renderList() },
        extra: [h('label', { class: 'check small' }, this.fulltext, t('docs.fulltext')), this.clsChips],
        extraKeys: ['cls'], isActive: () => !!this.noteClass, onReset: () => { this.noteClass = '' },
      })
      this.tabSeg = h('div', { class: 'seg' })
      const L = ui.layout.reference(el, { title: t('docs.title'), className: 'docs-view', head: [this.tabSeg, this.bar.el] })
      this.count = L.count
      this.list = L.list
      this.detail = L.detail
      DSHMap.a11y.arrowNav(this.list, '.li')
      this.noteClass = ''
      this.fulltext.addEventListener('change', () => { DSHMap.router.replace({ ft: this.fulltext.checked ? '1' : null }); this.renderList() })
    },
    /** Status chips of the decisions tab, with counts. */
    statusChips() {
      const M = DSHMap.model
      return ['implemented', 'proposed', 'rejected'].map(st => ({ id: st, label: t(`docs.note.status.${st}`), count: M.notes.filter(n => n.status === st).length }))
    },
    /** Route keys of the list filters (2.2): text, full-text toggle, decision status and class. */
    takeFilters(params) {
      const M = DSHMap.model
      this.bar.setChips(this.coll(params) === 'decisions' ? this.statusChips() : [])
      const cls = M.notes.some(n => n.cls === params.cls) ? params.cls : ''
      const ft = params.ft === '1'
      const changed = this.bar.sync(params) || cls !== this.noteClass || ft !== this.fulltext.checked
      this.noteClass = cls
      this.fulltext.checked = ft
      this.bar.refresh()
      return changed
    },
    /** Filters that survive picking a document or switching the tab. */
    keep() { return DSHMap.ui.keepParams('q', 'ft', 'st', 'cls') },
    coll(params) {
      if (params.c) return params.c
      if (params.term) return 'glossary'
      if (params.doc) {
        const d = DSHMap.model.docById.get(params.doc)
        if (DSHMap.model.isNote(params.doc)) return 'decisions'
        if (d?.collection === 'more') return 'more'
      }
      return 'site'
    },
    show(params) { this.takeFilters(params); this.renderAll(params) },
    update(params, prev) {
      const refilter = this.takeFilters(params)
      if (this.coll(params) !== this.coll(prev)) this.renderAll(params)
      else if (params.doc !== prev.doc || params.term !== prev.term) { if (refilter) this.renderClassChips(this.coll(params)); this.renderList(); this.renderDetail(params) } else {
        if (refilter) { this.renderClassChips(this.coll(params)); this.renderList() }
        if (params.a !== prev.a) this.scrollTo(params.a)
      }
    },
    renderAll(params) {
      const c = this.coll(params)
      const M = DSHMap.model
      const tabs = [['site', t('docs.tab.site'), M.docs.filter(d => d.collection !== 'more').length], ['more', t('docs.tab.more'), M.docs.filter(d => d.collection === 'more').length], ['decisions', t('docs.tab.decisions'), M.notes.length], ['glossary', t('docs.tab.glossary'), M.glossary.length]]
      const seg = DSHMap.ui.tabs(tabs, c, id => DSHMap.router.go('docs', { ...DSHMap.ui.keepParams('q', 'ft'), c: id }), t('docs.title'))
      this.tabSeg.replaceWith(seg)
      this.tabSeg = seg
      this.renderClassChips(c)
      this.renderList()
      this.renderDetail(params)
    },
    /** Decision class chips (route key `cls`); status chips are in the filter bar. */
    renderClassChips(c) {
      const M = DSHMap.model
      clear(this.clsChips)
      this.clsChips.classList.toggle('hidden', c !== 'decisions')
      if (c !== 'decisions') return
      for (const cl of [...new Set(M.notes.map(n => n.cls))].sort()) {
        const on = this.noteClass === cl
        this.clsChips.appendChild(h('button', {
          class: ['chip', 'link', on ? 'on' : null], 'aria-pressed': String(on),
          onclick: () => { this.noteClass = on ? '' : cl; DSHMap.router.replace({ cls: this.noteClass || null }); this.renderClassChips(c); this.bar.refresh(); this.renderList() },
        }, cl, h('span', { class: 'count' }, M.notes.filter(n => n.cls === cl).length)))
      }
    },
    renderList() {
      const M = DSHMap.model
      const params = DSHMap.router.params
      const c = this.coll(params)
      const q = this.bar.query()
      const st = this.bar.chip()
      const list = clear(this.list)
      if (q && this.fulltext.checked && c !== 'glossary') { this.renderFulltext(q, c); return }
      const sel = params.doc
      const item = (d, sub, meta) => {
        const el = h('button', { class: ['li', d.id === sel ? 'is-selected' : null], ...DSHMap.ui.selAttrs(d.id === sel), onclick: () => DSHMap.router.go('docs', { ...this.keep(), c, doc: d.id }) },
          h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, d.label ?? d.title), sub ? h('div', { class: 'li-sub' }, sub) : null),
          meta ? h('div', { class: 'li-meta' }, meta) : null)
        if (d.id === sel) requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest' }))
        return el
      }
      const match = d => !q || `${d.title} ${d.label ?? ''} ${d.id}`.toLowerCase().includes(q)
      let n = 0
      if (c === 'glossary') {
        const bySection = new Map()
        for (const g of M.glossary.filter(g => !q || `${g.term} ${g.text}`.toLowerCase().includes(q))) {
          if (!bySection.has(g.section)) bySection.set(g.section, [])
          bySection.get(g.section).push(g)
        }
        for (const [sec, terms] of bySection) {
          list.appendChild(h('div', { class: 'li-group' }, h('span', null, sec), h('span', null, terms.length)))
          for (const g of terms) {
            n++
            list.appendChild(h('button', { class: ['li', params.term === g.term ? 'is-selected' : null], ...DSHMap.ui.selAttrs(params.term === g.term), onclick: () => DSHMap.router.go('docs', { ...this.keep(), c, term: g.term }) },
              h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, g.term), h('div', { class: 'li-sub' }, util.firstSentence(g.text.replace(/\*\*|`/g, ''), 90)))))
          }
        }
      } else if (c === 'decisions') {
        const notes = M.notes.filter(x => (!st || x.status === st) && (!this.noteClass || x.cls === this.noteClass) && match(x)).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
        let month = null
        for (const x of notes) {
          const mth = x.date?.slice(0, 7) ?? '—'
          if (mth !== month) { month = mth; list.appendChild(h('div', { class: 'li-group' }, h('span', null, fmt.month(mth)), h('span', null, notes.filter(y => y.date?.startsWith(mth)).length))) }
          n++
          list.appendChild(item(x, `${x.cls} · ${x.date ?? ''}`, h('span', { class: ['badge', STATUS_BADGE[x.status]] }, t(`docs.note.status.${x.status}`))))
        }
      } else {
        const docs = M.docs.filter(d => (c === 'more') === (d.collection === 'more') && match(d))
        const groups = new Map()
        for (const d of docs) {
          const key = c === 'more' ? d.section : `${t(`docs.coll.${d.collection}`)} · ${d.section}`
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key).push(d)
        }
        for (const [key, ds] of groups) {
          list.appendChild(h('div', { class: 'li-group' }, h('span', null, key), h('span', null, ds.length)))
          for (const d of ds.sort((a, b) => a.order - b.order)) { n++; list.appendChild(item(d, d.id, d.mermaid ? h('span', { class: 'badge accent', title: t('docs.diagrams', { n: d.mermaid }) }, '◇') : null)) }
        }
      }
      this.count.textContent = n
      this.bar.refresh()
      if (!n) list.appendChild(DSHMap.ui.noMatches(() => this.bar.reset()))
    },
    renderFulltext(q, c) {
      const M = DSHMap.model
      const list = this.list
      const run = rows => {
        if (this.bar.query() !== q) return
        clear(list)
        const tokens = q.split(/\s+/).filter(Boolean)
        const inColl = id => {
          if (c === 'decisions') return M.isNote(id)
          const d = M.docById.get(id)
          return d && !M.isNote(id) && (c === 'more') === (d.collection === 'more')
        }
        const hits = []
        for (const [id, text] of rows) {
          if (!inColl(id) || !tokens.every(tok => text.includes(tok))) continue
          const i = text.indexOf(tokens[0])
          const count = text.split(tokens[0]).length - 1
          hits.push({ id, count, snip: `${i > 60 ? '…' : ''}${text.slice(Math.max(0, i - 60), i + 120)}…` })
        }
        hits.sort((a, b) => b.count - a.count)
        this.count.textContent = hits.length
        list.appendChild(h('div', { class: 'li-group' }, h('span', null, t('docs.fulltext.hits', { n: hits.length, q }))))
        for (const hit of hits.slice(0, 80)) {
          const d = M.docById.get(hit.id)
          const on = DSHMap.router.params.doc === hit.id
          list.appendChild(h('button', { class: ['li', on ? 'is-selected' : null], ...DSHMap.ui.selAttrs(on), onclick: () => DSHMap.router.go('docs', { ...this.keep(), c, doc: hit.id }) },
            h('div', { class: 'li-main' }, h('div', { class: 'li-title' }, d?.label ?? d?.title ?? hit.id), h('div', { class: 'li-sub snippet', html: highlightSnippet(hit.snip, tokens) })),
            h('div', { class: 'li-meta' }, h('span', { class: 'faint tiny' }, `×${hit.count}`))))
        }
      }
      if (DSHMap.store.docsSearch) { run(DSHMap.store.docsSearch); return }
      clear(list).appendChild(DSHMap.ui.loading(t('docs.fulltext.loading')))
      DSHMap.load('docsSearch', null, `${M.meta.dataPath}/docs-search.js`).then(run).catch(err => {
        if (this.bar.query() === q) clear(list).appendChild(DSHMap.ui.errorState(err, { retry: () => this.renderFulltext(q, c) }))
      })
    },
    renderDetail(params) {
      const M = DSHMap.model
      const root = clear(this.detail)
      root.scrollTop = 0
      const page = h('div', { class: 'page doc-page' })
      root.appendChild(page)
      const c = this.coll(params)
      if (c === 'glossary') { params.term ? this.renderTerm(page, params.term) : this.renderGlossaryHome(page); return }
      const d = params.doc ? M.docById.get(params.doc) : null
      if (!d) { c === 'decisions' ? this.renderDecisionsHome(page) : this.renderHome(page); return }
      this.renderDoc(page, d, params.a)
    },
    renderHome(page) {
      const M = DSHMap.model
      page.append(h('h2', { class: 'detail-title' }, t('docs.title')), DSHMap.ui.gtext('p', { class: 'muted' }, t('docs.lead')),
        h('h2', { class: 'section-title' }, t('docs.start')),
        h('div', { class: 'concepts' }, START_DOCS.map(id => M.docById.get(id)).filter(Boolean).map(d => h('button', { class: 'card concept', onclick: () => DSHMap.nav.openDoc(d.id) },
          h('h4', null, d.label ?? d.title, h('span', { class: 'en' }, d.section)), h('p', null, util.firstSentence(d.lead ?? '', 200))))))
      const colls = ['guide', 'develop', 'reference', 'more']
      page.appendChild(h('h2', { class: 'section-title' }, t('docs.sections')))
      page.appendChild(h('div', { class: 'two-col' }, colls.map(cl => {
        const ds = M.docs.filter(d => d.collection === cl)
        const secs = [...new Set(ds.map(d => d.section))]
        return h('div', { class: 'card' }, h('h3', null, t(`docs.coll.${cl}`), ' ', h('span', { class: 'faint small' }, ds.length)),
          h('div', { class: 'chips' }, secs.map(sec => h('button', { class: 'chip link', onclick: () => DSHMap.nav.openDoc(ds.find(d => d.section === sec).id) }, sec, h('span', { class: 'count' }, ds.filter(d => d.section === sec).length)))))
      })))
    },
    renderDecisionsHome(page) {
      const M = DSHMap.model
      page.append(h('h2', { class: 'detail-title' }, t('docs.tab.decisions')), h('p', { class: 'muted' }, t('docs.decisions.lead', { n: M.archivedNotes })))
      const byPkg = [...M.refs.pkg.entries()].map(([id, ids]) => [id, ids.filter(x => M.isNote(x)).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).slice(0, 16)
      const max = byPkg[0]?.[1] || 1
      page.append(h('h2', { class: 'section-title' }, t('docs.topDecisions')),
        h('div', { class: 'card' }, h('div', { class: 'bar-list' }, byPkg.map(([id, n]) => h('button', { class: 'bar-item link', onclick: () => DSHMap.nav.openPackage(id) },
          h('span', { class: 'bl mono' }, M.pkgById.get(id)?.short ?? id), h('span', { class: 'bt' }, h('i', { style: `width:${(n / max * 100).toFixed(1)}%` })), h('span', { class: 'bv' }, n))))))
      const recent = [...M.notes].filter(n => n.cls === 'architecture' && n.status === 'implemented').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 8)
      page.append(h('h2', { class: 'section-title' }, t('docs.recentDecisions')),
        h('div', { class: 'stack' }, recent.map(n => h('button', { class: 'card concept', onclick: () => DSHMap.nav.openDoc(n.id) }, h('h4', null, n.title, h('span', { class: 'en' }, n.date)), h('p', null, util.firstSentence(n.lead ?? '', 220))))))
    },
    renderGlossaryHome(page) {
      const M = DSHMap.model
      page.append(h('h2', { class: 'detail-title' }, t('docs.tab.glossary')), h('p', { class: 'muted' }, t('docs.glossary.lead')))
      page.appendChild(h('dl', { class: 'glossary-list' }, M.glossary.flatMap(g => [
        h('dt', null, h('button', { class: 'link-btn', onclick: () => DSHMap.nav.openTerm(g.term) }, g.term), h('span', { class: 'faint tiny' }, ` · ${g.section}`)),
        h('dd', null, DSHMap.ui.markdown(g.text, 'docs'))])))
    },
    renderTerm(page, term) {
      const M = DSHMap.model
      const g = M.glossary.find(x => x.term === term)
      if (!g) { page.appendChild(DSHMap.ui.emptyState({ text: term, compact: true })); return }
      page.append(
        h('div', { class: 'd-kicker' }, t('type.term'), ' · ', g.section),
        h('h2', { class: 'd-title' }, g.term),
        h('div', { class: 'd-section' }, DSHMap.ui.markdown(g.text, 'docs')),
        h('dl', { class: 'kv' }, h('dt', null, t('docs.glossary.source')), h('dd', null, DSHMap.ui.docChip(g.source), g.anchor ? h('button', { class: 'chip link mono', onclick: () => DSHMap.nav.openDoc(`${g.source}#${g.anchor}`) }, `#${g.anchor}`) : null)))
      const hits = [...M.docs, ...M.notes].filter(d => d.lead && g.aliases.some(a => d.lead.toLowerCase().includes(a))).slice(0, 24)
      if (hits.length) page.appendChild(h('div', { class: 'd-section' }, h('h4', null, t('docs.glossary.mentions'), h('span', { class: 'count' }, hits.length)), DSHMap.ui.chipList(hits.map(d => d.id), id => DSHMap.ui.docChip(id), 24)))
    },
    renderDoc(page, d, anchor) {
      const M = DSHMap.model
      const ui = DSHMap.ui
      const note = M.isNote(d.id)
      const dir = d.id.includes('/') ? d.id.slice(0, d.id.lastIndexOf('/')) : ''
      appendAll(page,
        h('div', { class: 'd-kicker' }, note
          ? [t('type.note'), h('span', { class: ['badge', STATUS_BADGE[d.status]] }, t(`docs.note.status.${d.status}`)), h('span', { class: 'badge' }, d.cls), d.date ? h('span', { class: 'faint' }, fmt.date(d.date)) : null]
          : [t(`docs.coll.${d.collection}`), ' · ', d.section]),
        h('div', { class: 'row wrap small doc-meta' },
          h('span', { class: 'mono faint' }, d.id),
          !note ? h('span', { class: 'faint' }, t('docs.words', { n: fmt.num(d.words) })) : null,
          h('a', { class: 'btn small', href: M.github(d.id), target: '_blank', rel: 'noopener' }, svgIcon('external'), 'GitHub'),
          d.route ? h('span', { class: 'chip mono', title: 'website/docs.ts' }, svgIcon('globe'), `${t('docs.onsite')}: /en/${d.route}`) : null),
        note && d.reason ? h('div', { class: 'mode-explain doc-reason' }, h('b', null, `${t('docs.note.reason')}: `), d.reason) : null,
      )
      const layout = h('div', { class: 'doc-layout' })
      const article = h('div', { class: 'doc-article' })
      const aside = h('aside', { class: 'doc-aside' })
      layout.append(article, aside)
      page.appendChild(layout)

      // table of contents, mentions and back-references
      if (d.headings.length > 2) {
        aside.appendChild(h('div', { class: 'doc-toc' }, h('h5', null, t('docs.toc')), d.headings.map(([lvl, text, a]) => h('a', { class: `l${lvl}`, href: DSHMap.router.href('docs', { ...DSHMap.router.params, a }), onclick: e => { e.preventDefault(); DSHMap.router.setParams({ a }, { replace: true }) } }, text))))
      }
      const mm = d.mentions
      const ents = [...mm.pkgs.map(id => ui.pkgChip(id)), ...mm.svcs.map(k => ui.svcChip(k)), ...mm.events.map(n => ui.eventChip(n)), ...mm.sessionEvents.map(n => ui.sessionEventChip(n))]
      if (ents.length) aside.appendChild(h('div', { class: 'doc-side-block' }, h('h5', null, t('docs.mentions'), ' ', h('span', { class: 'faint' }, ents.length)), ui.chipList(ents, x => x, 24)))
      const back = M.refs.doc.get(d.id) ?? []
      if (back.length) aside.appendChild(h('div', { class: 'doc-side-block' }, h('h5', null, t('refs.backlinks'), ' ', h('span', { class: 'faint' }, back.length)), ui.chipList(back, id => ui.docChip(id), 12)))

      const load = () => {
        clear(article).appendChild(ui.loading())
        DSHMap.load('doc', d.id, d.file).then(rec => {
          if (DSHMap.router.params.doc !== d.id) return
          const body = ui.markdown(rec.body, dir)
          body.classList.add('doc-md')
          if (d.words < 9000) ui.glossarize(body)
          clear(article).appendChild(body)
          if (anchor) requestAnimationFrame(() => this.scrollTo(anchor))
        }).catch(err => { if (DSHMap.router.params.doc === d.id) clear(article).appendChild(ui.errorState(err, { retry: load })) })
      }
      load()
    },
    scrollTo(anchor) {
      if (!anchor) return
      const el = this.detail.querySelector(`[id="${CSS.escape(anchor)}"]`)
      if (el) el.scrollIntoView({ block: 'start' })
    },
  }

  /** Element.append without the "null" text nodes the native method would add. */
  function appendAll(el, ...xs) { el.append(...xs.filter(x => x !== null && x !== undefined && x !== false)) }

  function highlightSnippet(snip, tokens) {
    const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
    let out = esc(snip)
    for (const tok of tokens) out = out.replace(new RegExp(util.reEscape(esc(tok)), 'g'), m => `<mark>${m}</mark>`)
    return out
  }
})()
