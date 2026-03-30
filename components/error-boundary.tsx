"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card p-8">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-600" />
            <p className="mt-2 text-sm font-medium text-foreground">Something went wrong</p>
            <p className="mt-1 text-xs text-muted-foreground">This section failed to load.</p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="mt-3 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
