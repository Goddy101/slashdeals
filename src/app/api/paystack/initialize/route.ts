// src/app/api/paystack/initialize/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Bachs from '@bachs/sdk'; // Make sure to run: npm install @bachs/sdk

// Initialize the Bachs client (only runs if the key exists)
const BachsClient = (Bachs as any).default ?? Bachs;
const bachs = process.env.BACHS_SECRET_KEY ? new BachsClient({ key: process.env.BACHS_SECRET_KEY }) : null;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Your frontend might be sending `dealId` or `deal_id`, extracting it here:
    const body = await request.json();
    const dealId = body.dealId || body.deal_id;

    // 1. Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Fetch the deal details (CRITICAL: We need category & asset_type to route the payment)
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('title, deal_price, category, asset_type, user_id')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) throw new Error("Deal not found");
    if (deal.user_id === user.id) throw new Error("You cannot buy your own asset");

    // 3. Create the pending Escrow Vault (Status: awaiting_payment)
    const { data: vault, error: vaultError } = await supabase
      .from('escrows')
      .insert([{
        deal_id: dealId,
        buyer_id: user.id,
        seller_id: deal.user_id,
        amount: deal.deal_price,
        status: 'awaiting_payment'
      }])
      .select()
      .single();

    if (vaultError) throw vaultError;

    // 4. Define what constitutes a "Digital Asset"
    const digitalAssetTypes = ['saas', 'content_site', 'ecommerce', 'domain_name', 'mobile_app', 'social_account'];
    const isDigitalAsset = digitalAssetTypes.includes(deal.asset_type) || deal.category === 'Startups';

    // ==========================================
    // 🔀 THE GATEWAY SPLITTER
    // ==========================================

    if (isDigitalAsset && bachs) {
      // 🌐 ROUTE A: BACHS (For Digital Assets - Crypto/Global)
      
      const session = await bachs.checkout.create({
        amount: deal.deal_price, 
        currency: 'NGN', // Bachs handles the NGN to USDT/USDC conversion
        customer_email: user.email,
        reference: vault.id, // Tie it directly to the Escrow vault
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?vault=${vault.id}`,
        crypto: true, // Show crypto payment options
        metadata: {
          deal_id: dealId,
          buyer_id: user.id,
          type: 'digital_asset_purchase'
        }
      });

      return NextResponse.json({ 
        gateway: 'bachs',
        checkoutUrl: session.url 
      });

    } else {
      // 🇳🇬 ROUTE B: PAYSTACK (For Physical Goods - Local Bank Transfer/Card)
      
      const paystackPayload = {
        amount: deal.deal_price * 100, // Paystack uses kobo
        email: user.email,
        reference: vault.id, 
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?vault=${vault.id}`,
        metadata: {
          custom_fields: [
            { display_name: "Deal ID", variable_name: "deal_id", value: dealId },
            { display_name: "Vault ID", variable_name: "vault_id", value: vault.id }
          ]
        }
      };

      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paystackPayload)
      });

      const paystackData = await paystackResponse.json();
      
      if (!paystackData.status) {
        throw new Error(paystackData.message || 'Failed to initialize Paystack');
      }

      return NextResponse.json({ 
        gateway: 'paystack',
        // Important: Depending on how your frontend handles the response, 
        // you might need to return `authorization_url: ...` instead of `checkoutUrl`.
        // If your frontend expects `authorization_url`, use that key below:
        authorization_url: paystackData.data.authorization_url,
        checkoutUrl: paystackData.data.authorization_url 
      });
    }

  } catch (error: any) {
    console.error("Payment Init Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}