"use client"

import { ToastProvider } from "@/lib/toast-context"
import { ToastContainer } from "@/components/toast"

export function ToastWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastContainer />
    </ToastProvider>
  )
}
