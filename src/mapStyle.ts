import type { StyleSpecification } from "maplibre-gl";

/** Zenly-like palette: warm pastel land, saturated water and parks, white roads. */
const C = {
  land: "#f6f0e2", residential: "#f1e9d6", park: "#9fe07c", wood: "#7fd06a", grass: "#b9ec95", sand: "#f7e2a8",
  water: "#5fc6f6", waterLine: "#48b4ea", road: "#ffffff", roadCase: "#e6dcc3", major: "#ffd85e", majorCase: "#f2b938",
  rail: "#d9cfe8", building: "#fff8fb", buildingSide: "#d9c8f4", label: "#3d3a5c", halo: "#ffffff",
};
const FONT_BOLD = ["Noto Sans Bold"], FONT = ["Noto Sans Regular"];
export function zenlyStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    // Soft sky and haze at the horizon when the camera is tilted.
    sky: { "sky-color": "#a9dcff", "horizon-color": "#fdf6ea", "fog-color": "#f6f0e2", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.7, "fog-ground-blend": 0.85 },
    sources: { omt: { type: "vector", url: "https://tiles.openfreemap.org/planet", attribution: '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>' } },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": C.land } },
      { id: "residential", type: "fill", source: "omt", "source-layer": "landuse", filter: ["in", ["get", "class"], ["literal", ["residential", "suburb", "neighbourhood"]]], paint: { "fill-color": C.residential } },
      { id: "park", type: "fill", source: "omt", "source-layer": "park", paint: { "fill-color": C.park } },
      { id: "landcover", type: "fill", source: "omt", "source-layer": "landcover", paint: { "fill-color": ["match", ["get", "class"], "wood", C.wood, "grass", C.grass, "sand", C.sand, C.grass], "fill-opacity": 0.9 } },
      { id: "landuse-green", type: "fill", source: "omt", "source-layer": "landuse", filter: ["in", ["get", "class"], ["literal", ["cemetery", "stadium", "pitch", "playground", "garden"]]], paint: { "fill-color": C.grass } },
      { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": C.water } },
      { id: "waterway", type: "line", source: "omt", "source-layer": "waterway", paint: { "line-color": C.waterLine, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 16, 4] } },
      { id: "rail", type: "line", source: "omt", "source-layer": "transportation", filter: ["==", ["get", "class"], "rail"], paint: { "line-color": C.rail, "line-width": 2, "line-dasharray": [2, 2] } },
      { id: "road-case", type: "line", source: "omt", "source-layer": "transportation", filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary", "minor", "service", "street"]]], layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["match", ["get", "class"], ["motorway", "trunk", "primary"], C.majorCase, C.roadCase], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 10, ["match", ["get", "class"], ["motorway", "trunk"], 3, "primary", 2.4, 1], 17, ["match", ["get", "class"], ["motorway", "trunk"], 28, "primary", 22, ["secondary", "tertiary"], 18, 12]] } },
      { id: "road", type: "line", source: "omt", "source-layer": "transportation", filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary", "minor", "service", "street"]]], layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["match", ["get", "class"], ["motorway", "trunk", "primary"], C.major, C.road], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 10, ["match", ["get", "class"], ["motorway", "trunk"], 2, "primary", 1.6, 0.5], 17, ["match", ["get", "class"], ["motorway", "trunk"], 22, "primary", 17, ["secondary", "tertiary"], 14, 9]] } },
      { id: "bridge-path", type: "line", source: "omt", "source-layer": "transportation", filter: ["==", ["get", "class"], "path"], minzoom: 15, paint: { "line-color": "#ffffff", "line-width": 1.5, "line-dasharray": [1, 1.5] } },
      { id: "building", type: "fill-extrusion", source: "omt", "source-layer": "building", minzoom: 13,
        paint: { "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 6], 0, C.building, 60, C.buildingSide],
          "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 14.5, ["coalesce", ["get", "render_height"], 6]], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": 0.92 } },
      { id: "water-name", type: "symbol", source: "omt", "source-layer": "water_name", layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": FONT, "text-size": 12, "symbol-placement": "line", "text-letter-spacing": 0.15 }, paint: { "text-color": "#1f78b4", "text-halo-color": "#bfe8ff", "text-halo-width": 1.2 } },
      { id: "road-name", type: "symbol", source: "omt", "source-layer": "transportation_name", minzoom: 14, layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": FONT, "text-size": 11, "symbol-placement": "line" }, paint: { "text-color": "#8a7f63", "text-halo-color": C.halo, "text-halo-width": 1.5 } },
      { id: "place", type: "symbol", source: "omt", "source-layer": "place", filter: ["in", ["get", "class"], ["literal", ["city", "town", "suburb", "neighbourhood", "quarter"]]],
        layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": FONT_BOLD, "text-transform": "uppercase", "text-letter-spacing": 0.08, "text-size": ["match", ["get", "class"], "city", 16, "town", 14, 11] },
        paint: { "text-color": C.label, "text-halo-color": C.halo, "text-halo-width": 2 } },
    ],
  };
}

