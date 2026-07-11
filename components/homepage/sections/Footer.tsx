import Link from "next/link";

const NAV = [
  { heading: "Product", links: [{ label: "Features", href: "/#features" }, { label: "Stories", href: "/#stories" }, { label: "Pricing", href: "/pricing" }, { label: "Schools", href: "/schools" }] },
  { heading: "Company", links: [{ label: "About", href: "/about" }, { label: "Blog", href: "/blog" }, { label: "Careers", href: "/careers" }, { label: "Contact", href: "/help" }] },
  { heading: "Legal",   links: [{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "Cookies", href: "/legal" }] },
];

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="col-span-2 sm:col-span-1">
          <p className="font-baloo font-black text-white text-xl mb-2">NIMIPIKO</p>
          <p className="font-nunito text-sm leading-relaxed text-gray-500 max-w-[180px]">
            Language learning for African families and curious children worldwide.
          </p>
          <div className="flex gap-3 mt-4">
            {["🇷🇼","🇫🇷","🇬🇧"].map(f => (
              <span key={f} className="text-xl" role="img">{f}</span>
            ))}
          </div>
        </div>

        {/* Nav columns */}
        {NAV.map(({ heading, links }) => (
          <div key={heading}>
            <p className="font-nunito font-black text-xs uppercase tracking-widest text-gray-500 mb-4">{heading}</p>
            <ul className="space-y-2.5">
              {links.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="font-nunito text-sm text-gray-400 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-nunito text-xs text-gray-600">
            © {new Date().getFullYear()} NIMIPIKO Studio. All rights reserved.
          </p>
          <p className="font-nunito text-xs text-gray-600">
            Made with ❤️ for Rwandan families
          </p>
        </div>
      </div>
    </footer>
  );
}
