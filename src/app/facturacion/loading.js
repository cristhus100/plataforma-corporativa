import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={5} cols={4} />
    </div>
  )
}
