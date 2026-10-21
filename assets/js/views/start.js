/* DSH Map — "Start here": entry points by persona, guided tours, the
 * upstream vocabulary and the glossary at a glance. */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, i18n } = DSHMap

  i18n.extend({
    uk: {
      'start.tag': 'Путівник для інженерів',
      'start.title': 'Почніть тут',
      'start.lead': 'Ця карта згенерована з коду DeepSeek Harness. Оберіть, хто ви, — і пройдіть тур на 15–30 хвилин: кожен крок відкриває документ, пакет чи файл і підсвічує його.',
      'start.thesis': 'Головна думка: у dsh усе — плагіни Cordis, а профіль (web, headless, sdk, acp) — це і є застосунок: іменована композиція бандлів і патчів.',
      'start.questions': 'Типові питання',
      'start.tours': 'Рекомендовані тури',
      'start.links': 'Далі',
      'start.alltours': 'Усі тури',
      'start.vocab': 'Мова upstream',
      'start.vocab.lead': 'Розрізи, якими мислить документація dsh. Кожен доступний як «Розріз» на карті.',
      'start.vocab.planes': 'Хребет ↔ можливості',
      'start.vocab.domains': 'Домени подій',
      'start.vocab.shapes': 'Форми пакетів',
      'start.glossary': 'Глосарій',
      'start.overview': 'Огляд у цифрах',
      'start.resume': 'Продовжити тур',
      'start.resume.step': 'крок {n}/{total}',
    },
    en: {
      'start.tag': 'A guide for engineers',
      'start.title': 'Start here',
      'start.lead': 'This map is generated from the DeepSeek Harness code. Pick who you are and take a 15–30 minute tour: every step opens a document, package or file and highlights it.',
      'start.thesis': 'The key idea: in dsh everything is a Cordis plugin, and a profile (web, headless, sdk, acp) is the application — a named composition of bundles and patches.',
      'start.questions': 'Typical questions',
      'start.tours': 'Recommended tours',
      'start.links': 'Next',
      'start.alltours': 'All tours',
      'start.vocab': 'The upstream vocabulary',
      'start.vocab.lead': 'The cuts the dsh documentation thinks in. Each is available as a “Cut” on the map.',
      'start.vocab.planes': 'Spine ↔ capabilities',
      'start.vocab.domains': 'Event domains',
      'start.vocab.shapes': 'Package shapes',
      'start.glossary': 'Glossary',
      'start.overview': 'Overview in numbers',
      'start.resume': 'Resume the tour',
      'start.resume.step': 'step {n}/{total}',
    },
  })

  DSHMap.views.start = {
    scroll: true,
    init(el) {
      const M = DSHMap.model
      const ui = DSHMap.ui
      const L = ui.layout.narrative(el, { className: 'start-page' })
      L.head({ title: t('start.title'), tools: h('span', { class: 'page-tag' }, svgIcon('compass', ''), t('start.tag')) })
      const page = L.body
      page.appendChild(h('div', { class: 'start-hero' },
        ui.gtext('p', { class: 'lead' }, t('start.lead')),
        ui.gtext('p', { class: 'thesis' }, t('start.thesis')),
        h('div', { class: 'row wrap start-actions' },
          this.resumeSlot = h('span', { class: 'contents' }),
          h('button', { class: 'btn primary', onclick: () => DSHMap.tour.start('dsh-15') }, svgIcon('play'), i18n.pick(M.tourById.get('dsh-15')?.title)),
          h('a', { class: 'btn', href: '#/overview' }, svgIcon('home'), t('start.overview')),
          h('a', { class: 'btn', href: '#/architecture' }, svgIcon('flow'), t('nav.architecture')),
          h('a', { class: 'btn', href: '#/docs' }, svgIcon('doc'), t('nav.docs')))))

      // personas
      page.appendChild(h('div', { class: 'persona-grid' }, M.guide.personas.map(p => h('div', { class: 'card persona' },
        h('h3', null, i18n.pick(p.title)),
        h('div', { class: 'd-sub-h' }, t('start.questions')),
        h('ul', { class: 'questions' }, i18n.pick(p.questions).map(q => h('li', null, q))),
        h('div', { class: 'd-sub-h' }, t('start.tours')),
        h('div', { class: 'stack persona-tours' }, p.tours.map(id => tourButton(M.tourById.get(id)))),
        h('div', { class: 'd-sub-h' }, t('start.links')),
        h('div', { class: 'stack persona-links' }, p.links.map(l => h('button', { class: ['link-btn', 'persona-link'], onclick: () => DSHMap.nav.to(l.to) }, svgIcon('next'), i18n.pick(l.label))))))))

      // all tours
      page.appendChild(h('h2', { class: 'section-title' }, t('start.alltours'), h('span', { class: 'hint' }, M.tours.length)))
      page.appendChild(h('div', { class: 'concepts' }, M.tours.map(tr => ui.cardClick(h('div', { class: 'card concept tour-card' },
        h('h4', null, h('button', { onclick: () => DSHMap.tour.start(tr.id) }, i18n.pick(tr.title)), h('span', { class: 'en' }, `${tr.steps.length} · ${t('tour.minutes', { n: tr.minutes ?? '?' })}`)),
        ui.gtext('p', null, i18n.pick(tr.blurb))), () => DSHMap.tour.start(tr.id)))))

      // vocabulary
      const V = M.vocab
      // Counted by the generator: this page renders before the entity lists load (4.1).
      const pre = M.overview.vocabCounts
      const counts = {
        planes: id => pre?.planes[id] ?? M.packages.filter(p => p.plane === id).length,
        eventDomains: id => pre?.eventDomains[id] ?? M.events.filter(e => e.udomain === id).length + (id === 'session' ? M.sessionEvents.length : 0),
        shapes: id => pre?.shapes[id] ?? M.packages.filter(p => p.shape === id).length,
      }
      const go = { planes: id => mapCut('plane', id), shapes: id => mapCut('shape', id), eventDomains: id => DSHMap.router.go('events', { tab: id === 'session' ? 'session' : 'runtime', dom: id }) }
      page.appendChild(h('h2', { class: 'section-title' }, t('start.vocab'), h('span', { class: 'hint' }, t('start.vocab.lead'))))
      page.appendChild(h('div', { class: 'vocab-grid' }, [['planes', 'start.vocab.planes'], ['eventDomains', 'start.vocab.domains'], ['shapes', 'start.vocab.shapes']].map(([kind, title]) =>
        h('div', { class: 'card' }, h('h3', null, t(title)), h('div', { class: 'stack' }, (V[kind] ?? []).map(x => ui.cardClick(h('div', { class: 'vocab-item' },
          h('span', { class: 'dot', style: `--vc:${x.color}` }), h('div', null, h('b', null, h('button', { onclick: () => go[kind](x.id) }, i18n.pick(x.title)), h('span', { class: 'faint small' }, ` · ${counts[kind](x.id)}`)), ui.gtext('div', { class: 'small muted' }, i18n.pick(x.blurb)))), () => go[kind](x.id))))))))
      page.appendChild(h('div', { class: 'mode-explain vocab-note' }, i18n.pick(V.layersNote)))

      // glossary
      page.appendChild(h('h2', { class: 'section-title' }, t('start.glossary'), h('span', { class: 'hint' }, M.glossary.length)))
      page.appendChild(h('div', { class: 'chips' }, M.glossary.map(g => h('button', { class: 'chip link', title: DSHMap.util.firstSentence(g.text.replace(/\*\*|`/g, ''), 200), onclick: () => DSHMap.nav.openTerm(g.term) }, g.term))))
    },
    show(params) {
      if (params.tour) { DSHMap.tour.start(params.tour, Number(params.step ?? 0)) }
      this.renderResume()
    },
    renderResume() {
      if (!this.resumeSlot) return
      const r = DSHMap.tour.resumable()
      clear(this.resumeSlot)
      if (r) {
        this.resumeSlot.appendChild(h('button', { class: 'btn primary', title: i18n.pick(r.tour.title), onclick: () => DSHMap.tour.start(r.tour.id, r.step) },
          svgIcon('play'), `${t('start.resume')} · ${t('start.resume.step', { n: r.step + 1, total: r.tour.steps.length })}`))
      }
    },
  }
  DSHMap.on('tour', () => DSHMap.views.start.renderResume())

  function tourButton(tr) {
    if (!tr) return null
    return h('button', { class: 'tour-btn', onclick: () => DSHMap.tour.start(tr.id) },
      svgIcon('play'), h('span', { class: 'grow' }, i18n.pick(tr.title)), h('span', { class: 'faint tiny' }, t('tour.minutes', { n: tr.minutes ?? '?' })))
  }

  function mapCut(cut, value) {
    DSHMap.nav.mapWith({ cut, mode: 'packages', cutFocus: value })
  }
})()
