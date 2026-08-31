"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ComboboxCustomer = { id: string; name: string; phone: string };

function normalizePhone(v: string): string {
  return v.replace(/\D/g, "");
}

/**
 * 이름 또는 전화번호로 입력하면서 후보를 실시간으로 좁혀 선택하는 콤보박스.
 * 후보 목록은 미리 불러온 값을 클라이언트에서 필터링한다(매장 규모상 충분).
 */
export function CustomerCombobox({
  name,
  candidates,
  defaultValue,
  required,
  placeholder = "이름 또는 전화번호로 검색",
}: {
  /** 선택된 고객 id 를 담을 hidden input 의 name */
  name: string;
  candidates: ComboboxCustomer[];
  defaultValue?: ComboboxCustomer | null;
  required?: boolean;
  placeholder?: string;
}) {
  const [selected, setSelected] = useState<ComboboxCustomer | null>(defaultValue ?? null);
  const [query, setQuery] = useState(
    defaultValue ? `${defaultValue.name} (${defaultValue.phone})` : "",
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return candidates.slice(0, 20);
    const qPhone = normalizePhone(q);
    return candidates
      .filter((c) => c.name.includes(q) || (qPhone && normalizePhone(c.phone).includes(qPhone)))
      .slice(0, 20);
  }, [candidates, query]);

  function pick(c: ComboboxCustomer) {
    setSelected(c);
    setQuery(`${c.name} (${c.phone})`);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <Input
        value={query}
        placeholder={placeholder}
        required={required}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
          setOpen(true);
        }}
      />
      {open && results.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-popover py-1 text-sm shadow-md">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => pick(c)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left outline-none hover:bg-accent hover:text-accent-foreground",
                  selected?.id === c.id ? "bg-accent/60" : "",
                )}
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : open && query.trim() ? (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          검색 결과가 없습니다.
        </div>
      ) : null}
    </div>
  );
}
