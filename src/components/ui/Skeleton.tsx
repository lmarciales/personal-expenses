import { cn } from "@/lib/utils";

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-lg bg-muted", className)} />
);

export const DashboardSkeleton = () => (
  <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
    {/* Header skeleton */}
    <div className="glass-card p-6 rounded-3xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-40 rounded-full" />
      </div>
    </div>

    {/* Recurring bills skeleton */}
    <div className="space-y-3">
      <Skeleton className="h-5 w-56" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>

    {/* Grid skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div className="md:col-span-6">
        <div className="glass-card p-6 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-48" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <div className="md:col-span-6">
        <div className="glass-card p-6 space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-3 w-full rounded-full mt-6" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>
      </div>
      <div className="md:col-span-4">
        <div className="glass-card p-6 space-y-4">
          <Skeleton className="h-4 w-40" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <div className="md:col-span-8">
        <div className="glass-card p-6 space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-[250px] w-full rounded-xl mt-4" />
        </div>
      </div>
    </div>
  </div>
);

export const DebtsSkeleton = () => (
  <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
    <div className="glass-card p-6 rounded-3xl">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-48 mt-2" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-10 w-32 rounded-full" />
      <Skeleton className="h-10 w-36 rounded-full" />
    </div>
    <Skeleton className="h-64 rounded-2xl" />
  </div>
);
