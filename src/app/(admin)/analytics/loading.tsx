import { PageHeaderSkeleton, KpiRowSkeleton, ChartSkeleton } from "../../../components/skeletons/PageSkeleton";

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height="h-72" />
        <ChartSkeleton height="h-72" />
        <ChartSkeleton height="h-64" />
        <ChartSkeleton height="h-64" />
      </div>
    </div>
  );
}
