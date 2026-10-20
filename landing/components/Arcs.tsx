/**
 * Page-wide hairline ornament: evenly spaced parallel curves that flow continuously
 * from the top of the page to the bottom, like nested ripples. Each line is one smooth
 * path (a tangent-continuous wave), so nothing ends abruptly at a section boundary.
 *
 * Rendered once behind all sections, stretched to the page height; strokes use
 * non-scaling-stroke so they stay hairline at any size. Two variants so phones get a
 * shorter period (the page is much taller relative to its width there).
 */

const WIDTH = 1000
const UNIT = 1000 // one full wave period in viewBox units

function wavePath(base: number, depth: number, periods: number) {
  // Sample x(y) = base + depth/2 * (1 - cos(2πy/UNIT)) - depth/2 and join with Catmull-Rom → cubic Béziers.
  const steps = periods * 16
  const total = periods * UNIT
  const pts: [number, number][] = []
  // Extend samples beyond the top (-2) and beyond the bottom (steps + 2) so curves never terminate prematurely
  for (let i = -2; i <= steps + 2; i++) {
    const y = (i / steps) * total
    const x = base + (depth / 2) * -Math.cos((2 * Math.PI * y) / UNIT)
    pts.push([x, y])
  }
  const f = (n: number) => Math.round(n * 10) / 10
  let d = `M ${f(pts[1][0])} ${f(pts[1][1] - 60)} L ${f(pts[1][0])} ${f(pts[1][1])}`
  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  const last = pts[pts.length - 2]
  d += ` L ${f(last[0])} ${f(last[1] + 80)}`
  return d
}

function ArcsSvg({ periods, className }: { periods: number; className: string }) {
  const depth = 220
  const step = 175
  // 9 lines spanning from -200 to 1200 ensuring full horizontal coverage across all viewports
  const lines = Array.from({ length: 9 }, (_, k) => -200 + k * step)
  return (
    <svg
      className={`arcs ${className}`}
      viewBox={`0 0 ${WIDTH} ${periods * UNIT}`}
      preserveAspectRatio="none"
      aria-hidden
      focusable={false}
    >
      {lines.map((b, k) => (
        <path key={k} d={wavePath(b, depth, periods)} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

export function PageArcs() {
  return (
    <div className="page-arcs" aria-hidden>
      <ArcsSvg periods={9} className="arcs-wide" />
      <ArcsSvg periods={13} className="arcs-narrow" />
    </div>
  )
}
