// app/api/escrow/dispute/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { escrowId, reason } = await request.json();

    if (!reason || reason.length < 10) {
      return NextResponse.json({ error: 'Please provide a detailed reason for the dispute.' }, { status: 400 });
    }

    // Trigger the database freeze
    const { data, error } = await supabase.rpc('open_escrow_dispute', {
      p_escrow_id: escrowId,
      p_buyer_id: user.id,
      p_reason: reason
    });

    if (error) throw error;
    if (!data.success) return NextResponse.json({ error: data.error }, { status: 400 });

    // 🚀 TELEMETRY / ADMIN NOTIFICATION
    // Fire a webhook to your private Admin Telegram group so you know a dispute just opened
    fetch(process.env.ADMIN_TELEGRAM_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *NEW ESCROW DISPUTE*\nEscrow ID: \`${escrowId}\`\nReason: "${reason}"\nAction Required: Freeze confirmed. Log into Admin Panel to mediate.`
      })
    }).catch(() => {});

    return NextResponse.json({ success: true, message: data.message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}