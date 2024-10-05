import { Tooltip } from "bootstrap"
import i18next from "i18next"
import * as maplibregl from "maplibre-gl"
import { toggleRightbar } from "./_right-sidebar"
const sidebarToggleContainers = []

// TODO: accual layer selection

export const getChangeLayerButton = (map) => {
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

    return button
}
