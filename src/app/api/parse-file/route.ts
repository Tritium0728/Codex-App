import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = file.name.toLowerCase()
    const mimeType = file.type.toLowerCase()
    let text = ''

    // Word documents
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc') || mimeType.includes('word') || mimeType.includes('officedocument')) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    }
    // PDF
    else if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
      try {
        const pdfParse = (await import('pdf-parse')).default
        const data = await pdfParse(buffer)
        text = data.text
      } catch {
        return NextResponse.json({ error: 'Could not parse PDF — try copy-pasting the text directly' }, { status: 400 })
      }
    }
    // Images
    else if (mimeType.startsWith('image/')) {
      text = `[Image: ${file.name}]`
    }
    // Plain text types
    else {
      try {
        text = buffer.toString('utf-8')
        // Check if it looks like binary
        const nonPrintable = (text.match(/[^\x09\x0A\x0D\x20-\x7E]/g) || []).length
        if (text.includes('\x00') || nonPrintable > text.length * 0.1) {
          return NextResponse.json({ 
            error: `${file.name} appears to be a binary file. Try saving as .txt or copy-pasting the content.` 
          }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: `Could not read ${file.name}` }, { status: 400 })
      }
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'File appears to be empty or could not extract text' }, { status: 400 })
    }

    return NextResponse.json({ text: text.trim(), fileName: file.name })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
