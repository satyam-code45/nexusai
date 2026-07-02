import React from "react"
import './Blinking-cursor.css'

type BlinkingCursorProps = {
  x: string // Changed to number to easily add 'px'
  y: string // Changed to number to easily add 'px'
  name?: string| null 
  color?: string| null 
}

export const BlinkingCursor: React.FC<BlinkingCursorProps> = ({
  x,
  y,
  name ,
  color = "#2497c4" // Default color if not provided
}) => {
  return (
    <div
      className="cursor-wrapper"
      style={{
        left: x,
        top: y,
      }}
    >
      {/* 1. The Name Tag (Top) */}
      <div
        className="cursor-label"
        style={{ backgroundColor: color ?? undefined }}
      >
        {name}
      </div>

      {/* 2. The Vertical Bar (Bottom) */}
      <div
        className="cursor-caret"
        style={{ backgroundColor: color ?? undefined }}
      />
    </div>
  )
}