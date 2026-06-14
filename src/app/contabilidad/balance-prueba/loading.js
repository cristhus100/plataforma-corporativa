import { TableSkeleton } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <TableSkeleton rows={15} cols={4} />
    </div>
  )
}
