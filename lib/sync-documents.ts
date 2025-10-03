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
    // First, clean up any existing collection documents
    console.log('🧹 Cleaning up collection documents from database...')
    const collectionsToRemove = ['BXADT-mGiAZAIN', 'qzpNTBo0mNLJqw', 'yPjLXWpDnn6ei2']
    for (const collectionId of collectionsToRemove) {
      try {
        await db.document.deleteMany({
          where: { sliteId: collectionId }
        })
        console.log(`🗑️ Removed collection: ${collectionId}`)
      } catch (error) {
        console.error(`❌ Error removing collection ${collectionId}:`, error)
      }
    }
    // Fetch all documents from Slite
    console.log('📡 Fetching documents from Slite...')
    const response = await sliteClient.searchNotes(undefined, 1000) // Get up to 1000 docs
    
    console.log(`📥 Found ${response.hits.length} documents in Slite`)
    
    // Collect all notes, but exclude collections and fetch their children instead
    const allNotes: SliteNote[] = []
    
    for (const note of response.hits) {
      // If this is a collection, fetch its children but don't include the collection itself
      if (note.type === 'collection') {
        console.log(`📁 Found collection "${note.title}", fetching children (excluding collection itself)...`)
        try {
          const childrenResponse = await sliteClient.getNoteChildren(note.id)
          const children = childrenResponse.notes || []
          console.log(`📄 Found ${children.length} documents in collection "${note.title}"`)
          allNotes.push(...children)
        } catch (error) {
          console.error(`❌ Error fetching children for collection ${note.title}:`, error)
          errors++
        }
      } else {
        // Only add non-collection documents
        allNotes.push(note)
      }
    }
    
    console.log(`📚 Total documents to sync (including children): ${allNotes.length}`)

    // Process each document
    for (const note of allNotes) {
      try {
        await syncSingleDocument(note)
        synced++
        
        if (synced % 10 === 0) {
          console.log(`🔄 Synced ${synced}/${allNotes.length} documents...`)
        }
      } catch (error) {
        console.error(`❌ Error syncing document ${note.id} (${note.title}):`, error)
        errors++
      }
    }

    // Now fetch full content for documents that don't have it yet
    console.log('📄 Fetching full content for documents without content...')
    const documents = await db.document.findMany({
      where: {
        AND: [
          { content: null },
          { markdown: null }
        ]
      },
      select: { sliteId: true, id: true, title: true }
    })

    let contentUpdated = 0
    for (const doc of documents) {
      try {
        const fullNote = await sliteClient.getNote(doc.sliteId)
        
        // Skip collections as they don't have meaningful content
        if (fullNote.type !== 'collection' && (fullNote.content || fullNote.markdown)) {
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