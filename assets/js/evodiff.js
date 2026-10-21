/* DSH Map — version fingerprints: ordering of release versions and the diff
 * of two fingerprints (roadmap 4.1). Shared by the browser ("What's new") and
 * the generator (API churn for the stability index, tests).
 *
 * A fingerprint is the compact entity inventory of one DSH tree, written by
 * generator/lib/fingerprint.mjs (FP_SCHEMA there):
 *   packages      { id: [version, dir] }
 *   services      { key: { mode, owner, methods: { name: signature } } }
 *   events        { name: [mode, signature] }
 *   sessionEvents { name: [kind, hash] }
 *   tools         { name: [pkg, [param…], hash] }
 *   config        { pkg: { field: type } }
 *   profiles      { name: { m: { pkg: state }, l: [pkg…] } }
 *   slots, commands, env  [name…]
 *   cli           { command: [flag…] }
 *   symbols       { pkg: { key: [kind, sigHash] } }
 *   errors        { kind: message }   kinds that could not be extracted
 * A kind that is missing (or listed in `errors`) on either side is reported
 * as not comparable instead of as wholesale additions or removals.
 *
 * Classic script: in the browser it defines `DSHEvo`; in Node it is evaluated
 * with a CommonJS `module` (see generator/lib/fingerprint.mjs). */
