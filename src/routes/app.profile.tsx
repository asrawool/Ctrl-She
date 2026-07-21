import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth, ROLES, getInitials } from "@/store/auth";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  getUserProfileFn,
  saveUserProfileFn,
  EducationItem,
  CertificationItem,
} from "@/services/webauthn.server";

interface UserProfile {
  user_id?: string;
  full_name: string;
  avatar_url: string | null;
  department: string;
  plant: string;
  years_of_experience: number;
  education: EducationItem[];
  certifications: CertificationItem[];
  specialties: string[];
}
import { toast } from "sonner";
import {
  Camera,
  Upload,
  X,
  Plus,
  Trash2,
  Loader2,
  Check,
  FileText,
  Award,
  GraduationCap,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  head: () => ({ meta: [{ title: "Profile — SynapseAi" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { email, role, customRole, language } = useAuth();
  const roleLabel =
    role === "other" ? customRole : ROLES.find((r) => r.id === role)?.label;

  const [profile, setProfile] = useState<UserProfile>({
    full_name: "",
    avatar_url: null,
    department: "Operations",
    plant: "Plant Alpha",
    years_of_experience: 0,
    education: [],
    certifications: [],
    specialties: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Avatar states
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | Blob | null>(null);

  // Helper inputs for array fields
  const [newSkill, setNewSkill] = useState("");
  const [newEd, setNewEd] = useState({ degree: "", school: "", year: "" });
  const [newCert, setNewCert] = useState({ name: "", issuer: "", expiry: "" });

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;
        const res = await getUserProfileFn({
          data: { token: session.access_token },
        });
        setProfile(res.profile);
        if (res.profile?.full_name) {
          useAuth.getState().setFullName(res.profile.full_name);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        toast.error("Could not load profile data.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Camera helpers
  const startCamera = async () => {
    setShowCamera(true);
    setShowAvatarOptions(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300 },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      toast.error("Could not access device camera");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Mirror snapshot for natural feel
      ctx.translate(300, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, 300, 300);
      canvas.toBlob((blob) => {
        if (blob) {
          const fileUrl = URL.createObjectURL(blob);
          setAvatarPreview(fileUrl);
          setPreviewFile(blob);
          stopCamera();
        }
      }, "image/png");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setAvatarPreview(fileUrl);
      setPreviewFile(file);
      setShowAvatarOptions(false);
    }
  };

  // Upload and Save Avatar
  const handleSaveAvatar = async () => {
    if (!previewFile) return;
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please log in again.");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found.");

      const fileExt = "png";
      const filePath = `${user.id}/avatar_${Date.now()}.${fileExt}`;

      // Upload file to storage bucket
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, previewFile, { upsert: true, cacheControl: "3600" });

      if (uploadError) throw uploadError;

      // Retrieve public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Save public URL in database
      const updatedProfile = { ...profile, avatar_url: publicUrl };
      await saveUserProfileFn({
        data: { token: session.access_token, ...updatedProfile },
      });

      setProfile(updatedProfile);
      setAvatarPreview(null);
      setPreviewFile(null);
      toast.success("Avatar updated successfully!");
    } catch (err) {
      console.error("Avatar save error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to upload avatar.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Save profile info
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired. Please log in again.");

      await saveUserProfileFn({
        data: { token: session.access_token, ...profile },
      });
      useAuth.getState().setFullName(profile.full_name);
      toast.success("Profile saved successfully!");
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile changes.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Helper arrays update functions
  const addSkill = () => {
    if (newSkill.trim() && !profile.specialties.includes(newSkill.trim())) {
      setProfile({
        ...profile,
        specialties: [...profile.specialties, newSkill.trim()],
      });
      setNewSkill("");
    }
  };

  const removeSkill = (index: number) => {
    const list = [...profile.specialties];
    list.splice(index, 1);
    setProfile({ ...profile, specialties: list });
  };

  const addEducation = () => {
    if (newEd.degree.trim() && newEd.school.trim()) {
      setProfile({
        ...profile,
        education: [...profile.education, { ...newEd }],
      });
      setNewEd({ degree: "", school: "", year: "" });
    }
  };

  const removeEducation = (index: number) => {
    const list = [...profile.education];
    list.splice(index, 1);
    setProfile({ ...profile, education: list });
  };

  const addCertification = () => {
    if (newCert.name.trim() && newCert.issuer.trim()) {
      setProfile({
        ...profile,
        certifications: [...profile.certifications, { ...newCert }],
      });
      setNewCert({ name: "", issuer: "", expiry: "" });
    }
  };

  const removeCertification = (index: number) => {
    const list = [...profile.certifications];
    list.splice(index, 1);
    setProfile({ ...profile, certifications: list });
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const initials = getInitials(profile.full_name, email);

  return (
    <>
      <PageHeader
        title="Profile"
        description="Personal information, certifications, and professional specialties."
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left avatar card */}
        <div className="rounded-2xl border border-border bg-card p-6 text-center h-fit space-y-4">
          <div className="relative mx-auto h-28 w-28 rounded-2xl overflow-hidden bg-gradient-to-br from-navy to-steel border-2 border-accent/20 flex items-center justify-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-display text-4xl font-bold text-white">
                {initials}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold truncate">
              {profile.full_name || email?.split("@")[0]}
            </h3>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAvatarOptions(!showAvatarOptions)}
            >
              <Camera className="mr-1.5 h-3.5 w-3.5" /> Change avatar
            </Button>

            {showAvatarOptions && (
              <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-card border border-border rounded-xl shadow-xl p-1.5 flex flex-col gap-1 text-left">
                <button
                  onClick={startCamera}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg hover:bg-muted flex items-center gap-2"
                >
                  <Camera className="h-3.5 w-3.5" /> Take Photo
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg hover:bg-muted flex items-center gap-2"
                >
                  <Upload className="h-3.5 w-3.5" /> Choose from Gallery
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Right forms container */}
        <div className="space-y-6">
          {/* Section 1: Personal Details */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h4 className="font-display text-md font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Personal Details
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <Input
                  value={profile.full_name}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </Field>
              <Field label="Email">
                <Input
                  value={email ?? ""}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Contact support to change your login email.
                </p>
              </Field>
              <Field label="Designation">
                <Input
                  defaultValue={roleLabel ?? ""}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </Field>
              <Field label="Department">
                <Input
                  value={profile.department}
                  onChange={(e) =>
                    setProfile({ ...profile, department: e.target.value })
                  }
                />
              </Field>
              <Field label="Plant">
                <Input
                  value={profile.plant}
                  onChange={(e) =>
                    setProfile({ ...profile, plant: e.target.value })
                  }
                />
              </Field>
              <Field label="Years of Experience">
                <Input
                  type="number"
                  value={profile.years_of_experience || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      years_of_experience: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Field>
            </div>
          </div>

          {/* Section 2: Specialties & Skills */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h4 className="font-display text-md font-bold text-foreground border-b border-border pb-3">
              Specialties & Skills
            </h4>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add specialty (e.g. PLC Coding, Vibration Analysis)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
                <Button onClick={addSkill} className="btn-hero h-11 px-4">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {profile.specialties.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">
                    No specialties listed yet.
                  </span>
                ) : (
                  profile.specialties.map((tag: string, index: number) => (
                    <span
                      key={tag}
                      className="rounded-full bg-accent/10 border border-accent/20 px-3 py-1 text-xs font-semibold text-accent flex items-center gap-1.5"
                    >
                      {tag}
                      <button
                        onClick={() => removeSkill(index)}
                        className="hover:text-foreground text-accent/60"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Education */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h4 className="font-display text-md font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-accent" /> Education
            </h4>

            {/* List */}
            <div className="space-y-3">
              {profile.education.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No education records added yet.
                </p>
              ) : (
                profile.education.map((ed: EducationItem, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-start p-3.5 border border-border rounded-xl bg-muted/20"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {ed.degree}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ed.school} {ed.year ? `(${ed.year})` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      onClick={() => removeEducation(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Add education inputs */}
            <div className="pt-3 border-t border-border grid gap-3 sm:grid-cols-[1fr_1fr_100px_50px]">
              <Input
                value={newEd.degree}
                onChange={(e) => setNewEd({ ...newEd, degree: e.target.value })}
                placeholder="Degree / Certificate"
                className="h-10"
              />
              <Input
                value={newEd.school}
                onChange={(e) => setNewEd({ ...newEd, school: e.target.value })}
                placeholder="Institution / School"
                className="h-10"
              />
              <Input
                value={newEd.year}
                onChange={(e) => setNewEd({ ...newEd, year: e.target.value })}
                placeholder="Grad Year"
                className="h-10"
              />
              <Button
                onClick={addEducation}
                disabled={!newEd.degree.trim() || !newEd.school.trim()}
                className="btn-hero h-10 w-full p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Section 4: Certifications */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <h4 className="font-display text-md font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <Award className="h-4 w-4 text-accent" /> Certifications
            </h4>

            {/* List */}
            <div className="space-y-3">
              {profile.certifications.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No certifications added yet.
                </p>
              ) : (
                profile.certifications.map(
                  (cert: CertificationItem, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between items-start p-3.5 border border-border rounded-xl bg-muted/20"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {cert.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Issued by: {cert.issuer}{" "}
                          {cert.expiry ? `(Expires: ${cert.expiry})` : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        onClick={() => removeCertification(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ),
                )
              )}
            </div>

            {/* Add certification inputs */}
            <div className="pt-3 border-t border-border grid gap-3 sm:grid-cols-[1fr_1fr_120px_50px]">
              <Input
                value={newCert.name}
                onChange={(e) =>
                  setNewCert({ ...newCert, name: e.target.value })
                }
                placeholder="Cert Name (e.g. AWS Certified)"
                className="h-10"
              />
              <Input
                value={newCert.issuer}
                onChange={(e) =>
                  setNewCert({ ...newCert, issuer: e.target.value })
                }
                placeholder="Issuing Body"
                className="h-10"
              />
              <Input
                value={newCert.expiry}
                onChange={(e) =>
                  setNewCert({ ...newCert, expiry: e.target.value })
                }
                placeholder="Expiry Date"
                className="h-10"
              />
              <Button
                onClick={addCertification}
                disabled={!newCert.name.trim() || !newCert.issuer.trim()}
                className="btn-hero h-10 w-full p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="btn-hero min-w-[120px]"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={stopCamera}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-md font-bold text-center">
              Take Profile Photo
            </h3>
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-border bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover transform -scale-x-100"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="w-full" onClick={stopCamera}>
                Cancel
              </Button>
              <Button className="btn-hero w-full" onClick={capturePhoto}>
                Capture
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Preview Modal */}
      {avatarPreview && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-4">
            <h3 className="font-display text-md font-bold text-center">
              Confirm Profile Picture
            </h3>
            <div className="relative aspect-square w-48 mx-auto rounded-2xl overflow-hidden border-2 border-accent">
              <img
                src={avatarPreview}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setAvatarPreview(null);
                  setPreviewFile(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="btn-hero w-full"
                onClick={handleSaveAvatar}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Save Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
