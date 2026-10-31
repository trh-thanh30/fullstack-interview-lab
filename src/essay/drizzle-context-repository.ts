import { sql } from "drizzle-orm";

import type { Database } from "@/db/client";

import type { ContextRepository, RetrievalCandidate } from "./context-retrieval";

export class DrizzleContextRepository implements ContextRepository {
  constructor(private readonly database: Database) {}

  async findSimilar(input: Parameters<ContextRepository["findSimilar"]>[0]) {
    const vector = `[${input.embedding.join(",")}]`;
    const technologyFilter = input.technologyIds.length
      ? sql`AND EXISTS (
          SELECT 1 FROM source_chunk_technologies link
          WHERE link.source_chunk_id = chunk.id
            AND link.technology_id IN (${sql.join(input.technologyIds.map((id) => sql`${id}::uuid`), sql`, `)})
        )`
      : sql``;

    const result = await this.database.execute(sql`
      SELECT
        chunk.id,
        source.title AS source_title,
        chunk.heading,
        chunk.page_number,
        chunk.content,
        1 - (chunk.embedding <=> ${vector}::vector) AS similarity
      FROM source_chunks chunk
      INNER JOIN sources source ON source.id = chunk.source_id
      WHERE source.status = 'processed'
        AND chunk.topic_id = ${input.topicId}::uuid
        AND chunk.embedding IS NOT NULL
        AND chunk.embedding_model = ${input.embeddingModel}
        ${technologyFilter}
      ORDER BY chunk.embedding <=> ${vector}::vector
      LIMIT ${input.limit}
    `);

    return result.rows.map((row) => ({
      id: String(row.id),
      sourceTitle: String(row.source_title),
      heading: row.heading ? String(row.heading) : null,
      pageNumber: row.page_number === null ? null : Number(row.page_number),
      content: String(row.content),
      similarity: Number(row.similarity),
    })) satisfies RetrievalCandidate[];
  }
}