(function (root, factory) {
  if (typeof module === 'object' && module && module.exports) module.exports = factory()
  else root.DSHEvo = factory()
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict'

  const KINDS = ['packages', 'services', 'events', 'sessionEvents', 'tools', 'config', 'profiles', 'slots', 'commands', 'cli', 'env', 'symbols']
  const PRE_RANK = { alpha: 0, beta: 1, rc: 2 }

  /** `dsh-v0.2.1-rc.2`, `v0.2.1-rc.2` or `0.2.1-rc.2` → comparable parts; null when not a version. */
  function parseVersion(v) {
    const m = /^(?:dsh-)?v?(\d+)\.(\d+)\.(\d+)(?:-([a-z]+)\.?(\d+)?)?$/.exec(String(v ?? '').trim())
    if (!m) return null
    return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ?? null, n: m[5] ? +m[5] : 0, line: `${m[1]}.${m[2]}.${m[3]}` }
  }

  /** Semver order with prerelease ranks alpha < beta < rc < release; unparsable versions sort first. */
  function compareVersions(a, b) {
    const x = parseVersion(a), y = parseVersion(b)
    if (!x || !y) return (x ? 1 : 0) - (y ? 1 : 0)
    for (const k of ['major', 'minor', 'patch']) if (x[k] !== y[k]) return x[k] - y[k]
    if (x.pre !== y.pre) {
      if (!x.pre) return 1
      if (!y.pre) return -1
      return (PRE_RANK[x.pre] ?? -1) - (PRE_RANK[y.pre] ?? -1) || x.pre.localeCompare(y.pre)
    }
    return x.n - y.n
  }

  const keys = o => (Array.isArray(o) ? o : Object.keys(o ?? {}))
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

  /** Added / removed / changed keys of two records (or two lists). */
  function setDiff(a, b, changed) {
    const ka = new Set(keys(a)), kb = new Set(keys(b))
    const out = { added: [...kb].filter(k => !ka.has(k)).sort(), removed: [...ka].filter(k => !kb.has(k)).sort(), changed: [] }
    if (changed && !Array.isArray(a)) {
      for (const k of [...ka].filter(x => kb.has(x)).sort()) {
        const c = changed(a[k], b[k], k)
        if (c) out.changed.push(c)
      }
    }
    return out
  }
  const isEmpty = d => !d || (!d.added?.length && !d.removed?.length && !d.changed?.length)

  const comparable = (a, b, kind) => a && b && a[kind] !== undefined && a[kind] !== null && b[kind] !== undefined && b[kind] !== null && !a.errors?.[kind] && !b.errors?.[kind]

  /**
   * Diff two fingerprints (from → to).
   * @returns {{ unavailable: string[], counts: Record<string, { added: number, removed: number, changed: number }>, [kind: string]: any }}
   */
  function diffFingerprints(a, b) {
    const out = { unavailable: [] }
    const run = (kind, fn) => {
      if (!comparable(a, b, kind)) { out.unavailable.push(kind); out[kind] = null; return }
      out[kind] = fn(a[kind], b[kind])
    }
    run('packages', (x, y) => setDiff(x, y, (p, q, id) => (p[1] !== q[1] ? { id, dirFrom: p[1], dirTo: q[1] } : null)))
    run('services', (x, y) => setDiff(x, y, (p, q, key) => {
      const m = setDiff(p.methods, q.methods, (s, t, name) => (s !== t ? { name, from: s, to: t } : null))
      const c = { key, modeFrom: p.mode, modeTo: q.mode, ownerFrom: p.owner, ownerTo: q.owner, methods: m }
      return p.mode !== q.mode || p.owner !== q.owner || !isEmpty(m) ? c : null
    }))
    run('events', (x, y) => setDiff(x, y, (p, q, name) => (p[0] !== q[0] || (p[1] && q[1] && p[1] !== q[1]) ? { name, modeFrom: p[0], modeTo: q[0], sigFrom: p[1], sigTo: q[1] } : null)))
    run('sessionEvents', (x, y) => setDiff(x, y, (p, q, name) => (p[0] !== q[0] || p[1] !== q[1] ? { name, kindFrom: p[0], kindTo: q[0], shape: p[1] !== q[1] } : null)))
    run('tools', (x, y) => setDiff(x, y, (p, q, name) => {
      const params = setDiff(p[1], q[1])
      return p[0] !== q[0] || !isEmpty(params) || p[2] !== q[2] ? { name, pkgFrom: p[0], pkgTo: q[0], params, schema: p[2] !== q[2] } : null
    }))
    run('config', (x, y) => {
      const d = setDiff(x, y, (p, q, pkg) => {
        const f = setDiff(p, q, (s, t, field) => (s !== t ? { field, from: s, to: t } : null))
        return isEmpty(f) ? null : { pkg, fields: f }
      })
      d.fields = 0
      for (const c of d.changed) d.fields += c.fields.added.length + c.fields.removed.length + c.fields.changed.length
      return d
    })
    run('profiles', (x, y) => {
      const d = setDiff(x, y, (p, q, name) => {
        const mounted = setDiff(p.m, q.m, (s, t, pkg) => (s !== t ? { pkg, from: s, to: t } : null))
        const loaded = setDiff(p.l, q.l)
        return isEmpty(mounted) && isEmpty(loaded) ? null : { name, mounted, loaded }
      })
      return d
    })
    for (const k of ['slots', 'commands', 'env']) run(k, (x, y) => setDiff(x, y))
    run('cli', (x, y) => setDiff(x, y, (p, q, command) => { const f = setDiff(p, q); return isEmpty(f) ? null : { command, flags: f } }))
    run('symbols', (x, y) => {
      const d = setDiff(x, y, (p, q, pkg) => {
        const s = setDiff(p, q, (u, v, key) => (u[1] !== v[1] || u[0] !== v[0] ? { key, kindFrom: u[0], kindTo: v[0] } : null))
        return isEmpty(s) ? null : { pkg, ...s }
      })
      d.symbols = { added: 0, removed: 0, changed: 0 }
      for (const c of d.changed) { d.symbols.added += c.added.length; d.symbols.removed += c.removed.length; d.symbols.changed += c.changed.length }
      for (const id of d.added) d.symbols.added += Object.keys(y[id]).length
      for (const id of d.removed) d.symbols.removed += Object.keys(x[id]).length
      return d
    })
    out.counts = {}
    for (const k of KINDS) {
      const d = out[k]
      if (!d) continue
      out.counts[k] = { added: d.added.length, removed: d.removed.length, changed: d.changed.length }
    }
    return out
  }

  /**
   * Packages whose public API moved between two fingerprints: public symbols,
   * owned service methods, tool parameters or config fields.
   * @returns {Set<string>}
   */
  function apiChangedPackages(diff, toFp) {
    const out = new Set()
    for (const c of diff.symbols?.changed ?? []) out.add(c.pkg)
    for (const c of diff.config?.changed ?? []) out.add(c.pkg)
    for (const c of diff.tools?.changed ?? []) if (c.pkgTo) out.add(c.pkgTo)
    for (const c of diff.services?.changed ?? []) {
      const owner = toFp?.services?.[c.key]?.owner
      if (owner) out.add(owner)
    }
    return out
  }

  return { KINDS, parseVersion, compareVersions, diffFingerprints, apiChangedPackages, setDiff, isEmpty }
})
