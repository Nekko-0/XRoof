const translations: Record<string, Record<string, string>> = {
  "portal.tab.overview": { en: "Overview", es: "Resumen" },
  "portal.tab.documents": { en: "Documents", es: "Documentos" },
  "portal.tab.activity": { en: "Activity", es: "Actividad" },
  "portal.tab.messages": { en: "Messages", es: "Mensajes" },
  "portal.tab.materials": { en: "Materials", es: "Materiales" },
  "portal.greeting": { en: "Here's the latest on your roofing project", es: "Aqui esta lo ultimo sobre su proyecto de techo" },
  "portal.status": { en: "Project Status", es: "Estado del Proyecto" },
  "portal.details": { en: "Project Details", es: "Detalles del Proyecto" },
  "portal.contractor": { en: "Your Contractor", es: "Su Contratista" },
  "portal.estimate": { en: "Your Estimate", es: "Su Presupuesto" },
  "portal.photos": { en: "Project Photos", es: "Fotos del Proyecto" },
  "portal.action_required": { en: "Action Required", es: "Accion Requerida" },
  "portal.upcoming": { en: "Upcoming", es: "Proximo" },
  "portal.timeline": { en: "Project Timeline", es: "Cronologia del Proyecto" },
  "portal.messages": { en: "Messages", es: "Mensajes" },
  "portal.materials.title": { en: "Material Options", es: "Opciones de Materiales" },
  "portal.materials.select": { en: "Select", es: "Seleccionar" },
  "portal.materials.selected": { en: "Selected", es: "Seleccionado" },
  "portal.materials.empty": { en: "No material options available yet.", es: "Aun no hay opciones de materiales." },
  "portal.documents.upload": { en: "Upload Document", es: "Subir Documento" },
  "portal.documents.your_uploads": { en: "Your Uploaded Documents", es: "Sus Documentos Subidos" },
  "portal.documents.category": { en: "Category", es: "Categoria" },
  "portal.documents.estimates": { en: "Estimates", es: "Presupuestos" },
  "portal.documents.contracts": { en: "Contracts", es: "Contratos" },
  "portal.documents.invoices": { en: "Invoices", es: "Facturas" },
  "portal.before_after": { en: "Before & After", es: "Antes y Despues" },
  "portal.need_visit": { en: "Need a Site Visit?", es: "Necesita una Visita?" },
  "portal.call_us": { en: "Call Us", es: "Llamenos" },
  "portal.review_cta": { en: "How did we do?", es: "Como lo hicimos?" },
}

export function t(key: string, lang?: string): string {
  const entry = translations[key]
  if (!entry) return key
  const locale = lang === "es" ? "es" : "en"
  return entry[locale] || entry["en"] || key
}
