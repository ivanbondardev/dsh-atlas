/* DSH Map — usage: how to run dsh and what it can do. Launch modes and the
 * CLI, the capability catalog with how to switch each on, what the model sees
 * per profile and agent preset, the safety chain and outbound data, files and
 * environment variables, integration protocols and model providers. Curated
 * text comes from generator/curated/usage.yaml; everything else is generated. */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, i18n } = DSHMap

  i18n.extend({
    uk: {
      'usage.tab.launch': 'Запуск',
      'usage.tab.capabilities': 'Можливості',
      'usage.tab.model': 'Що бачить модель',
      'usage.tab.safety': 'Безпека й дані',
      'usage.tab.disk': 'Диск і середовище',
      'usage.tab.integrations': 'Інтеграції',
      'usage.tab.providers': 'Провайдери',
      'usage.modes': 'Застосунки й профілі',
      'usage.col.app': 'Застосунок',
      'usage.col.command': 'Команда',
      'usage.col.profile': 'Профіль',
      'usage.col.processes': 'Процеси',
      'usage.col.channel': 'Канал',
      'usage.col.purpose': 'Для чого',
      'usage.cli': 'Граматика CLI',
      'usage.cli.lead': 'Згенеровано з docs/cli-help.md (його генерує scripts/gen-cli-help.ts з apps/cli/src/args.ts). Прапорці лаунчера йдуть першими; перший невідомий токен починає аргументи застосунку профілю.',
      'usage.cli.options': 'Прапорці',
      'usage.cli.raw': 'Повна довідка',
      'usage.firstRun': 'Перший запуск',
      'usage.exits': 'Коди виходу й журнали старту',
      'usage.caps.lead': 'Користувацькі можливості dsh: статус, стан у кожному профілі й пресеті агента Web (з композиції) і як увімкнути. Назви й описи — кураторські, пакети, інструменти й команди перевіряє генератор.',
      'usage.caps.filter': 'Фільтр можливостей…',
      'usage.status.default': 'типово',
      'usage.status.optional': 'опційно',
      'usage.status.experimental': 'експериментально',
      'usage.enable': 'Як увімкнути',
      'usage.enable.default': 'увімкнено типово',
      'usage.enable.command': 'команда',
      'usage.enable.settings': 'налаштування',
      'usage.enable.preset': 'пресет',
      'usage.enable.bundle': 'опційний бандл',
      'usage.enable.patch': 'патч',
      'usage.enable.env': 'змінна',
      'usage.enable.plugin': 'плагін',
      'usage.state': 'Стан у профілях',
      'usage.tools': 'Інструменти',
      'usage.packages': 'Пакети',
      'usage.commands': 'Slash-команди ({n})',
      'usage.commands.lead': 'Знайдено у викликах commands.register (хост) і commandUi.register/decorate (браузер).',
      'usage.cmd.host': 'хост',
      'usage.cmd.ui': 'UI-дія',
      'usage.cmd.ui-decorate': 'UI до команди хоста',
      'usage.ctx': 'Контекст',
      'usage.ctx.profile': 'весь профіль',
      'usage.static': 'Реєструють рядки композиції',
      'usage.static.lead': 'Інструменти пакетів, змонтованих рядками цього контексту (профіль + пресет). ◐ — умовний рядок; ✱ — рядок має свій config.',
      'usage.recorded': 'Отримала модель у записаному сценарії',
      'usage.recorded.none': 'Для цього контексту немає записаного сценарію з промптом.',
      'usage.recorded.lead': 'Схеми інструментів зі сценарію {s} (клас {c}).',
      'usage.onlyStatic': 'лише статично',
      'usage.onlyRecorded': 'лише в записі',
      'usage.prompt': 'Системний промпт',
      'usage.prompt.lead': 'Відрендерений промпт із записаного сценарію ({n} символів). Композиція сценарію може містити тестові патчі — дивіться вкладку сценарію.',
      'usage.anatomy': 'Анатомія системного промпта',
      'usage.anatomy.lead': 'Секції ctx.systemPrompt сортуються за порядком із SECTION_ORDERS; контекст запуску (CONTEXT_ORDERS) додається окремим повідомленням. Підсвічено пакети, активні у вибраному контексті.',
      'usage.anatomy.slot': 'Слот',
      'usage.anatomy.order': 'Порядок',
      'usage.anatomy.who': 'Хто додає',
      'usage.anatomy.sections': 'Секції промпта',
      'usage.anatomy.contexts': 'Контекст запуску',
      'usage.matrix': 'Інструменти × контексти',
      'usage.matrix.lead': '● — зареєстровано рядком, ◐ — умовно; колонки — профілі та пресети агента Web.',
      'usage.notes': 'Примітки',
      'usage.chain': 'Ланцюжок виконання',
      'usage.presets': 'Пресети дозволів (з {row})',
      'usage.presets.preset': 'Пресет',
      'usage.presets.sandbox': 'Пісочниця',
      'usage.presets.approval': 'Схвалення',
      'usage.backends': 'Бекенди пісочниці',
      'usage.backend.platform': 'Платформа',
      'usage.backend.enforcement': 'Забезпечення',
      'usage.toolEffects': 'Що це означає для інструментів',
      'usage.toolEffects.lead': 'За полем «Requires» з docs/tool-catalog.md: які сервіси викликає інструмент і отже які обмеження на нього діють.',
      'usage.effect.fs': 'файли — запис обмежує пісочниця',
      'usage.effect.shell': 'команди — під пісочницею, ескалація через схвалення',
      'usage.effect.web': 'мережа — не обмежується пісочницею',
      'usage.effect.approval': 'питає схвалення',
      'usage.effect.policy': 'читає політику пісочниці',
      'usage.effect.other': 'лише стан сесії',
      'usage.egress': 'Що виходить за межі машини',
      'usage.egress.default': 'Типово',
      'usage.egress.off': 'Як вимкнути',
      'usage.home': '$DSH_HOME (типово ~/.dsh)',
      'usage.agentsHome': '$DSH_AGENTS_HOME (типово ~/.agents)',
      'usage.home.sites': 'dshHomePath() у конфігурації',
      'usage.credentials': 'Порядок облікових даних',
      'usage.sessionFormat': 'Формат сесії',
      'usage.sessionFormat.writer': 'пише версію',
      'usage.sessionFormat.finalized': 'остання фіналізована',
      'usage.sessionFormat.released': 'остання випущена',
      'usage.env': 'Змінні середовища ({n})',
      'usage.env.lead': 'Згенеровано: вирази !!js process.env.X у патчах бандлів і прикладах-оверлеях та імена змінних у src пакетів. Upstream такого каталогу не має.',
      'usage.env.filter': 'Фільтр змінних…',
      'usage.prov.filter': 'Фільтр провайдерів',
      'usage.env.tests': 'показати службові (тести, Desktop)',
      'usage.env.patch': 'У конфігурації',
      'usage.env.src': 'Читають пакети',
      'usage.int.events': 'Рядки NDJSON',
      'usage.int.requests': 'Запити клієнт → сервер',
      'usage.int.notifications': 'Нотифікації сервер → клієнт',
      'usage.int.remotes': 'Методи @Remote: {u} унарних, {s} стрімових у {p} пакетах',
      'usage.int.start': 'Запуск',
      'usage.int.example': 'Приклад',
      'usage.prov.native': 'Нативний DeepSeek',
      'usage.prov.custom': 'Свій ендпоінт',
      'usage.prov.proxy': 'Проксі',
      'usage.prov.piAi': 'Провайдери pi-ai ({n})',
      'usage.prov.lead': 'Згенеровано з packages/llm/llm-pi-ai/src/provider-data.generated.ts: змінні з ключами й базові URL.',
      'usage.prov.env': 'Ключ / облікові дані',
      'usage.prov.url': 'Базовий URL',
    },
    en: {
      'usage.tab.launch': 'Launch',
      'usage.tab.capabilities': 'Capabilities',
      'usage.tab.model': 'What the model sees',
      'usage.tab.safety': 'Safety and data',
      'usage.tab.disk': 'Disk and environment',
      'usage.tab.integrations': 'Integrations',
      'usage.tab.providers': 'Providers',
      'usage.modes': 'Apps and profiles',
      'usage.col.app': 'App',
      'usage.col.command': 'Command',
      'usage.col.profile': 'Profile',
      'usage.col.processes': 'Processes',
      'usage.col.channel': 'Channel',
      'usage.col.purpose': 'What for',
      'usage.cli': 'CLI grammar',
      'usage.cli.lead': 'Generated from docs/cli-help.md (scripts/gen-cli-help.ts renders it from apps/cli/src/args.ts). Launcher flags come first; the first unknown token starts the profile app’s arguments.',
      'usage.cli.options': 'Options',
      'usage.cli.raw': 'Full help',
      'usage.firstRun': 'First run',
      'usage.exits': 'Exit codes and startup logs',
      'usage.caps.lead': 'User-facing dsh capabilities: status, state in every profile and Web agent preset (from the composition) and how to switch each on. Titles and blurbs are curated; packages, tools and commands are validated by the generator.',
      'usage.caps.filter': 'Filter capabilities…',
      'usage.status.default': 'default',
      'usage.status.optional': 'optional',
      'usage.status.experimental': 'experimental',
      'usage.enable': 'How to enable',
      'usage.enable.default': 'on by default',
      'usage.enable.command': 'command',
      'usage.enable.settings': 'settings',
      'usage.enable.preset': 'preset',
      'usage.enable.bundle': 'optional bundle',
      'usage.enable.patch': 'patch',
      'usage.enable.env': 'variable',
      'usage.enable.plugin': 'plugin',
      'usage.state': 'State in profiles',
      'usage.tools': 'Tools',
      'usage.packages': 'Packages',
      'usage.commands': 'Slash commands ({n})',
      'usage.commands.lead': 'Found in commands.register (host) and commandUi.register/decorate (browser) calls.',
      'usage.cmd.host': 'host',
      'usage.cmd.ui': 'UI action',
      'usage.cmd.ui-decorate': 'UI for a host command',
      'usage.ctx': 'Context',
      'usage.ctx.profile': 'whole profile',
      'usage.static': 'Registered by composition rows',
      'usage.static.lead': 'Tools of the packages mounted by this context’s rows (profile + preset). ◐ — a conditional row; ✱ — the row has its own config.',
      'usage.recorded': 'Received by the model in a recorded scenario',
      'usage.recorded.none': 'No recorded scenario with a prompt covers this context.',
      'usage.recorded.lead': 'Tool schemas from scenario {s} (class {c}).',
      'usage.onlyStatic': 'static only',
      'usage.onlyRecorded': 'recorded only',
      'usage.prompt': 'System prompt',
      'usage.prompt.lead': 'The rendered prompt from a recorded scenario ({n} characters). A scenario composition may carry test patches — see the scenario tab.',
      'usage.anatomy': 'System prompt anatomy',
      'usage.anatomy.lead': 'ctx.systemPrompt sections sort by their SECTION_ORDERS slot; the runtime context (CONTEXT_ORDERS) goes into a separate message. Packages active in the selected context are highlighted.',
      'usage.anatomy.slot': 'Slot',
      'usage.anatomy.order': 'Order',
      'usage.anatomy.who': 'Contributed by',
      'usage.anatomy.sections': 'Prompt sections',
      'usage.anatomy.contexts': 'Runtime context',
      'usage.matrix': 'Tools × contexts',
      'usage.matrix.lead': '● — registered by a row, ◐ — conditionally; columns are profiles and Web agent presets.',
      'usage.notes': 'Notes',
      'usage.chain': 'Execution chain',
      'usage.presets': 'Permission presets (from {row})',
      'usage.presets.preset': 'Preset',
      'usage.presets.sandbox': 'Sandbox',
      'usage.presets.approval': 'Approval',
      'usage.backends': 'Sandbox backends',
      'usage.backend.platform': 'Platform',
      'usage.backend.enforcement': 'Enforcement',
      'usage.toolEffects': 'What it means for tools',
      'usage.toolEffects.lead': 'From the “Requires” field of docs/tool-catalog.md: which services a tool calls and so which restrictions apply.',
      'usage.effect.fs': 'files — writes confined by the sandbox',
      'usage.effect.shell': 'commands — sandboxed, escalation through approval',
      'usage.effect.web': 'network — not confined by the sandbox',
      'usage.effect.approval': 'asks for approval',
      'usage.effect.policy': 'reads the sandbox policy',
      'usage.effect.other': 'session state only',
      'usage.egress': 'What leaves the machine',
      'usage.egress.default': 'Default',
      'usage.egress.off': 'How to turn off',
      'usage.home': '$DSH_HOME (~/.dsh by default)',
      'usage.agentsHome': '$DSH_AGENTS_HOME (~/.agents by default)',
      'usage.home.sites': 'dshHomePath() in configuration',
      'usage.credentials': 'Credential order',
      'usage.sessionFormat': 'Session format',
      'usage.sessionFormat.writer': 'writes version',
      'usage.sessionFormat.finalized': 'latest finalized',
      'usage.sessionFormat.released': 'latest released',
      'usage.env': 'Environment variables ({n})',
      'usage.env.lead': 'Generated: !!js process.env.X expressions in bundle patches and example overlays, and variable names in package src. Upstream has no such catalog.',
      'usage.env.filter': 'Filter variables…',
      'usage.prov.filter': 'Filter providers',
      'usage.env.tests': 'show internal (tests, Desktop)',
      'usage.env.patch': 'In configuration',
      'usage.env.src': 'Read by packages',
      'usage.int.events': 'NDJSON lines',
      'usage.int.requests': 'Client → server requests',
      'usage.int.notifications': 'Server → client notifications',
      'usage.int.remotes': '@Remote methods: {u} unary, {s} stream in {p} packages',
      'usage.int.start': 'Start',
      'usage.int.example': 'Example',
      'usage.prov.native': 'Native DeepSeek',
      'usage.prov.custom': 'Custom endpoint',
      'usage.prov.proxy': 'Proxy',
      'usage.prov.piAi': 'pi-ai providers ({n})',
      'usage.prov.lead': 'Generated from packages/llm/llm-pi-ai/src/provider-data.generated.ts: credential variables and base URLs.',
      'usage.prov.env': 'Key / credentials',
      'usage.prov.url': 'Base URL',
    },
  })

  const TABS = ['launch', 'capabilities', 'model', 'safety', 'disk', 'integrations', 'providers']
  const STATUS_BADGE = { default: 'ok', optional: 'accent', experimental: 'warn' }
  const GLYPH = { on: '●', cond: '◐', dep: '◌' }

  DSHMap.views.usage = {
    scroll: true,
    init(el) {
      this.L = DSHMap.ui.layout.narrative(el, { className: 'usage-page' })
      this.root = this.L.root
      this.el = el
      this.state = { envTests: false }
      this.panes = DSHMap.ui.panes(this.L.body, this, ['syncFilter'])
    },
    tab(params) { return TABS.includes(params.tab) ? params.tab : 'launch' },
    show(params) { this.render(params) },
    update(params, prev) {
      if (this.tab(params) !== this.tab(prev) || params.profile !== prev.profile || params.preset !== prev.preset) this.render(params)
      else { this.syncFilter?.(params); this.select(params) }
    },
    render(params) {
      const tab = this.tab(params)
      this.L.head({ title: t('nav.usage'), tabs: DSHMap.ui.tabs(TABS.map(id => [id, t(`usage.tab.${id}`)]), tab, id => DSHMap.router.go('usage', { tab: id }), t('nav.usage')) })
      // Tabs seen before come back from the pane cache with their filter (4.5).
      const { fresh } = this.panes.show(`${tab}|${params.profile ?? ''}|${params.preset ?? ''}`, body => this[`render_${tab}`](body, params), this.el)
      if (!fresh) this.syncFilter?.(params)
      setTimeout(() => this.select(params), 120)
    },
    /** Scroll to and mark the selected card (capability, environment variable). */
    select(params) {
      const id = params.cap ?? params.env ?? null
      const el = id ? this.root.querySelector(`[data-card="${CSS.escape(id)}"]`) : null
      DSHMap.ui.selectOnly(this.root, el)
      if (el) el.scrollIntoView({ block: 'center', behavior: DSHMap.a11y.reducedMotion() ? 'auto' : 'smooth' })
    },

    // ── 2.1 launch ──────────────────────────────────────────────────────
    render_launch(body) {
      const M = DSHMap.model
      const U = M.usage
      const L = U.launch
      body.append(
        DSHMap.ui.glossarize(h('p', { class: 'thesis callout' }, mdInline(i18n.pick(L.thesis)))),
        h('div', { class: 'callout tip' }, svgIcon('info'), mdInline(i18n.pick(L.tip))))
      body.appendChild(h('h2', { class: 'section-title' }, t('usage.modes')))
      body.appendChild(DSHMap.ui.table({
        card: true, sortable: false, className: 'usage-modes', label: t('usage.modes'), rows: L.modes,
        columns: [
          { key: 'app', label: t('usage.col.app'), cell: m => h('b', null, i18n.pick(m.title)) },
          { key: 'command', label: t('usage.col.command'), cell: m => [h('code', { class: 'nowrap' }, m.command), m.cli ? h('div', null, h('button', { class: ['link-btn', 'tiny'], onclick: () => DSHMap.nav.openDoc(`docs/cli-help.md#${m.cli}`) }, '--help')) : null] },
          { key: 'profile', label: t('usage.col.profile'), cell: m => m.profile ? h('button', { class: 'chip link mono', onclick: () => DSHMap.nav.openProfile(m.profile) }, m.profile) : h('span', { class: 'faint small' }, 'desktop') },
          { key: 'processes', label: t('usage.col.processes'), cell: m => h('div', { class: 'chips' }, m.processes.map(id => h('button', { class: 'chip link', onclick: () => DSHMap.nav.openProcess(id) }, i18n.pick(M.processById.get(id)?.title) ?? id))) },
          { key: 'channel', label: t('usage.col.channel'), className: 'small', cell: m => m.channel ?? '—' },
          { key: 'purpose', label: t('usage.col.purpose'), className: 'small', cell: m => [DSHMap.ui.glossarize(h('div', null, mdInline(i18n.pick(m.purpose)))), DSHMap.ui.refChips(m.refs)] },
        ],
      }))

      // CLI grammar
      body.appendChild(h('h2', { class: 'section-title' }, t('usage.cli'), h('span', { class: 'hint' }, h('button', { class: 'link-btn', onclick: () => DSHMap.nav.openDoc('docs/cli-help.md') }, 'docs/cli-help.md'))))
      body.appendChild(h('p', { class: 'muted small' }, t('usage.cli.lead')))
      const root = U.cli.find(c => c.id === 'dsh')
      if (root) body.appendChild(h('div', { class: 'card' }, h('pre', { class: 'code cli-usage' }, root.text.split('\n').filter(l => /^(Usage:| {7}dsh)/.test(l)).join('\n')), optionsTable(root.options)))
      body.appendChild(h('div', { class: 'stack cli-subcommands' }, U.cli.filter(c => c.id !== 'dsh').map(c => h('details', { class: 'fold' },
        h('summary', null, h('code', null, c.command), h('span', { class: 'faint small' }, ` · ${c.usage ?? ''}`), c.options.length > 1 ? h('span', { class: 'count' }, ` ${c.options.length - 1}`) : null),
        h('div', { class: 'fold-body' }, optionsTable(c.options.filter(o => !/^-h,/.test(o.flag))), h('details', { class: 'fold cli-raw' }, h('summary', null, t('usage.cli.raw')), h('div', { class: 'fold-body' }, DSHMap.ui.code(c.text, 'plaintext'))))))))

      // first run
      body.appendChild(h('h2', { class: 'section-title' }, t('usage.firstRun')))
      body.appendChild(h('div', { class: 'usage-grid' }, L.firstRun.map(s => h('div', { class: 'card' },
        h('h3', null, i18n.pick(s.title)),
        s.code ? DSHMap.ui.codeCopy(s.code, 'bash') : null,
        h('p', { class: 'small muted' }, mdInline(i18n.pick(s.text))),
        DSHMap.ui.refChips(s.refs)))))

      // exits
      body.appendChild(h('h2', { class: 'section-title' }, t('usage.exits')))
      body.appendChild(h('div', { class: 'card' }, DSHMap.ui.table({
        head: false, label: t('usage.exits'), rows: L.exits,
        columns: [
          { key: 'code', className: 'mono nowrap exit-code' },
          { key: 'text', className: 'small', cell: x => mdInline(i18n.pick(x.text)) },
        ],
      }), DSHMap.ui.refChips(L.exitRefs)))
    },

    // ── 2.2 capabilities ────────────────────────────────────────────────
    render_capabilities(body, params) {
      const M = DSHMap.model
      body.appendChild(h('p', { class: 'muted' }, t('usage.caps.lead')))
      // Text filter in route key `q`, status chip in `status` (no chip = all).
      const statuses = ['default', 'optional', 'experimental']
      const fb = DSHMap.ui.filterBar({
        key: 'q', chipKey: 'status', placeholder: t('usage.caps.filter'), label: t('usage.caps.filter'),
        chips: statuses.map(s => ({ id: s, label: t(`usage.status.${s}`), count: M.capabilities.filter(c => M.capabilityStatus(c) === s).length })),
        onChange: () => draw(),
      })
      const grid = h('div', { class: 'cap-grid' })
      body.append(h('div', { class: 'usage-filter' }, fb.el), grid)
      const contexts = capContexts()
      const draw = () => {
        const q = fb.query()
        const st = fb.chip()
        clear(grid)
        for (const c of M.capabilities) {
          const status = M.capabilityStatus(c)
          if (st && status !== st) continue
          if (q && !`${c.id} ${c.title.uk} ${c.title.en} ${c.blurb.uk} ${c.blurb.en} ${c.tools.join(' ')} ${c.enable.map(e => e.value ?? '').join(' ')}`.toLowerCase().includes(q)) continue
          grid.appendChild(capCard(c, status, contexts))
        }
        if (!grid.children.length) grid.appendChild(DSHMap.ui.noMatches(() => fb.reset()))
      }
      fb.sync(params)
      this.syncFilter = p => { if (fb.sync(p)) draw() }
      draw()

      // slash commands
      const cmds = M.commands
      body.appendChild(h('h2', { class: 'section-title' }, t('usage.commands', { n: new Set(cmds.map(c => c.name)).size }), h('span', { class: 'hint' }, t('usage.commands.lead'))))
      body.appendChild(DSHMap.ui.table({
        card: true, head: false, label: t('usage.commands', { n: new Set(cmds.map(c => c.name)).size }), rows: cmds,
        columns: [
          { key: 'name', className: 'mono nowrap', cell: c => [h('b', null, `/${c.name}`), c.hint ? h('span', { class: 'faint' }, ` ${c.hint}`) : null] },
          { key: 'kind', cell: c => h('span', { class: ['badge', c.kind === 'host' ? 'accent' : 'pink'] }, t(`usage.cmd.${c.kind}`)) },
          { key: 'description', className: 'small', cell: c => c.description ?? '' },
          { key: 'pkg', cell: c => DSHMap.ui.pkgChip(c.pkg) },
          { key: 'file', cell: c => h('button', { class: ['link-btn', 'tiny', 'mono'], onclick: () => DSHMap.nav.openFile(c.file) }, c.file.split('/').slice(-2).join('/')) },
        ],
      }))
    },

    // ── 2.3 what the model sees ─────────────────────────────────────────
    render_model(body, params) {
      const M = DSHMap.model
      const U = M.usage.model
      const profile = M.profileByName.has(params.profile) ? params.profile : M.defaultProfile
      const ctxs = M.toolContexts(profile)
      const presets = ctxs.filter(x => x.preset)
      const preset = presets.some(x => x.preset === params.preset) ? params.preset : presets[0]?.preset ?? null
      const ctx = ctxs.find(x => x.preset === preset) ?? ctxs[0]
      body.appendChild(DSHMap.ui.gtext('p', { class: 'muted' }, i18n.pick(U.lead)))
      body.appendChild(h('div', { class: 'row wrap ctx-picker' },
        h('span', { class: 'faint small' }, `${t('usage.col.profile')}:`),
        h('div', { class: 'seg' }, M.profileOrder.map(n => h('button', { class: n === profile ? 'on' : null, onclick: () => DSHMap.router.setParams({ profile: n, preset: null }) }, n))),
        presets.length ? [h('span', { class: 'faint small' }, `${t('usage.agentPreset')}:`),
          h('div', { class: 'seg' }, presets.map(x => h('button', { class: x.preset === preset ? 'on' : null, onclick: () => DSHMap.router.setParams({ preset: x.preset }) }, x.preset)))] : null))

      const rec = U.recorded.find(r => r.profile === profile && (r.preset ?? null) === (preset ?? null)) ?? U.recorded.find(r => r.profile === profile && !presets.length)
      const cls = rec ? M.classById.get(rec.cls) : null
      const staticNames = new Set(ctx.tools.map(x => x.name))
      const left = h('div', { class: 'card' }, h('h3', null, t('usage.static'), h('span', { class: 'count' }, ` ${ctx.tools.length}`)), h('p', { class: 'faint small' }, t('usage.static.lead')))
      const right = h('div', { class: 'card' }, h('h3', null, t('usage.recorded')))
      body.appendChild(h('div', { class: 'two-col usage-two' }, left, right))
      const toolChip = (name, extra, cls2) => {
        const tl = M.tools.find(x => x.name === name)
        const note = U.toolNotes[name]
        return h(tl ? 'button' : 'span', { class: ['chip', tl ? 'link' : null, 'mono', cls2], title: note ? i18n.pick(note) : tl?.pkgName ?? '', onclick: tl ? () => DSHMap.nav.openTool(tl.key) : null }, name, extra ? h('span', { class: 'count' }, extra) : null, note ? h('span', { class: 'count' }, ' ⓘ') : null)
      }
      const staticBox = h('div', { class: 'chips' })
      left.appendChild(staticBox)
      const paintStatic = recorded => {
        clear(staticBox)
        for (const x of ctx.tools) staticBox.appendChild(toolChip(x.name, `${x.state === 'cond' ? '◐' : ''}${x.configured ? '✱' : ''}`, recorded && !recorded.has(x.name) ? 'faded' : null))
      }
      paintStatic(null)
      const notes = Object.entries(U.toolNotes).filter(([n]) => staticNames.has(n))
      if (notes.length) left.appendChild(h('details', { class: 'fold usage-notes' }, h('summary', null, t('usage.notes'), h('span', { class: 'count' }, ` ${notes.length}`)), h('div', { class: 'fold-body' }, h('dl', { class: 'kv small' }, notes.map(([n, v]) => [h('dt', { class: 'mono' }, n), h('dd', null, i18n.pick(v))])))))
      const promptSlot = h('div')
      if (!cls?.file) right.appendChild(h('p', { class: 'faint small' }, t('usage.recorded.none')))
      else {
        right.appendChild(h('p', { class: 'faint small' }, t('usage.recorded.lead', { s: cls.owner, c: cls.cls }).split(cls.owner)[0], h('button', { class: 'link-btn', onclick: () => DSHMap.nav.openScenario(cls.owner) }, cls.owner), t('usage.recorded.lead', { s: cls.owner, c: cls.cls }).split(cls.owner)[1] ?? ''))
        const box = h('div', null, DSHMap.ui.loading())
        right.appendChild(box)
        body.appendChild(promptSlot)
        DSHMap.load('snapClass', cls.cls, cls.file).then(own => {
          const initial = (own.schemas?.initial ?? (Array.isArray(own.schemas) ? own.schemas : [])).map(x => x.name)
          const recSet = new Set(initial)
          clear(box).appendChild(h('div', { class: 'chips' }, initial.sort().map(n => toolChip(n, null, staticNames.has(n) ? null : 'added'))))
          const onlyS = ctx.tools.filter(x => !recSet.has(x.name)).length
          const onlyR = initial.filter(n => !staticNames.has(n)).length
          box.appendChild(h('div', { class: 'row wrap small faint usage-legend' }, h('span', null, h('span', { class: 'chip mono faded' }, '…'), ` ${t('usage.onlyStatic')}: ${onlyS}`), h('span', null, h('span', { class: 'chip mono added' }, '…'), ` ${t('usage.onlyRecorded')}: ${onlyR}`)))
          paintStatic(recSet)
          if (own.prompt) {
            promptSlot.append(h('h2', { class: 'section-title' }, t('usage.prompt'), h('span', { class: 'hint' }, h('button', { class: 'link-btn', onclick: () => DSHMap.nav.openFile(own.promptFile) }, own.promptFile))),
              h('p', { class: 'muted small' }, t('usage.prompt.lead', { n: own.prompt.length.toLocaleString() })),
              h('details', { class: 'fold', open: own.prompt.length < 9000 }, h('summary', null, i18n.tn('lines', own.prompt.split('\n').length)), h('div', { class: 'fold-body' }, h('pre', { class: 'code prompt-text' }, own.prompt))))
          }
        }).catch(err => { clear(box).appendChild(DSHMap.ui.errorState(err, { retry: () => this.render(DSHMap.router.params) })) })
      }

      // anatomy
      const A = U.prompt
      if (A) {
        const active = new Set([...ctxs.find(x => x.id === 'profile').packages, ...ctx.packages])
        const isActive = id => active.has(id) || M.isActiveIn(M.pkgById.get(id), profile)
        const anatomy = (title, list) => h('div', null, h('div', { class: 'd-sub-h' }, title), DSHMap.ui.table({
          card: true, className: 'anatomy', label: title, rows: list,
          row: s => ({ class: s.users.some(u => isActive(u.pkg)) ? null : 'dim' }),
          columns: [
            { key: 'order', label: t('usage.anatomy.order'), num: true, className: 'mono faint' },
            { key: 'key', label: t('usage.anatomy.slot'), className: 'mono small' },
            { key: 'users', label: t('usage.anatomy.who'), sort: false, cell: s => s.users.length ? h('div', { class: 'stack anatomy-users' }, s.users.map(u => h('div', { class: ['row', 'small', isActive(u.pkg) ? null : 'dim'] }, DSHMap.ui.pkgChip(u.pkg), u.name ? h('button', { class: ['link-btn', 'mono', 'faint'], onclick: () => DSHMap.nav.openFile(u.file) }, u.name) : null))) : h('span', { class: 'faint small' }, '—') },
          ],
        }))
        body.append(h('h2', { class: 'section-title' }, t('usage.anatomy'), h('span', { class: 'hint' }, h('button', { class: 'link-btn', onclick: () => DSHMap.nav.openFile(A.file) }, A.file))),
          h('p', { class: 'muted small' }, t('usage.anatomy.lead')),
          h('div', { class: 'two-col usage-two' },
            anatomy(t('usage.anatomy.sections'), A.sections),
            anatomy(t('usage.anatomy.contexts'), A.contexts)))
      }

      // matrix
      const cols = M.profileOrder.flatMap(n => M.toolContexts(n).filter(x => x.preset || !M.toolContexts(n).some(y => y.preset)).map(x => ({ profile: n, ctx: x, label: x.preset ? `${n} · ${x.preset}` : n })))
      const names = [...new Set(cols.flatMap(c => c.ctx.tools.map(x => x.name)))].sort()
      body.append(h('h2', { class: 'section-title' }, t('usage.matrix'), h('span', { class: 'hint' }, t('usage.matrix.lead'))),
        DSHMap.ui.table({
          card: true, sortable: false, className: 'matrix-tools', label: t('usage.matrix'), rows: names,
          columns: [
            { key: 'tool', label: t('type.tool'), className: 'mono small', cell: n => toolChip(n) },
            ...cols.map((c, i) => ({
              key: `c${i}`, label: c.label, className: `vert center${c.ctx === ctx ? ' on' : ''}`,
              cell: n => { const x = c.ctx.tools.find(y => y.name === n); return x ? (x.state === 'cond' ? '◐' : '●') : h('span', { class: 'faint' }, '·') },
            })),
          ],
        }))
    },

    // ── 2.4 safety ──────────────────────────────────────────────────────
    render_safety(body) {
      const M = DSHMap.model
      const S = M.usage.safety
      body.appendChild(h('div', { class: 'callout warn' }, svgIcon('shield'), h('div', null, DSHMap.ui.gtext('span', null, i18n.pick(S.warning)), DSHMap.ui.refChips(S.warningRefs))))
      body.appendChild(h('h2', { class: 'section-title' }, t('usage.chain')))
      body.appendChild(h('div', { class: 'chain' }, S.chain.flatMap((c, i) => [i ? h('div', { class: 'chain-arrow' }, '→') : null, h('div', { class: 'card' },
        h('h3', null, i18n.pick(c.title)), DSHMap.ui.gtext('p', { class: 'small muted' }, i18n.pick(c.text)), DSHMap.ui.refChips(c.refs))])))
      if (S.presets) {
        body.appendChild(h('h2', { class: 'section-title' }, t('usage.presets', { row: `${S.presets.row} · ${M.pkgById.get(S.presets.origin)?.short ?? S.presets.origin}` })))
        body.appendChild(DSHMap.ui.table({
          card: true, sortable: false, className: 'perm-presets', rows: S.presets.presets,
          columns: [
            { key: 'id', label: t('usage.presets.preset'), className: 'mono', cell: p => [h('b', null, p.id), p.id === 'workspace-write' ? h('span', { class: 'badge ok' }, t('usage.status.default')) : null] },
            { key: 'sandbox', label: t('usage.presets.sandbox'), className: 'mono' },
            { key: 'approval', label: t('usage.presets.approval'), className: 'mono' },
          ],
        }))
      }
      body.appendChild(h('h2', { class: 'section-title' }, t('usage.backends')))
      body.appendChild(DSHMap.ui.table({
        card: true, sortable: false, label: t('usage.backends'), rows: S.backends,
        columns: [
          { key: 'id', label: '', className: 'mono', cell: b => h('b', null, b.id) },
          { key: 'platform', label: t('usage.backend.platform') },
          { key: 'enforcement', label: t('usage.backend.enforcement'), cell: b => h('span', { class: ['badge', /partial/.test(b.enforcement) ? 'warn' : 'ok'] }, b.enforcement) },
          { key: 'text', label: '', className: 'small', cell: b => i18n.pick(b.text) },
          { key: 'packages', label: t('usage.packages'), cell: b => h('div', { class: 'chips' }, b.packages.map(id => DSHMap.ui.pkgChip(id))) },
        ],
      }))

      // tools by effect
      const effect = tl => {
        const req = tl.requires.join(' ')
        const out = []
        if (/ctx\.(shell|subprocess|terminal)/.test(req)) out.push('shell')
        if (/ctx\.fs\b/.test(req)) out.push('fs')
        if (/ctx\.web\b|ctx\.browserUse|ctx\.mcp/.test(req)) out.push('web')
        if (/ctx\.approval|ctx\.userApproval/.test(req)) out.push('approval')
        if (/ctx\.sandboxPolicy/.test(req)) out.push('policy')
        return out.length ? out : ['other']
      }
      const groups = ['shell', 'fs', 'web', 'approval', 'policy', 'other']
      const by = Object.fromEntries(groups.map(g => [g, []]))
      for (const tl of M.tools) for (const e of effect(tl)) by[e].push(tl)
      body.append(h('h2', { class: 'section-title' }, t('usage.toolEffects'), h('span', { class: 'hint' }, t('usage.toolEffects.lead'))),
        h('div', { class: 'card' }, h('dl', { class: 'kv effects' }, groups.filter(g => by[g].length).map(g => [h('dt', null, t(`usage.effect.${g}`)), h('dd', null, DSHMap.ui.chipList(by[g].map(x => x.key), k => { const tl = M.toolByKey.get(k); return DSHMap.ui.toolChip(k, tl.name) }, 30))]))))

      // egress
      body.appendChild(h('h2', { class: 'section-title' }, t('usage.egress')))
      body.appendChild(DSHMap.ui.table({
        card: true, sortable: false, className: 'egress', label: t('usage.egress'), rows: S.egress,
        columns: [
          { key: 'title', label: '', cell: x => h('b', null, i18n.pick(x.title)) },
          { key: 'default', label: t('usage.egress.default'), className: 'small', cell: x => mdInline(i18n.pick(x.default)) },
          { key: 'off', label: t('usage.egress.off'), className: 'small', cell: x => mdInline(i18n.pick(x.off)) },
          { key: 'text', label: '', className: 'small', cell: x => [mdInline(i18n.pick(x.text)), DSHMap.ui.refChips(x.refs)] },
        ],
      }))
    },

    // ── 2.5 disk and environment ────────────────────────────────────────
    render_disk(body, params) {
      const M = DSHMap.model
      const D = M.usage.disk
      const tree = (title, list, sites) => h('div', { class: 'card' }, h('h3', null, svgIcon('folder', 'inline-icon'), title),
        h('div', { class: 'tree-view' }, list.map(e => {
          const own = sites.filter(s => e.path.startsWith(s.path.split('/')[0]))
          return h('div', { class: 'tv-row' },
            h('span', { class: 'mono tv-path' }, e.path),
            h('span', { class: 'tv-owner' }, e.owner ? DSHMap.ui.pkgChip(e.owner) : null),
            h('span', { class: 'small muted tv-text' }, i18n.pick(e.text),
              own.length ? h('span', { class: 'chips tv-sites' }, own.map(s => h('button', { class: 'chip link mono', title: `${s.file}:${s.line}`, onclick: () => DSHMap.nav.openFile(s.file, { line: s.line }) }, `dshHomePath('${s.path}') · ${s.row ?? '?'}`))) : null))
        })))
      body.appendChild(h('div', { class: 'two-col usage-two' },
        tree(t('usage.home'), D.home, D.homePaths.filter(s => s.kind === 'bundle')),
        h('div', { class: 'stack usage-side' },
          tree(t('usage.agentsHome'), D.agentsHome, []),
          h('div', { class: 'card' }, h('h3', null, svgIcon('key', 'inline-icon'), t('usage.credentials')),
            h('ol', { class: 'cred-list' }, D.credentials.map(c => h('li', null, h('code', null, c.source), h('div', { class: 'small muted' }, i18n.pick(c.text))))),
            DSHMap.ui.refChips(D.credentialRefs)),
          D.sessionFormat ? h('div', { class: 'card' }, h('h3', null, svgIcon('disk', 'inline-icon'), t('usage.sessionFormat')),
            h('div', { class: 'stat-grid' },
              stat(`v${D.sessionFormat.writer}`, t('usage.sessionFormat.writer')),
              stat(`v${D.sessionFormat.finalized}`, t('usage.sessionFormat.finalized')),
              stat(`v${D.sessionFormat.released}`, `${t('usage.sessionFormat.released')}${D.sessionFormat.evidenceTag ? ` · ${D.sessionFormat.evidenceTag}` : ''}`)),
            h('pre', { class: 'code session-tree' }, '$DSH_HOME/sessions/\n  --<normalized-cwd>--/\n    <encoded-id>/\n      session.v4.jsonl.zstd   # highest generation wins\n      session.v3.jsonl.zstd   # older generations are immutable'),
            DSHMap.ui.refChips(D.sessionRefs)) : null)))

      // environment variables
      // Text filter in route key `q`; the "internal" toggle is view state.
      const tests = h('input', { type: 'checkbox', checked: this.state.envTests })
      const fb = DSHMap.ui.filterBar({
        key: 'q', placeholder: t('usage.env.filter'), label: t('usage.env.filter'), onChange: () => draw(),
        extra: h('label', { class: 'small row' }, tests, t('usage.env.tests')),
      })
      // Test/replay variables and Desktop-shell internals are hidden unless asked for.
      const internal = v => v.test || /^DSH_DESKTOP_/.test(v.name) || (!v.patch.length && v.src.length && v.src.every(id => /^apps\/desktop/.test(M.pkgById.get(id)?.dir ?? '')))
      const table = DSHMap.ui.table({
        card: true, className: 'env-table', label: t('usage.env', { n: M.envVars.length }), rows: [],
        empty: DSHMap.ui.noMatches(() => fb.reset()),
        row: v => ({ 'data-card': v.name }),
        columns: [
          { key: 'name', label: t('type.env'), className: 'mono nowrap', cell: v => [h('b', null, v.name), internal(v) ? h('div', null, h('span', { class: 'badge' }, v.test ? 'test' : 'desktop')) : null] },
          { key: 'text', label: '', sort: false, className: 'small', cell: v => v.text ? i18n.pick(v.text) : h('span', { class: 'faint' }, '—') },
          { key: 'patch', label: t('usage.env.patch'), sort: false, cell: v => h('div', { class: 'stack env-sites' }, v.patch.slice(0, 6).map(x => h('div', { class: 'small' },
            h('button', { class: ['link-btn', 'mono'], title: x.expr, onclick: () => DSHMap.nav.openFile(x.file, { line: x.line }) }, `${x.row ?? '?'}${x.key ? `.${x.key}` : ''}`),
            h('span', { class: 'faint tiny' }, ` · ${DSHMap.model.pkgById.get(x.pkg)?.short ?? x.file.split('/').slice(-1)[0]}${x.kind === 'example' ? ' (example)' : ''}`))), v.patch.length > 6 ? h('span', { class: 'faint tiny' }, t('more', { n: v.patch.length - 6 })) : null) },
          { key: 'src', label: t('usage.env.src'), sort: false, cell: v => DSHMap.ui.chipList(v.src, id => DSHMap.ui.pkgChip(id), 6) },
        ],
      })
      body.append(h('h2', { class: 'section-title' }, t('usage.env', { n: M.envVars.length })),
        h('p', { class: 'muted small' }, t('usage.env.lead')),
        h('div', { class: 'usage-filter' }, fb.el),
        table)
      const draw = () => {
        const q = fb.query()
        const sel = DSHMap.router.params.env
        table.update(M.envVars.filter(v => !(internal(v) && !tests.checked && v.name !== sel) &&
          !(q && !`${v.name} ${v.text ? `${v.text.uk} ${v.text.en}` : ''}`.toLowerCase().includes(q))))
        this.select(DSHMap.router.params)
      }
      tests.addEventListener('change', () => { this.state.envTests = tests.checked; draw() })
      fb.sync(params)
      this.syncFilter = p => { if (fb.sync(p)) draw() }
      draw()
    },

    // ── 2.6 integrations ────────────────────────────────────────────────
    render_integrations(body) {
      const M = DSHMap.model
      const I = M.usage.integrations
      for (const c of I.cards) {
        const card = h('div', { class: 'card int-card', 'data-card': c.id },
          h('div', { class: 'row wrap int-head' }, h('h3', null, i18n.pick(c.title)), h('span', { class: ['badge', /не стаб|not a stable/.test(i18n.pick(c.stability)) ? 'warn' : 'ok'] }, i18n.pick(c.stability))),
          DSHMap.ui.glossarize(h('p', { class: 'small muted' }, mdInline(i18n.pick(c.text)))),
          c.start ? [h('div', { class: 'd-sub-h' }, t('usage.int.start')), DSHMap.ui.codeCopy(c.start, 'bash')] : null,
          c.example ? [h('div', { class: 'd-sub-h' }, t('usage.int.example')), DSHMap.ui.codeCopy(c.example, /^from |^import .* from|^\s*with /m.test(c.example) && /def |with |print\(/.test(c.example) ? 'python' : 'typescript')] : null)
        if (c.id === 'headless' && I.headless.length) {
          card.append(h('div', { class: 'd-sub-h' }, t('usage.int.events')), DSHMap.ui.table({
            head: false, label: t('usage.int.events'), rows: I.headless,
            columns: [
              { key: 'type', className: 'mono nowrap', cell: e => [h('b', null, e.type), e.phase ? h('span', { class: 'faint' }, ` · ${e.phase}`) : null] },
              { key: 'fields', className: 'mono small', cell: e => `{ type${e.phase ? ', phase' : ''}${e.fields.filter(f => f !== 'phase').map(f => `, ${f}`).join('')} }` },
            ],
          }))
        }
        if (c.id === 'sdk-ts' && I.sdk) {
          const fieldList = fs => fs.length ? h('div', { class: 'mono small' }, fs.map(f => h('div', { title: f.doc ?? '' }, `${f.name}: `, h('span', { class: 'faint' }, f.type)))) : h('span', { class: 'faint small' }, '—')
          const method = { key: 'method', className: 'mono nowrap', cell: r => h('b', null, r.method) }
          const fields = { key: 'fields', cell: r => fieldList(r.fields) }
          card.append(h('div', { class: 'd-sub-h' }, t('usage.int.requests')), DSHMap.ui.table({
            head: false, label: t('usage.int.requests'), rows: I.sdk.requests,
            columns: [method, fields, { key: 'result', className: 'mono small faint', cell: r => `→ ${r.result ?? ''}` }],
          }),
          h('div', { class: 'd-sub-h' }, t('usage.int.notifications')), DSHMap.ui.table({
            head: false, label: t('usage.int.notifications'), rows: I.sdk.notifications, columns: [method, fields],
          }))
        }
        if (c.id === 'http' && I.remotes) {
          const R = I.remotes
          card.append(h('details', { class: 'fold int-remotes' }, h('summary', null, t('usage.int.remotes', { u: R.unary, s: R.stream, p: R.packages.length })),
            h('div', { class: 'fold-body' }, DSHMap.ui.table({
              head: false, rows: R.packages,
              columns: [
                { key: 'pkg', cell: r => DSHMap.ui.pkgChip(r.pkg) },
                { key: 'namespaces', className: 'mono small', cell: r => r.namespaces.map(ns => `/api/${ns}/…`).join(' ') },
                { key: 'methods', className: 'small faint mono', cell: r => [r.methods.slice(0, 12).join(', '), r.methods.length > 12 ? ` ${t('more', { n: r.methods.length - 12 })}` : ''] },
              ],
            }))))
        }
        card.appendChild(DSHMap.ui.refChips(c.refs) ?? h('span'))
        body.appendChild(card)
      }
    },

    // ── 2.7 providers ───────────────────────────────────────────────────
    render_providers(body, params) {
      const M = DSHMap.model
      const P = M.usage.providers
      const block = (title, b, extra) => b ? h('div', { class: 'card' }, h('h3', null, title, extra), DSHMap.ui.glossarize(h('p', { class: 'small muted' }, mdInline(i18n.pick(b.text)))), DSHMap.ui.refChips(b.refs)) : null
      body.appendChild(h('div', { class: 'usage-grid' },
        block(t('usage.prov.native'), P.native, P.native?.id ? h('code', { class: 'faint prov-id' }, P.native.id) : null),
        block(t('usage.prov.custom'), P.custom),
        block(t('usage.prov.proxy'), P.proxy)))
      const fb = DSHMap.ui.filterBar({ key: 'q', placeholder: t('search.placeholder').split(',')[0], label: t('usage.prov.filter'), onChange: () => draw() })
      const table = DSHMap.ui.table({
        card: true, label: t('usage.prov.piAi', { n: P.piAi.length }), rows: [],
        empty: DSHMap.ui.noMatches(() => fb.reset()),
        columns: [
          { key: 'id', label: 'provider', className: 'mono', cell: p => h('b', null, p.id) },
          { key: 'env', label: t('usage.prov.env'), sort: false, cell: p => p.env.length ? h('div', { class: 'chips' }, p.env.map(e => h('span', { class: 'chip mono' }, e))) : h('span', { class: 'faint small' }, '—') },
          { key: 'baseURL', label: t('usage.prov.url'), className: 'mono small', cell: p => p.baseURL ?? (p.baseURLEnv.length ? h('span', null, h('span', { class: 'faint' }, 'env: '), p.baseURLEnv.join(' | ')) : '—') },
        ],
      })
      body.append(h('h2', { class: 'section-title' }, t('usage.prov.piAi', { n: P.piAi.length })), h('p', { class: 'muted small' }, t('usage.prov.lead')),
        h('div', { class: 'usage-filter narrow' }, fb.el), table)
      const draw = () => {
        const q = fb.query()
        table.update(P.piAi.filter(p => !q || `${p.id} ${p.env.join(' ')} ${p.baseURL ?? ''}`.toLowerCase().includes(q)))
      }
      fb.sync(params)
      this.syncFilter = p => { if (fb.sync(p)) draw() }
      draw()
    },
  }

  /** Profile/preset columns for capability pills: profiles in display order, Web split by agent preset. */
  function capContexts() {
    const M = DSHMap.model
    const out = []
    for (const n of M.profileOrder) {
      const presets = M.toolContexts(n).filter(x => x.preset)
      out.push({ profile: n, preset: null, label: n })
      for (const p of presets) out.push({ profile: n, preset: p.preset, label: `${n}·${p.preset}`, sub: true })
    }
    return out
  }

  function capCard(c, status, contexts) {
    const M = DSHMap.model
    const ui = DSHMap.ui
    const enable = c.enable.map(e => {
      const label = t(`usage.enable.${e.kind}`)
      let value = null
      if (e.kind === 'env') value = h('button', { class: 'chip link mono', onclick: () => DSHMap.nav.openEnv(e.value) }, e.value)
      else if (e.kind === 'bundle') value = ui.pkgChip(e.value)
      else if (e.kind === 'command') value = h('code', null, e.value)
      else if (e.kind === 'plugin') value = h('code', { class: 'wrap-code' }, e.value)
      else if (e.value) value = h('span', { class: 'small' }, e.value)
      return h('div', { class: 'enable-row' }, h('span', { class: ['badge', e.kind === 'default' ? 'ok' : null] }, label), value)
    })
    return h('div', { class: 'card cap-card', 'data-card': c.id },
      h('div', { class: 'row cap-head' }, h('h3', null, i18n.pick(c.title)), h('span', { class: ['badge', STATUS_BADGE[status]] }, t(`usage.status.${status}`))),
      ui.gtext('p', { class: 'small muted' }, i18n.pick(c.blurb)),
      h('div', { class: 'd-sub-h' }, t('usage.enable')), h('div', { class: 'stack cap-enable' }, enable),
      h('div', { class: 'd-sub-h' }, t('usage.state')),
      h('div', { class: 'profile-pills' }, contexts.map(x => {
        const st = M.capabilityState(c, x.profile, x.preset)
        return h('button', { class: ['ppill', st ?? 'off', x.sub ? 'sub' : null], title: x.label, onclick: () => DSHMap.router.go('usage', { tab: 'model', profile: x.profile, preset: x.preset ?? undefined }) }, st ? GLYPH[st] : '○', x.sub ? x.preset : x.label)
      })),
      c.tools.length ? [h('div', { class: 'd-sub-h' }, t('usage.tools')), h('div', { class: 'chips' }, c.tools.map(n => { const tl = M.tools.find(x => x.name === n); return tl ? ui.toolChip(tl.key, n) : h('span', { class: 'chip mono' }, n) }))] : null,
      h('div', { class: 'd-sub-h' }, t('usage.packages')), ui.chipList(c.packages, id => ui.pkgChip(id), 6),
      ui.refChips(c.refs))
  }

  function optionsTable(options) {
    if (!options?.length) return null
    return DSHMap.ui.table({
      head: false, className: 'cli-options', rows: options,
      columns: [{ key: 'flag', className: 'mono nowrap' }, { key: 'text', className: 'small' }],
    })
  }

  /** Inline Markdown subset of curated text: `code` spans only. */
  function mdInline(text) {
    const out = []
    String(text ?? '').split(/(`[^`]+`)/).forEach(part => out.push(part.startsWith('`') && part.endsWith('`') ? h('code', null, part.slice(1, -1)) : part))
    return h('span', null, out)
  }

  function stat(v, label) { return h('div', { class: 'stat' }, h('b', null, v), h('span', null, label)) }

  DSHMap.ui.mdInline = mdInline
})()
