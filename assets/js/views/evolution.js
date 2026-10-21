/* DSH Map — evolution and depth (roadmap phase 4): what changed between two
 * versions with the upgrade guides to follow (4.1), the Session format
 * history (4.2), the API stability index (4.4) and the exported-symbol index
 * (4.3; "go to definition" lives in viewer.js). Fingerprints are lazy data
 * files in data/fp/ (generator/lib/fingerprint.mjs); the diff is shared with
 * the generator (assets/js/evodiff.js). */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, fmt, util, i18n } = DSHMap

  i18n.extend({
    uk: {
      'evo.tab.changes': 'Що нового',
      'evo.tab.format': 'Формат сесії',
      'evo.tab.stability': 'Стабільність API',
      'evo.tab.symbols': 'Символи',
      'evo.lead': 'Як змінюється dsh: діф двох знімків з гайдами з оновлення, хронологія формату журналу сесії, індекс стабільності API і навігація експортованими символами.',
      'evo.from': 'Було',
      'evo.to': 'Стало',
      'evo.swap': 'Поміняти',
      'evo.noFp': 'Знімків версій немає. Згенеруйте їх: cd generator && npm run build (без --no-baselines).',
      'evo.loading': 'Завантажую знімки…',
      'evo.same': 'Оберіть дві різні версії.',
      'evo.unavailable': 'Непорівнянні дані: {kinds} — у старішій версії не було відповідного каталогу upstream.',
      'evo.guides': 'Що треба мігрувати',
      'evo.guides.lead': 'Гайди з docs/upgrade-guide для версій у вибраному діапазоні: що змінилося (## Change) і кроки міграції (## Migration).',
      'evo.guides.none': 'Для цього діапазону upstream не публікував гайдів з оновлення.',
      'evo.guides.steps': '{n} кроків',
      'evo.copy': 'Копіювати звіт (Markdown)',
      'evo.copied': 'Звіт скопійовано',
      'evo.k.packages': 'Пакети',
      'evo.k.services': 'Сервіси ctx.*',
      'evo.k.events': 'Рантайм-події',
      'evo.k.sessionEvents': 'Події журналу',
      'evo.k.tools': 'Інструменти',
      'evo.k.config': 'Ключі конфігу',
      'evo.k.profiles': 'Профілі',
      'evo.k.slots': 'UI-слоти',
      'evo.k.commands': 'Slash-команди',
      'evo.k.cli': 'Прапорці CLI',
      'evo.k.env': 'Змінні середовища',
      'evo.k.symbols': 'Публічні символи',
      'evo.added': 'додано',
      'evo.removed': 'видалено',
      'evo.changed': 'змінено',
      'evo.moved': 'переміщено',
      'evo.nochange': 'без змін',
      'evo.methods': 'методи',
      'evo.params': 'параметри',
      'evo.schema': 'схема',
      'evo.shape': 'форма payload',
      'evo.mounted': 'змонтовано рядком',
      'evo.loadedDep': 'як залежність',
      'evo.flags': 'прапорці',
      'evo.sym.pkgs': '{n} пакетів зі зміненим API',
      'evo.history.note': 'Знімок — це інвентар сутностей дерева dsh, витягнутий тими самими парсерами, що й карта (generator/lib/fingerprint.mjs). Релізні теги розпаковуються через git archive; підпис символу порівнюється за хешем.',
      'fmt.status': 'Стан формату',
      'fmt.writer': 'пише версію',
      'fmt.finalized': 'остання фіналізована',
      'fmt.released': 'остання випущена',
      'fmt.evidence': 'доказ — тег',
      'fmt.chain': 'Ланцюг версій формату',
      'fmt.chain.lead': 'Кожна версія формату — повний знімок коренів (заголовок сесії, конверт події, усі події журналу) з historical-formats/vN.md; поточна — фіналізований чекпойнт. Дельта рахується за дайджестами коренів.',
      'fmt.roots': '{r} коренів · {t} типів',
      'fmt.afterFinal': 'Після фіналізації v{v} додано без зміни версії',
      'fmt.timeline': 'Хронологія',
      'fmt.timeline.lead': 'Записи persistence-changes (підтвердження сумісності, version-bump) і ретроспективний архів релізів releases/ (зміни між сусідніми тегами).',
      'fmt.filter.event': 'Подія журналу…',
      'fmt.kind.release': 'реліз',
      'fmt.kind.change': 'зміна',
      'fmt.kind.bump': 'version-bump',
      'fmt.kind.baseline': 'базовий запис',
      'fmt.show.releases': 'релізи',
      'fmt.show.changes': 'зміни',
      'fmt.empty': 'Немає записів для цього фільтра.',
      'fmt.header': 'заголовок / конверт',
      'fmt.eventHistory': 'Історія формату',
      'stab.lead': 'Індекс стабільності підказує, на які API розширенню безпечно спиратися. Він поєднує вік, частоту змін, кількість залежних і те, як часто публічний API змінювався між релізами з серії знімків. Це евристика карти, а не гарантія upstream.',
      'stab.formula': 'бал = {age}·вік + {calm}·спокій + {dependents}·залежні + {api}·API, де вік = днів/120, спокій = 1 − комітів за 3 міс./{calm_n}, залежні = log₂(1+Ca)/log₂41, API = 1 − змін API / переходів між релізами. I = Ce/(Ca+Ce) — нестабільність за Мартіном.',
      'stab.series': 'Серія: {n} релізів, {c} порівнянних переходів',
      'stab.kind.packages': 'Пакети',
      'stab.kind.services': 'Сервіси',
      'stab.kind.events': 'Події',
      'stab.filter': 'Фільтр…',
      'stab.filter.label': 'Фільтр за назвою',
      'stab.tier.label': 'Рівень стабільності',
      'stab.tier.stable': 'стабільний',
      'stab.tier.maturing': 'дозріває',
      'stab.tier.volatile': 'мінливий',
      'stab.tier.experimental': 'експериментальний',
      'stab.col.score': 'Бал',
      'stab.col.age': 'Вік, дн.',
      'stab.col.recent': 'Комітів / 3 міс.',
      'stab.col.ca': 'Залежні (Ca)',
      'stab.col.ce': 'Залежності (Ce)',
      'stab.col.i': 'I',
      'stab.col.api': 'Змін API',
      'stab.col.symbols': 'Символів',
      'stab.col.uses': 'Імпортів',
      'stab.col.since': 'З релізу',
      'stab.col.methods': 'Методів',
      'stab.col.consumers': 'Споживачів',
      'stab.col.listeners': 'Слухачів',
      'stab.hideExp': 'без experimental',
      'stab.badge': 'Стабільність: {tier} ({score})',
      'sym.lead': 'Індекс експортованих символів будується під час генерації через TypeScript compiler API (лише синтаксис): публічна поверхня кожного пакета (точки входу з package.json exports, крізь ланцюжки export … from) та імпорти, розв’язані до файлу й рядка визначення. У переглядачі коду імпортовані імена — посилання «перейти до визначення», а експортовані оголошення показують, хто їх використовує.',
      'sym.stats': '{f} файлів · {d} експортованих оголошень · {p} публічних символів · {r} з {i} імпортів розв’язано',
      'sym.filter': 'Символ, пакет…',
      'sym.top': 'Найуживаніші публічні символи',
      'sym.col.name': 'Символ',
      'sym.col.kind': 'Вид',
      'sym.col.pkg': 'Пакет',
      'sym.col.uses': 'Імпортів',
      'sym.loading': 'Завантажую індекс символів…',
      'sym.uses': 'Хто використовує',
      'sym.uses.none': 'Інші пакети цей символ не імпортують.',
      'sym.internal': 'Не входить у публічну поверхню пакета (не експортується з точки входу).',
      'sym.goto': 'Перейти до визначення',
      'sym.since': 'з {v}',
      'sym.changes': 'підпис змінювався {n}×',
      'd.api': 'Публічний API',
      'd.api.filter': 'Фільтр символів…',
      'd.api.more': 'ще {n}',
      'viewer.back': 'Назад до попереднього файлу',
      'viewer.syms': '{i} імпортів з визначеннями · {e} експортів',
    },
    en: {
      'evo.tab.changes': 'What’s new',
      'evo.tab.format': 'Session format',
      'evo.tab.stability': 'API stability',
      'evo.tab.symbols': 'Symbols',
      'evo.lead': 'How dsh changes: the diff of two snapshots with the upgrade guides to follow, the Session log format history, the API stability index and exported-symbol navigation.',
      'evo.from': 'From',
      'evo.to': 'To',
      'evo.swap': 'Swap',
      'evo.noFp': 'No version fingerprints. Generate them: cd generator && npm run build (without --no-baselines).',
      'evo.loading': 'Loading fingerprints…',
      'evo.same': 'Pick two different versions.',
      'evo.unavailable': 'Not comparable: {kinds} — the older version lacks the upstream catalog.',
      'evo.guides': 'What to migrate',
      'evo.guides.lead': 'Guides from docs/upgrade-guide for versions in the selected range: what changed (## Change) and the migration steps (## Migration).',
      'evo.guides.none': 'Upstream published no upgrade guides for this range.',
      'evo.guides.steps': '{n} steps',
      'evo.copy': 'Copy report (Markdown)',
      'evo.copied': 'Report copied',
      'evo.k.packages': 'Packages',
      'evo.k.services': 'ctx.* services',
      'evo.k.events': 'Runtime events',
      'evo.k.sessionEvents': 'Session log events',
      'evo.k.tools': 'Tools',
      'evo.k.config': 'Config keys',
      'evo.k.profiles': 'Profiles',
      'evo.k.slots': 'UI slots',
      'evo.k.commands': 'Slash commands',
      'evo.k.cli': 'CLI flags',
      'evo.k.env': 'Environment variables',
      'evo.k.symbols': 'Public symbols',
      'evo.added': 'added',
      'evo.removed': 'removed',
      'evo.changed': 'changed',
      'evo.moved': 'moved',
      'evo.nochange': 'no changes',
      'evo.methods': 'methods',
      'evo.params': 'parameters',
      'evo.schema': 'schema',
      'evo.shape': 'payload shape',
      'evo.mounted': 'mounted by a row',
      'evo.loadedDep': 'as a dependency',
      'evo.flags': 'flags',
      'evo.sym.pkgs': '{n} packages with a changed API',
      'evo.history.note': 'A fingerprint is the entity inventory of a dsh tree, extracted with the same parsers as the map (generator/lib/fingerprint.mjs). Release tags are unpacked with git archive; symbol signatures are compared by hash.',
      'fmt.status': 'Format status',
      'fmt.writer': 'writes version',
      'fmt.finalized': 'latest finalized',
      'fmt.released': 'latest released',
      'fmt.evidence': 'evidence tag',
      'fmt.chain': 'Format version chain',
      'fmt.chain.lead': 'Every format version is a complete snapshot of the roots (Session header, event envelope, all log events) from historical-formats/vN.md; the current one is the finalized checkpoint. The delta compares root digests.',
      'fmt.roots': '{r} roots · {t} types',
      'fmt.afterFinal': 'Added after finalizing v{v} without a version change',
      'fmt.timeline': 'Timeline',
      'fmt.timeline.lead': 'persistence-changes records (compatibility acknowledgements, version bumps) and the retrospective release archive releases/ (changes between adjacent tags).',
      'fmt.filter.event': 'Session log event…',
      'fmt.kind.release': 'release',
      'fmt.kind.change': 'change',
      'fmt.kind.bump': 'version-bump',
      'fmt.kind.baseline': 'baseline record',
      'fmt.show.releases': 'releases',
      'fmt.show.changes': 'changes',
      'fmt.empty': 'No records for this filter.',
      'fmt.header': 'header / envelope',
      'fmt.eventHistory': 'Format history',
      'stab.lead': 'The stability index suggests which APIs an extension can safely rely on. It combines age, change frequency, the number of dependents and how often the public API changed between the releases of the fingerprint series. It is a heuristic of the map, not an upstream guarantee.',
      'stab.formula': 'score = {age}·age + {calm}·calm + {dependents}·dependents + {api}·API, where age = days/120, calm = 1 − commits in 3 months/{calm_n}, dependents = log₂(1+Ca)/log₂41, API = 1 − API changes / release transitions. I = Ce/(Ca+Ce) is Martin’s instability.',
      'stab.series': 'Series: {n} releases, {c} comparable transitions',
      'stab.kind.packages': 'Packages',
      'stab.kind.services': 'Services',
      'stab.kind.events': 'Events',
      'stab.filter': 'Filter…',
      'stab.filter.label': 'Filter by name',
      'stab.tier.label': 'Stability tier',
      'stab.tier.stable': 'stable',
      'stab.tier.maturing': 'maturing',
      'stab.tier.volatile': 'volatile',
      'stab.tier.experimental': 'experimental',
      'stab.col.score': 'Score',
      'stab.col.age': 'Age, days',
      'stab.col.recent': 'Commits / 3 mo',
      'stab.col.ca': 'Dependents (Ca)',
      'stab.col.ce': 'Dependencies (Ce)',
      'stab.col.i': 'I',
      'stab.col.api': 'API changes',
      'stab.col.symbols': 'Symbols',
      'stab.col.uses': 'Imports',
      'stab.col.since': 'Since',
      'stab.col.methods': 'Methods',
      'stab.col.consumers': 'Consumers',
      'stab.col.listeners': 'Listeners',
      'stab.hideExp': 'hide experimental',
      'stab.badge': 'Stability: {tier} ({score})',
      'sym.lead': 'The exported-symbol index is built at generation time with the TypeScript compiler API (syntax only): the public surface of every package (package.json exports entry points, through export … from chains) and imports resolved to the defining file and line. In the code viewer imported names link to their definition, and exported declarations show who uses them.',
      'sym.stats': '{f} files · {d} exported declarations · {p} public symbols · {r} of {i} imports resolved',
      'sym.filter': 'Symbol, package…',
      'sym.top': 'Most used public symbols',
      'sym.col.name': 'Symbol',
      'sym.col.kind': 'Kind',
      'sym.col.pkg': 'Package',
      'sym.col.uses': 'Imports',
      'sym.loading': 'Loading the symbol index…',
      'sym.uses': 'Who uses it',
      'sym.uses.none': 'No other package imports this symbol.',
      'sym.internal': 'Not part of the package’s public surface (not exported from an entry point).',
      'sym.goto': 'Go to definition',
      'sym.since': 'since {v}',
      'sym.changes': 'signature changed {n}×',
      'd.api': 'Public API',
      'd.api.filter': 'Filter symbols…',
      'd.api.more': '{n} more',
      'viewer.back': 'Back to the previous file',
      'viewer.syms': '{i} imports with definitions · {e} exports',
    },
  })

  const TABS = ['changes', 'format', 'stability', 'symbols']
  const TIER_BADGE = { stable: 'ok', maturing: 'accent', volatile: 'warn', experimental: 'pink' }
  const TIERS = ['stable', 'maturing', 'volatile', 'experimental']
  const KIND_ORDER = ['packages', 'services', 'events', 'sessionEvents', 'tools', 'config', 'profiles', 'cli', 'commands', 'env', 'slots', 'symbols']
  const FP_INDEX = 'data/fp/index.js'

  const E = () => DSHMap.model.data.evolution
  const short = id => DSHMap.model.pkgById.get(id)?.short ?? String(id).replace(/^@deepseek-ai\/(dsh-)?/, '')
  const versionLabel = v => (v ? `${v.version ?? v.id}${v.id === 'latest' ? ` · ${t('version.latest')}` : ''}` : '')
  const seLink = name => (DSHMap.model.seByName.has(name) ? DSHMap.ui.sessionEventChip(name) : h('span', { class: 'chip mono evo-gone' }, name))

  /** Lazy loaders for the fingerprint index and fingerprints. */
  const fp = {
    index() { return DSHMap.load('fpIndex', null, FP_INDEX).then(list => [...list].sort((a, b) => DSHEvo.compareVersions(b.version, a.version) || (a.id === 'latest' ? -1 : 1))) },
    get(entry) { return DSHMap.load('fp', entry.id, entry.file) },
  }

  /** Default comparison base: the newest version of an older release line than `to`. */
  function defaultFrom(list, to) {
    const tv = DSHEvo.parseVersion(to.version)
    const older = list.filter(x => x.id !== to.id && DSHEvo.compareVersions(x.version, to.version) < 0)
    if (!tv) return older[0] ?? null
    return older.find(x => DSHEvo.parseVersion(x.version)?.line !== tv.line) ?? older[0] ?? null
  }

  DSHMap.views.evolution = {
    scroll: true,
    init(el) {
      this.el = el
      this.L = DSHMap.ui.layout.narrative(el, { className: 'evo-page' })
      this.panes = DSHMap.ui.panes(this.L.body, this, ['fb', 'redraw'])
      this.state = { stabKind: 'packages', hideExp: false, sort: { key: 'score', dir: -1 }, symSort: null, fmtShow: { releases: true, changes: true } }
    },
    tab(params) { return TABS.includes(params.tab) ? params.tab : 'changes' },
    show(params) { this.render(params) },
    update(params, prev) {
      if (this.tab(params) !== this.tab(prev) || params.from !== prev.from || params.to !== prev.to || params.ev !== prev.ev || params.kind !== prev.kind) this.render(params)
      // Back/Forward over a filter change: take it from the route.
      else if (this.fb?.sync(params)) this.redraw?.()
    },
    render(params) {
      const tab = this.tab(params)
      this.L.head({
        title: t('nav.evolution'),
        tabs: DSHMap.ui.tabs(TABS.map(id => [id, t(`evo.tab.${id}`)]), tab, id => DSHMap.router.go('evolution', { tab: id }), t('nav.evolution')),
        lead: t('evo.lead'),
      })
      // Tabs seen before come back from the pane cache with their filter and scroll position (4.5).
      const key = [tab, params.from, params.to, params.ev, params.kind].map(x => x ?? '').join('|')
      const { fresh } = this.panes.show(key, pane => {
        const body = h('div', { class: 'evo-body' })
        pane.appendChild(body)
        this[`render_${tab}`](body, params)
      }, this.el)
      if (!fresh && this.fb?.sync(params)) this.redraw?.()
    },
    /** Render the current tab from scratch (Retry, reset). */
    rebuild(params) {
      this.panes.drop(this.panes.key)
      this.render(params)
    },

    // ── 4.1 what's new ──────────────────────────────────────────────────
    render_changes(body, params) {
      const M = DSHMap.model
      const noFp = () => DSHMap.ui.emptyState({ icon: 'info', text: t('evo.noFp') })
      body.appendChild(DSHMap.ui.loading(t('evo.loading')))
      fp.index().then(list => {
        clear(body)
        if (list.length < 2) { body.appendChild(noFp()); return }
        const to = list.find(x => x.id === params.to) ?? list.find(x => x.id === M.meta.versionId) ?? list[0]
        const from = list.find(x => x.id === params.from) ?? defaultFrom(list, to)
        const pick = (label, cur, key) => h('label', { class: 'row evo-pick' }, h('span', { class: 'faint small' }, label),
          h('select', { class: 'input', onchange: e => DSHMap.router.setParams({ [key]: e.target.value }) }, list.map(v => h('option', { value: v.id, selected: v.id === cur?.id }, versionLabel(v)))))
        const bar = h('div', { class: 'row wrap evo-bar' },
          pick(t('evo.from'), from, 'from'), h('span', { class: 'faint' }, '→'), pick(t('evo.to'), to, 'to'),
          h('button', { class: 'btn small', onclick: () => DSHMap.router.setParams({ from: to.id, to: from?.id }) }, svgIcon('shuffle'), t('evo.swap')))
        body.appendChild(bar)
        const out = h('div')
        body.appendChild(out)
        if (!from || from.id === to.id) { out.appendChild(DSHMap.ui.emptyState({ icon: 'info', text: t('evo.same'), compact: true })); return }
        out.appendChild(DSHMap.ui.loading(t('evo.loading')))
        Promise.all([fp.get(from), fp.get(to)]).then(([a, b]) => {
          if (DSHMap.router.view !== 'evolution') return
          const diff = DSHEvo.diffFingerprints(a, b)
          const guides = guidesBetween(from.version, to.version)
          bar.appendChild(DSHMap.ui.copyButton(() => diffMarkdown(from, to, diff, guides), { label: t('evo.copy'), done: t('evo.copied') }))
          renderDiff(clear(out), from, to, diff, guides, a, b)
        }).catch(err => { clear(out).appendChild(DSHMap.ui.errorState(err, { retry: () => this.rebuild(params) })) })
      }).catch(() => { clear(body).appendChild(noFp()) })
    },

    // ── 4.2 Session format ──────────────────────────────────────────────
    render_format(body, params) {
      const M = DSHMap.model
      const F = E().format
      const st = F.status
      if (st) {
        body.appendChild(h('div', { class: 'kpis fmt-kpis' },
          kpi(`v${st.writer ?? '?'}`, t('fmt.writer')), kpi(`v${st.finalized ?? '?'}`, t('fmt.finalized')), kpi(`v${st.released ?? '?'}`, t('fmt.released')),
          kpi(st.evidenceTag ?? '—', t('fmt.evidence'), () => DSHMap.nav.openDoc('docs/session-format-status.md#release-record'))))
      }
      // version chain
      body.appendChild(h('h2', { class: 'section-title' }, t('fmt.chain'), h('span', { class: 'hint' }, h('button', { class: 'link-btn', onclick: () => DSHMap.nav.openDoc('docs/persistence-changes/historical-formats/README.md') }, 'historical-formats'))))
      body.appendChild(h('p', { class: 'muted small' }, t('fmt.chain.lead')))
      const current = new Set(M.sessionEvents.map(e => e.name))
      const chain = h('div', { class: 'fmt-chain' })
      F.versions.forEach((v, i) => {
        if (i) chain.appendChild(h('div', { class: 'fmt-arrow' }, '→'))
        const d = v.delta
        const on = params.v === String(v.version)
        chain.appendChild(h('div', { class: ['card', 'fmt-ver', on ? 'is-selected' : null], ...DSHMap.ui.selAttrs(on) },
          h('div', { class: 'row fmt-ver-head' }, h('b', { class: 'fmt-num' }, `v${v.version}`), h('span', { class: 'faint small mono truncate' }, v.source ?? '')),
          h('div', { class: 'faint tiny' }, t('fmt.roots', { r: v.roots, t: v.types ?? '?' })),
          d ? h('div', { class: 'chips fmt-delta' },
            d.added.length ? h('span', { class: 'badge ok' }, `+${d.added.length}`) : null,
            d.removed.length ? h('span', { class: 'badge danger' }, `−${d.removed.length}`) : null,
            d.changed.length ? h('span', { class: 'badge' }, `~${d.changed.length}`) : null) : null,
          d && (d.added.length || d.removed.length || d.changed.length) ? h('details', { class: 'fold fmt-fold' }, h('summary', null, `v${v.version - 1} → v${v.version}`),
            h('div', { class: 'fold-body' }, rootChips(d.added, 'added'), rootChips(d.removed, 'removed'), rootChips(d.changed, 'changed'))) : null,
          h('button', { class: ['link-btn', 'tiny'], onclick: () => DSHMap.nav.openDoc(v.doc) }, v.doc.split('/').pop())))
      })
      body.appendChild(h('div', { class: 'table-scroll' }, chain))
      const last = F.versions[F.versions.length - 1]
      if (last) {
        const after = [...current].filter(n => !last.events.includes(n)).sort()
        if (after.length) body.appendChild(h('div', { class: 'callout tip fmt-after' }, svgIcon('info'), h('div', null, h('b', null, t('fmt.afterFinal', { v: last.version })), ' ', h('div', { class: 'chips' }, after.map(seLink)))))
      }

      // timeline
      body.appendChild(h('h2', { class: 'section-title' }, t('fmt.timeline'), h('span', { class: 'hint' }, h('button', { class: 'link-btn', onclick: () => DSHMap.nav.openDoc('docs/persistence-changes/README.md') }, 'docs/persistence-changes'))))
      body.appendChild(h('p', { class: 'muted small' }, t('fmt.timeline.lead')))
      const evInput = h('input', { class: 'input fmt-ev-input', list: 'evo-se-list', placeholder: t('fmt.filter.event'), 'aria-label': t('fmt.filter.event'), value: params.ev ?? '' })
      const allRoots = new Set([...F.releases, ...F.changes].flatMap(r => r.changes.map(c => c.root)).filter(r => r.startsWith('event:')).map(r => r.slice(6)))
      const dl = h('datalist', { id: 'evo-se-list' }, [...allRoots].sort().map(n => h('option', { value: n })))
      const toggles = ['releases', 'changes'].map(k => h('label', { class: 'row small evo-check' }, h('input', { type: 'checkbox', checked: this.state.fmtShow[k], onchange: e => { this.state.fmtShow[k] = e.target.checked; draw() } }), t(`fmt.show.${k}`)))
      evInput.addEventListener('change', () => DSHMap.router.setParams({ ev: evInput.value.trim() || null }, { replace: true }))
      body.appendChild(h('div', { class: 'row wrap evo-toolbar' }, evInput, dl, ...toggles,
        params.ev && M.seByName.has(params.ev) ? h('button', { class: ['link-btn', 'small'], onclick: () => DSHMap.nav.openSessionEvent(params.ev) }, `→ ${params.ev}`) : null))
      const list = h('div', { class: 'fmt-timeline' })
      body.appendChild(list)
      const entries = [
        ...F.releases.map(r => ({ kind: 'release', date: r.date?.slice(0, 10) ?? '', title: r.tag, summary: r.summary, doc: r.doc, changes: r.changes, badge: r.format !== null ? `v${r.format}` : null })),
        ...F.changes.map(c => ({ kind: c.bump ? 'bump' : c.baseline ? 'baseline' : 'change', date: c.date, title: c.id.replace(/^\d{4}-\d{2}-\d{2}-/, ''), summary: c.summary, doc: c.doc, changes: c.changes })),
      ].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
      const draw = () => {
        clear(list)
        const ev = params.ev ? `event:${params.ev}` : null
        const shown = entries.filter(x => (x.kind === 'release' ? this.state.fmtShow.releases : this.state.fmtShow.changes) && (!ev || x.changes.some(c => c.root === ev)))
        if (!shown.length) {
          list.appendChild(DSHMap.ui.emptyState({ icon: 'filter', text: t('fmt.empty'), compact: true, action: { label: t('ui.resetFilters'), onClick: resetFmt } }))
          return
        }
        for (const x of shown) {
          const rel = ev ? x.changes.filter(c => c.root === ev) : x.changes
          list.appendChild(h('div', { class: ['fmt-entry', x.kind] },
            h('div', { class: 'fmt-date mono small' }, x.date),
            h('div', { class: 'fmt-dot' }),
            h('div', { class: 'fmt-body card' },
              h('div', { class: 'row wrap fmt-entry-head' },
                h('span', { class: ['badge', x.kind === 'bump' ? 'danger' : x.kind === 'release' ? null : x.kind === 'baseline' ? 'accent' : 'ok'] }, t(`fmt.kind.${x.kind}`)),
                h('b', { class: 'mono small' }, x.title), x.badge ? h('span', { class: 'chip mono' }, x.badge) : null,
                h('span', { class: 'grow' }),
                x.doc ? h('button', { class: ['link-btn', 'tiny'], onclick: () => DSHMap.nav.openDoc(x.doc) }, svgIcon('doc', 'inline-icon'), ' doc') : null),
              x.summary ? h('p', { class: 'small fmt-summary' }, x.summary) : null,
              rootGroups(rel))))
        }
      }
      const resetFmt = () => {
        this.state.fmtShow = { releases: true, changes: true }
        if (params.ev) DSHMap.router.setParams({ ev: null }, { replace: true })
        else this.rebuild(params)
      }
      draw()
    },

    // ── 4.4 stability ───────────────────────────────────────────────────
    render_stability(body, params) {
      const S = E().stability
      const W = S.weights
      const st = this.state
      const kind = ['packages', 'services', 'events'].includes(params.kind) ? params.kind : st.stabKind
      st.stabKind = kind
      body.append(
        h('div', { class: 'callout tip' }, svgIcon('info'), h('div', null, t('stab.lead'), h('div', { class: 'mono tiny stab-formula' }, t('stab.formula', { ...W, calm_n: S.calmCommits ?? 160 })),
          h('div', { class: 'faint tiny stab-series' }, t('stab.series', { n: E().series.length, c: S.comparable }), ': ', E().series.map(s => s.version).join(' → ')))))
      const counts = {}
      for (const r of S[kind]) counts[r.tier] = (counts[r.tier] ?? 0) + 1
      const hideExp = kind === 'packages' ? h('input', { type: 'checkbox', checked: st.hideExp, onchange: e => { st.hideExp = e.target.checked; draw() } }) : null
      // Text in route key `q`, tier chip in `tier`; both survive switching the kind.
      const fb = this.fb = DSHMap.ui.filterBar({
        key: 'q', chipKey: 'tier', placeholder: t('stab.filter'), label: t('stab.filter.label'), chipsLabel: t('stab.tier.label'),
        chips: TIERS.filter(x => counts[x]).map(x => ({ id: x, label: [h('span', { class: ['dot', `tier-${x}`] }), t(`stab.tier.${x}`)], count: counts[x] })),
        onChange: () => draw(),
        extra: hideExp ? h('label', { class: 'row small evo-check' }, hideExp, t('stab.hideExp')) : null,
      })
      fb.sync(params)
      body.appendChild(h('div', { class: 'stab-toolbar' },
        DSHMap.ui.tabs(['packages', 'services', 'events'].map(k => [k, t(`stab.kind.${k}`), S[k].length]), kind, k => DSHMap.router.setParams({ kind: k })),
        fb.el))
      const cols = stabColumns(kind)
      // Numeric columns sort descending first; missing values (no release history) always last.
      const tbl = DSHMap.ui.table({
        columns: cols.map(c => ({ key: c.key, label: c.label, num: c.num, title: c.title, sort: c.val, cell: c.cell })),
        sort: cols.some(c => c.key === st.sort.key) ? st.sort : { key: 'score', dir: -1 },
        onSort: s => { st.sort = s },
        row: r => ({ class: 'clickable', onclick: () => openStabRow(kind, r) }),
        className: 'stab-table', card: true, label: t('evo.tab.stability'),
        empty: DSHMap.ui.noMatches(() => { if (hideExp?.checked) { hideExp.checked = false; st.hideExp = false } fb.reset() }),
      })
      body.appendChild(tbl)
      const draw = () => {
        const needle = fb.query()
        const tier = fb.chip()
        let rows = S[kind].filter(r => (!tier || r.tier === tier) && (!st.hideExp || kind !== 'packages' || r.tier !== 'experimental'))
        if (needle) rows = rows.filter(r => (r.id ?? r.key ?? r.name).toLowerCase().includes(needle))
        tbl.update(rows)
      }
      this.redraw = draw
      draw()
    },

    // ── 4.3 symbols ─────────────────────────────────────────────────────
    render_symbols(body, params) {
      const Y = E().symbols
      const st = this.state
      body.append(
        h('div', { class: 'callout tip' }, svgIcon('code'), h('div', null, t('sym.lead'))),
        h('div', { class: 'faint small sym-stats' }, t('sym.stats', { f: fmt.num(Y.files), d: fmt.num(Y.declarations), p: fmt.num(Y.public), r: fmt.num(Y.resolved), i: fmt.num(Y.imports) })))
      const fb = this.fb = DSHMap.ui.filterBar({ key: 'q', placeholder: t('sym.filter'), label: t('sym.filter'), onChange: () => this.redraw?.() })
      fb.sync(params)
      const head = h('h2', { class: 'section-title' }, t('sym.top'))
      const host = h('div', null, DSHMap.ui.loading(t('sym.loading')))
      const uses = h('div')
      body.append(h('div', { class: 'sym-filter' }, fb.el), head, host, uses)
      loadSymbols().then(rows => {
        // The pane may be hidden (kept in the pane cache) or gone.
        if (!this.panes.holds(body)) return
        const tbl = DSHMap.ui.table({
          columns: [
            { key: 'name', label: t('sym.col.name'), sort: r => r[0], cell: r => h('span', { class: 'mono' }, r[0]) },
            { key: 'kind', label: t('sym.col.kind'), sort: r => r[4] ?? '', cell: r => kindBadge(r[4]) },
            { key: 'pkg', label: t('sym.col.pkg'), sort: r => short(r[1]), cell: r => DSHMap.ui.pkgChip(r[1]) },
            { key: 'uses', label: t('sym.col.uses'), num: true, sort: r => r[5], cell: r => fmt.num(r[5]) },
            { key: 'act', label: '', sort: false, cell: r => (r[5] ? h('button', { class: ['link-btn', 'tiny'], onclick: e => { e.stopPropagation(); showUses(clear(uses), r[1], r[0]) } }, t('sym.uses')) : null) },
          ],
          // No initial order: the list keeps its ranking (most used, exact match first) until a header is clicked.
          sort: st.symSort, onSort: s => { st.symSort = s },
          row: r => ({ class: 'clickable', onclick: () => DSHMap.nav.openFile(r[2], { line: r[3] }) }),
          card: true, label: t('sym.top'), empty: DSHMap.ui.noMatches(() => fb.reset()),
        })
        clear(host).appendChild(tbl)
        const draw = () => {
          const needle = fb.query()
          let list = rows
          if (needle) {
            const toks = needle.split(/\s+/)
            list = rows.filter(r => toks.every(tk => r[0].toLowerCase().includes(tk) || r[1].toLowerCase().includes(tk)))
            list = [...list].sort((a, b) => (a[0].toLowerCase() === needle ? -1 : 0) - (b[0].toLowerCase() === needle ? -1 : 0) || b[5] - a[5])
          }
          head.firstChild.textContent = needle ? `${t('type.symbol')}: ${list.length}` : t('sym.top')
          tbl.update(list)
        }
        this.panes.assign(body, { redraw: draw })
        draw()
      }).catch(err => { clear(host).appendChild(DSHMap.ui.errorState(err, { retry: () => this.rebuild(params) })) })
    },
  }

  // ── helpers ─────────────────────────────────────────────────────────────

  function kpi(value, label, onclick) {
    return h(onclick ? 'button' : 'div', { class: ['kpi', onclick ? null : 'kpi-static'], onclick }, h('b', { class: 'mono fmt-kpi-v' }, value), h('span', null, label))
  }
  function kindBadge(kind) {
    const cls = { class: 'accent', interface: 'ok', type: 'ok', function: 'orange', const: 'pink', enum: 'pink', namespace: null }[kind]
    return h('span', { class: ['badge', cls ?? null] }, kind ?? '?')
  }
  function scoreBar(r) {
    return h('div', { class: 'score', title: r.parts ? Object.entries(r.parts).map(([k, v]) => `${k}: ${v ?? '—'}`).join(' · ') : '' },
      h('span', { class: 'score-bar' }, h('i', { class: `tier-${r.tier}`, style: `width:${Math.round(r.score * 100)}%` })),
      h('span', { class: 'mono small' }, r.score.toFixed(2)))
  }
  function tierBadge(tier) { return h('span', { class: ['badge', TIER_BADGE[tier]] }, t(`stab.tier.${tier}`)) }
  /** Version of the first release in the series with an entity; the oldest one means "at least that old". */
  const sinceLabel = id => {
    if (!id) return '—'
    const v = E().series.find(s => s.id === id)?.version ?? id
    return id === E().series[0]?.id ? `≤ ${v}` : v
  }

  function stabColumns(kind) {
    const num = (key, label, val = r => r[key], extra = {}) => ({ key, label, num: true, val, cell: r => (val(r) === null || val(r) === undefined ? '—' : fmt.num(val(r))), ...extra })
    const scoreCol = { key: 'score', label: t('stab.col.score'), num: true, val: r => r.score, cell: r => h('div', { class: 'row stab-score' }, scoreBar(r), tierBadge(r.tier)) }
    if (kind === 'packages') return [
      { key: 'id', label: t('sym.col.pkg'), val: r => short(r.id), cell: r => DSHMap.ui.pkgChip(r.id) },
      scoreCol,
      num('age', t('stab.col.age')), num('recent', t('stab.col.recent')), num('ca', t('stab.col.ca')), num('ce', t('stab.col.ce')),
      num('instability', t('stab.col.i'), r => r.instability, { cell: r => (r.instability === null ? '—' : r.instability.toFixed(2)) }),
      num('apiChanges', t('stab.col.api'), r => r.apiChanges, { cell: r => `${r.apiChanges} / ${r.transitions}` }),
      num('symbols', t('stab.col.symbols')), num('uses', t('stab.col.uses')),
    ]
    if (kind === 'services') return [
      { key: 'key', label: 'ctx.*', val: r => r.key, cell: r => DSHMap.ui.svcChip(r.key) },
      scoreCol,
      { key: 'mode', label: 'mode', val: r => r.mode ?? '', cell: r => h('span', { class: 'faint small' }, r.mode ?? '') },
      { key: 'owner', label: t('sym.col.pkg'), val: r => short(r.owner), cell: r => (r.owner ? DSHMap.ui.pkgChip(r.owner) : '—') },
      num('changes', t('stab.col.api'), r => r.changes, { cell: r => `${r.changes} / ${r.transitions}` }),
      { key: 'since', label: t('stab.col.since'), val: r => r.since ?? '', cell: r => h('span', { class: 'mono small' }, sinceLabel(r.since)) },
      num('methods', t('stab.col.methods')), num('consumers', t('stab.col.consumers')),
    ]
    return [
      { key: 'name', label: t('type.event'), val: r => r.name, cell: r => DSHMap.ui.eventChip(r.name) },
      scoreCol,
      { key: 'mode', label: 'mode', val: r => r.mode ?? '', cell: r => h('span', { class: 'faint small' }, r.mode ?? '') },
      num('changes', t('stab.col.api'), r => r.changes, { cell: r => `${r.changes} / ${r.transitions}` }),
      { key: 'since', label: t('stab.col.since'), val: r => r.since ?? '', cell: r => h('span', { class: 'mono small' }, sinceLabel(r.since)) },
      num('listeners', t('stab.col.listeners')),
    ]
  }
  function openStabRow(kind, r) {
    if (kind === 'packages') DSHMap.nav.openPackage(r.id)
    else if (kind === 'services') DSHMap.nav.openService(r.key)
    else DSHMap.nav.openEvent(r.name)
  }

  /** Upgrade guides with from < version ≤ to. */
  function guidesBetween(from, to) {
    const lo = DSHEvo.compareVersions(from, to) < 0 ? from : to
    const hi = lo === from ? to : from
    return E().guides.filter(g => DSHEvo.compareVersions(g.version, lo) > 0 && DSHEvo.compareVersions(g.version, hi) <= 0)
  }

  function rootChips(roots, what) {
    if (!roots?.length) return null
    const cls = { added: 'ok', removed: 'danger', changed: null }[what]
    return h('div', { class: 'row wrap root-chips' },
      h('span', { class: ['badge', cls] }, t(`evo.${what}`)),
      roots.map(r => (r.startsWith('event:') ? seLink(r.slice(6)) : h('span', { class: 'chip mono', title: t('fmt.header') }, r))))
  }
  function rootGroups(changes) {
    const by = { added: [], removed: [], changed: [] }
    for (const c of changes) by[c.what]?.push(c.root)
    return h('div', null, rootChips(by.added, 'added'), rootChips(by.removed, 'removed'), rootChips(by.changed, 'changed'))
  }

  // ── diff rendering ──────────────────────────────────────────────────────

  function renderDiff(out, from, to, diff, guides, fa, fb) {
    const M = DSHMap.model
    if (diff.unavailable.length) out.appendChild(h('div', { class: 'callout warn evo-unavail' }, svgIcon('info'), t('evo.unavailable', { kinds: diff.unavailable.map(k => t(`evo.k.${k}`)).join(', ') })))
    // summary
    const tiles = KIND_ORDER.filter(k => diff.counts[k]).map(k => {
      const c = diff.counts[k]
      const sym = k === 'symbols' ? diff.symbols.symbols : null
      const val = sym ? [sym.added, sym.removed, sym.changed] : [c.added, c.removed, c.changed]
      return h('button', { class: 'kpi evo-kpi', onclick: () => document.getElementById(`evo-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
        h('div', { class: 'evo-kpi-n' }, h('span', { class: 'plus' }, `+${val[0]}`), h('span', { class: 'minus' }, `−${val[1]}`), h('span', { class: 'tilde' }, `~${val[2]}`)),
        h('span', null, t(`evo.k.${k}`)))
    })
    out.appendChild(h('div', { class: 'kpis evo-kpis' }, tiles))

    // guides
    out.appendChild(h('h2', { class: 'section-title' }, svgIcon('flag', 'inline-icon'), ` ${t('evo.guides')}`, h('span', { class: 'count' }, ` ${guides.length}`)))
    out.appendChild(h('p', { class: 'muted small' }, t('evo.guides.lead')))
    if (!guides.length) out.appendChild(h('div', { class: 'faint small' }, t('evo.guides.none')))
    const byVer = new Map()
    for (const g of guides) { if (!byVer.has(g.version)) byVer.set(g.version, []); byVer.get(g.version).push(g) }
    for (const [ver, list] of [...byVer].sort((a, b) => DSHEvo.compareVersions(a[0], b[0]))) {
      out.appendChild(h('div', { class: 'd-sub-h evo-ver-h' }, `v${ver} · ${list.length}`))
      out.appendChild(h('div', { class: 'evo-guides' }, list.map(g => h('button', { class: 'card evo-guide', onclick: () => DSHMap.nav.openDoc(g.doc) },
        h('div', { class: 'row evo-guide-head' }, h('b', null, g.title), h('span', { class: 'grow' }), g.steps ? h('span', { class: 'badge accent' }, t('evo.guides.steps', { n: g.steps })) : null),
        g.description ? h('p', { class: 'small evo-guide-desc' }, g.description) : null,
        g.change ? h('p', { class: 'faint small evo-clamp' }, g.change) : null))))
    }

    // per kind
    const block = (kind, ...content) => {
      const flat = content.flat().filter(Boolean)
      out.appendChild(h('h2', { class: 'section-title', id: `evo-${kind}` }, t(`evo.k.${kind}`)))
      out.appendChild(flat.length ? h('div', { class: 'card evo-block' }, flat) : h('div', { class: 'faint small' }, t('evo.nochange')))
    }
    const line = (what, items, render) => (items?.length ? h('div', { class: 'evo-line' }, h('span', { class: ['badge', { added: 'ok', removed: 'danger', changed: null, moved: 'accent' }[what]] }, `${t(`evo.${what}`)} ${items.length}`), DSHMap.ui.chipList(items, render, 60)) : null)
    const plain = x => h('span', { class: 'chip mono' }, x)
    const pkg = id => (M.pkgById.has(id) ? DSHMap.ui.pkgChip(id) : h('span', { class: 'chip mono evo-faded' }, short(id)))
    const fold = (title, ...body) => h('details', { class: 'fold evo-fold' }, h('summary', null, title), h('div', { class: 'fold-body' }, body))
    const d = diff
    if (d.packages) block('packages', line('added', d.packages.added, pkg), line('removed', d.packages.removed, plain), line('moved', d.packages.changed, c => h('span', { class: 'chip mono', title: `${c.dirFrom} → ${c.dirTo}` }, short(c.id))))
    if (d.services) block('services',
      line('added', d.services.added, k => (M.svcByKey.has(k) ? DSHMap.ui.svcChip(k) : plain(`ctx.${k}`))),
      line('removed', d.services.removed, k => plain(`ctx.${k}`)),
      d.services.changed.map(c => fold(h('span', { class: 'row evo-sum' }, h('span', { class: 'mono' }, `ctx.${c.key}`),
        c.modeFrom !== c.modeTo ? h('span', { class: 'badge accent' }, `${c.modeFrom} → ${c.modeTo}`) : null,
        c.ownerFrom !== c.ownerTo ? h('span', { class: 'badge' }, `${short(c.ownerFrom)} → ${short(c.ownerTo)}`) : null,
        h('span', { class: 'faint small' }, `${t('evo.methods')}: +${c.methods.added.length} −${c.methods.removed.length} ~${c.methods.changed.length}`)),
      c.methods.added.length ? h('div', null, c.methods.added.map(m => h('div', { class: 'mono small evo-add' }, `+ ${fb.services[c.key]?.methods[m] ?? m}`))) : null,
      c.methods.removed.length ? h('div', null, c.methods.removed.map(m => h('div', { class: 'mono small evo-del' }, `− ${fa.services[c.key]?.methods[m] ?? m}`))) : null,
      c.methods.changed.map(m => h('div', { class: 'evo-sig' }, h('div', { class: 'mono small evo-del' }, `− ${m.from}`), h('div', { class: 'mono small evo-add' }, `+ ${m.to}`))),
      M.svcByKey.has(c.key) ? h('button', { class: ['link-btn', 'tiny'], onclick: () => DSHMap.nav.openService(c.key) }, `ctx.${c.key} →`) : null)))
    if (d.events) block('events',
      line('added', d.events.added, n => (M.evByName.has(n) ? DSHMap.ui.eventChip(n) : plain(n))),
      line('removed', d.events.removed, plain),
      d.events.changed.map(c => fold(h('span', { class: 'mono' }, c.name, c.modeFrom !== c.modeTo ? h('span', { class: 'badge accent evo-ml' }, `${c.modeFrom} → ${c.modeTo}`) : null),
        c.sigFrom !== c.sigTo ? [h('div', { class: 'mono small evo-del' }, `− ${c.sigFrom ?? ''}`), h('div', { class: 'mono small evo-add' }, `+ ${c.sigTo ?? ''}`)] : null)))
    if (d.sessionEvents) block('sessionEvents',
      line('added', d.sessionEvents.added, seLink),
      line('removed', d.sessionEvents.removed, plain),
      line('changed', d.sessionEvents.changed, c => h('button', { class: 'chip link mono', title: c.kindFrom !== c.kindTo ? `${c.kindFrom} → ${c.kindTo}` : t('evo.shape'), onclick: () => DSHMap.router.go('evolution', { tab: 'format', ev: c.name }) }, c.name)))
    if (d.tools) block('tools',
      line('added', d.tools.added, n => { const tl = M.tools.find(x => x.name === n); return tl ? DSHMap.ui.toolChip(tl.key, n) : plain(n) }),
      line('removed', d.tools.removed, plain),
      d.tools.changed.length ? h('table', { class: 'data evo-subtable' }, h('tbody', null, d.tools.changed.map(c => h('tr', null,
        h('td', { class: 'mono' }, c.name),
        h('td', { class: 'small' }, c.pkgFrom !== c.pkgTo ? `${short(c.pkgFrom)} → ${short(c.pkgTo)}` : ''),
        h('td', { class: 'small mono' }, c.params.added.map(x => h('span', { class: 'evo-add' }, `+${x} `)), c.params.removed.map(x => h('span', { class: 'evo-del' }, `−${x} `)), !c.params.added.length && !c.params.removed.length && c.schema ? h('span', { class: 'faint' }, t('evo.schema')) : null))))) : null)
    if (d.config) block('config',
      line('added', d.config.added, pkg), line('removed', d.config.removed, plain),
      d.config.changed.length ? h('table', { class: 'data evo-subtable' }, h('tbody', null, d.config.changed.map(c => h('tr', null,
        h('td', null, pkg(c.pkg)),
        h('td', { class: 'small mono' },
          c.fields.added.map(x => h('div', { class: 'evo-add' }, `+ ${x}`)),
          c.fields.removed.map(x => h('div', { class: 'evo-del' }, `− ${x}`)),
          c.fields.changed.map(x => h('div', null, `~ ${x.field}: `, h('span', { class: 'evo-del' }, x.from), ' → ', h('span', { class: 'evo-add' }, x.to)))))))) : null)
    if (d.profiles) block('profiles', d.profiles.changed.map(c => fold(h('span', null, h('span', { class: 'mono' }, `dsh --profile ${c.name}`), h('span', { class: 'faint small evo-ml' }, `${t('evo.mounted')}: +${c.mounted.added.length} −${c.mounted.removed.length} ~${c.mounted.changed.length} · ${t('evo.loadedDep')}: +${c.loaded.added.length} −${c.loaded.removed.length}`)),
      line('added', c.mounted.added, pkg), line('removed', c.mounted.removed, plain),
      line('changed', c.mounted.changed, x => h('span', { class: 'chip mono', title: `${x.from} → ${x.to}` }, `${short(x.pkg)} ${x.from}→${x.to}`)),
      c.loaded.added.length || c.loaded.removed.length ? [h('div', { class: 'd-sub-h' }, t('evo.loadedDep')), line('added', c.loaded.added, pkg), line('removed', c.loaded.removed, plain)] : null)))
    if (d.cli) block('cli', line('added', d.cli.added, plain), line('removed', d.cli.removed, plain),
      d.cli.changed.map(c => h('div', { class: 'evo-line' }, h('span', { class: 'mono small' }, c.command), c.flags.added.map(x => h('span', { class: 'chip mono evo-add' }, `+${x}`)), c.flags.removed.map(x => h('span', { class: 'chip mono evo-del' }, `−${x}`)))))
    if (d.commands) block('commands', line('added', d.commands.added, x => plain(`/${x.replace(/^client:/, '')}`)), line('removed', d.commands.removed, x => plain(`/${x.replace(/^client:/, '')}`)))
    if (d.env) block('env', line('added', d.env.added, n => (M.envByName.has(n) ? h('button', { class: 'chip link mono', onclick: () => DSHMap.nav.openEnv(n) }, n) : plain(n))), line('removed', d.env.removed, plain))
    if (d.slots) block('slots', line('added', d.slots.added, k => (M.slotByKey.has(k) ? h('button', { class: 'chip link mono', onclick: () => DSHMap.nav.openSlot(k) }, k) : plain(k))), line('removed', d.slots.removed, plain))
    if (d.symbols) {
      const rows = [...d.symbols.changed].sort((a, b) => (b.added.length + b.removed.length + b.changed.length) - (a.added.length + a.removed.length + a.changed.length))
      block('symbols',
        h('div', { class: 'faint small' }, t('evo.sym.pkgs', { n: rows.length + d.symbols.added.length + d.symbols.removed.length })),
        line('added', d.symbols.added, pkg), line('removed', d.symbols.removed, plain),
        // The summary is itself a control: a plain label there, the package link in the body.
        rows.map(c => fold(h('span', { class: 'row evo-sum' }, h('span', { class: 'chip mono' }, short(c.pkg)), h('span', { class: 'faint small' }, `+${c.added.length} −${c.removed.length} ~${c.changed.length}`)),
          M.pkgById.has(c.pkg) ? h('div', { class: 'evo-sym-pkg' }, pkg(c.pkg)) : null,
          c.added.length ? h('div', { class: 'chips' }, c.added.map(k => symChip(c.pkg, k, 'evo-add'))) : null,
          c.removed.length ? h('div', { class: 'chips evo-sym-chips' }, c.removed.map(k => h('span', { class: 'chip mono evo-del' }, k))) : null,
          c.changed.length ? h('div', { class: 'chips evo-sym-chips' }, c.changed.map(x => symChip(c.pkg, x.key, null, x.kindFrom !== x.kindTo ? `${x.kindFrom} → ${x.kindTo}` : null))) : null)))
    }
    out.appendChild(h('p', { class: 'faint tiny evo-note' }, t('evo.history.note')))
  }

  /** Chip of a public symbol that opens its current definition when the symbol index has it. */
  function symChip(pid, key, cls, note) {
    return h('button', { class: ['chip', 'link', 'mono', cls], title: note ?? '', onclick: () => loadSymbols().then(rows => { const r = rows.find(x => x[1] === pid && x[0] === key); if (r) DSHMap.nav.openFile(r[2], { line: r[3] }) }) }, key, note ? h('span', { class: 'count' }, '~') : null)
  }

  function diffMarkdown(from, to, d, guides) {
    const lines = [`# dsh: ${from.version} → ${to.version}`, '']
    const list = (label, xs) => { if (xs?.length) lines.push(`- ${label}: ${xs.map(x => `\`${x}\``).join(', ')}`) }
    if (guides.length) {
      lines.push('## Upgrade guides', '')
      for (const g of guides) lines.push(`- v${g.version} — ${g.title} (${g.doc})${g.description ? `: ${g.description}` : ''}`)
      lines.push('')
    }
    for (const k of KIND_ORDER) {
      const x = d[k]
      if (!x) continue
      lines.push(`## ${t(`evo.k.${k}`)}`, '')
      list(t('evo.added'), x.added)
      list(t('evo.removed'), x.removed)
      if (k === 'services') for (const c of x.changed) lines.push(`- ctx.${c.key}: +${c.methods.added.join(', +') || '0'} −${c.methods.removed.join(', −') || '0'}${c.methods.changed.length ? `; ~${c.methods.changed.map(m => m.name).join(', ~')}` : ''}`)
      else if (k === 'config') for (const c of x.changed) lines.push(`- ${c.pkg}: ${[...c.fields.added.map(f => `+${f}`), ...c.fields.removed.map(f => `−${f}`), ...c.fields.changed.map(f => `~${f.field}`)].join(', ')}`)
      else if (k === 'symbols') for (const c of x.changed) lines.push(`- ${c.pkg}: ${[...c.added.map(f => `+${f}`), ...c.removed.map(f => `−${f}`), ...c.changed.map(f => `~${f.key}`)].join(', ')}`)
      else if (k === 'profiles') for (const c of x.changed) lines.push(`- ${c.name}: mounted +${c.mounted.added.length} −${c.mounted.removed.length}, loaded +${c.loaded.added.length} −${c.loaded.removed.length}`)
      else list(t('evo.changed'), x.changed.map(c => c.name ?? c.key ?? c.id ?? c.command ?? c.pkg))
      lines.push('')
    }
    if (d.unavailable.length) lines.push(`_${t('evo.unavailable', { kinds: d.unavailable.join(', ') })}_`)
    return lines.join('\n')
  }

  // ── symbols ─────────────────────────────────────────────────────────────

  let symbolRows = null
  /** Public symbols of every package: [key, pkg, path, line, kind, uses], most used first. */
  function loadSymbols() {
    if (symbolRows) return Promise.resolve(symbolRows)
    return DSHMap.load('symbols', null, E().symbols.file).then(rows => (symbolRows = [...rows].sort((a, b) => b[5] - a[5] || a[0].localeCompare(b[0]))))
  }

  /** List the importers of a public symbol (from the owning package's detail file). */
  function showUses(host, pid, key) {
    const p = DSHMap.model.pkgById.get(pid)
    if (!p) return
    host.appendChild(DSHMap.ui.loading())
    DSHMap.load('pkg', pid, p.detail).then(detail => {
      clear(host).appendChild(usesCard(pid, key, detail))
      host.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  function usesCard(pid, key, detail) {
    const list = detail.symbols?.uses?.[key] ?? []
    const byPkg = new Map()
    for (const [file, line, typeOnly] of list) {
      const o = DSHMap.model.pkgOfPath(file)?.id ?? '?'
      if (!byPkg.has(o)) byPkg.set(o, [])
      byPkg.get(o).push([file, line, typeOnly])
    }
    return h('div', { class: 'card uses-card' },
      h('h3', null, `${t('sym.uses')}: `, h('span', { class: 'mono' }, key), h('span', { class: 'faint small' }, ` · ${short(pid)} · ${list.length}`)),
      list.length ? h('div', { class: 'stack uses-groups' }, [...byPkg].sort((a, b) => b[1].length - a[1].length).map(([o, rows]) => h('div', { class: 'row wrap uses-group' },
        DSHMap.ui.pkgChip(o, { suffix: rows.length }),
        h('div', { class: 'stack uses-files' }, rows.slice(0, 12).map(([file, line, typeOnly]) => h('button', { class: ['link-btn', 'mono', 'tiny'], onclick: () => DSHMap.nav.openFile(file, { line }) }, `${file}:${line}${typeOnly ? ' (type)' : ''}`)))))) : h('div', { class: 'faint small' }, t('sym.uses.none')))
  }

  // ── hooks for the drawer, the viewer and other views ────────────────────

  DSHMap.evolution = {
    loadSymbols,
    usesCard,
    /** Drawer-style section: the Session format records that touched a log event (phase 4.2). */
    formatHistory(name) {
      const F = E()?.format
      if (!F) return null
      const root = `event:${name}`
      const rows = []
      const first = F.versions.find(v => v.events.includes(name))
      if (first) rows.push([first.source ?? `v${first.version}`, h('span', { class: 'badge ok' }, `v${first.version}`), first.version === F.versions[0].version ? `≤ v${first.version}` : `${t('evo.added')} · v${first.version}`, () => DSHMap.nav.openDoc(first.doc)])
      for (const v of F.versions) if (v.delta?.changed.includes(root)) rows.push([v.source ?? '', h('span', { class: 'badge' }, `v${v.version}`), `${t('evo.changed')} · v${v.version - 1} → v${v.version}`, () => DSHMap.nav.openDoc(v.doc)])
      for (const c of F.changes) for (const x of c.changes) if (x.root === root) rows.push([c.date, h('span', { class: ['badge', c.bump ? 'danger' : c.baseline ? 'accent' : 'ok'] }, t(`fmt.kind.${c.bump ? 'bump' : c.baseline ? 'baseline' : 'change'}`)), `${t(`evo.${x.what}`)} · ${c.id.replace(/^\d{4}-\d{2}-\d{2}-/, '')}`, () => DSHMap.nav.openDoc(c.doc)])
      const rel = F.releases.filter(r => r.changes.some(x => x.root === root)).length
      if (!rows.length && !rel) return null
      return h('div', { class: 'd-section' },
        h('h4', null, t('fmt.eventHistory'), h('span', { class: 'count' }, rows.length + rel)),
        h('div', { class: 'stack fh-list' }, rows.map(([date, badge, text, go]) => h('button', { class: 'row small fh-row', onclick: go }, h('span', { class: 'mono faint nowrap fh-date' }, date), badge, h('span', null, text)))),
        h('button', { class: ['link-btn', 'tiny', 'fh-more'], onclick: () => DSHMap.router.go('evolution', { tab: 'format', ev: name }) }, `${t('fmt.timeline')} (${rows.length + rel}) →`))
    },
    stabilityOf(id) {
      const S = E()?.stability
      if (!S) return null
      S._byId ??= new Map(S.packages.map(r => [r.id, r]))
      return S._byId.get(id) ?? null
    },
    /** Tier badge of a package for the drawer header. */
    badge(p) {
      const r = this.stabilityOf(p.id)
      if (!r) return null
      return h('button', { class: ['badge', TIER_BADGE[r.tier], 'tier-badge-btn'], title: `${t('stab.badge', { tier: t(`stab.tier.${r.tier}`), score: r.score.toFixed(2) })} · Ca ${r.ca} · Ce ${r.ce} · API ${r.apiChanges}/${r.transitions}`, onclick: () => DSHMap.router.go('evolution', { tab: 'stability', kind: 'packages' }) }, t(`stab.tier.${r.tier}`))
    },
    /** Drawer section with the package's public API; filled once the lazy detail file arrives. */
    apiSection(p, section) {
      const r = this.stabilityOf(p.id)
      if (!r?.symbols) return null
      const slot = h('div', null, DSHMap.ui.loading())
      const node = section(t('d.api'), r.symbols, slot)
      return {
        node,
        fill(detail) {
          const api = detail.symbols?.api ?? []
          const q = h('input', { class: 'input api-filter', placeholder: t('d.api.filter'), 'aria-label': t('d.api.filter') })
          const list = h('div', { class: 'api-list' })
          const uses = h('div')
          const sorted = [...api].sort((a, b) => b[5] - a[5] || a[0].localeCompare(b[0]))
          const draw = () => {
            const needle = q.value.trim().toLowerCase()
            const rows = needle ? sorted.filter(x => x[0].toLowerCase().includes(needle)) : sorted
            clear(list)
            for (const x of rows.slice(0, needle ? 200 : 25)) {
              const [key, file, line, kind, sig, n, since, changes] = x
              list.appendChild(h('div', { class: 'api-row', title: sig ?? '' },
                kindBadge(kind),
                h('button', { class: ['link-btn', 'mono', 'small', 'truncate'], onclick: () => DSHMap.nav.openFile(file, { line }) }, key),
                h('span', { class: 'grow' }),
                changes ? h('span', { class: 'badge warn', title: t('sym.changes', { n: changes }) }, `~${changes}`) : null,
                since ? h('span', { class: 'faint tiny nowrap', title: t('sym.since', { v: sinceLabel(since) }) }, sinceLabel(since)) : null,
                n ? h('button', { class: 'chip link tiny', title: t('sym.uses'), onclick: () => { clear(uses).appendChild(usesCard(p.id, key, detail)) } }, `${n}`) : h('span', { class: 'faint tiny' }, '0')))
            }
            if (!needle && rows.length > 25) list.appendChild(h('div', { class: 'faint tiny api-more' }, t('d.api.more', { n: rows.length - 25 })))
          }
          q.addEventListener('input', util.debounce(draw, 100))
          draw()
          clear(slot).append(...[api.length > 8 ? q : null, list, uses].filter(Boolean))
        },
      }
    },
  }
})()
