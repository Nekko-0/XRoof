import { NextResponse } from "next/server"
import { requireAuth, getServiceSupabase } from "@/lib/api-auth"

export async function GET(req: Request) {
  const user = await requireAuth(req)
  if (user instanceof NextResponse) return user

  try {
    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from("job_templates")
      .select("id, name, job_type, description, default_budget, material_notes, checklist, created_at")
      .eq("contractor_id", user.userId)
      .order("name")
      .limit(500)

    if (error) {
      console.error("[XRoof] job-templates GET query error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }

    return NextResponse.json({ templates: data || [] })
  } catch (err) {
    console.error("[XRoof] job-templates GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await requireAuth(req)
  if (user instanceof NextResponse) return user

  try {
    const body = await req.json()
    const { name, job_type, description, default_budget, material_notes, checklist } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from("job_templates")
      .insert({
        contractor_id: user.userId,
        name: name.trim(),
        job_type: job_type || null,
        description: description || null,
        default_budget: default_budget || null,
        material_notes: material_notes || null,
        checklist: checklist || [],
      })
      .select()
      .single()

    if (error) {
      console.error("[XRoof] job-templates POST error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }

    return NextResponse.json({ template: data })
  } catch (err) {
    console.error("[XRoof] job-templates POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const user = await requireAuth(req)
  if (user instanceof NextResponse) return user

  try {
    const body = await req.json()
    const { id, name, job_type, description, default_budget, material_notes, checklist } = body

    if (!id) return NextResponse.json({ error: "Missing template id" }, { status: 400 })

    const supabase = getServiceSupabase()

    // Verify ownership
    const { data: existing } = await supabase
      .from("job_templates")
      .select("id")
      .eq("id", id)
      .eq("contractor_id", user.userId)
      .single()

    if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 })

    const { error } = await supabase
      .from("job_templates")
      .update({
        name: name?.trim() || undefined,
        job_type,
        description,
        default_budget,
        material_notes,
        checklist,
      })
      .eq("id", id)

    if (error) {
      console.error("[XRoof] job-templates PUT error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }

    return NextResponse.json({ updated: true })
  } catch (err) {
    console.error("[XRoof] job-templates PUT error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const user = await requireAuth(req)
  if (user instanceof NextResponse) return user

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) return NextResponse.json({ error: "Missing template id" }, { status: 400 })

    const supabase = getServiceSupabase()

    const { error } = await supabase
      .from("job_templates")
      .delete()
      .eq("id", id)
      .eq("contractor_id", user.userId)

    if (error) {
      console.error("[XRoof] job-templates DELETE error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error("[XRoof] job-templates DELETE error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
