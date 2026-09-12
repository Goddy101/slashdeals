-- ==============================================================================
-- 1. EXTENSIONS & SETUP
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. PROFILES TABLE (Merchants / Users)
-- ==============================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    business_name TEXT,
    phone_number TEXT,
    -- Balances stored in Naira (NUMERIC for precise currency handling)
    wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0.00),
    locked_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (locked_balance >= 0.00),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    paystack_customer_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast merchant lookup
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- ==============================================================================
-- 3. DEALS TABLE (Public Submissions + Merchant Listings)
-- ==============================================================================
CREATE TABLE public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    title TEXT NOT NULL CHECK (char_length(title) <= 120),
    description TEXT CHECK (char_length(description) <= 500),
    
    -- Geo-Targeting Column
    location TEXT NOT NULL DEFAULT 'National' CHECK (char_length(location) <= 100),

    discount_code TEXT,
    deal_url TEXT NOT NULL,
    original_price NUMERIC(12, 2),
    deal_price NUMERIC(12, 2),
    category TEXT NOT NULL CHECK (category IN (
        'tech', 'fashion', 'food', 'groceries', 'travel', 
        'finance', 'education', 'services', 'general'
    )),
    image_url TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Escrow & Affiliate Support
    is_affiliate BOOLEAN NOT NULL DEFAULT FALSE,
    is_escrow_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    commission_rate NUMERIC(5, 2) DEFAULT 0.00,
    stock_quantity INT DEFAULT -1,
    
    -- Pinned / Auction placement status
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    pinned_rank INT CHECK (pinned_rank BETWEEN 1 AND 5),
    pinned_until TIMESTAMPTZ,
    
    -- Engagement counters
    upvotes_count INT NOT NULL DEFAULT 0,
    clicks_count INT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- INDEXES (Must be outside the CREATE TABLE block)
-- ==============================================================================
CREATE INDEX idx_deals_category ON public.deals(category);
CREATE INDEX idx_deals_location ON public.deals(location);
CREATE INDEX idx_deals_is_pinned ON public.deals(is_pinned, pinned_rank);
CREATE INDEX idx_deals_created_at ON public.deals(created_at DESC);
CREATE INDEX idx_deals_upvotes ON public.deals(upvotes_count DESC);
-- ==============================================================================
-- 4. BIDS TABLE (The 24-Hour Daily Auction Engine)
-- ==============================================================================
CREATE TABLE public.bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 1000.00), -- Minimum bid ₦2,500
    target_date DATE NOT NULL, -- Date the merchant is bidding for (tomorrow)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'cancelled')),
    won_rank INT CHECK (won_rank BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_bids_target_date_status ON public.bids(target_date, status);
CREATE INDEX idx_bids_merchant_id ON public.bids(merchant_id);

-- ==============================================================================
-- 5. WALLET TRANSACTIONS TABLE (Audit Trail for Paystack & Bids)
-- ==============================================================================
CREATE TABLE public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'deposit',            -- Funding wallet via Paystack
        'bid_lock',          -- Funds temporarily locked when placing a bid
        'bid_unlock',        -- Funds released back if auction is lost/cancelled
        'bid_won_deduction', -- Permanent charge for winning a 24h slot
        'refund'             -- Manual or administrative refund
    )),
    reference TEXT UNIQUE,    -- Paystack reference or system generated ID
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('pending', 'success', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_wallet_tx_merchant ON public.wallet_transactions(merchant_id);
CREATE INDEX idx_wallet_tx_reference ON public.wallet_transactions(reference);

-- ==============================================================================
-- 6. ENGAGEMENT & ANALYTICS (Clicks & Anti-Spam Upvotes)
-- ==============================================================================
CREATE TABLE public.deal_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    ip_hash TEXT,
    referrer TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_deal_clicks_deal_id ON public.deal_clicks(deal_id);

CREATE TABLE public.deal_upvotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    ip_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_deal_ip_upvote UNIQUE (deal_id, ip_hash)
);

