import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

type BillingPlan = 'free' | 'pro' | 'enterprise';

type BillingState = {
  plan: BillingPlan;
  trialEndsAt: string | null;
};

type BillingCycle = 'monthly' | 'yearly';

type UpgradeOptions = {
  plan: BillingPlan;
  billingCycle?: BillingCycle;
  bypassCheckout?: boolean;
};

type BillingContextValue = {
  plan: BillingPlan;
  trialEndsAt: string | null;
  isTrialing: boolean;
  isProcessing: boolean;
  billingError: string | null;
  isBillingPortalConfigured: boolean;
  upgradePlan: (options: UpgradeOptions) => Promise<void>;
  cancelSubscription: () => void;
  manageSubscription: () => Promise<void>;
};

const STORAGE_KEY = 'ai-budget-tracker-plan';
const BILLING_ENDPOINT = import.meta.env.VITE_BILLING_PORTAL_ENDPOINT ?? '';

const BillingContext = createContext<BillingContextValue | null>(null);

function getInitialState(): BillingState {
  if (typeof window === 'undefined') {
    return { plan: 'free', trialEndsAt: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { plan: 'free', trialEndsAt: null };
    const parsed = JSON.parse(raw) as BillingState;
    return {
      plan: parsed.plan,
      trialEndsAt: parsed.trialEndsAt ?? null,
    };
  } catch (error) {
    console.warn('Failed to load billing state from storage', error);
    return { plan: 'free', trialEndsAt: null };
  }
}

function computeTrialing(trialEndsAt: string | null) {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() > Date.now();
}

function isBillingPlan(value: unknown): value is BillingPlan {
  return value === 'free' || value === 'pro' || value === 'enterprise';
}

function computeTrialEnd(current: BillingPlan, next: BillingPlan) {
  if (current === 'free' && next !== 'free') {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString();
  }
  return null;
}

export function BillingProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<BillingState>(() => getInitialState());
  const [billingError, setBillingError] = useState<string | null>(null);
  const [isProcessing, setProcessing] = useState(false);
  const isBillingPortalConfigured = Boolean(BILLING_ENDPOINT);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const upgradePlan = useCallback(
    async ({ plan, billingCycle = 'monthly', bypassCheckout = false }: UpgradeOptions) => {
      if (plan === state.plan && !bypassCheckout) {
        setBillingError(null);
        return;
      }

      if (!bypassCheckout && !isBillingPortalConfigured) {
        setBillingError('尚未設定金流端點，請先設定 `VITE_BILLING_PORTAL_ENDPOINT`。');
        return;
      }

      setProcessing(true);
      setBillingError(null);
      try {
        let resolvedPlan: BillingPlan = plan;
        let resolvedTrialEndsAt: string | null = computeTrialEnd(state.plan, plan);

        if (!bypassCheckout && typeof window !== 'undefined') {
          const response = await fetch(BILLING_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan, billingCadence: billingCycle }),
          });

          if (!response.ok) {
            throw new Error(`無法建立結帳流程 (${response.status})`);
          }

          const payload = await response.json().catch(() => null as unknown);

          if (payload && typeof payload === 'object') {
            const maybePlan = (payload as Record<string, unknown>).plan;
            const maybeCurrentPlan = (payload as Record<string, unknown>).currentPlan;
            const nextPlanCandidate = isBillingPlan(maybePlan)
              ? maybePlan
              : isBillingPlan(maybeCurrentPlan)
                ? (maybeCurrentPlan as BillingPlan)
                : null;
            if (nextPlanCandidate) {
              resolvedPlan = nextPlanCandidate;
            }

            const maybeTrial = (payload as Record<string, unknown>).trialEndsAt;
            if (typeof maybeTrial === 'string') {
              resolvedTrialEndsAt = maybeTrial;
            }

            const redirectUrl = (payload as Record<string, unknown>).redirectUrl;
            if (typeof redirectUrl === 'string') {
              window.open(redirectUrl, '_blank', 'noopener');
            }
          }
        }

        const nextState: BillingState = {
          plan: resolvedPlan,
          trialEndsAt: resolvedPlan === 'free' ? null : resolvedTrialEndsAt,
        };

        setState(nextState);
      } catch (error) {
        setBillingError(error instanceof Error ? error.message : '升級失敗，請稍後再試');
      } finally {
        setProcessing(false);
      }
    },
    [isBillingPortalConfigured, state.plan],
  );

  const cancelSubscription = useCallback(() => {
    setState({ plan: 'free', trialEndsAt: null });
    setBillingError(null);
  }, []);

  const manageSubscription = useCallback(async () => {
    if (!isBillingPortalConfigured || typeof window === 'undefined') {
      setBillingError('尚未設定客戶入口網址');
      return;
    }
    setProcessing(true);
    setBillingError(null);
    try {
      const response = await fetch(BILLING_ENDPOINT, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`無法開啟客戶入口 (${response.status})`);
      }
      const payload = await response.json().catch(() => null);
      if (payload?.portalUrl) {
        window.open(payload.portalUrl as string, '_blank', 'noopener');
      }
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : '開啟客戶入口時發生問題');
    } finally {
      setProcessing(false);
    }
  }, [isBillingPortalConfigured]);

  const value = useMemo(
    () => ({
      plan: state.plan,
      trialEndsAt: state.trialEndsAt,
      isTrialing: computeTrialing(state.trialEndsAt),
      isProcessing,
      billingError,
      isBillingPortalConfigured,
      upgradePlan,
      cancelSubscription,
      manageSubscription,
    }),
    [state, isProcessing, billingError, isBillingPortalConfigured, upgradePlan, cancelSubscription, manageSubscription],
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}

export type { BillingPlan };
