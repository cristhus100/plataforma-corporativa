import { TableSkeleton, StatsCardSkeleton } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <StatsCardSkeleton count={4} />
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 h-6 w-48 bg-gray-200 rounded animate-pulse" />
        <TableSkeleton rows={5} cols={4} />
      </div>
    </div>
  )
}
