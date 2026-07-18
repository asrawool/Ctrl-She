import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const SETTINGS_ROW_ID = "00000000-0000-0000-0000-000000000001";

function getSupabaseClient(token?: string) {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }
  if (token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}

export interface NotificationSettings {
  notify_email: boolean;
  notify_inapp: boolean;
  notify_mobile_push: boolean;
  notify_sms_critical: boolean;
}

export const getNotificationSettingsFn = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data: { token } }) => {
    const supabase = getSupabaseClient(token);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(
        "Unauthorized: " + (userError?.message || "User not found"),
      );
    }

    const { data, error } = await supabase
      .from("workspace_settings")
      .select(
        "notify_email, notify_inapp, notify_mobile_push, notify_sms_critical",
      )
      .eq("id", SETTINGS_ROW_ID)
      .maybeSingle();

    if (error) {
      console.error("Error fetching notification settings:", error.message);
      throw new Error("Failed to load settings: " + error.message);
    }

    return (
      data ?? {
        notify_email: true,
        notify_inapp: true,
        notify_mobile_push: true,
        notify_sms_critical: false,
      }
    );
  });

export const saveNotificationSettingsFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      token: string;
      notify_email: boolean;
      notify_inapp: boolean;
      notify_mobile_push: boolean;
      notify_sms_critical: boolean;
    }) => d,
  )
  .handler(
    async ({
      data: {
        token,
        notify_email,
        notify_inapp,
        notify_mobile_push,
        notify_sms_critical,
      },
    }) => {
      const supabase = getSupabaseClient(token);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Unauthorized: " + (userError?.message || "User not found"),
        );
      }

      const { error } = await supabase
        .from("workspace_settings")
        .update({
          notify_email,
          notify_inapp,
          notify_mobile_push,
          notify_sms_critical,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", SETTINGS_ROW_ID);

      if (error) {
        throw new Error(
          "Failed to save notification settings: " + error.message,
        );
      }

      return { success: true };
    },
  );
