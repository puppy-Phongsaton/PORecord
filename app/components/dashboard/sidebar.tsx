"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

const NAV = [
  { key: "grid", label: "แดชบอร์ด Check PO", href: "/" },
  { key: "list", label: "บันทึกข้อมูล PO", href: "/record" },
] as const;

export function Sidebar({ open }: { open: boolean }) {
  const pathname = usePathname();

  return (
    <aside style={{ flexShrink: 0, display: "flex", flexDirection: "column", background: "white", borderRight: "1px solid #e8ecf2", overflow: "hidden", transition: "width .28s cubic-bezier(.4,0,.2,1)", width: open ? 216 : 58 }}>
      <div style={{ height: 60, display: "flex", alignItems: "center", padding: "0 13px", borderBottom: "1px solid #f0f3f8", flexShrink: 0, gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: "#3d5a73", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>D</div>
        {open && <span style={{ fontSize: 14, fontWeight: 700, color: "#253545", whiteSpace: "nowrap" }}>DataBoard</span>}
      </div>
      <nav style={{ flex: 1, padding: "10px 7px", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map((n) => {
          const I = Icon[n.key as keyof typeof Icon] as () => React.ReactElement;
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <Link
              key={n.key}
              href={n.href}
              title={n.label}
              style={{
                display: "flex", alignItems: "center", gap: 9, padding: "9px 9px",
                borderRadius: 9, border: "none", cursor: "pointer", width: "100%",
                textDecoration: "none",
                background: active ? "#eef3f8" : "transparent",
                color: active ? "#2a4a62" : "#8ca0b0",
                fontWeight: active ? 600 : 400, fontSize: 13, transition: "background .12s",
              }}
            >
              <span style={{ flexShrink: 0, display: "flex", width: 18, justifyContent: "center" }}><I /></span>
              {open && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: "10px 9px", borderTop: "1px solid #f0f3f8", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#dde4ec", color: "#4a6070", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>AP</div>
          {open && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#334155", margin: 0 }}>Admin Panel</p>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>ผู้ดูแลระบบ</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
