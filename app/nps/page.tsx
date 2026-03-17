"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"

function NPSContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const urlScore = searchParams.get("score")

  const [score, setScore] = useState<number | null>(
    urlScore !== null ? parseInt(urlScore, 10) : null
  )
  const [comment, setComment] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const submit = useCallback(
    async (s: number, c: string) => {
      if (!token || submitting) return
      setSubmitting(true)
      setError("")
      try {
        const res = await fetch("/api/nps/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: token, score: s, comment: c }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Failed to submit")
        }
        setSubmitted(true)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setSubmitting(false)
      }
    },
    [token, submitting]
  )

  // Auto-submit if score is in URL
  useEffect(() => {
    if (urlScore !== null && token) {
      const parsed = parseInt(urlScore, 10)
      if (parsed >= 0 && parsed <= 10) {
        submit(parsed, "")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Thank you for your feedback!</h1>
          <p className="mt-2 text-gray-400">
            Your response helps us improve XRoof for everyone.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            X<span className="text-blue-500">Roof</span>
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            How likely are you to recommend XRoof? (0-10)
          </p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          {/* Score buttons */}
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                onClick={() => setScore(i)}
                className={`flex h-11 w-11 items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
                  score === i
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500 hover:text-white"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>Not likely</span>
            <span>Very likely</span>
          </div>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any additional feedback? (optional)"
            rows={3}
            className="mt-5 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />

          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}

          <button
            onClick={() => score !== null && submit(score, comment)}
            disabled={score === null || submitting}
            className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NPSPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <NPSContent />
    </Suspense>
  )
}
