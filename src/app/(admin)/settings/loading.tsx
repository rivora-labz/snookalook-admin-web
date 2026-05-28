import { PageHeaderSkeleton, SkBox, SkLine } from "../../../components/skeletons/PageSkeleton";

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-th-card bg-th-card/40 p-5 flex flex-col gap-3">
              <SkLine className="h-5 w-40" />
              <SkLine className="h-4 w-3/4" />
              <SkBox className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <SkBox className="h-40 w-full" />
          <SkBox className="h-28 w-full" />
        </div>
      </div>
    </div>
  );
}
