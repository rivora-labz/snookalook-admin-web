import { PageHeaderSkeleton, KpiRowSkeleton, ChartSkeleton, TableSkeleton } from "../../../components/skeletons/PageSkeleton";

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={4} />
      <div className="mb-6"><ChartSkeleton height="h-64" /></div>
      <TableSkeleton rows={8} cols={6} />
    </div>
  );
}
