import Link from "next/link";
import { BookOpen, Palette, Search, Footprints, Music, Sprout, type LucideIcon } from "lucide-react";

interface Activity {
  label: string;
  icon: LucideIcon;
  color: string;
}

const ACTIVITIES: Activity[] = [
  { label: "Read",    icon: BookOpen,   color: "#F26522" },
  { label: "Create",  icon: Palette,    color: "#F94D8C" },
  { label: "Explore", icon: Search,     color: "#5C9EFF" },
  { label: "Move",    icon: Footprints, color: "#F59E0B" },
  { label: "Sing",    icon: Music,      color: "#8B5CF6" },
  { label: "Grow",    icon: Sprout,     color: "#00BA78" },
];

export default function ActivityIconRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-4 sm:gap-5 ${className}`}>
      {ACTIVITIES.map(({ label, icon: Icon, color }) => (
        <Link key={label} href="/signuppage" className="flex flex-col items-center gap-1.5 group">
          <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-md group-active:scale-90 transition-transform"
            style={{ backgroundColor: color }}>
            <Icon className="w-5 h-5 text-white" strokeWidth={2.25} />
          </div>
          <span className="font-nunito font-bold text-gray-600 text-[12px]">{label}</span>
        </Link>
      ))}
    </div>
  );
}
