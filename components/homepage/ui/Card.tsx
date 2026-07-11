import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

// Base rounded/bordered surface reused by story cards, info panels, etc.
export default function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
