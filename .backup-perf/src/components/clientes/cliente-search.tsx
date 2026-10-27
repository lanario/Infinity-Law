"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface ClienteSearchProps {
  initialValue?: string;
}

export function ClienteSearch({ initialValue = "" }: ClienteSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, 300);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedValue) {
      params.set("search", debouncedValue);
      params.delete("cursor");
    } else {
      params.delete("search");
      params.delete("cursor");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [debouncedValue, router, pathname, searchParams]);

  return (
    <div className="relative">
      <Search
        className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar clientes..."
        className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-10 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-gold/70 focus:ring-4 focus:ring-gold/10"
        aria-label="Buscar clientes por nome"
      />
      {value && (
        <button
          onClick={() => setValue("")}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-300 transition hover:bg-stone-100 hover:text-stone-600"
          aria-label="Limpar busca"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
