import { Tooltip } from "bootstrap"
import i18next from "i18next"
import * as maplibregl from "maplibre-gl"
import { toggleRightbar } from "./_right-sidebar"

// TODO: accual layer selection

export const getShowLegendButton = (map) => {
    const button = document.createElement("button")
    const icon = document.createElement("span")
    icon.classList = "icon legend"

    button.appendChild(icon)
    button.className = "control-button"

    button.onclick = () => toggleRightbar("legend")

    new Tooltip(button, {
        title: i18next.t("javascripts.key.title"),
        placement: "left",
    })

    return button
}
