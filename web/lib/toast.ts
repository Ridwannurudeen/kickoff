import { create } from "zustand";

export type ToastKind = "success" | "error" | "info" | "pending";

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  /** explorer URL for the tx, if any */
  href?: string;
  /** auto-dismiss ms; 0 = sticky */
  ttl: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => number;
  dismiss: (id: number) => void;
  update: (id: number, patch: Partial<Omit<Toast, "id">>) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    if (t.ttl > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
      }, t.ttl);
    }
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  update: (id, patch) =>
    set((s) => ({
      toasts: s.toasts.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    })),
}));
