import { Download, LockKeyhole, ShieldAlert } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";

import { DeleteAccountForm } from "./delete-account-form";

export default function PrivacyPage() {
  return <Suspense fallback={<PrivacySkeleton />}><PrivacyContent /></Suspense>;
}

async function PrivacyContent() {
  await connection();
  await requireAuthenticatedUser();
  return <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8"><header className="border-b pb-8"><p className="flex items-center gap-2 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase"><LockKeyhole className="size-4" />Privacy controls</p><h1 className="mt-3 font-heading text-6xl">Dữ liệu của bạn.</h1><p className="mt-4 max-w-2xl leading-7 text-muted-foreground">Export trước khi xóa. File export không chứa Blob URL riêng tư hay API secret.</p></header><div className="mt-8 grid gap-6 md:grid-cols-2"><section className="rounded-[1.75rem] border bg-card p-6"><Download className="size-6 text-accent-ink" /><h2 className="mt-5 text-2xl font-extrabold">Export JSON</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Tải profile, session, answer, evaluation, draft và lịch ôn thuộc tài khoản hiện tại.</p><a className={cn(buttonVariants(), "mt-5 rounded-full")} href="/api/privacy/export">Tải dữ liệu <Download /></a></section><section className="rounded-[1.75rem] border border-destructive/30 bg-destructive/5 p-6"><ShieldAlert className="size-6 text-destructive" /><h2 className="mt-5 text-2xl font-extrabold">Xóa tài khoản</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Xóa session, answer, evaluation, private diagram và lịch ôn. Không thể hoàn tác.</p><DeleteAccountForm /></section></div></main>;
}

function PrivacySkeleton() {
  return <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8"><Skeleton className="h-44 rounded-[2rem]" /><div className="mt-8 grid gap-6 md:grid-cols-2"><Skeleton className="h-80 rounded-[1.75rem]" /><Skeleton className="h-80 rounded-[1.75rem]" /></div></main>;
}
