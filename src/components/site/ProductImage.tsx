/** Product photo, or a filament-coloured placeholder with visible print layers until a photo is uploaded. */
export default function ProductImage({
  product,
  index = 0,
  className = "",
  sizes = "md",
  soonLabel = "bild kommer snart",
}: {
  product: { name: string; images: string[]; colors: string[] };
  index?: number;
  className?: string;
  sizes?: "md" | "lg";
  soonLabel?: string;
}) {
  const src = product.images[index];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={product.name} className={`h-full w-full object-cover ${className}`} loading={index === 0 && sizes === "lg" ? "eager" : "lazy"} />;
  }
  const color = product.colors[index % Math.max(product.colors.length, 1)] ?? "#d3dcdf";
  return (
    <div
      role="img"
      aria-label={`${product.name}, ${soonLabel}`}
      className={`relative flex h-full w-full items-end overflow-hidden ${className}`}
      style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${color} 70%, white), ${color})` }}
    >
      <div className="print-layers absolute inset-0 opacity-70" />
      <span
        lang="sv"
        className={`relative max-w-full p-4 font-display font-semibold leading-none break-words hyphens-auto text-white/90 mix-blend-soft-light ${
          sizes === "lg" ? "text-4xl sm:text-6xl" : "text-2xl lg:text-3xl"
        }`}
      >
        {product.name.split(/[ ,]/)[0]}
      </span>
    </div>
  );
}
