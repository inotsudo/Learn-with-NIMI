import type { ReactNode } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "outline";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  type?: "button" | "submit";
}

const VARIANT: Record<Variant, string> = {
  primary: "bg-nimi-green text-white shadow-lg hover:brightness-105",
  secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
  outline: "bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-50",
};

// href -> renders a Link (navigation); omit href for an in-page action (onClick/submit).
export default function Button({ children, href, onClick, variant = "primary", className = "", type = "button" }: ButtonProps) {
  const classes = `font-baloo font-black text-[14px] px-6 py-3 rounded-full transition inline-flex items-center gap-1.5 justify-center ${VARIANT[variant]} ${className}`;

  if (href) {
    return <Link href={href} className={classes}>{children}</Link>;
  }
  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
