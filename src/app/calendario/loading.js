import { TableSkeleton } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <TableSkeleton rows={6} cols={7} />
    </div>
  )
}
