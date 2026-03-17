import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/api-auth"
import { sendNotificationBundle } from "@/lib/notify"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("job_id")

    if (!jobId) {
      return NextResponse.json({ error: "Missing job_id" }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from("customer_documents")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err) {
    console.error("[XRoof] portal documents GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const jobId = formData.get("job_id") as string
    const category = formData.get("category") as string
    const file = formData.get("file") as File

    if (!jobId || !category || !file) {
      return NextResponse.json({ error: "Missing job_id, category, or file" }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Verify job exists and get contractor info
    const { data: job } = await supabase
      .from("jobs")
      .select("id, contractor_id, customer_name")
      .eq("id", jobId)
      .single()

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Upload file to Supabase storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const timestamp = Date.now()
    const filePath = `${jobId}/${timestamp}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from("customer-documents")
      .upload(filePath, buffer, { contentType: file.type })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("customer-documents")
      .getPublicUrl(filePath)

    const fileUrl = urlData.publicUrl

    // Insert record into customer_documents
    const { data: doc, error: insertError } = await supabase
      .from("customer_documents")
      .insert({
        job_id: jobId,
        file_url: fileUrl,
        file_name: file.name,
        category,
      })
      .select("id, file_url, file_name, category")
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Notify contractor
    if (job.contractor_id) {
      sendNotificationBundle({
        userId: job.contractor_id,
        title: "Document uploaded",
        body: `${job.customer_name || "A customer"} uploaded a document (${category})`,
        type: "document_uploaded",
      }).catch((err) => console.error("[XRoof] document upload notification error:", err))
    }

    return NextResponse.json(doc)
  } catch (err) {
    console.error("[XRoof] portal documents POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
