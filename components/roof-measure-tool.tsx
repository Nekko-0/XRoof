"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MapPin, Trash2, Plus, Ruler, RotateCcw, ChevronDown, Eye } from "lucide-react"

// Pitch factor lookup table
const PITCH_DATA: { pitch: string; rise: number; factor: number; degrees: number }[] = [
  { pitch: "1/12", rise: 1, factor: 1.003, degrees: 4.76 },
  { pitch: "2/12", rise: 2, factor: 1.014, degrees: 9.46 },
  { pitch: "3/12", rise: 3, factor: 1.031, degrees: 14.04 },
  { pitch: "4/12", rise: 4, factor: 1.054, degrees: 18.43 },
  { pitch: "5/12", rise: 5, factor: 1.083, degrees: 22.62 },
  { pitch: "6/12", rise: 6, factor: 1.118, degrees: 26.57 },
  { pitch: "7/12", rise: 7, factor: 1.158, degrees: 30.26 },
  { pitch: "8/12", rise: 8, factor: 1.202, degrees: 33.69 },
  { pitch: "9/12", rise: 9, factor: 1.250, degrees: 36.87 },
  { pitch: "10/12", rise: 10, factor: 1.302, degrees: 39.81 },
  { pitch: "11/12", rise: 11, factor: 1.357, degrees: 42.51 },
  { pitch: "12/12", rise: 12, factor: 1.414, degrees: 45.0 },
]

function getPitchFromDegrees(deg: number): { pitch: string; factor: number } {
  let closest = PITCH_DATA[0]
  let minDiff = Math.abs(deg - closest.degrees)
  for (const p of PITCH_DATA) {
    const diff = Math.abs(deg - p.degrees)
    if (diff < minDiff) {
      minDiff = diff
      closest = p
    }
  }
  return { pitch: closest.pitch, factor: closest.factor }
}

type RoofPlane = {
  name: string
  points: { lat: number; lng: number }[]
  area_sqft: number
}

export type RoofMeasurement = {
  address: string
  planes: RoofPlane[]
  pitch: string
  pitch_factor: number
  total_flat_area: number
  adjusted_area: number
  total_squares: number
  waste_percent: number
  order_squares: number
}

interface RoofMeasureToolProps {
  onExportToReport?: (data: RoofMeasurement) => void
}

declare global {
  interface Window {
    google: any
    initGoogleMaps: () => void
  }
}

