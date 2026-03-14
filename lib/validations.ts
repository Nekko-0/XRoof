import { z } from "zod"

// Shared reusable fields
const phone = z.string().regex(/^\d{7,15}$/, "Invalid phone number").optional()
const email = z.string().email("Invalid email").max(254).optional()
const shortText = z.string().min(1, "Required").max(200)
const longText = z.string().max(5000).optional()

// Customer
export const CustomerCreateSchema = z.object({
  name: shortText,
  email,
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  notes: longText,
})

export const CustomerUpdateSchema = z.object({
  id: z.string().uuid(),
  name: shortText.optional(),
  email,
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  notes: longText,
}).passthrough()

// SMS
export const SMSSendSchema = z.object({
  phone: z.string().min(7).max(20),
  message: z.string().min(1, "Message required").max(1600),
  job_id: z.string().uuid().optional().nullable(),
})

// Work Orders
export const WorkOrderCreateSchema = z.object({
  job_id: z.string().uuid().optional().nullable(),
  contractor_id: z.string().uuid(),
  assigned_to: z.string().uuid().optional().nullable(),
  assigned_name: z.string().max(100).optional().nullable(),
  title: z.string().min(1, "Title required").max(200),
  description: z.string().max(2000).optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  due_date: z.string().max(30).optional().nullable(),
})

export const WorkOrderUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  assigned_name: z.string().max(100).optional().nullable(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  due_date: z.string().max(30).optional().nullable(),
}).passthrough()

// Lead capture (public endpoint)
export const LeadCaptureSchema = z.object({
  page_id: z.string().uuid().optional(),
  contractor_id: z.string().uuid(),
  name: shortText,
  phone: z.string().min(7).max(20),
  email: z.string().email().max(254).optional(),
  address: z.string().min(1, "Address required").max(300),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
})

// Contract signing (public endpoint)
export const ContractSignSchema = z.object({
  token: z.string().uuid(),
  signature_data_url: z.string().max(500000, "Signature too large"),
})

// Bookings (public endpoint)
export const BookingCreateSchema = z.object({
  contractor_id: z.string().uuid(),
  job_id: z.string().uuid().optional().nullable(),
  date: z.string().min(1, "Date required").max(20),
  time: z.string().min(1, "Time required").max(20),
  customer_name: z.string().min(1, "Name required").max(100),
  customer_email: z.string().email().max(254).optional(),
  customer_phone: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
})

// Landing pages
export const LandingPageCreateSchema = z.object({
  title: z.string().max(200).optional(),
  subtitle: z.string().max(500).optional(),
  cta_text: z.string().max(100).optional(),
  hero_image_url: z.string().url().max(2000).optional(),
  template: z.string().max(50).optional(),
  utm_source: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
})

export const LandingPageUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(200).optional(),
  subtitle: z.string().max(500).optional(),
  cta_text: z.string().max(100).optional(),
  hero_image_url: z.string().url().max(2000).optional().nullable(),
  slug: z.string().max(100).optional(),
  published: z.boolean().optional(),
  template: z.string().max(50).optional(),
  utm_source: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
})

// Invoices
export const InvoiceCreateSchema = z.object({
  job_id: z.string().uuid().optional().nullable(),
  customer_name: z.string().min(1, "Customer name required").max(100),
  customer_email: z.string().email().max(254).optional(),
  customer_phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  job_type: z.string().max(100).optional(),
  amount: z.number().positive("Amount must be positive").max(10000000),
  notes: z.string().max(5000).optional().nullable(),
  discount: z.number().min(0).max(10000000).optional(),
  payment_methods: z.array(z.string()).optional(),
  line_items: z.array(z.object({
    description: z.string().max(500),
    quantity: z.number().min(0),
    unit_price: z.number().min(0),
  })).optional(),
  hidden_fields: z.array(z.string()).optional(),
  scope: z.string().max(5000).optional(),
  extra_photo_urls: z.array(z.string().url()).optional(),
  logo_url: z.string().url().max(2000).optional().nullable(),
})

export const InvoiceUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
  amount: z.number().positive().max(10000000).optional(),
  notes: z.string().max(5000).optional(),
}).passthrough()

// Helper to validate and return typed data or error response
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(body)
  if (!result.success) {
    const messages = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")
    return { data: null, error: messages }
  }
  return { data: result.data, error: null }
}
