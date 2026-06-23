import { useSyncExternalStore } from "react";

export type ToastTone = "success" | "error" | "info";
export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function emit() {
  listeners.forEach((l) => l());
}

export function pushToast(message: string, tone: ToastTone = "info") {
  const id = nextId++;
  toasts = [...toasts, { id, message, tone }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3800);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  );
}
