import { asc, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import { sourceChunks, sources } from "@/db/schema";

import type {
  ChunkEmbedding,
  DuplicateCandidate,
  SourceNormalizationStore,
} from "./source-normalization";
import type { ChunkClassification } from "./content-taxonomy";

export class DrizzleSourceNormalizationStore implements SourceNormalizationStore {
  constructor(private readonly database: Database) {}

  listChunks() {
    return this.database
      .select({
        id: sourceChunks.id,
        sourceId: sourceChunks.sourceId,
        sourceTitle: sources.title,
        sourceUri: sources.uri,
        heading: sourceChunks.heading,
        content: sourceChunks.content,
        checksum: sourceChunks.checksum,
        embedding: sourceChunks.embedding,
        embeddingModel: sourceChunks.embeddingModel,
      })
      .from(sourceChunks)
      .innerJoin(sources, sql`${sourceChunks.sourceId} = ${sources.id}`)
      .orderBy(asc(sources.title), asc(sourceChunks.position));
  }

  async saveClassifications(classifications: ChunkClassification[], classifiedAt: Date) {
    if (classifications.length === 0) return;

    const classificationPayload = JSON.stringify(
      classifications.map((classification) => ({
        chunk_id: classification.chunkId,
        topic_slug: classification.topicSlug,
        level: classification.level,
        content_type: classification.contentType,
      })),
    );
    const chunkIds = JSON.stringify(classifications.map(({ chunkId }) => chunkId));
    const technologyPayload = JSON.stringify(
      classifications.flatMap(({ chunkId, technologySlugs }) =>
        technologySlugs.map((technologySlug) => ({
          chunk_id: chunkId,
          technology_slug: technologySlug,
        })),
      ),
    );

    await this.database.execute(sql`
      UPDATE source_chunks AS chunk
      SET
        topic_id = (SELECT id FROM topics WHERE slug = data.topic_slug),
        level = data.level::question_level,
        content_type = data.content_type::source_content_type,
        classified_at = ${classifiedAt}
      FROM jsonb_to_recordset(${classificationPayload}::jsonb)
        AS data(chunk_id uuid, topic_slug text, level text, content_type text)
      WHERE chunk.id = data.chunk_id
    `);

    await this.database.execute(sql`
      DELETE FROM source_chunk_technologies
      WHERE source_chunk_id IN (
        SELECT value::uuid FROM jsonb_array_elements_text(${chunkIds}::jsonb)
      )
    `);

    if (technologyPayload !== "[]") {
      await this.database.execute(sql`
        INSERT INTO source_chunk_technologies (source_chunk_id, technology_id)
        SELECT data.chunk_id, technology.id
        FROM jsonb_to_recordset(${technologyPayload}::jsonb)
          AS data(chunk_id uuid, technology_slug text)
        INNER JOIN technologies AS technology ON technology.slug = data.technology_slug
        ON CONFLICT DO NOTHING
      `);
    }
  }

  async saveEmbeddings(embeddings: ChunkEmbedding[], embeddedAt: Date) {
    if (embeddings.length === 0) return;

    const payload = JSON.stringify(
      embeddings.map((embedding) => ({
        chunk_id: embedding.chunkId,
        embedding: `[${embedding.embedding.join(",")}]`,
        model: embedding.model,
      })),
    );

    await this.database.execute(sql`
      UPDATE source_chunks AS chunk
      SET
        embedding = data.embedding::vector,
        embedding_model = data.model,
        embedded_at = ${embeddedAt}
      FROM jsonb_to_recordset(${payload}::jsonb)
        AS data(chunk_id uuid, embedding text, model text)
      WHERE chunk.id = data.chunk_id
    `);
  }

  async saveDuplicateCandidates(candidates: DuplicateCandidate[], detectedAt: Date) {
    if (candidates.length === 0) return;

    const payload = JSON.stringify(
      candidates.map((candidate) => ({
        first_chunk_id: candidate.firstChunkId,
        second_chunk_id: candidate.secondChunkId,
        kind: candidate.kind,
        similarity: candidate.similarity,
      })),
    );

    await this.database.execute(sql`
      INSERT INTO source_duplicate_candidates (
        first_chunk_id,
        second_chunk_id,
        kind,
        similarity,
        first_detected_at,
        last_detected_at
      )
      SELECT
        data.first_chunk_id,
        data.second_chunk_id,
        data.kind::duplicate_kind,
        data.similarity,
        ${detectedAt},
        ${detectedAt}
      FROM jsonb_to_recordset(${payload}::jsonb)
        AS data(
          first_chunk_id uuid,
          second_chunk_id uuid,
          kind text,
          similarity double precision
        )
      ON CONFLICT (first_chunk_id, second_chunk_id, kind) DO UPDATE SET
        similarity = EXCLUDED.similarity,
        last_detected_at = EXCLUDED.last_detected_at
    `);
  }
}
