import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <main className="mx-auto max-w-[92rem] px-4 py-8">
      <Skeleton className="h-[56rem] rounded-[2rem]" />
    </main>
  );
}
