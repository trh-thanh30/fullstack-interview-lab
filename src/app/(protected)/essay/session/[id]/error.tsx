"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function EssaySessionError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-4 py-12 text-center">
      <div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive"><AlertTriangle /></span><h1 className="mt-5 font-heading text-4xl">Không tải được essay session.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Draft đã autosave vẫn được giữ trong database. Hãy kết nối lại và thử tải trang.</p><Button className="mt-6 rounded-xl" onClick={reset}><RefreshCw />Thử lại</Button></div>
    </main>
  );
}
