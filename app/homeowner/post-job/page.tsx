"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { MapPin, DollarSign, FileText, Wrench, ImagePlus, X } from "lucide-react";

export default function PostJobPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [jobType, setJobType] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      setStatus("Maximum 5 photos allowed");
      return;
    }
    setPhotos((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("");

    if (!address || !zip || !jobType || !description) {
      setStatus("Please fill in all required fields");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus("You must be logged in");
      return;
    }

    setLoading(true);

    // Upload photos to Supabase Storage
    const photoUrls: string[] = [];
    for (const file of photos) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("job-photos")
        .upload(path, file);
      if (uploadError) {
        setStatus("Error uploading photo: " + uploadError.message);
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("job-photos")
        .getPublicUrl(path);
      photoUrls.push(urlData.publicUrl);
    }

    const { error } = await supabase.from("jobs").insert([
      {
        homeowner_id: user.id,
        address,
        zip_code: zip,
        job_type: jobType,
        description,
        budget: budget ? Number(budget) : null,
        photo_urls: photoUrls,
        status: "Negotiating",
      },
    ]);

    setLoading(false);

    if (error) {
      setStatus(error.message);
    } else {
      router.push("/homeowner/dashboard");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Post a Roofing Job
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe your roofing project and get matched with local contractors.
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Address *
            </label>
            <input
              type="text"
              placeholder="123 Main St"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Zip Code */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Zip Code *
            </label>
            <input
              type="text"
              placeholder="90210"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Job Type */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
              Job Type *
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              required
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">Select Job Type</option>
              <option value="Roof Replacement">Roof Replacement</option>
              <option value="Roof Repair">Roof Repair</option>
              <option value="Roof Inspection">Roof Inspection</option>
              <option value="Gutter Installation">Gutter Installation</option>
              <option value="Gutter Repair">Gutter Repair</option>
              <option value="New Construction">New Construction</option>
              <option value="Storm Damage">Storm Damage</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Description *
            </label>
            <textarea
              placeholder="Describe your roofing project in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          {/* Photos */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
              Photos (optional, max 5)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotos}
              className="hidden"
            />
            <div className="flex flex-wrap gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border">
                  <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-background hover:bg-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <ImagePlus className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              Budget (optional)
            </label>
            <input
              type="number"
              placeholder="5000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Status message */}
          {status && (
            <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {status}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Posting..." : "Post Job"}
          </button>
        </form>
      </div>
    </div>
  );
}
