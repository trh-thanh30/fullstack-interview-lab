"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="font-heading text-5xl">Interview bị gián đoạn.</h1><p className="mt-4 text-muted-foreground">Answer đã submit vẫn được lưu. Tải lại room để state machine phục hồi.</p><Button className="mt-7" onClick={reset}>Thử tải lại</Button></main>;
}
