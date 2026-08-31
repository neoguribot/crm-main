import type { Metadata } from "next";

import { todayInSeoul } from "@/lib/date";
import { getLatestGoldPrice, listGoldPrices } from "@/lib/prices/queries";
import { getNotifications } from "@/lib/notifications/queries";
import { requireUser } from "@/lib/supabase/require-user";
import { GoldPriceForm } from "@/app/prices/gold-price-form";
import { NotificationCenter } from "@/app/prices/notification-center";
import { PriceHistory } from "@/app/prices/price-history";

export const metadata: Metadata = {
  title: "시세 관리",
};

// 인증 사용자별 화면이므로 정적 캐시에 저장하지 않는다.
export const dynamic = "force-dynamic";

export default async function PricesPage() {
  await requireUser();

  const [latestPrice, notifications, history] = await Promise.all([
    getLatestGoldPrice(),
    getNotifications(),
    listGoldPrices(),
  ]);

  const latest =
    latestPrice.ok && latestPrice.data
      ? {
          price_per_don: latestPrice.data.price_per_don,
          registered_at: latestPrice.data.registered_at,
        }
      : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">시세 관리</h1>
        <p className="text-sm text-muted-foreground">
          기준일 {todayInSeoul()} (Asia/Seoul)
        </p>
      </div>
      <GoldPriceForm latestPrice={latest} />
      <NotificationCenter initial={notifications.ok ? notifications.data : []} />
      <PriceHistory items={history.ok ? history.data : []} />
    </main>
  );
}
