import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const categories = db.prepare('SELECT id, slug, name, description FROM categories ORDER BY id').all();
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
