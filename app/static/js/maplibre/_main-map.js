import * as maplibregl from "maplibre-gl"
import { ControlGroup } from "./_controls"
import { getGeolocateControl } from "./_rightbar_geolocate"
import { getChangeLayerButton } from "./_rightbar-layer"
import { getShowLegendButton } from "./_rightbar-legend"
import { getShareButton } from "./_rightbar-share"
import { NavigationControl } from "./_navigation-control"
import { layers } from "./_layers"


const getMainMap = (container) => {
    console.debug("Initializing main map")

    const map = new maplibregl.Map({
        container: container,
        center: [0, 0],
        zoom: 13,
        hash: false,
        attributionControl: {
            compact: false,
        },
        style: {
            id: "raster",
            version: 8,
            center: [0, 0],
            zoom: 0,
            sources: layers,
            layers: [
                {
                    id: "background",
                    type: "background",
                    paint: {
                        "background-color": "#e0dfdf",
                    },
                },
                {
                    id: "main-map",
                    type: "raster",
                    source: "standardLayer",
                },
            ],
        },
    })

    window.map = map
    map.addControl(new NavigationControl())
    map.addControl(new ControlGroup([getGeolocateControl, getChangeLayerButton, getShowLegendButton, getShareButton]))

    map.on("load", () => {
        console.debug("Map has fully loaded!")
    })
}

export const configureMainMap = (container) => {
    const map = getMainMap(container)
    return map
}
