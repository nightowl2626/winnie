import React, { useEffect, useMemo, useRef } from "react";
import MapView, { Marker } from "react-native-maps";

import type { NearbyStore } from "../../types";
import type { ShopCoords } from "../types";
import { shopZoomToRegion, shopRegionToZoom } from "../utils/geo";
import { sustainabilityBand } from "../utils/sustainability";

type Props = {
  center: ShopCoords | null;
  fallbackCenter: ShopCoords | null;
  zoom: number;
  stores: NearbyStore[];
  onSelectStore: (store: NearbyStore) => void;
  onViewportChange: (next: { center: ShopCoords; zoom: number }) => void;
};

export default function ClusteredShopMap({
  center,
  fallbackCenter,
  zoom,
  stores,
  onSelectStore,
  onViewportChange,
}: Props) {
  const mapRef = useRef<any>(null);
  const hasMountedRef = useRef(false);
  const lastViewportRef = useRef<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  const region = useMemo(() => {
    const focus = center || fallbackCenter;
    if (!focus) {
      return null;
    }
    return shopZoomToRegion(focus, zoom);
  }, [center, fallbackCenter, zoom]);

  if (!region) {
    return null;
  }

  useEffect(() => {
    if (!region) {
      return;
    }
    const previous = lastViewportRef.current;
    const matchesPrevious =
      previous &&
      Math.abs(previous.latitude - region.latitude) < 0.0005 &&
      Math.abs(previous.longitude - region.longitude) < 0.0005 &&
      Math.abs(previous.latitudeDelta - region.latitudeDelta) < 0.002 &&
      Math.abs(previous.longitudeDelta - region.longitudeDelta) < 0.002;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      lastViewportRef.current = region;
      return;
    }
    if (matchesPrevious) {
      return;
    }
    lastViewportRef.current = region;
    mapRef.current?.animateToRegion?.(region, 240);
  }, [region]);

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={region}
      onRegionChangeComplete={(nextRegion) => {
        lastViewportRef.current = nextRegion;
        onViewportChange({
          center: { lat: nextRegion.latitude, lng: nextRegion.longitude },
          zoom: shopRegionToZoom(nextRegion),
        });
      }}
    >
      {stores.map((store) => {
        const band = sustainabilityBand(store.ai_evaluation?.sustainability_score, store);
        return (
          <Marker
            key={`shop-map-marker-${store.id}`}
            coordinate={{ latitude: store.lat, longitude: store.lng }}
            onPress={() => onSelectStore(store)}
            pinColor={
              band === "high" ? "#2F8F62" : band === "mid" ? "#D57A36" : "#8C6B4F"
            }
          />
        );
      })}
    </MapView>
  );
}
