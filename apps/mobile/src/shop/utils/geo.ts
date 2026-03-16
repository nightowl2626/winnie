export function formatMeters(meters?: number): string {
  if (!Number.isFinite(Number(meters))) {
    return "";
  }
  const value = Number(meters);
  if (value < 1000) {
    return `${Math.round(value)} m`;
  }
  return `${(value / 1000).toFixed(1)} km`;
}

export function estimateDistanceMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371_000;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function projectShopMarkerToMap(
  center: { lat: number; lng: number },
  point: { lat: number; lng: number },
  size: { width: number; height: number },
  zoom: number
): { left: number; top: number; visible: boolean } {
  const width = Math.max(1, size.width);
  const height = Math.max(1, size.height);
  const lngPerPixel = 360 / (256 * Math.pow(2, zoom));
  const latPerPixel = 170 / (256 * Math.pow(2, zoom));
  const latAdjust = Math.max(0.2, Math.cos((center.lat * Math.PI) / 180));
  const deltaLngPx = ((point.lng - center.lng) * latAdjust) / lngPerPixel;
  const deltaLatPx = (point.lat - center.lat) / latPerPixel;
  const left = width / 2 + deltaLngPx * (width / 320);
  const top = height / 2 - deltaLatPx * (height / 280);
  const visible = left >= -24 && left <= width + 24 && top >= -24 && top <= height + 24;
  return { left, top, visible };
}

export function shopSearchRadiusForZoom(zoom: number): number {
  if (zoom <= 8) {
    return 45000;
  }
  if (zoom <= 9) {
    return 38000;
  }
  if (zoom <= 10) {
    return 30000;
  }
  if (zoom <= 11) {
    return 22000;
  }
  if (zoom <= 12) {
    return 16000;
  }
  if (zoom <= 13) {
    return 12000;
  }
  return 8000;
}

export function shopZoomToRegion(center: { lat: number; lng: number }, zoom: number): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  const boundedZoom = Math.max(5, Math.min(18, zoom));
  const longitudeDelta = Math.max(0.003, 360 / Math.pow(2, boundedZoom) * 1.1);
  const latitudeDelta = Math.max(0.003, longitudeDelta * 0.72);
  return {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta,
    longitudeDelta,
  };
}

export function shopRegionToZoom(region: {
  latitudeDelta?: number;
  longitudeDelta?: number;
}): number {
  const longitudeDelta = Math.max(0.000001, Number(region.longitudeDelta || 0));
  const zoom = Math.log2(360 / longitudeDelta / 1.1);
  return Math.max(5, Math.min(18, Math.round(zoom)));
}
