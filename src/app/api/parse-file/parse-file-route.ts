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
    let text = ''

    // Word documents (.docx)
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    }

    // PDF files
    else if (fileName.endsWith('.pdf')) {
      try {
        const pdfParse = (await import('pdf-parse')).default
        const data = await pdfParse(buffer)
        text = data.text
      } catch {
        // pdf-parse sometimes fails on certain PDFs
        text = '[PDF could not be parsed — try copy-pasting the text directly]'
      }
    }

    // Plain text, markdown, CSV etc
    else if (
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md') ||
      fileName.endsWith('.csv') ||
      fileName.endsWith('.rtf') ||
      fileName.endsWith('.json')
    ) {
      text = buffer.toString('utf-8')
    }

    // Images — return placeholder
    else if (file.type.startsWith('image/')) {
      text = `[Image attached: ${file.name} — describe this image in your extraction prompt if relevant]`
    }

    // Unknown type — try as text
    else {
      try {
        text = buffer.toString('utf-8')
        // If it looks like binary, reject it
        if (text.includes('\x00') || (text.match(/[^\x09\x0A\x0D\x20-\x7E]/g) || []).length > text.length * 0.1) {
          text = `[${file.name} — unsupported file type. Try saving as .txt or copy-pasting the content]`
        }
      } catch {
        text = `[Could not read ${file.name}]`
      }
    }

    return NextResponse.json({
      text: text.trim(),
      fileName: file.name,
      size: file.size,
    })

  } catch (error: any) {
    console.error('Parse file error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
