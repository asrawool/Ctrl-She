import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { checkUserExistsFn } from "@/services/webauthn.server";

export interface SendOtpResponse {
  success: boolean;
  message: string;
  exists?: boolean;
}

export const authService = {
  async sendOtp(email: string): Promise<SendOtpResponse> {
    console.log("[authService.sendOtp] Received email parameter:", email);

    if (!email) {
      console.error("[authService.sendOtp] Aborting: email parameter is falsy");
      throw new Error("Email parameter is required for authService.sendOtp");
    }

    // Check if the email already has an account in the database
    let exists = false;
    try {
      const checkRes = await checkUserExistsFn({ data: { email } });
      exists = checkRes.exists;
    } catch (err) {
      console.error(
        "[authService.sendOtp] Error checking user existence:",
        err,
      );
    }

    // Note: For a 6-digit code (not a magic link) to arrive by email, the Supabase project's
    // Auth -> Email Templates -> "Magic Link" template must include {{ .Token }}.
    // This is a manual step for the user to perform in the Supabase Dashboard.
    console.log(
      "[authService.sendOtp] Initiating signInWithOtp request to Supabase for:",
      email,
    );
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error(
        "[authService.sendOtp] Supabase signInWithOtp returned error:",
        error,
      );
      return { success: false, message: error.message, exists };
    }

    console.log(
      "[authService.sendOtp] Supabase signInWithOtp request succeeded for:",
      email,
    );
    return { success: true, message: `OTP sent to ${email}`, exists };
  },

  async verifyOtp(
    email: string,
    code: string,
  ): Promise<{ success: boolean; session?: Session | null; error?: string }> {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, session: data.session };
  },

  async resendOtp(email: string): Promise<SendOtpResponse> {
    return this.sendOtp(email);
  },
};
