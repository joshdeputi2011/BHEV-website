import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import {
  MapRegular,
  WeatherMoonRegular,
  GlobeRegular,
  NavigationRegular,
  FlashRegular,
  LocationRegular
} from '@fluentui/react-icons';
import './MapplsStationMap.css';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

function powerCategory(kw) {
  const p = Number(kw) || 0;
  if (p >= 50) return 'fast';
  if (p >= 25) return 'medium';
  return 'slow';
}

function popupHtml(s) {
  const cpo = s.cpo || s.operator?.name || 'Operator';
  const ownership = s.ownership || (s.operator?.isMock ? 'Mock CPO' : 'Public/CPO');
  const power = s.maxPowerKw || s.max_power_kw ? `${s.maxPowerKw || s.max_power_kw} kW` : 'Standard';
  const address = s.location || s.address || '';
  const area = [s.city, s.district, s.state].filter(Boolean).join(', ');
  
  const connList = Array.isArray(s.connectors) 
    ? s.connectors.map(c => c.standard || c).filter(Boolean)
    : Array.isArray(s.connector_types) 
      ? s.connector_types 
      : Array.isArray(s.connector_categories)
        ? s.connector_categories
        : [];
  
  const connTags = connList.slice(0, 4).map(c => `<span class="map-popup__tag">${esc(c)}</span>`).join('');
  const navUrl = `https://www.mappls.com/direction?source=Current+Location&destination=${s.latitude},${s.longitude}`;
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`;

  return `
    <div class="map-popup">
      <div class="map-popup__header">
        <div class="map-popup__icon">⚡</div>
        <div class="map-popup__title-wrap">
          <h4 class="map-popup__title">${esc(s.name)}</h4>
          <span class="map-popup__sub">${esc(cpo)} • ${esc(ownership)}</span>
        </div>
      </div>
      <div class="map-popup__address">
        <p>${esc(address)}</p>
        ${area ? `<small>📍 ${esc(area)}</small>` : ''}
      </div>
      <div class="map-popup__meta">
        ${connTags}
        <span class="map-popup__tag map-popup__tag--power">${esc(power)}</span>
      </div>
      <div class="map-popup__footer">
        <a href="${navUrl}" target="_blank" rel="noopener noreferrer" class="map-popup__btn map-popup__btn--mappls">
          Mappls Directions ↗
        </a>
        <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" class="map-popup__btn map-popup__btn--gmaps">
          Google Maps ↗
        </a>
      </div>
    </div>
  `;
}

// Major Indian EV Highway Corridors & Expressways
const HIGHWAY_CORRIDORS = [
  { name: 'Delhi — Mumbai Expressway (NE-4)', lat: 26.8, lng: 76.5 },
  { name: 'Yamuna Expressway (Greater Noida — Agra)', lat: 27.8, lng: 77.7 },
  { name: 'Mumbai — Pune Expressway', lat: 18.8, lng: 73.2 },
  { name: 'Bengaluru — Mysuru Expressway (NH-275)', lat: 12.6, lng: 77.0 },
  { name: 'Eastern Peripheral Expressway (KMP)', lat: 28.6, lng: 77.5 },
  { name: 'Samruddhi Mahamarg (Mumbai — Nagpur)', lat: 19.9, lng: 76.8 },
  { name: 'NH-44 (Kashmir to Kanyakumari Spine)', lat: 21.1, lng: 79.1 },
  { name: 'NH-48 (Delhi — Jaipur — Mumbai — Bengaluru)', lat: 20.5, lng: 74.5 }
];

export default function MapplsStationMap({
  stations = [],
  selectedStation = null,
  onSelect,
  userLocation = null,
  fitTrigger = 0
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const tileLayerGroupRef = useRef(null);
  const markerMapRef = useRef(new Map());
  const userMarkerRef = useRef(null);
  const corridorLayerRef = useRef(null);

  const [activeLayer, setActiveLayer] = useState('osm'); // 'osm' (Detailed Landmarks), 'satellite', 'dark', 'voyager'
  const [showCorridors, setShowCorridors] = useState(false);

  const [currentTheme, setCurrentTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'gov';
  });

  // Observe theme changes on document.documentElement
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const theme = document.documentElement.getAttribute('data-theme') || 'gov';
      setCurrentTheme(theme);
      if (activeLayer === 'dark' && theme === 'gov') setActiveLayer('osm');
      if (activeLayer === 'osm' && theme === 'dark') setActiveLayer('dark');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, [activeLayer]);

  // Initialize Leaflet map with tiles, scale, and cluster group
  useEffect(() => {
    if (!containerRef.current) return;

    // Default center on India
    const map = L.map(containerRef.current, {
      preferCanvas: true,
      zoomControl: true,
      center: [22.9734, 78.6569],
      zoom: 5,
      minZoom: 4,
      maxZoom: 19
    });
    mapRef.current = map;

    // Add metric scale bar
    L.control.scale({ imperial: false, metric: true, position: 'bottomright' }).addTo(map);

    // Tile layer group
    const tileGroup = L.layerGroup().addTo(map);
    tileLayerGroupRef.current = tileGroup;

    // Marker cluster group with smooth chunk loading
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 50,
      chunkDelay: 20,
      removeOutsideVisibleBounds: true,
      showCoverageOnHover: false,
      maxClusterRadius: 55,
      disableClusteringAtZoom: 15,
      iconCreateFunction: (clusterObj) => {
        const count = clusterObj.getChildCount();
        let sizeClass = 'small';
        if (count > 500) sizeClass = 'large';
        else if (count > 50) sizeClass = 'medium';

        return L.divIcon({
          html: `<div class="bhev-cluster bhev-cluster--${sizeClass}"><span>${count > 999 ? (count / 1000).toFixed(1) + 'k' : count}</span></div>`,
          className: 'bhev-cluster-wrap',
          iconSize: L.point(40, 40)
        });
      }
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update base map tile layer based on activeLayer
  useEffect(() => {
    const tileGroup = tileLayerGroupRef.current;
    if (!tileGroup) return;

    tileGroup.clearLayers();

    if (activeLayer === 'satellite') {
      // High resolution Satellite Imagery with Landmark & Road Overlays
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' }
      );
      const labelsLayer = L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      );
      tileGroup.addLayer(satLayer);
      tileGroup.addLayer(labelsLayer);
    } else if (activeLayer === 'dark') {
      // Dark Navigation View
      const darkLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO • Powered by MapmyIndia / Mappls' }
      );
      tileGroup.addLayer(darkLayer);
    } else {
      // Detailed Standard OpenStreetMap with Landmarks, Highway numbers, Metro lines, Fuel stations, POIs
      const osmDetailed = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors • Powered by MapmyIndia / Mappls' }
      );
      tileGroup.addLayer(osmDetailed);
    }
  }, [activeLayer]);

  // Highway corridors overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (corridorLayerRef.current) {
      corridorLayerRef.current.remove();
      corridorLayerRef.current = null;
    }

    if (showCorridors) {
      const group = L.layerGroup();
      HIGHWAY_CORRIDORS.forEach((corridor) => {
        const icon = L.divIcon({
          className: 'corridor-icon',
          html: `<div class="corridor-badge">🛣️ ${esc(corridor.name)}</div>`,
          iconSize: [160, 24],
          iconAnchor: [80, 12]
        });
        L.marker([corridor.lat, corridor.lng], { icon }).addTo(group);
      });
      group.addTo(map);
      corridorLayerRef.current = group;
    }
  }, [showCorridors]);

  // Sync user location marker & auto-center
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userLocation && userLocation.lat && userLocation.lng) {
      const userIcon = L.divIcon({
        className: 'user-loc-icon',
        html: '<div class="user-pulse-marker" title="Your current location"><div class="user-pulse-dot"></div><div class="user-pulse-ring"></div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        zIndexOffset: 10000
      })
        .addTo(map)
        .bindPopup('<strong>📍 Your Detected Location</strong>');

      map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 11), {
        duration: 1.2
      });
    }
  }, [userLocation]);

  // Update stations in cluster
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    cluster.clearLayers();
    markerMapRef.current.clear();

    const newMarkers = [];
    const markerMap = markerMapRef.current;

    for (let i = 0; i < stations.length; i++) {
      const s = stations[i];
      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const pClass = powerCategory(s.maxPowerKw || s.max_power_kw);
      const icon = L.divIcon({
        className: 'bhev-pin-wrap',
        html: `<div class="bhev-pin bhev-pin--${pClass}" title="${esc(s.name)}"><span class="bhev-pin__dot"></span></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const m = L.marker([lat, lng], { icon });
      m.bindPopup(() => popupHtml(s), {
        maxWidth: 320,
        className: 'bhev-custom-popup'
      });

      m.on('click', () => {
        if (onSelect) onSelect(s);
      });

      markerMap.set(String(s.id), m);
      newMarkers.push(m);
    }

    cluster.addLayers(newMarkers);
  }, [stations, onSelect]);

  // Sync selected station
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedStation) return;

    const lat = Number(selectedStation.latitude);
    const lng = Number(selectedStation.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), {
      duration: 0.8
    });

    const m = markerMapRef.current.get(String(selectedStation.id));
    if (m) {
      setTimeout(() => {
        m.openPopup();
      }, 400);
    }
  }, [selectedStation]);

  // Fit bounds when stations change or fitTrigger changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stations.length) return;

    const isFiltered = stations.length > 0 && stations.length < 28000;
    if (!isFiltered && fitTrigger === 0) return;

    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    let count = 0;

    for (let i = 0; i < Math.min(stations.length, 3000); i++) {
      const s = stations[i];
      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        count++;
      }
    }

    if (count > 0) {
      const bounds = L.latLngBounds([[minLat, minLng], [maxLat, maxLng]]);
      if (bounds.isValid()) {
        const timeout = setTimeout(() => {
          map.fitBounds(bounds.pad(0.1), { maxZoom: 14, duration: 0.8 });
        }, 150);
        return () => clearTimeout(timeout);
      }
    }
  }, [fitTrigger, stations]);

  const recenterIndia = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([22.9734, 78.6569], 5, { duration: 1 });
    }
  };

  return (
    <div className="bhev-map-container">
      <div ref={containerRef} className="bhev-leaflet-map" />

      {/* Layer & Landmark Controls Bar */}
      <div className="bhev-map-layer-controls">
        <div className="bhev-map-layers-switch">
          <button
            className={`bhev-layer-btn ${activeLayer === 'osm' ? 'bhev-layer-btn--active' : ''}`}
            onClick={() => setActiveLayer('osm')}
            title="Detailed Street & Landmark Map (Roads, Hospitals, Malls, POIs, Metro)"
          >
            <MapRegular /> Detailed Landmarks
          </button>
          <button
            className={`bhev-layer-btn ${activeLayer === 'satellite' ? 'bhev-layer-btn--active' : ''}`}
            onClick={() => setActiveLayer('satellite')}
            title="Satellite Imagery with Place Labels"
          >
            <GlobeRegular /> Satellite
          </button>
          <button
            className={`bhev-layer-btn ${activeLayer === 'dark' ? 'bhev-layer-btn--active' : ''}`}
            onClick={() => setActiveLayer('dark')}
            title="Night Mode Navigation"
          >
            <WeatherMoonRegular /> Dark
          </button>
        </div>

        <button
          className={`bhev-corridor-btn ${showCorridors ? 'bhev-corridor-btn--active' : ''}`}
          onClick={() => setShowCorridors(!showCorridors)}
          title="Highlight major EV Expressways & National Highway Corridors"
        >
          <NavigationRegular /> Highway Corridors
        </button>

        <button
          className="bhev-recenter-btn"
          onClick={recenterIndia}
          title="Recenter Map to India Overview"
        >
          <LocationRegular /> Recenter India
        </button>
      </div>

      {/* Map Badge */}
      <div className="bhev-map-badge">
        <div className="bhev-map-badge__header">
          <span className="bhev-map-badge__dot"></span>
          <strong>Official BEE & UEI National Grid</strong>
        </div>
        <p>
          29,000+ EV charging stations with detailed city landmarks, highways, and navigation routes.
        </p>
      </div>
    </div>
  );
}
