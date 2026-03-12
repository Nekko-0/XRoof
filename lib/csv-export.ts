export function exportCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (val: string | number | null | undefined) => {
    if (val == null) return ""
    const str = String(val)
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ]

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// QuickBooks-compatible invoice export
export function exportQuickBooksCSV(invoices: { date: string; number: string; customer: string; amount: number; status: string }[]) {
  exportCSV(
    "xroof-invoices-quickbooks",
    ["Date", "Invoice Number", "Customer", "Amount", "Status"],
    invoices.map((inv) => [inv.date, inv.number, inv.customer, inv.amount, inv.status])
  )
}
