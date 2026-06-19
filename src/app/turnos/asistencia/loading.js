import { PageHeaderSkeleton, TableSkeleton } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton showButton={false} />
      <TableSkeleton rows={10} cols={6} />
    </div>
  )
}
