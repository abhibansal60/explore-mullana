import type { Map as MLMap } from "maplibre-gl";

type Point = { slug: string; name: string; color: string; lat: number; lng: number };

const CENTER: [number, number] = [77.047, 30.2755];
const dark = () => matchMedia("(prefers-color-scheme: dark)").matches;

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
    map.addSource("shops", {
      type: "geojson",
      promoteId: "slug",
      data: {
        type: "FeatureCollection",
        features: points.map((p) => ({
          type: "Feature",
          properties: { slug: p.slug, name: p.name, color: p.color },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        })),
      },
    });
    map.addLayer({
      id: "shops",
      type: "circle",
      source: "shops",
      paint: {
        "circle-radius": ["case", ["boolean", ["feature-state", "picked"], false], 11, 8],
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#ffffff",
      },
    });
    map.addLayer({
      id: "shop-names",
      type: "symbol",
      source: "shops",
      layout: {
        "text-field": ["get", "name"],
        "text-size": 12.5,
        "text-offset": [0, 1.25],
        "text-anchor": "top",
        "text-font": ["Noto Sans Bold"],
        "text-max-width": 8,
      },
      paint: {
        "text-color": dark() ? "#efece6" : "#1c1b19",
        "text-halo-color": dark() ? "#1b1b19" : "#ffffff",
        "text-halo-width": 1.6,
      },
    });

    let picked: string | undefined;
    map.on("click", "shops", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      if (picked) map.setFeatureState({ source: "shops", id: picked }, { picked: false });
      picked = f.properties.slug;
      map.setFeatureState({ source: "shops", id: picked }, { picked: true });
      map.flyTo({ center: (f.geometry as any).coordinates, zoom: Math.max(map.getZoom(), 17), speed: 0.9 });
      onPick(f.properties.slug);
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

export function showMe(map: MLMap, lng: number, lat: number) {
  const data: any = { type: "Point", coordinates: [lng, lat] };
  const src = map.getSource("me") as any;
  if (src) src.setData(data);
  else {
    map.addSource("me", { type: "geojson", data });
    map.addLayer({ id: "me-halo", type: "circle", source: "me", paint: { "circle-radius": 18, "circle-color": "#1f5aa6", "circle-opacity": 0.18 } });
    map.addLayer({ id: "me", type: "circle", source: "me", paint: { "circle-radius": 7, "circle-color": "#1f5aa6", "circle-stroke-width": 2.5, "circle-stroke-color": "#fff" } });
  }
  map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15.5) });
}

export function filterMap(map: MLMap, visible: string[]) {
  if (!map.getLayer("shops")) return;
  const f: any = ["in", ["get", "slug"], ["literal", visible]];
  map.setFilter("shops", f);
  map.setFilter("shop-names", f);
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
          "fill-extrusion-color": dark() ? "#3a3935" : "#dcd8cf",
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
