import { useRef, useEffect } from 'react'
import LiquidText from './LiquidText'

function LiquidTextMasked() {
  const containerRef = useRef(null)

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* SVG with mask */}
      <svg
        className="relative"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block'
        }}
        viewBox="0 0 1000 400"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="textMask">
            <rect width="100%" height="100%" fill="black" />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              style={{
                fontSize: '180px',
                fontWeight: '900',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '-0.02em'
              }}
            >
              WE ARE
            </text>
          </mask>
        </defs>

        {/* Rectangle that will be masked by text and filled with liquid */}
        <foreignObject
          x="0"
          y="0"
          width="100%"
          height="100%"
          mask="url(#textMask)"
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              position: 'relative'
            }}
          >
            <LiquidText />
          </div>
        </foreignObject>

        {/* Subtle outline for definition */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="none"
          stroke="rgba(0, 0, 0, 0.15)"
          strokeWidth="3"
          style={{
            fontSize: '180px',
            fontWeight: '900',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-0.02em',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 4px 20px rgba(0, 0, 0, 0.1))'
          }}
        >
          WE ARE
        </text>
      </svg>
    </div>
  )
}

export default LiquidTextMasked
