import { Skeleton } from "@/components/ui/skeleton";

export default function SessionLoading() {
  return <div className="mx-auto max-w-5xl px-4 py-12"><Skeleton className="h-5 w-44" /><Skeleton className="mt-7 h-[42rem] rounded-[2rem]" /></div>;
}
