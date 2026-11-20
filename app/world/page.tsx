import type { Metadata } from "next";
import WorldDemoClient from "./WorldDemoClient";

export const metadata: Metadata = {
  title: "NIMIPIKO Airways — Toy World",
  description: "Preview of the NIMIPIKO Airways spatial toy world.",
  robots: { index: false, follow: false },
};

type SP = Record<string, string | string[] | undefined>;

/**
 * Public preview of the learner toy world with demo data (no account, no real
 * child data). Query params: theme, version, lang (fr|en), zone, age, intro=0.
 */
export default async function WorldPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const age = Number(one("age"));
  return (
    <WorldDemoClient
      theme={one("theme")}
      version={one("version")}
      lang={one("lang")}
      zone={one("zone")}
      age={Number.isFinite(age) && age > 0 ? age : 7}
      intro={one("intro") !== "0"}
    />
  );
}
