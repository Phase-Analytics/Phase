import { useQuery } from '@tanstack/react-query';
import { polarPortal } from '@/lib/auth';

const PRODUCT_PLANS: Record<string, string> = {
  '424d9f27-70f9-4c59-9194-53b9203e759d': 'Starter',
  '502762e6-b5d7-4e5a-8f5d-8ce981d0f8b9': 'Starter',
  '746f7856-ed6a-439b-969f-392d0e97b510': 'Enterprise',
  '2f41af77-87b9-4a17-ae1d-6ef179b48bdc': 'Enterprise',
};

type SubscriptionItem = {
  productId?: string;
  product?: { id?: string };
};

type SubscriptionsPage = {
  result?: { items?: SubscriptionItem[] };
  items?: SubscriptionItem[];
};

async function fetchCurrentPlan(): Promise<string | null> {
  const response = await polarPortal.getSubscriptions();
  if (!('data' in response && response.data)) {
    return null;
  }

  const page = response.data as unknown as SubscriptionsPage;
  const activeSubscription = (page.result?.items ?? page.items ?? [])[0];
  if (!activeSubscription) {
    return null;
  }

  const productId =
    activeSubscription.productId || activeSubscription.product?.id;
  return (productId && PRODUCT_PLANS[productId]) || 'Unknown';
}

/** Active Polar plan name for the signed-in user, or null when on the free tier. */
export function useCurrentPlan(userId: string | undefined) {
  const { data, isPending } = useQuery({
    queryKey: ['billing', 'plan', userId],
    queryFn: fetchCurrentPlan,
    enabled: Boolean(userId),
    staleTime: 10 * 60_000,
  });

  return {
    currentPlan: data ?? null,
    isLoadingPlan: Boolean(userId) && isPending,
  };
}
