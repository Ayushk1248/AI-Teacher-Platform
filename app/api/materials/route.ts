import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// ─── Allowed file types ───────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.pptx', '.txt', '.md'])
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot).toLowerCase() : ''
}

function deriveFileType(filename: string): string {
  const ext = getExtension(filename)
  const map: Record<string, string> = {
    '.pdf': 'PDF',
    '.docx': 'DOCX',
    '.pptx': 'PPTX',
    '.txt': 'TXT',
    '.md': 'Markdown',
  }
  return map[ext] ?? 'File'
}

/**
 * Self-healing helper: ensure the 'materials' bucket exists in Supabase Storage.
 * Uses the service-role admin client if available.
 */
async function ensureBucketExists() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return

  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await adminClient.storage.createBucket('materials', { public: false })
  } catch (err) {
    console.error('[materials] Auto-create bucket error:', err)
  }
}

// ─── GET: list the user's materials ───────────────────────────────────────────

export async function GET() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Primary query: including file_size
  let { data, error } = await supabase
    .from('materials')
    .select('id, name, file_type, file_size, storage_path, created_at')
    .order('created_at', { ascending: false })

  // Fallback query: if file_size column doesn't exist yet on the table schema
  if (error && error.message?.includes('file_size')) {
    const fallback = await supabase
      .from('materials')
      .select('id, name, file_type, storage_path, created_at')
      .order('created_at', { ascending: false })

    data = fallback.data as typeof data
    error = fallback.error
  }

  if (error) {
    console.error('[materials/GET] DB error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ materials: data ?? [] })
}

// ─── POST: upload a file ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse multipart form data
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate extension
  const ext = getExtension(file.name)
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: `File type "${ext}" is not supported. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}` },
      { status: 400 },
    )
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File exceeds the 25 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)` },
      { status: 400 },
    )
  }

  // Build a unique storage path: {user_id}/{uuid}_{original_name}
  const uniqueId = crypto.randomUUID()
  const storagePath = `${user.id}/${uniqueId}_${file.name}`

  // Attempt upload to Supabase Storage
  let uploadResult = await supabase.storage
    .from('materials')
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  // Self-healing retry if bucket is missing
  if (uploadResult.error && /bucket not found/i.test(uploadResult.error.message)) {
    console.log('[materials/POST] Bucket missing. Attempting auto-creation...')
    await ensureBucketExists()

    // Retry upload
    uploadResult = await supabase.storage
      .from('materials')
      .upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })
  }

  if (uploadResult.error) {
    console.error('[materials/POST] Storage upload error:', uploadResult.error.message)
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })
  }

  // Insert metadata row
  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    name: file.name,
    file_type: deriveFileType(file.name),
    file_size: file.size,
    storage_path: storagePath,
  }

  let { data: material, error: dbError } = await supabase
    .from('materials')
    .insert(insertPayload)
    .select('id, name, file_type, file_size, storage_path, created_at')
    .single()

  // Fallback if file_size column doesn't exist on public.materials table yet
  if (dbError && dbError.message?.includes('file_size')) {
    delete insertPayload.file_size
    const fallbackDb = await supabase
      .from('materials')
      .insert(insertPayload)
      .select('id, name, file_type, storage_path, created_at')
      .single()

    material = fallbackDb.data as typeof material
    dbError = fallbackDb.error
  }

  if (dbError) {
    // Clean up uploaded storage file if DB insert fails
    await supabase.storage.from('materials').remove([storagePath])
    console.error('[materials/POST] DB insert error:', dbError.message)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ material })
}

// ─── DELETE: remove a material ────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as { id?: string }
  if (!body.id) {
    return NextResponse.json({ error: 'Missing material id' }, { status: 400 })
  }

  // Fetch the material
  const { data: material, error: fetchError } = await supabase
    .from('materials')
    .select('id, storage_path')
    .eq('id', body.id)
    .maybeSingle()

  if (fetchError) {
    console.error('[materials/DELETE] DB fetch error:', fetchError.message)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!material) {
    return NextResponse.json({ error: 'Material not found' }, { status: 404 })
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('materials')
    .remove([material.storage_path])

  if (storageError) {
    console.error('[materials/DELETE] Storage delete error:', storageError.message)
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('materials')
    .delete()
    .eq('id', body.id)

  if (dbError) {
    console.error('[materials/DELETE] DB delete error:', dbError.message)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
