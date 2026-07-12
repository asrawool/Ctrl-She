import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role =
  | "maintenance_engineer"
  | "plant_ops"
  | "production_engineer"
  | "reliability_engineer"
  | "quality_engineer"
  | "qa_manager"
  | "safety_officer"
  | "hse_engineer"
  | "plant_manager"
  | "maintenance_manager"
  | "document_controller"
  | "digital_transformation"
  | "industry_40"
  | "other";

export const ROLES: { id: Role; label: string }[] = [
  { id: "maintenance_engineer", label: "Maintenance Engineer" },
  { id: "plant_ops", label: "Plant Operations Engineer" },
  { id: "production_engineer", label: "Production Engineer" },
  { id: "reliability_engineer", label: "Reliability Engineer" },
  { id: "quality_engineer", label: "Quality Engineer" },
  { id: "qa_manager", label: "QA Manager" },
  { id: "safety_officer", label: "Safety Officer" },
  { id: "hse_engineer", label: "HSE Engineer" },
  { id: "plant_manager", label: "Plant Manager" },
  { id: "maintenance_manager", label: "Maintenance Manager" },
  { id: "document_controller", label: "Document Controller" },
  { id: "digital_transformation", label: "Industrial Digital Transformation Engineer" },
  { id: "industry_40", label: "Industry 4.0 Engineer" },
  { id: "other", label: "Other" },
];

export type AuthStep = "email" | "otp" | "face" | "role" | "done";

interface AuthState {
  email: string | null;
  role: Role | null;
  customRole: string | null;
  step: AuthStep;
  otpVerified: boolean;
  faceVerified: boolean;
  authenticated: boolean;
  language: string;
  theme: "light" | "dark";
  setEmail: (e: string) => void;
  setStep: (s: AuthStep) => void;
  setOtpVerified: (v: boolean) => void;
  setFaceVerified: (v: boolean) => void;
  setRole: (r: Role, custom?: string) => void;
  setLanguage: (l: string) => void;
  toggleTheme: () => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      email: null,
      role: null,
      customRole: null,
      step: "email",
      otpVerified: false,
      faceVerified: false,
      authenticated: false,
      language: "en",
      theme: "light",
      setEmail: (email) => set({ email, step: "otp" }),
      setStep: (step) => set({ step }),
      setOtpVerified: (v) => set({ otpVerified: v, step: v ? "face" : "otp" }),
      setFaceVerified: (v) => set({ faceVerified: v, step: v ? "role" : "face" }),
      setRole: (role, customRole) =>
        set({ role, customRole: customRole ?? null, step: "done", authenticated: true }),
      setLanguage: (language) => set({ language }),
      toggleTheme: () =>
        set((s) => {
          const theme = s.theme === "light" ? "dark" : "light";
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", theme === "dark");
          }
          return { theme };
        }),
      logout: () =>
        set({
          email: null,
          role: null,
          customRole: null,
          step: "email",
          otpVerified: false,
          faceVerified: false,
          authenticated: false,
        }),
    }),
    { name: "intelliplant-auth" }
  )
);
