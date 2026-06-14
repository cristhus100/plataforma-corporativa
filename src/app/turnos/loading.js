import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton showButton={false} />
      <TableSkeleton rows={8} cols={5} />
    </div>
  )
}
