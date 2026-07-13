import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Role } from "@/store/auth";

// Helper to get Supabase client with user's auth token
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
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
      },
    });
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}

// Helper to get Supabase client with the service role key for admin privileges (only accessible on server-side functions)
function getSupabaseAdminClient() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL environment variable");
  }

  // Fallback to anon key in local dev if service role key is not defined, to prevent hard crashes.
  if (!supabaseServiceKey) {
    console.warn(
      "WARNING: SUPABASE_SERVICE_ROLE_KEY is not defined. Falling back to anon key.",
    );
    const anonKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error("Missing Supabase anon key environment variable");
    }
    return createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
}

// Check if user has enrolled a face descriptor
export const hasFaceDescriptorFn = createServerFn({ method: "POST" })
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
      .from("face_descriptors")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error checking face descriptor:", error.message);
      return { hasDescriptor: false };
    }

    return { hasDescriptor: !!data };
  });

// Enroll a new face descriptor
export const registerFaceDescriptorFn = createServerFn({ method: "POST" })
  .validator((d: { descriptor: number[]; token: string }) => d)
  .handler(async ({ data: { descriptor, token } }) => {
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

    if (!descriptor || descriptor.length !== 128) {
      throw new Error("Invalid descriptor array length. Expected 128 numbers.");
    }

    // Insert or update descriptor
    const { error } = await supabase.from("face_descriptors").upsert({
      user_id: user.id,
      descriptor,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error("Failed to save face descriptor: " + error.message);
    }

    // Update session verification gate
    const { error: sessionError } = await supabase
      .from("session_verifications")
      .upsert({
        user_id: user.id,
        verified_at: new Date().toISOString(),
      });

    if (sessionError) {
      console.error(
        "Failed to update session verification gate:",
        sessionError.message,
      );
    }

    return { success: true };
  });

// Verify face descriptor against enrolled one (server-side comparison)
export const verifyFaceDescriptorFn = createServerFn({ method: "POST" })
  .validator((d: { descriptor: number[]; token: string }) => d)
  .handler(async ({ data: { descriptor, token } }) => {
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

    if (!descriptor || descriptor.length !== 128) {
      throw new Error("Invalid descriptor array length. Expected 128 numbers.");
    }

    // Fetch stored descriptor
    const { data: storedData, error: fetchError } = await supabase
      .from("face_descriptors")
      .select("descriptor")
      .eq("user_id", user.id)
      .single();

    if (fetchError || !storedData) {
      throw new Error(
        "Face profile not found. Please register face biometric first.",
      );
    }

    const storedDescriptor = storedData.descriptor as number[];

    // Compute Euclidean distance
    let sum = 0;
    for (let i = 0; i < 128; i++) {
      sum += Math.pow(descriptor[i] - storedDescriptor[i], 2);
    }
    const distance = Math.sqrt(sum);

    // SECURITY THRESHOLD:
    // face-api.js default threshold is 0.6, which is optimized for loose photo tagging.
    // In secure enterprise login/auth systems, 0.40 - 0.45 is recommended to avoid false accepts.
    // We set a strict threshold of 0.45.
    const isMatch = distance < 0.45;

    console.log(
      `[verifyFaceDescriptorFn] Attempted face matching:`,
      `User ID: ${user.id}`,
      `Exact Euclidean Distance: ${distance.toFixed(6)}`,
      `Threshold: 0.45`,
      `Match Confirmed: ${isMatch}`,
    );

    if (isMatch) {
      // SECURITY DESIGN / COMMENTS:
      // We write a record in `session_verifications` to verify that face verification
      // succeeded for the current login session. The route guards check this table.
      //
      // NOTE: Ultimate protection for sensitive data still relies on Supabase RLS policies
      // on the actual data tables (e.g. checks based on auth.uid() or custom roles).
      // This session gate improves front-end UX/flow control, but database-level RLS is the real backstop.
      const { error: sessionError } = await supabase
        .from("session_verifications")
        .upsert({
          user_id: user.id,
          verified_at: new Date().toISOString(),
        });

      if (sessionError) {
        console.error(
          "Failed to update session verification gate:",
          sessionError.message,
        );
      }
    }

    return { verified: isMatch, distance };
  });

// Validate session verification status
export const checkSessionVerificationFn = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data: { token } }) => {
    const supabase = getSupabaseClient(token);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { verified: false };
    }

    const { data, error } = await supabase
      .from("session_verifications")
      .select("verified_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      return { verified: false };
    }

    // Enforce expiry limit (e.g. 12 hours)
    const verifiedAt = new Date(data.verified_at).getTime();
    const now = new Date().getTime();
    const diffHours = (now - verifiedAt) / (1000 * 60 * 60);

    if (diffHours > 12) {
      // Exceeded limit: verification expired
      return { verified: false };
    }

    return { verified: true };
  });

