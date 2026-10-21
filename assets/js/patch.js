/* DSH Map — Cordis Loader patch engine shared by the browser (patch sandbox,
 * "Configure" snippets) and the generator (snippet verification).
 *
 * Mirrors `applyEntryPatches` (vendor/include/src/index.ts) and the dialect
 * reference (packages/preset/agent-preset/skills/cordis-composition-reference):
 * `insert: [rows]` appends rows (into a `group: true` row when the op names
 * its id); an op with an `id` and no
 * `insert` replaces the supplied fields of that row — `config` wholesale —
 * and a truthy `name` asserts the existing plugin name. Rows use the map's
 * normalized shape (generator/lib/composition.mjs): { id, spec, pkg, state,
 * expr, origin, overrides, inject, isolate, group, config (YAML text),
 * children, presetId }.
 *
 * Classic script: in the browser it defines `DSHPatch.create(jsyaml)`; in
 * Node it is evaluated with a CommonJS `module` (see generator/lib/customize.mjs). */
(function (root, factory) {
  if (typeof module === 'object' && module && module.exports) module.exports = factory()
  else root.DSHPatch = factory()
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict'

  /** Fields a patch op or a row may carry (Loader dialect). */
  const OP_KEYS = new Set(['id', 'insert', 'name', 'config', 'disabled', 'inject', 'intercept', 'isolate', 'group'])
  const ROW_KEYS = new Set(['id', 'name', 'config', 'disabled', 'inject', 'intercept', 'isolate', 'group'])
  const JS_PREFIX = /^\s*!{1,2}js\b/

  /**
   * @param {object} yaml js-yaml 4 (window.jsyaml in the browser)
   */
  function create(yaml) {
    const JsType = new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: data => ({ __js: String(data) }) })
    const SCHEMA = yaml.DEFAULT_SCHEMA.extend([JsType])
    const isJs = v => !!v && typeof v === 'object' && !Array.isArray(v) && '__js' in v

    // ── YAML in and out ─────────────────────────────────────────────────
    /** Dump a value as YAML with real `!!js` tags. */
    function dump(value, indent = 0) {
      if (value === undefined) return ''
      // Expressions travel as marked strings (one line), then the marker is
      // swapped for the tag followed by the expression as a YAML scalar.
      const marker = '@@JS@@'
      const swap = v => {
        if (isJs(v)) return `${marker}${v.__js.replace(/\s*\n\s*/g, ' ')}`
        if (Array.isArray(v)) return v.map(swap)
        if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]))
        return v
      }
      const scalar = s => yaml.dump(s, { lineWidth: -1 }).trimEnd()
      let text
      try { text = yaml.dump(swap(value), { lineWidth: -1, noRefs: true }).trimEnd() } catch { text = JSON.stringify(value, null, 2) }
      text = text
        .replace(/'@@JS@@((?:[^']|'')*)'/g, (_, body) => `!!js ${scalar(body.replace(/''/g, "'"))}`)
        .replace(/"@@JS@@((?:[^"\\]|\\.)*)"/g, (_, body) => { let s = body; try { s = JSON.parse(`"${body}"`) } catch { /* keep raw */ } return `!!js ${scalar(s)}` })
        .replace(/(^|[\s:-])@@JS@@(.*)$/gm, (_, pre, body) => `${pre}!!js ${scalar(body)}`)
      const pad = ' '.repeat(indent)
      return indent ? text.split('\n').map(l => (l ? pad + l : l)).join('\n') : text
    }

    /** Parse the map's stored row config (YAML whose `!!js` became '!!js …' strings). */
    function configValue(text) {
      if (text === null || text === undefined) return undefined
      let v
      try { v = yaml.load(text, { schema: SCHEMA }) } catch { return undefined }
      const revive = x => {
        if (typeof x === 'string' && x.startsWith('!!js ')) return { __js: x.slice(5) }
        if (Array.isArray(x)) return x.map(revive)
        if (x && typeof x === 'object' && !isJs(x)) return Object.fromEntries(Object.entries(x).map(([k, y]) => [k, revive(y)]))
        return x
      }
      return revive(v)
    }

    /** Render a config value the way the generator stores it (compact YAML). */
    function storeConfig(config) {
      if (config === undefined || config === null) return null
      return dump(config)
    }

    /**
     * Parse patch text.
     * @returns {{ ops: object[] | null, error: { message: string, line: number|null, hint: string|null } | null }}
     */
    function parse(text) {
      let doc
      try {
        doc = yaml.load(text ?? '', { schema: SCHEMA })
      } catch (e) {
        const msg = String(e.reason ?? e.message ?? e).split('\n')[0]
        const hint = /unknown tag.*!(<!)?js/i.test(String(e.message)) || /!js\b/.test(text ?? '') && /tag/i.test(msg) ? 'single-bang' : null
        return { ops: null, error: { message: msg, line: e.mark ? e.mark.line + 1 : null, hint } }
      }
      if (doc === null || doc === undefined) return { ops: [], error: null }
      if (!Array.isArray(doc)) return { ops: null, error: { message: 'a patch is a YAML list of operations (- insert: … / - id: …)', line: 1, hint: 'not-a-list' } }
      return { ops: doc, error: null }
    }

    // ── rows ────────────────────────────────────────────────────────────
    function disabledState(disabled) {
      if (disabled === undefined || disabled === false || disabled === null) return { state: 'on', expr: undefined }
      if (disabled === true) return { state: 'off', expr: undefined }
      if (isJs(disabled)) return { state: 'cond', expr: disabled.__js }
      // Any other value is truthy for the Loader: a literal string such as
      // "false" or a quoted "!!js …" disables the row for good.
      return { state: disabled ? 'off' : 'on', expr: undefined }
    }

    function normalizeRow(row, origin, resolve) {
      const spec = typeof row.name === 'string' ? row.name : null
      const out = {
        id: row.id ?? null,
        spec,
        pkg: spec ? resolve(spec) : null,
        ...disabledState(row.disabled),
        origin,
        overrides: [],
        inject: row.inject ?? null,
        isolate: row.isolate ? Object.keys(row.isolate) : null,
        group: !!row.group || spec === 'cordis:group',
        config: null,
        children: null,
        presetId: null,
      }
      setConfig(out, row.config, origin, resolve)
      return out
    }

    function setConfig(target, config, origin, resolve) {
      if (Array.isArray(config) && target.group) {
        target.children = config.map(r => normalizeRow(r, origin, resolve))
        target.config = null
      } else if (config && typeof config === 'object' && !isJs(config) && Array.isArray(config.plugins)) {
        target.children = config.plugins.map(r => normalizeRow(r, origin, resolve))
        target.presetId = typeof config.id === 'string' ? config.id : null
        const { plugins, ...rest } = config
        target.config = Object.keys(rest).length ? storeConfig(rest) : null
      } else {
        target.children = null
        target.config = storeConfig(config)
      }
    }

    function clone(rows) { return JSON.parse(JSON.stringify(rows)) }

    /**
     * Row a patch op addresses: top-level rows and rows inside `group: true`
     * rows. Plugin lists of agent presets are the preset row's `config`, not
     * Loader entries, so a patch reaches them only by overriding the preset.
     */
    function findRow(rows, id) {
      for (const r of rows) if (r.id === id) return r
      for (const r of rows) {
        if (r.children && r.group) {
          const hit = findRow(r.children, id)
          if (hit) return hit
        }
      }
      return null
    }

    function allIds(rows, out = new Set()) {
      for (const r of rows) { if (r.id) out.add(r.id); if (r.children && r.group) allIds(r.children, out) }
      return out
    }

    /**
     * Apply patch ops to rows in place.
     * @param {object[]} rows normalized rows (cloned by the caller)
     * @param {object[]} ops parsed patch
     * @param {{ origin?: string, resolve: (spec: string) => string|null }} opts
     * @returns {{ level: 'error'|'warn'|'info', code: string, op: number, id?: string, detail?: string }[]} issues
     */
    function apply(rows, ops, opts) {
      const origin = opts.origin ?? 'patch'
      const resolve = opts.resolve
      const issues = []
      const ids = allIds(rows)
      ;(ops ?? []).forEach((op, i) => {
        if (!op || typeof op !== 'object' || Array.isArray(op)) { issues.push({ level: 'error', code: 'op-shape', op: i }); return }
        for (const k of Object.keys(op)) if (!OP_KEYS.has(k)) issues.push({ level: 'warn', code: 'op-unknown-key', op: i, id: op.id, detail: k })
        if ('insert' in op) {
          if (!Array.isArray(op.insert)) { issues.push({ level: 'error', code: 'insert-shape', op: i }); return }
          let into = rows
          if (op.id) {
            const target = findRow(rows, op.id)
            if (!target) { issues.push({ level: 'warn', code: 'unresolved', op: i, id: op.id }); return }
            if (!target.group) { issues.push({ level: 'warn', code: 'insert-not-group', op: i, id: op.id }); return }
            target.children ??= []
            into = target.children
          }
          for (const r of op.insert) {
            if (!r || typeof r !== 'object' || Array.isArray(r)) { issues.push({ level: 'error', code: 'row-shape', op: i }); continue }
            for (const k of Object.keys(r)) if (!ROW_KEYS.has(k)) issues.push({ level: 'warn', code: 'row-unknown-key', op: i, id: r.id, detail: k })
            if (!r.id) issues.push({ level: 'warn', code: 'row-no-id', op: i, detail: r.name ?? '' })
            else if (ids.has(r.id)) issues.push({ level: 'warn', code: 'duplicate-id', op: i, id: r.id })
            if (typeof r.name !== 'string' && !r.group) issues.push({ level: 'error', code: 'row-no-name', op: i, id: r.id })
            const row = normalizeRow(r, origin, resolve)
            row.added = true
            if (row.spec && !row.pkg && !row.spec.startsWith('cordis:')) issues.push({ level: 'info', code: 'row-external', op: i, id: r.id, detail: row.spec })
            if (r.id) ids.add(r.id)
            into.push(row)
          }
          return
        }
        if (!op.id) { issues.push({ level: 'warn', code: 'op-no-target', op: i }); return }
        const target = findRow(rows, op.id)
        if (!target) { issues.push({ level: 'warn', code: 'unresolved', op: i, id: op.id }); return }
        // A truthy name asserts the row's plugin; a mismatch skips the whole
        // patch (vendor/include applyEntryPatches).
        if (op.name && op.name !== target.spec) { issues.push({ level: 'warn', code: 'name-assert', op: i, id: op.id, detail: `${op.name} ≠ ${target.spec}` }); return }
        const fields = []
        if ('config' in op) { setConfig(target, op.config, origin, resolve); fields.push('config') }
        if ('disabled' in op) { Object.assign(target, disabledState(op.disabled)); fields.push('disabled') }
        if ('inject' in op) { target.inject = op.inject ?? null; fields.push('inject') }
        if ('isolate' in op) { target.isolate = op.isolate ? Object.keys(op.isolate) : null; fields.push('isolate') }
        if ('intercept' in op) fields.push('intercept')
        target.overrides = [...(target.overrides ?? []), { origin, fields }]
      })
      return issues
    }

    /**
     * Static checks that the Loader would not report (or reports only at boot).
     * @returns issues in the same shape as apply()
     */
    function lint(ops) {
      const issues = []
      const containsJs = v => isJs(v) || (Array.isArray(v) ? v.some(containsJs) : v && typeof v === 'object' ? Object.values(v).some(containsJs) : false)
      const literalJs = v => (typeof v === 'string' && JS_PREFIX.test(v)) || (Array.isArray(v) ? v.some(literalJs) : v && typeof v === 'object' && !isJs(v) ? Object.values(v).some(literalJs) : false)
      const entry = (r, i, id) => {
        for (const [k, v] of Object.entries(r)) {
          if (k === 'config' || k === 'disabled' || k === 'insert') continue
          if (containsJs(v)) issues.push({ level: 'error', code: 'js-metadata', op: i, id, detail: k })
        }
        if ('disabled' in r) {
          const d = r.disabled
          if (typeof d === 'string') issues.push({ level: 'error', code: JS_PREFIX.test(d) ? 'js-literal-disabled' : 'disabled-string', op: i, id, detail: d })
          else if (d !== null && typeof d === 'object' && !isJs(d)) issues.push({ level: 'error', code: 'disabled-object', op: i, id })
          else if (typeof d === 'number') issues.push({ level: 'warn', code: 'disabled-string', op: i, id, detail: String(d) })
        }
        if ('config' in r && literalJs(r.config)) issues.push({ level: 'warn', code: 'js-literal-config', op: i, id })
      }
      ;(ops ?? []).forEach((op, i) => {
        if (!op || typeof op !== 'object' || Array.isArray(op)) return
        entry(op, i, op.id)
        if (Array.isArray(op.insert)) for (const r of op.insert) if (r && typeof r === 'object') entry(r, i, r.id)
      })
      return issues
    }

    // ── comparison ──────────────────────────────────────────────────────
    const combine = (a, b) => (a === 'off' || b === 'off' ? 'off' : a === 'cond' || b === 'cond' ? 'cond' : 'on')

    /** Flatten rows into { key → row view } with effective state (parents included). */
    function flatIndex(rows) {
      const out = new Map()
      const walk = (list, prefix, parentState, preset) => list.forEach((r, i) => {
        const key = r.id ? `${prefix}${r.id}` : `${prefix}#${i}:${r.spec ?? ''}`
        const state = combine(parentState, r.state)
        out.set(key, { key, row: r, state, path: prefix ? prefix.slice(0, -1).split('/') : [], preset })
        if (r.children) walk(r.children, `${key}/`, state, r.presetId ? r : preset)
      })
      walk(rows, '', 'on', null)
      return out
    }

    /** Active package mounts of a row tree: pkg → best state. */
    function mounts(rows) {
      const out = new Map()
      for (const { row, state } of flatIndex(rows).values()) {
        if (!row.pkg || state === 'off') continue
        const prev = out.get(row.pkg)
        if (!prev || (prev === 'cond' && state === 'on')) out.set(row.pkg, state)
      }
      return out
    }

    /** Config texts are equal when they parse to the same value (YAML styles differ). */
    const sameConfig = (a, b) => (a ?? null) === (b ?? null) || JSON.stringify(configValue(a) ?? null) === JSON.stringify(configValue(b) ?? null)

    const topKeys = text => {
      const v = configValue(text)
      return v && typeof v === 'object' && !Array.isArray(v) && !isJs(v) ? Object.keys(v) : []
    }

    /**
     * Compare two row trees.
     * @returns {{ added: object[], removed: object[], changed: object[], mountsAdded: [string,string][], mountsRemoved: string[] }}
     */
    function diff(before, after) {
      const a = flatIndex(before), b = flatIndex(after)
      const added = [], removed = [], changed = []
      for (const [k, x] of b) if (!a.has(k)) added.push({ key: k, id: x.row.id, spec: x.row.spec, pkg: x.row.pkg, state: x.state, path: x.path, config: x.row.config })
      for (const [k, x] of a) if (!b.has(k)) removed.push({ key: k, id: x.row.id, spec: x.row.spec, pkg: x.row.pkg })
      for (const [k, x] of b) {
        const y = a.get(k)
        if (!y) continue
        const c = { key: k, id: x.row.id, pkg: x.row.pkg, spec: x.row.spec, path: x.path, fields: [] }
        if (y.state !== x.state) { c.fields.push('state'); c.stateBefore = y.state; c.stateAfter = x.state }
        if (!sameConfig(y.row.config, x.row.config) || (y.row.presetId ?? null) !== (x.row.presetId ?? null)) {
          c.fields.push('config')
          c.configBefore = y.row.config
          c.configAfter = x.row.config
          const now = new Set(topKeys(x.row.config))
          c.lostKeys = topKeys(y.row.config).filter(k2 => !now.has(k2))
        }
        if (JSON.stringify(y.row.inject ?? null) !== JSON.stringify(x.row.inject ?? null)) c.fields.push('inject')
        if (JSON.stringify(y.row.isolate ?? null) !== JSON.stringify(x.row.isolate ?? null)) c.fields.push('isolate')
        if (c.fields.length) changed.push(c)
      }
      const ma = mounts(before), mb = mounts(after)
      const mountsAdded = [...mb].filter(([p, s]) => ma.get(p) !== s)
      const mountsRemoved = [...ma.keys()].filter(p => !mb.has(p))
      return { added, removed, changed, mountsAdded, mountsRemoved }
    }

    /**
     * Required startup entries (packages/boot/app-boot requiredStartupEntryIds):
     * an enabled one must activate or the launch fails.
     */
    function requiredIssues(d, required) {
      const set = new Set(required ?? [])
      const out = []
      for (const c of d.changed) {
        if (!set.has(c.id)) continue
        if (c.fields.includes('state') && c.stateAfter === 'off') out.push({ level: 'info', code: 'required-disabled', id: c.id })
        else if (c.fields.includes('config') || c.fields.includes('state')) out.push({ level: 'warn', code: 'required-changed', id: c.id })
      }
      for (const x of d.added) if (set.has(x.id)) out.push({ level: 'warn', code: 'required-changed', id: x.id })
      return out
    }

    /**
     * Parse, lint and apply a patch over a profile's rows.
     * @param {object[]} rows the profile's effective rows (not modified)
     * @param {string} text patch YAML
     * @param {{ resolve: Function, required?: string[], origin?: string }} opts
     */
    function run(rows, text, opts) {
      const parsed = parse(text)
      if (parsed.error) return { error: parsed.error, issues: [], diff: null, rows: null }
      const next = clone(rows)
      const issues = [...lint(parsed.ops), ...apply(next, parsed.ops, opts)]
      const d = diff(rows, next)
      for (const c of d.changed) if (c.lostKeys?.length) issues.push({ level: 'warn', code: 'config-replaced', id: c.id, detail: c.lostKeys.join(', ') })
      issues.push(...requiredIssues(d, opts.required))
      return { error: null, issues, diff: d, rows: next, ops: parsed.ops }
    }

    // ── snippets ────────────────────────────────────────────────────────
    /** Rows of a profile that mount a package: [{ row, path, state, preset }]. */
    function rowsOf(rows, pkg) {
      const out = []
      for (const x of flatIndex(rows).values()) {
        if (x.row.pkg !== pkg) continue
        out.push({ row: x.row, path: x.path, state: x.state, preset: x.preset?.presetId ?? null, presetRow: x.preset })
      }
      return out
    }

    /** Back from the normalized shape to a Loader row (isolate realms become `true`). */
    function rawRow(r) {
      const out = {}
      if (r.id) out.id = r.id
      if (r.spec) out.name = r.spec
      if (r.group && r.spec !== 'cordis:group') out.group = true
      if (r.state === 'off') out.disabled = true
      else if (r.state === 'cond') out.disabled = { __js: r.expr ?? 'false' }
      if (r.inject) out.inject = r.inject
      if (r.isolate) out.isolate = Object.fromEntries(r.isolate.map(k => [k, true]))
      if (r.children && r.group) out.config = r.children.map(rawRow)
      else if (r.children && r.presetId) out.config = { id: r.presetId, ...(configValue(r.config) ?? {}), plugins: r.children.map(rawRow) }
      else if (r.config !== null && r.config !== undefined) out.config = configValue(r.config)
      return out
    }

    /**
     * Op that changes one row: a Loader-addressable row is patched by id; a row
     * inside an agent preset needs the whole preset declaration restated.
     * @param {object[]} rows profile rows
     * @param {object} target row to change (from rowsOf)
     * @param {(raw: object) => object} edit returns the edited Loader row
     * @returns {{ yaml: string, viaPreset: string|null }}
     */
    function editOp(rows, target, edit) {
      const hit = rowsOf(rows, target.pkg).find(x => x.row === target)
      const preset = hit?.presetRow ?? null
      if (!preset) {
        const raw = edit(rawRow(target))
        const fields = {}
        for (const k of ['config', 'disabled', 'inject', 'isolate']) if (JSON.stringify(raw[k]) !== JSON.stringify(rawRow(target)[k])) fields[k] = raw[k] === undefined ? (k === 'disabled' ? false : null) : raw[k]
        return { yaml: opYaml(target.id, fields), viaPreset: null }
      }
      const swap = list => list.map(r => (r === target ? edit(rawRow(r)) : r.children && !r.presetId ? { ...rawRow(r), config: r.group ? swap(r.children) : rawRow(r).config } : rawRow(r)))
      const raw = rawRow(preset)
      raw.config.plugins = swap(preset.children)
      return { yaml: opYaml(preset.id, { name: preset.spec, config: raw.config }), viaPreset: preset.presetId }
    }

    /** `- id: <id>` op with the given fields, as YAML. */
    function opYaml(id, fields, comment) {
      const lines = []
      if (comment) for (const l of [].concat(comment)) lines.push(`# ${l}`)
      lines.push(`- id: ${id}`)
      for (const [k, v] of Object.entries(fields)) {
        if (v === undefined) continue
        if (v && typeof v === 'object' && !isJs(v) && (Array.isArray(v) ? v.length : Object.keys(v).length)) lines.push(`  ${k}:`, dump(v, 4))
        else lines.push(`  ${k}: ${dump(v)}`)
      }
      return lines.join('\n')
    }

    /** `- insert:` op adding one row, as YAML. */
    function insertYaml(row, intoGroup, comment) {
      const lines = []
      if (comment) for (const l of [].concat(comment)) lines.push(`# ${l}`)
      if (intoGroup) lines.push(`- id: ${intoGroup}`)
      lines.push(`${intoGroup ? '  ' : '- '}insert:`)
      const body = dump([row], 4)
      lines.push(body)
      return lines.join('\n')
    }

    return { SCHEMA, isJs, dump, parse, configValue, storeConfig, normalizeRow, clone, findRow, allIds, apply, lint, flatIndex, mounts, diff, run, rowsOf, rawRow, editOp, opYaml, insertYaml, disabledState }
  }

  return { create }
})
