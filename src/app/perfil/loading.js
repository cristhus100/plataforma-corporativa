import { PageHeaderSkeleton } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <PageHeaderSkeleton />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-48 rounded-xl bg-gray-100 animate-pulse" />
        <div className="h-48 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    </div>
  )
}
