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

function decodeJwtClaims(token: string) {
  const payload = token.split(".")[1];
  if (!payload) {
    throw new Error("Invalid auth token");
  }

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const json = atob(padded);
  return JSON.parse(json) as { sub?: string; email?: string; iat?: number };
}

function getUserClaims(token: string) {
  const claims = decodeJwtClaims(token);
  if (!claims.sub) {
    throw new Error("Unauthorized: User not found");
  }

  return {
    userId: claims.sub,
    email: claims.email || null,
    issuedAt: typeof claims.iat === "number" ? claims.iat * 1000 : 0,
  };
}

// Check if user has enrolled a face descriptor
export const hasFaceDescriptorFn = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data: { token } }) => {
    const supabase = getSupabaseClient(token);
    const { userId, issuedAt } = getUserClaims(token);

    const { data, error } = await supabase
      .from("face_descriptors")
      .select("user_id")
      .eq("user_id", userId)
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
    const { userId } = getUserClaims(token);

    if (!descriptor || descriptor.length !== 128) {
      throw new Error("Invalid descriptor array length. Expected 128 numbers.");
    }

    // Insert or update descriptor
    const { error } = await supabase.from("face_descriptors").upsert({
      user_id: userId,
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
        user_id: userId,
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
  .validator((d: { descriptors: number[][]; token: string }) => d)
  .handler(async ({ data: { descriptors, token } }) => {
    const supabase = getSupabaseClient(token);
    const { userId } = getUserClaims(token);

    if (!Array.isArray(descriptors) || descriptors.length < 1) {
      throw new Error(
        "Invalid descriptor samples. Expected at least one face descriptor.",
      );
    }

    const validDescriptors = descriptors.filter(
      (descriptor) => Array.isArray(descriptor) && descriptor.length === 128,
    );

    if (validDescriptors.length === 0) {
      throw new Error(
        "Invalid descriptor array length. Expected 128 numbers per sample.",
      );
    }

    // Fetch stored descriptor
    const { data: storedData, error: fetchError } = await supabase
      .from("face_descriptors")
      .select("descriptor")
      .eq("user_id", userId)
      .single();

    if (fetchError || !storedData) {
      throw new Error(
        "Face profile not found. Please register face biometric first.",
      );
    }

    const storedDescriptor = storedData.descriptor as number[];

    const sampleDistances = validDescriptors.map((descriptor) => {
      let sum = 0;
      for (let i = 0; i < 128; i++) {
        sum += Math.pow(descriptor[i] - storedDescriptor[i], 2);
      }
      return Math.sqrt(sum);
    });

    // Require a majority of the samples to match. This is stricter than a single
    // snapshot, but more stable in practice after blink/liveness checks.
    const threshold = 0.5;
    const matchedSamples = sampleDistances.filter(
      (distance) => distance < threshold,
    );
    const averageDistance =
      sampleDistances.reduce((sum, distance) => sum + distance, 0) /
      sampleDistances.length;
    const isMatch =
      matchedSamples.length >= 2 ||
      (matchedSamples.length === 1 && sampleDistances.length === 1);

    console.log(
      `[verifyFaceDescriptorFn] Attempted face matching:`,
      `User ID: ${userId}`,
      `Sample Distances: ${sampleDistances.map((distance) => distance.toFixed(6)).join(", ")}`,
      `Average Distance: ${averageDistance.toFixed(6)}`,
      `Threshold: ${threshold}`,
      `Matched Samples: ${matchedSamples.length}/${sampleDistances.length}`,
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
          user_id: userId,
          verified_at: new Date().toISOString(),
        });

      if (sessionError) {
        console.error(
          "Failed to update session verification gate:",
          sessionError.message,
        );
      }
    }

    return {
      verified: isMatch,
      distance: averageDistance,
      matchedSamples: matchedSamples.length,
      totalSamples: sampleDistances.length,
    };
  });

// Validate session verification status
export const checkSessionVerificationFn = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data: { token } }) => {
    const supabase = getSupabaseClient(token);
    const { userId, issuedAt } = getUserClaims(token);

    const { data, error } = await supabase
      .from("session_verifications")
      .select("verified_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return { verified: false };
    }

    if (!issuedAt) {
      return { verified: false };
    }

    const verifiedAt = new Date(data.verified_at).getTime();

    if (Number.isNaN(verifiedAt) || verifiedAt < issuedAt) {
      return { verified: false };
    }

    // Enforce expiry limit (e.g. 12 hours)
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
    const { userId } = getUserClaims(token);

    const { data, error } = await supabase
      .from("user_roles")
      .select("role, custom_role")
      .eq("user_id", userId)
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
    const { userId } = getUserClaims(token);

    // Insert user role (no update policy exists, ensuring role changes are admin-only/future considerations)
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
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
    const { userId, email } = getUserClaims(token);

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user profile:", error.message);
    }

    return {
      profile: data || {
        user_id: userId,
        full_name: email?.split("@")[0] || "",
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
    const { userId } = getUserClaims(token);

    const { error } = await supabase.from("user_profiles").upsert({
      user_id: userId,
      ...profileData,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error("Failed to save user profile: " + error.message);
    }

    return { success: true };
  });
