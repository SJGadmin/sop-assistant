import { put, del, list } from '@vercel/blob'

export async function uploadDocumentFile(
  filename: string,
  content: string | Buffer
): Promise<string> {
  const blob = await put(filename, content, {
    access: 'public',
    contentType: 'text/markdown',
  })
  return blob.url
}

export async function deleteDocumentFile(url: string): Promise<void> {
  await del(url)
}

export async function listDocumentFiles() {
  const { blobs } = await list()
  return blobs
}
