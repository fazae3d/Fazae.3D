"use client";

import type { Category } from "@/lib/types";

export type SortOption = "relevancia" | "recentes" | "vendidos" | "menor-preco" | "maior-preco";

export type CatalogFilterState = {
  categories: string[];
  materials: string[];
  colors: string[];
  minPrice: number | null;
  maxPrice: number | null;
  sort: SortOption;
  onlyNew: boolean;
  onlyBestSellers: boolean;
};

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevancia", label: "Relevância" },
  { value: "recentes", label: "Mais recentes" },
  { value: "vendidos", label: "Mais vendidos" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
];

export function hasActiveFilters(state: CatalogFilterState): boolean {
  return (
    state.categories.length > 0 ||
    state.materials.length > 0 ||
    state.colors.length > 0 ||
    state.minPrice !== null ||
    state.maxPrice !== null ||
    state.onlyNew ||
    state.onlyBestSellers
  );
}

type CatalogFiltersProps = {
  state: CatalogFilterState;
  onChange: (next: CatalogFilterState) => void;
  categories: Category[];
  materials: string[];
  colors: string[];
  priceBounds: { min: number; max: number };
  hideCategoryFilter?: boolean;
};

export function CatalogFilters({
  state,
  onChange,
  categories,
  materials,
  colors,
  priceBounds,
  hideCategoryFilter = false,
}: CatalogFiltersProps) {
  // Category is single-select: picking one replaces whatever was selected before,
  // and picking the already-active one clears it back to "all categories".
  const toggleCategory = (slug: string) => {
    const isOnlyActive = state.categories.length === 1 && state.categories[0] === slug;
    onChange({ ...state, categories: isOnlyActive ? [] : [slug] });
  };

  const toggleMaterial = (name: string) => {
    const next = state.materials.includes(name)
      ? state.materials.filter((m) => m !== name)
      : [...state.materials, name];
    onChange({ ...state, materials: next });
  };

  const toggleColor = (name: string) => {
    const next = state.colors.includes(name) ? state.colors.filter((c) => c !== name) : [...state.colors, name];
    onChange({ ...state, colors: next });
  };

  const clearFilters = () => {
    onChange({
      categories: [],
      materials: [],
      colors: [],
      minPrice: null,
      maxPrice: null,
      sort: state.sort,
      onlyNew: false,
      onlyBestSellers: false,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {hasActiveFilters(state) && (
        <button
          type="button"
          onClick={clearFilters}
          className="label-caps self-start text-[11px] text-petrol hover:underline"
        >
          Limpar filtros
        </button>
      )}

      {!hideCategoryFilter && categories.length > 0 && (
        <div>
          <p className="label-caps mb-3 text-[11px] text-graphite">Categoria</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => toggleCategory(cat.slug)}
                className={`label-caps rounded-full border px-3.5 py-2 text-[11px] transition-colors ${
                  state.categories.includes(cat.slug)
                    ? "border-petrol bg-petrol text-ink"
                    : "border-paper/15 text-graphite hover:border-petrol hover:text-petrol"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {materials.length > 0 && (
        <div>
          <p className="label-caps mb-3 text-[11px] text-graphite">Material</p>
          <div className="flex flex-wrap gap-2">
            {materials.map((material) => (
              <button
                key={material}
                type="button"
                onClick={() => toggleMaterial(material)}
                className={`label-caps rounded-full border px-3.5 py-2 text-[11px] transition-colors ${
                  state.materials.includes(material)
                    ? "border-petrol bg-petrol text-ink"
                    : "border-paper/15 text-graphite hover:border-petrol hover:text-petrol"
                }`}
              >
                {material}
              </button>
            ))}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div>
          <p className="label-caps mb-3 text-[11px] text-graphite">Cor</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => toggleColor(color)}
                aria-pressed={state.colors.includes(color)}
                className={`label-caps rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                  state.colors.includes(color)
                    ? "border-petrol bg-petrol text-ink"
                    : "border-paper/15 text-graphite hover:border-petrol hover:text-petrol"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="label-caps mb-3 text-[11px] text-graphite">Preço</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Mín"
            aria-label={`Preço mínimo (ex: ${priceBounds.min})`}
            value={state.minPrice ?? ""}
            onChange={(e) => onChange({ ...state, minPrice: e.target.value === "" ? null : Number(e.target.value) })}
            className="w-full min-w-0 border border-paper/15 bg-mist px-2.5 py-2 text-base text-paper outline-none transition-colors placeholder:text-paper/40 focus:border-petrol sm:text-sm"
          />
          <span className="shrink-0 text-xs text-graphite">até</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Máx"
            aria-label={`Preço máximo (ex: ${priceBounds.max})`}
            value={state.maxPrice ?? ""}
            onChange={(e) => onChange({ ...state, maxPrice: e.target.value === "" ? null : Number(e.target.value) })}
            className="w-full min-w-0 border border-paper/15 bg-mist px-2.5 py-2 text-base text-paper outline-none transition-colors placeholder:text-paper/40 focus:border-petrol sm:text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...state, onlyNew: !state.onlyNew })}
          className={`label-caps border px-3.5 py-2 text-[11px] transition-colors ${
            state.onlyNew ? "border-petrol bg-petrol text-ink" : "border-paper/15 text-graphite hover:border-petrol"
          }`}
        >
          Novidades
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...state, onlyBestSellers: !state.onlyBestSellers })}
          className={`label-caps border px-3.5 py-2 text-[11px] transition-colors ${
            state.onlyBestSellers ? "border-petrol bg-petrol text-ink" : "border-paper/15 text-graphite hover:border-petrol"
          }`}
        >
          Mais vendidos
        </button>
      </div>
    </div>
  );
}
