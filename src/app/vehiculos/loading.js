import { TableSkeleton, PageHeaderSkeleton, StatsCardSkeleton } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatsCardSkeleton count={4} />
      <TableSkeleton rows={10} cols={8} />
    </div>
  )
}
