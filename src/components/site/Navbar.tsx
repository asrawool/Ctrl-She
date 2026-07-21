import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Cpu } from "lucide-react";

const links = [
  ["Platform", "#platform"],
  ["Solutions", "#solutions"],
  ["AI Copilot", "#copilot"],
  ["Industries", "#industries"],
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all ${scrolled ? "backdrop-blur-xl bg-[#06132a]/70 border-b border-white/5" : "bg-transparent"}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-2.5 text-white">
          <span className="relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-cyan to-emerald shadow-[0_0_20px_rgba(0,194,255,0.5)]">
            <Cpu className="h-4.5 w-4.5 text-[#05122a]" strokeWidth={2.5} />
          </span>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-bold tracking-tight">
              Synapse<span className="text-cyan">Ai</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
              Operations Brain
            </div>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-7">
          {links.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link
            to="/about"
            className="text-sm font-medium text-white/70 hover:text-white"
          >
            About
          </Link>
          <Link
            to="/contact"
            className="text-sm font-medium text-white/70 hover:text-white"
          >
            Contact
          </Link>
          <Link
            to="/auth/login"
            search={{ intent: "login" }}
            className="text-sm font-medium text-white/70 hover:text-white"
          >
            Login
          </Link>
          <Link
            to="/auth/login"
            search={{ intent: "signup" }}
            className="btn-hero rounded-full px-5 py-2 text-sm font-semibold"
          >
            Sign Up
          </Link>
        </div>

        <button
          className="lg:hidden text-white"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/5 bg-[#06132a]/95 px-6 py-4">
          <div className="flex flex-col gap-3">
            {links.map(([l, h]) => (
              <a
                key={l}
                href={h}
                onClick={() => setOpen(false)}
                className="text-sm text-white/80"
              >
                {l}
              </a>
            ))}
            <Link
              to="/about"
              onClick={() => setOpen(false)}
              className="text-sm text-white/80"
            >
              About
            </Link>
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="text-sm text-white/80"
            >
              Contact
            </Link>
            <Link
              to="/auth/login"
              search={{ intent: "login" }}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-white/70 hover:text-white text-center py-2"
            >
              Sign in
            </Link>
            <Link
              to="/auth/login"
              search={{ intent: "signup" }}
              onClick={() => setOpen(false)}
              className="btn-hero rounded-full px-5 py-2 text-sm font-semibold text-center"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </motion.header>
  );
}
