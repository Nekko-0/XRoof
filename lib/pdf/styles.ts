import { StyleSheet } from "@react-pdf/renderer"
import { hexToRgb, darkenColor, lightenColor } from "@/lib/brand-colors"

function toRgbStr(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgb(${r},${g},${b})`
}

export function createProposalStyles(primaryColor: string) {
  const dark = darkenColor(primaryColor, 20)
  const light = lightenColor(primaryColor, 90)
  const medium = lightenColor(primaryColor, 70)

  return StyleSheet.create({
    // --- Page ---
    page: {
      fontFamily: "Helvetica",
      fontSize: 10,
      color: "#333",
      paddingTop: 60,
      paddingBottom: 50,
      paddingHorizontal: 40,
    },
    coverPage: {
      fontFamily: "Helvetica",
      paddingHorizontal: 50,
      paddingVertical: 60,
      justifyContent: "center",
      alignItems: "center",
    },

    // --- Header / Footer ---
    header: {
      position: "absolute",
      top: 20,
      left: 40,
      right: 40,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: 8,
      borderBottomWidth: 2,
      borderBottomColor: toRgbStr(primaryColor),
    },
    headerLogo: {
      width: 28,
      height: 28,
      objectFit: "contain",
    },
    headerCompany: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: toRgbStr(dark),
    },
    headerPageNum: {
      fontSize: 8,
      color: "#999",
    },
    footer: {
      position: "absolute",
      bottom: 20,
      left: 40,
      right: 40,
      flexDirection: "row",
      justifyContent: "center",
      borderTopWidth: 1,
      borderTopColor: "#e5e5e5",
      paddingTop: 6,
    },
    footerText: {
      fontSize: 7,
      color: "#999",
    },

    // --- Cover Page ---
    coverLogo: {
      width: 80,
      height: 80,
      objectFit: "contain",
      marginBottom: 20,
    },
    coverCompany: {
      fontSize: 26,
      fontFamily: "Helvetica-Bold",
      color: toRgbStr(dark),
      marginBottom: 4,
    },
    coverTitle: {
      fontSize: 16,
      color: "#666",
      marginBottom: 40,
      letterSpacing: 2,
    },
    coverDivider: {
      width: 80,
      height: 3,
      backgroundColor: toRgbStr(primaryColor),
      marginBottom: 40,
    },
    coverInfoLabel: {
      fontSize: 8,
      color: "#999",
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 3,
    },
    coverInfoValue: {
      fontSize: 13,
      color: "#333",
      marginBottom: 16,
      fontFamily: "Helvetica-Bold",
    },
    coverDate: {
      fontSize: 10,
      color: "#888",
      marginTop: 30,
    },
    coverPreparedBy: {
      fontSize: 9,
      color: "#888",
      marginTop: 4,
    },
    coverTagline: {
      fontSize: 11,
      color: "#888",
      marginBottom: 20,
      fontStyle: "italic",
    },
    coverAccentBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 8,
      backgroundColor: toRgbStr(primaryColor),
    },
    coverAccentBarBottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 8,
      backgroundColor: toRgbStr(primaryColor),
    },

    // --- Sections ---
    sectionTitle: {
      fontSize: 14,
      fontFamily: "Helvetica-Bold",
      color: toRgbStr(dark),
      marginBottom: 10,
      paddingBottom: 4,
      borderBottomWidth: 2,
      borderBottomColor: toRgbStr(primaryColor),
    },
    sectionSubtitle: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: "#555",
      marginBottom: 6,
      marginTop: 12,
    },
    paragraph: {
      fontSize: 10,
      lineHeight: 1.6,
      color: "#444",
      marginBottom: 8,
    },

    // --- Info Grid (2 columns) ---
    infoRow: {
      flexDirection: "row",
      marginBottom: 6,
    },
    infoLabel: {
      width: 120,
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: "#666",
    },
    infoValue: {
      flex: 1,
      fontSize: 10,
      color: "#333",
    },

    // --- Tables ---
    table: {
      marginBottom: 12,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: toRgbStr(dark),
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    tableHeaderCell: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: "#ffffff",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e5e5e5",
    },
    tableRowAlt: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e5e5e5",
      backgroundColor: toRgbStr(light),
    },
    tableCell: {
      fontSize: 9,
      color: "#444",
    },
    tableCellBold: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: "#333",
    },
    tableTotalRow: {
      flexDirection: "row",
      paddingVertical: 8,
      paddingHorizontal: 8,
      backgroundColor: toRgbStr(medium),
      borderTopWidth: 2,
      borderTopColor: toRgbStr(primaryColor),
    },
    tableTotalLabel: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      color: toRgbStr(dark),
    },
    tableTotalValue: {
      fontSize: 12,
      fontFamily: "Helvetica-Bold",
      color: toRgbStr(dark),
    },

    // --- Photo Grid ---
    photoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    photoContainer: {
      width: "48%",
      marginBottom: 10,
    },
    photo: {
      width: "100%",
      height: 180,
      objectFit: "cover",
      borderRadius: 4,
    },
    photoCaption: {
      fontSize: 8,
      color: "#666",
      marginTop: 3,
      textAlign: "center",
    },

    // --- Pricing Tiers ---
    tierContainer: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 12,
    },
    tierCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: "#e5e5e5",
      borderRadius: 6,
      padding: 12,
    },
    tierCardPopular: {
      flex: 1,
      borderWidth: 2,
      borderColor: toRgbStr(primaryColor),
      borderRadius: 6,
      padding: 12,
      backgroundColor: toRgbStr(light),
    },
    tierName: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      color: "#333",
      marginBottom: 4,
    },
    tierDesc: {
      fontSize: 8,
      color: "#666",
      marginBottom: 8,
      lineHeight: 1.4,
    },
    tierPrice: {
      fontSize: 16,
      fontFamily: "Helvetica-Bold",
      color: toRgbStr(dark),
    },

    // --- Single Price ---
    priceBox: {
      backgroundColor: toRgbStr(light),
      borderWidth: 2,
      borderColor: toRgbStr(primaryColor),
      borderRadius: 8,
      padding: 20,
      alignItems: "center",
      marginBottom: 12,
    },
    priceLabel: {
      fontSize: 10,
      color: "#666",
      marginBottom: 4,
    },
    priceValue: {
      fontSize: 24,
      fontFamily: "Helvetica-Bold",
      color: toRgbStr(dark),
    },
    depositNote: {
      fontSize: 9,
      color: "#888",
      marginTop: 6,
    },

    // --- Measurements ---
    measurementGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    measurementCard: {
      width: "30%",
      backgroundColor: toRgbStr(light),
      borderRadius: 4,
      padding: 8,
      alignItems: "center",
    },
    measurementLabel: {
      fontSize: 7,
      color: "#888",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 2,
    },
    measurementValue: {
      fontSize: 12,
      fontFamily: "Helvetica-Bold",
      color: "#333",
    },

    // --- Terms ---
    termsBox: {
      backgroundColor: "#f9f9f9",
      borderRadius: 4,
      padding: 12,
      marginTop: 12,
    },
    termsText: {
      fontSize: 8,
      color: "#888",
      lineHeight: 1.5,
    },
  })
}
