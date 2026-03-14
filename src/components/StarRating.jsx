import { Star } from 'lucide-react'

/**
 * Componente de estrellas reutilizable.
 * - Modo display: solo muestra las estrellas coloreadas (sin onChange)
 * - Modo interactivo: permite seleccionar con hover/click (con onChange)
 *
 * Props:
 *   value      {number}   valor actual 0-5
 *   onChange   {function} (opcional) callback (newValue) para modo interactivo
 *   size       {string}   'sm' | 'md' | 'lg' (default 'md')
 *   showValue  {boolean}  muestra el número junto a las estrellas
 */
import { useState } from 'react'

const SIZE_MAP = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
}

function StarRating({ value = 0, onChange, size = 'md', showValue = false }) {
  const [hovered, setHovered] = useState(0)
  const interactive = typeof onChange === 'function'
  const displayValue = interactive && hovered > 0 ? hovered : value
  const starSize = SIZE_MAP[size] ?? SIZE_MAP.md

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= displayValue
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={`transition-transform ${interactive ? 'cursor-pointer hover:scale-110 focus:outline-none' : 'cursor-default'}`}
          >
            <Star
              className={`${starSize} transition-colors ${
                filled
                  ? 'text-yellow-400 fill-yellow-400'
                  : interactive
                    ? 'text-gray-300 dark:text-gray-600 fill-gray-100 dark:fill-gray-800'
                    : 'text-gray-300 dark:text-gray-600 fill-gray-100 dark:fill-gray-800'
              }`}
            />
          </button>
        )
      })}
      {showValue && value > 0 && (
        <span className="ml-1 text-sm font-medium text-gray-700 dark:text-gray-200">{value.toFixed(1)}</span>
      )}
    </div>
  )
}

export default StarRating
