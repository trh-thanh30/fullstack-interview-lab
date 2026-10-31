import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingEssaySession() {
  return <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><Skeleton className="h-20 w-2/3 rounded-2xl" /><Skeleton className="mt-8 h-[52rem] rounded-3xl" /></main>;
}

