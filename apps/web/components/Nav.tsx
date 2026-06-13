"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const path = usePathname();
  const is = (p: string) => (path === p ? "active" : "");
  return (
    <nav id="main-nav">
      <Link className="nav-logo" href="/">
        PAL <span>COTEJO</span>
      </Link>
      <div className="nav-links">
        <Link className={is("/reservar")} href="/reservar">
          Reservar cancha
        </Link>
        <Link className={is("/bar")} href="/bar">
          Sport bar
        </Link>
        <Link className="nav-admin" href="/admin">
          Panel admin
        </Link>
      </div>
      <Link className="nav-cta" href="/reservar">
        Reservar ahora
      </Link>
    </nav>
  );
}
