import { supabase } from "@/integrations/supabase/client";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem("syb_sid");
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem("syb_sid", id);
  }
  return id;
}

export async function trackPageview(path: string) {
  if (typeof window === "undefined") return;
  try {
    const { data } = await supabase.auth.getSession();
    await supabase.from("visitor_analytics").insert({
      path: path.slice(0, 512),
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      session_id: getSessionId(),
      user_id: data.session?.user.id ?? null,
    });
  } catch {
    // silent — analytics must never break the app
  }
}
