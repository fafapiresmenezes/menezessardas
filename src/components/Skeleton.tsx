interface SkeletonProps {
  className?: string
  count?: number
}

export function SkeletonCard({ className = '', count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`bg-white shadow-sm p-5 rounded-sm animate-pulse opacity-80 ${className}`}>
          <div className="h-4 bg-grafite-claro/20 rounded w-3/4 mb-3"></div>
          <div className="h-8 bg-dourado/20 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-grafite-claro/10 rounded w-full"></div>
            <div className="h-3 bg-grafite-claro/10 rounded w-5/6"></div>
          </div>
        </div>
      ))}
    </>
  )
}

export function SkeletonTable() {
  return (
    <div className="bg-white shadow-sm overflow-hidden rounded-sm animate-pulse opacity-80">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border-b border-navy/10 flex items-center gap-4">
          <div className="h-4 bg-grafite-claro/20 rounded flex-1"></div>
          <div className="h-4 bg-grafite-claro/20 rounded flex-1"></div>
          <div className="h-4 bg-grafite-claro/20 rounded flex-1"></div>
          <div className="h-6 bg-dourado/20 rounded w-20"></div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonIndicator({ count = 4 }: SkeletonProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border-t-2 border-dourado p-5 shadow-sm animate-pulse opacity-80">
          <div className="h-3 bg-grafite-claro/20 rounded w-20 mb-3"></div>
          <div className="h-10 bg-navy/20 rounded w-32"></div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonForm() {
  return (
    <div className="bg-white shadow-sm p-6 rounded-sm animate-pulse opacity-80 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="h-3 bg-grafite-claro/20 rounded w-24 mb-2"></div>
          <div className="h-10 bg-grafite-claro/10 rounded w-full"></div>
        </div>
        <div>
          <div className="h-3 bg-grafite-claro/20 rounded w-24 mb-2"></div>
          <div className="h-10 bg-grafite-claro/10 rounded w-full"></div>
        </div>
      </div>
      <div>
        <div className="h-3 bg-grafite-claro/20 rounded w-32 mb-2"></div>
        <div className="h-10 bg-grafite-claro/10 rounded w-full"></div>
      </div>
      <div className="pt-2 flex gap-3">
        <div className="h-10 bg-navy/20 rounded w-32"></div>
        <div className="h-10 bg-grafite-claro/10 rounded w-24"></div>
      </div>
    </div>
  )
}
