import { PageHeaderSkeleton } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <PageHeaderSkeleton showButton={false} />
      </div>
    </div>
  )
}
