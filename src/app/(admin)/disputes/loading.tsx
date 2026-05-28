import { PageHeaderSkeleton, KpiRowSkeleton, TableSkeleton } from "../../../components/skeletons/PageSkeleton";

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={3} />
      <TableSkeleton rows={8} cols={6} />
    </div>
  );
}
