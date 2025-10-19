import Constants from 'expo-constants';
import { PlanTier } from '@/types';

const resolveEndpoint = () => {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  return (
    extra?.EXPO_PUBLIC_BILLING_ENDPOINT ||
    (Constants?.manifest2 as any)?.extra?.EXPO_PUBLIC_BILLING_ENDPOINT ||
    process.env.EXPO_PUBLIC_BILLING_ENDPOINT ||
    ''
  );
};

export const billingEndpoint = () => resolveEndpoint();

export interface CheckoutRequest {
  plan: PlanTier;
  cycle: 'monthly' | 'annual';
  userId: string;
}

export interface CheckoutResponse {
  redirectUrl: string;
}

export const startCheckout = async (payload: CheckoutRequest): Promise<CheckoutResponse> => {
  const endpoint = resolveEndpoint();
  if (!endpoint) {
    throw new Error('Billing endpoint not configured');
  }
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Checkout failed: ${response.status} ${message}`);
  }
  const data = (await response.json()) as CheckoutResponse;
  if (!data.redirectUrl) {
    throw new Error('Billing endpoint did not return redirectUrl');
  }
  return data;
};

export const openCustomerPortal = async (userId: string): Promise<string> => {
  const endpoint = resolveEndpoint();
  if (!endpoint) {
    throw new Error('Billing endpoint not configured');
  }
  const response = await fetch(`${endpoint.replace(/\/$/, '')}/billing/portal?userId=${encodeURIComponent(userId)}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Portal request failed: ${response.status} ${message}`);
  }
  const data = (await response.json()) as { portalUrl?: string };
  if (!data.portalUrl) {
    throw new Error('Billing endpoint did not return portalUrl');
  }
  return data.portalUrl;
};
