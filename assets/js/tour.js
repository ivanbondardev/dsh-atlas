/* DSH Map — data-driven guided tours (generator/curated/tours.yaml).
 * A floating panel walks through steps; each step opens its target view and
 * highlights the entity. The active step survives reloads (localStorage). */
(function () {
  'use strict'
  const { h, clear, svgIcon, t, util, i18n } = DSHMap

  i18n.extend({
    uk: { 'tour.step': 'Крок {n} з {total}', 'tour.prev': 'Назад', 'tour.next': 'Далі', 'tour.done': 'Завершити', 'tour.open': 'Відкрити ціль', 'tour.close': 'Закрити тур', 'tour.minutes': '{n} хв', 'tour.start': 'Почати тур', 'tour.finished': 'Тур завершено. Інші тури — на сторінці «Почніть тут».' },
    en: { 'tour.step': 'Step {n} of {total}', 'tour.prev': 'Back', 'tour.next': 'Next', 'tour.done': 'Finish', 'tour.open': 'Open the target', 'tour.close': 'Close the tour', 'tour.minutes': '{n} min', 'tour.start': 'Start tour', 'tour.finished': 'Tour finished. More tours are on the “Start here” page.' },
  })

  const tour = DSHMap.tour = {
    id: null,
    step: 0,
    el: null,
    mount() {
      // Non-modal floating panel: a labelled region whose step text is announced politely.
      this.el = h('section', { class: 'tour-panel hidden', 'aria-label': t('a11y.tour') })
      document.body.appendChild(this.el)
      const saved = util.storage.get('tour', null)
      if (saved && DSHMap.model.tourById.has(saved.id)) { this.id = saved.id; this.step = saved.step ?? 0; this.render() }
      DSHMap.on('lang', () => this.render())
      // Step labels name entities of the `model` part.
      DSHMap.on('model', () => this.render())
    },
    get current() { return this.id ? DSHMap.model.tourById.get(this.id) : null },
    start(id, step = 0) {
      if (!DSHMap.model.tourById.has(id)) return
      this.id = id
      util.storage.set('tour.paused', null)
      this.go(step)
    },
    /** The unfinished tour to offer on "Start here": the active one or the last closed one. */
    resumable() {
      const r = this.id ? { id: this.id, step: this.step } : util.storage.get('tour.paused', null)
      const tr = r && DSHMap.model.tourById.get(r.id)
      if (!tr) return null
      return { tour: tr, step: Math.max(0, Math.min(tr.steps.length - 1, r.step ?? 0)) }
    },
    go(step) {
      const tr = this.current
      if (!tr) return
      this.step = Math.max(0, Math.min(tr.steps.length - 1, step))
      util.storage.set('tour', { id: this.id, step: this.step })
      this.render()
      DSHMap.emit('tour')
      DSHMap.nav.to(tr.steps[this.step].to)
    },
    next() {
      const tr = this.current
      if (!tr) return
      if (this.step >= tr.steps.length - 1) { this.stop(true); return }
      this.go(this.step + 1)
    },
    prev() { this.go(this.step - 1) },
    stop(finished = false) {
      // Closing mid-way keeps the position so "Start here" can offer to resume.
      util.storage.set('tour.paused', finished || !this.id ? null : { id: this.id, step: this.step })
      this.id = null
      util.storage.set('tour', null)
      DSHMap.emit('tour')
      this.el.classList.add('hidden')
      if (finished) {
        clear(this.el).appendChild(h('div', { class: 'tour-done', role: 'status' }, t('tour.finished')))
        this.el.classList.remove('hidden')
        setTimeout(() => { if (!this.id) this.el.classList.add('hidden') }, 3500)
      }
    },
    render() {
      const tr = this.current
      if (!this.el) return
      if (!tr) { this.el.classList.add('hidden'); return }
      const s = tr.steps[this.step]
      const last = this.step === tr.steps.length - 1
      // Keep keyboard focus on the same control across re-renders (Next/Back/dots).
      const focusKey = this.el.contains(document.activeElement) ? document.activeElement.dataset.focus : null
      this.el.setAttribute('aria-label', `${t('a11y.tour')}: ${i18n.pick(tr.title)}`)
      clear(this.el).append(
        h('div', { class: 'tour-head' },
          svgIcon('play'), h('b', { class: 'truncate' }, i18n.pick(tr.title)),
          h('span', { class: 'faint tiny nowrap' }, t('tour.step', { n: this.step + 1, total: tr.steps.length })),
          h('button', { class: 'icon-btn', title: t('tour.close'), 'aria-label': t('tour.close'), 'data-focus': 'close', onclick: () => this.stop() }, svgIcon('x'))),
        h('div', { class: 'tour-dots', role: 'group', 'aria-label': t('a11y.tour.steps') }, tr.steps.map((_, i) => h('button', {
          class: i === this.step ? 'on' : i < this.step ? 'past' : null, 'aria-current': i === this.step ? 'step' : null, 'data-focus': `dot-${i}`,
          'aria-label': `${t('tour.step', { n: i + 1, total: tr.steps.length })}: ${i18n.pick(tr.steps[i].title)}`, title: i18n.pick(tr.steps[i].title), onclick: () => this.go(i),
        }))),
        h('div', { 'aria-live': 'polite', 'aria-atomic': 'true' },
          h('div', { class: 'tour-title' }, i18n.pick(s.title)),
          DSHMap.ui.gtext('p', { class: 'tour-text' }, i18n.pick(s.text))),
        h('div', { class: 'tour-target' }, h('button', { class: 'link-btn', 'data-focus': 'target', onclick: () => DSHMap.nav.to(s.to), title: t('tour.open') }, svgIcon('target'), DSHMap.nav.label(s.to))),
        h('div', { class: 'tour-actions' },
          h('button', { class: 'btn small', 'data-focus': 'prev', disabled: this.step === 0 ? true : null, onclick: () => this.prev() }, t('tour.prev')),
          h('button', { class: 'btn small primary', 'data-focus': 'next', 'aria-keyshortcuts': 'Alt+ArrowRight', onclick: () => this.next() }, last ? t('tour.done') : t('tour.next'), last ? null : svgIcon('next'))))
      this.el.classList.remove('hidden')
      if (focusKey) (this.el.querySelector(`[data-focus="${focusKey}"]:not([disabled])`) ?? this.el.querySelector('[data-focus="next"]'))?.focus()
    },
  }

  document.addEventListener('keydown', e => {
    if (!tour.id || e.target.closest?.('input, textarea, [contenteditable]')) return
    if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); tour.next() }
    if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); tour.prev() }
  })
})()
