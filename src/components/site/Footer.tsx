import { Cpu, Linkedin, Twitter, Github } from "lucide-react";

export function Footer() {
  const cols = [
    {
      h: "Platform",
      l: [
        "Knowledge Graph",
        "AI Copilot",
        "Document Ingestion",
        "Digital Twin",
      ],
    },
    { h: "Solutions", l: ["Maintenance", "Operations", "Quality", "HSE"] },
    {
      h: "Resources",
      l: ["Documentation", "Whitepapers", "Case Studies", "Webinars"],
    },
    { h: "Company", l: ["About", "Careers", "Contact", "Press"] },
  ];
  return (
    <footer
      id="contact"
      className="bg-[#05102a] text-white/80 py-16 border-t border-white/5"
    >
      <div className="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-cyan to-emerald">
              <Cpu className="h-4.5 w-4.5 text-[#05122a]" strokeWidth={2.5} />
            </span>
            <div className="font-display text-lg font-bold text-white">
              IntelliPlant<span className="text-cyan">.AI</span>
            </div>
          </div>
          <p className="mt-4 text-sm max-w-sm">
            Unified Asset & Operations Brain for the world's leading
            manufacturers.
          </p>
          <div className="mt-5 flex gap-3">
            {[Linkedin, Twitter, Github].map((I, i) => (
              <a
                key={i}
                href="#"
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 hover:bg-cyan/15 hover:text-cyan transition"
              >
                <I className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {cols.map((c) => (
          <div key={c.h}>
            <div className="text-xs font-bold uppercase tracking-widest text-white">
              {c.h}
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {c.l.map((x) => (
                <li key={x}>
                  <a href="#" className="hover:text-cyan transition">
                    {x}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-6 mt-14 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
        <div>
          © {new Date().getFullYear()} IntelliPlant AI. All rights reserved.
        </div>
        <div className="flex gap-5">
          <a href="#" className="hover:text-white">
            Privacy
          </a>
          <a href="#" className="hover:text-white">
            Terms
          </a>
          <a href="#" className="hover:text-white">
            Cookies
          </a>
          <a href="#" className="hover:text-white">
            Security
          </a>
        </div>
      </div>
    </footer>
  );
}
