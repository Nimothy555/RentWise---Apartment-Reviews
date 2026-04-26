import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'

function FitBounds({ markers }) {
  const map = useMap()
  useEffect(() => {
    if (markers.length === 0) return
    map.fitBounds(markers.map(m => [m.lat, m.lng]), { padding: [50, 50] })
  }, [markers, map])
  return null
}
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

const geocodeCache = {}
try {
  const stored = localStorage.getItem('geocache')
  if (stored) Object.assign(geocodeCache, JSON.parse(stored))
} catch {}

async function geocodeApartment(apt) {
  const key = apt.id.toString()
  if (geocodeCache[key]) return geocodeCache[key]
  try {
    const q = encodeURIComponent(`${apt.street_address}, ${apt.city}, ${apt.state} ${apt.zip_code}`)
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'User-Agent': 'RentWise/1.0 (rentwise-app)' }
    })
    const data = await res.json()
    if (data[0]) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      geocodeCache[key] = coords
      try { localStorage.setItem('geocache', JSON.stringify(geocodeCache)) } catch {}
      return coords
    }
  } catch {}
  return null
}

export default function ApartmentMap({ apartments }) {
  const [markers, setMarkers] = useState([])

  useEffect(() => {
    if (!apartments?.length) return
    let cancelled = false

    async function geocodeAll() {
      for (const apt of apartments) {
        if (cancelled) break
        const coords = await geocodeApartment(apt)
        if (coords && !cancelled) {
          setMarkers(prev => {
            if (prev.find(m => m.id === apt.id)) return prev
            return [...prev, { ...apt, ...coords }]
          })
        }
        // Respect Nominatim rate limit (1 req/sec)
        await new Promise(r => setTimeout(r, 1100))
      }
    }

    geocodeAll()
    return () => { cancelled = true }
  }, [apartments])

  return (
    <div className="map-container">
      <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds markers={markers} />
        {markers.map(m => (
          <Marker key={m.id} position={[m.lat, m.lng]}>
            <Popup>
              <strong>{m.name}</strong><br />
              {m.street_address}, {m.city}, {m.state}<br />
              {m.avg_rating ? `⭐ ${m.avg_rating}` : 'No ratings yet'}<br />
              <Link to={`/apartments/${m.id}`}>View listing →</Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {markers.length < apartments.length && (
        <p className="text-muted" style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.8rem' }}>
          Geocoding {markers.length}/{apartments.length} apartments...
        </p>
      )}
    </div>
  )
}
