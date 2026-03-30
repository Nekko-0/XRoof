import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/api-auth"
import { sendNotificationBundle } from "@/lib/notify"
import { checkOrigin } from "@/lib/csrf"

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

    if (error) {
      console.error("[XRoof] portal-documents GET error:", error)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }
    return NextResponse.json(data || [])
  } catch (err) {
    console.error("[XRoof] portal documents GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const csrf = checkOrigin(req)
  if (csrf) return csrf

  try {
    const formData = await req.formData()
    const jobId = formData.get("job_id") as string
    const category = formData.get("category") as string
    const file = formData.get("file") as File

    if (!jobId || !category || !file) {
      return NextResponse.json({ error: "Missing job_id, category, or file" }, { status: 400 })
    }

    // File size validation (50MB max)
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 413 })
    }

    // File type validation
    const ALLOWED_TYPES = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed. Accepted: PDF, JPEG, PNG, WebP, DOCX, XLSX." }, { status: 415 })
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
      console.error("[XRoof] portal-documents upload error:", uploadError)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
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
      console.error("[XRoof] portal-documents insert error:", insertError)
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
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
