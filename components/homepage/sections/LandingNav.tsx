"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { label:"Home",       href:"/",          img:"/themes/default/navs/home.png"       },
  { label:"Stories",    href:"/stories",   img:"/themes/default/navs/Stories.png"    },
  { label:"Activities", href:"/missions",  img:"/themes/default/navs/activities.png" },
  { label:"Community",  href:"/community", img:"/themes/default/navs/community.png"  },
  { label:"Parents",    href:"/parents",   img:"/themes/default/navs/parent.png"     },
  { label:"Help",       href:"/help",      img:"/themes/default/navs/about.png"      },
] as const;

const FLOWER_ROW = [
  { f:"🌸", sz:26, mb:6  },
  { f:"🌿", sz:20, mb:0  },
  { f:"🌼", sz:30, mb:8  },
  { f:"🌱", sz:18, mb:2  },
  { f:"🌻", sz:34, mb:10 },
  { f:"🍀", sz:22, mb:1  },
  { f:"🌺", sz:28, mb:5  },
  { f:"🌸", sz:24, mb:7  },
  { f:"🌼", sz:30, mb:3  },
  { f:"🌻", sz:32, mb:9  },
  { f:"🍀", sz:22, mb:2  },
  { f:"🌺", sz:26, mb:4  },
  { f:"🌿", sz:20, mb:0  },
  { f:"🌸", sz:28, mb:6  },
  { f:"🌼", sz:30, mb:8  },
  { f:"🌻", sz:34, mb:10 },
  { f:"🌱", sz:18, mb:1  },
  { f:"🍀", sz:22, mb:3  },
  { f:"🌺", sz:26, mb:5  },
  { f:"🌸", sz:24, mb:7  },
] as const;

