# Migration Plan: Slite to Local Storage + RAG

## Overview

This migration removes the Slite dependency and activates the existing (but unused) local RAG infrastructure with Vercel Blob storage for document files.

## Current Architecture

```
User Query → Slite /ask API → OpenAI GPT-4 → Response
                  ↓
        (Slite does retrieval)
```

**Problem**: Paying for Slite's AI retrieval when we already have:
- pgvector configured in PostgreSQL
- Chunk table with embedding column
- Embedding generation code (`lib/embeddings.ts`)
- Text chunking code (`lib/chunker.ts`)

## Target Architecture

```
User Query → Local Vector Search (pgvector) → OpenAI GPT-4 → Response
                      ↓
         PostgreSQL chunks table
                      ↓
         Documents stored in Vercel Blob
```

## Migration Tasks

### Phase 1: Database Schema Updates

**File: `prisma/schema.prisma`**

Changes:
- Remove `sliteId` field from Document (no longer unique identifier)
- Add `blobUrl` field for Vercel Blob storage URL
- Add `status` field for document processing state
- Keep existing Chunk table structure (already correct)

```prisma
model Document {
  id          String   @id @default(cuid())
  title       String
  content     String?  @db.Text  // HTML content for display
  markdown    String?  @db.Text  // Markdown source (editable)
  blobUrl     String?            // Vercel Blob URL for original file
  status      DocumentStatus @default(DRAFT)
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  chunks Chunk[]

  @@map("documents")
}

enum DocumentStatus {
  DRAFT
  PROCESSING
  PUBLISHED
  ARCHIVED
}
```

### Phase 2: Local RAG Implementation

**File: `lib/rag.ts`**

Replace `sliteClient.ask()` with local vector similarity search:

1. Generate embedding for user query using `getEmbedding()`
2. Perform cosine similarity search against chunks table
3. Return top-K most similar chunks
4. Pass chunks to OpenAI as context

```typescript
// New function to replace Slite ask
async function searchSimilarChunks(query: string, topK: number = 8): Promise<ChunkWithDocument[]> {
  const embedding = await getEmbedding(query)

  // pgvector cosine similarity search
  const chunks = await db.$queryRaw`
    SELECT c.*, d.title as document_title
    FROM chunks c
    JOIN documents d ON c."documentId" = d.id
    WHERE d.status = 'PUBLISHED'
    ORDER BY c.embedding <=> ${embedding}::vector
    LIMIT ${topK}
  `

  return chunks
}
```

### Phase 3: Blob Storage Integration

**New File: `lib/blob.ts`**

```typescript
import { put, del, list } from '@vercel/blob'

export async function uploadDocument(file: File): Promise<string> {
  const blob = await put(file.name, file, { access: 'public' })
  return blob.url
}

export async function deleteDocument(url: string): Promise<void> {
  await del(url)
}
```

### Phase 4: Document Management API

**New/Updated Files:**

1. `app/api/admin/documents/route.ts` - CRUD for documents
2. `app/api/admin/documents/[id]/route.ts` - Single document operations
3. `app/api/admin/documents/[id]/publish/route.ts` - Publish document (triggers embedding)

**Document Creation Flow:**
1. Admin creates/edits document in rich text editor
2. Save as draft (no embeddings yet)
3. Admin clicks "Publish"
4. System chunks the markdown content
5. System generates embeddings for each chunk
6. System saves chunks to database
7. Document status → PUBLISHED

### Phase 5: Admin UI

**New File: `app/(app)/admin/page.tsx`**

Features:
- Document list with status indicators
- Create new document button
- Rich text editor (TipTap recommended)
- Save draft / Publish buttons
- Delete document with confirmation

**Rich Text Editor**: Install TipTap
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-table
```

### Phase 6: Public Docs Page Updates

**File: `app/(app)/docs/page.tsx`**

Changes:
- Remove "Sync from Slite" button
- Update to use new Document fields
- Add full-text search using PostgreSQL
- Show only PUBLISHED documents

### Phase 7: Cleanup

**Remove:**
- `lib/slite.ts`
- `lib/sync-documents.ts`
- `app/api/documents/sync/route.ts`
- `scripts/ingest.ts`
- `app/api/ingest/route.ts`

**Update:**
- `lib/env.ts` - Remove SLITE_API_KEY requirement
- `lib/config.ts` - Remove slite config section
- `.env.example` - Remove Slite vars, add BLOB_READ_WRITE_TOKEN

## Environment Variables

**Remove:**
```
SLITE_API_KEY
SLITE_CHANNEL_FILTER
```

**Add:**
```
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

## File Changes Summary

| Action | File |
|--------|------|
| MODIFY | `prisma/schema.prisma` |
| MODIFY | `lib/rag.ts` |
| MODIFY | `lib/env.ts` |
| MODIFY | `lib/config.ts` |
| MODIFY | `app/(app)/docs/page.tsx` |
| CREATE | `lib/blob.ts` |
| CREATE | `app/(app)/admin/page.tsx` |
| CREATE | `app/api/admin/documents/route.ts` |
| CREATE | `app/api/admin/documents/[id]/route.ts` |
| CREATE | `app/api/admin/documents/[id]/publish/route.ts` |
| CREATE | `components/RichTextEditor.tsx` |
| DELETE | `lib/slite.ts` |
| DELETE | `lib/sync-documents.ts` |
| DELETE | `app/api/documents/sync/route.ts` |
| DELETE | `scripts/ingest.ts` |
| DELETE | `app/api/ingest/route.ts` |

## Dependencies

**Add:**
```json
"@vercel/blob": "^0.19.0",
"@tiptap/react": "^2.1.0",
"@tiptap/starter-kit": "^2.1.0",
"@tiptap/extension-link": "^2.1.0",
"@tiptap/extension-image": "^2.1.0",
"@tiptap/extension-placeholder": "^2.1.0"
```

## Testing Checklist

- [ ] Document creation and editing works
- [ ] Rich text editor saves markdown correctly
- [ ] Publishing generates embeddings
- [ ] Vector search returns relevant chunks
- [ ] Chat responses use local RAG context
- [ ] Public docs page shows published documents
- [ ] Search works on public docs page
- [ ] Document deletion removes chunks and blob

## Rollback Plan

If issues arise:
1. Keep Slite API key in env (don't delete from Slite)
2. Schema changes are additive (old fields kept initially)
3. Can revert to Slite by restoring `lib/rag.ts` to use `sliteClient.ask()`
