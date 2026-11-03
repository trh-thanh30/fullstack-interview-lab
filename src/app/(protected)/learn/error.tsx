"use client";

import { Button } from "@/components/ui/button";

export default function LearningError({ reset }: { error: Error; reset: () => void }) {
  return <main className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center px-6 text-center"><div><p className="text-xs font-extrabold tracking-widest text-destructive uppercase">Learning radar offline</p><h1 className="mt-3 font-heading text-5xl">Không thể tải tiến độ.</h1><p className="mt-4 text-muted-foreground">Thử tải lại. Dữ liệu session của bạn không bị thay đổi.</p><Button className="mt-7 rounded-full" onClick={reset}>Thử lại</Button></div></main>;
}
