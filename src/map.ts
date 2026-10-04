import type { Map as MLMap } from "maplibre-gl";
import { isNight } from "./open";

// v: 1 for shops checked with the owner, 0 for places from open map data.
type Point = { slug: string; name: string; color: string; lat: number; lng: number; v: number };

const CENTER: [number, number] = [77.047, 30.2755];
const dark = () => matchMedia("(prefers-color-scheme: dark)").matches || isNight();

const selectors = new WeakMap<MLMap, (slug: string, center: [number, number], stay?: boolean) => void>();
// Highlight a pin and fly there, without leaving the map (tapping the pin itself opens its row).
export function showPin(map: MLMap, slug: string, lng: number, lat: number) {
  const select = selectors.get(map);
  select?.(slug, [lng, lat], true);
  return !!select; // false until the map has loaded
}

export async function initMap(el: HTMLElement, points: Point[], onPick: (slug: string) => void) {
  // Loaded only after the list is on screen, so the list never waits on WebGL.
  const [maplibregl, { default: workerUrl }] = await Promise.all([
    import("maplibre-gl"),
    // MapLibre 6 loads its worker from a sibling file; bundle it so the import resolves.
    import("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"),
    import("maplibre-gl/dist/maplibre-gl.css"),
  ]);
  maplibregl.setWorkerUrl(workerUrl);
  const map = new maplibregl.Map({
    container: el,
    style: `https://tiles.openfreemap.org/styles/${dark() ? "dark" : "positron"}`,
    center: CENTER,
    zoom: 13.4,
    attributionControl: false,
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showZoom: false }), "top-right");

  map.on("load", () => {
    // Fields green and canals blue, so the grey base map reads as farm country.
    const tint: Record<string, string> = dark()
      ? { background: "#171816", landuse_residential: "#1d1e1b", park: "#1b241b", landuse_park: "#1b241b", landcover_wood: "#1b241b", water: "#16252b", building: "#262724" }
      : { background: "#eeeee8", landuse_residential: "#e7e7e0", park: "#d9e5cc", landcover_wood: "#d1dfc3", water: "#bcd3dc", building: "#e0e0d8" };
    for (const [id, c] of Object.entries(tint)) if (map.getLayer(id)) map.setPaintProperty(id, id === "background" ? "background-color" : "fill-color", c);
    map.addSource("shops", {
      type: "geojson",
      promoteId: "slug",
      data: {
        type: "FeatureCollection",
        features: points.map((p) => ({
          type: "Feature",
          properties: { slug: p.slug, name: p.name, color: p.color, v: p.v },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        })),
      },
    });
    map.addLayer({
      id: "shops",
      type: "circle",
      source: "shops",
      paint: {
        // Checked shops are solid; unchecked places are rings in the category colour.
        "circle-radius": ["case", ["boolean", ["feature-state", "picked"], false], 11, ["==", ["get", "v"], 1], 8, 5.5],
        "circle-color": ["case", ["==", ["get", "v"], 1], ["get", "color"], "#ffffff"],
        "circle-stroke-width": ["case", ["==", ["get", "v"], 1], 2.5, 2],
        "circle-stroke-color": ["case", ["==", ["get", "v"], 1], "#ffffff", ["get", "color"]],
      },
    });
    map.addLayer({
      id: "shop-names",
      type: "symbol",
      source: "shops",
      filter: ["==", ["get", "v"], 1],
      layout: {
        "text-field": ["get", "name"],
        "text-size": 12.5,
        "text-offset": [0, 1.25],
        "text-anchor": "top",
        "text-font": ["Noto Sans Bold"],
        "text-max-width": 8,
      },
      paint: {
        "text-color": dark() ? "#edede8" : "#1f1f1c",
        "text-halo-color": dark() ? "#141513" : "#ffffff",
        "text-halo-width": 1.6,
      },
    });

    let picked: string | undefined;
    const select = (slug: string, center: [number, number], stay = false) => {
      if (picked) map.setFeatureState({ source: "shops", id: picked }, { picked: false });
      picked = slug;
      map.setFeatureState({ source: "shops", id: picked }, { picked: true });
      map.flyTo({ center, zoom: Math.max(map.getZoom(), 17), speed: 0.9 });
      if (!stay) onPick(slug);
    };
    selectors.set(map, select);
    map.on("click", "shops", (e) => {
      const f = e.features?.[0];
      if (f) select(f.properties.slug, (f.geometry as any).coordinates);
    });

    // Arrival: drop in from above the district onto the market, once.
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      map.flyTo({ center: CENTER, zoom: 15.8, speed: 0.6, curve: 1.2 });
    } else {
      map.jumpTo({ zoom: 15.8 });
    }
    map.on("mouseenter", "shops", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "shops", () => (map.getCanvas().style.cursor = ""));
  });
  return map;
}

export function showTown(map: MLMap) {
  map.flyTo({ center: CENTER, zoom: 15.8, bearing: map.getPitch() > 0 ? -28 : 0 });
}

export function showMe(map: MLMap, lng: number, lat: number) {
  const data: any = { type: "Point", coordinates: [lng, lat] };
  const src = map.getSource("me") as any;
  if (src) src.setData(data);
  else {
    map.addSource("me", { type: "geojson", data });
    map.addLayer({ id: "me-halo", type: "circle", source: "me", paint: { "circle-radius": 18, "circle-color": "#1d64b0", "circle-opacity": 0.18 } });
    map.addLayer({ id: "me", type: "circle", source: "me", paint: { "circle-radius": 7, "circle-color": "#1d64b0", "circle-stroke-width": 2.5, "circle-stroke-color": "#fff" } });
  }
  map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15.5) });
}

export function filterMap(map: MLMap, visible: string[]) {
  if (!map.getLayer("shops")) return;
  const f: any = ["in", ["get", "slug"], ["literal", visible]];
  map.setFilter("shops", f);
  // Unchecked places stay unlabelled to keep the map calm; tapping one shows it in the list.
  map.setFilter("shop-names", ["all", f, ["==", ["get", "v"], 1]]);
}

export function set3D(map: MLMap, on: boolean) {
  if (on && !map.getSource("buildings")) {
    map.addSource("buildings", { type: "geojson", data: "/buildings.geojson" });
    map.addLayer(
      {
        id: "buildings-3d",
        type: "fill-extrusion",
        source: "buildings",
        paint: {
          "fill-extrusion-color": dark() ? "#3a3b37" : "#dcdcd4",
          "fill-extrusion-height": ["get", "h"],
          "fill-extrusion-opacity": 0.92,
        },
      },
      "shops",
    );
  }
  if (map.getLayer("buildings-3d")) map.setLayoutProperty("buildings-3d", "visibility", on ? "visible" : "none");
  map.easeTo(on ? { pitch: 60, bearing: -28, zoom: 16.6, duration: 1400 } : { pitch: 0, bearing: 0, zoom: 15.8 });
}
