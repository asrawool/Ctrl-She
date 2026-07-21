import {
  createFileRoute,
  useNavigate,
  redirect,
  Link,
} from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  ScanFace,
  Loader2,
  CheckCircle2,
  Camera,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { ensureAuthHydrated, useAuth } from "@/store/auth";
import { supabase } from "@/lib/supabase";
import {
  hasFaceDescriptorFn,
  registerFaceDescriptorFn,
  verifyFaceDescriptorFn,
  getUserRoleFn,
} from "@/services/webauthn.server";
import { toast } from "sonner";
import type * as FaceApiType from "@vladmandic/face-api";
import { detectRedirectLoop } from "@/lib/redirect-guard";

type State = "waiting" | "scanning" | "verifying" | "verified";

interface EyePoint {
  x: number;
  y: number;
}

type FaceSearch = {
  reset?: boolean;
};

export const Route = createFileRoute("/auth/face")({
  validateSearch: (search: Record<string, unknown>): FaceSearch => {
    return {
      reset: search.reset === true || search.reset === "true",
    };
  },
  head: () => ({ meta: [{ title: "Face ID — SynapseAi" }] }),
  beforeLoad: async ({ search }) => {
    if (typeof window !== "undefined") {
      await ensureAuthHydrated();
      detectRedirectLoop("/auth/face");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const state = useAuth.getState();
      if (!session) {
        throw redirect({ to: "/auth/login" });
      }
      if (!state.otpVerified) {
        throw redirect({ to: "/auth/login" });
      }

      const token = session.access_token;
      const isReset = search && search.reset === true;

      if (isReset) {
        useAuth.setState({ faceVerified: false });
      }
    }
  },
  component: FacePage,
});

function calculateDistance(p1: EyePoint, p2: EyePoint) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function calculateEAR(eye: EyePoint[]) {
  const v1 = calculateDistance(eye[1], eye[5]);
  const v2 = calculateDistance(eye[2], eye[4]);
  const h = calculateDistance(eye[0], eye[3]);
  if (h === 0) return 0;
  return (v1 + v2) / (2.0 * h);
}

function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 5000) {
  return new Promise<void>((resolve, reject) => {
    if (
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.videoWidth > 0
    ) {
      resolve();
      return;
    }

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("playing", onReady);
    };

    const onReady = () => {
      if (
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0
      ) {
        cleanup();
        resolve();
      }
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Camera feed did not become ready in time."));
    }, timeoutMs);

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("playing", onReady);
  });
}

