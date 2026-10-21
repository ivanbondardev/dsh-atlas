/* DSH Map — entry point. */
(function () {
  'use strict'
  const app = document.getElementById('app')
  const { h, t } = DSHMap

  function fatal(e, network = false) {
    console.error(e)
    // The core file did not arrive (offline, or never generated): Retry reloads the page (4.2).
    app.replaceChildren(DSHMap.ui.emptyState({
      icon: 'info', tone: 'error', role: 'alert', title: t('err.nodata.title'),
      action: network ? { label: t('ui.retry'), icon: 'refresh', onClick: () => location.reload() } : null,
      extra: h('p', null, `${t('err.nodata.hint')} `, h('code', null, 'cd generator && npm install && npm run build')),
    }))
  }

  let started = false
  function start() {
    if (started) return
    started = true
    try {
      DSHMap.model = DSHMap.buildModel()
    } catch (e) { fatal(e); return }
    DSHMap.shell.init()
    DSHMap.tour.mount()
    DSHMap.router.start()
    // The rest of the model loads after the first render, while the page is idle (4.1).
    const idle = window.requestIdleCallback ?? (fn => setTimeout(fn, 200))
    idle(() => DSHMap.data.need(DSHMap.data.ALL).catch(() => { /* views that need it show Retry */ }))
  }

  // The core part (dsh-data.js) is requested by index.html before the app scripts load.
  const boot = DSHMap.boot
  if (DSHMap.store.main) start()
  else if (boot?.state === 'failed') fatal(new Error(t('err.load', { src: boot.src })), true)
  else {
    DSHMap.on('data-core', start)
    // onload/onerror of the core script (index.html): loaded without data is a failure too.
    DSHMap.on('data-core-script', () => { if (!DSHMap.store.main && !started) { started = true; fatal(new Error(t('err.load', { src: boot?.src ?? 'dsh-data.js' })), boot?.state === 'failed') } })
  }
})()
