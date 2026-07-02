"use client"
import React from "react"
import './cursor.css'

type CursorProps = {
  mousePosition: {
    x: number
    y: number
  }
  color?:string
  name?:string| null 
}

export const UserMouse: React.FC<CursorProps> = ({ mousePosition, color,name }) => {
  const userName = name?? "Bienfait Ijambo"
  const mouseColor =color ?? "#EA4335" // Default Figma-ish red

  return (
    <div
      className="cursor-container"
      style={{
        transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`,
      }}
    >
      {/* The Pointer SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="cursor-svg"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={mouseColor}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* The Name Tag */}
      <div 
        className="cursor-label" 
        style={{ backgroundColor: color }}
      >
        {userName}
      </div>
    </div>
  )
}