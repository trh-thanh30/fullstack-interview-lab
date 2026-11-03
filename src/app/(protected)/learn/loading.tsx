import { Skeleton } from "@/components/ui/skeleton";

export default function LearningLoading() {
  return <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><Skeleton className="h-48 rounded-[2rem]" /><div className="mt-8 grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton className="h-36 rounded-2xl" key={index} />)}</div><Skeleton className="mt-6 h-96 rounded-[2rem]" /></main>;
}
