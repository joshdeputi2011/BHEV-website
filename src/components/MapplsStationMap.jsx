import { useEffect, useId, useRef, useState } from 'react';
import { mappls } from 'mappls-web-maps';
import './MapplsStationMap.css';

const key = import.meta.env.VITE_MAPPLS_WEB_KEY;

export default function MapplsStationMap({ stations, selectedStation, onSelect }) {
  const mapId = `chargegrid-map-${useId().replaceAll(':', '')}`;
  const sdk = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const [state, setState] = useState(key ? 'loading' : 'missing-key');

  useEffect(() => {
    if (!key) return undefined;
    sdk.current = new mappls();
    sdk.current.initialize(key, { map: true, version: '3.0' }, () => {
      map.current = sdk.current.Map({ id: mapId, properties: { center: [20.5937, 78.9629], zoom: 4, zoomControl: true } });
      map.current.on('load', () => setState('ready'));
    });
    return () => map.current?.remove?.();
  }, [mapId]);

  useEffect(() => {
    if (state !== 'ready' || !map.current || !sdk.current) return;
    markers.current.forEach((marker) => marker?.remove?.());
    markers.current = stations.map((station) => {
      const markerFactory = sdk.current.marker || sdk.current.Marker;
      const marker = markerFactory({
        map: map.current,
        position: { lat: station.latitude, lng: station.longitude },
        popupHtml: `<strong>${station.name}</strong><br/>${station.availableConnectors} connector(s) available`,
        fitbounds: stations.length > 1,
      });
      marker?.addListener?.('click', () => onSelect(station));
      return marker;
    });
  }, [state, stations, onSelect]);

  useEffect(() => {
    if (state !== 'ready' || !selectedStation || !map.current) return;
    map.current.setCenter?.({ lat: selectedStation.latitude, lng: selectedStation.longitude });
    map.current.setZoom?.(13);
  }, [selectedStation, state]);

  if (state === 'missing-key') {
    return <div className="mappls-map mappls-map--notice">Add <code>VITE_MAPPLS_WEB_KEY</code> to enable the licensed Mappls map. Station data remains available below.</div>;
  }
  return <div id={mapId} className="mappls-map" aria-label="Mappls charging station map" />;
}
