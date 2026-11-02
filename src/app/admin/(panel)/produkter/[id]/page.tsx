import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";
import { directUploads } from "@/lib/uploads";
import { ConfirmButton } from "@/components/admin/ui";
import { deleteProduct } from "../../../actions";

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ skapad?: string }> }) {
  const [{ id }, { skapad }, { products }] = await Promise.all([params, searchParams, getContent()]);
  const cats = (l: "sv" | "en") => [...new Set(products.map((p) => p[l].category).filter(Boolean))].sort();
  const categories = { sv: cats("sv"), en: cats("en") };
  const isNew = id === "ny";
  const product = isNew ? undefined : products.find((p) => p.id === id);
  if (!isNew && !product) notFound();

  return (
    <>
      <Link href="/admin/produkter" className="text-fjord hover:text-granite">Alla produkter</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-3xl font-semibold tracking-normal">{product ? product.sv.name : "Ny produkt"}</h1>
        {product && (
          <form action={deleteProduct}>
            <input type="hidden" name="id" value={product.id} />
            <ConfirmButton confirmText="Klicka igen för att radera">Radera produkt</ConfirmButton>
          </form>
        )}
      </div>
      {skapad && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 font-medium text-emerald-900">Produkten är skapad.</p>}
      <ProductForm product={product} categories={categories} direct={directUploads} />
    </>
  );
}
