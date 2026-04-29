import { useState } from "react";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
};

const sizeMap = {
  sm: 40,
  md: 54,
  lg: 78
} as const;

const taglineSizeMap = {
  sm: "0.78rem",
  md: "0.9rem",
  lg: "1rem"
} as const;

export function BrandLogo({
  size = "md",
  showTagline = false
}: BrandLogoProps) {
  const [hasImageError, setHasImageError] = useState(false);

  return (
    <div
      style={{
        display: "grid",
        gap: showTagline ? "8px" : "0"
      }}
    >
      {hasImageError ? (
        <div
          style={{
            fontWeight: 900,
            letterSpacing: "-0.05em",
            fontSize: size === "sm" ? "1.4rem" : size === "md" ? "1.85rem" : "2.4rem",
            color: "#191c1a",
            lineHeight: 1
          }}
        >
          yaobox
        </div>
      ) : (
        <img
          src="/yaobox-logo.png"
          alt="YAOBOX logo"
          onError={() => setHasImageError(true)}
          style={{
            height: `${sizeMap[size]}px`,
            width: "auto",
            objectFit: "contain"
          }}
        />
      )}

      {showTagline ? (
        <p
          style={{
            margin: 0,
            color: "#3d4b31",
            fontSize: taglineSizeMap[size],
            fontWeight: 600,
            letterSpacing: "-0.02em"
          }}
        >
          Scan, Translate, and Track Your Medicine
        </p>
      ) : null}
    </div>
  );
}