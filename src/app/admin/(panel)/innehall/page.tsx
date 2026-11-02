import { getSettings } from "@/lib/db";
import SettingsForm from "@/components/admin/SettingsForm";
import { blobMode } from "@/lib/uploads";
import { getAdminT } from "@/lib/admin-lang";

export default async function ContentPage() {
  const [settings, t] = await Promise.all([getSettings(), getAdminT()]);
  return (
    <>
      <h1 className="font-sans text-3xl font-semibold tracking-normal">{t.content.title}</h1>
      <p className="mb-8 mt-1 text-fjord">{t.content.intro}</p>
      <SettingsForm settings={settings} direct={blobMode} />
    </>
  );
}
