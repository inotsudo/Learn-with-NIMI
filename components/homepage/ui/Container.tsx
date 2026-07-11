import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

// Shared max-width + horizontal padding for every homepage section's content.
export default function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}
