import { TableSkeleton } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <TableSkeleton rows={8} cols={7} />
    </div>
  )
}
