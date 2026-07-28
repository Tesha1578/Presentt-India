import { cn } from '@/lib/utils';

/** Shimmer placeholder for a customer grid card. */
export function CustomerCardShimmer() {
  return (
    <div className="card-e1 rounded-[24px] p-5">
      <div className="flex items-start gap-3.5">
        <div className="shimmer-base h-12 w-12 rounded-[14px]" />
        <div className="flex-1">
          <div className="shimmer-base h-4 w-3/4 rounded-full" />
          <div className="shimmer-base mt-2 h-3 w-1/3 rounded-full" />
        </div>
        <div className="shimmer-base h-4 w-10 rounded-full" />
      </div>
      <div className="mt-4 flex gap-1.5">
        <div className="shimmer-base h-[22px] w-16 rounded-full" />
        <div className="shimmer-base h-[22px] w-20 rounded-full" />
        <div className="shimmer-base h-[22px] w-24 rounded-full" />
      </div>
      <div className="shimmer-base mt-4 h-3 w-2/3 rounded-full" />
      <div className="shimmer-base mt-2 h-3 w-1/2 rounded-full" />
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3.5">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="shimmer-base h-2.5 w-12 rounded-full" />
            <div className="shimmer-base mt-2 h-4 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Grid of shimmer cards (never spinners). */
export function CustomerGridShimmer({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <CustomerCardShimmer key={i} />
      ))}
    </div>
  );
}
