import type { Metadata } from "next";
import { evaluateFlagForProject } from "@/lib/evaluation-service";
import { DemoShopClient } from "./DemoShopClient";

export const metadata: Metadata = {
  title: "Demo Shop — Flagrail",
  description: "Live feature flag demo: new_checkout_flow evaluated in real time",
};

export default async function DemoShopPage() {
  const initialResult = await evaluateFlagForProject({
    projectKey: "flagrail-demo",
    environmentSlug: "production",
    flagKey: "new_checkout_flow",
    user: { id: "demo-regular-001", email: "regular@example.com" },
  });

  return <DemoShopClient initialResult={initialResult} />;
}
