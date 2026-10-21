/* DSH Map — guide layer shared by the new views: dictionaries, heading
 * anchors and entity autolinks in Markdown, Mermaid rendering with clickable
 * nodes, glossary tooltips and back-reference lists. */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, util, i18n } = DSHMap

  i18n.extend({
    uk: {
      'nav.start': 'Почніть тут',
      'nav.architecture': 'Архітектура',
      'nav.docs': 'Документація',
      'type.doc': 'Документ',
      'type.note': 'Рішення (Agent Note)',
      'type.term': 'Термін глосарія',
      'type.tour': 'Тур',
      'type.rule': 'Правило архітектури',
      'type.process': 'Процес',
      'type.flow': 'Потік',
      'refs.docs': 'Згадується в документах',
      'refs.notes': 'Ключові рішення',
      'refs.backlinks': 'На цей документ посилаються',
      'mermaid.loading': 'Рендерю діаграму…',
      'mermaid.failed': 'Не вдалося відрендерити діаграму Mermaid',
      'mermaid.hint': 'Клацніть вузол із назвою пакета, сервісу чи події, щоб відкрити його.',
      'term.open': 'Відкрити в глосарії',
      'plane': 'Розріз upstream',
      'shape': 'Форма пакета',
      'udomain': 'Домен події',
      'interpretation': 'інтерпретація карти',
      'lens.provider-deps': 'Залежності від конкретних провайдерів',
      'lens.role.wrapper': 'обгортка',
      'lens.role.composition': 'композиція',
      'lens.role.closure': 'замикання',
      'lens.role.candidate': 'кандидат на рев’ю',
      'lens.role.wrapper.d': 'залежний пакет налаштовує чи обгортає саме цього провайдера (llm-deepseek-api-key → llm-deepseek)',
      'lens.role.composition.d': 'залежний пакет сам є провайдером чи визначенням шва і компонує іншого провайдера (ssh → fs-sandbox)',
      'lens.role.closure.d': 'бандл, застосунок, замикання рантайму чи тестовий пакет, який мусить назвати конкретних провайдерів',
      'lens.role.candidate.d': 'нічого з переліченого не пояснює залежність — варто глянути на рев’ю',
      'map.cut': 'Розріз (колір вузлів)',
      'map.cut.layer': 'Шари карти (інтерпретація)',
      'map.cut.plane': 'Хребет ↔ можливості (upstream)',
      'map.cut.shape': 'Форма пакета: Host / Host+Client',
      'map.cut.seam': 'Роль у швах: визначення / провайдер / споживач',
      'map.cut.lens': 'Лінза: залежності від провайдерів',
      'map.cut.activity': 'Активність (коміти)',
      'map.cut.age': 'Вік пакета',
      'map.seam.definition': 'визначення шва',
      'map.seam.provider': 'провайдер',
      'map.seam.consumer': 'споживач',
      'map.seam.none': 'поза швами',
      'map.seam.definition.d': 'пакет володіє ctx.* шва (Service Definition)',
      'map.seam.provider.d': 'пакет реалізує шов (Service Provider)',
      'map.seam.consumer.d': 'пакет інжектує сервіс шва (Consumer)',
      'map.seam.none.d': 'пакет не бере участі в жодному шві',
      'map.lens.provider': 'провайдер, від якого залежать',
      'map.lens.none': 'поза лінзою',
      'map.lens.rule': 'Правило й таблиця залежностей →',
      'map.hide.unloaded': 'Сховати незавантажувані жодним профілем ({n})',
      'map.hide.unloaded.d': 'Пакети, яких не завантажує жоден стандартний профіль: експериментальні, опційні бандли, SSH, LSP, нативні модулі, тестова інфраструктура.',
      'svc.client': 'Клієнтські сервіси',
      'svc.client.d': 'Ключі ctx.*, які браузерні половини пакетів додають до Context через declare module. SERVICE_ROLES їх не охоплює.',
      'svc.client.type': 'Тип',
      'svc.client.declared': 'Оголошено',
      'svc.client.consumers': 'Клієнтські споживачі',
      'svc.seams': 'Провідник швів: активний провайдер у кожному профілі',
      'svc.seams.lead': 'Для кожного з {n} швів — визначення, провайдери й той, хто реально активний у профілі (змонтований рядком або завантажений як залежність). Кілька провайдерів мають {multi} швів.',
    },
    en: {
      'nav.start': 'Start here',
      'nav.architecture': 'Architecture',
      'nav.docs': 'Docs',
      'type.doc': 'Document',
      'type.note': 'Decision (Agent Note)',
      'type.term': 'Glossary term',
      'type.tour': 'Tour',
      'type.rule': 'Architecture rule',
      'type.process': 'Process',
      'type.flow': 'Flow',
      'refs.docs': 'Mentioned in documents',
      'refs.notes': 'Key decisions',
      'refs.backlinks': 'Documents linking here',
      'mermaid.loading': 'Rendering the diagram…',
      'mermaid.failed': 'Could not render the Mermaid diagram',
      'mermaid.hint': 'Click a node naming a package, service or event to open it.',
      'term.open': 'Open in the glossary',
      'plane': 'Upstream cut',
      'shape': 'Package shape',
      'udomain': 'Event domain',
      'interpretation': 'map interpretation',
      'lens.provider-deps': 'Dependencies on concrete providers',
      'lens.role.wrapper': 'wrapper',
      'lens.role.composition': 'composition',
      'lens.role.closure': 'closure',
      'lens.role.candidate': 'review candidate',
      'lens.role.wrapper.d': 'the dependent configures or wraps that very provider (llm-deepseek-api-key → llm-deepseek)',
      'lens.role.composition.d': 'the dependent is itself a seam provider or definition and composes another provider (ssh → fs-sandbox)',
      'lens.role.closure.d': 'a bundle, app, runtime closure or test package that must name concrete providers',
      'lens.role.candidate.d': 'none of the above explains the dependency — worth a look in review',
      'map.cut': 'Cut (node colour)',
      'map.cut.layer': 'Map layers (interpretation)',
      'map.cut.plane': 'Spine ↔ capabilities (upstream)',
      'map.cut.shape': 'Package shape: Host / Host+Client',
      'map.cut.seam': 'Seam role: definition / provider / consumer',
      'map.cut.lens': 'Lens: dependencies on providers',
      'map.cut.activity': 'Activity (commits)',
      'map.cut.age': 'Package age',
      'map.seam.definition': 'seam definition',
      'map.seam.provider': 'provider',
      'map.seam.consumer': 'consumer',
      'map.seam.none': 'outside seams',
      'map.seam.definition.d': 'the package owns a seam ctx.* (Service Definition)',
      'map.seam.provider.d': 'the package implements a seam (Service Provider)',
      'map.seam.consumer.d': 'the package injects a seam service (Consumer)',
      'map.seam.none.d': 'the package takes part in no seam',
      'map.lens.provider': 'provider depended on',
      'map.lens.none': 'outside the lens',
      'map.lens.rule': 'The rule and dependency table →',
      'map.hide.unloaded': 'Hide packages no profile loads ({n})',
      'map.hide.unloaded.d': 'Packages no standard profile loads: experimental, optional bundles, SSH, LSP, native modules, test infrastructure.',
      'svc.client': 'Client services',
      'svc.client.d': 'ctx.* keys the browser halves of packages add to the Context through declare module. SERVICE_ROLES does not cover them.',
      'svc.client.type': 'Type',
      'svc.client.declared': 'Declared',
      'svc.client.consumers': 'Client consumers',
      'svc.seams': 'Seam explorer: the active provider in every profile',
      'svc.seams.lead': 'For each of the {n} seams: the definition, the providers and which one is actually active in a profile (mounted by a row or loaded as a dependency). {multi} seams have several providers.',
    },
  })

  // ── entity lookup for autolinks ─────────────────────────────────────────
  let entityIndex = null
  // Built from the `model` part: rebuild once it arrives.
  DSHMap.on('model', () => { entityIndex = null })
  function entities() {
    if (entityIndex) return entityIndex
    const M = DSHMap.model
    const pkg = new Map()
    for (const p of M.packages) {
      pkg.set(p.id, p.id)
      pkg.set(p.id.replace(/^@deepseek-ai\//, ''), p.id)
      if (p.short.length > 3 && !pkg.has(p.short)) pkg.set(p.short, p.id)
    }
    entityIndex = { pkg, svc: new Set([...M.services.map(s => s.key), ...M.clientServices.map(s => s.key)]) }
    return entityIndex
  }
  /** Resolve a token ("ctx.tools", "tools/pre-execute", "dsh-session", a path) to a link target. */
  function resolveToken(raw) {
    const M = DSHMap.model
    const tok = raw.trim().replace(/[(),;:]+$/, '')
    const E = entities()
    const svc = /^ctx\.([a-zA-Z]\w*)/.exec(tok)
    if (svc && E.svc.has(svc[1])) return { service: svc[1] }
    if (M.evByName.has(tok)) return { event: tok }
    if (M.seByName.has(tok)) return { sessionEvent: tok }
    if (E.pkg.has(tok)) return { package: E.pkg.get(tok) }
    if (/^(packages|apps|docs|vendor|python|scripts)\//.test(tok)) {
      if (M.docById.has(tok)) return { doc: tok }
      const owner = M.pkgOfPath(tok)
      if (owner && /\.[a-z0-9]+$/i.test(tok)) return { file: tok }
      if (owner && (tok === owner.dir || tok === `${owner.dir}/`)) return { package: owner.id }
    }
    return null
  }

  // ── Markdown helpers (called by DSHMap.ui.markdown) ─────────────────────
  Object.assign(DSHMap.ui, {
    resolveToken,
    /** Give headings GitHub-style ids so upstream #anchors resolve. */
    anchorHeadings(el) {
      const seen = new Map()
      for (const hd of el.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
        if (hd.id) continue
        let slug = hd.textContent.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-')
        const n = seen.get(slug) ?? 0
        seen.set(slug, n + 1)
        if (n) slug = `${slug}-${n}`
        hd.id = slug
      }
    },
    /** Turn inline code naming a package, service, event or path into a map link. */
    autolink(el) {
      for (const code of el.querySelectorAll('code')) {
        if (code.closest('pre') || code.closest('a')) continue
        const target = resolveToken(code.textContent)
        if (!target) continue
        code.classList.add('autolink')
        code.title = DSHMap.nav.label(target)
        code.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); DSHMap.nav.to(target) })
        keyLink(code)
      }
    },
    /** Replace a Mermaid code block with the rendered diagram (Mermaid loads lazily). */
    mermaidBlock(source, replace) {
      const box = h('div', { class: 'mermaid-box' }, h('div', { class: 'loading' }, h('div', { class: 'spinner' }), t('mermaid.loading')))
      replace.replaceWith(box)
      renderMermaid(source).then(svg => {
        clear(box).innerHTML = svg
        linkDiagram(box)
        box.appendChild(h('div', { class: 'faint tiny mermaid-hint' }, t('mermaid.hint')))
      }).catch(err => {
        clear(box).append(h('div', { class: 'faint small' }, `${t('mermaid.failed')}: ${String(err?.message ?? err).slice(0, 200)}`), DSHMap.ui.code(source, 'plaintext'))
      })
      return box
    },
    /** Wrap the first occurrence of each glossary term inside `el` with a tooltip. */
    glossarize(el) {
      const M = DSHMap.model
      const terms = glossaryAliases()
      if (!terms.length) return el
      const re = new RegExp(`\\b(${terms.map(([a]) => util.reEscape(a)).join('|')})\\b`, 'i')
      const used = new Set()
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: n => (n.parentElement.closest('code, pre, a, .term, h1, h2, h3, .autolink, button, svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      })
      const nodes = []
      while (walker.nextNode()) nodes.push(walker.currentNode)
      for (const node of nodes) {
        let cur = node
        while (cur) {
          const m = re.exec(cur.nodeValue)
          if (!m) break
          const entry = terms.find(([a]) => a === m[1].toLowerCase())
          if (!entry || used.has(entry[1].term)) {
            // Skip this hit and continue after it.
            const rest = cur.splitText(m.index + m[1].length)
            cur = rest
            continue
          }
          used.add(entry[1].term)
          const hit = cur.splitText(m.index)
          const after = hit.splitText(m[1].length)
          const g = entry[1]
          const span = h('span', {
            class: 'term', tabindex: '0', role: 'link',
            onmouseenter: e => DSHMap.tooltip.show(termTip(g), e.clientX, e.clientY),
            onmousemove: e => DSHMap.tooltip.move(e.clientX, e.clientY),
            onmouseleave: () => DSHMap.tooltip.hide(),
            onfocus: e => { const r = e.currentTarget.getBoundingClientRect(); DSHMap.tooltip.show(termTip(g), r.left, r.bottom) },
            onblur: () => DSHMap.tooltip.hide(),
            onkeydown: e => { if (e.key === 'Escape' && DSHMap.tooltip.el?.classList.contains('show')) { e.stopPropagation(); DSHMap.tooltip.hide() } },
            onclick: e => { e.stopPropagation(); DSHMap.tooltip.hide(); DSHMap.nav.openTerm(g.term) },
          }, hit.nodeValue)
          hit.replaceWith(span)
          cur = after
        }
      }
      void M
      return el
    },
    keyLink,
    /**
     * Whole-card click for a card whose title is the real button: clicks
     * outside nested controls run `go`.
     */
    cardClick(el, go) {
      el.addEventListener('click', e => { if (!e.target.closest('button, a, input, select, textarea, summary, [tabindex]')) go() })
      return el
    },
    /** Paragraph of localized text with glossary tooltips. */
    gtext(tag, attrs, text) { return DSHMap.ui.glossarize(h(tag, attrs, text)) },
    /** Chip opening a document or decision. */
    docChip(id) {
      const M = DSHMap.model
      const d = M.docById.get(id)
      const note = M.isNote(id)
      return h('button', { class: ['chip', 'link', note ? 'note-chip' : null], title: d ? `${d.id}${d.lead ? `\n${d.lead}` : ''}` : id, onclick: e => { e.stopPropagation(); DSHMap.nav.openDoc(id) } },
        svgIcon(note ? 'flag' : 'doc'), d ? (d.label ?? d.title) : id, note && d ? h('span', { class: 'count' }, d.status === 'implemented' ? d.date?.slice(0, 7) ?? '' : d.status) : null)
    },
    /**
     * Back-reference sections for an entity: documents and decisions mentioning it.
     * @param {'pkg'|'svc'|'event'|'sessionEvent'|'doc'} kind
     */
    refSections(kind, key, opts = {}) {
      const M = DSHMap.model
      const ids = M.refs[kind]?.get(key) ?? []
      const docs = ids.filter(id => !M.isNote(id))
      const notes = ids.filter(id => M.isNote(id)).sort((a, b) => (M.docById.get(b)?.date ?? '').localeCompare(M.docById.get(a)?.date ?? ''))
      const sec = (title, list, limit) => list.length ? h('div', { class: 'd-section' }, h('h4', null, title, h('span', { class: 'count' }, list.length)), DSHMap.ui.chipList(list, id => DSHMap.ui.docChip(id), limit)) : null
      return [sec(opts.docsTitle ?? t('refs.docs'), docs, 14), sec(t('refs.notes'), notes, 10)].filter(Boolean)
    },
    /** Chips for a resolved curated refs block ({ package: [...], service: [...], doc: [...], file: [...] … }). */
    refChips(refs) {
      if (!refs) return null
      const ui = DSHMap.ui
      const M = DSHMap.model
      const out = []
      const chip = (icon, label, go, mono) => h('button', { class: ['chip', 'link', mono ? 'mono' : null], title: label, onclick: e => { e.stopPropagation(); go() } }, svgIcon(icon), label)
      for (const id of refs.package ?? []) out.push(ui.pkgChip(id))
      for (const k of refs.service ?? []) out.push(ui.svcChip(k))
      for (const n of refs.event ?? []) out.push(ui.eventChip(n))
      for (const n of refs.sessionEvent ?? []) out.push(ui.sessionEventChip(n))
      for (const n of refs.tool ?? []) out.push(chip('tool', n, () => DSHMap.nav.to({ tool: n }), true))
      for (const d of refs.doc ?? []) out.push(ui.docChip(d.split('#')[0]))
      for (const f of refs.file ?? []) out.push(chip('file', f.split('/').slice(-2).join('/'), () => DSHMap.nav.openFile(f), true))
      for (const p of refs.process ?? []) out.push(chip('box', i18n.pick(M.processById.get(p)?.title) ?? p, () => DSHMap.nav.openProcess(p)))
      for (const f of refs.flow ?? []) out.push(chip('flow', i18n.pick(M.flowById.get(f)?.title) ?? f, () => DSHMap.nav.openFlow(f)))
      for (const v of refs.view ?? []) out.push(chip('next', t(`nav.${v}`), () => DSHMap.router.go(v)))
      return out.length ? h('div', { class: 'chips ref-chips' }, out) : null
    },
    /** Localized badge for a vocabulary entry (plane, shape, event domain). */
    vocabBadge(entry, title) {
      if (!entry) return null
      return h('span', { class: 'badge vocab', style: `--vc:${entry.color}`, title: `${title ? `${title}: ` : ''}${i18n.pick(entry.blurb)}` }, i18n.pick(entry.title))
    },
  })

  /** Keyboard access for an element wired with addEventListener('click'): focusable link, Enter activates. */
  function keyLink(el, label) {
    el.setAttribute('role', 'link')
    el.setAttribute('tabindex', '0')
    if (label) el.setAttribute('aria-label', label)
    el.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.altKey || e.ctrlKey || e.metaKey) return
      e.preventDefault()
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    return el
  }

  let aliasCache = null
  function glossaryAliases() {
    if (aliasCache) return aliasCache
    const out = []
    for (const g of DSHMap.model.glossary) for (const a of g.aliases) if (a.length >= 4 && !/[^\w\s.-]/.test(a)) out.push([a, g])
    aliasCache = out.sort((a, b) => b[0].length - a[0].length)
    return aliasCache
  }
  function termTip(g) {
    return h('div', null, h('div', { class: 'tt-title' }, g.term), h('div', { class: 'tt-sub' }, g.section ?? ''), h('div', { class: 'tt-body' }, util.firstSentence(g.text.replace(/\*\*|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'), 320)), h('div', { class: 'tt-sub tt-hint' }, t('term.open')))
  }

  // ── Mermaid ─────────────────────────────────────────────────────────────
  let mermaidSeq = 0
  let mermaidTheme = null
  async function renderMermaid(source) {
    await DSHMap.vendor.need(['mermaid'])
    const theme = DSHMap.theme.current === 'dark' ? 'dark' : 'default'
    if (mermaidTheme !== theme) {
      window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme, fontFamily: 'Inter, -apple-system, Segoe UI, sans-serif', flowchart: { htmlLabels: false }, sequence: { useMaxWidth: true } })
      mermaidTheme = theme
    }
    // Upstream labels use <code>…</code>, which the strict security level escapes.
    const clean = source.replace(/<\/?code>/g, '')
    const { svg } = await window.mermaid.render(`dshmm${++mermaidSeq}`, clean)
    return svg
  }
  DSHMap.ui.renderMermaid = renderMermaid
  /** Make diagram labels naming map entities clickable. */
  function linkDiagram(box) {
    const labels = box.querySelectorAll('text, .nodeLabel, .messageText, .actor, tspan')
    for (const el of labels) {
      if (el.closest('.mm-link') || el.querySelector?.('tspan')) continue
      const text = el.textContent.trim()
      if (!text || text.length > 80) continue
      let target = resolveToken(text)
      if (!target) for (const tok of text.split(/[\s"'`→<>()[\],]+/)) { if (tok.length > 2 && (target = resolveToken(tok))) break }
      if (!target) continue
      const host = el.closest('g.node, g.actor, .actor-man') ?? el
      host.classList.add('mm-link')
      host.addEventListener('click', e => { e.stopPropagation(); DSHMap.nav.to(target) })
      keyLink(host, DSHMap.nav.label(target))
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
      title.textContent = DSHMap.nav.label(target)
      host.appendChild(title)
    }
  }
  DSHMap.on('theme', () => { mermaidTheme = null })
})()
