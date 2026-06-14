/**
 * Loading Skeletons reutilizables para Next.js App Router
 *
 * Uso en archivos loading.js:
 *   import { TableSkeleton, PageHeaderSkeleton, StatsCardSkeleton } from '@/components/ui/LoadingSkeleton'
 *
 *   export default function Loading() {
 *     return (
 *       <div className="space-y-6">
 *         <PageHeaderSkeleton />
 *         <StatsCardSkeleton />
 *         <TableSkeleton rows={10} cols={7} />
 *       </div>
 *     )
 *   }
 */

export function TableSkeleton({ rows = 8, cols = 6 }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-4 py-3">
                    <div
                      className="h-4 bg-gray-100 rounded animate-pulse"
                      style={{ width: `${60 + ((r * 7 + c * 13) % 40)}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function StatsCardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-gray-100 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function PageHeaderSkeleton({ showButton = true }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
      </div>
      {showButton && (
        <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
      )}
    </div>
  )
}

export function FormSkeleton({ fields = 6 }) {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-5">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i}>
              <div className="mb-1.5 h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="mb-1 h-3 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-20 w-full bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-2 h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
          <div className="mt-4 h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export function AuditSkeleton() {
  return (
    <div className="space-y-6">
      {/* Progress ring skeleton */}
      <div className="flex flex-col items-center justify-center py-10">
        <div className="mb-4 h-32 w-32 rounded-full bg-gray-100 animate-pulse" />
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gray-100 animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