function DrawerFlowerDivider({ bgColor = "transparent" }: { bgColor?: string }) {
  return (
    <div className="w-full overflow-hidden pointer-events-none select-none" style={{ height: 72, background: bgColor }} aria-hidden>
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${FLOWER_ROW.length}, 1fr)`,
        alignItems: "end",
        height: "100%",
      }}>
        {FLOWER_ROW.map(({ f, sz, mb }, i) => {
          const dur   = 1.7 + (i % 7) * 0.22;
          const delay = (i * 0.18) % 2.8;
          const angle = 10 + (i % 4) * 3;
          return (
            <motion.span key={i}
              className="leading-none flex items-end justify-center"
              style={{ fontSize: sz, paddingBottom: mb }}
              animate={{ rotate: [-angle, angle, -angle], y: [0, -4, 0] }}
              transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}>
              {f}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  scrolled: boolean;
  menuOpen: boolean;
  setMenuOpen: (fn: (o: boolean) => boolean) => void;
  authed: boolean;
}

export default function LandingNav({ scrolled, menuOpen, setMenuOpen, authed }: Props) {
  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-2xl border-b-2 border-gray-300 shadow-[0_8px_40px_rgba(0,0,0,0.14)]" : ""
      }`}>
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3 w-full">

          <Link href="/" className={`shrink-0 transition-opacity duration-200 ${
            menuOpen ? "opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto" : "opacity-100"
          }`}>
            <img loading="lazy" src="/nimi-logo.png" alt="NIMIPIKO"
              className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain drop-shadow-md" />
          </Link>

          <ul className="hidden lg:flex items-center gap-3 xl:gap-4">
            {NAV_LINKS.map(n => (
              <motion.li key={n.label}
                whileHover={{ scale:1.08, y:-2 }} whileTap={{ scale:0.94 }}
                transition={{ type:"spring", stiffness:400, damping:20 }}>
                <Link href={n.href}>
                  <img loading="lazy" src={n.img} alt={n.label} draggable={false}
                    className="h-9 xl:h-10 w-auto object-contain select-none drop-shadow-sm" />
                </Link>
              </motion.li>
            ))}
          </ul>

          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            {authed ? (
              <Link href="/home" className="font-baloo font-bold text-[13px] xl:text-[14px] text-white px-4 xl:px-5 py-2 rounded-full shadow-sm transition-colors whitespace-nowrap" style={{backgroundColor:'var(--nimi-green)'}}>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/loginpage" className="font-baloo font-bold text-[13px] xl:text-[14px] text-gray-700 px-4 xl:px-5 py-2 rounded-full border border-gray-200/80 hover:bg-gray-50/80 transition-all whitespace-nowrap backdrop-blur-sm">
                  Log In
                </Link>
                <Link href="/signuppage" className="font-baloo font-bold text-[13px] xl:text-[14px] text-white px-4 xl:px-5 py-2 rounded-full shadow-sm transition-all hover:-translate-y-px whitespace-nowrap" style={{backgroundColor:'var(--nimi-green)', boxShadow:'0 2px 12px rgba(21,128,61,0.30)'}}>
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu" aria-expanded={menuOpen}
            className="lg:hidden w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-full hover:bg-gray-100/70 transition-colors shrink-0">
            {(["a","b","c"] as const).map((k,i) => (
              <motion.span key={k}
                className="block w-[22px] h-[2px] rounded-full bg-gray-700"
                animate={i===0?(menuOpen?{rotate:45,y:7}:{rotate:0,y:0}):i===1?(menuOpen?{opacity:0,scaleX:0}:{opacity:1,scaleX:1}):(menuOpen?{rotate:-45,y:-7}:{rotate:0,y:0})}
                transition={{ duration:i===1?0.15:0.25, ease:"easeInOut" }} />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
              className="fixed inset-0 z-40 backdrop-blur-sm bg-black/20" onClick={() => setMenuOpen(() => false)} />
            <motion.div initial={{x:"-100%"}} animate={{x:0}} exit={{x:"-100%"}}
              transition={{type:"spring", damping:26, stiffness:280}}
              className="fixed left-0 top-0 h-[100dvh] w-72 z-50 shadow-2xl flex flex-col overflow-hidden"
              style={{background:"#f2ead8"}}>
              <div className="flex flex-col items-center pt-6 pb-2 px-5 shrink-0">
                <img loading="lazy" src="/nimi-logo.png" alt="NIMIPIKO" className="w-40 h-40 object-contain drop-shadow-sm" />
              </div>
              <nav className="flex flex-col px-4 flex-1 justify-center gap-0.5 overflow-y-auto">
                {NAV_LINKS.map(({label,href,img}) => (
                  <motion.div key={label} whileHover={{scale:1.05,y:-2}} whileTap={{scale:0.96}}
                    transition={{type:"spring",stiffness:400,damping:20}}>
                    <Link href={href} onClick={() => setMenuOpen(() => false)} className="flex items-center px-4 py-2">
                      <img loading="lazy" src={img} alt={label} draggable={false} className="h-10 w-auto object-contain select-none" />
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="mx-6 border-t border-black/8 shrink-0" />
              <div className="px-6 py-4 shrink-0 flex flex-col gap-2.5">
                {authed ? (
                  <Link href="/home" onClick={() => setMenuOpen(() => false)}
                    className="w-full text-center font-baloo font-bold text-white py-2.5 rounded-full text-[14px] shadow-md transition-colors"
                    style={{backgroundColor:'var(--nimi-green)'}}>
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/loginpage" onClick={() => setMenuOpen(() => false)}
                      className="w-full text-center font-baloo font-bold text-gray-700 border border-gray-300 py-2.5 rounded-full text-[14px] hover:bg-black/5 transition-colors">
                      Log In
                    </Link>
                    <Link href="/signuppage" onClick={() => setMenuOpen(() => false)}
                      className="w-full text-center font-baloo font-bold text-white py-2.5 rounded-full text-[14px] shadow-md transition-colors"
                      style={{backgroundColor:'var(--nimi-green)'}}>
                      Get Started
                    </Link>
                  </>
                )}
              </div>
              <div className="shrink-0">
                <DrawerFlowerDivider bgColor="rgba(242,234,216,0.8)" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
