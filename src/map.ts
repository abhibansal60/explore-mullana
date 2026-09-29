import type { Map as MLMap } from "maplibre-gl";

type Point = { slug: string; name: string; cat: string; lat: number; lng: number };

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const CENTER: [number, number] = [77.047, 30.2755];

export async function initMap(el: HTMLElement, points: Point[]) {
  // Loaded only after the list is on screen, so the list never waits on WebGL.
  const [maplibregl, { default: workerUrl }] = await Promise.all([
    import("maplibre-gl"),
    // MapLibre 6 loads its worker from a sibling file; bundle it so the import resolves.
    import("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"),
    import("maplibre-gl/dist/maplibre-gl.css"),
  ]);
  maplibregl.setWorkerUrl(workerUrl);
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  const map = new maplibregl.Map({ container: el, style: STYLE, center: CENTER, zoom: 15.6, attributionControl: false });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

  map.on("load", () => {
    map.addSource("shops", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: points.map((p) => ({
          type: "Feature",
          properties: { slug: p.slug, name: p.name, cat: p.cat },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        })),
      },
    });
    map.addLayer({
      id: "shops",
      type: "circle",
      source: "shops",
      paint: { "circle-radius": 8, "circle-color": accent, "circle-stroke-width": 2, "circle-stroke-color": "#fff" },
    });
    map.addLayer({
      id: "shop-names",
      type: "symbol",
      source: "shops",
      layout: { "text-field": ["get", "name"], "text-size": 12, "text-offset": [0, 1.3], "text-anchor": "top", "text-font": ["Noto Sans Regular"] },
      paint: { "text-color": "#16181d", "text-halo-color": "#fff", "text-halo-width": 1.5 },
    });
    map.on("click", "shops", (e) => {
      const slug = e.features?.[0]?.properties?.slug;
      document.querySelector(`.card[data-slug="${slug}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    map.on("mouseenter", "shops", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "shops", () => (map.getCanvas().style.cursor = ""));
  });
  return map;
}

export function filterMap(map: MLMap, visible: string[]) {
  if (!map.getLayer("shops")) return;
  const f: any = ["in", ["get", "slug"], ["literal", visible]];
  map.setFilter("shops", f);
  map.setFilter("shop-names", f);
}

export async function toggle3D(map: MLMap) {
  if (!map.getSource("buildings")) {
    map.addSource("buildings", { type: "geojson", data: "/buildings.geojson" });
    map.addLayer(
      {
        id: "buildings-3d",
        type: "fill-extrusion",
        source: "buildings",
        paint: {
          "fill-extrusion-color": "#d9d4cc",
          "fill-extrusion-height": ["get", "h"],
          "fill-extrusion-opacity": 0.9,
        },
      },
      "shops",
    );
  }
  const on = map.getLayoutProperty("buildings-3d", "visibility") !== "none" && map.getPitch() > 0;
  map.setLayoutProperty("buildings-3d", "visibility", on ? "none" : "visible");
  map.easeTo(on ? { pitch: 0, bearing: 0 } : { pitch: 58, bearing: -25, zoom: 16.4 });
  return !on;
}
