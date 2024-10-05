import { Tooltip } from "bootstrap"
import i18next from "i18next"
import * as maplibregl from "maplibre-gl"
import { toggleRightbar, getRightBar } from "./_right-sidebar"

// TODO: accual layer selection

export const getChangeLayerButton = (map) => {
    const page = getRightBar("layers")
    const layers = page.querySelectorAll(".layer")

    const button = document.createElement("button")
    const icon = document.createElement("span")
    icon.classList = "icon layers"

    button.appendChild(icon)
    button.className = "control-button"

    button.onclick = () => toggleRightbar("layers")

    new Tooltip(button, {
        title: i18next.t("javascripts.map.layers.title"),
        placement: "left",
    })

    map.on("load", () => {
        for (const layer of layers) {
            layer.onclick = () => {
                map.removeLayer("main-map")
                map.addLayer({
                    id: "main-map",
                    type: "raster",
                    source: layer.dataset.layerId,
                })
            }
        }
    })

    return button
}
