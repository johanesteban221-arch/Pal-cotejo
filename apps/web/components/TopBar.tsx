"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function TopBar() {
  const path = usePathname();
  const enAdmin = path?.startsWith("/admin");
  return (
    <div className="topbar">
      <Link href="/" className="brand">
        <span className="logo">⚽</span>
        <span>
          PAL COTEJO <span style={{ color: "var(--green)", fontWeight: 800 }}>·</span> Sport Bar
        </span>
      </Link>
      <div className="switch">
        <Link href="/" className={!enAdmin ? "active" : ""}>
          Cliente
        </Link>
        <Link href="/admin" className={enAdmin ? "active" : ""}>
          Admin
        </Link>
      </div>
    </div>
  );
}
