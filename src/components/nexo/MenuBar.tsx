"use client";

import React from "react";
import type { ViewId } from "./NexoContext";

export interface MenuEntry {
  id: string;
  label: string;
  view?: ViewId;
  focusNgos?: boolean;
}

interface Props {
  items: MenuEntry[];
  activeId: string;
  onSelect: (item: MenuEntry) => void;
}

export default function MenuBar({ items, activeId, onSelect }: Props) {
  return (
    <nav aria-label="Menú principal" className="flex flex-wrap items-center border-b border-[#808080] bg-[#d4d0c8] px-1 py-[2px]">
      {items.map((it) => (
        <button
          key={it.id}
          id={`menu-${it.id}`}
          className="menu-item"
          aria-current={activeId === it.id ? "page" : undefined}
          onClick={() => onSelect(it)}
        >
          <span className="underline">{it.label[0]}</span>
          {it.label.slice(1)}
        </button>
      ))}
    </nav>
  );
}