function FacePage() {
  const navigate = useNavigate();
  const setFaceVerified = useAuth((s) => s.setFaceVerified);
  const { reset } = Route.useSearch();

  const [state, setState] = useState<State>("waiting");
  const [faceapi, setFaceapi] = useState<typeof FaceApiType | null>(null);
  const [hasDescriptor, setHasDescriptor] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // Camera & Face-api states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Initializing...");

  // Failed verification attempts & cooldown
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownTime, setCooldownTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load face-api.js from npm dependency dynamically in browser
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("@vladmandic/face-api")
        .then((mod) => {
          setFaceapi(mod);
          setFaceApiLoaded(true);
        })
        .catch((err) => {
          console.error("Failed to load @vladmandic/face-api:", err);
          setCameraError(
            "Failed to load facial recognition library. Please check your network connection.",
          );
        });
    }
  }, []);

  // Fetch whether user has face profile
  useEffect(() => {
    async function checkFaceProfile() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          navigate({ to: "/auth/login" });
          return;
        }
        const token = session.access_token;
        const res = await hasFaceDescriptorFn({ data: { token } });
        setHasDescriptor(reset ? false : res.hasDescriptor);
      } catch (err) {
        console.error("Error checking face profile:", err);
        setHasDescriptor(false);
      } finally {
        setCheckingProfile(false);
      }
    }
    checkFaceProfile();
  }, [navigate, reset]);

  // Request camera and load models when script is loaded
  const startCamera = async () => {
    setCameraError(null);
    setStatusMessage("Requesting camera access...");
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });

      setCameraStream(stream);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
        await waitForVideoReady(videoRef.current);
      }

      await loadFaceApiModels();
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(
        "Camera access denied or unavailable. A working webcam is required to verify your identity.",
      );
      setState("waiting");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStream(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const loadFaceApiModels = async () => {
    if (modelsLoaded || !faceapi) return;
    setLoadingModels(true);
    setStatusMessage("Loading face models...");
    try {
      const LOCAL_MODELS_URL = "/models/";

      await faceapi.nets.ssdMobilenetv1.loadFromUri(LOCAL_MODELS_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(LOCAL_MODELS_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(LOCAL_MODELS_URL);

      setModelsLoaded(true);
      setStatusMessage("Models loaded. Ready to scan.");
    } catch (err) {
      console.error("Error loading face models:", err);
      setCameraError(
        "Failed to load facial recognition models. Please check your internet connection.",
      );
    } finally {
      setLoadingModels(false);
    }
  };

  // Cooldown timer
  useEffect(() => {
    if (cooldownTime <= 0) return;
    const t = setInterval(() => {
      setCooldownTime((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownTime]);

  const handleFailure = (errorMessage: string) => {
    const nextFailed = failedAttempts + 1;
    setFailedAttempts(nextFailed);

    if (nextFailed >= 5) {
      setCooldownTime(30);
      setFailedAttempts(0);
      toast.error("Too many failed attempts. Cooldown active.");
      setStatusMessage("Too many failures. Wait 30s.");
    } else {
      toast.error(`${errorMessage} Attempt ${nextFailed}/5.`);
      setStatusMessage(`${errorMessage}`);
    }
    setState("waiting");
  };

  const run = async () => {
    if (cooldownTime > 0) return;

    if (!cameraStream) {
      await startCamera();
      return;
    }

    if (!modelsLoaded) {
      toast.error("Models are still loading. Please wait.");
      return;
    }

    try {
      const videoEl = videoRef.current;
      if (!faceapi || !videoEl) throw new Error("Initialization error");
      await waitForVideoReady(videoEl);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please sign in again.");
        navigate({ to: "/auth/login" });
        return;
      }
      const token = session.access_token;

      // Liveness challenge: require a blink before reading face descriptors.
      setState("scanning");
      setStatusMessage("Liveness Check: Please blink naturally now...");

      const earHistory: number[] = [];
      const duration = 2500;
      const startTime = Date.now();

      while (Date.now() - startTime < duration) {
        const detection = await faceapi
          .detectSingleFace(videoEl)
          .withFaceLandmarks();

        if (detection) {
          const leftEye = detection.landmarks.getLeftEye();
          const rightEye = detection.landmarks.getRightEye();

          const earL = calculateEAR(leftEye);
          const earR = calculateEAR(rightEye);
          const avgEAR = (earL + earR) / 2;

          earHistory.push(avgEAR);
        }

        await new Promise((r) => setTimeout(r, 10));
      }

      if (earHistory.length < 5) {
        handleFailure(
          "Liveness scan incomplete. Keep your face clearly in frame.",
        );
        return;
      }

      const maxEAR = Math.max(...earHistory);
      const minEAR = Math.min(...earHistory);
      const earVariance = maxEAR - minEAR;

      console.log(
        `[Liveness Check] Baseline Open Eye EAR: ${maxEAR.toFixed(4)}, Closed Eye EAR: ${minEAR.toFixed(4)}, Computed EAR Variance: ${earVariance.toFixed(4)}`,
      );

      if (earVariance < 0.05) {
        handleFailure(
          "Liveness check failed: No blink detected. Please blink naturally.",
        );
        return;
      }

      setStatusMessage("Liveness verified. Extracting face template...");
      await new Promise((r) => setTimeout(r, 200));

      if (!hasDescriptor) {
        // =====================================================================
        // --- PART A: MULTI-SAMPLE REGISTRATION (AVERAGING) ---
        // =====================================================================
        setStatusMessage("Starting multi-sample enrollment...");

        const capturedDescriptors: number[][] = [];

        for (let s = 0; s < 3; s++) {
          setStatusMessage(
            `Capture ${s + 1}/3: Keep looking directly at the camera...`,
          );

          // Wait 450ms for buffer stabilization and natural muscle/pose changes
          await new Promise((r) => setTimeout(r, 450));

          let detection = null;
          let retries = 0;

          while (!detection && retries < 3) {
            detection = await faceapi
              .detectSingleFace(videoEl)
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (!detection) {
              retries++;
              setStatusMessage(
                `No face found. Retrying capture ${s + 1}/3 (attempt ${retries})...`,
              );
              await new Promise((r) => setTimeout(r, 200));
            }
          }

          if (!detection) {
            handleFailure(
              "Face lost during enrollment. Please position yourself clearly and try again.",
            );
            return;
          }

          capturedDescriptors.push(
            Array.from(detection.descriptor) as number[],
          );
          toast.info(`Captured sample ${s + 1} of 3`);
        }

        // Average and normalize the 3 descriptors to unit length (L2 norm)
        setStatusMessage("Averaging biometric descriptor samples...");
        const averagedDescriptor = new Float32Array(128);
        for (let j = 0; j < 128; j++) {
          let sum = 0;
          for (let s = 0; s < 3; s++) {
            sum += capturedDescriptors[s][j];
          }
          averagedDescriptor[j] = sum / 3;
        }

        let sumSquares = 0;
        for (let j = 0; j < 128; j++) {
          sumSquares += Math.pow(averagedDescriptor[j], 2);
        }
        const magnitude = Math.sqrt(sumSquares);
        const finalDescriptor = Array.from(
          averagedDescriptor.map((val) => val / magnitude),
        );

        setState("verifying");
        setStatusMessage("Registering face profile securely...");

        const res = await registerFaceDescriptorFn({
          data: { descriptor: finalDescriptor, token },
        });

        if (res.success) {
          setState("verified");
          setStatusMessage("Face registered!");
          toast.success("Biometrics registered successfully!");
          stopCamera();
          setTimeout(() => {
            setFaceVerified(true);
            if (reset) {
              useAuth.getState().logout();
              navigate({ to: "/auth/login" });
            } else {
              navigate({ to: "/auth/role" });
            }
          }, 1500);
        } else {
          throw new Error("Registration failed");
        }
      } else {
        // =====================================================================
        // --- VERIFICATION MATCHING ---
        // =====================================================================
        setState("verifying");
        setStatusMessage("Verifying identity with multiple face samples...");

        const capturedDescriptors: number[][] = [];
        for (let s = 0; s < 3; s++) {
          setStatusMessage(`Verifying sample ${s + 1}/3...`);
          await new Promise((r) => setTimeout(r, 250));

          let detection = null;
          let retries = 0;
          while (!detection && retries < 3) {
            detection = await faceapi
              .detectSingleFace(videoEl)
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (!detection) {
              retries++;
              await new Promise((r) => setTimeout(r, 150));
            }
          }

          if (!detection) {
            handleFailure(
              `Failed to capture verification sample ${s + 1}/3. Please keep your face centered.`,
            );
            return;
          }

          capturedDescriptors.push(
            Array.from(detection.descriptor) as number[],
          );
        }

        const res = await verifyFaceDescriptorFn({
          data: { descriptors: capturedDescriptors, token },
        });

        if (res.verified) {
          setState("verified");
          setStatusMessage("Access Granted!");
          toast.success("Identity verified successfully!");
          stopCamera();

          // Fetch user role database-side to check if returning user
          const roleRes = await getUserRoleFn({ data: { token } });

          setTimeout(() => {
            setFaceVerified(true);
            if (roleRes.role) {
              // Sync database role to Zustand client store and skip selection
              useAuth
                .getState()
                .setRole(roleRes.role, roleRes.customRole || undefined);
              navigate({ to: "/app/dashboard" });
            } else {
              navigate({ to: "/auth/role" });
            }
          }, 1500);
        } else {
          handleFailure(
            `Verification failed. Match: ${(100 * (1 - res.distance)).toFixed(1)}%`,
          );
        }
      }
    } catch (err) {
      console.error("Biometrics error:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during scanning.";
      handleFailure(errMsg);
    }
  };

  return (
    <AuthShell
      step={3}
      isSignUp={hasDescriptor === null ? true : !hasDescriptor}
      title={hasDescriptor ? "Biometric login" : "Enrolling face descriptor"}
      subtitle={
        hasDescriptor
          ? "Please verify your face to login to your workspace."
          : "Secure your account by registering your face biometric."
      }
    >
      <div className="space-y-6">
        {cameraError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center border border-destructive/20 rounded-3xl bg-destructive/5 space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h3 className="font-semibold text-lg">Camera Access Required</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {cameraError}
            </p>
            <Button
              onClick={startCamera}
              className="btn-hero font-semibold h-11 px-6"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </div>
        ) : (
          <>
            <div className="relative mx-auto aspect-square w-64 rounded-3xl overflow-hidden bg-gradient-to-br from-navy to-steel border-2 border-accent/30">
              <div className="absolute inset-0 grid-industrial opacity-20" />

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 object-cover w-full h-full transform -scale-x-100"
              />

              {/* Corner brackets */}
              {[
                "top-3 left-3 border-t-2 border-l-2",
                "top-3 right-3 border-t-2 border-r-2",
                "bottom-3 left-3 border-b-2 border-l-2",
                "bottom-3 right-3 border-b-2 border-r-2",
              ].map((c, i) => (
                <div
                  key={i}
                  className={`absolute h-6 w-6 rounded z-20 ${state === "verified" ? "border-emerald" : "border-cyan"} ${c}`}
                />
              ))}

              <div className="absolute inset-0 grid place-items-center z-10 pointer-events-none">
                {state === "verified" ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="grid h-20 w-20 place-items-center rounded-full bg-emerald text-white shadow-[0_0_60px_rgba(24,195,126,0.7)]"
                  >
                    <CheckCircle2 className="h-10 w-10" />
                  </motion.div>
                ) : state === "waiting" && !cameraStream ? (
                  <ScanFace className="h-24 w-24 text-cyan/30" />
                ) : null}
              </div>

              {state === "scanning" && (
                <motion.div
                  initial={{ y: 0 }}
                  animate={{ y: 240 }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "linear",
                  }}
                  className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan to-transparent shadow-[0_0_20px_#00C2FF] z-20"
                />
              )}
            </div>

            <div className="text-center">
              <StatusLabel
                state={state}
                customText={
                  cooldownTime > 0
                    ? `Cooldown: Wait ${cooldownTime}s`
                    : statusMessage
                }
              />
            </div>

            {state === "waiting" && (
              <Button
                onClick={run}
                disabled={
                  checkingProfile ||
                  cooldownTime > 0 ||
                  (faceApiLoaded && loadingModels)
                }
                className="w-full h-11 btn-hero font-semibold"
              >
                {!cameraStream ? (
                  <>
                    <Camera className="mr-2 h-4 w-4" /> Start Webcam Camera
                  </>
                ) : (
                  <>
                    <ScanFace className="mr-2 h-4 w-4" /> Capture & Verify Face
                  </>
                )}
              </Button>
            )}
            {(state === "scanning" || state === "verifying") && (
              <Button disabled className="w-full h-11 font-semibold">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                {state === "scanning" ? "Scanning…" : "Verifying…"}
              </Button>
            )}
          </>
        )}

        {hasDescriptor && state === "waiting" && (
          <div className="pt-4 border-t border-muted text-center">
            <Link
              to="/auth/face"
              search={{ reset: true }}
              className="text-xs text-accent hover:underline font-semibold"
            >
              Reset Face ID and Re-register
            </Link>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed italic">
          Your biometric features are processed using on-device models.
          Verification and session matching are cryptographically compared and
          gated server-side.
        </p>
      </div>
    </AuthShell>
  );
}

function StatusLabel({
  state,
  customText,
}: {
  state: State;
  customText?: string;
}) {
  const cfg = {
    waiting: {
      text: customText || "Ready to verify",
      cls: "text-muted-foreground",
    },
    scanning: { text: customText || "Scanning face...", cls: "text-accent" },
    verifying: { text: customText || "Verifying...", cls: "text-accent" },
    verified: { text: customText || "Identity verified", cls: "text-emerald" },
  }[state];
  return <div className={`text-sm font-semibold ${cfg.cls}`}>{cfg.text}</div>;
}
