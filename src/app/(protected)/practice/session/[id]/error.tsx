"use client";

import { RotateCcw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function SessionError({ reset }: { reset: () => void }) {
  return <div className="mx-auto max-w-xl px-4 py-24 text-center"><WifiOff className="mx-auto size-10 text-destructive" /><h1 className="mt-5 font-heading text-4xl">Mất kết nối với session.</h1><p className="mt-3 text-muted-foreground">Đáp án đã submit vẫn được lưu trên server. Kết nối lại để tiếp tục đúng vị trí hiện tại.</p><Button className="mt-6" onClick={reset}><RotateCcw />Kết nối lại</Button></div>;
}
