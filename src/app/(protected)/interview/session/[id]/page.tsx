import { ArrowLeft, LoaderCircle, MessagesSquare, Play, RotateCw } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDatabase } from "@/db/client";
import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { MockInterviewStore } from "@/mock-interview/mock-interview-store";

import { recoverMockEvaluationAction, recoverMockInterviewAction, startMockInterviewAction } from "../../actions";
import { InterviewRoom } from "./interview-room";

export function generateStaticParams() {
  return [{ id: "00000000-0000-4000-8000-000000000000" }];
}

export default function MockInterviewSessionPage({ params }: { params: Promise<{ id: string }> }) {
  return <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <header className="flex items-center justify-between gap-4"><Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/interview"><ArrowLeft />Interview lobby</Link><p className="flex items-center gap-2 text-xs font-extrabold tracking-[.18em] text-accent-ink uppercase"><MessagesSquare className="size-4" />Live room</p></header>
    <Suspense fallback={<Skeleton className="mt-6 h-[46rem] rounded-[2rem]" />}><SessionContent params={params} /></Suspense>
  </main>;
}

async function SessionContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const [{ id }, user] = await Promise.all([params, requireAuthenticatedUser()]);
  const room = await new MockInterviewStore(getDatabase()).getRoom(user.id, id);
  if (!room) notFound();
  if (room.session.state === "summary" || room.session.state === "completed") redirect(`/interview/session/${id}/report`);

  if (room.session.state === "setup") {
    const action = startMockInterviewAction.bind(null, id, room.session.version);
    return <CenteredState title="Phòng đã sẵn sàng" description={`${room.session.config.questionCount ?? 5} câu chính · ${room.session.config.durationMinutes ?? 35} phút. Đồng hồ bắt đầu khi bạn nhấn Start.`}><form action={action}><Button className="rounded-xl" size="lg" type="submit"><Play />Bắt đầu phỏng vấn</Button></form></CenteredState>;
  }
  if (room.session.state === "asking") {
    const action = recoverMockInterviewAction.bind(null, id, room.session.version);
    return <CenteredState title="Đang chọn câu tiếp theo" description="Rule engine đang cân bằng topic coverage và loại bỏ các câu đã hỏi."><form action={action}><Button className="rounded-xl" type="submit"><RotateCw />Tiếp tục chọn câu</Button></form></CenteredState>;
  }
  if (room.session.state === "evaluating") {
    const action = recoverMockEvaluationAction.bind(null, id, room.session.version);
    return <CenteredState title="Answer đã được lưu" description="Request đánh giá trước đó chưa hoàn tất. Bạn có thể tiếp tục an toàn; engine sẽ dùng fallback sang câu kế tiếp."><form action={action}><Button className="rounded-xl" type="submit"><LoaderCircle />Khôi phục interview</Button></form></CenteredState>;
  }
  if (room.session.state === "abandoned") return <CenteredState title="Interview đã kết thúc sớm" description="Các answer trước đó vẫn được giữ để xem lại trong lịch sử."><Link className={buttonVariants()} href="/interview">Về interview lobby</Link></CenteredState>;
  if (!room.current) throw new Error("Session không có câu hỏi hiện tại.");

  return <InterviewRoom session={{
    id,
    state: room.session.state as "answering" | "follow_up",
    version: room.session.version,
    deadlineAt: room.session.deadlineAt?.toISOString() ?? null,
    questionCount: room.session.config.questionCount ?? 5,
    baseQuestionCount: room.baseQuestionCount,
    turnCount: room.turns.length,
    current: { id: room.current.id, prompt: room.current.promptSnapshot, topicName: room.current.topicNameSnapshot, followUpNumber: room.current.followUpNumber },
    draft: room.draft?.answerText ?? "",
    draftSavedAt: room.draft?.savedAt.toISOString() ?? null,
    transcript: room.turns.filter(({ position }) => position < room.session.currentPosition).map((turn) => ({ id: turn.id, prompt: turn.promptSnapshot, answer: turn.answer?.answerText ?? "" })),
  }} />;
}

function CenteredState({ children, description, title }: { children: React.ReactNode; description: string; title: string }) {
  return <Card className="mx-auto mt-16 max-w-xl rounded-[2rem] border-dashed"><CardContent className="p-10 text-center"><h1 className="font-heading text-4xl">{title}</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">{description}</p><div className="mt-7">{children}</div></CardContent></Card>;
}
