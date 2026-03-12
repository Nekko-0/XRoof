import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { sendSMS } from "@/lib/twilio"
import { NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

function evaluateCondition(condition: { field: string; operator: string; value: string } | null | undefined, job: Record<string, any>): boolean {
  if (!condition || !condition.field || !condition.value) return true
  const jobValue = String(job[condition.field] || "").toLowerCase()
  const condValue = condition.value.toLowerCase()
  switch (condition.operator) {
    case "equals": return jobValue === condValue
    case "not_equals": return jobValue !== condValue
    case "contains": return jobValue.includes(condValue)
    case "greater_than": return parseFloat(jobValue) > parseFloat(condValue)
    case "less_than": return parseFloat(jobValue) < parseFloat(condValue)
    default: return true
  }
}

function replacePlaceholders(text: string, vars: Record<string, string>): string {
  return text
    .replace(/\{customer_name\}/g, vars.customer_name || "Customer")
    .replace(/\{address\}/g, vars.address || "")
    .replace(/\{company_name\}/g, vars.company_name || "")
    .replace(/\{phone\}/g, vars.phone || "")
    .replace(/\{estimate_link\}/g, vars.estimate_link || "")
    .replace(/\{contract_link\}/g, vars.contract_link || "")
    .replace(/\{invoice_link\}/g, vars.invoice_link || "")
    .replace(/\{portal_link\}/g, vars.portal_link || "")
}

// Runs every hour — executes due automation steps
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  // Find due automation steps
  const { data: dueItems } = await supabase
    .from("scheduled_automations")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(100)

  if (!dueItems || dueItems.length === 0) {
    return NextResponse.json({ message: "No due automations", sent: 0, failed: 0 })
  }

  let sent = 0
  let failed = 0

  for (const item of dueItems) {
    try {
      // Fetch job details
      const { data: job } = await supabase
        .from("jobs")
        .select("customer_name, customer_email, customer_phone, address, job_type, budget, status, source, zip_code")
        .eq("id", item.job_id)
        .single()

      if (!job) {
        await supabase.from("scheduled_automations")
          .update({ status: "failed", error: "Job not found" })
          .eq("id", item.id)
        failed++
        continue
      }

      // Check step condition from template
      if (item.template_id) {
        const { data: tmpl } = await supabase
          .from("followup_templates")
          .select("steps")
          .eq("id", item.template_id)
          .single()
        if (tmpl?.steps && Array.isArray(tmpl.steps)) {
          const stepDef = tmpl.steps[item.step_index]
          if (stepDef?.condition && !evaluateCondition(stepDef.condition, job)) {
            await supabase.from("scheduled_automations")
              .update({ status: "skipped", error: "Condition not met" })
              .eq("id", item.id)
            continue
          }
        }
      }

      // Fetch contractor details
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, company_name, phone")
        .eq("id", item.contractor_id)
        .single()

      // Fetch related documents for link placeholders
      const { data: report } = await supabase
        .from("reports")
        .select("share_token")
        .eq("job_id", item.job_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: contractDoc } = await supabase
        .from("contracts")
        .select("signing_token")
        .eq("job_id", item.job_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: invoiceDoc } = await supabase
        .from("invoices")
        .select("id")
        .eq("job_id", item.job_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const vars = {
        customer_name: job.customer_name || "Customer",
        address: job.address || "",
        company_name: profile?.company_name || "",
        phone: profile?.phone || "",
        estimate_link: report?.share_token ? `${appUrl}/estimate/${report.share_token}` : "",
        contract_link: contractDoc?.signing_token ? `${appUrl}/sign/${contractDoc.signing_token}` : "",
        invoice_link: invoiceDoc?.id ? `${appUrl}/pay/${invoiceDoc.id}` : "",
        portal_link: `${appUrl}/portal/${item.contractor_id}`,
      }

      const message = replacePlaceholders(item.message, vars)
      const subject = item.subject ? replacePlaceholders(item.subject, vars) : ""

      if (item.action_type === "email") {
        if (!job.customer_email) {
          await supabase.from("scheduled_automations")
            .update({ status: "failed", error: "No customer email" })
            .eq("id", item.id)
          failed++
          continue
        }

        await resend.emails.send({
          from: `${profile?.company_name || "XRoof"} via XRoof <noreply@xroof.io>`,
          to: job.customer_email,
          subject: subject || `Update from ${profile?.company_name || "your contractor"}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
              <p style="font-size:14px;margin:0 0 15px;">Hi ${job.customer_name || "there"},</p>
              <p style="font-size:13px;color:#333;white-space:pre-line;">${message}</p>
              <div style="border-top:1px solid #eee;padding-top:15px;margin-top:25px;">
                <p style="font-size:12px;color:#888;margin:0;">
                  ${profile?.company_name || ""}
                  ${profile?.phone ? ` | ${profile.phone}` : ""}
                </p>
                <p style="font-size:10px;color:#ccc;margin:5px 0 0;">Sent via XRoof</p>
              </div>
            </div>
          `,
        })
      } else if (item.action_type === "sms") {
        if (!job.customer_phone) {
          await supabase.from("scheduled_automations")
            .update({ status: "failed", error: "No customer phone" })
            .eq("id", item.id)
          failed++
          continue
        }

        await sendSMS(job.customer_phone, message)
      } else if (item.action_type === "reminder") {
        // Create internal followup reminder for the contractor
        await supabase.from("followups").insert({
          job_id: item.job_id,
          user_id: item.contractor_id,
          due_date: new Date().toISOString(),
          note: message,
          completed: false,
          automation_id: item.id,
        })
      } else if (item.action_type === "notification") {
        // In-app notification for the contractor
        await supabase.from("notifications").insert({
          user_id: item.contractor_id,
          type: "automation",
          title: subject || "Automation Alert",
          body: message,
          read: false,
        })
      }

      // Mark as sent
      await supabase.from("scheduled_automations")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", item.id)
      sent++
    } catch (err: any) {
      await supabase.from("scheduled_automations")
        .update({ status: "failed", error: err?.message || "Unknown error" })
        .eq("id", item.id)
      failed++
    }
  }

  return NextResponse.json({ message: `Processed ${sent + failed} automations`, sent, failed })
}
