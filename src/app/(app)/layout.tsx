import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import { SettingsProvider } from "@/lib/settings";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SettingsProvider>
      <div className="mx-auto min-h-dvh w-full max-w-md pb-24">
        {children}
        <BottomNav />
      </div>
    </SettingsProvider>
  );
}
