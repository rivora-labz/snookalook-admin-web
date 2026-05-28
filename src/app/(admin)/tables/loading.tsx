import { PageHeaderSkeleton, CardGridSkeleton } from "../../../components/skeletons/PageSkeleton";

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <CardGridSkeleton count={9} />
    </div>
  );
}
