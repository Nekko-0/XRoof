import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

// POST — send (or resend) invite email for a team member
export async function POST(req: Request) {
  const { team_member_id } = await req.json()

  if (!team_member_id) {
    return NextResponse.json({ error: "Missing team_member_id" }, { status: 400 })
  }

  // Fetch the team member
  const { data: member, error: memberErr } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", team_member_id)
    .single()

  if (memberErr || !member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 })
  }

  // Ensure there's an invite token
  let token = member.invite_token
  if (!token) {
    const newToken = crypto.randomUUID()
    await supabase.from("team_members").update({ invite_token: newToken }).eq("id", team_member_id)
    token = newToken
  }

  // Get company name from account owner's profile
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("company_name, username")
    .eq("id", member.account_id)
    .single()

  const companyName = ownerProfile?.company_name || ownerProfile?.username || "Your team"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const joinUrl = `${appUrl}/auth/join?token=${token}`

  const roleLabel = member.role === "admin" ? "Admin" : member.role === "sales" ? "Sales" : "Viewer"

  // Send email via Resend
  try {
    await resend.emails.send({
      from: `${companyName} via XRoof <contracts@xroof.io>`,
      to: member.invited_email,
      subject: `You've been invited to join ${companyName} on XRoof`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 0;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: #16a34a; color: white; font-size: 24px; font-weight: bold; padding: 12px 20px; border-radius: 12px;">XRoof</div>
          </div>
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #111;">You're invited!</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            <strong>${companyName}</strong> has invited you to join their team on XRoof as a <strong>${roleLabel}</strong>.
          </p>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            Click the button below to create your account and get started.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${joinUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none;">
              Accept Invite
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you didn't expect this invite, you can safely ignore this email.
          </p>
        </div>
      `,
    })
  } catch (emailErr: any) {
    console.error("Failed to send invite email:", emailErr)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
