import { PageHeaderSkeleton, KpiRowSkeleton, CardGridSkeleton } from "../../../components/skeletons/PageSkeleton";

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={4} />
      <CardGridSkeleton count={6} />
    </div>
  );
}
