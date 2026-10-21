/* DSH Map — accessibility helpers: modal dialogs (focus trap and return),
 * `.seg` tab strips, roving focus in lists, visually hidden labels and a
 * polite live region. */
(function () {
  'use strict'
  const { h } = DSHMap

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
  /** Focusable descendants that are actually rendered. */
  function focusables(root) {
    return [...root.querySelectorAll(FOCUSABLE)].filter(el => el.getClientRects().length && !el.closest('[inert], .hidden'))
  }

  // ── modal dialogs ─────────────────────────────────────────────────────
  const stack = []
  /**
   * Make `el` a modal dialog. `open()` remembers the focused element, moves
   * focus inside (opts.initial, else the first focusable) and traps Tab;
   * `close()` gives focus back. Pass `modal: false` for a non-modal panel
   * (the detail drawer) that only returns focus.
   */
  function dialog(el, opts = {}) {
    const modal = opts.modal !== false
    el.setAttribute('role', 'dialog')
    if (modal) el.setAttribute('aria-modal', 'true')
    if (opts.labelledby) el.setAttribute('aria-labelledby', opts.labelledby)
    if (opts.label) el.setAttribute('aria-label', opts.label)
    if (!el.hasAttribute('tabindex')) el.tabIndex = -1
    const api = {
      el,
      returnTo: null,
      isOpen: false,
      open(initial) {
        if (!this.isOpen) {
          const active = document.activeElement
          this.returnTo = active && active !== document.body && !el.contains(active) ? active : null
          this.isOpen = true
          if (modal) stack.push(this)
        }
        const target = initial ?? opts.initial?.() ?? focusables(el)[0] ?? el
        setTimeout(() => target.focus({ preventScroll: true }), 0)
      },
      close() {
        if (!this.isOpen) return
        this.isOpen = false
        const i = stack.indexOf(this)
        if (i >= 0) stack.splice(i, 1)
        const back = this.returnTo
        this.returnTo = null
        // Return focus only when it is still inside the dialog (or lost).
        const active = document.activeElement
        if (back?.isConnected && (!active || active === document.body || el.contains(active))) back.focus({ preventScroll: true })
      },
    }
    return api
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !stack.length) return
    const top = stack[stack.length - 1]
    const items = focusables(top.el)
    if (!items.length) { e.preventDefault(); top.el.focus(); return }
    const first = items[0], last = items[items.length - 1]
    const inside = top.el.contains(document.activeElement)
    if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus() }
  }, true)

  // ── .seg tab strips ───────────────────────────────────────────────────
  // Every `.seg` is a tablist: buttons are tabs, `.on` is the selected one,
  // ←/→ (Home/End) move between them and activate, Tab enters on the selected tab.
  function syncSeg(seg) {
    if (seg.getAttribute('role') !== 'tablist') seg.setAttribute('role', 'tablist')
    const tabs = [...seg.children].filter(c => c.tagName === 'BUTTON')
    const hasOn = tabs.some(b => b.classList.contains('on'))
    tabs.forEach((b, i) => {
      const on = b.classList.contains('on')
      if (b.getAttribute('role') !== 'tab') b.setAttribute('role', 'tab')
      if (b.getAttribute('aria-selected') !== String(on)) b.setAttribute('aria-selected', String(on))
      const ti = on || (!hasOn && i === 0) ? '0' : '-1'
      if (b.getAttribute('tabindex') !== ti) b.setAttribute('tabindex', ti)
    })
  }
  function scan(root) {
    if (root.nodeType !== 1) return
    if (root.classList.contains('seg')) syncSeg(root)
    for (const s of root.querySelectorAll('.seg')) syncSeg(s)
  }
  // Code blocks scroll horizontally: make every <pre> focusable so it scrolls from the keyboard (WCAG 2.1.1).
  const focusPre = pre => { if (!pre.hasAttribute('tabindex') && !pre.closest('.code-lines')) pre.tabIndex = 0 }
  new MutationObserver(records => {
    const segs = new Set()
    for (const r of records) {
      if (r.type === 'attributes') { const p = r.target.parentElement; if (p?.classList.contains('seg')) segs.add(p); continue }
      if (r.target.classList?.contains('seg')) segs.add(r.target)
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue
        if (n.classList.contains('seg')) segs.add(n); else for (const s of n.querySelectorAll('.seg')) segs.add(s)
        if (n.tagName === 'PRE') focusPre(n); else for (const pre of n.querySelectorAll('pre')) focusPre(pre)
      }
    }
    segs.forEach(syncSeg)
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
  document.addEventListener('keydown', e => {
    const tab = e.target.closest?.('.seg > button')
    if (!tab || e.altKey || e.ctrlKey || e.metaKey) return
    const tabs = [...tab.parentElement.children].filter(c => c.tagName === 'BUTTON' && !c.disabled)
    const i = tabs.indexOf(tab)
    let j = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = tabs.length - 1
    if (j === null) return
    e.preventDefault()
    const next = tabs[j]
    const label = next.textContent
    next.click()
    // Most strips re-render on click: focus the new selected tab with the same label.
    setTimeout(() => {
      if (next.isConnected) { next.focus(); return }
      const again = [...document.querySelectorAll('.seg > button.on')].find(b => b.textContent === label && b.getClientRects().length)
      again?.focus()
    }, 0)
  })

  // ── roving focus inside a list ────────────────────────────────────────
  /**
   * ↑/↓ (Home/End) move focus between `selector` items inside `root`
   * (master lists, file trees). Items stay in the Tab order.
   */
  function arrowNav(root, selector) {
    root.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const k = e.key
      if (k !== 'ArrowDown' && k !== 'ArrowUp' && k !== 'Home' && k !== 'End') return
      const cur = e.target.closest(selector)
      if (!cur || !root.contains(cur)) return
      const items = [...root.querySelectorAll(selector)].filter(el => el.getClientRects().length)
      const i = items.indexOf(cur)
      const j = k === 'Home' ? 0 : k === 'End' ? items.length - 1 : i + (k === 'ArrowDown' ? 1 : -1)
      if (j < 0 || j >= items.length) return
      e.preventDefault()
      items[j].focus()
    })
    return root
  }

  // ── labels and announcements ──────────────────────────────────────────
  let uid = 0
  /** Unique element id with a prefix. */
  function id(prefix = 'a11y') { uid += 1; return `${prefix}-${uid}` }
  /** Visually hidden <label> for a control (the placeholder alone is not a label). */
  function label(text, control) {
    if (!control.id) control.id = id('f')
    return h('label', { class: 'sr-only', for: control.id }, text)
  }
  /** Wrap a control with a visually hidden label: returns [label, control]. */
  function labelled(text, control) { return [label(text, control), control] }

  let live = null
  /** Polite screen reader announcement. */
  function announce(text) {
    if (!live) { live = h('div', { class: 'sr-only', 'aria-live': 'polite', role: 'status' }); document.body.appendChild(live) }
    live.textContent = ''
    setTimeout(() => { live.textContent = text }, 30)
  }

  /** User asked the OS for less motion (re-read on every use: it can change live). */
  const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  DSHMap.a11y = { dialog, focusables, syncSeg, scan, arrowNav, id, label, labelled, announce, reducedMotion }
})()
