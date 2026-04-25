interface StarPrimitiveProps {
  cx: number
  cy: number
  r: number
  points?: 5 | 6
  innerRatio?: number
  filled?: boolean
  strokeWidth?: number
}

export function StarPrimitive({
  cx,
  cy,
  r,
  points = 5,
  innerRatio = 0.42,
  filled = true,
  strokeWidth = 0.3,
}: StarPrimitiveProps) {
  const totalPoints = points * 2
  const coords: string[] = []
  for (let i = 0; i < totalPoints; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2
    const radius = i % 2 === 0 ? r : r * innerRatio
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    coords.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return (
    <polygon
      points={coords.join(" ")}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  )
}
