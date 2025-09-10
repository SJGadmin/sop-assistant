import { db } from './db'
import { sliteClient, type SliteNote } from './slite'
import crypto from 'crypto'

interface SyncResult {
  synced: number
  updated: number
  errors: number
}

export async function syncDocumentsFromSlite(): Promise<SyncResult> {
  console.log('🔄 Starting document sync from Slite...')
  
  let synced = 0
  let updated = 0
  let errors = 0

  try {
    // Fetch all documents from Slite
    console.log('📡 Fetching documents from Slite...')
    const response = await sliteClient.searchNotes(undefined, 1000) // Get up to 1000 docs
    
    console.log(`📥 Found ${response.notes.length} documents in Slite`)

    // Process each document
    for (const note of response.notes) {
      try {
        await syncSingleDocument(note)
        synced++
        
        if (synced % 10 === 0) {
          console.log(`🔄 Synced ${synced}/${response.notes.length} documents...`)
        }
      } catch (error) {
        console.error(`❌ Error syncing document ${note.id} (${note.title}):`, error)
        errors++
      }
    }

    // Now fetch full content for each document
    console.log('📄 Fetching full content for documents...')
    const documents = await db.document.findMany({
      select: { sliteId: true, id: true, title: true }
    })

    let contentUpdated = 0
    for (const doc of documents) {
      try {
        const fullNote = await sliteClient.getNote(doc.sliteId)
        
        if (fullNote.content || fullNote.markdown) {
          const contentHash = generateContentHash(fullNote.content || fullNote.markdown || '')
          
          await db.document.update({
            where: { sliteId: doc.sliteId },
            data: {
              content: fullNote.content,
              markdown: fullNote.markdown,
              hash: contentHash,
            }
          })
          
          contentUpdated++
          updated++
        }

        if (contentUpdated % 5 === 0) {
          console.log(`📝 Updated content for ${contentUpdated}/${documents.length} documents...`)
        }
      } catch (error) {
        console.error(`❌ Error fetching content for ${doc.title}:`, error)
        errors++
      }
    }

    console.log(`✅ Sync complete! Synced: ${synced}, Updated: ${updated}, Errors: ${errors}`)
    return { synced, updated, errors }

  } catch (error) {
    console.error('💥 Fatal error during sync:', error)
    throw error
  }
}

async function syncSingleDocument(note: SliteNote): Promise<void> {
  const contentHash = generateContentHash(note.content || note.markdown || note.title)
  
  // Check if document exists
  const existingDoc = await db.document.findUnique({
    where: { sliteId: note.id }
  })

  const documentData = {
    title: note.title,
    content: note.content,
    markdown: note.markdown,
    url: note.url,
    parentId: note.parentId,
    authorId: note.authorId,
    sliteCreatedAt: note.createdAt ? new Date(note.createdAt) : null,
    sliteUpdatedAt: new Date(note.updatedAt),
    hash: contentHash,
  }

  if (existingDoc) {
    // Update if content changed
    if (existingDoc.hash !== contentHash) {
      await db.document.update({
        where: { sliteId: note.id },
        data: documentData,
      })
    }
  } else {
    // Create new document
    await db.document.create({
      data: {
        sliteId: note.id,
        ...documentData,
      },
    })
  }
}

function generateContentHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

// CLI function for manual sync
if (require.main === module) {
  syncDocumentsFromSlite()
    .then((result) => {
      console.log('Sync completed:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('Sync failed:', error)
      process.exit(1)
    })
}