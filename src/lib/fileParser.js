// Extract text from uploaded files
export async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext === 'pdf') return extractPDF(file)
  if (ext === 'docx') return extractDOCX(file)
  if (ext === 'pptx') return extractPPTX(file)
  if (ext === 'txt') return file.text()
  throw new Error(`Unsupported file type: .${ext}`)
}

async function extractPDF(file) {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(item => item.str).join(' ') + '\n'
  }
  return text.trim()
}

async function extractDOCX(file) {
  const mammothModule = await import('mammoth')
  const mammoth = mammothModule.default || mammothModule
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.trim()
}

async function extractPPTX(file) {
  const JSZipModule = await import('jszip')
  const JSZip = JSZipModule.default || JSZipModule
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  let text = ''
  const slideFiles = Object.keys(zip.files)
    .filter(name => name.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort()
  for (const slideName of slideFiles) {
    const xml = await zip.files[slideName].async('text')
    const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || []
    text += matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ') + '\n'
  }
  return text.trim()
}
