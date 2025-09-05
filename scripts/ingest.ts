#!/usr/bin/env tsx

import { ingestSliteDocs } from '../lib/rag'

async function main() {
  try {
    console.log('Starting Slite document ingestion...')
    
    const result = await ingestSliteDocs()
    
    console.log(`\n✅ Ingestion completed:`)
    console.log(`   📄 Documents processed: ${result.processed}`)
    console.log(`   🔄 Documents updated: ${result.updated}`)
    
    if (result.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`)
      result.errors.forEach(error => {
        console.log(`   • ${error}`)
      })
      process.exit(1)
    }
    
    console.log('\n🎉 All documents processed successfully!')
    
  } catch (error) {
    console.error('❌ Ingestion failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}