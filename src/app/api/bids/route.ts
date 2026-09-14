// src/app/api/bids/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: "Bids endpoint coming soon." });
}

export async function POST(request: Request) {
  return NextResponse.json({ error: "Bids endpoint coming soon." }, { status: 501 });
}