export function RoofMeasureTool({ onExportToReport }: RoofMeasureToolProps) {
  const [address, setAddress] = useState("")
  const [mapLoaded, setMapLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<"satellite" | "streetview">("satellite")

  // Planes state
  const [planes, setPlanes] = useState<RoofPlane[]>([])
  const [activePlaneIndex, setActivePlaneIndex] = useState(0)
  const [drawingActive, setDrawingActive] = useState(false)

  // Pitch state
  const [selectedPitch, setSelectedPitch] = useState("6/12")
  const [pitchFactor, setPitchFactor] = useState(1.118)
  const [wastePercent, setWastePercent] = useState(15)
  const [streetViewPoints, setStreetViewPoints] = useState<{ x: number; y: number }[]>([])
  const [pitchMeasureActive, setPitchMeasureActive] = useState(false)

  // Refs
  const mapRef = useRef<HTMLDivElement>(null)
  const streetViewRef = useRef<HTMLDivElement>(null)
  const streetViewCanvasRef = useRef<HTMLCanvasElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const streetViewInstanceRef = useRef<any>(null)
  const polygonsRef = useRef<any[]>([])
  const markersRef = useRef<any[]>([])
  const currentPolygonRef = useRef<any>(null)
  const currentMarkersRef = useRef<any[]>([])
  const geocoderRef = useRef<any>(null)
  const [latLng, setLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const drawingActiveRef = useRef(false)
  const activePlaneIndexRef = useRef(0)
  const addressMarkerRef = useRef<any>(null)

  // Keep refs in sync
  useEffect(() => { drawingActiveRef.current = drawingActive }, [drawingActive])
  useEffect(() => { activePlaneIndexRef.current = activePlaneIndex }, [activePlaneIndex])

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey) return

    if (window.google?.maps) {
      setMapLoaded(true)
      return
    }

    window.initGoogleMaps = () => setMapLoaded(true)

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMaps&libraries=geometry`
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    return () => {
      window.initGoogleMaps = undefined as any
    }
  }, [])

  // Initialize map when loaded
  const initMap = useCallback((lat: number, lng: number) => {
    if (!mapRef.current || !window.google) return

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 20,
      mapTypeId: "satellite",
      tilt: 0,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })

    mapInstanceRef.current = map
    geocoderRef.current = new window.google.maps.Geocoder()

    // Drop red pin marker at the geocoded address location — draggable so user can move to correct house
    if (addressMarkerRef.current) addressMarkerRef.current.setMap(null)
    addressMarkerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map,
      draggable: true,
      title: "Drag to correct property",
    })

    // Click handler for drawing — use ref to avoid stale closure
    map.addListener("click", (e: any) => {
      if (!drawingActiveRef.current) return
      // Remove the red pin on first drawing click so it doesn't interfere
      if (addressMarkerRef.current) {
        addressMarkerRef.current.setMap(null)
        addressMarkerRef.current = null
      }
      const latLng = e.latLng
      addPointToPlane(latLng.lat(), latLng.lng())
    })
  }, [])

  // Initialize street view
  const initStreetView = useCallback((lat: number, lng: number) => {
    if (!streetViewRef.current || !window.google) return

    const sv = new window.google.maps.StreetViewPanorama(streetViewRef.current, {
      position: { lat, lng },
      pov: { heading: 0, pitch: 10 },
      zoom: 1,
      disableDefaultUI: false,
      showRoadLabels: false,
    })

    streetViewInstanceRef.current = sv
    setStreetViewPoints([])
  }, [])

  // Init map + street view AFTER the div renders (triggered by latLng state change)
  useEffect(() => {
    if (!latLng || !mapLoaded) return
    // Small delay to ensure DOM has rendered the map div
    const timer = setTimeout(() => {
      initMap(latLng.lat, latLng.lng)
      initStreetView(latLng.lat, latLng.lng)
    }, 50)
    return () => clearTimeout(timer)
  }, [latLng, mapLoaded])

  // Handle address search
  const handleSearch = async () => {
    if (!address.trim() || !mapLoaded) return

    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: address.trim() }, (results: any[], status: string) => {
      if (status === "OK" && results[0]) {
        const loc = results[0].geometry.location
        setLatLng({ lat: loc.lat(), lng: loc.lng() })
      } else {
        alert("Address not found (status: " + status + "). Please try a more specific address.")
      }
    })
  }

  // Add point to current plane — uses ref to avoid stale closure in map click handler
  const addPointToPlane = (lat: number, lng: number) => {
    const idx = activePlaneIndexRef.current
    setPlanes((prev) => {
      const updated = [...prev]
      if (!updated[idx]) {
        updated[idx] = { name: `Plane ${idx + 1}`, points: [], area_sqft: 0 }
      }
      updated[idx] = {
        ...updated[idx],
        points: [...updated[idx].points, { lat, lng }],
      }

      // Calculate area if 3+ points
      if (updated[idx].points.length >= 3) {
        updated[idx].area_sqft = calculatePolygonArea(updated[idx].points)
      }

      return updated
    })
  }

  // Calculate polygon area using Google Maps geometry
  const calculatePolygonArea = (points: { lat: number; lng: number }[]): number => {
    if (!window.google?.maps?.geometry || points.length < 3) return 0
    const path = points.map((p) => new window.google.maps.LatLng(p.lat, p.lng))
    const areaSqMeters = window.google.maps.geometry.spherical.computeArea(path)
    return Math.round(areaSqMeters * 10.7639) // sq meters to sq feet
  }

  // Draw polygons on map
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return

    // Clear old polygons and markers
    polygonsRef.current.forEach((p) => p.setMap(null))
    markersRef.current.forEach((m) => m.setMap(null))
    polygonsRef.current = []
    markersRef.current = []

    planes.forEach((plane, planeIdx) => {
      const color = planeIdx === activePlaneIndex ? "#22c55e" : "#3b82f6"

      // Draw closed polygon only when 3+ points
      if (plane.points.length >= 3) {
        const polygon = new window.google.maps.Polygon({
          paths: plane.points.map((p) => ({ lat: p.lat, lng: p.lng })),
          strokeColor: color,
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: color,
          fillOpacity: 0.25,
          map: mapInstanceRef.current,
        })
        polygonsRef.current.push(polygon)
      } else if (plane.points.length === 2) {
        // Draw a polyline connecting the 2 points (not a polygon)
        const polyline = new window.google.maps.Polyline({
          path: plane.points.map((p) => ({ lat: p.lat, lng: p.lng })),
          strokeColor: color,
          strokeOpacity: 0.9,
          strokeWeight: 2,
          map: mapInstanceRef.current,
        })
        polygonsRef.current.push(polyline)
      }

      // Draw vertex markers (numbered)
      plane.points.forEach((pt, ptIdx) => {
        const marker = new window.google.maps.Marker({
          position: { lat: pt.lat, lng: pt.lng },
          map: mapInstanceRef.current,
          label: {
            text: `${ptIdx + 1}`,
            color: "#fff",
            fontSize: "10px",
            fontWeight: "bold",
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        })
        markersRef.current.push(marker)
      })
    })
  }, [planes, activePlaneIndex])

  // Street View canvas for 3-point pitch
  useEffect(() => {
    const canvas = streetViewCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Resize canvas to match container
    const container = canvas.parentElement
    if (container) {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (streetViewPoints.length === 0) return

    // Draw points and lines
    ctx.strokeStyle = "#22c55e"
    ctx.fillStyle = "#22c55e"
    ctx.lineWidth = 2

    streetViewPoints.forEach((pt, i) => {
      // Draw point
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 2
      ctx.stroke()

      // Label
      ctx.fillStyle = "#fff"
      ctx.font = "bold 12px sans-serif"
      ctx.fillText(`P${i + 1}`, pt.x + 10, pt.y - 5)
      ctx.fillStyle = "#22c55e"
      ctx.strokeStyle = "#22c55e"
      ctx.lineWidth = 2
    })

    // Draw lines between points
    if (streetViewPoints.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(streetViewPoints[0].x, streetViewPoints[0].y)
      for (let i = 1; i < streetViewPoints.length; i++) {
        ctx.lineTo(streetViewPoints[i].x, streetViewPoints[i].y)
      }
      ctx.strokeStyle = "#22c55e"
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw horizontal reference line from P1
      if (streetViewPoints.length >= 2) {
        const lastPt = streetViewPoints[streetViewPoints.length - 1]
        ctx.beginPath()
        ctx.setLineDash([5, 5])
        ctx.moveTo(streetViewPoints[0].x, streetViewPoints[0].y)
        ctx.lineTo(lastPt.x, streetViewPoints[0].y)
        ctx.strokeStyle = "#ef4444"
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])

        // Draw vertical reference
        ctx.beginPath()
        ctx.setLineDash([5, 5])
        ctx.moveTo(lastPt.x, streetViewPoints[0].y)
        ctx.lineTo(lastPt.x, lastPt.y)
        ctx.strokeStyle = "#ef4444"
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // Calculate and display angle if 2+ points
    if (streetViewPoints.length >= 2) {
      const p1 = streetViewPoints[0]
      const pLast = streetViewPoints[streetViewPoints.length - 1]
      const rise = Math.abs(p1.y - pLast.y)
      const run = Math.abs(pLast.x - p1.x)
      if (run > 0) {
        const angle = Math.atan2(rise, run) * (180 / Math.PI)
        const { pitch, factor } = getPitchFromDegrees(angle)

        // Display angle on canvas
        ctx.fillStyle = "rgba(0,0,0,0.7)"
        ctx.fillRect(10, 10, 180, 55)
        ctx.fillStyle = "#22c55e"
        ctx.font = "bold 14px sans-serif"
        ctx.fillText(`Angle: ${angle.toFixed(1)}°`, 20, 30)
        ctx.fillText(`Pitch: ${pitch}`, 20, 48)
        ctx.fillStyle = "#8a8a8a"
        ctx.font = "11px sans-serif"
        ctx.fillText(`Factor: ${factor.toFixed(3)}`, 20, 62)
      }
    }
  }, [streetViewPoints])

  const handleStreetViewClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (streetViewPoints.length >= 3) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const newPoints = [...streetViewPoints, { x, y }]
    setStreetViewPoints(newPoints)

    // Auto-apply pitch when 3rd (or 2nd) point is placed
    if (newPoints.length >= 2) {
      const p1 = newPoints[0]
      const pLast = newPoints[newPoints.length - 1]
      const rise = Math.abs(p1.y - pLast.y)
      const run = Math.abs(pLast.x - p1.x)
      if (run > 0) {
        const angle = Math.atan2(rise, run) * (180 / Math.PI)
        const { pitch, factor } = getPitchFromDegrees(angle)
        setSelectedPitch(pitch)
        setPitchFactor(factor)
      }
    }
  }

  // Add new plane — immediately update refs so click handler uses new plane
  const addPlane = () => {
    const newPlane: RoofPlane = { name: `Plane ${planes.length + 1}`, points: [], area_sqft: 0 }
    const newIndex = planes.length
    setPlanes([...planes, newPlane])
    setActivePlaneIndex(newIndex)
    activePlaneIndexRef.current = newIndex
    setDrawingActive(true)
    drawingActiveRef.current = true
  }

  // Delete plane
  const deletePlane = (idx: number) => {
    const updated = planes.filter((_, i) => i !== idx)
    setPlanes(updated)
    if (activePlaneIndex >= updated.length) {
      setActivePlaneIndex(Math.max(0, updated.length - 1))
    }
  }

  // Undo last point — uses ref to avoid stale closure
  const undoLastPoint = () => {
    const idx = activePlaneIndexRef.current
    setPlanes((prev) => {
      const updated = [...prev]
      if (updated[idx]?.points.length > 0) {
        const newPoints = updated[idx].points.slice(0, -1)
        updated[idx] = {
          ...updated[idx],
          points: newPoints,
          area_sqft: newPoints.length >= 3
            ? calculatePolygonArea(newPoints)
            : 0,
        }
      }
      return updated
    })
  }

  // Calculation results
  const totalFlatArea = planes.reduce((sum, p) => sum + p.area_sqft, 0)
  const adjustedArea = Math.round(totalFlatArea * pitchFactor)
  const totalSquares = +(adjustedArea / 100).toFixed(1)
  const wasteSquares = +(totalSquares * (wastePercent / 100)).toFixed(1)
  const orderSquares = +(totalSquares + wasteSquares).toFixed(1)

  // Manual pitch selection
  const handlePitchChange = (pitch: string) => {
    setSelectedPitch(pitch)
    const found = PITCH_DATA.find((p) => p.pitch === pitch)
    if (found) setPitchFactor(found.factor)
  }

  // Export data
  const handleExport = () => {
    if (!onExportToReport) return
    const data: RoofMeasurement = {
      address,
      planes,
      pitch: selectedPitch,
      pitch_factor: pitchFactor,
      total_flat_area: totalFlatArea,
      adjusted_area: adjustedArea,
      total_squares: totalSquares,
      waste_percent: wastePercent,
      order_squares: orderSquares,
    }
    onExportToReport(data)
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

  if (!apiKey) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Google Maps API key not configured. Add <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> to your <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">.env.local</code> file.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Address Search */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            <MapPin className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
            Property Address
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="123 Main St, City, State"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!mapLoaded || !address.trim()}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {!mapLoaded ? "Loading Maps..." : "Search"}
        </button>
      </div>

      {/* Map / Street View Tabs */}
      {latLng && (
        <>
          <div className="flex gap-1 rounded-xl border border-border bg-secondary/30 p-1">
            <button
              onClick={() => {
                setActiveTab("satellite")
                setTimeout(() => {
                  if (mapInstanceRef.current) {
                    window.google?.maps?.event?.trigger(mapInstanceRef.current, "resize")
                  }
                }, 100)
              }}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "satellite"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Ruler className="mr-1.5 inline h-3.5 w-3.5" />
              Satellite — Draw Roof
            </button>
            <button
              onClick={() => setActiveTab("streetview")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "streetview"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="mr-1.5 inline h-3.5 w-3.5" />
              Street View — Pitch
            </button>
          </div>

          {/* Satellite View */}
          <div className={activeTab === "satellite" ? "block" : "hidden"}>
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div ref={mapRef} className="h-[400px] sm:h-[500px] w-full" />

              {/* Drawing Controls */}
              <div className="border-t border-border p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      if (planes.length === 0) addPlane()
                      setDrawingActive(!drawingActive)
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      drawingActive
                        ? "bg-emerald-900/30 text-emerald-400 border border-emerald-700"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {drawingActive ? "Drawing Active" : "Start Drawing"}
                  </button>
                  <button
                    onClick={addPlane}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Plane
                  </button>
                  <button
                    onClick={undoLastPoint}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Undo
                  </button>
                </div>

                {drawingActive && (
                  <p className="mb-3 text-xs text-muted-foreground">
                    Click on the roof corners to draw a polygon. Add at least 3 points to calculate area.
                  </p>
                )}

                {/* Planes List */}
                {planes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {planes.map((plane, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between rounded-xl border p-3 text-sm ${
                          idx === activePlaneIndex
                            ? "border-primary/50 bg-primary/5"
                            : "border-border bg-secondary/20"
                        }`}
                      >
                        <button
                          onClick={() => { setActivePlaneIndex(idx); setDrawingActive(true) }}
                          className="flex flex-1 items-center gap-3"
                        >
                          <input
                            value={plane.name}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const updated = [...planes]
                              updated[idx].name = e.target.value
                              setPlanes(updated)
                            }}
                            className="w-28 rounded border border-border bg-background px-2 py-1 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">{plane.points.length} pts</span>
                          <span className="font-medium text-foreground">
                            {plane.area_sqft > 0 ? `${plane.area_sqft.toLocaleString()} sq ft` : "—"}
                          </span>
                        </button>
                        <button
                          onClick={() => deletePlane(idx)}
                          className="ml-2 rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Street View */}
          <div className={activeTab === "streetview" ? "block" : "hidden"}>
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="relative">
                <div ref={streetViewRef} className="h-[400px] sm:h-[500px] w-full" />
                <canvas
                  ref={streetViewCanvasRef}
                  onClick={handleStreetViewClick}
                  className={`absolute inset-0 h-full w-full ${pitchMeasureActive && streetViewPoints.length < 3 ? "cursor-crosshair" : ""}`}
                  style={{ pointerEvents: pitchMeasureActive && streetViewPoints.length < 3 ? "auto" : "none" }}
                />
                {pitchMeasureActive && (
                  <div className="absolute top-3 left-3 rounded-lg bg-black/70 px-3 py-2 text-xs font-medium text-emerald-400">
                    Click {3 - streetViewPoints.length} point{3 - streetViewPoints.length !== 1 ? "s" : ""} on the roof edge
                  </div>
                )}
              </div>

              <div className="border-t border-border p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setPitchMeasureActive(!pitchMeasureActive)
                      if (!pitchMeasureActive) setStreetViewPoints([])
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      pitchMeasureActive
                        ? "bg-emerald-900/30 text-emerald-400 border border-emerald-700"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    <Ruler className="h-3.5 w-3.5" />
                    {pitchMeasureActive ? "Measuring — Click Roof Edge" : "Measure Pitch"}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {streetViewPoints.length}/3 points placed
                  </span>
                  {streetViewPoints.length > 0 && (
                    <button
                      onClick={() => { setStreetViewPoints([]); setPitchMeasureActive(true) }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset Points
                    </button>
                  )}
                </div>
                {!pitchMeasureActive && (
                  <p className="text-xs text-muted-foreground">
                    Drag to rotate the view — navigate around the house to see the garage or back roof sections. Click "Measure Pitch" when ready to place points.
                  </p>
                )}
                {pitchMeasureActive && (
                  <p className="text-xs text-muted-foreground">
                    Click on the roof rake (sloped edge): P1 at the bottom (eave), P2 midway, P3 at the top (ridge). The angle will be calculated automatically.
                  </p>
                )}
                <p className="mt-2 rounded-lg bg-amber-900/20 border border-amber-800/30 px-3 py-2 text-xs text-amber-400">
                  Estimated pitch — verify with physical measurement for exact accuracy (~85-90% accurate)
                </p>
              </div>
            </div>
          </div>

          {/* Pitch + Results Panel */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Measurement Results</h3>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Manual Pitch Override */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Roof Pitch (manual override)
                </label>
                <div className="relative">
                  <select
                    value={selectedPitch}
                    onChange={(e) => handlePitchChange(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {PITCH_DATA.map((p) => (
                      <option key={p.pitch} value={p.pitch}>
                        {p.pitch} ({p.degrees.toFixed(1)}°) — Factor: {p.factor}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {/* Waste Factor */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Waste Factor %
                </label>
                <input
                  type="number"
                  value={wastePercent}
                  onChange={(e) => setWastePercent(Number(e.target.value))}
                  min={0}
                  max={30}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Flat Area", value: `${totalFlatArea.toLocaleString()} sq ft` },
                { label: "Pitch", value: selectedPitch },
                { label: "Adjusted Area", value: `${adjustedArea.toLocaleString()} sq ft` },
                { label: "Total Squares", value: totalSquares.toString() },
                { label: "Order Squares", value: orderSquares.toString(), highlight: true },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-xl border p-3 text-center ${
                    item.highlight
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-secondary/20"
                  }`}
                >
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`mt-1 text-lg font-bold ${item.highlight ? "text-primary" : "text-foreground"}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Export Button */}
            {onExportToReport && totalFlatArea > 0 && (
              <button
                onClick={handleExport}
                className="mt-4 w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Export to Report
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
