// Mixd — Subscription client library
// Checks the user's plan status and handles Stripe checkout redirect.

import { supabase } from './supabase';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan: 'free' | 'pro';
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

/** Fetch the current user's subscription row */
export async function getMySubscription(): Promise<Subscription | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return (data as Subscription) ?? null;
}

/** Returns true if the user is on the Pro plan and active */
export async function isPro(): Promise<boolean> {
  const sub = await getMySubscription();
  return sub?.plan === 'pro' && (sub.status === 'active' || sub.status === 'trialing');
}

/** Redirect the user to Stripe Checkout to upgrade */
export async function startCheckout(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {},
  });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };
  if (!data?.url) return { ok: false, error: 'No checkout URL returned' };

  // Redirect to Stripe Checkout
  window.location.href = data.url;
  return { ok: true };
}

/** Open the Stripe Customer Portal for managing subscription */
export async function openCustomerPortal(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.functions.invoke('customer-portal', {
    body: {},
  });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };
  if (!data?.url) return { ok: false, error: 'No portal URL returned' };

  window.location.href = data.url;
  return { ok: true };
}
