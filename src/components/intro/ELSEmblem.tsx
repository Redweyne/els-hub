export function ELSEmblem() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer ring — ornate circle */}
      <circle cx="100" cy="100" r="95" fill="none" stroke="#c9a227" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="#c9a227" strokeWidth="0.5" opacity="0.5" />

      {/* Mandala spokes — 8 directions */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 100 + 85 * Math.cos(rad);
        const y1 = 100 + 85 * Math.sin(rad);
        const x2 = 100 + 50 * Math.cos(rad);
        const y2 = 100 + 50 * Math.sin(rad);
        return (
          <line
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#c9a227"
            strokeWidth="1"
            opacity="0.6"
          />
        );
      })}

      {/* Geometric petals — 8 petals around mandala */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 100 + 65 * Math.cos(rad);
        const cy = 100 + 65 * Math.sin(rad);
        return (
          <circle
            key={`petal-${angle}`}
            cx={cx}
            cy={cy}
            r="6"
            fill="none"
            stroke="#c9a227"
            strokeWidth="1"
            opacity="0.7"
          />
        );
      })}

      {/* Inner ornate circle */}
      <circle cx="100" cy="100" r="45" fill="none" stroke="#c9a227" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="40" fill="none" stroke="#c9a227" strokeWidth="0.5" opacity="0.5" />

      {/* Central diamond — ELS focal point */}
      <g transform="translate(100, 100)">
        {/* Diamond outline */}
        <polygon
          points="0,-18 13,-9 0,0 -13,-9"
          fill="none"
          stroke="#c9a227"
          strokeWidth="1.2"
        />
        <polygon
          points="0,0 13,9 0,18 -13,9"
          fill="none"
          stroke="#c9a227"
          strokeWidth="1.2"
        />

        {/* ELS text — serif, tight spacing */}
        <text
          x="0"
          y="6"
          textAnchor="middle"
          fontSize="18"
          fontFamily="Georgia, serif"
          fontWeight="bold"
          fill="#c9a227"
          letterSpacing="-1"
          filter="url(#glow)"
        >
          ELS
        </text>
      </g>

      {/* Corner accent diamonds — 4 corners */}
      {[
        { x: 30, y: 30 },
        { x: 170, y: 30 },
        { x: 170, y: 170 },
        { x: 30, y: 170 },
      ].map((pos, idx) => (
        <rect
          key={`corner-${idx}`}
          x={pos.x - 4}
          y={pos.y - 4}
          width="8"
          height="8"
          fill="none"
          stroke="#c9a227"
          strokeWidth="1"
          opacity="0.5"
        />
      ))}
    </svg>
  )
}
