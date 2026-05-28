import { PageHeaderSkeleton, TableSkeleton } from "../../../components/skeletons/PageSkeleton";

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <TableSkeleton rows={10} cols={6} />
    </div>
  );
}
