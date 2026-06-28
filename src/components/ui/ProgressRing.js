'use client'

import { getRangoCumplimiento } from '@/lib/utils/auditoria'

/**
 * ProgressRing — Anillo de progreso SVG reutilizable
 *
 * Props:
 *   percentage       (number, 0-100)       Porcentaje a mostrar
 *   size             (number, default 48)  Diámetro del SVG en px
 *   strokeWidth      (number, default 4)   Grosor del anillo en px
 *   showLabel        (boolean, default false) Muestra badge con el rango debajo
 *   showPercentage   (boolean, default false) Muestra el % centrado sobre el SVG
 *   showDescription  (boolean, default false) Muestra descripción del rango debajo
 *   className        (string)              Clases adicionales al contenedor
 */
export default function ProgressRing({
  percentage = 0,
  size = 48,
  strokeWidth = 4,
  showLabel = false,
  showPercentage = false,
  showDescription = false,
  className = '',
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  const rango = getRangoCumplimiento(percentage)
  const pctFontSize = size >= 160 ? 'text-4xl' : 'text-xl'

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Fondo */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progreso */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={rango.color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        {showPercentage && (
          <span
            className={`absolute font-bold ${pctFontSize}`}
            style={{ color: rango.color }}
          >
            {percentage}%
          </span>
        )}
      </div>
      {showLabel && (
        <span
          className="text-sm font-semibold px-3 py-1 rounded-full"
          style={{
            backgroundColor: rango.color + '20',
            color: rango.color,
          }}
        >
          {rango.label}
        </span>
      )}
      {showDescription && (
        <p className="text-xs text-gray-500 text-center max-w-[200px]">
          {rango.desc}
        </p>
      )}
    </div>
  )
}
