import * as maplibregl from "maplibre-gl"
import { ControlGroup } from "./_controls"
import { getGeolocateControl } from "./_geolocate-control"
import { getChangeLayerButton } from "./_layers-change"

const getMainMap = (container) => {
    console.debug("Initializing main map")

    const map = new maplibregl.Map({
        container: container,
        center: [0, 0],
        zoom: 13,
        hash: false,
        attributionControl: {
            position: "top-left",
            // TODO: propper attribution
            // TODO: import map styles
            customAttribution: "© OpenStreetMap contributors",
            compact: false,
        },
        style: {
            id: "raster",
            version: 8,
            center: [0, 0],
            zoom: 0,
            sources: {
                "raster-tiles": {
                    type: "raster",
                    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                    tileSize: 256,
                    minzoom: 0,
                    maxzoom: 19,
                },
            },
            layers: [
                {
                    id: "background",
                    type: "background",
                    paint: {
                        "background-color": "#e0dfdf",
                    },
                },
                {
                    id: "simple-tiles",
                    type: "raster",
                    source: "raster-tiles",
                },
            ],
        },
    })

    map.addControl(new maplibregl.NavigationControl())
    map.addControl(new ControlGroup([getGeolocateControl, getChangeLayerButton]))
}

export const configureMainMap = (container) => {
    const map = getMainMap(container)
    return map
}