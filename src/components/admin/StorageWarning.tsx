import { storageMode } from "@/lib/db";
import { uploadsUnavailable } from "@/lib/uploads";

/** Explains on every admin page which Vercel storage is missing, instead of failing on save. */
export default function StorageWarning() {
  const missing = [
    storageMode === "read-only" && "Upstash Redis (för att spara innehåll)",
    uploadsUnavailable && "Vercel Blob (för bilder och kundfiler)",
  ].filter(Boolean) as string[];
  if (missing.length === 0) return null;
  return (
    <div role="alert" className="mb-8 rounded-2xl bg-hallon-soft p-5 text-hallon-dark">
      <p className="font-semibold">Lagring saknas i Vercel-projektet</p>
      <p className="mt-1">
        Koppla {missing.join(" och ")} under Storage i Vercel, och gör sedan en ny deploy under Deployments. Tills dess går det inte att spara{" "}
        {storageMode === "read-only" ? "ändringar" : "bilder"}.
      </p>
    </div>
  );
}
