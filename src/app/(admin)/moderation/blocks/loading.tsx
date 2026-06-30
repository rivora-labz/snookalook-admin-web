import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "../../../../components/skeletons/PageSkeleton";

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <TableSkeleton rows={8} cols={4} />
    </div>
  );
}
