import { storageMode } from "@/lib/db";
import { uploadsUnavailable } from "@/lib/uploads";
import { getAdminT } from "@/lib/admin-lang";

/** Explains on every admin page which Vercel storage is missing, instead of failing on save. */
export default async function StorageWarning() {
  const missingRedis = storageMode === "read-only";
  if (!missingRedis && !uploadsUnavailable) return null;
  const t = await getAdminT();
  const missing = [missingRedis && t.storage.redis, uploadsUnavailable && t.storage.blob].filter(Boolean) as string[];
  return (
    <div role="alert" className="mb-8 rounded-2xl bg-hallon-soft p-5 text-hallon-dark">
      <p className="font-semibold">{t.storage.title}</p>
      <p className="mt-1">{t.storage.text(missing.join(t.storage.and), missingRedis ? "changes" : "images")}</p>
    </div>
  );
}
