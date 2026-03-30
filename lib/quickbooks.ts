const QB_BASE_URL = "https://quickbooks.api.intuit.com/v3"
const QB_SANDBOX_URL = "https://sandbox-quickbooks.api.intuit.com/v3"
const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2"
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"

const isProduction = process.env.NODE_ENV === "production"
const baseApiUrl = isProduction ? QB_BASE_URL : QB_SANDBOX_URL

function getClientId() {
  return process.env.QUICKBOOKS_CLIENT_ID || ""
}
function getClientSecret() {
  return process.env.QUICKBOOKS_CLIENT_SECRET || ""
}
function getRedirectUri() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `${appUrl}/api/quickbooks/auth`
}

// Generate OAuth URL for connecting QuickBooks
export function getQuickBooksAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state: userId,
  })
  return `${QB_AUTH_URL}?${params.toString()}`
}

// Exchange authorization code for tokens
export async function exchangeQBCodeForTokens(code: string) {
  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`QB token exchange failed: ${err}`)
  }

  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
  }>
}

// Refresh an expired access token
export async function refreshQBTokens(refreshToken: string) {
  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`QB token refresh failed: ${err}`)
  }

  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }>
}

// Authenticated QB API request with auto-refresh
interface QBClient {
  accessToken: string
  refreshToken: string
  realmId: string
  contractorId: string
}

export async function getQBClient(
  contractorId: string,
  supabase: ReturnType<typeof import("@/lib/api-auth").getServiceSupabase>
): Promise<QBClient | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("quickbooks_access_token, quickbooks_refresh_token, quickbooks_realm_id, quickbooks_connected")
    .eq("id", contractorId)
    .single()

  if (!profile?.quickbooks_connected || !profile.quickbooks_refresh_token || !profile.quickbooks_realm_id) {
    return null
  }

  // Always refresh token to ensure it's valid (tokens expire in 1 hour)
  try {
    const tokens = await refreshQBTokens(profile.quickbooks_refresh_token)

    // Save new tokens
    await supabase
      .from("profiles")
      .update({
        quickbooks_access_token: tokens.access_token,
        quickbooks_refresh_token: tokens.refresh_token,
      })
      .eq("id", contractorId)

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      realmId: profile.quickbooks_realm_id,
      contractorId,
    }
  } catch {
    // If refresh fails, mark as disconnected
    await supabase
      .from("profiles")
      .update({ quickbooks_connected: false })
      .eq("id", contractorId)
    return null
  }
}

async function qbRequest(client: QBClient, method: string, endpoint: string, body?: unknown) {
  const url = `${baseApiUrl}/company/${client.realmId}/${endpoint}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${client.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`QB API error (${res.status}): ${err}`)
  }

  return res.json()
}

// Find or create a customer in QuickBooks
export async function syncCustomerToQB(
  client: QBClient,
  customer: { name: string; email?: string; phone?: string; address?: string }
) {
  // Search for existing customer by name
  const query = encodeURIComponent(`DisplayName = '${customer.name.replace(/'/g, "\\'")}'`)
  const searchRes = await qbRequest(client, "GET", `query?query=select * from Customer where ${query}`)

  if (searchRes.QueryResponse?.Customer?.length > 0) {
    return searchRes.QueryResponse.Customer[0]
  }

  // Create new customer
  const newCustomer: Record<string, unknown> = {
    DisplayName: customer.name,
  }
  if (customer.email) {
    newCustomer.PrimaryEmailAddr = { Address: customer.email }
  }
  if (customer.phone) {
    newCustomer.PrimaryPhone = { FreeFormNumber: customer.phone }
  }
  if (customer.address) {
    newCustomer.BillAddr = { Line1: customer.address }
  }

  const createRes = await qbRequest(client, "POST", "customer", newCustomer)
  return createRes.Customer
}

// Create an invoice in QuickBooks
export async function syncInvoiceToQB(
  client: QBClient,
  invoice: {
    invoice_number: string
    amount: number // cents
    line_items?: Array<{ description: string; quantity: number; unit_price: number }>
    customer_name: string
  },
  customerRef: { Id: string; DisplayName: string }
) {
  // Build line items
  const lines = invoice.line_items?.length
    ? invoice.line_items.map((item, i) => ({
        LineNum: i + 1,
        Amount: (item.quantity * item.unit_price) / 100,
        DetailType: "SalesItemLineDetail",
        Description: item.description,
        SalesItemLineDetail: {
          UnitPrice: item.unit_price / 100,
          Qty: item.quantity,
        },
      }))
    : [
        {
          LineNum: 1,
          Amount: invoice.amount / 100,
          DetailType: "SalesItemLineDetail",
          Description: `Invoice ${invoice.invoice_number}`,
          SalesItemLineDetail: {
            UnitPrice: invoice.amount / 100,
            Qty: 1,
          },
        },
      ]

  const qbInvoice = {
    CustomerRef: { value: customerRef.Id, name: customerRef.DisplayName },
    Line: lines,
    DocNumber: invoice.invoice_number,
  }

  const res = await qbRequest(client, "POST", "invoice", qbInvoice)
  return res.Invoice
}

// Record a payment in QuickBooks
export async function syncPaymentToQB(
  client: QBClient,
  amount: number, // cents
  customerRef: { Id: string },
  invoiceRef?: { Id: string }
) {
  const payment: Record<string, unknown> = {
    CustomerRef: { value: customerRef.Id },
    TotalAmt: amount / 100,
  }

  if (invoiceRef) {
    payment.Line = [
      {
        Amount: amount / 100,
        LinkedTxn: [{ TxnId: invoiceRef.Id, TxnType: "Invoice" }],
      },
    ]
  }

  const res = await qbRequest(client, "POST", "payment", payment)
  return res.Payment
}
