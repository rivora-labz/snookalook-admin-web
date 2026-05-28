import { PageHeaderSkeleton, KpiRowSkeleton, ChartSkeleton, TableSkeleton } from "../../../components/skeletons/PageSkeleton";

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2"><ChartSkeleton height="h-72" /></div>
        <ChartSkeleton height="h-72" />
      </div>
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
