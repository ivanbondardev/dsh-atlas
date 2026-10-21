/* DSH Map — component library (UI/UX roadmap 3.3, 3.5).
 *
 * Every view builds its screens from these pieces so tables, filters, copy
 * buttons, empty/error states, selection and page layouts look and behave the
 * same everywhere:
 *   ui.table        sortable table, sticky header, empty state, scroll shadows
 *   ui.filterBar    search + chips with counts + reset, kept in the route
 *   ui.copyButton   one copy feedback: button state + global toast
 *   ui.emptyState / ui.errorState   icon, explanation, action
 *   ui.select       one selection style (.is-selected + aria-current)
 *   ui.tabs         .seg tab strip (a11y.js makes it a tablist)
 *   ui.layout.reference / ui.layout.narrative   the two view templates
 */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, util } = DSHMap
  const ui = DSHMap.ui
  const router = () => DSHMap.router

  // ── Table ───────────────────────────────────────────────────────────────
  /**
   * ui.table({ columns, rows, sort, onSort, row, empty, limit, className, card, label })
   *   columns: [{ key, label, cell(row) → node, num?, title?, className?,
   *               sort?: false | (row) → value (default: row[key]) }]
   *   sort:    { key, dir: 1 | -1 } initial order (dir -1 = descending)
   *   onSort:  (sort) → void, e.g. to keep the order in the route
   *   row:     (row) → attrs of the <tr> (onclick makes it a clickable row)
   *   virtualFrom: from this many rows the body renders virtually (4.4, default 150)
   *   sortable: false turns header sorting off (grouped or ordered rows)
   * Returns the wrapper element with .update(rows) and .sortBy(sort).
   * The wrapper scrolls horizontally with edge shadows; the header is sticky.
   */
  ui.table = function table(opts) {
    const o = { virtualFrom: 150, card: false, ...opts }
    const cols = o.columns.filter(Boolean)
    let rows = o.rows ?? []
    let sort = o.sort ?? null
    let virtual = null
    const scroller = h('div', { class: 'tbl-scroll' })
    // Keyboard scrolling (WCAG 2.1.1) only when the table overflows: a page of
    // small tables should not add a tab stop each.
    const fit = () => {
      const over = scroller.scrollWidth > scroller.clientWidth + 1 || scroller.scrollHeight > scroller.clientHeight + 1
      if (over) { scroller.tabIndex = 0; scroller.setAttribute('role', 'region'); scroller.setAttribute('aria-label', o.label ?? o.caption ?? t('ui.table')) }
      else { scroller.removeAttribute('tabindex'); scroller.removeAttribute('role'); scroller.removeAttribute('aria-label') }
    }
    if (window.ResizeObserver) new ResizeObserver(fit).observe(scroller)
    const wrap = h('div', { class: ['tbl', o.card ? 'tbl-card' : null, o.className ? `${o.className}-wrap` : null] }, scroller)
    const sortValue = c => (typeof c.sort === 'function' ? c.sort : r => r[c.key])
    const ordered = () => {
      if (!sort) return rows
      const c = cols.find(x => x.key === sort.key)
      if (!c || c.sort === false) return rows
      const val = sortValue(c)
      const missing = v => v === null || v === undefined || v === ''
      // Missing values always sort last; strings compare by locale.
      return [...rows].sort((a, b) => {
        const x = val(a), y = val(b)
        if (missing(x) || missing(y)) return missing(x) - missing(y)
        const d = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : (x < y ? -1 : x > y ? 1 : 0)
        return d * sort.dir
      })
    }
    const head = () => h('thead', null, h('tr', null, cols.map(c => {
      const sortable = c.sort !== false && o.sortable !== false
      const on = sort?.key === c.key
      const cls = [c.num ? 'num' : null, sortable ? 'sortable' : null, c.className ?? null]
      if (!sortable) return h('th', { class: cls, title: c.title ?? null, scope: 'col' }, c.label)
      return h('th', { class: cls, title: c.title ?? null, scope: 'col', 'aria-sort': on ? (sort.dir < 0 ? 'descending' : 'ascending') : 'none' },
        h('button', {
          class: 'th-sort',
          onclick: () => { api.sortBy({ key: c.key, dir: on ? -sort.dir : (c.num ? -1 : 1) }); o.onSort?.(sort) },
        }, c.label, h('span', { class: 'th-arrow', 'aria-hidden': 'true' }, on ? (sort.dir < 0 ? '↓' : '↑') : '↕')))
    })))
    const tr = r => h('tr', o.row?.(r) ?? null, cols.map(c => h('td', { class: [c.num ? 'num' : null, c.className ?? null] }, c.cell ? c.cell(r) : r[c.key])))
    const draw = () => {
      virtual?.dispose()
      virtual = null
      clear(scroller)
      if (!rows.length) {
        scroller.appendChild(typeof o.empty === 'object' && o.empty ? o.empty : ui.emptyState({ text: o.empty ?? t('search.empty'), compact: true }))
        return
      }
      const list = ordered()
      const body = h('tbody')
      scroller.appendChild(h('table', { class: ['data', o.className], 'aria-rowcount': list.length > o.virtualFrom ? String(list.length + (o.head === false ? 0 : 1)) : null },
        o.caption ? h('caption', { class: 'sr-only' }, o.caption) : null,
        o.head === false ? null : head(),
        body))
      // Long tables render only the rows near the viewport of the table's scroll box (4.4).
      if (list.length > o.virtualFrom) {
        virtual = ui.virtual({
          host: body, items: list, estimate: 36, nav: !!o.row,
          render: (r, i) => { const el = tr(r); el.setAttribute('aria-rowindex', String(i + (o.head === false ? 1 : 2))); return el },
          spacer: () => h('tr', null, h('td', { colspan: String(cols.length) })),
        })
      } else body.append(...list.map(tr))
      requestAnimationFrame(fit)
    }
    const api = Object.assign(wrap, {
      update(next) { rows = next ?? []; draw(); return wrap },
      sortBy(next) { sort = next; draw(); return wrap },
    })
    draw()
    return api
  }

  // ── Virtual list ────────────────────────────────────────────────────────
  /**
   * ui.virtual({ host, items, render, key, estimate, nav, spacer }) — render
   * only the rows near the viewport of the nearest scrolling ancestor (4.4).
   *   host:     element the rows go into (a list <div> or a <tbody>)
   *   render:   (item, index) → element; called once per item while it is near
   *   key:      (item, index) → stable key (default: index); keeps measured
   *             heights and reuses nodes across update()
   *   estimate: row height in px before a row is measured (default 34)
   *   nav:      true → ↑/↓/Home/End move focus by item, scrolling as needed
   *   spacer:   () → element filling the space of unrendered rows (default
   *             a <div>; tables pass a <tr> with one cell)
   * Rendered rows stay contiguous: the window grows and shrinks at its ends,
   * so the focused row is never re-created while it stays near.
   * Returns { update(items), scrollTo(i), focusIndex(i), indexOf(el), redraw() }.
   */
  const VIRTUAL_BUFFER = 600
  ui.virtual = function virtual(o) {
    const host = o.host
    const keyOf = o.key ?? ((_, i) => i)
    const estimate = o.estimate ?? 34
    const mk = () => { const sp = o.spacer ? o.spacer() : h('div'); sp.classList.add('v-spacer'); sp.setAttribute('aria-hidden', 'true'); return sp }
    const top = mk(), bottom = mk()
    host.append(top, bottom)
    let items = o.items ?? []
    let offsets = [0]
    const heights = new Map()
    let rs = 0, re = -1 // rendered range
    const nodes = new Map() // index → element
    let scroller = null
    let frame = 0
    const findScroller = () => {
      for (let el = host; el && el !== document.body; el = el.parentElement) {
        const oy = getComputedStyle(el).overflowY
        if (oy === 'auto' || oy === 'scroll') return el
      }
      return null
    }
    const recompute = () => {
      offsets = new Array(items.length + 1)
      offsets[0] = 0
      for (let i = 0; i < items.length; i++) offsets[i + 1] = offsets[i] + (heights.get(keyOf(items[i], i)) ?? estimate)
    }
    // First index whose bottom edge lies below y.
    const indexAt = y => {
      let lo = 0, hi = items.length - 1
      while (lo < hi) { const mid = (lo + hi) >> 1; if (offsets[mid + 1] <= y) lo = mid + 1; else hi = mid }
      return lo
    }
    const viewport = () => {
      if (scroller) { const r = scroller.getBoundingClientRect(); return [r.top, r.bottom] }
      return [0, window.innerHeight]
    }
    const make = i => {
      const el = o.render(items[i], i)
      el.dataset.vi = String(i)
      nodes.set(i, el)
      return el
    }
    const drop = i => { nodes.get(i)?.remove(); nodes.delete(i) }
    const draw = () => {
      frame = 0
      if (!host.isConnected) return
      scroller ??= findScroller()
      if (!items.length) { for (const i of [...nodes.keys()]) drop(i); rs = 0; re = -1; top.style.height = '0px'; bottom.style.height = '0px'; return }
      const [vt, vb] = viewport()
      const base = top.getBoundingClientRect().top
      let s = indexAt(Math.max(0, vt - base - VIRTUAL_BUFFER))
      let e = indexAt(Math.max(0, vb - base + VIRTUAL_BUFFER))
      // Keep the focused row alive while it is close to the window.
      const fi = focusedIndex()
      if (fi !== null && fi >= s - 50 && fi <= e + 50) { s = Math.min(s, fi); e = Math.max(e, fi) }
      if (re < rs || e < rs || s > re) {
        for (const i of [...nodes.keys()]) drop(i)
        const frag = document.createDocumentFragment()
        for (let i = s; i <= e; i++) frag.appendChild(make(i))
        bottom.before(frag)
      } else {
        for (let i = rs; i < s; i++) drop(i)
        for (let i = e + 1; i <= re; i++) drop(i)
        const head = document.createDocumentFragment()
        for (let i = s; i < Math.min(rs, e + 1); i++) head.appendChild(make(i))
        top.after(head)
        const tail = document.createDocumentFragment()
        for (let i = Math.max(re + 1, s); i <= e; i++) tail.appendChild(make(i))
        bottom.before(tail)
      }
      rs = s; re = e
      // Measure what is rendered; re-run once when the estimates were off.
      let changed = false
      for (let i = s; i <= e; i++) {
        const k = keyOf(items[i], i), hgt = nodes.get(i).offsetHeight
        if (hgt && heights.get(k) !== hgt) { heights.set(k, hgt); changed = true }
      }
      if (changed) recompute()
      top.style.height = `${offsets[s]}px`
      bottom.style.height = `${offsets[items.length] - offsets[e + 1]}px`
      if (changed && !draw.again) { draw.again = true; draw(); draw.again = false }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(draw) }
    const focusedIndex = () => {
      const a = document.activeElement
      if (!a || !host.contains(a)) return null
      const row = a.closest('[data-vi]')
      return row && host.contains(row) ? Number(row.dataset.vi) : null
    }
    const onScroll = e => { if (e.target === document || e.target.contains?.(host)) schedule() }
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', schedule)
    const api = {
      update(next) {
        items = next ?? []
        for (const i of [...nodes.keys()]) drop(i)
        rs = 0; re = -1
        recompute()
        draw()
        return api
      },
      /** Bring item i into view (block: nearest) and render it. */
      scrollTo(i) {
        if (i < 0 || i >= items.length) return
        scroller ??= findScroller()
        const [vt, vb] = viewport()
        const base = top.getBoundingClientRect().top
        const y0 = base + offsets[i], y1 = base + offsets[i + 1]
        const delta = y0 < vt ? y0 - vt : y1 > vb ? y1 - vb : 0
        if (delta) { if (scroller) scroller.scrollTop += delta; else window.scrollBy(0, delta) }
        draw()
      },
      focusIndex(i) {
        i = Math.max(0, Math.min(items.length - 1, i))
        api.scrollTo(i)
        const el = nodes.get(i)
        const target = el?.matches(o.navTarget ?? '*') ? el : el?.querySelector(o.navTarget ?? 'button, a[href], [tabindex]')
        ;(target ?? el)?.focus({ preventScroll: true })
      },
      indexOf(el) { const row = el?.closest?.('[data-vi]'); return row ? Number(row.dataset.vi) : -1 },
      redraw: schedule,
      dispose() { document.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', schedule) },
    }
    if (o.nav) {
      host.addEventListener('keydown', e => {
        if (e.altKey || e.ctrlKey || e.metaKey) return
        const k = e.key
        if (k !== 'ArrowDown' && k !== 'ArrowUp' && k !== 'Home' && k !== 'End') return
        const i = api.indexOf(e.target)
        if (i < 0) return
        // Skip rows that take no focus (group headers).
        const first = (from, d) => { let j = from; while (j >= 0 && j < items.length && o.skip?.(items[j])) j += d; return j }
        const d = k === 'ArrowDown' ? 1 : -1
        const j = k === 'Home' ? first(0, 1) : k === 'End' ? first(items.length - 1, -1) : first(i + d, d)
        if (j < 0 || j >= items.length) return
        e.preventDefault()
        e.stopPropagation()
        api.focusIndex(j)
      })
    }
    recompute()
    // The host may not be in the document (or visible) yet: draw once it is laid out.
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(host)
    requestAnimationFrame(draw)
    return api
  }

  // ── Tab panes ───────────────────────────────────────────────────────────
  /**
   * ui.panes(host, owner, fields) — keep the DOM of tabs already rendered
   * (UI/UX roadmap 4.5). Showing a tab again re-attaches its pane instead of
   * rendering it anew; the owner's per-tab fields (filter bar, redraw
   * callback…) and the scroll position travel with the pane. Hidden panes
   * are detached, so lookups in the view see the active tab only.
   *   show(key, build, scroller) → { el, fresh }  build(el) renders a new pane
   *   drop(key)        forget a pane (Retry, state that needs a rebuild)
   *   holds(el)        el belongs to a kept pane (async work may finish there)
   *   assign(el, obj)  set owner fields from async work of the pane holding el
   * At most `max` (8) panes are kept; the least recently shown goes first.
   */
  ui.panes = function panes(host, owner, fields, o = {}) {
    const max = o.max ?? 8
    const cache = new Map()
    let current = null, currentKey = null
    const entryOf = el => [...cache.values()].find(e => e.el.contains(el)) ?? null
    const api = {
      get key() { return currentKey },
      show(key, build, scroller) {
        if (current) { current.state = Object.fromEntries(fields.map(f => [f, owner[f]])); current.scroll = scroller?.scrollTop ?? 0 }
        let entry = cache.get(key)
        const fresh = !entry
        if (fresh) entry = { el: h('div', { class: 'pane' }), state: null, scroll: 0 }
        cache.delete(key)
        cache.set(key, entry)
        if (entry.el.parentNode !== host) { clear(host); host.appendChild(entry.el) }
        current = entry
        currentKey = key
        for (const f of fields) owner[f] = entry.state?.[f] ?? null
        if (fresh) build(entry.el)
        if (scroller) scroller.scrollTop = entry.scroll
        for (const [k, e] of cache) { if (cache.size <= max) break; if (e !== current) cache.delete(k) }
        return { el: entry.el, fresh }
      },
      drop(key) { const e = cache.get(key); cache.delete(key); if (e && e === current) { current = null; currentKey = null } },
      holds(el) { return !!entryOf(el) },
      assign(el, patch) {
        const e = entryOf(el)
        if (!e) return false
        if (e === current) Object.assign(owner, patch)
        else e.state = { ...(e.state ?? {}), ...patch }
        return true
      },
    }
    return api
  }

  // ── FilterBar ───────────────────────────────────────────────────────────
  /**
   * ui.filterBar({ key, placeholder, label, chips, chipKey, onChange, extra })
   *   key:      route key of the text filter (default 'q')
   *   chips:    [{ id, label, count?, title? }] single-choice chips; the choice
   *             lives in route key `chipKey` (default 'm'); click again = off
   *   onChange: () → void after any change (text, chip, reset)
   *   extraKeys / isActive / onReset: filters living in `extra` (their route
   *             keys, "is any of them set", clear their state) so Reset covers them
   * Returns { el, input, query(), chip(), sync(params) → changed, setChips(chips),
   *           reset(), refresh() } — refresh() re-evaluates the Reset button.
   * Typing and chips rewrite the current history entry (router.replace).
   */
  ui.filterBar = function filterBar(opts) {
    const o = { key: 'q', chipKey: 'm', ...opts }
    const input = h('input', { class: 'input', type: 'search', placeholder: o.placeholder ?? '', 'aria-label': o.label ?? o.placeholder ?? '' })
    const chipsEl = h('div', { class: 'chips filter-chips', role: 'group', 'aria-label': o.chipsLabel ?? null })
    const reset = h('button', { class: 'btn small filter-reset', hidden: true, onclick: () => api.reset() }, svgIcon('x'), t('ui.reset'))
    const el = h('div', { class: 'filter-bar' },
      h('div', { class: 'filter-row' }, h('div', { class: 'input-wrap grow' }, svgIcon('search'), input), reset),
      chipsEl, o.extra ?? null)
    let chips = o.chips ?? []
    let chip = ''
    const active = () => !!(input.value.trim() || chip || o.isActive?.())
    const changed = () => { reset.hidden = !active(); o.onChange?.() }
    const drawChips = () => {
      clear(chipsEl)
      chipsEl.hidden = !chips.length
      for (const c of chips) {
        const on = chip === c.id
        chipsEl.appendChild(h('button', {
          class: ['chip', 'link', on ? 'on' : null], 'aria-pressed': String(on), title: c.title ?? null,
          onclick: () => { chip = on ? '' : c.id; router().replace({ [o.chipKey]: chip || null }); drawChips(); changed() },
        }, c.label, c.count !== undefined ? h('span', { class: 'count' }, c.count) : null))
      }
    }
    input.addEventListener('input', util.debounce(() => { router().replace({ [o.key]: input.value.trim() ? input.value : null }); changed() }, 120))
    const api = {
      el, input,
      query() { return input.value.trim().toLowerCase() },
      chip() { return chip },
      setChips(next) { chips = next ?? []; if (chip && !chips.some(c => c.id === chip)) chip = ''; drawChips() },
      /** Take the filter state from the route; true when it changed. */
      sync(params) {
        const q = params[o.key] ?? ''
        const c = chips.some(x => x.id === params[o.chipKey]) ? params[o.chipKey] : ''
        const diff = input.value !== q || chip !== c
        input.value = q
        chip = c
        drawChips()
        reset.hidden = !active()
        return diff
      },
      reset() {
        input.value = ''
        chip = ''
        o.onReset?.()
        router().replace({ [o.key]: null, [o.chipKey]: null, ...Object.fromEntries((o.extraKeys ?? []).map(k => [k, null])) })
        drawChips()
        changed()
        input.focus()
      },
      refresh() { reset.hidden = !active() },
    }
    drawChips()
    return api
  }

  // ── Copy ────────────────────────────────────────────────────────────────
  /**
   * ui.copyButton(getText, { label, title, iconOnly, done, className })
   * The one copy feedback: the button turns "done" for a moment and the
   * global toast (role=status) announces it. getText may return a promise.
   */
  ui.copyButton = function copyButton(getText, opts = {}) {
    const title = opts.title ?? opts.label ?? t('copy')
    const btn = h('button', {
      class: [opts.iconOnly ? 'icon-btn' : 'btn small', 'copy-btn', opts.className ?? null],
      title, 'aria-label': opts.iconOnly ? title : null,
    }, svgIcon('copy'), opts.iconOnly ? null : h('span', null, opts.label ?? t('copy')))
    btn.addEventListener('click', async e => {
      e.stopPropagation()
      try {
        await util.copy(await getText())
        btn.classList.add('done')
        ui.toast(opts.done ?? t('ui.copied'))
        clearTimeout(btn._t)
        btn._t = setTimeout(() => btn.classList.remove('done'), 1400)
      } catch { ui.toast(t('ui.copyFailed')) }
    })
    return btn
  }
  /** Code block with a copy button in its corner. */
  ui.codeCopy = function codeCopy(text, lang) {
    const body = String(text ?? '').trim()
    return h('div', { class: 'code-copy' }, ui.code(body, lang), ui.copyButton(() => body, { iconOnly: true, className: 'copy-corner' }))
  }

  // ── Empty and error states ──────────────────────────────────────────────
  /**
   * ui.emptyState({ icon, title, text, action: { label, onClick }, compact })
   * Explains why there is nothing to show and, when possible, what to do.
   */
  ui.emptyState = function emptyState(o = {}) {
    return h('div', { class: ['state-box', o.compact ? 'compact' : null, o.tone ?? null], role: o.role ?? null },
      o.icon !== false ? h('span', { class: 'state-icon', 'aria-hidden': 'true' }, svgIcon(o.icon ?? 'search')) : null,
      o.title ? h('div', { class: 'state-title' }, o.title) : null,
      o.text ? h('div', { class: 'state-text' }, o.text) : null,
      o.action ? h('button', { class: 'btn small', onclick: o.action.onClick }, o.action.icon ? svgIcon(o.action.icon) : null, o.action.label) : null,
      o.extra ?? null)
  }
  /** Filters left nothing: the empty state with "Reset filters". */
  ui.noMatches = function noMatches(onReset) {
    return ui.emptyState({ icon: 'filter', text: t('search.empty'), compact: true, action: onReset ? { label: t('ui.resetFilters'), onClick: onReset } : null })
  }
  /**
   * ui.errorState(err, { title, retry })
   * A data file failed to load (or parse): a human explanation, the raw
   * message folded away, and "Retry" when the caller can try again.
   */
  ui.errorState = function errorState(err, o = {}) {
    const msg = String(err?.message ?? err ?? '')
    return ui.emptyState({
      icon: 'info', tone: 'error', role: 'alert',
      title: o.title ?? t('ui.loadFailed'),
      text: o.text ?? t('ui.loadFailed.d'),
      action: o.retry ? { label: t('ui.retry'), icon: 'refresh', onClick: o.retry } : null,
      extra: msg ? h('details', { class: 'state-details' }, h('summary', null, t('ui.details')), h('code', null, msg)) : null,
    })
  }
  /**
   * ui.skeleton(shape, { title, status }) — grey blocks in the shape of the
   * content that is loading (4.2): 'reference' (list + detail), 'narrative'
   * (page with tabs and cards), 'canvas' (side panel + drawing area) or
   * 'detail' (the detail panel). `status` adds the loading stages.
   */
  ui.skeleton = function skeleton(shape, o = {}) {
    const bar = cls => h('span', { class: ['sk', cls] })
    const lines = (n, cls = 'sk-line') => Array.from({ length: n }, (_, i) => h('span', { class: ['sk', cls, i === n - 1 ? 'sk-short' : null] }))
    let body
    if (shape === 'reference') {
      body = h('div', { class: 'sk-reference' },
        h('div', { class: 'sk-list' }, bar('sk-input'), Array.from({ length: 9 }, () => h('div', { class: 'sk-row' }, bar('sk-dot'), h('div', { class: 'sk-col' }, lines(2))))),
        h('div', { class: 'sk-detail' }, bar('sk-title'), lines(4), bar('sk-block'), lines(3)))
    } else if (shape === 'canvas') {
      body = h('div', { class: 'sk-canvas' }, h('div', { class: 'sk-side' }, Array.from({ length: 5 }, () => h('div', { class: 'sk-col' }, bar('sk-label'), bar('sk-input')))), h('div', { class: 'sk-area' }))
    } else if (shape === 'detail') {
      body = h('div', { class: 'sk-panel' }, bar('sk-title'), lines(2), h('div', { class: 'sk-chips' }, Array.from({ length: 4 }, () => bar('sk-chip'))), lines(5), bar('sk-block'))
    } else {
      body = h('div', { class: 'sk-narrative' }, bar('sk-title'), lines(2), h('div', { class: 'sk-tabs' }, Array.from({ length: 4 }, () => bar('sk-tab'))),
        h('div', { class: 'sk-cards' }, Array.from({ length: 6 }, () => h('div', { class: 'sk-card' }, bar('sk-label'), lines(3)))))
    }
    return h('div', { class: ['skeleton', `sk-${shape}-wrap`] },
      o.status ? ui.loadStatus() : null,
      h('div', { 'aria-hidden': 'true' }, body))
  }
  /**
   * Loading stages of the data parts and libraries (4.2): a live region that
   * names what is loading, with one step per part.
   */
  ui.loadStatus = function loadStatus() {
    const el = h('div', { class: 'load-status', role: 'status', 'aria-live': 'polite' })
    const render = () => {
      if (!el.isConnected && el.dataset.drawn) { off.forEach(fn => fn()); return }
      el.dataset.drawn = '1'
      const stages = DSHMap.data.stages()
      const active = stages.find(x => x.active) ?? stages.find(x => !x.done)
      const done = stages.filter(x => x.done).length
      clear(el).append(
        h('div', { class: 'spinner', 'aria-hidden': 'true' }),
        h('span', { class: 'load-text' }, active ? t('load.stage', { stage: t(`load.part.${active.name}`), n: done + 1, total: stages.length }) : t('loading')),
        h('ol', { class: 'load-steps', 'aria-hidden': 'true' }, stages.map(x => h('li', { class: x.done ? 'done' : x.active ? 'active' : null }, t(`load.part.${x.name}`)))))
    }
    const off = ['data-loading', 'data-part', 'data-failed'].map(evt => DSHMap.on(evt, render))
    render()
    return el
  }
  /** Loading placeholder with a label. */
  ui.loading = function loading(text) {
    return h('div', { class: 'loading', role: 'status' }, h('div', { class: 'spinner', 'aria-hidden': 'true' }), text ?? t('loading'))
  }

  // ── Selection ───────────────────────────────────────────────────────────
  /**
   * One selection style for list rows, cards, slots and layers:
   * `.is-selected` plus aria-current (or aria-selected for options).
   */
  ui.select = function select(el, on, opts = {}) {
    if (!el) return el
    el.classList.toggle('is-selected', !!on)
    const attr = opts.attr ?? 'aria-current'
    if (on) el.setAttribute(attr, 'true'); else el.removeAttribute(attr)
    return el
  }
  /** Mark exactly one element inside `root` (or none). */
  ui.selectOnly = function selectOnly(root, target, opts) {
    for (const el of root.querySelectorAll('.is-selected')) if (el !== target) ui.select(el, false, opts)
    if (target) ui.select(target, true, opts)
  }
  /** aria-current of a selectable element, for h(); add the `is-selected` class yourself. */
  ui.selAttrs = function selAttrs(on) { return on ? { 'aria-current': 'true' } : {} }

  // ── Tabs ────────────────────────────────────────────────────────────────
  /**
   * ui.tabs(items, current, onPick, label, className) — items: [[id, label, count?]].
   * A .seg strip; a11y.js gives it the tablist roles and arrow keys.
   */
  ui.tabs = function tabs(items, current, onPick, label, className) {
    return h('div', { class: ['seg', className ?? null], 'aria-label': label ?? null }, items.map(([id, text, count]) =>
      h('button', { class: id === current ? 'on' : null, onclick: () => onPick(id) }, text, count !== undefined ? h('span', { class: 'seg-count' }, count) : null)))
  }

  // ── Layouts (3.5) ───────────────────────────────────────────────────────
  ui.layout = {
    /**
     * Reference (master/detail): a filterable list on the left, the selected
     * entity on the right. Returns { root, head, title, count, list, detail }.
     * opts: { title, className, head: [nodes under the title] }
     */
    reference(el, opts = {}) {
      const count = h('span', { class: 'count' })
      const title = h('h1', { class: 'ref-title' }, opts.title ?? '', count)
      const head = h('div', { class: 'md-list-head' }, title, opts.head ?? null)
      const list = h('div', { class: 'md-list-body' })
      const detail = h('div', { class: 'md-detail' })
      const root = h('div', { class: ['md-view', 'layout-reference', opts.className ?? null] },
        h('div', { class: 'md-list' }, head, list), detail)
      el.appendChild(root)
      return { root, head, title, count, list, detail }
    },
    /**
     * Narrative: a scrolling page with a title, optional lead and tab strip.
     * Returns { root, header, tabs, body }; render(...) refills header + body.
     * opts: { className }
     */
    narrative(el, opts = {}) {
      const header = h('div', { class: 'page-head' })
      const body = h('div', { class: 'page-body' })
      const root = h('div', { class: ['page', 'layout-narrative', opts.className ?? null] }, header, body)
      el.appendChild(root)
      return {
        root, header, body,
        /** Title row: <h1>, then tabs and tools; lead paragraph below. */
        head({ title, tabs, tools, lead }) {
          // The visible title replaces the shell's hidden fallback <h1>.
          const view = root.parentElement
          view?.querySelector(':scope > h1.sr-only[data-i18n]')?.remove()
          view?.removeAttribute('aria-label')
          clear(header).append(...[
            h('div', { class: 'page-head-row' }, h('h1', { class: 'page-title' }, title), tabs ?? null, tools ? h('div', { class: 'page-tools' }, tools) : null),
            lead ? h('p', { class: 'page-lead' }, lead) : null].filter(Boolean))
          return header
        },
      }
    },
  }
})()
