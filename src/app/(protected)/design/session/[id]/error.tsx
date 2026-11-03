'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-heading text-5xl">Studio bị gián đoạn.</h1>
      <p className="mt-4 text-muted-foreground">Notes đã autosave vẫn còn trong database.</p>
      <Button className="mt-6" onClick={reset}>
        Tải lại workspace
      </Button>
    </main>
  );
}
