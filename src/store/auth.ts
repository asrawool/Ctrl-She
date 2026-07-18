import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";

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
  {
    id: "digital_transformation",
    label: "Industrial Digital Transformation Engineer",
  },
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
  isExistingUser: boolean;
  language: string;
  theme: "light" | "dark";
  setEmail: (e: string, exists?: boolean) => void;
  setStep: (s: AuthStep) => void;
  setOtpVerified: (v: boolean) => void;
  setFaceVerified: (v: boolean) => void;
  setRole: (r: Role, custom?: string) => void;
  setLanguage: (l: string) => void;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
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
      isExistingUser: false,
      language: "en",
      theme: "light",
      setEmail: (email, exists = false) =>
        set({
          email,
          isExistingUser: exists,
          step: "otp",
          role: null,
          customRole: null,
          otpVerified: false,
          faceVerified: false,
          authenticated: false,
        }),
      setStep: (step) => set({ step }),
      setOtpVerified: (v) => set({ otpVerified: v, step: v ? "face" : "otp" }),
      setFaceVerified: (v) =>
        set({ faceVerified: v, step: v ? "role" : "face" }),
      setRole: (role, customRole) =>
        set({
          role,
          customRole: customRole ?? null,
          step: "done",
          authenticated: true,
        }),
      setLanguage: (language) => set({ language }),
      toggleTheme: () =>
        set((s) => {
          const theme = s.theme === "light" ? "dark" : "light";
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", theme === "dark");
          }
          return { theme };
        }),
      setTheme: (theme) =>
        set(() => {
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", theme === "dark");
          }
          return { theme };
        }),
      logout: () => {
        set({
          email: null,
          role: null,
          customRole: null,
          step: "email",
          otpVerified: false,
          faceVerified: false,
          authenticated: false,
        });
        supabase.auth.signOut();
      },
    }),
    { name: "intelliplant-auth" },
  ),
);

export async function ensureAuthHydrated() {
  if (typeof window === "undefined") return;
  if (!useAuth.persist.hasHydrated()) {
    await useAuth.persist.rehydrate();
  }
}

// Subscribe to Supabase Auth state changes to keep authenticated field trustworthy
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    const state = useAuth.getState();
    if (!session) {
      if (
        state.authenticated ||
        state.otpVerified ||
        state.faceVerified ||
        state.email
      ) {
        useAuth.setState({
          email: null,
          role: null,
          customRole: null,
          step: "email",
          otpVerified: false,
          faceVerified: false,
          authenticated: false,
        });
      }
    } else {
      // Session exists. If they finished all the onboarding steps, set authenticated: true
      const hasCompletedAllSteps = state.step === "done" && state.role !== null;
      if (hasCompletedAllSteps) {
        useAuth.setState({ authenticated: true });
      } else {
        useAuth.setState({ authenticated: false });
      }
    }
  });
}