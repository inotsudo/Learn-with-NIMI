"use client";

import { motion } from "framer-motion";
import { useThemeMotion } from "@/hooks/useThemeMotion";
import type { Child } from "@/lib/queries";
import ChildAvatar from "@/components/avatar/ChildAvatar";

interface Props {
  children: Child[];
  activeChild: Child;
  onSelect: (child: Child) => void;
}

export default function ChildSelector({ children, activeChild, onSelect }: Props) {
  const m = useThemeMotion();
  return (
    <div className="flex items-center gap-2 mb-4 bg-white px-3 py-2 border border-ds-border overflow-x-auto shadow-sm" style={{ borderRadius: 'var(--leaf-r)' }}>
      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex-shrink-0">
        Playing as:
      </span>
      <div className="flex items-center gap-2 flex-1">
        {children.map(child => (
          <motion.button
            key={child.id}
            onClick={() => onSelect(child)}
            whileTap={m.buttonPress}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold transition-all flex-shrink-0 ${
              child.id === activeChild.id
                ? "text-white shadow-sm border border-transparent"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-ds-border"
            }`}
            style={child.id === activeChild.id
              ? { backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }
              : { borderRadius: 'var(--leaf-r-sm)' }
            }
          >
            <div className="w-5 h-5 rounded-full overflow-hidden shrink-0">
              <ChildAvatar avatarUrl={child.avatar_url} name={child.name} size={20} />
            </div>
            {child.name}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
