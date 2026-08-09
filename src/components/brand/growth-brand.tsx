import { cn } from "@/lib/utils";
import { GROWTH_BRAND } from "@/lib/brand";

interface BrandClassNameProps {
  className?: string;
}

export function GrowthSymbol({ className }: BrandClassNameProps) {
  return (
    <img
      src={GROWTH_BRAND.assets.growthSymbol}
      alt=""
      aria-hidden="true"
      width={64}
      height={64}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

export function GrowthProductBrand({
  className,
  showDescriptor = true,
}: BrandClassNameProps & {
  showDescriptor?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <GrowthSymbol className="h-10 w-10" />

      <div className="min-w-0 leading-tight">
        <span className="block truncate font-display text-sm font-semibold tracking-[0.18em] text-gradient-gold">
          {GROWTH_BRAND.productName}
        </span>

        {showDescriptor && (
          <span className="block truncate text-[10px] uppercase tracking-[0.13em] text-muted-foreground">
            {GROWTH_BRAND.productDescriptor}
          </span>
        )}
      </div>
    </div>
  );
}

export function ParentBrandEndorsement({
  className,
  showMark = true,
}: BrandClassNameProps & {
  showMark?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 text-[10px] leading-tight text-muted-foreground",
        className,
      )}
    >
      {showMark && (
        <img
          src={GROWTH_BRAND.assets.parentMark}
          alt=""
          aria-hidden="true"
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 object-contain"
        />
      )}

      <span>{GROWTH_BRAND.parentEndorsement}</span>
    </div>
  );
}

export function GrowthFullArtwork({ className }: BrandClassNameProps) {
  return (
    <img
      src={GROWTH_BRAND.assets.growthFull}
      alt=""
      aria-hidden="true"
      width={1536}
      height={1024}
      decoding="async"
      className={cn("object-contain", className)}
    />
  );
}

export function GrowthEagleArtwork({
  className,
  eager = false,
}: BrandClassNameProps & {
  eager?: boolean;
}) {
  return (
    <img
      src={GROWTH_BRAND.assets.eagle}
      alt=""
      aria-hidden="true"
      width={474}
      height={947}
      decoding="async"
      loading={eager ? "eager" : "lazy"}
      className={cn("object-cover", className)}
    />
  );
}