// Check if a user's email is already registered in auth.users
export const checkUserExistsFn = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data: { email } }) => {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.rpc("check_user_exists", {
      email_to_check: email,
    });

    if (error) {
      console.error("Error executing check_user_exists RPC:", error.message);
      return { exists: false };
    }

    return { exists: !!data };
  });

// Fetch the user's role from the database securely server-side
export const getUserRoleFn = createServerFn({ method: "POST" })
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
      .from("user_roles")
      .select("role, custom_role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user role:", error.message);
      return { role: null, customRole: null };
    }

    return {
      role: (data?.role as Role | null) || null,
      customRole: data?.custom_role || null,
    };
  });

// Save the user's selected role in the database securely server-side (write-once)
export const saveUserRoleFn = createServerFn({ method: "POST" })
  .validator((d: { role: Role; customRole?: string; token: string }) => d)
  .handler(async ({ data: { role, customRole, token } }) => {
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

    // Insert user role (no update policy exists, ensuring role changes are admin-only/future considerations)
    const { error } = await supabase.from("user_roles").insert({
      user_id: user.id,
      role,
      custom_role: customRole || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error("Failed to save user role: " + error.message);
    }

    return { success: true };
  });

// Perform domain-level email validation check (MX record lookup)
export const verifyEmailDomainFn = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data: { email } }) => {
    const domain = email.split("@")[1];
    if (!domain) {
      return { isValid: false };
    }

    try {
      const dns = await import("dns");
      const records = await dns.promises.resolveMx(domain);
      return { isValid: records && records.length > 0 };
    } catch (err) {
      console.warn(
        `[verifyEmailDomainFn] MX resolution failed for ${domain}:`,
        err,
      );
      return { isValid: false };
    }
  });

// Fetch user profile securely server-side
export const getUserProfileFn = createServerFn({ method: "POST" })
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
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user profile:", error.message);
    }

    return {
      profile: data || {
        user_id: user.id,
        full_name: user.email?.split("@")[0] || "",
        avatar_url: null,
        department: "Operations",
        plant: "Plant Alpha",
        years_of_experience: 0,
        education: [],
        certifications: [],
        specialties: [],
      },
    };
  });

export interface EducationItem {
  degree: string;
  school: string;
  year?: string;
}

export interface CertificationItem {
  name: string;
  issuer: string;
  expiry?: string;
}

// Save user profile securely server-side
export const saveUserProfileFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      token: string;
      full_name?: string;
      avatar_url?: string | null;
      department?: string;
      plant?: string;
      years_of_experience?: number;
      education?: EducationItem[];
      certifications?: CertificationItem[];
      specialties?: string[];
    }) => d,
  )
  .handler(async ({ data: { token, ...profileData } }) => {
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

    const { error } = await supabase.from("user_profiles").upsert({
      user_id: user.id,
      ...profileData,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error("Failed to save user profile: " + error.message);
    }

    return { success: true };
  });
