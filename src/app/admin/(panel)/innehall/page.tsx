import { getSettings } from "@/lib/db";
import SettingsForm from "@/components/admin/SettingsForm";
import { blobMode } from "@/lib/uploads";

export default async function ContentPage() {
  const settings = await getSettings();
  return (
    <>
      <h1 className="font-sans text-3xl font-semibold tracking-normal">Sidinnehåll</h1>
      <p className="mb-8 mt-1 text-fjord">Texterna på webbplatsen. Ändringarna syns direkt när du sparar.</p>
      <SettingsForm settings={settings} direct={blobMode} />
    </>
  );
}
