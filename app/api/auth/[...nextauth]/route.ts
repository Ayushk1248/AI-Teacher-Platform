export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    ok: false,
    message: 'Authentication is handled by Supabase Auth.',
  })
}

export async function POST() {
  return Response.json({
    ok: false,
    message: 'Authentication is handled by Supabase Auth.',
  })
}
