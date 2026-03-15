"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

type ToastType = "success" | "error" | "info"

type Toast = {
  id: number
  message: string
  type: ToastType
}

type ToastContextType = {
  toasts: Toast[]
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  success: () => {},
  error: () => {},
  info: () => {},
  dismiss: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const success = useCallback((msg: string) => addToast(msg, "success"), [addToast])
  const error = useCallback((msg: string) => addToast(msg, "error"), [addToast])
  const info = useCallback((msg: string) => addToast(msg, "info"), [addToast])
  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, success, error, info, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}
