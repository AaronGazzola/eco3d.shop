import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Diagnostics capture is disabled in production' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const markdown = body?.markdown
  if (typeof markdown !== 'string' || markdown.length === 0) {
    return NextResponse.json({ error: 'Missing markdown' }, { status: 400 })
  }

  const dir = path.join(process.cwd(), 'documentation', 'diagnostics')
  await mkdir(dir, { recursive: true })

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `capture-${stamp}.md`
  await writeFile(path.join(dir, fileName), markdown, 'utf8')

  return NextResponse.json({ path: `documentation/diagnostics/${fileName}` })
}
