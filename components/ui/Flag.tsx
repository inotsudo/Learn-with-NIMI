"use client";

const FLAGS: Record<string, string> = {
  en: "/assets/flag-en.svg",
  fr: "/assets/flag-fr.svg",
  rw: "/assets/flag-rw.svg",
};

interface Props {
  lang: string;
  className?: string;
}

export default function Flag({ lang, className = "w-5 h-4" }: Props) {
  const src = FLAGS[lang];
  if (!src) return <span className={className}>🌐</span>;
  return <img src={src} alt={lang.toUpperCase()} className={`${className} rounded-sm object-cover`}  loading="lazy" />;
}
