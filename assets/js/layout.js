/* DSH Map — two-level clustered layout shared by the generator (Node) and the
 * browser re-layout. Packages are first arranged inside their group with a
 * local force simulation; groups are then placed as discs by a second
 * simulation (dependency attraction, collision, vertical pull towards their
 * architectural layer band) and finally separated as rectangles so group
 * boxes never overlap. Pass a d3 namespace that provides d3-force. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  // The factory's own source runs in the layout worker (views/map.js, UI/UX roadmap 4.5).
  else (root.DSHMap = root.DSHMap || {}).layout = Object.assign(factory(), { factory })
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict'

  function mulberry32(seed) {
    let a = seed >>> 0
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  /**
   * @param {{
   *   nodes: { id: string, group: string, size: number }[],
   *   edges: { source: string, target: string }[],
   *   groups: { id: string, layer: string }[],
   *   layerOrder: string[],
   *   seed?: number,
   * }} input
   * @param {object} d3 namespace with forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY
   * @returns {Map<string, { x: number, y: number }>}
   */
  function twoLevel(input, d3) {
    const rand = mulberry32(input.seed ?? 20261019)
    const groupOf = new Map(input.nodes.map(n => [n.id, n.group]))
    const byGroup = new Map()
    for (const n of input.nodes) {
      if (!byGroup.has(n.group)) byGroup.set(n.group, [])
      byGroup.get(n.group).push(n)
    }

    // 1) local layout inside every group
    const local = new Map()
    const extent = new Map() // gid -> { x1, y1, x2, y2, R }
    for (const [gid, members] of byGroup) {
      const sims = members.map(m => ({ id: m.id, r: m.size / 2 + 8 }))
      if (sims.length === 1) {
        sims[0].x = 0; sims[0].y = 0
      } else {
        const ids = new Set(members.map(m => m.id))
        const links = input.edges.filter(e => ids.has(e.source) && ids.has(e.target) && e.source !== e.target)
          .map(e => ({ source: e.source, target: e.target }))
        // Seed positions on a spiral, biggest packages in the middle.
        sims.sort((a, b) => b.r - a.r)
        sims.forEach((s, i) => { const ang = i * 2.399963; const rad = 14 * Math.sqrt(i + 0.5); s.x = rad * Math.cos(ang); s.y = rad * Math.sin(ang) })
        const sim = d3.forceSimulation(sims)
          .randomSource(rand)
          .force('link', d3.forceLink(links).id(d => d.id).distance(l => l.source.r + l.target.r + 22).strength(0.18))
          .force('charge', d3.forceManyBody().strength(-70).distanceMax(400))
          .force('collide', d3.forceCollide(d => d.r + 4).strength(1).iterations(3))
          .force('x', d3.forceX(0).strength(0.1))
          .force('y', d3.forceY(0).strength(0.1))
          .stop()
        for (let i = 0; i < 320; i++) sim.tick()
      }
      let cx = 0, cy = 0
      for (const s of sims) { cx += s.x; cy += s.y }
      cx /= sims.length; cy /= sims.length
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity, R = 0
      for (const s of sims) {
        s.x -= cx; s.y -= cy
        local.set(s.id, { x: s.x, y: s.y })
        const r = s.r - 8 + 4
        x1 = Math.min(x1, s.x - r); x2 = Math.max(x2, s.x + r)
        y1 = Math.min(y1, s.y - r); y2 = Math.max(y2, s.y + r)
        R = Math.max(R, Math.hypot(s.x, s.y) + s.r)
      }
      // Box as Cytoscape draws it: 14px padding plus room for the group label.
      extent.set(gid, { x1: x1 - 20, y1: y1 - 40, x2: x2 + 20, y2: y2 + 20, R: R + 18 })
    }

    // 2) group placement
    const layerIndex = new Map(input.layerOrder.map((l, i) => [l, i]))
    const nL = input.layerOrder.length
    const gnodes = input.groups.filter(g => byGroup.has(g.id)).map(g => ({ id: g.id, layer: g.layer, R: extent.get(g.id).R }))
    const area = gnodes.reduce((a, g) => a + Math.PI * g.R * g.R, 0)
    const span = Math.sqrt(area) * 1.6
    const bandY = layer => ((layerIndex.get(layer) ?? nL - 1) - (nL - 1) / 2) * (span / nL)
    const agg = new Map()
    for (const e of input.edges) {
      const a = groupOf.get(e.source), b = groupOf.get(e.target)
      if (!a || !b || a === b) continue
      const k = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`
      agg.set(k, (agg.get(k) ?? 0) + 1)
    }
    const glinks = [...agg.entries()].map(([k, n]) => { const [s, t] = k.split('\u0000'); return { source: s, target: t, n } })
    gnodes.forEach((g, i) => { g.x = (rand() - 0.5) * span; g.y = bandY(g.layer) + (rand() - 0.5) * 40; void i })
    const gsim = d3.forceSimulation(gnodes)
      .randomSource(rand)
      .force('link', d3.forceLink(glinks).id(d => d.id).distance(l => l.source.R + l.target.R + 70).strength(l => Math.min(0.5, 0.03 + Math.log2(l.n + 1) * 0.045)))
      .force('charge', d3.forceManyBody().strength(d => -40 - d.R * 4))
      .force('collide', d3.forceCollide(d => d.R * 1.12 + 26).strength(1).iterations(4))
      .force('y', d3.forceY(d => bandY(d.layer)).strength(0.16))
      .force('x', d3.forceX(0).strength(0.025))
      .stop()
    for (let i = 0; i < 900; i++) gsim.tick()

    // 3) rectangle separation of group boxes
    const boxes = gnodes.map(g => ({ g, e: extent.get(g.id) }))
    for (let iter = 0; iter < 400; iter++) {
      let moved = false
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const A = boxes[i], B = boxes[j]
          const ax1 = A.g.x + A.e.x1 - 12, ax2 = A.g.x + A.e.x2 + 12, ay1 = A.g.y + A.e.y1 - 12, ay2 = A.g.y + A.e.y2 + 12
          const bx1 = B.g.x + B.e.x1, bx2 = B.g.x + B.e.x2, by1 = B.g.y + B.e.y1, by2 = B.g.y + B.e.y2
          const ox = Math.min(ax2, bx2) - Math.max(ax1, bx1)
          const oy = Math.min(ay2, by2) - Math.max(ay1, by1)
          if (ox <= 0 || oy <= 0) continue
          moved = true
          if (ox < oy) {
            const d = ox / 2 + 0.5
            if (A.g.x < B.g.x) { A.g.x -= d; B.g.x += d } else { A.g.x += d; B.g.x -= d }
          } else {
            const d = oy / 2 + 0.5
            if (A.g.y < B.g.y) { A.g.y -= d; B.g.y += d } else { A.g.y += d; B.g.y -= d }
          }
        }
      }
      if (!moved) break
    }

    const gpos = new Map(gnodes.map(g => [g.id, g]))
    const out = new Map()
    for (const n of input.nodes) {
      const g = gpos.get(n.group), l = local.get(n.id)
      out.set(n.id, { x: Math.round(g.x + l.x), y: Math.round(g.y + l.y) })
    }
    return out
  }

  /**
   * Centre of every group's packages, computed from a position map rather
   * than from rendered bounding boxes: in the map's group mode the package
   * nodes are hidden and report empty boxes.
   * @param {{ id: string, group: string, size?: number }[]} nodes
   * @param {Map<string, { x: number, y: number }>} positions
   * @returns {Map<string, { x: number, y: number }>} group id → centre
   */
  function groupCenters(nodes, positions) {
    const boxes = new Map()
    for (const n of nodes) {
      const p = positions.get(n.id)
      if (!p) continue
      const r = (n.size ?? 0) / 2
      const b = boxes.get(n.group) ?? { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
      b.x1 = Math.min(b.x1, p.x - r); b.x2 = Math.max(b.x2, p.x + r)
      b.y1 = Math.min(b.y1, p.y - r); b.y2 = Math.max(b.y2, p.y + r)
      boxes.set(n.group, b)
    }
    const out = new Map()
    for (const [gid, b] of boxes) out.set(gid, { x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 })
    return out
  }

  /**
   * Architecture-poster layout: one band per layer, groups packed in shelves.
   * @param {{
   *   layers: { id: string }[],
   *   groups: { id: string, layer: string, packages: string[] }[],
   *   lines: (id: string) => number,
   * }} input lines: source lines of a package (bigger packages first)
   * @returns {{ pos: Map<string, { x: number, y: number }>, labels: { layer: object, x: number, y: number }[] }}
   */
  function layered(input) {
    const CELL = Math.max(64, ...input.groups.flatMap(g => g.packages.map(id => (input.size?.(id) ?? 40) + 28))), GAPX = 70, GAPY = 80, MAXW = 4400
    const pos = new Map()
    const labels = []
    let y = 0
    for (const layer of input.layers) {
      const groups = input.groups.filter(g => g.layer === layer.id).sort((a, b) => b.packages.length - a.packages.length || (a.id < b.id ? -1 : 1))
      if (!groups.length) continue
      labels.push({ layer, x: -40, y: y + 20 })
      let x = 0, shelfH = 0, rowY = y + 80
      for (const g of groups) {
        const pk = [...g.packages].sort((a, b) => input.lines(b) - input.lines(a))
        const cols = Math.max(1, Math.ceil(Math.sqrt(pk.length * 3)))
        const rows = Math.ceil(pk.length / cols)
        const w = cols * CELL, hh = rows * CELL
        if (x > 0 && x + w > MAXW) { x = 0; rowY += shelfH + GAPY; shelfH = 0 }
        pk.forEach((id, i) => pos.set(id, { x: x + (i % cols) * CELL + CELL / 2, y: rowY + Math.floor(i / cols) * CELL + CELL / 2 }))
        x += w + GAPX
        shelfH = Math.max(shelfH, hh)
      }
      y = rowY + shelfH + 100
    }
    return { pos, labels }
  }

  // Separate square node bounds (safe for every silhouette), then group bounds.
  // Works on saved layouts too, whose coordinates may use a different size metric.
  function separate(nodes, positions) {
    const groups = new Map()
    for (const n of nodes) {
      const p = positions.get(n.id)
      if (!p) continue
      if (!groups.has(n.group)) groups.set(n.group, [])
      groups.get(n.group).push({ id: n.id, x: p.x, y: p.y, w: n.size + 24, h: n.size + 24 })
    }
    function pack(boxes) {
      for (let step = 0; step < 500; step++) {
        let moved = false
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j]
          const dx = (a.w + b.w) / 2 - Math.abs(a.x - b.x)
          const dy = (a.h + b.h) / 2 - Math.abs(a.y - b.y)
          if (dx <= 0 || dy <= 0) continue
          moved = true
          const axis = dx < dy ? 'x' : 'y'
          const shift = ((axis === 'x' ? dx : dy) + 0.1) / 2
          const sign = a[axis] <= b[axis] ? -1 : 1
          a[axis] += sign * shift; b[axis] -= sign * shift
        }
        if (!moved) return
      }
      // Deterministic safe fallback for pathological coincident inputs.
      const x = boxes.reduce((s, b) => s + b.x, 0) / boxes.length
      const y = boxes.reduce((s, b) => s + b.y, 0) / boxes.length
      const cols = Math.ceil(Math.sqrt(boxes.length))
      const w = Math.max(...boxes.map(b => b.w)) + 1
      const h = Math.max(...boxes.map(b => b.h)) + 1
      boxes.forEach((b, i) => { b.x = x + (i % cols) * w; b.y = y + Math.floor(i / cols) * h })
    }
    const bounds = []
    for (const members of groups.values()) {
      pack(members)
      const x1 = Math.min(...members.map(n => n.x - n.w / 2))
      const x2 = Math.max(...members.map(n => n.x + n.w / 2))
      const y1 = Math.min(...members.map(n => n.y - n.h / 2))
      const y2 = Math.max(...members.map(n => n.y + n.h / 2))
      const x = (x1 + x2) / 2, y = (y1 + y2) / 2
      bounds.push({ x, y, ox: x, oy: y, w: x2 - x1 + 48, h: y2 - y1 + 80, members })
    }
    pack(bounds)
    const out = new Map()
    for (const b of bounds) for (const n of b.members) out.set(n.id, { x: n.x + b.x - b.ox, y: n.y + b.y - b.oy })
    return out
  }

  return { twoLevel, mulberry32, groupCenters, layered, separate }
})
