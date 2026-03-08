export type ScopeItem = {
  label: string
  checked: boolean
}

export type ContractTerms = {
  scope_items: ScopeItem[]
  scope_custom_text: string
  work_start_date: string
  payment_terms_text: string
  scheduling_text: string
  hidden_damage_text: string
  subcontractors_text: string
  warranty_text: string
  warranty_years: number
  governing_state: string
}

export const DEFAULT_SCOPE_ITEMS: ScopeItem[] = [
  { label: "Removal of existing roofing materials", checked: true },
  { label: "Inspection of roof decking and structural components", checked: true },
  { label: "Repair or replacement of damaged decking (if applicable)", checked: true },
  { label: "Installation of underlayment and ice/water shield", checked: true },
  { label: "Installation of new roofing system (shingles/metal/flat)", checked: true },
  { label: "Installation of flashing, drip edge, and ridge vents", checked: true },
  { label: "Cleanup and removal of all debris from job site", checked: true },
  { label: "Final walkthrough with customer", checked: true },
]

export const DEFAULT_TERMS: ContractTerms = {
  scope_items: DEFAULT_SCOPE_ITEMS,
  scope_custom_text: "",
  work_start_date: "",
  payment_terms_text:
    "Payments may be made by check, cash, or bank transfer. Contractor may pause work if payments are not made according to this agreement. Failure to pay within 30 days of the due date may result in a late fee of 1.5% per month on the outstanding balance. If collection efforts become necessary, the Customer agrees to pay all reasonable attorney fees and collection costs.",
  scheduling_text:
    "Job begins on the date agreed upon by Contractor and Homeowner as specified in this contract. The Contractor shall not be held liable for delays caused by inclement weather, material shortages, permit delays, or other circumstances beyond the Contractor's reasonable control. The Contractor will communicate any anticipated delays to the Customer promptly.",
  hidden_damage_text:
    "If hidden damage to the roof decking, structure, or related components is discovered during the course of work, the Contractor will notify the Customer immediately. A revised scope and cost estimate will be provided before additional work proceeds. Any changes must be approved in writing by the Customer.",
  subcontractors_text:
    "The Contractor reserves the right to employ subcontractors to perform portions of the work described herein. Subcontractors will be fully responsible for the quality and timeliness of all work performed.",
  warranty_text:
    "The Contractor warrants all workmanship for the period specified below from the date of completion. Manufacturer warranties on materials shall apply as provided by the manufacturer. This warranty does not cover damage caused by acts of nature, neglect, or unauthorized modifications. If work is subcontracted, the subcontractor shall be responsible for all warranty obligations related to their portion of the work.",
  warranty_years: 5,
  governing_state: "Wisconsin",
}
