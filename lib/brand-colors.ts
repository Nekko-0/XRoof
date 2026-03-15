/**
 * Derive color variants from a single hex brand color.
 * Avoids needing multiple color columns in the DB.
 */

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "")
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")
}

/** Darken a hex color by a percentage (0-100). Good for headers/dark backgrounds. */
export function darkenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex)
  const f = 1 - percent / 100
  return rgbToHex(r * f, g * f, b * f)
}

/** Lighten a hex color by a percentage (0-100). Good for light backgrounds. */
export function lightenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex)
  const f = percent / 100
  return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f)
}

/** Returns rgba() string for use in inline styles. */
export function colorWithOpacity(hex: string, opacity: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${opacity})`
}
