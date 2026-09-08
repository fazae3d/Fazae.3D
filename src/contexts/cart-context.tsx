"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useProductSnapshot } from "@/hooks/use-product-snapshot";
import { computeCouponDiscount, type CouponType } from "@/lib/coupons";
import { createLocalStore } from "@/lib/local-store";
import { round2 } from "@/lib/money";
import type { CartLine, Product } from "@/lib/types";

const cartStore = createLocalStore<CartLine[]>("flx-cart", []);

export type AppliedCoupon = { code: string; type: CouponType; value: number };
const couponStore = createLocalStore<AppliedCoupon | null>("flx-coupon", null);

type CartContextValue = {
  lines: CartLine[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addLine: (line: CartLine) => void;
  removeLine: (productSlug: string, material: string, color: string) => void;
  updateQuantity: (productSlug: string, material: string, color: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  coupon: AppliedCoupon | null;
  applyCoupon: (coupon: AppliedCoupon) => void;
  removeCoupon: () => void;
  discount: number;
  freeShippingFromCoupon: boolean;
  /** Resolves a cart line's product against the live catalog snapshot — never a frozen client-bundled copy. */
  getCartProduct: (slug: string) => Product | undefined;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const rawLines = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );
  const coupon = useSyncExternalStore(
    couponStore.subscribe,
    couponStore.getSnapshot,
    couponStore.getServerSnapshot,
  );
  const [isOpen, setIsOpen] = useState(false);
  const { loaded, getProduct, refresh } = useProductSnapshot();

  // Defensive: a line whose product no longer resolves (discontinued demo
  // item), or whose price is unset ("sob consulta" — a sob_encomenda piece
  // without a fixed price shouldn't reach checkout math), is dropped from
  // every view rather than rendered broken. Skipped until the snapshot
  // loads once, so the cart doesn't flash empty first.
  const lines = loaded
    ? rawLines.filter((l) => getProduct(l.productSlug)?.price !== undefined)
    : rawLines;

  const addLine = (line: CartLine) => {
    cartStore.setValue((prev) => {
      const existing = prev.find(
        (l) => l.productSlug === line.productSlug && l.material === line.material && l.color === line.color,
      );
      if (existing) {
        return prev.map((l) =>
          l === existing ? { ...l, quantity: l.quantity + line.quantity } : l,
        );
      }
      return [...prev, line];
    });
    setIsOpen(true);
  };

  const removeLine = (productSlug: string, material: string, color: string) => {
    cartStore.setValue((prev) =>
      prev.filter((l) => !(l.productSlug === productSlug && l.material === material && l.color === color)),
    );
  };

  const updateQuantity = (productSlug: string, material: string, color: string, quantity: number) => {
    cartStore.setValue((prev) =>
      prev.map((l) =>
        l.productSlug === productSlug && l.material === material && l.color === color
          ? { ...l, quantity: Math.max(1, quantity) }
          : l,
      ),
    );
  };

  const clearCart = () => {
    cartStore.setValue([]);
    couponStore.setValue(null);
  };

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = round2(
    lines.reduce((sum, l) => {
      const product = getProduct(l.productSlug);
      return sum + (product?.price !== undefined ? product.price * l.quantity : 0);
    }, 0),
  );

  const freeShippingFromCoupon = coupon?.type === "frete-gratis";
  const discount = coupon && !freeShippingFromCoupon ? computeCouponDiscount(subtotal, coupon.type, coupon.value) : 0;

  const value = useMemo(
    () => ({
      lines,
      isOpen,
      openCart: () => {
        // The cart is opened far less often than it's read from, so this
        // is where a refetch is cheap and actually matters — the user is
        // about to look at totals.
        refresh();
        setIsOpen(true);
      },
      closeCart: () => setIsOpen(false),
      addLine,
      removeLine,
      updateQuantity,
      clearCart,
      itemCount,
      subtotal,
      coupon,
      applyCoupon: (next: AppliedCoupon) => couponStore.setValue(next),
      removeCoupon: () => couponStore.setValue(null),
      discount,
      freeShippingFromCoupon,
      getCartProduct: getProduct,
    }),
    [lines, isOpen, itemCount, subtotal, coupon, discount, freeShippingFromCoupon, getProduct, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
