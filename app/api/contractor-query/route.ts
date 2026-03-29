import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

/**
 * General-purpose contractor data query route.
 * Bypasses RLS by using service_role, but enforces contractor ownership.
 *
 * Query params:
 *   table    – table name (must be in allowlist)
 *   select   – Supabase select string (default: "*")
 *   eq       – column=value pairs (repeatable), e.g. eq=status.sent
 *   neq      – column!=value, e.g. neq=status.New
 *   in       – column=val1,val2, e.g. in=job_id.uuid1,uuid2
 *   ini      – column=val1,val2 for .in() with quoted values, e.g. ini=status.sent,paid
 *   gte      – column>=value
 *   lte      – column<=value
 *   order    – column.asc or column.desc
 *   limit    – max rows
 *   single   – "true" to return single row
 *   count    – "exact" for count-only query
 *   head     – "true" for head-only (count) query
 *   owner_col – column name for ownership filter (default: "contractor_id")
 */

const ALLOWED_TABLES = new Set([
  "jobs", "followups", "invoices", "contracts", "reports",
  "scheduled_automations", "profiles", "automations",
  "customers", "work_orders", "job_costs", "job_photos",
  "portal_messages", "material_selections", "subscriptions",
  "expenses", "subcontractors", "appointments", "time_entries",
  "email_templates", "reminder_templates", "satisfaction_surveys",
  "customer_documents", "team_members", "landing_pages",
  "report_templates", "job_templates", "push_subscriptions",
  "sms_messages",
])

// Tables where ownership is by "id" or "user_id" instead of "contractor_id"
const OWNER_COL_MAP: Record<string, string> = {
  profiles: "id",
  subscriptions: "user_id",
  push_subscriptions: "user_id",
  followups: "user_id",
  team_members: "account_id",
}

// Tables owned via job_id → jobs.contractor_id (no direct contractor_id column).
// Ownership is enforced by verifying the job_ids belong to the user.
const JOB_OWNED_TABLES = new Set([
  "contracts", "invoices", "reports", "job_costs", "job_photos",
  "portal_messages", "material_selections", "job_subcontractors",
  "document_events",
])

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = auth

  const url = new URL(req.url)
  const table = url.searchParams.get("table")
  if (!table || !ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const selectStr = url.searchParams.get("select") || "*"
  const isCount = url.searchParams.get("count") === "exact"
  const isHead = url.searchParams.get("head") === "true"

  // Build query
  let query = supabase.from(table).select(selectStr, {
    count: isCount ? "exact" : undefined,
    head: isHead,
  } as any)

  // Apply ownership filter
  // For job-owned tables, verify job ownership instead of direct contractor_id
  if (JOB_OWNED_TABLES.has(table)) {
    // Get this contractor's job IDs for ownership verification
    const { data: ownedJobs } = await supabase
      .from("jobs")
      .select("id")
      .eq("contractor_id", userId)
    const ownedJobIds = (ownedJobs || []).map((j: any) => j.id)

    // If caller provided job_id filter via "in", validate they own those jobs
    const inParam = url.searchParams.get("in")
    if (inParam?.startsWith("job_id.")) {
      const requestedIds = inParam.slice(7).split(",")
      const validIds = requestedIds.filter(id => ownedJobIds.includes(id))
      if (validIds.length === 0) {
        return NextResponse.json([])
      }
      query = query.in("job_id", validIds)
    } else {
      // No specific job_id filter — return all for owned jobs
      if (ownedJobIds.length === 0) {
        return NextResponse.json([])
      }
      query = query.in("job_id", ownedJobIds)
    }
  } else {
    const ownerCol = OWNER_COL_MAP[table] || "contractor_id"
    query = query.eq(ownerCol, userId)
  }

  // Apply filters
  for (const [key, val] of url.searchParams.entries()) {
    if (key === "eq" && val.includes(".")) {
      const [col, ...rest] = val.split(".")
      query = query.eq(col, rest.join("."))
    }
    if (key === "neq" && val.includes(".")) {
      const [col, ...rest] = val.split(".")
      query = query.neq(col, rest.join("."))
    }
    if (key === "gte" && val.includes(".")) {
      const [col, ...rest] = val.split(".")
      query = query.gte(col, rest.join("."))
    }
    if (key === "lte" && val.includes(".")) {
      const [col, ...rest] = val.split(".")
      query = query.lte(col, rest.join("."))
    }
    if (key === "in" && val.includes(".")) {
      const [col, ...rest] = val.split(".")
      // Skip if already handled by job-owned ownership check
      if (col === "job_id" && JOB_OWNED_TABLES.has(table)) continue
      const values = rest.join(".").split(",")
      query = query.in(col, values)
    }
    if (key === "ini" && val.includes(".")) {
      const [col, ...rest] = val.split(".")
      const values = rest.join(".").split(",")
      query = query.in(col, values)
    }
    if (key === "not_in" && val.includes(".")) {
      const [col, ...rest] = val.split(".")
      query = query.not(col, "in", `(${rest.join(".")})`)
    }
  }

  // Order
  const order = url.searchParams.get("order")
  if (order) {
    const [col, dir] = order.split(".")
    query = query.order(col, { ascending: dir !== "desc" })
  }

  // Limit
  const limit = url.searchParams.get("limit")
  if (limit) query = query.limit(parseInt(limit, 10))

  // Single
  if (url.searchParams.get("single") === "true") {
    const { data, error } = await query.maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (isHead || isCount) {
    return NextResponse.json({ count })
  }

  return NextResponse.json(data)
}
