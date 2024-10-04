import { Tooltip } from "bootstrap"
import i18next from "i18next"
import * as maplibregl from "maplibre-gl"
import { toggleRightbar } from "./_right-sidebar"
const sidebarToggleContainers = []

// TODO: accual layer selection

export const getChangeLayerButton = (map) => {
    const button = document.createElement("button")
    const icon = document.createElement("img")
    button.appendChild(icon)
    button.className = "control-button"

    button.onclick = () => toggleRightbar("layers")

    return button
}
