import Link from "next/link";
import type { Lang } from "@/lib/types";
import type { LocalProduct } from "@/lib/localize";
import { formatPrice } from "@/lib/format";
import { t } from "@/lib/i18n";
import { href } from "@/lib/routes";
import ProductImage from "./ProductImage";

export default function ProductCard({ product, lang, large = false }: { product: LocalProduct; lang: Lang; large?: boolean }) {
  const d = t(lang);
  return (
    <Link href={href(lang, "products", product.slug)} className="group block">
      <div className="aspect-[4/5] overflow-hidden rounded-[22px] bg-mist">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]">
          <ProductImage product={product} sizes={large ? "lg" : "md"} soonLabel={d.products.imageSoon} />
        </div>
      </div>
      <h3 className={`mt-3 font-sans font-semibold tracking-normal group-hover:text-hallon ${large ? "text-xl" : "text-lg"}`}>{product.name}</h3>
      <p className="text-fjord">{product.tagline}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className={`tabular-nums ${product.price === null ? "text-sm font-medium text-fjord" : "font-semibold"}`}>
          {product.price === null ? d.products.onRequest : formatPrice(product.price, lang)}
          {product.price !== null && product.priceNote && <span className="ml-1.5 text-sm font-normal text-fjord">{product.priceNote}</span>}
        </p>
        {product.colors.length > 0 && (
          <ul className="flex gap-1.5" aria-label={d.products.colors}>
            {product.colors.map((c) => (
              <li key={c} className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
