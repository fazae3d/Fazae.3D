"use client";

import { createContext, useContext, type ReactNode } from "react";
import { CATEGORIES } from "@/lib/categories";

export type MenuCategory = { slug: string; label: string };

const MenuCategoriesContext = createContext<MenuCategory[]>(CATEGORIES.map((c) => ({ slug: c.slug, label: c.label })));

/** Categorias do menu vindas do banco (o layout lê no servidor), para uma categoria criada no painel aparecer sozinha. */
export function MenuCategoriesProvider({ categories, children }: { categories: MenuCategory[]; children: ReactNode }) {
  return <MenuCategoriesContext.Provider value={categories}>{children}</MenuCategoriesContext.Provider>;
}

export function useMenuCategories() {
  return useContext(MenuCategoriesContext);
}
