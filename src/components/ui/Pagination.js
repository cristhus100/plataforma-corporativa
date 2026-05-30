'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Componente de paginación server-side reutilizable.
 *
 * Props:
 *   page       - número de página actual (1-indexed)
 *   totalPages - total de páginas
 *   onPageChange - callback(page: number)
 *   isLoading  - opcional, deshabilita controles mientras carga
 */
export default function Pagination({ page, totalPages, onPageChange, isLoading = false }) {
  if (totalPages <= 1) return null;

  // Generar páginas visibles: siempre primera y última, con huecos indicados por "..."
  const getVisiblePages = () => {
    const pages = [];
    const delta = 2; // páginas alrededor de la actual

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= page - delta && i <= page + delta)
      ) {
        pages.push(i);
      }
    }

    // Insertar "..." donde hay saltos
    const result = [];
    let prev = 0;
    for (const p of pages) {
      if (p - prev > 1) {
        result.push('...');
      }
      result.push(p);
      prev = p;
    }
    return result;
  };

  const visiblePages = getVisiblePages();
  const disabled = isLoading;

  return (
    <nav className="flex items-center justify-between gap-4 pt-4 pb-2" aria-label="Paginación">
      <span className="text-sm text-gray-500">
        Página {page} de {totalPages}
      </span>

      <div className="flex items-center gap-1">
        {/* Primera página */}
        <button
          onClick={() => onPageChange(1)}
          disabled={disabled || page <= 1}
          className={cn(
            'p-2 rounded-lg text-sm transition-colors',
            'text-gray-500 hover:bg-gray-100',
            'disabled:opacity-30 disabled:cursor-not-allowed'
          )}
          aria-label="Primera página"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Anterior */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className={cn(
            'p-2 rounded-lg text-sm transition-colors',
            'text-gray-500 hover:bg-gray-100',
            'disabled:opacity-30 disabled:cursor-not-allowed'
          )}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Números de página */}
        <div className="flex items-center gap-1 mx-1">
          {visiblePages.map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-sm text-gray-400">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                disabled={disabled}
                className={cn(
                  'min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors',
                  p === page
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Siguiente */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          className={cn(
            'p-2 rounded-lg text-sm transition-colors',
            'text-gray-500 hover:bg-gray-100',
            'disabled:opacity-30 disabled:cursor-not-allowed'
          )}
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Última página */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || page >= totalPages}
          className={cn(
            'p-2 rounded-lg text-sm transition-colors',
            'text-gray-500 hover:bg-gray-100',
            'disabled:opacity-30 disabled:cursor-not-allowed'
          )}
          aria-label="Última página"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
