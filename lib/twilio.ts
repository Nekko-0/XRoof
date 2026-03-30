export async function sendSMS(to: string, body: string) {
  if (process.env.TWILIO_ENABLED === "false") {
    console.info("Twilio disabled (TWILIO_ENABLED=false) — skipping SMS")
    return null
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !from) {
    console.warn("Twilio not configured — skipping SMS")
    return null
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  })

  if (!res.ok) {
    console.error("Twilio SMS failed:", await res.text())
    return null
  }

  return res.json()
}
