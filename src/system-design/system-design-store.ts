import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import { designAttachments, interviewSessions, systemDesignCheckpointResponses, systemDesignProblems, systemDesignReviews } from "@/db/schema";

import { checkpointAt, systemDesignCheckpoints, type SystemDesignCheckpoint } from "./checkpoints";
import type { SystemDesignReviewOutput } from "./evaluator";

export class SystemDesignStore {
  constructor(private readonly database: Database) {}

  listProblems() {
    return this.database.select().from(systemDesignProblems).orderBy(asc(systemDesignProblems.level), asc(systemDesignProblems.title));
  }

  listRecentSessions(userId: string) {
    return this.database.select({ id: interviewSessions.id, state: interviewSessions.state, config: interviewSessions.config, currentPosition: interviewSessions.currentPosition, updatedAt: interviewSessions.updatedAt })
      .from(interviewSessions).where(and(eq(interviewSessions.userId, userId), eq(interviewSessions.mode, "system_design"))).orderBy(desc(interviewSessions.updatedAt)).limit(8);
  }

  async createSession(userId: string, problemId: string, now = new Date()) {
    const [problem] = await this.database.select({ id: systemDesignProblems.id }).from(systemDesignProblems).where(eq(systemDesignProblems.id, problemId)).limit(1);
    if (!problem) throw new Error("System-design template không tồn tại.");
    const [session] = await this.database.insert(interviewSessions).values({ userId, mode: "system_design", state: "answering", config: { templateId: problemId }, currentPosition: 0, version: 1, startedAt: now, createdAt: now, updatedAt: now }).returning({ id: interviewSessions.id });
    if (!session) throw new Error("Không thể tạo system-design session.");
    await this.database.insert(systemDesignCheckpointResponses).values({ sessionId: session.id, checkpoint: systemDesignCheckpoints[0].key, notes: "", savedAt: now });
    return session.id;
  }

  async getSession(userId: string, sessionId: string) {
    const [session] = await this.database.select().from(interviewSessions).where(and(eq(interviewSessions.id, sessionId), eq(interviewSessions.userId, userId), eq(interviewSessions.mode, "system_design"))).limit(1);
    if (!session?.config.templateId) return null;
    const [problem] = await this.database.select().from(systemDesignProblems).where(eq(systemDesignProblems.id, session.config.templateId)).limit(1);
    if (!problem) return null;
    const [responses, attachments] = await Promise.all([
      this.database.select().from(systemDesignCheckpointResponses).where(eq(systemDesignCheckpointResponses.sessionId, sessionId)).orderBy(asc(systemDesignCheckpointResponses.savedAt)),
      this.database.select().from(designAttachments).where(eq(designAttachments.sessionId, sessionId)).orderBy(desc(designAttachments.createdAt)),
    ]);
    const responseIds = responses.map(({ id }) => id);
    const reviews = responseIds.length ? await this.database.select().from(systemDesignReviews).where(inArray(systemDesignReviews.responseId, responseIds)).orderBy(desc(systemDesignReviews.createdAt)) : [];
    return { session, problem, currentCheckpoint: checkpointAt(session.currentPosition), responses: responses.map((response) => ({ ...response, reviews: reviews.filter(({ responseId }) => responseId === response.id) })), attachments };
  }

  async saveNotes(input: { userId: string; sessionId: string; checkpoint: SystemDesignCheckpoint; notes: string; now?: Date }) {
    const data = await this.getSession(input.userId, input.sessionId);
    if (!data || data.session.state !== "answering" || data.currentCheckpoint?.key !== input.checkpoint) throw new Error("Checkpoint không còn nhận notes.");
    const notes = input.notes.slice(0, 50_000);
    const savedAt = input.now ?? new Date();
    await this.database.insert(systemDesignCheckpointResponses).values({ sessionId: input.sessionId, checkpoint: input.checkpoint, notes, savedAt }).onConflictDoUpdate({ target: [systemDesignCheckpointResponses.sessionId, systemDesignCheckpointResponses.checkpoint], set: { notes, savedAt, version: sql`${systemDesignCheckpointResponses.version} + 1` } });
    return savedAt;
  }

  async getReviewInput(userId: string, sessionId: string, expectedVersion: number, checkpoint: SystemDesignCheckpoint) {
    const data = await this.getSession(userId, sessionId);
    if (!data || data.session.state !== "answering" || data.session.version !== expectedVersion || data.currentCheckpoint?.key !== checkpoint) return null;
    const response = data.responses.find((item) => item.checkpoint === checkpoint);
    if (!response || response.notes.trim().length < 30) throw new Error("Notes cần ít nhất 30 ký tự trước khi review.");
    return { ...data, response, previousNotes: data.responses.filter((item) => item.checkpoint !== checkpoint && item.submittedAt).map(({ checkpoint: key, notes }) => ({ checkpoint: key, notes })) };
  }

