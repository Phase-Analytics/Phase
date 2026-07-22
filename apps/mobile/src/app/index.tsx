import { Redirect } from "expo-router";

import { LoadingState } from "@/components/ui";
import { useSession } from "@/lib/auth-client";

export default function Index() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <LoadingState />;
  }

  if (session) {
    return <Redirect href="/(app)/(tabs)/users" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
