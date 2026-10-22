/* DSH Map — customization: from a patch to your own plugin. The extension
 * catalog (no-code and code tracks, upstream extension tables, skills,
 * publishing path), the cordis.patch.yml sandbox, the config reference, event
 * interception, recipe tracks and client UI slots. Also the package-panel
 * helpers: "Configure" snippets, usage examples and "Copy as context".
 * Curated text: generator/curated/customize.yaml; the patch engine is
 * assets/js/patch.js (the generator verifies snippets with the same code). */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, util, i18n } = DSHMap

  i18n.extend({
    uk: {
      'cz.tab.catalog': 'Точки розширення',
      'cz.tab.sandbox': 'Пісочниця патчів',
      'cz.tab.config': 'Довідник конфігу',
      'cz.tab.events': 'Перехоплення подій',
      'cz.tab.recipes': 'Рецепти',
      'cz.tab.slots': 'UI-слоти',
      'cz.tab.layouts': 'Web UI — макети',
      'cz.layers': 'Шари композиції',
      'cz.quick': 'Готові патчі',
      'cz.quick.lead': 'Кожен патч генератор застосовує до свого профілю тим самим рушієм, що й пісочниця: він має змінювати рядки й не давати попереджень.',
      'cz.trySandbox': 'Приміряти в пісочниці',
      'cz.nocode': 'Без коду',
      'cz.code': 'З кодом',
      'cz.col.point': 'Точка розширення',
      'cz.col.write': 'Що пишеш',
      'cz.col.where': 'Де реєструється',
      'cz.col.examples': 'Приклади й документи',
      'cz.upstream.where': 'Де живе нова поведінка (docs/architecture.md)',
      'cz.upstream.features': 'Фіча → механізм (extension-cookbook)',
      'cz.upstream.lead': 'Згенеровано з таблиць upstream; сервіси, події й пакети-приклади (провайдери, слухачі) карта знаходить у тексті механізму, документи — серед cookbook, туторіалу й docs/user/develop, що згадують ті самі сервіси чи події.',
      'cz.col.goal': 'Мета',
      'cz.col.feature': 'Фіча',
      'cz.col.mechanism': 'Механізм',
      'cz.col.links': 'Сервіси, події',
      'cz.skills': 'Скіли ({n})',
      'cz.skills.lead': 'SKILL.md з frontmatter: скіли, що постачаються в пакетах (модель бачить їх у каталозі скілів), і скіли контриб’ютора в .agents/skills.',
      'cz.skill.shipped': 'у пакеті',
      'cz.skill.contributor': 'контриб’ютор',
      'cz.publish': 'Шлях публікації',
      'cz.sb.profile': 'Профіль',
      'cz.sb.example': 'Приклад',
      'cz.sb.clear': 'Очистити',
      'cz.sb.share': 'Копіювати посилання',
      'cz.sb.shared': 'Посилання скопійовано',
      'cz.sb.editor': 'Редактор патча cordis.patch.yml',
      'cz.sb.placeholder': '# Вставте cordis.patch.yml…\n- id: tool-web\n  disabled: true',
      'cz.sb.empty': 'Патч порожній — нічого не змінюється.',
      'cz.sb.ok': 'Патч застосовується чисто.',
      'cz.sb.yaml': 'YAML не розібрано',
      'cz.sb.issues': 'Перевірки',
      'cz.sb.changed': 'Змінені рядки',
      'cz.sb.added': 'Додані рядки',
      'cz.sb.removed': 'Прибрані рядки',
      'cz.sb.mounts': 'Що монтується',
      'cz.sb.mountsAdded': 'Починають монтуватися',
      'cz.sb.mountsRemoved': 'Перестають монтуватися',
      'cz.sb.nochange': 'Жоден рядок не змінився.',
      'cz.sb.before': 'було',
      'cz.sb.after': 'стало',
      'cz.sb.lost': 'втрачено ключі',
      'cz.sb.required': 'Обов’язкові стартові записи',
      'cz.sb.dialect': 'Діалект патча',
      'cz.sb.rows': 'Ефективних рядків: {n}',
      'cz.issue.op-shape': 'Операція патча має бути об’єктом (`- id: …` або `- insert: …`).',
      'cz.issue.op-unknown-key': 'Поле «{d}» не належить до діалекту: Loader просто запише його в рядок.',
      'cz.issue.insert-shape': '`insert` має бути списком рядків.',
      'cz.issue.unresolved': 'Рядка з id «{id}» у цьому профілі немає — Loader попередить і пропустить операцію.',
      'cz.issue.insert-not-group': 'Рядок «{id}» не є групою (`group: true`) — вставку пропущено.',
      'cz.issue.row-shape': 'Рядок вставки має бути об’єктом.',
      'cz.issue.row-unknown-key': 'Невідоме поле рядка «{d}».',
      'cz.issue.row-no-id': 'Рядок без id ({d}): пізніші шари не зможуть його адресувати.',
      'cz.issue.duplicate-id': 'id «{id}» уже є: пізніші патчі адресуватимуть новий рядок.',
      'cz.issue.row-no-name': 'Рядок «{id}» без `name` (пакета плагіна).',
      'cz.issue.row-external': '«{d}» — не пакет воркспейсу: його треба встановити в профіль (`dsh plugin add`).',
      'cz.issue.op-no-target': 'Операція без `id` і без `insert` — Loader її пропустить.',
      'cz.issue.name-assert': '`name` не перейменовує, а перевіряє плагін рядка ({d}) — Loader пропустить усю операцію.',
      'cz.issue.js-metadata': '`!!js` у полі «{d}»: вирази обчислюються лише в `config` і `disabled`, решта лишається буквальним об’єктом (verify-cordis-config це відхиляє).',
      'cz.issue.js-literal-disabled': '`disabled: "{d}"` у лапках — це рядок, а не вираз: непорожній рядок істинний, тож рядок вимкнено назавжди (постмортем 0002).',
      'cz.issue.disabled-string': '`disabled: {d}` — не булеве значення: Loader зведе його до істини.',
      'cz.issue.disabled-object': '`disabled` — об’єкт: завжди істинний, рядок вимкнено назавжди (постмортем 0002).',
      'cz.issue.js-literal-config': 'У `config` є рядок у лапках, що починається з `!!js` — це текст, а не вираз.',
      'cz.issue.config-replaced': '`config` рядка «{id}» замінено цілком; втрачено ключі: {d}.',
      'cz.issue.required-disabled': '«{id}» — обов’язковий стартовий запис; вимкнений, він не стартує, тож цей режим профілю не працюватиме.',
      'cz.issue.required-changed': '«{id}» — обов’язковий стартовий запис: якщо після змін він не активується, старт профілю впаде (звіт — у `$DSH_HOME/logs/startup-*.log`).',
      'cz.hint.single-bang': 'Тегу `!js` немає — потрібно `!!js`.',
      'cz.hint.not-a-list': 'Патч — це YAML-список операцій.',
      'cz.cfg.lead': '{p} оголошень конфігу, {f} полів. Тип і JSDoc — з docs/config-catalog.md, типові значення й прапорці — зі схеми schemastery в коді пакета.',
      'cz.cfg.filter': 'Ключ, пакет або опис…',
      'cz.cfg.filter.label': 'Фільтр полів конфігурації',
      'cz.cfg.onlyVolatile': 'лише Settings (.volatile)',
      'cz.cfg.onlySecret': 'лише секрети',
      'cz.cfg.onlyMounted': 'змонтовані в {p}',
      'cz.cfg.field': 'Поле',
      'cz.cfg.type': 'Тип',
      'cz.cfg.default': 'Типово',
      'cz.cfg.flags': 'Прапорці',
      'cz.cfg.doc': 'Опис',
      'cz.cfg.required': 'обов’язкове',
      'cz.cfg.volatile': 'Settings',
      'cz.cfg.volatile.d': '.volatile(): редагується у формах налаштувань Web, які пишуть у cordis.patch.yml профілю',
      'cz.cfg.secret': 'секрет',
      'cz.cfg.secret.d': "role('secret'): маскується в UI; тримайте значення в .credentials.yaml або змінній середовища через !!js process.env",
      'cz.cfg.rows': 'Рядки',
      'cz.cfg.settings': 'Форма налаштувань',
      'cz.cfg.inject': 'inject',
      'cz.cfg.configure': 'Налаштувати',
      'cz.cfg.schema': 'JSON Schema всього конфігу профілю: `dsh <профіль> --dump-config-schema` (приклад вихідного файлу — нижче).',
      'cz.cfg.shown': 'показано {n}',
      'cz.ev.profile': 'Порядок для профілю',
      'cz.ev.filter': 'Подія…',
      'cz.ev.filter.label': 'Фільтр подій',
      'cz.ev.listeners': 'Слухачі в наближеному порядку виклику',
      'cz.ev.prepend': 'prepend',
      'cz.ev.inactive': 'не активний у профілі',
      'cz.ev.nosite': 'місце реєстрації не знайдено в src',
      'cz.ev.none': 'Слухачів у воркспейсі немає — подія чекає на ваш плагін.',
      'cz.ev.example': 'Мінімальний слухач',
      'cz.ev.modes': 'Режими',
      'cz.rc.start': 'Почати',
      'cz.rc.prev': 'Назад',
      'cz.rc.next': 'Далі',
      'cz.rc.read': 'Читати',
      'cz.rc.file': 'Файл-приклад',
      'cz.rc.step': 'Крок {i} з {n}',
      'cz.rc.smallest': 'Найменший реальний плагін',
      'cz.rc.smallest.d': 'Інструмент `working_directory` за 42 рядки: apply, inject, defineTool, реєстрація — усе, що потрібно для першого плагіна.',
      'cz.sl.lead': '{n} слотів: тип комірки, область, опції реєстрації, пропси, хто оголошує й хто вже займає слот.',
      'cz.sl.filter': 'Ключ слота або пакет…',
      'cz.sl.filter.label': 'Фільтр слотів',
      'cz.sl.risk': 'заміна штатного UI',
      'cz.sl.risk.only': 'лише з ризиком заміни',
      'cz.sl.kind': 'Тип',
      'cz.sl.scope': 'Область',
      'cz.sl.options': 'Опції реєстрації',
      'cz.sl.ownerProps': 'Пропси від власника',
      'cz.sl.standardProps': 'Стандартні хуки',
      'cz.sl.declared': 'Оголошує',
      'cz.sl.occupants': 'Мешканці',
      'cz.sl.example': 'Приклад',
      'cz.sl.pick': 'Виберіть слот ліворуч.',
      'cz.sl.notes': 'Правила слотів (з slot-catalog.ts)',
      'cz.sl.recipes': 'Рецепти клієнтських розширень',
      'cz.sl.tokens': 'Токени теми: {n} змінних --dsw-*',
      'cz.sl.tokens.lead': 'Використовуйте змінні теми замість літеральних кольорів — інакше внесок зламається в іншій схемі.',
      'cz.sl.services': 'Клієнтські сервіси',
      'd.configure': 'Налаштувати',
      'd.configure.lead': 'Сніпети для cordis.patch.yml профілю. Генератор перевіряє кожен сніпет тим самим рушієм, що й пісочниця.',
      'd.configure.row': 'Рядок',
      'd.configure.disable': 'Вимкнути',
      'd.configure.enable': 'Увімкнути',
      'd.configure.config': 'Змінити config (повністю — патч замінює весь config рядка)',
      'd.configure.preset': 'Рядок усередині пресета агента «{p}»: патч перевизначає весь рядок preset-{p}.',
      'd.configure.dep': 'У {p} пакет завантажується як залежність ({via}) — налаштовуйте рядок, що його тягне.',
      'd.configure.insert': 'Додати рядок',
      'd.configure.insert.d': 'Пакет не змонтований у {p}. Рядок нижче — як у профілі {from}.',
      'd.configure.insertNew': 'Жоден профіль не монтує цей пакет; мінімальний рядок нижче. Перевірте inject — потрібні провайдери цих сервісів.',
      'd.configure.optional': 'Пакет входить в опційний бандл — встановіть бандл у профіль:',
      'd.configure.replace': 'Замінити провайдера ctx.{s}',
      'd.configure.replace.d': 'Вимикає активних провайдерів-рядків ({from}) і вмикає цей пакет.',
      'd.configure.none': 'Пакет не монтується рядком і не має опису конфігу.',
      'd.configure.fields': 'Поля конфігу',
      'd.configure.settings': 'Ці поля редагує форма налаштувань: ',
      'd.configure.copy': 'Копіювати',
      'd.examples': 'Приклади використання',
      'd.examples.tests': 'Тести ({n} з {t})',
      'd.examples.overlays': 'Приклади-оверлеї',
      'd.examples.readme': 'Код із README',
      'd.context': 'Копіювати як контекст',
      'd.context.done': 'Контекст скопійовано',
    },
    en: {
      'cz.tab.catalog': 'Extension points',
      'cz.tab.sandbox': 'Patch sandbox',
      'cz.tab.config': 'Config reference',
      'cz.tab.events': 'Intercepting events',
      'cz.tab.recipes': 'Recipes',
      'cz.tab.slots': 'UI slots',
      'cz.tab.layouts': 'Web UI — layouts',
      'cz.layers': 'Composition layers',
      'cz.quick': 'Ready patches',
      'cz.quick.lead': 'The generator applies every patch to its profile with the same engine as the sandbox: it must change rows and raise no warnings.',
      'cz.trySandbox': 'Try in the sandbox',
      'cz.nocode': 'No code',
      'cz.code': 'With code',
      'cz.col.point': 'Extension point',
      'cz.col.write': 'What you write',
      'cz.col.where': 'Where it registers',
      'cz.col.examples': 'Examples and documents',
      'cz.upstream.where': 'Where new behavior goes (docs/architecture.md)',
      'cz.upstream.features': 'Feature → mechanism (extension-cookbook)',
      'cz.upstream.lead': 'Generated from the upstream tables; the map finds the services, events and example packages (providers, listeners) in the mechanism text, and documents among the cookbook, tutorial and docs/user/develop pages that mention the same services or events.',
      'cz.col.goal': 'Goal',
      'cz.col.feature': 'Feature',
      'cz.col.mechanism': 'Mechanism',
      'cz.col.links': 'Services, events',
      'cz.skills': 'Skills ({n})',
      'cz.skills.lead': 'SKILL.md with frontmatter: skills shipped in packages (the model sees them in the skill catalog) and contributor skills in .agents/skills.',
      'cz.skill.shipped': 'in a package',
      'cz.skill.contributor': 'contributor',
      'cz.publish': 'Publishing path',
      'cz.sb.profile': 'Profile',
      'cz.sb.example': 'Example',
      'cz.sb.clear': 'Clear',
      'cz.sb.share': 'Copy link',
      'cz.sb.shared': 'Link copied',
      'cz.sb.editor': 'cordis.patch.yml patch editor',
      'cz.sb.placeholder': '# Paste a cordis.patch.yml…\n- id: tool-web\n  disabled: true',
      'cz.sb.empty': 'The patch is empty — nothing changes.',
      'cz.sb.ok': 'The patch applies cleanly.',
      'cz.sb.yaml': 'YAML did not parse',
      'cz.sb.issues': 'Checks',
      'cz.sb.changed': 'Changed rows',
      'cz.sb.added': 'Added rows',
      'cz.sb.removed': 'Removed rows',
      'cz.sb.mounts': 'What mounts',
      'cz.sb.mountsAdded': 'Start mounting',
      'cz.sb.mountsRemoved': 'Stop mounting',
      'cz.sb.nochange': 'No row changed.',
      'cz.sb.before': 'before',
      'cz.sb.after': 'after',
      'cz.sb.lost': 'lost keys',
      'cz.sb.required': 'Required startup entries',
      'cz.sb.dialect': 'Patch dialect',
      'cz.sb.rows': 'Effective rows: {n}',
      'cz.issue.op-shape': 'A patch operation must be a mapping (`- id: …` or `- insert: …`).',
      'cz.issue.op-unknown-key': 'Field "{d}" is not part of the dialect: the Loader just writes it onto the row.',
      'cz.issue.insert-shape': '`insert` must be a list of rows.',
      'cz.issue.unresolved': 'No row with id "{id}" in this profile — the Loader warns and skips the operation.',
      'cz.issue.insert-not-group': 'Row "{id}" is not a group (`group: true`) — the insert is skipped.',
      'cz.issue.row-shape': 'An inserted row must be a mapping.',
      'cz.issue.row-unknown-key': 'Unknown row field "{d}".',
      'cz.issue.row-no-id': 'Row without an id ({d}): later layers cannot address it.',
      'cz.issue.duplicate-id': 'Id "{id}" already exists: later patches will address the new row.',
      'cz.issue.row-no-name': 'Row "{id}" has no `name` (plugin package).',
      'cz.issue.row-external': '"{d}" is not a workspace package: install it into the profile (`dsh plugin add`).',
      'cz.issue.op-no-target': 'An operation without `id` or `insert` — the Loader skips it.',
      'cz.issue.name-assert': '`name` does not rename, it asserts the row\'s plugin ({d}) — the Loader skips the whole operation.',
      'cz.issue.js-metadata': '`!!js` in field "{d}": expressions are evaluated only in `config` and `disabled`; elsewhere they stay a literal object (verify-cordis-config rejects it).',
      'cz.issue.js-literal-disabled': '`disabled: "{d}"` in quotes is a string, not an expression: a non-empty string is truthy, so the row is disabled for good (post-mortem 0002).',
      'cz.issue.disabled-string': '`disabled: {d}` is not a boolean: the Loader coerces it to true.',
      'cz.issue.disabled-object': '`disabled` is an object: always truthy, the row is disabled for good (post-mortem 0002).',
      'cz.issue.js-literal-config': '`config` holds a quoted string starting with `!!js` — that is text, not an expression.',
      'cz.issue.config-replaced': 'The `config` of row "{id}" is replaced wholesale; lost keys: {d}.',
      'cz.issue.required-disabled': '"{id}" is a required startup entry; disabled, it does not start, so this profile mode will not work.',
      'cz.issue.required-changed': '"{id}" is a required startup entry: if it fails to activate after the change, profile startup fails (report in `$DSH_HOME/logs/startup-*.log`).',
      'cz.hint.single-bang': 'There is no `!js` tag — use `!!js`.',
      'cz.hint.not-a-list': 'A patch is a YAML list of operations.',
      'cz.cfg.lead': '{p} config declarations, {f} fields. Type and JSDoc come from docs/config-catalog.md, defaults and flags from the schemastery schema in the package code.',
      'cz.cfg.filter': 'Key, package or description…',
      'cz.cfg.filter.label': 'Filter config fields',
      'cz.cfg.onlyVolatile': 'Settings only (.volatile)',
      'cz.cfg.onlySecret': 'secrets only',
      'cz.cfg.onlyMounted': 'mounted in {p}',
      'cz.cfg.field': 'Field',
      'cz.cfg.type': 'Type',
      'cz.cfg.default': 'Default',
      'cz.cfg.flags': 'Flags',
      'cz.cfg.doc': 'Description',
      'cz.cfg.required': 'required',
      'cz.cfg.volatile': 'Settings',
      'cz.cfg.volatile.d': '.volatile(): edited in the Web settings forms, which write to the profile cordis.patch.yml',
      'cz.cfg.secret': 'secret',
      'cz.cfg.secret.d': "role('secret'): masked in the UI; keep the value in .credentials.yaml or an environment variable through !!js process.env",
      'cz.cfg.rows': 'Rows',
      'cz.cfg.settings': 'Settings form',
      'cz.cfg.inject': 'inject',
      'cz.cfg.configure': 'Configure',
      'cz.cfg.schema': 'JSON Schema of the whole profile config: `dsh <profile> --dump-config-schema` (a sample output file below).',
      'cz.cfg.shown': '{n} shown',
      'cz.ev.profile': 'Order for profile',
      'cz.ev.filter': 'Event…',
      'cz.ev.filter.label': 'Filter events',
      'cz.ev.listeners': 'Listeners in approximate call order',
      'cz.ev.prepend': 'prepend',
      'cz.ev.inactive': 'not active in the profile',
      'cz.ev.nosite': 'registration site not found in src',
      'cz.ev.none': 'No workspace listeners — the event waits for your plugin.',
      'cz.ev.example': 'A minimal listener',
      'cz.ev.modes': 'Modes',
      'cz.rc.start': 'Start',
      'cz.rc.prev': 'Back',
      'cz.rc.next': 'Next',
      'cz.rc.read': 'Read',
      'cz.rc.file': 'Example file',
      'cz.rc.step': 'Step {i} of {n}',
      'cz.rc.smallest': 'The smallest real plugin',
      'cz.rc.smallest.d': 'The `working_directory` tool in 42 lines: apply, inject, defineTool, registration — all a first plugin needs.',
      'cz.sl.lead': '{n} slots: cell kind, scope, registration options, props, who declares the slot and who already occupies it.',
      'cz.sl.filter': 'Slot key or package…',
      'cz.sl.filter.label': 'Filter slots',
      'cz.sl.risk': 'shadows shipped UI',
      'cz.sl.risk.only': 'only with replace risk',
      'cz.sl.kind': 'Kind',
      'cz.sl.scope': 'Scope',
      'cz.sl.options': 'Registration options',
      'cz.sl.ownerProps': 'Owner props',
      'cz.sl.standardProps': 'Standard hooks',
      'cz.sl.declared': 'Declared by',
      'cz.sl.occupants': 'Occupants',
      'cz.sl.example': 'Example',
      'cz.sl.pick': 'Pick a slot on the left.',
      'cz.sl.notes': 'Slot rules (from slot-catalog.ts)',
      'cz.sl.recipes': 'Client extension recipes',
      'cz.sl.tokens': 'Theme tokens: {n} --dsw-* variables',
      'cz.sl.tokens.lead': 'Use theme variables instead of literal colors — otherwise a contribution breaks in the other color scheme.',
      'cz.sl.services': 'Client services',
      'd.configure': 'Configure',
      'd.configure.lead': 'Snippets for the profile cordis.patch.yml. The generator verifies every snippet with the same engine as the sandbox.',
      'd.configure.row': 'Row',
      'd.configure.disable': 'Disable',
      'd.configure.enable': 'Enable',
      'd.configure.config': 'Change config (complete — a patch replaces the whole row config)',
      'd.configure.preset': 'A row inside the "{p}" agent preset: the patch overrides the whole preset-{p} row.',
      'd.configure.dep': 'In {p} the package loads as a dependency ({via}) — configure the row that pulls it in.',
      'd.configure.insert': 'Add a row',
      'd.configure.insert.d': 'The package is not mounted in {p}. The row below is the one profile {from} uses.',
      'd.configure.insertNew': 'No profile mounts this package; a minimal row below. Check inject — providers of those services are required.',
      'd.configure.optional': 'The package ships in an optional bundle — install the bundle into the profile:',
      'd.configure.replace': 'Replace the ctx.{s} provider',
      'd.configure.replace.d': 'Disables the active provider rows ({from}) and enables this package.',
      'd.configure.none': 'The package is not mounted by a row and declares no config.',
      'd.configure.fields': 'Config fields',
      'd.configure.settings': 'A settings form edits these fields: ',
      'd.configure.copy': 'Copy',
      'd.examples': 'Usage examples',
      'd.examples.tests': 'Tests ({n} of {t})',
      'd.examples.overlays': 'Example overlays',
      'd.examples.readme': 'Code from the README',
      'd.context': 'Copy as context',
      'd.context.done': 'Context copied',
    },
  })

  // BEGIN LAYOUT EVIDENCE
  const LAYOUT_EVIDENCE = {
  "sidebar": {
    "render": [
      "packages/client/ui-layout/src/client/AppFrame.tsx:242"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-sidebar",
        "source": "packages/client/ui-sidebar/src/client/index.ts:77"
      }
    ]
  },
  "main": {
    "render": [
      "packages/client/ui-layout/src/client/AppFrame.tsx:42"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-conversation",
        "source": "packages/client/ui-conversation/src/client/apply.ts:562"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-plugin-manager",
        "source": "packages/client/ui-plugin-manager/src/client/index.ts:115"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-schedule",
        "source": "packages/client/ui-schedule/src/client/index.ts:169"
      }
    ]
  },
  "rightbar": {
    "render": [
      "packages/client/ui-layout/src/client/AppFrame.tsx:286"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-sidebar-right",
        "source": "packages/client/ui-sidebar-right/src/client/index.ts:206"
      }
    ]
  },
  "shell.bottom": {
    "render": [
      "packages/client/ui-layout/src/client/AppFrame.tsx:290"
    ],
    "registrations": []
  },
  "shell.overlay": {
    "render": [
      "packages/client/ui-layout/src/client/AppFrame.tsx:249"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-chat",
        "source": "packages/client/ui-chat/src/client/apply.ts:306"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-plugin-manager",
        "source": "packages/client/ui-plugin-manager/src/client/index.ts:105"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-schedule",
        "source": "packages/client/ui-schedule/src/client/index.ts:113"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-settings-account",
        "source": "packages/client/ui-settings-account/src/client/index.ts:275"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-settings-account",
        "source": "packages/client/ui-settings-account/src/client/index.ts:303"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-settings-account",
        "source": "packages/client/ui-settings-account/src/client/index.ts:275"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-settings-account",
        "source": "packages/client/ui-settings-account/src/client/index.ts:303"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-settings-general",
        "source": "packages/client/ui-settings-general/src/client/index.ts:250"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-settings-session-log",
        "source": "packages/client/ui-settings-session-log/src/client/index.ts:39"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-shortcuts",
        "source": "packages/client/ui-shortcuts/src/client/index.ts:67"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-workspace",
        "source": "packages/client/ui-workspace/src/client/index.ts:331"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-workspace",
        "source": "packages/client/ui-workspace/src/client/index.ts:334"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-workspace",
        "source": "packages/client/ui-workspace/src/client/index.ts:337"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-workspace",
        "source": "packages/client/ui-workspace/src/client/index.ts:331"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-workspace",
        "source": "packages/client/ui-workspace/src/client/index.ts:334"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-workspace",
        "source": "packages/client/ui-workspace/src/client/index.ts:337"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-workspace",
        "source": "packages/client/ui-workspace/src/client/index.ts:331"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-workspace",
        "source": "packages/client/ui-workspace/src/client/index.ts:334"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-workspace",
        "source": "packages/client/ui-workspace/src/client/index.ts:337"
      }
    ]
  },
  "conversation.header": {
    "render": [
      "packages/client/ui-conversation/src/client/skeleton/ConversationMainPanel.tsx:47"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-conversation",
        "source": "packages/client/ui-conversation/src/client/apply.ts:421"
      }
    ]
  },
  "conversation.session.header.actions": {
    "render": [
      "packages/client/ui-conversation/src/client/skeleton/ConversationSession.tsx:128"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-agent-preset",
        "source": "packages/client/ui-agent-preset/src/client/index.ts:215"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-jobs",
        "source": "packages/client/ui-jobs/src/client/index.ts:38"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-subagent",
        "source": "packages/client/ui-subagent/src/client/index.ts:85"
      }
    ]
  },
  "conversation.session.header.utilities": {
    "render": [
      "packages/client/ui-conversation/src/client/skeleton/ConversationSession.tsx:132"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-open-in-app",
        "source": "packages/client/ui-open-in-app/src/client/index.ts:103"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-schedule",
        "source": "packages/client/ui-schedule/src/client/index.ts:211"
      }
    ]
  },
  "conversation.view": {
    "render": [
      "packages/client/ui-conversation/src/client/skeleton/DefaultConversationViews.tsx:36"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-chat",
        "source": "packages/client/ui-chat/src/client/apply.ts:229"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-trajectory",
        "source": "packages/client/ui-trajectory/src/client/index.ts:80"
      }
    ]
  },
  "conversation.composer.bar": {
    "render": [
      "packages/client/ui-conversation/src/client/skeleton/ConversationContent.tsx:147"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-conversation",
        "source": "packages/client/ui-conversation/src/client/apply.ts:449"
      }
    ]
  },
  "conversation.input.overlay": {
    "render": [
      "packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:404"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-commands",
        "source": "packages/client/ui-commands/src/client/index.ts:65"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-input-trigger",
        "source": "packages/client/ui-input-trigger/src/client/index.ts:66"
      },
      {
        "pkg": "@deepseek-ai/dsh-client-ui-message-feedback",
        "source": "packages/client/ui-message-feedback/src/client/index.ts:116"
      }
    ]
  },
  "conversation.input.attachments": {
    "render": [
      "packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:407"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-attachment",
        "source": "packages/client/ui-attachment/src/client/index.ts:23"
      }
    ]
  },
  "conversation.input.permission": {
    "render": [
      "packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:464"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-permission-presets",
        "source": "packages/client/ui-permission-presets/src/client/index.ts:168"
      }
    ]
  },
  "conversation.input.plan": {
    "render": [
      "packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:465"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-plan",
        "source": "packages/client/ui-plan/src/client/index.ts:117"
      }
    ]
  },
  "conversation.input.left": {
    "render": [
      "packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:469"
    ],
    "registrations": []
  },
  "conversation.input.right": {
    "render": [
      "packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:475"
    ],
    "registrations": []
  },
  "conversation.input.model": {
    "render": [
      "packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:476"
    ],
    "registrations": [
      {
        "pkg": "@deepseek-ai/dsh-client-ui-model-selection",
        "source": "packages/client/ui-model-selection/src/client/index.ts:173"
      }
    ]
  }
}
  // END LAYOUT EVIDENCE
  const TABS = ['catalog', 'sandbox', 'config', 'events', 'recipes', 'slots', 'layouts']
  const GLYPH = { on: '●', cond: '◐', off: '○', dep: '◌' }
  const LEVEL_BADGE = { error: 'danger', warn: 'warn', info: 'accent' }

  // ── shared helpers ────────────────────────────────────────────────────
  let engine = null
  /** The patch engine (assets/js/patch.js over vendored js-yaml), or null. */
  function patchEngine() {
    if (!engine && window.DSHPatch && window.jsyaml) engine = DSHPatch.create(window.jsyaml)
    return engine
  }
  /** npm spec → workspace package id (a subpath export resolves to its package). */
  function resolveSpec(spec) {
    const M = DSHMap.model
    if (!spec || spec.startsWith('cordis:')) return null
    if (M.pkgById.has(spec)) return spec
    const parts = spec.split('/')
    const base = spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
    return M.pkgById.has(base) ? base : null
  }
  /** UTF-8 text ⇄ URL-safe base64 for the sandbox state in the URL. */
  function encode(text) {
    try { return btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') } catch { return '' }
  }
  function decode(s) {
    try { return decodeURIComponent(escape(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')))) } catch { return null }
  }
  function openSandbox(profile, text) { DSHMap.router.go('customize', { tab: 'sandbox', profile, p: encode(text) }) }
  /** Run a patch over a profile's effective rows. */
  function runPatch(profile, text) {
    const P = patchEngine()
    const prof = DSHMap.model.profileByName.get(profile)
    if (!P || !prof) return null
    return P.run(prof.rows, text, { resolve: resolveSpec, required: DSHMap.model.customize?.required ?? [] })
  }
  /** Move `.on` inside a ui.tabs strip without rebuilding it (keeps focus). */
  function markSeg(seg, ids, id) {
    for (const [i, b] of [...seg.children].entries()) b.classList.toggle('on', ids[i] === id)
  }
  function issueText(i) {
    return t(`cz.issue.${i.code}`, { id: i.id ?? '', d: i.detail ?? '' })
  }
  /** Kept for detail.js / services.js: the shared copy button with a label. */
  function copyButton(getText, label, doneLabel) {
    return DSHMap.ui.copyButton(getText, { label, done: doneLabel })
  }
  const md = text => DSHMap.ui.mdInline(text)
  /** Inline Markdown with **bold** and `code`. */
  function mdRich(text) {
    const out = []
    String(text ?? '').split(/(\*\*[^*]+\*\*)/).forEach(part => out.push(part.startsWith('**') ? h('b', null, md(part.slice(2, -2))) : md(part)))
    return h('span', null, out)
  }
  function codeBlock(text, lang, extra) {
    const box = DSHMap.ui.codeCopy(text, lang)
    if (extra) box.appendChild(extra)
    return box
  }

  // ── view ──────────────────────────────────────────────────────────────
  DSHMap.views.customize = {
    scroll: true,
    init(el) {
      this.layout = DSHMap.ui.layout.narrative(el, { className: 'customize-page' })
      this.root = this.layout.root
      this.el = el
      this.panes = DSHMap.ui.panes(this.layout.body, this, ['filter', 'slotDetail'])
      // Filter text and slot kind live in the route (cfg / q / kind); these toggles stay per session.
      this.state = { cfgVolatile: false, cfgSecret: false, cfgMounted: false, slRisk: false, skillKind: 'all' }
    },
    tab(params) { return TABS.includes(params.tab) ? params.tab : 'catalog' },
    show(params) { this.render(params) },
    update(params, prev) {
      const tab = this.tab(params)
      if (tab !== this.tab(prev) || params.profile !== prev.profile) { this.render(params); return }
      if (tab === 'layouts') { this.render(params); return }
      if (tab === 'sandbox') return // the editor owns `p`; re-rendering would steal focus
      if (tab === 'recipes' && (params.track !== prev.track || params.step !== prev.step)) { this.render(params); return }
      // Back/Forward over a filter: take it from the route.
      if (this.filter?.sync(params)) this.filter.redraw()
      if (tab === 'slots' && params.slot !== prev.slot) { this.renderSlotDetail(params.slot); this.markSlot(params.slot); return }
      this.select(params)
    },
    render(params) {
      const ui = DSHMap.ui
      const tab = this.tab(params)
      this.layout.head({
        title: t('nav.customize'),
        tabs: ui.tabs(TABS.map(id => [id, t(`cz.tab.${id}`)]), tab, id => DSHMap.router.go('customize', { tab: id }), t('nav.customize')),
      })
      if (!DSHMap.model.customize) { clear(this.layout.body).appendChild(ui.emptyState({ icon: 'info', text: t('search.empty') })); return }
      // Tabs seen before come back from the pane cache with their filters (4.5).
      // The sandbox editor owns its route key `p`: it always starts from the route.
      const key = `${tab}|${params.profile ?? ''}|${tab === 'recipes' ? `${params.track ?? ''}|${params.step ?? ''}` : ''}`
      if (tab === 'sandbox' || tab === 'layouts') this.panes.drop(key)
      const { fresh } = this.panes.show(key, body => this[`render_${tab}`](body, params), this.el)
      if (!fresh) {
        if (this.filter?.sync(params)) this.filter.redraw()
        if (tab === 'slots') { this.renderSlotDetail(params.slot); this.markSlot(params.slot) }
      }
      setTimeout(() => this.select(params), 120)
    },
    select(params) {
      const ui = DSHMap.ui
      for (const el of this.root.querySelectorAll('[data-card].is-selected')) ui.select(el, false)
      const id = params.x ?? params.ev ?? params.cfg ?? null
      if (!id) return
      const el = this.root.querySelector(`[data-card="${CSS.escape(id)}"]`)
      if (el) { ui.select(el, true); el.scrollIntoView({ block: 'center', behavior: DSHMap.a11y?.reducedMotion?.() ? 'auto' : 'smooth' }) }
    },
    profileOf(params) {
      const M = DSHMap.model
      return M.profileByName.has(params.profile) ? params.profile : M.defaultProfile
    },
    profileSeg(current, onPick) {
      return DSHMap.ui.tabs(DSHMap.model.profileOrder.map(n => [n, n]), current, onPick, t('cz.sb.profile'))
    },
    /**
     * Filter bar of a tab (text in route key `key`, optional chips in `kind`);
     * `draw` re-filters. Kept on the view so update() can sync it.
     */
    filterBar(params, opts, draw) {
      const bar = DSHMap.ui.filterBar({ ...opts, onChange: draw })
      bar.redraw = draw
      bar.sync(params)
      this.filter = bar
      return bar
    },

    // ── 3.1 extension catalog ───────────────────────────────────────────
    render_catalog(body) {
      const M = DSHMap.model
      const C = M.customize
      const ui = DSHMap.ui
      body.appendChild(ui.glossarize(h('p', { class: 'thesis callout' }, mdRich(i18n.pick(C.lead)))))

      // layers
      body.appendChild(h('h2', { class: 'section-title' }, t('cz.layers')))
      body.appendChild(layersBlock(C.layers))

      // quick patches
      body.appendChild(h('h2', { class: 'section-title' }, t('cz.quick'), h('span', { class: 'hint' }, t('cz.quick.lead'))))
      body.appendChild(h('div', { class: 'usage-grid' }, C.quickPatches.map(q => h('div', { class: 'card cz-card', 'data-card': q.id },
        h('div', { class: 'cz-head top' }, h('h3', null, i18n.pick(q.title)), h('button', { class: 'chip link mono', onclick: () => DSHMap.nav.openProfile(q.profile) }, q.profile)),
        ui.glossarize(h('p', { class: 'small muted' }, md(i18n.pick(q.text)))),
        codeBlock(q.patch, 'yaml'),
        h('div', { class: 'row wrap' }, h('button', { class: 'btn small', onclick: () => openSandbox(q.profile, q.patch) }, svgIcon('play'), t('cz.trySandbox'))),
        ui.refChips(q.refs)))))

      // no-code track
      const nocode = C.extensions.filter(x => x.track === 'nocode')
      body.appendChild(h('h2', { class: 'section-title' }, t('cz.nocode'), h('span', { class: 'count' }, ` ${nocode.length}`)))
      body.appendChild(h('div', { class: 'cap-grid cz-nocode' }, nocode.map(x => h('div', { class: 'card cap-card', 'data-card': x.id },
        h('h3', null, i18n.pick(x.title)),
        ui.gtext('p', { class: 'small muted' }, i18n.pick(x.what)),
        h('div', { class: 'enable-row' }, h('span', { class: 'badge' }, t('cz.col.where')), h('span', { class: 'small' }, i18n.pick(x.where))),
        x.how ? codeBlock(x.how, x.lang ?? 'yaml') : null,
        ui.refChips(x.refs)))))

      // code track (appendix B)
      const code = C.extensions.filter(x => x.track === 'code')
      body.appendChild(h('h2', { class: 'section-title' }, t('cz.code'), h('span', { class: 'count' }, ` ${code.length}`)))
      body.appendChild(ui.table({
        card: true, sortable: false, className: 'cz-table', label: t('cz.code'),
        row: x => ({ 'data-card': x.id }),
        rows: code,
        columns: [
          { key: 'point', label: t('cz.col.point'), cell: x => h('b', null, i18n.pick(x.title)) },
          { key: 'write', label: t('cz.col.write'), className: 'small', cell: x => i18n.pick(x.what) },
          { key: 'where', label: t('cz.col.where'), className: 'small', cell: x => i18n.pick(x.where) },
          { key: 'examples', label: t('cz.col.examples'), cell: x => ui.refChips(x.refs) },
        ],
      }))

      // upstream tables
      body.appendChild(h('h2', { class: 'section-title' }, t('cz.upstream.where'), h('span', { class: 'hint' }, h('button', { class: 'link-btn', onclick: () => DSHMap.nav.openDoc('docs/architecture.md') }, 'docs/architecture.md'))))
      body.appendChild(h('p', { class: 'muted small' }, t('cz.upstream.lead')))
      body.appendChild(upstreamTable(C.upstream.where, 'goal'))
      body.appendChild(h('details', { class: 'fold cz-fold' },
        h('summary', null, t('cz.upstream.features'), h('span', { class: 'count' }, ` ${C.upstream.features.length}`)),
        h('div', { class: 'fold-body' }, upstreamTable(C.upstream.features, 'feature'))))

      // skills
      body.appendChild(h('h2', { class: 'section-title' }, t('cz.skills', { n: C.skills.length }), h('span', { class: 'hint' }, t('cz.skills.lead'))))
      const skillBox = h('div', { class: 'stack' })
      const kinds = ['all', 'shipped', 'contributor']
      const skills = () => C.skills.filter(s => this.state.skillKind === 'all' || s.kind === this.state.skillKind)
      const skillTable = ui.table({
        card: true, head: false, label: t('cz.skills', { n: C.skills.length }),
        row: s => ({ 'data-card': `skill:${s.name}` }),
        rows: skills(),
        columns: [
          { key: 'name', className: 'mono nowrap', cell: s => h('button', { class: 'link-btn', onclick: () => DSHMap.nav.openFile(s.file) }, h('b', null, s.name)) },
          { key: 'kind', cell: s => h('span', { class: ['badge', s.kind === 'shipped' ? 'accent' : null] }, t(`cz.skill.${s.kind}`)) },
          { key: 'description', className: 'small', cell: s => util.firstSentence(s.description ?? '', 220) },
          { key: 'pkg', cell: s => (s.pkg ? ui.pkgChip(s.pkg) : null) },
        ],
      })
      const kindTabs = ui.tabs(kinds.map(k => [k, k === 'all' ? t('all') : t(`cz.skill.${k}`)]), this.state.skillKind, k => {
        this.state.skillKind = k
        markSeg(kindTabs, kinds, k)
        skillTable.update(skills())
      })
      skillBox.append(kindTabs, skillTable)
      body.appendChild(skillBox)

      // publishing path
      body.appendChild(h('h2', { class: 'section-title' }, t('cz.publish')))
      body.appendChild(h('div', { class: 'usage-grid' }, C.publish.map(s => h('div', { class: 'card' },
        h('h3', null, i18n.pick(s.title)),
        h('p', { class: 'small muted' }, md(i18n.pick(s.text))),
        s.code ? codeBlock(s.code, s.lang ?? 'bash') : null,
        ui.refChips(s.refs)))))
    },

    // ── 3.3 patch sandbox ───────────────────────────────────────────────
    render_sandbox(body, params) {
      const M = DSHMap.model
      const C = M.customize
      const profile = M.profileByName.has(params.profile) ? params.profile : (C.sandbox.exampleProfile ?? M.defaultProfile)
      const initial = params.p ? decode(params.p) ?? '' : C.sandbox.example
      body.appendChild(h('p', { class: 'muted' }, md(i18n.pick(C.sandbox.lead))))
      const area = h('textarea', { class: 'input cz-editor', spellcheck: 'false', placeholder: t('cz.sb.placeholder'), 'aria-label': t('cz.sb.editor') })
      area.value = initial
      const out = h('div', { class: 'cz-result' })
      const shareBtn = copyButton(() => location.href, t('cz.sb.share'), t('cz.sb.shared'))
      body.append(
        h('div', { class: 'cz-toolbar' },
          h('span', { class: 'faint small' }, `${t('cz.sb.profile')}:`),
          this.profileSeg(profile, n => DSHMap.router.go('customize', { tab: 'sandbox', profile: n, p: encode(area.value) })),
          h('span', { class: 'faint small' }, t('cz.sb.rows', { n: patchEngine() ? patchEngine().flatIndex(M.profileByName.get(profile).rows).size : '—' })),
          h('span', { class: 'grow' }),
          h('button', { class: 'btn small', onclick: () => { area.value = C.sandbox.example; run() } }, t('cz.sb.example')),
          h('button', { class: 'btn small', onclick: () => { area.value = ''; run() } }, t('cz.sb.clear')),
          shareBtn),
        h('div', { class: 'cz-sandbox' }, h('div', { class: 'cz-edit-col' }, area, sandboxAside(C)), out))
      const run = () => {
        DSHMap.router.setParams({ p: area.value.trim() ? encode(area.value) : null }, { replace: true })
        renderResult(out, profile, area.value)
      }
      area.addEventListener('input', util.debounce(run, 250))
      area.addEventListener('keydown', e => {
        if (e.key === 'Tab') { e.preventDefault(); const s = area.selectionStart; area.setRangeText('  ', s, area.selectionEnd, 'end'); run() }
      })
      if (!patchEngine()) out.appendChild(h('div', { class: 'callout warn' }, svgIcon('info'), 'js-yaml is not loaded'))
      else renderResult(out, profile, area.value)
    },

    // ── 3.4 config reference ────────────────────────────────────────────
    render_config(body, params) {
      const M = DSHMap.model
      const C = M.customize
      const ui = DSHMap.ui
      const profile = this.profileOf(params)
      const pkgs = M.packages.filter(p => p.config?.fields?.length).sort((a, b) => a.short.localeCompare(b.short))
      body.appendChild(h('p', { class: 'muted' }, t('cz.cfg.lead', { p: pkgs.length, f: pkgs.reduce((a, p) => a + p.config.fields.length, 0) })))
      const schemaFile = 'apps/cli/tests/expected/dump-config-schema.json'
      body.appendChild(h('div', { class: 'callout tip' }, svgIcon('info'), h('span', null, md(t('cz.cfg.schema')), ' ', h('button', { class: 'link-btn mono small', onclick: () => DSHMap.nav.openFile(schemaFile) }, schemaFile))))
      const toggles = ['cfgVolatile', 'cfgSecret', 'cfgMounted']
      const toggle = (key, label) => h('label', { class: 'check small' }, h('input', { type: 'checkbox', 'data-key': key, checked: this.state[key] ? true : null, onchange: e => { this.state[key] = e.target.checked; draw() } }), ` ${label}`)
      const count = h('span', { class: 'faint small' })
      const list = h('div', { class: 'stack cz-list' })
      const reset = () => {
        for (const k of toggles) this.state[k] = false
        for (const box of body.querySelectorAll('input[data-key]')) box.checked = false
        bar.reset()
      }
      // `cfg` is the filter and the deep link (nav.openConfigKey) at once.
      const bar = this.filterBar(params, {
        key: 'cfg', placeholder: t('cz.cfg.filter'), label: t('cz.cfg.filter.label'),
        extra: h('div', { class: 'row wrap cz-checks' }, toggle('cfgVolatile', t('cz.cfg.onlyVolatile')), toggle('cfgSecret', t('cz.cfg.onlySecret')), toggle('cfgMounted', t('cz.cfg.onlyMounted', { p: profile }))),
      }, () => draw())
      body.append(h('div', { class: 'cz-toolbar' }, bar.el, this.profileSeg(profile, n => DSHMap.router.setParams({ profile: n })), count), list)
      const P = patchEngine()
      const rowsIn = id => (P ? P.rowsOf(M.profileByName.get(profile).rows, id) : [])
      const draw = () => {
        const q = bar.query()
        clear(list)
        let shown = 0
        for (const p of pkgs) {
          const rows = rowsIn(p.id)
          if (this.state.cfgMounted && !rows.some(r => r.state !== 'off')) continue
          let fields = p.config.fields
          if (this.state.cfgVolatile) fields = fields.filter(f => f.volatile)
          if (this.state.cfgSecret) fields = fields.filter(f => f.secret)
          if (q) {
            const pkgHit = `${p.short} ${p.id}`.toLowerCase().includes(q)
            if (!pkgHit) fields = fields.filter(f => `${f.name} ${f.type} ${f.doc ?? ''}`.toLowerCase().includes(q))
          }
          if (!fields.length) continue
          shown++
          const forms = [...new Set(rows.flatMap(r => C.settingsForms[r.row.id] ?? []))]
          list.appendChild(h('div', { class: 'card cz-cfg', 'data-card': p.id },
            h('div', { class: 'row wrap cz-cfg-head' },
              ui.pkgChip(p.id),
              rows.length ? h('span', { class: 'chips' }, rows.map(r => h('span', { class: 'chip mono', title: r.path.concat(r.row.id).join(' › ') }, GLYPH[r.state] ?? '○', ' ', r.preset ? `${r.preset}/` : '', r.row.id))) : h('span', { class: 'faint small' }, '—'),
              p.config.inject?.length ? h('span', { class: 'faint small' }, `${t('cz.cfg.inject')}: ${p.config.inject.map(k => `ctx.${k}`).join(', ')}`) : null,
              forms.length ? h('span', { class: 'row cz-tight' }, h('span', { class: 'faint small' }, `${t('cz.cfg.settings')}:`), forms.map(id => ui.pkgChip(id))) : null,
              h('span', { class: 'grow' }),
              h('button', { class: 'btn small', onclick: () => DSHMap.nav.openPackage(p.id) }, svgIcon('key'), t('cz.cfg.configure')),
              p.config.source ? h('button', { class: 'link-btn tiny mono', onclick: () => DSHMap.nav.openFile(p.config.source) }, p.config.source.split('/').slice(-2).join('/')) : null),
            fieldsTable(fields, p.short)))
        }
        count.textContent = t('cz.cfg.shown', { n: shown })
        if (!list.children.length) list.appendChild(ui.noMatches(reset))
      }
      draw()
    },

    // ── 3.5 intercepting events ─────────────────────────────────────────
    render_events(body, params) {
      const M = DSHMap.model
      const E = M.customize.events
      const ui = DSHMap.ui
      const profile = this.profileOf(params)
      body.appendChild(h('div', { class: 'callout' }, svgIcon('info'), md(i18n.pick(E.lead))))
      body.appendChild(h('div', { class: 'two-col usage-two' },
        h('div', { class: 'card' }, h('h3', null, t('cz.ev.modes')), h('dl', { class: 'kv small' }, Object.entries(E.modes).flatMap(([k, v]) => [h('dt', { class: 'mono' }, k), h('dd', null, md(i18n.pick(v)))]))),
        h('div', { class: 'card' }, h('h3', null, t('cz.ev.example')), E.example ? codeBlock(E.example, 'typescript') : null, ui.refChips(E.refs))))
      const list = h('div', { class: 'stack cz-list' })
      const bar = this.filterBar(params, { key: 'q', placeholder: t('cz.ev.filter'), label: t('cz.ev.filter.label') }, () => draw())
      body.append(h('div', { class: 'cz-toolbar spaced' },
        bar.el,
        h('span', { class: 'faint small' }, `${t('cz.ev.profile')}:`),
        this.profileSeg(profile, n => DSHMap.router.setParams({ profile: n }))), list)
      const order = rowOrder(profile)
      const evs = M.events.filter(e => ['waterfall', 'serial', 'bail'].includes(e.mode)).sort((a, b) => a.name.localeCompare(b.name))
      const draw = () => {
        const q = bar.query()
        clear(list)
        for (const e of evs) {
          if (q && !`${e.name} ${e.description ?? ''}`.toLowerCase().includes(q)) continue
          list.appendChild(eventCard(e, profile, order))
        }
        if (!list.children.length) list.appendChild(ui.noMatches(() => bar.reset()))
      }
      draw()
    },

    // ── 3.6 recipes ─────────────────────────────────────────────────────
    render_recipes(body, params) {
      const C = DSHMap.model.customize
      const small = 'packages/session/tool-working-directory/src/index.ts'
      body.appendChild(h('div', { class: 'callout tip' }, svgIcon('info'), h('span', null, h('b', null, t('cz.rc.smallest')), ' — ', md(t('cz.rc.smallest.d')), ' ', h('button', { class: 'link-btn mono small', onclick: () => DSHMap.nav.openFile(small) }, small))))
      const active = C.tracks.find(tr => tr.id === params.track) ?? null
      const stepIdx = active ? Math.max(0, Math.min(active.steps.length - 1, Number(params.step ?? 0) || 0)) : -1
      body.appendChild(h('div', { class: 'two-col usage-two' }, C.tracks.map(tr => h('div', { class: ['card', 'cz-track', tr === active ? 'is-selected' : null], ...DSHMap.ui.selAttrs(tr === active) },
        h('div', { class: 'cz-head' }, h('h3', null, i18n.pick(tr.title)),
          h('button', { class: 'btn small primary', onclick: () => go(tr.id, 0) }, svgIcon('play'), t('cz.rc.start'))),
        h('p', { class: 'small muted' }, i18n.pick(tr.blurb)),
        h('ol', { class: 'cz-steps' }, tr.steps.map((s, i) => h('li', { class: tr === active && i === stepIdx ? 'is-selected' : null },
          h('button', { 'aria-current': tr === active && i === stepIdx ? 'step' : null, onclick: () => go(tr.id, i) }, h('b', null, i18n.pick(s.title)), h('span', { class: 'faint small' }, ` — ${i18n.pick(s.text)}`)))))))))
      if (active) {
        const s = active.steps[stepIdx]
        const docId = s.doc ?? s.docFile
        body.appendChild(h('div', { class: 'card cz-stepper' },
          h('div', { class: 'cz-head' },
            h('span', { class: 'badge accent' }, t('cz.rc.step', { i: stepIdx + 1, n: active.steps.length })),
            h('h3', null, i18n.pick(s.title)),
            h('button', { class: 'btn small', disabled: stepIdx === 0 ? true : null, onclick: () => go(active.id, stepIdx - 1) }, svgIcon('back'), t('cz.rc.prev')),
            h('button', { class: 'btn small primary', disabled: stepIdx === active.steps.length - 1 ? true : null, onclick: () => go(active.id, stepIdx + 1) }, t('cz.rc.next'), svgIcon('next'))),
          h('p', { class: 'small' }, md(i18n.pick(s.text))),
          h('div', { class: 'row wrap' },
            docId ? h('button', { class: 'btn small', onclick: () => (s.doc ? DSHMap.nav.openDoc(s.doc) : DSHMap.nav.openFile(s.docFile)) }, svgIcon('book'), t('cz.rc.read'), h('span', { class: 'faint mono tiny' }, ` ${docId.split('/').pop()}`)) : null,
            s.file ? h('button', { class: 'btn small', onclick: () => DSHMap.nav.openFile(s.file) }, svgIcon('code'), t('cz.rc.file'), h('span', { class: 'faint mono tiny' }, ` ${s.file.split('/').slice(-2).join('/')}`)) : null)))
        // The step's example file opens in the viewer (it overlays the page).
        if (s.file && params.open !== '0') setTimeout(() => DSHMap.nav.openFile(s.file), 60)
      }
      function go(track, step) { DSHMap.router.go('customize', { tab: 'recipes', track, step }) }
    },

    // ── 3.7 client UI slots ─────────────────────────────────────────────
    render_slots(body, params) {
      const M = DSHMap.model
      const C = M.customize.client
      const ui = DSHMap.ui
      body.appendChild(ui.glossarize(h('p', { class: 'callout' }, md(i18n.pick(C.lead)))))
      body.appendChild(h('div', { class: 'callout tip' }, svgIcon('layers'), h('div', null, md(i18n.pick(C.layering)), ui.refChips(C.layeringRefs))))

      body.appendChild(h('h2', { class: 'section-title' }, t('cz.sl.recipes')))
      body.appendChild(h('div', { class: 'usage-grid' }, C.recipes.map(r => h('div', { class: 'card cz-card', 'data-card': r.id },
        h('h3', null, i18n.pick(r.title)),
        h('p', { class: 'small muted' }, md(i18n.pick(r.text))),
        r.slots.length ? h('div', { class: 'chips' }, r.slots.map(k => h('button', { class: 'chip link mono', onclick: () => DSHMap.router.setParams({ slot: k }) }, svgIcon('grid'), k))) : null,
        r.services.length ? h('div', { class: 'chips' }, r.services.map(k => ui.svcChip(k))) : null,
        ui.refChips(r.refs)))))

      body.appendChild(h('h2', { class: 'section-title' }, t('type.slot'), h('span', { class: 'hint' }, t('cz.sl.lead', { n: M.slots.length }))))
      // Kind chips live in route key `kind` (none = all kinds); the risk toggle stays per session.
      const kinds = ['single', 'list', 'keyed', 'chain']
      const risk = h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: this.state.slRisk ? true : null, onchange: e => { this.state.slRisk = e.target.checked; draw() } }), ` ${t('cz.sl.risk.only')}`)
      const listEl = h('div', { class: 'cz-slot-list' })
      const bar = this.filterBar(params, {
        key: 'q', chipKey: 'kind', placeholder: t('cz.sl.filter'), label: t('cz.sl.filter.label'), chipsLabel: t('cz.sl.kind'),
        chips: kinds.map(k => ({ id: k, label: k, count: M.slots.filter(s => s.kind === k).length })),
        extra: risk,
      }, () => draw())
      this.slotDetail = h('div', { class: 'cz-slot-detail card' })
      body.append(h('div', { class: 'cz-toolbar' }, bar.el), h('div', { class: 'cz-slots' }, listEl, this.slotDetail))
      const draw = () => {
        const q = bar.query()
        const kind = bar.chip()
        clear(listEl)
        for (const s of M.slots) {
          if (kind && s.kind !== kind) continue
          if (this.state.slRisk && s.replaceRisk === 'none') continue
          if (q && !`${s.key} ${s.summary ?? ''} ${s.declaredBy ?? ''} ${s.occupants.map(o => o.text).join(' ')}`.toLowerCase().includes(q)) continue
          const on = s.key === DSHMap.router.params.slot
          listEl.appendChild(h('button', { class: ['cz-slot', on ? 'is-selected' : null], ...ui.selAttrs(on), 'data-slot': s.key, onclick: () => DSHMap.router.setParams({ slot: s.key }) },
            h('div', { class: 'row' }, h('span', { class: 'mono small cz-slot-key' }, s.key), h('span', { class: 'grow' }),
              h('span', { class: 'badge' }, s.kind), s.replaceRisk !== 'none' ? h('span', { class: 'badge warn', title: t('cz.sl.risk') }, '!') : null),
            h('div', { class: 'faint tiny truncate' }, s.summary ?? '')))
        }
        if (!listEl.children.length) {
          listEl.appendChild(ui.noMatches(() => {
            this.state.slRisk = false
            risk.querySelector('input').checked = false
            bar.reset()
          }))
        }
      }
      draw()
      this.renderSlotDetail(params.slot)

      // rules and theme tokens
      body.appendChild(h('h2', { class: 'section-title' }, t('cz.sl.notes')))
      body.appendChild(h('div', { class: 'card' }, h('ul', { class: 'cz-notes small' }, M.data.slotNotes.map(n => h('li', null, md(n))))))
      body.appendChild(h('h2', { class: 'section-title' }, t('cz.sl.tokens', { n: C.tokens.total }), h('span', { class: 'hint' }, t('cz.sl.tokens.lead'))))
      body.appendChild(ui.table({
        card: true, head: false, label: t('cz.sl.tokens', { n: C.tokens.total }),
        rows: C.tokens.groups,
        columns: [
          { key: 'prefix', className: 'mono nowrap', cell: g => h('b', null, g.prefix) },
          { key: 'count', num: true },
          { key: 'sample', cell: g => h('div', { class: 'chips' }, g.sample.map(x => h('span', { class: 'chip mono' }, x))) },
        ],
      }))
      body.appendChild(h('div', { class: 'chips cz-after' }, C.tokens.files.map(f => h('button', { class: 'chip link mono', onclick: () => DSHMap.nav.openFile(f) }, svgIcon('file'), f.split('/').pop()))))
      body.appendChild(h('h2', { class: 'section-title' }, t('cz.sl.services')))
      body.appendChild(h('div', { class: 'chips' }, M.clientServices.map(s => ui.svcChip(s.key))))
    },
    render_layouts(body, params) {
      const pick = (uk, en) => i18n.pick({ uk, en })
      const ui = DSHMap.ui
      const screen = ['shell', 'conversation', 'composer'].includes(params.screen) ? params.screen : 'shell'
      const observed = screen === 'composer' && params.layoutState !== 'catalog' && (!params.slot || ['conversation.input.permission', 'conversation.input.model'].includes(params.slot))
      const technical = params.mode !== 'interface'
      const mounted = new Map()
      const collect = (rows, inherited = 'on') => {
        for (const row of rows) {
          const state = inherited === 'off' || row.state === 'off' ? 'off' : inherited === 'cond' || row.state === 'cond' ? 'cond' : row.state
          if (row.pkg) {
            const old = mounted.get(row.pkg)
            if (!old || state === 'on' || (state === 'cond' && old.state !== 'on')) mounted.set(row.pkg, { state, id: row.id, expr: row.expr })
          }
          collect(row.children ?? [], state)
        }
      }
      collect(DSHMap.model.profileByName.get('web')?.rows ?? [])
      const status = pkg => {
        const state = mounted.get(pkg)?.state
        return state === 'on' ? pick('включено у web', 'enabled in web') : state === 'off' ? pick('вимкнено у web', 'disabled in web') : state === 'cond' ? pick('умовно у web', 'conditional in web') : pick('немає прямого рядка web', 'no direct web entry')
      }
      const conditions = {
        'main': ['Ключ визначається активною панеллю; для розмови — conversation.', 'Key follows the active panel; conversation for this screen.'],
        'rightbar': ['Вміст отримує width, viewportWidth і canShow; видимість залежить від стану правої колонки.', 'Content receives width, viewportWidth and canShow; visibility follows right-column state.'],
        'conversation.view': ['Порожня сесія у фазі blank не рендерить view. Вибирається лише активний viewId.', 'A blank session in the blank phase renders no view. Only the active viewId is selected.'],
        'conversation.session.header.actions': ['Рендериться лише коли hideChrome = false.', 'Rendered only when hideChrome is false.'],
        'conversation.session.header.utilities': ['Рендериться лише коли hideChrome = false.', 'Rendered only when hideChrome is false.'],
        'conversation.input.model': ['Потрібен sessionId. Контрол приховано, коли activity = true.', 'Requires sessionId. Hidden while activity is true.'],
        'conversation.input.permission': ['Рендериться лише за наявності sessionId; locked передається компоненту.', 'Requires sessionId; locked is passed to the component.'],
        'conversation.input.plan': ['Рендериться лише за наявності sessionId; locked передається компоненту.', 'Requires sessionId; locked is passed to the component.'],
        'conversation.input.left': ['Потрібні input і sessionId.', 'Requires input and sessionId.'],
        'conversation.input.right': ['Потрібні input і sessionId; приховано під час activity.', 'Requires input and sessionId; hidden during activity.']
      }

      const regions = {
        shell: [
          ['sidebar', 'Бічна панель', 'Sidebar', 'side'],
          ['main', 'Активна панель · розмова', 'Active panel · conversation', 'main'],
          ['rightbar', 'Права панель', 'Right panel', 'right'],
          ['shell.bottom', 'Нижня смуга', 'Bottom bar', 'bottom'],
          ['shell.overlay', 'Накладки та сповіщення', 'Overlays and notifications', 'overlay']],
        conversation: [
          ['conversation.header', 'Заголовок розмови', 'Conversation header', 'header'],
          ['conversation.session.header.actions', 'Дії сесії', 'Session actions', 'actions'],
          ['conversation.session.header.utilities', 'Додаткові дії', 'Utilities', 'utilities'],
          ['conversation.view', 'Область розмови', 'Conversation view', 'flow'],
          ['conversation.composer.bar', 'Поле вводу повідомлення', 'Message composer', 'composer']],
        composer: [
          ['conversation.input.overlay', 'Накладка над полем вводу', 'Composer overlay', 'overlay'],
          ['conversation.input.attachments', 'Прикріплені файли', 'Attachments', 'attachments'],
          ['conversation.input.permission', 'Дозволи', 'Permissions', 'permission'],
          ['conversation.input.plan', 'План', 'Plan', 'plan'],
          ['conversation.input.left', 'Ліві дії', 'Left actions', 'left'],
          ['conversation.input.right', 'Праві дії', 'Right actions', 'right'],
          ['conversation.input.model', 'Вибір моделі', 'Model selector', 'model']]
      }
      const all = Object.entries(regions).flatMap(([screen, rows]) => rows.map(row => ({ screen, row })))
      const go = changes => DSHMap.router.go('customize', { tab: 'layouts', screen, mode: params.mode, slot: params.slot, layoutState: params.layoutState, ...changes })
      body.appendChild(h('p', { class: 'callout' }, pick('Анатомія Web UI. Натисніть область, щоб побачити її контракт, зареєстровані компоненти та код.', 'Web UI anatomy. Select a region to inspect its contract, registered components and source.')))
      body.appendChild(h('div', { class: 'callout' }, pick('Профіль: web · Схеми областей інтерфейсу. Наповнення — з каталогу реєстрацій; статус — з ефективної композиції. Це статичний аналіз, а не знімок запущеного DSH.', 'Profile: web · Interface region schematics. Occupants come from the registration catalog; status comes from effective composition. This is static analysis, not a running DSH snapshot.')))
      const search = h('input', { type: 'search', class: 'input', placeholder: pick('Знайти слот на макеті…', 'Find a slot in the layout…'), 'aria-label': pick('Пошук слотів', 'Search slots') })
      const results = h('div', { class: 'chips' })
      search.addEventListener('input', () => {
        clear(results)
        const q = search.value.trim().toLowerCase()
        if (!q) return
        const matches = all.filter(x => x.row.join(' ').toLowerCase().includes(q))
        for (const x of matches) results.appendChild(h('button', { class: 'chip link mono', onclick: () => go({ screen: x.screen, slot: x.row[0], layoutState: 'catalog' }) }, x.row[0]))
        if (!matches.length) results.appendChild(h('span', { class: 'muted small' }, pick('На цих макетах немає відповідності. Повний перелік — у вкладці UI-слоти.', 'No match in these layouts. See UI slots for the full catalog.')))
      })
      body.append(h('div', { class: 'wl-toolbar' },
        ui.tabs([['shell', pick('Вікно', 'Window')], ['conversation', pick('Розмова', 'Conversation')], ['composer', pick('Поле вводу', 'Composer')]], screen, id => go({ screen: id, slot: null }), 'Web UI'),
        h('button', { class: 'chip link', 'aria-pressed': String(technical), onclick: () => go({ mode: technical ? 'interface' : 'slots' }) }, technical ? pick('◉ Точки розширення', '◉ Extension points') : pick('◉ Інтерфейс', '◉ Interface')), search), results)
      if (screen === 'composer') body.appendChild(ui.tabs([['observed', pick('Перевірений стан: нова сесія', 'Observed: new session')], ['catalog', pick('Усі точки розширення', 'All extension points')]], observed ? 'observed' : 'catalog', id => go({ layoutState: id, slot: null }), pick('Стан composer', 'Composer state')))
      const canvas = h('div', { class: `wl-canvas wl-${screen}${observed ? ' wl-observed' : ''}` })
      for (const [key, uk, en, area] of regions[screen]) {
        const slot = DSHMap.model.slotByKey.get(key)
        if (!slot || (observed && !['conversation.input.permission', 'conversation.input.model'].includes(key))) continue
        canvas.appendChild(h('button', { 'data-area': area, class: ['wl-region', params.slot === key ? 'is-selected' : null], style: `grid-area: ${area}`, 'aria-pressed': String(params.slot === key), onclick: () => go({ slot: key }) },
          h('span', { class: 'wl-label' }, pick(uk, en)), technical ? h('code', null, key) : null,
          technical ? h('span', { class: 'badge' }, `${slot.kind} · ${slot.scope}`) : null,
          h('span', { class: 'wl-occupants' }, slot.occupants.length ? [h('small', null, pick('Реєстрації каталогу', 'Catalog registrations')), ...slot.occupants.filter(o => key !== 'main' || o.pkg === '@deepseek-ai/dsh-client-ui-conversation').slice(0, 2).map(o => h('span', { class: 'wl-occupant' }, o.text, h('small', null, status(o.pkg)))), slot.occupants.length > 2 ? h('small', null, pick('Усі реєстрації — у картці', 'All registrations in the detail panel')) : null] : pick('Немає зареєстрованого наповнення', 'No cataloged occupants')),
          area === 'flow' ? h('div', { class: 'wl-messages', 'aria-hidden': 'true' }, h('span', null, '················'), h('span', null, '····························'), h('span', null, '····················')) : null))
      }
      if (screen === 'composer') canvas.appendChild(h('div', { class: 'wl-textarea', style: 'grid-area: text' }, pick('Напишіть повідомлення…', 'Write a message…'), h('small', null, pick('Звичайне поле вводу · не слот', 'Native input · not a slot'))))
      if (observed) {
        canvas.append(h('div', { class: 'wl-native', style: 'grid-area: add' }, '+', h('small', null, pick('Меню · кнопка InputBar', 'Menu · InputBar button'))), h('div', { class: 'wl-native', style: 'grid-area: send' }, '↑', h('small', null, pick('Надіслати · вимкнено', 'Send · disabled'))))
        body.appendChild(h('p', { class: 'callout' }, pick('Перевірено у запущеному DSH 0.2.1-rc.2 / 687f282: нова порожня сесія, без налаштованої моделі, desktop Web 1280×729. Видно дозвіл і вибір моделі; план, вкладення й меню-накладка приховані. «+» відкриває меню команд. Відповідь моделі та активне виконання не перевірені.', 'Observed in running DSH 0.2.1-rc.2 / 687f282: new empty session, no configured model, desktop Web 1280×729. Permission and model controls are visible; plan, attachments and menu overlay are hidden. + opens the command menu. Model responses and active execution were not verified.')))
      }
      this.slotDetail = h('div', { class: 'cz-slot-detail card wl-detail' })
      body.appendChild(h('div', { class: 'wl-workspace' }, h('div', null, h('div', { class: 'wl-window-title' }, 'DSH / WEB UI', h('span', null, pick('Схематичний макет', 'Schematic layout'))), canvas,
        h('p', { class: 'small muted' }, pick('Геометрія узагальнена. Реєстрація компонента не гарантує його видимість. Накладки показані окремою смугою; у застосунку вони розташовані над вмістом.', 'Geometry is simplified. Registration does not guarantee visibility. Overlays are shown as a separate band; in the app they sit above content.')),
        h('div', { class: 'chips' }, h('button', { class: 'chip link', onclick: () => DSHMap.nav.openFile('packages/client/ui-layout/src/client/AppFrame.tsx') }, 'AppFrame.tsx'), h('button', { class: 'chip link', onclick: () => DSHMap.router.go('customize', { tab: 'slots', slot: params.slot }) }, pick('Відкрити каталог слотів →', 'Open slot catalog →')))), this.slotDetail))
      if (screen === 'composer') body.appendChild(h('details', { class: 'card wl-proof' }, h('summary', null, pick('Знімок реального DSH · 22 жовтня 2026', 'Actual DSH screenshot · 22 October 2026')), h('img', { src: 'assets/dsh-composer-observed.png', alt: pick('Реальний DSH: нова сесія з composer, дозволами та вибором моделі', 'Actual DSH: new session with composer, permissions and model selector'), style: 'width:100%;height:auto' })))
      this.renderSlotDetail(params.slot)
      const selected = DSHMap.model.slotByKey.get(params.slot)
      if (selected) {
        const evidence = LAYOUT_EVIDENCE[selected.key]
        const condition = conditions[selected.key]
        const box = h('div', { class: 'wl-evidence' },
          h('h3', null, pick('Підтвердження з коду', 'Source evidence')),
          h('p', { class: 'small' }, condition ? pick(...condition) : pick('Умови визначає контейнер і реалізація компонента. Дивіться місця рендерингу нижче.', 'Conditions are controlled by the container and component implementation. See render sites below.')),
          h('div', { class: 'd-sub-h' }, pick('Плагіни у композиції web', 'Plugins in web composition')),
          selected.occupants.map(o => h('div', { class: 'wl-plugin-row' }, o.pkg ? ui.pkgChip(o.pkg) : o.text, h('span', { class: 'badge' }, status(o.pkg)), mounted.get(o.pkg)?.expr ? h('code', null, mounted.get(o.pkg).expr) : null)),
          h('button', { class: 'chip link', onclick: () => DSHMap.router.go('composition', { profile: 'web' }) }, pick('Відкрити композицію web →', 'Open web composition →')),
          h('div', { class: 'd-sub-h' }, pick('Місця рендерингу', 'Render sites')),
          (evidence?.render ?? []).map(source => h('div', { class: 'small' }, ui.sourceLink(source))),
          h('div', { class: 'd-sub-h' }, pick('Реєстрації компонентів', 'Component registrations')),
          (evidence?.registrations ?? []).map(r => h('div', { class: 'small' }, ui.sourceLink(r.source))))
        this.slotDetail.prepend(box)
      }
    },
    markSlot(key) {
      for (const el of this.root.querySelectorAll('.cz-slot')) DSHMap.ui.select(el, el.dataset.slot === key)
    },
    renderSlotDetail(key) {
      const box = this.slotDetail
      if (!box) return
      const M = DSHMap.model
      const ui = DSHMap.ui
      clear(box)
      const s = key ? M.slotByKey.get(key) : null
      if (!s) { box.appendChild(ui.emptyState({ icon: 'grid', text: t('cz.sl.pick'), compact: true })); return }
      if (DSHMap.router.params.tab === 'slots') {
        const groups = { shell: ['sidebar', 'main', 'rightbar', 'shell.bottom', 'shell.overlay'], conversation: ['conversation.header', 'conversation.session.header.actions', 'conversation.session.header.utilities', 'conversation.view', 'conversation.composer.bar'], composer: ['conversation.input.overlay', 'conversation.input.attachments', 'conversation.input.permission', 'conversation.input.plan', 'conversation.input.left', 'conversation.input.right', 'conversation.input.model'] }
        const screen = Object.keys(groups).find(k => groups[k].includes(s.key))
        if (screen) box.appendChild(h('button', { class: 'chip link', onclick: () => DSHMap.router.go('customize', { tab: 'layouts', screen, slot: s.key }) }, i18n.pick({ uk: 'Показати на макеті →', en: 'Show in layout →' })))
      }
      box.appendChild(h('div', null,
        h('div', { class: 'd-kicker' }, t('type.slot')),
        h('h2', { class: 'd-title cz-slot-title' }, s.key),
        h('div', { class: 'chips cz-slot-badges' },
          h('span', { class: 'badge accent' }, `${t('cz.sl.kind')}: ${s.kind}`), h('span', { class: 'badge' }, `${t('cz.sl.scope')}: ${s.scope}`),
          s.replaceRisk !== 'none' ? h('span', { class: 'badge warn' }, t('cz.sl.risk')) : null),
        s.doc ? h('p', { class: 'small cz-pre-line' }, md(s.doc)) : null,
        s.keyDomain ? h('p', { class: 'small faint' }, md(s.keyDomain)) : null,
        h('div', { class: 'd-sub-h' }, t('cz.sl.declared')),
        h('div', { class: 'small' }, s.declaredByPkg ? ui.pkgChip(s.declaredByPkg) : null, ' ', h('span', { class: 'faint' }, s.declaredBy ?? '')),
        s.occupants.length ? [h('div', { class: 'd-sub-h' }, `${t('cz.sl.occupants')} · ${s.occupants.length}`), h('div', { class: 'chips' }, s.occupants.map(o => (o.pkg ? ui.pkgChip(o.pkg, { suffix: ` ${o.text.split(' ').slice(1).join(' ')}` }) : h('span', { class: 'chip mono' }, o.text))))] : null,
        s.registerOptions.length ? [h('div', { class: 'd-sub-h' }, t('cz.sl.options')), ui.table({
          head: false, className: 'cz-opts', label: t('cz.sl.options'),
          rows: s.registerOptions,
          columns: [
            { key: 'name', className: 'mono nowrap', cell: o => [o.name, o.requirement === 'required' ? h('span', { class: 'badge warn cz-req' }, '*') : null] },
            { key: 'type', className: 'mono small' },
            { key: 'doc', className: 'small' },
          ],
        })] : null,
        s.ownerProps.length ? [h('div', { class: 'd-sub-h' }, t('cz.sl.ownerProps')), ui.code(s.ownerProps.join('\n\n'), 'typescript')] : null,
        s.standardProps.length ? [h('div', { class: 'd-sub-h' }, t('cz.sl.standardProps')), h('div', { class: 'chips' }, s.standardProps.map(x => h('span', { class: 'chip mono', title: x }, x.split(':')[0])))] : null,
        s.example ? [h('div', { class: 'd-sub-h' }, t('cz.sl.example')), codeBlock(s.example, 'javascript')] : null,
        s.source ? h('div', { class: 'small cz-after' }, ui.sourceLink(s.source)) : null))
    },
  }

  // ── catalog pieces ────────────────────────────────────────────────────
  function layersBlock(L) {
    const ui = DSHMap.ui
    const items = []
    L.items.forEach((x, i) => {
      if (i) items.push(h('div', { class: 'chain-arrow' }, '→'))
      items.push(h('div', { class: 'card cz-layer' }, h('div', { class: 'faint tiny' }, `${i + 1}`), h('b', null, i18n.pick(x.title)), h('code', { class: 'wrap-code small' }, x.path), h('p', { class: 'small muted' }, md(i18n.pick(x.text)))))
    })
    return h('div', null,
      h('p', { class: 'small' }, mdRich(i18n.pick(L.lead))),
      h('div', { class: 'cz-layers' }, items),
      h('ul', { class: 'cz-notes small' }, L.notes.map(n => h('li', null, mdRich(i18n.pick(n))))),
      ui.refChips(L.refs))
  }

  function upstreamTable(rows, key) {
    const ui = DSHMap.ui
    return ui.table({
      card: true, sortable: false, className: 'cz-table', label: t(key === 'goal' ? 'cz.upstream.where' : 'cz.upstream.features'),
      rows,
      columns: [
        { key, label: t(`cz.col.${key === 'goal' ? 'goal' : 'feature'}`), cell: r => h('b', null, md(r[key])) },
        { key: 'mechanism', label: t('cz.col.mechanism'), className: 'small', cell: r => md(r.mechanism) },
        { key: 'links', label: t('cz.col.links'), cell: r => h('div', { class: 'chips' }, r.services.map(k => ui.svcChip(k)), r.events.slice(0, 6).map(n => ui.eventChip(n)), (r.sessionEvents ?? []).map(n => ui.sessionEventChip(n)), r.events.length > 6 ? h('span', { class: 'chip' }, `+${r.events.length - 6}`) : null) },
        { key: 'examples', label: t('cz.col.examples'), cell: r => h('div', { class: 'chips' }, r.examples.map(id => ui.pkgChip(id)), r.docs.map(d => ui.docChip(d))) },
      ],
    })
  }

  function sandboxAside(C) {
    const ui = DSHMap.ui
    return h('details', { class: 'fold cz-fold' },
      h('summary', null, t('cz.sb.dialect')),
      h('div', { class: 'fold-body small' },
        h('ol', { class: 'cz-notes' }, C.layers.items.map(x => h('li', null, h('b', null, i18n.pick(x.title)), ' — ', h('code', null, x.path)))),
        h('ul', { class: 'cz-notes' }, C.layers.notes.map(n => h('li', null, mdRich(i18n.pick(n))))),
        h('div', { class: 'd-sub-h' }, t('cz.sb.required')),
        h('div', { class: 'chips' }, (C.required ?? []).map(id => h('span', { class: 'chip mono' }, id))),
        ui.refChips(C.sandbox.refs)))
  }

  function renderResult(out, profile, text) {
    const M = DSHMap.model
    const ui = DSHMap.ui
    clear(out)
    if (!text.trim()) { out.appendChild(h('div', { class: 'faint' }, t('cz.sb.empty'))); return }
    const res = runPatch(profile, text)
    if (!res) return
    if (res.error) {
      out.appendChild(h('div', { class: 'callout warn' }, svgIcon('info'), h('div', null, h('b', null, t('cz.sb.yaml')), res.error.line ? ` (line ${res.error.line})` : '', h('div', { class: 'mono small' }, res.error.message), res.error.hint ? h('div', null, md(t(`cz.hint.${res.error.hint}`))) : null)))
      return
    }
    const issues = res.issues
    if (issues.length) {
      out.appendChild(h('div', { class: 'd-sub-h' }, `${t('cz.sb.issues')} · ${issues.length}`))
      out.appendChild(h('div', { class: 'stack' }, issues.map(i => h('div', { class: ['cz-issue', i.level] }, h('span', { class: ['badge', LEVEL_BADGE[i.level]] }, i.level), h('span', { class: 'small' }, md(issueText(i))), i.op !== undefined ? h('span', { class: 'faint tiny mono' }, `#${i.op + 1}`) : null))))
    } else out.appendChild(h('div', { class: 'callout tip' }, svgIcon('info'), t('cz.sb.ok')))
    const d = res.diff
    const stateChip = st => h('span', { class: ['state', st] }, GLYPH[st] ?? '', ' ', st)
    if (d.changed.length) {
      out.appendChild(h('div', { class: 'd-sub-h' }, `${t('cz.sb.changed')} · ${d.changed.length}`))
      out.appendChild(h('div', { class: 'stack' }, d.changed.map(c => h('div', { class: 'card cz-change' },
        h('div', { class: 'row wrap' }, h('b', { class: 'mono' }, c.key), c.pkg ? ui.pkgChip(c.pkg) : null,
          c.fields.includes('state') ? h('span', { class: 'small' }, stateChip(c.stateBefore), ' → ', stateChip(c.stateAfter)) : null,
          c.fields.filter(f => f !== 'state').map(f => h('span', { class: 'badge accent' }, f))),
        c.lostKeys?.length ? h('div', { class: 'small cz-lost' }, `${t('cz.sb.lost')}: `, c.lostKeys.map(k => h('code', null, k)).reduce((a, x) => (a.length ? [...a, ', ', x] : [x]), [])) : null,
        c.fields.includes('config') ? h('div', { class: 'cz-config-diff' },
          h('div', null, h('div', { class: 'faint tiny' }, t('cz.sb.before')), ui.code(c.configBefore ?? '—', 'yaml')),
          h('div', null, h('div', { class: 'faint tiny' }, t('cz.sb.after')), ui.code(c.configAfter ?? '—', 'yaml'))) : null))))
    }
    if (d.added.length) {
      out.appendChild(h('div', { class: 'd-sub-h' }, `${t('cz.sb.added')} · ${d.added.length}`))
      out.appendChild(h('div', { class: 'stack' }, d.added.map(a => h('div', { class: 'row wrap small' }, h('b', { class: 'mono' }, a.key), a.pkg ? ui.pkgChip(a.pkg) : h('span', { class: 'chip mono' }, a.spec ?? '?'), stateChip(a.state)))))
    }
    if (!d.changed.length && !d.added.length) out.appendChild(h('div', { class: 'faint small cz-after' }, t('cz.sb.nochange')))
    if (d.mountsAdded.length || d.mountsRemoved.length) {
      const tools = id => M.pkgById.get(id)?.tools ?? []
      out.appendChild(h('div', { class: 'd-sub-h' }, t('cz.sb.mounts')))
      if (d.mountsAdded.length) out.appendChild(h('div', { class: 'row wrap small' }, h('span', { class: 'badge ok' }, t('cz.sb.mountsAdded')), d.mountsAdded.map(([id, st]) => ui.pkgChip(id, { suffix: `${GLYPH[st]}${tools(id).length ? ` ${tools(id).join(', ')}` : ''}` }))))
      if (d.mountsRemoved.length) out.appendChild(h('div', { class: 'row wrap small cz-after' }, h('span', { class: 'badge danger' }, t('cz.sb.mountsRemoved')), d.mountsRemoved.map(id => ui.pkgChip(id, { suffix: tools(id).length ? ` ${tools(id).join(', ')}` : '' }))))
    }
  }

  /** Config fields of one package, in schema order. */
  function fieldsTable(fields, label) {
    return DSHMap.ui.table({
      sortable: false, className: 'cz-fields', label,
      row: f => ({ 'data-card': f.name }),
      rows: fields,
      columns: [
        { key: 'field', label: t('cz.cfg.field'), className: 'mono nowrap', cell: f => [h('b', null, f.name), f.optional ? h('span', { class: 'faint' }, '?') : null] },
        { key: 'type', label: t('cz.cfg.type'), className: 'mono small cz-type' },
        { key: 'default', label: t('cz.cfg.default'), className: 'mono small', cell: f => f.default ?? h('span', { class: 'faint' }, '—') },
        { key: 'flags', label: t('cz.cfg.flags'), cell: f => h('div', { class: 'chips' },
          f.required ? h('span', { class: 'badge warn' }, t('cz.cfg.required')) : null,
          f.volatile ? h('span', { class: 'badge accent', title: t('cz.cfg.volatile.d') }, t('cz.cfg.volatile')) : null,
          f.secret ? h('span', { class: 'badge danger', title: t('cz.cfg.secret.d') }, t('cz.cfg.secret')) : null) },
        { key: 'doc', label: t('cz.cfg.doc'), className: 'small', cell: f => (f.doc ? md(f.doc) : '') },
      ],
    })
  }

  /** Approximate activation order of packages in a profile: first row position (dependencies at their first dependent). */
  function rowOrder(profile) {
    const M = DSHMap.model
    const P = patchEngine()
    const order = new Map()
    if (!P) return order
    let i = 0
    for (const x of P.flatIndex(M.profileByName.get(profile).rows).values()) if (x.row.pkg && x.state !== 'off' && !order.has(x.row.pkg)) order.set(x.row.pkg, i++)
    return order
  }

  function eventCard(e, profile, order) {
    const M = DSHMap.model
    const ui = DSHMap.ui
    const sites = M.customize.events.sites[e.name] ?? []
    const rank = id => {
      if (order.has(id)) return order.get(id)
      const via = DSHMap.model.presence(M.pkgById.get(id), profile)?.via ?? []
      const r = via.map(v => order.get(v)).filter(x => x !== undefined)
      return r.length ? Math.min(...r) + 0.5 : Infinity
    }
    const rows = e.listeners.map(id => {
      const own = sites.filter(s => s.pkg === id)
      return { id, sites: own, prepend: own.some(s => s.prepend), active: M.isActiveIn(M.pkgById.get(id), profile), rank: rank(id) }
    })
    rows.sort((a, b) => (b.active - a.active) || (b.prepend - a.prepend) || a.rank - b.rank || a.id.localeCompare(b.id))
    return h('div', { class: 'card cz-event', 'data-card': e.name },
      h('div', { class: 'row wrap' }, ui.eventChip(e.name), h('span', { class: ['badge', e.mode === 'waterfall' ? 'accent' : 'orange'] }, e.mode),
        e.owner ? h('span', { class: 'small faint' }, '·', ' ', ui.pkgChip(e.owner)) : null),
      e.description ? h('p', { class: 'small muted cz-p' }, util.firstSentence(e.description, 260)) : null,
      e.signature ? h('pre', { class: 'code small cz-sig' }, e.signature) : null,
      h('div', { class: 'd-sub-h' }, `${t('cz.ev.listeners')} · ${rows.length}`),
      rows.length ? h('ol', { class: 'cz-listeners' }, rows.map(r => h('li', { class: r.active ? null : 'dim' },
        ui.pkgChip(r.id),
        r.prepend ? h('span', { class: 'badge warn' }, t('cz.ev.prepend')) : null,
        r.active ? null : h('span', { class: 'faint tiny' }, t('cz.ev.inactive')),
        r.sites.length ? r.sites.map(s => h('button', { class: 'link-btn mono tiny', onclick: () => DSHMap.nav.openFile(s.file, { line: s.line }) }, `${s.file.split('/').slice(-2).join('/')}:${s.line}`)) : h('span', { class: 'faint tiny' }, t('cz.ev.nosite'))))) : h('div', { class: 'faint small' }, t('cz.ev.none')))
  }

  // ── package panel: Configure, usage examples, copy as context ────────
  /**
   * "Configure" section of a package panel: per profile, patch snippets to
   * disable/enable the row, restate its config, insert it, or make it the
   * provider of a seam it implements.
   */
  function configureSection(p, section) {
    const M = DSHMap.model
    const P = patchEngine()
    if (!P) return null
    const ui = DSHMap.ui
    const mountedSomewhere = M.profileOrder.some(n => P.rowsOf(M.profileByName.get(n).rows, p.id).length)
    if (!mountedSomewhere && !p.config && !p.optionalIn?.length && !p.form) return null
    const state = { profile: M.profileOrder.find(n => P.rowsOf(M.profileByName.get(n).rows, p.id).some(r => r.state !== 'off')) ?? M.defaultProfile }
    const box = h('div')
    const draw = () => {
      clear(box)
      const profile = state.profile
      const prof = M.profileByName.get(profile)
      box.append(h('p', { class: 'faint small cz-lead' }, t('d.configure.lead')),
        ui.tabs(M.profileOrder.map(n => [n, n]), profile, n => { state.profile = n; draw() }, t('cz.sb.profile')))
      const snippet = (title, yaml, note) => h('div', { class: 'cz-snippet' },
        h('div', { class: 'row' }, h('b', { class: 'small grow' }, title),
          h('button', { class: 'icon-btn', title: t('cz.trySandbox'), 'aria-label': t('cz.trySandbox'), onclick: () => openSandbox(profile, yaml) }, svgIcon('play'))),
        note ? h('div', { class: 'faint tiny' }, note) : null,
        DSHMap.ui.codeCopy(yaml, 'yaml'))
      const rows = P.rowsOf(prof.rows, p.id)
      for (const r of rows) {
        const presetNote = r.preset ? t('d.configure.preset', { p: r.preset }) : null
        box.appendChild(h('div', { class: 'd-sub-h' }, `${t('d.configure.row')}: `, h('span', { class: 'mono' }, [...r.path, r.row.id].join(' › ')), ' ', h('span', { class: ['state', r.state] }, GLYPH[r.state], ' ', t(`comp.state.${r.state}`))))
        const off = r.row.state === 'off'
        const toggle = P.editOp(prof.rows, r.row, raw => ({ ...raw, disabled: off ? false : true }))
        box.appendChild(snippet(off ? t('d.configure.enable') : t('d.configure.disable'), toggle.yaml, presetNote))
        if (p.config?.fields?.length || r.row.config) {
          const cfg = configOp(P, prof.rows, r, p)
          box.appendChild(snippet(t('d.configure.config'), cfg, presetNote))
        }
      }
      if (!rows.length) {
        const pres = M.presence(p, profile)
        if (pres?.state === 'dep') box.appendChild(h('p', { class: 'small' }, t('d.configure.dep', { p: profile, via: pres.via.map(id => M.pkgById.get(id)?.short ?? id).join(', ') }), ' ', h('span', { class: 'chips' }, pres.via.map(id => ui.pkgChip(id)))))
        const other = M.profileOrder.map(n => ({ n, r: P.rowsOf(M.profileByName.get(n).rows, p.id).find(x => !x.preset) })).find(x => x.r)
        if (p.optionalIn?.length) {
          box.appendChild(h('p', { class: 'small cz-p' }, t('d.configure.optional')))
          for (const b of p.optionalIn) box.appendChild(DSHMap.ui.codeCopy(`dsh plugin --profile ${profile} add ${b}`, 'bash'))
        } else if (other) {
          const raw = P.rawRow(other.r.row)
          if (raw.disabled === true) delete raw.disabled
          box.appendChild(snippet(t('d.configure.insert'), P.insertYaml(raw), t('d.configure.insert.d', { p: profile, from: other.n })))
        } else if (p.form && pres?.state !== 'dep') {
          box.appendChild(snippet(t('d.configure.insert'), P.insertYaml({ id: p.short, name: p.id }), t('d.configure.insertNew')))
        }
      }
      // replace the provider of an exclusive seam (registries take providers side by side)
      for (const key of p.services.implements) {
        const s = M.svcByKey.get(key)
        const act = s?.active?.[profile]
        if (!act || !exclusiveSeam(s)) continue
        const others = act.providers.filter(x => x.pkg !== p.id && x.how === 'mount')
        if (!others.length) continue
        const ops = []
        for (const o of others) for (const r of P.rowsOf(prof.rows, o.pkg).filter(x => x.state !== 'off' && !x.preset)) ops.push(P.editOp(prof.rows, r.row, raw => ({ ...raw, disabled: true })).yaml)
        const mine = rows.find(x => !x.preset)
        if (mine) { if (mine.row.state === 'off') ops.push(P.editOp(prof.rows, mine.row, raw => ({ ...raw, disabled: false })).yaml) } else ops.push(P.insertYaml({ id: p.short, name: p.id }))
        if (!ops.length) continue
        box.appendChild(snippet(t('d.configure.replace', { s: key }), ops.join('\n'), t('d.configure.replace.d', { from: others.map(o => M.pkgById.get(o.pkg)?.short ?? o.pkg).join(', ') })))
      }
      // settings forms and the field reference
      const forms = [...new Set(rows.flatMap(r => M.customize.settingsForms[r.row.id] ?? []))]
      if (forms.length) box.appendChild(h('div', { class: 'small cz-after' }, t('d.configure.settings'), h('span', { class: 'chips cz-inline' }, forms.map(id => ui.pkgChip(id)))))
      if (p.config?.fields?.length) box.appendChild(h('details', { class: 'fold cz-fold' }, h('summary', null, t('d.configure.fields'), h('span', { class: 'count' }, ` ${p.config.fields.length}`)), h('div', { class: 'fold-body' }, fieldsTable(p.config.fields, t('d.configure.fields')))))
      if (!box.querySelector('.cz-snippet') && !p.config?.fields?.length && !p.optionalIn?.length) box.appendChild(ui.emptyState({ icon: 'info', text: t('d.configure.none'), compact: true }))
    }
    draw()
    return section(t('d.configure'), null, box)
  }

  /**
   * A seam with one active implementation per context (`ctx.shell`, `ctx.fs`,
   * `ctx.sandbox`…), as opposed to a registry whose providers register side by
   * side (`ctx.llm`, `ctx.skills`, `ctx.web`…) — judged from the upstream text.
   */
  function exclusiveSeam(s) {
    if (s.mode !== 'seam') return false
    return !/registry|side by side|register(?:s)? (?:into|under)|merges|independently owned/i.test(`${s.note ?? ''} ${s.api?.description ?? ''}`)
  }

  /**
   * Op restating a row's whole config: current values, plus commented-out
   * schema fields not set yet (with defaults, Settings and secret marks).
   */
  function configOp(P, rows, r, p) {
    const current = P.configValue(r.row.config) ?? {}
    const op = P.editOp(rows, r.row, raw => ({ ...raw, config: raw.config ?? {} }))
    if (r.preset || typeof current !== 'object' || Array.isArray(current)) return op.yaml
    const fields = p.config?.fields ?? []
    const missing = fields.filter(f => !(f.name in current))
    const lines = [`- id: ${r.row.id}`, '  # replaces the whole config of this row: restate every field you keep;', '  # commented lines are schema fields with their defaults', '  config:']
    const body = Object.keys(current).length ? P.dump(current, 4) : ''
    if (body) lines.push(body)
    for (const f of missing) {
      const marks = [f.volatile ? 'Settings' : null, f.secret ? 'secret' : null, f.required ? 'required' : null].filter(Boolean)
      lines.push(`    # ${f.name}: ${f.default ?? `<${f.type.replace(/\s+/g, ' ').slice(0, 40)}>`}${marks.length ? `  (${marks.join(', ')})` : ''}`)
    }
    if (!body && !missing.length) lines.push('    {}')
    return lines.join('\n')
  }

  /** "Usage examples": tests, example overlays and README code blocks (once detail loads). */
  function examplesSection(p, section) {
    const ex = p.examples
    const box = h('div')
    if (ex?.tests?.length) {
      box.appendChild(h('div', { class: 'd-sub-h' }, t('d.examples.tests', { n: ex.tests.length, t: ex.testTotal })))
      box.appendChild(h('div', { class: 'file-list' }, ex.tests.map(([rel, lines]) => h('button', { class: 'f', title: rel, onclick: () => DSHMap.nav.openFile(`${p.dir}/${rel}`) }, svgIcon('file'), h('span', { class: 'n' }, rel), h('span', { class: 'l' }, lines)))))
    }
    if (ex?.overlays?.length) {
      box.appendChild(h('div', { class: 'd-sub-h' }, t('d.examples.overlays')))
      box.appendChild(h('div', { class: 'chips' }, ex.overlays.map(f => h('button', { class: 'chip link mono', onclick: () => DSHMap.nav.openFile(f) }, svgIcon('file'), f.split('/').slice(-2).join('/')))))
    }
    const readmeSlot = h('div')
    box.appendChild(readmeSlot)
    const node = section(t('d.examples'), null, box)
    // Hidden until there is something to show (README code arrives lazily).
    if (!ex?.tests?.length && !ex?.overlays?.length) node.hidden = true
    return {
      node,
      /** Fill README code blocks once the package detail has loaded. */
      fill(detail) {
        const blocks = [...String(detail?.readme ?? '').matchAll(/```(ts|tsx|typescript|js|javascript|yaml|yml|json|bash|sh)\n([\s\S]*?)```/g)].slice(0, 4)
        if (!blocks.length) return
        readmeSlot.appendChild(h('div', { class: 'd-sub-h' }, t('d.examples.readme')))
        for (const [, lang, code] of blocks) readmeSlot.appendChild(DSHMap.ui.codeCopy(code, { ts: 'typescript', tsx: 'typescript', js: 'javascript', yml: 'yaml', sh: 'bash' }[lang] ?? lang))
        node.hidden = false
      },
    }
  }

  /** Markdown context of a package for an AI agent: facts, API, config, model view, limits, README. */
  async function packageContext(p) {
    const M = DSHMap.model
    const detail = await DSHMap.load('pkg', p.id, p.detail).catch(() => ({}))
    const L = []
    const list = (title, items) => { if (items?.length) L.push(`- ${title}: ${items.join(', ')}`) }
    L.push(`# ${p.id}`, '', `Package of DeepSeek Harness (dsh) at \`${p.dir}\` (version ${p.version ?? '—'}, commit ${M.meta.commit?.hash?.slice(0, 10) ?? '—'}).`, '')
    if (p.role || p.description) L.push(p.role ?? p.description, '')
    if (p.summary && p.summary !== p.description) L.push(p.summary, '')
    L.push('## Facts', '')
    list('Group', [p.group])
    list('Plugin form', p.form ? [p.form] : [])
    list('Profiles (mounted)', M.profileOrder.filter(n => ['on', 'cond'].includes(M.presence(p, n)?.state)).map(n => `${n} (${M.presence(p, n).state})`))
    list('Profiles (loaded as dependency)', M.profileOrder.filter(n => M.presence(p, n)?.state === 'dep'))
    list('Owns services', p.services.owns.map(k => `ctx.${k}`))
    list('Implements services', p.services.implements.map(k => `ctx.${k}`))
    list('Consumes services', p.services.consumes.map(k => `ctx.${k}`))
    list('Dispatches events', p.events.dispatches)
    list('Listens to events', p.events.listens)
    list('Session log events', p.events.session)
    list('Depends on (peer/runtime)', [...p.deps.peer, ...p.deps.runtime])
    L.push('')
    if (p.tools.length) {
      L.push('## Model tools', '')
      for (const n of p.tools) { const tl = M.tools.find(x => x.pkg === p.id && x.name === n); L.push(`- \`${n}\`: ${util.firstSentence(tl?.description ?? '', 300)}`) }
      L.push('')
    }
    for (const k of p.services.owns) {
      const s = M.svcByKey.get(k)
      if (!s?.api) continue
      L.push(`## API of ctx.${k}`, '')
      if (s.api.description) L.push(s.api.description, '')
      for (const m of s.api.methods ?? []) L.push(`- \`${m.signature}\` — ${m.description}`)
      if (s.api.code) L.push('', '```ts', s.api.code, '```')
      L.push('')
    }
    if (p.config) {
      L.push('## Config', '')
      if (p.config.inject?.length) L.push(`Injects: ${p.config.inject.map(k => `ctx.${k}`).join(', ')}`, '')
      if (p.config.code) L.push('```ts', p.config.code, '```', '')
      const fields = p.config.fields ?? []
      if (fields.length) {
        L.push('| field | type | default | flags |', '|---|---|---|---|')
        for (const f of fields) L.push(`| ${f.name} | \`${f.type.replace(/\|/g, '\\|')}\` | ${f.default ?? ''} | ${[f.required ? 'required' : '', f.volatile ? 'volatile (Settings)' : '', f.secret ? 'secret' : ''].filter(Boolean).join(', ')} |`)
        L.push('', 'A cordis.patch.yml override replaces the whole `config` of a row.', '')
      }
    }
    const P = patchEngine()
    if (P) {
      const rows = M.profileOrder.flatMap(n => P.rowsOf(M.profileByName.get(n).rows, p.id).map(r => `${n}: ${[...r.path, r.row.id].join(' › ')} (${r.state})`))
      if (rows.length) L.push('## Profile rows', '', ...rows.map(x => `- ${x}`), '')
    }
    if (detail.modelExperience) L.push('## Model Experience', '', detail.modelExperience.trim(), '')
    if (detail.limitations) L.push('## Known Limitations', '', detail.limitations.trim(), '')
    if (detail.readme) {
      const body = detail.readme.length > 14000 ? `${detail.readme.slice(0, 14000)}\n\n… (README truncated)` : detail.readme
      L.push('## README', '', body.trim(), '')
    }
    L.push(`Source: ${M.githubTree(p.dir)}`)
    return L.join('\n')
  }

  /** Markdown context of a service: role, owner, providers per profile, consumers, methods, events. */
  function serviceContext(s) {
    const M = DSHMap.model
    const short = id => M.pkgById.get(id)?.short ?? id
    const L = [`# ctx.${s.key} — ${s.title}`, '', `Service of DeepSeek Harness (dsh), mode: ${s.mode}${s.api?.type ? `, type ${s.api.type}` : ''}.`, '']
    if (s.api?.description) L.push(s.api.description, '')
    if (s.note) L.push(s.note, '')
    L.push(`- Owner: ${s.owner ? short(s.owner) : '—'}`, `- Providers: ${s.implementations.map(short).join(', ') || '—'}`, `- Consumers: ${s.consumers.map(short).join(', ') || '—'}`)
    for (const n of M.profileOrder) { const a = s.active?.[n]; if (a?.providers?.length) L.push(`- Active in ${n}: ${a.providers.map(x => `${short(x.pkg)} (${x.how})`).join(', ')}`) }
    L.push('')
    if (s.api?.methods?.length) { L.push('## Methods', ''); for (const m of s.api.methods) L.push(`- \`${m.signature}\` — ${m.description}`); L.push('') }
    if (s.api?.code) L.push('```ts', s.api.code, '```', '')
    const evs = M.events.filter(e => e.owner === s.owner && s.owner)
    if (evs.length) { L.push('## Events of the owner package', ''); for (const e of evs) L.push(`- \`${e.name}\` (${e.mode ?? '—'}): ${util.firstSentence(e.description ?? '', 200)}`); L.push('') }
    if (s.api?.page) L.push(`Docs: ${M.github(s.api.page)}`)
    return L.join('\n')
  }

  DSHMap.customize = { patchEngine, resolveSpec, encode, decode, openSandbox, runPatch, configureSection, examplesSection, packageContext, serviceContext, copyButton }
})()
