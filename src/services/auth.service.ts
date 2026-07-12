// Placeholder auth service — replace with real backend calls later.
// Keep signatures stable so UI never changes.

export interface SendOtpResponse {
  success: boolean;
  message: string;
}

export const authService = {
  async sendOtp(email: string): Promise<SendOtpResponse> {
    await delay(900);
    // TODO: replace with fetch('/api/auth/otp/send', { ... })
    return { success: true, message: `OTP sent to ${email}` };
  },

  async verifyOtp(_email: string, code: string): Promise<{ success: boolean }> {
    await delay(800);
    // TODO: replace with backend verification
    return { success: code.length === 6 };
  },

  async resendOtp(_email: string): Promise<SendOtpResponse> {
    await delay(700);
    return { success: true, message: "OTP re-sent" };
  },

  async verifyFace(_snapshot?: Blob | null): Promise<{ success: boolean; confidence: number }> {
    await delay(1400);
    // TODO: replace with real face recognition API
    return { success: true, confidence: 0.97 };
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