  async completeCheckpoint(input: { userId: string; sessionId: string; expectedVersion: number; responseId: string; review: SystemDesignReviewOutput; model: string; promptVersion: string; correlationId: string; providerResponseId: string | null; now?: Date }) {
    const now = input.now ?? new Date();
    const [session] = await this.database.update(interviewSessions).set({ currentPosition: sql`${interviewSessions.currentPosition} + 1`, version: sql`${interviewSessions.version} + 1`, state: sql`CASE WHEN ${interviewSessions.currentPosition} + 1 >= ${systemDesignCheckpoints.length} THEN 'summary'::session_state ELSE 'answering'::session_state END`, completedAt: sql`CASE WHEN ${interviewSessions.currentPosition} + 1 >= ${systemDesignCheckpoints.length} THEN ${now} ELSE ${interviewSessions.completedAt} END`, updatedAt: now }).where(and(eq(interviewSessions.id, input.sessionId), eq(interviewSessions.userId, input.userId), eq(interviewSessions.version, input.expectedVersion), eq(interviewSessions.state, "answering"))).returning({ position: interviewSessions.currentPosition, state: interviewSessions.state });
    if (!session) throw new Error("Session đã được cập nhật bởi request khác.");
    await this.database.insert(systemDesignReviews).values({ responseId: input.responseId, model: input.model, promptVersion: input.promptVersion, score: input.review.score, dimensionScores: input.review.dimensionScores, strengths: input.review.strengths, gaps: input.review.gaps, assumptions: input.review.assumptions, tradeoffs: input.review.tradeoffs, nextQuestions: input.review.nextQuestions, summary: input.review.summary, correlationId: input.correlationId, providerResponseId: input.providerResponseId, createdAt: now });
    await this.database.update(systemDesignCheckpointResponses).set({ submittedAt: now }).where(eq(systemDesignCheckpointResponses.id, input.responseId));
    const next = checkpointAt(session.position);
    if (next) await this.database.insert(systemDesignCheckpointResponses).values({ sessionId: input.sessionId, checkpoint: next.key, notes: "", savedAt: now }).onConflictDoNothing();
    return session.state;
  }

  async addMermaid(input: { userId: string; sessionId: string; text: string; altText: string; now?: Date }) {
    if (!await this.owns(input.userId, input.sessionId)) throw new Error("Session không tồn tại.");
    await this.database.insert(designAttachments).values({ sessionId: input.sessionId, kind: "mermaid", mermaidText: input.text, altText: input.altText, sizeBytes: new TextEncoder().encode(input.text).byteLength, mimeType: "text/vnd.mermaid", createdAt: input.now ?? new Date() });
  }

  async addImage(input: { userId: string; sessionId: string; filename: string; mimeType: string; sizeBytes: number; blobUrl: string; blobPathname: string; altText: string; now?: Date }) {
    if (!await this.owns(input.userId, input.sessionId)) throw new Error("Session không tồn tại.");
    await this.database.insert(designAttachments).values({ sessionId: input.sessionId, kind: "image", filename: input.filename, mimeType: input.mimeType, sizeBytes: input.sizeBytes, blobUrl: input.blobUrl, blobPathname: input.blobPathname, altText: input.altText, createdAt: input.now ?? new Date() });
  }

  async getOwnedAttachment(userId: string, attachmentId: string) {
    const [row] = await this.database.select({ attachment: designAttachments, sessionId: interviewSessions.id }).from(designAttachments).innerJoin(interviewSessions, eq(interviewSessions.id, designAttachments.sessionId)).where(and(eq(designAttachments.id, attachmentId), eq(interviewSessions.userId, userId))).limit(1);
    return row?.attachment ?? null;
  }

  async deleteAttachmentRecord(userId: string, attachmentId: string) {
    const attachment = await this.getOwnedAttachment(userId, attachmentId);
    if (!attachment) throw new Error("Attachment không tồn tại.");
    await this.database.delete(designAttachments).where(eq(designAttachments.id, attachmentId));
    return attachment;
  }

  private async owns(userId: string, sessionId: string) {
    const [row] = await this.database.select({ id: interviewSessions.id }).from(interviewSessions).where(and(eq(interviewSessions.id, sessionId), eq(interviewSessions.userId, userId), eq(interviewSessions.mode, "system_design"))).limit(1);
    return Boolean(row);
  }
}
