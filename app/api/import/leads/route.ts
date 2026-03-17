import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function POST(req: Request) {
  const user = await requireAuth(req)
  if (user instanceof NextResponse) return user

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split("\n").filter((l) => l.trim())
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 })
    }

    // Parse header
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""))

    // Map common column names to our fields
    const fieldMap: Record<string, string[]> = {
      customer_name: ["customer_name", "customer", "name", "client", "client_name", "homeowner", "contact"],
      address: ["address", "property_address", "street", "location", "property"],
      phone: ["phone", "phone_number", "cell", "mobile", "telephone"],
      email: ["email", "customer_email", "client_email", "e-mail"],
      job_type: ["job_type", "type", "service", "service_type", "work_type"],
      budget: ["budget", "amount", "value", "estimate", "price", "cost"],
      source_detail: ["source", "source_detail", "lead_source", "referral_source", "how_heard"],
      notes: ["notes", "description", "comments", "details"],
    }

    function findColumnIndex(fieldAliases: string[]): number {
      for (const alias of fieldAliases) {
        const idx = header.indexOf(alias)
        if (idx !== -1) return idx
      }
      return -1
    }

    const colMap: Record<string, number> = {}
    for (const [field, aliases] of Object.entries(fieldMap)) {
      colMap[field] = findColumnIndex(aliases)
    }

    // Must have at least customer_name or address
    if (colMap.customer_name === -1 && colMap.address === -1) {
      return NextResponse.json({
        error: "CSV must have a 'customer_name' or 'address' column. Accepted headers: " +
          Object.values(fieldMap).flat().join(", "),
      }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    const jobs: any[] = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length === 0) continue

      const get = (field: string) => {
        const idx = colMap[field]
        return idx >= 0 && idx < values.length ? values[idx].trim() : ""
      }

      const customerName = get("customer_name")
      const address = get("address")

      if (!customerName && !address) {
        errors.push(`Row ${i + 1}: missing customer name and address, skipped`)
        continue
      }

      const budgetStr = get("budget").replace(/[$,]/g, "")
      const budget = budgetStr ? parseFloat(budgetStr) : null

      jobs.push({
        contractor_id: user.userId,
        customer_name: customerName || "Unknown",
        address: address || "",
        phone: get("phone"),
        email: get("email"),
        job_type: get("job_type") || "Full Roof Replacement",
        budget: budget && !isNaN(budget) ? budget : null,
        source_detail: get("source_detail") || "CSV Import",
        status: "new",
        description: get("notes"),
      })
    }

    if (jobs.length === 0) {
      return NextResponse.json({ error: "No valid rows found in CSV", errors }, { status: 400 })
    }

    // Insert in batches of 50
    let imported = 0
    for (let i = 0; i < jobs.length; i += 50) {
      const batch = jobs.slice(i, i + 50)
      const { error } = await supabase.from("jobs").insert(batch)
      if (error) {
        console.error("CSV import batch error:", error)
        errors.push(`Batch ${Math.floor(i / 50) + 1} failed: ${error.message}`)
      } else {
        imported += batch.length
      }
    }

    return NextResponse.json({
      imported,
      total: jobs.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${imported} lead${imported !== 1 ? "s" : ""}`,
    })
  } catch (err) {
    console.error("CSV import error:", err)
    return NextResponse.json({ error: "Failed to process CSV" }, { status: 500 })
  }
}

// Parse a CSV line handling quoted values with commas
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}
