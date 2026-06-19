import { TableSkeleton } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <TableSkeleton rows={3} cols={2} />
    </div>
  )
}
