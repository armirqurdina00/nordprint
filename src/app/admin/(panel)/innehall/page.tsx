import { getSettings } from "@/lib/db";
import SettingsForm from "@/components/admin/SettingsForm";
import { directUploads } from "@/lib/uploads";
import { storageMode } from "@/lib/db";

export default async function ContentPage() {
  const settings = await getSettings();
  return (
    <>
      <h1 className="font-sans text-3xl font-semibold tracking-normal">Sidinnehåll</h1>
      <p className="mb-8 mt-1 text-fjord">Texterna på webbplatsen. Ändringarna syns direkt när du sparar.</p>
      {storageMode === "read-only" && (
        <p role="alert" className="mb-6 rounded-2xl bg-hallon-soft p-4 font-medium text-hallon-dark">
          Ingen databas är kopplad, så ändringar kan inte sparas. Lägg till Upstash Redis och Vercel Blob under Storage i Vercel-projektet och gör en ny deploy.
        </p>
      )}
      <SettingsForm settings={settings} direct={directUploads} />
    </>
  );
}