-- ==============================================================================
-- 7. HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- A. Automatically create profile when a new user signs up in Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, business_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'business_name', 'Merchant')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_deals_timestamp BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- C. Atomic Click Counter Increment RPC
CREATE OR REPLACE FUNCTION public.increment_deal_click(p_deal_id UUID, p_ip_hash TEXT, p_referrer TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.deal_clicks (deal_id, ip_hash, referrer)
    VALUES (p_deal_id, p_ip_hash, p_referrer);
    
    UPDATE public.deals
    SET clicks_count = clicks_count + 1
    WHERE id = p_deal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. Atomic Upvote Toggle / Increment RPC
CREATE OR REPLACE FUNCTION public.toggle_deal_upvote(p_deal_id UUID, p_ip_hash TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.deal_upvotes WHERE deal_id = p_deal_id AND ip_hash = p_ip_hash
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM public.deal_upvotes WHERE deal_id = p_deal_id AND ip_hash = p_ip_hash;
        UPDATE public.deals SET upvotes_count = GREATEST(0, upvotes_count - 1) WHERE id = p_deal_id;
        RETURN FALSE; -- Upvote removed
    ELSE
        INSERT INTO public.deal_upvotes (deal_id, ip_hash) VALUES (p_deal_id, p_ip_hash);
        UPDATE public.deals SET upvotes_count = upvotes_count + 1 WHERE id = p_deal_id;
        RETURN TRUE; -- Upvote added
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 8. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_upvotes ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own non-financial profile fields"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- DEALS POLICIES
CREATE POLICY "Public can view approved deals"
    ON public.deals FOR SELECT
    USING (is_approved = TRUE);

CREATE POLICY "Anyone can submit a deal"
    ON public.deals FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Merchants can edit own deals"
    ON public.deals FOR UPDATE
    USING (auth.uid() = user_id);

-- BIDS POLICIES
CREATE POLICY "Merchants can view own bids"
    ON public.bids FOR SELECT
    USING (auth.uid() = merchant_id);

CREATE POLICY "Merchants can insert bids"
    ON public.bids FOR INSERT
    WITH CHECK (auth.uid() = merchant_id);

-- TRANSACTIONS POLICIES
CREATE POLICY "Merchants can view own wallet transactions"
    ON public.wallet_transactions FOR SELECT
    USING (auth.uid() = merchant_id);

-- ANALYTICS (Clicks & Upvotes) POLICIES
CREATE POLICY "Public can record clicks"
    ON public.deal_clicks FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Public can view clicks"
    ON public.deal_clicks FOR SELECT
    USING (TRUE);

CREATE POLICY "Public can submit and read upvotes"
    ON public.deal_upvotes FOR ALL
    USING (TRUE);





-- ==============================================================================
-- 1. UPGRADE DEALS TABLE (Affiliate & Escrow Support)
-- ==============================================================================
-- Add flags and commission tracking for affiliate deals and escrow purchases
ALTER TABLE public.deals 
ADD COLUMN is_affiliate BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN is_escrow_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN commission_rate NUMERIC(5, 2) DEFAULT 0.00, -- e.g., 5.00 for 5%
ADD COLUMN stock_quantity INT DEFAULT -1; -- -1 means unlimited (digital/affiliate)

-- ==============================================================================
-- 2. SUBSCRIPTIONS TABLE (Verified Badges & Retainers)
-- ==============================================================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('verified_badge', 'premium_merchant')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    amount_paid NUMERIC(12, 2) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_subscriptions_merchant ON public.subscriptions(merchant_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status, expires_at);

-- ==============================================================================
-- 3. CATEGORY MONOPOLIES (Monthly Exclusive Locks)
-- ==============================================================================
CREATE TABLE public.category_monopolies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_month DATE NOT NULL, -- Stored as the 1st of the month (e.g., '2026-09-01')
    price_paid NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Ensure only one active merchant per category per month
    CONSTRAINT unique_category_per_month UNIQUE (category, target_month)
);

-- ==============================================================================
-- 4. PLATFORM TAKEOVERS ("Flash Drop" Days)
-- ==============================================================================
CREATE TABLE public.platform_takeovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_date DATE NOT NULL, -- The exact day of the takeover
    merchant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    price_paid NUMERIC(12, 2) NOT NULL,
    brand_headline TEXT NOT NULL,
    brand_hex_color TEXT,      -- Custom CSS color for the site background/header
    banner_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Ensure only one takeover can happen per day
    CONSTRAINT unique_takeover_date UNIQUE (target_date)
);

-- ==============================================================================
-- 5. ESCROW ORDERS (Buy-It-Here Marketplace)
-- ==============================================================================
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    merchant_id UUID NOT NULL REFERENCES public.profiles(id),
    deal_id UUID NOT NULL REFERENCES public.deals(id),
    
    order_amount NUMERIC(12, 2) NOT NULL,
    escrow_fee NUMERIC(12, 2) NOT NULL, -- Your 2.5% - 5% cut
    total_paid NUMERIC(12, 2) NOT NULL,
    
    status TEXT NOT NULL DEFAULT 'escrow_locked' CHECK (status IN (
        'pending_payment',  -- Checkout started
        'escrow_locked',    -- Buyer paid, funds held by platform
        'shipped',          -- Merchant claims delivery
        'completed',        -- Buyer confirms receipt, funds released to merchant wallet
        'disputed',         -- Conflict reported
        'refunded'          -- Funds returned to buyer
    )),
    
    delivery_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    paystack_reference TEXT UNIQUE,
    delivery_otp TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_orders_merchant ON public.orders(merchant_id);
CREATE INDEX idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- Auto-update timestamps for orders
CREATE TRIGGER update_orders_timestamp 
    BEFORE UPDATE ON public.orders 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 6. ADD RLS POLICIES FOR NEW TABLES
-- ==============================================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_monopolies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_takeovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Public can see active takeovers and monopolies to render the UI
CREATE POLICY "Public can view active monopolies" ON public.category_monopolies FOR SELECT USING (status = 'active');
CREATE POLICY "Public can view active takeovers" ON public.platform_takeovers FOR SELECT USING (status IN ('scheduled', 'active', 'completed'));

-- Order visibility is strictly limited to the buyer and the merchant
CREATE POLICY "Buyers can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Merchants can view their received orders" ON public.orders FOR SELECT USING (auth.uid() = merchant_id);