import {
  PageHeaderSkeleton,
  KpiRowSkeleton,
  TableSkeleton,
} from "../../../../components/skeletons/PageSkeleton";

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={3} />
      <TableSkeleton rows={10} cols={7} />
    </div>
  );
}
