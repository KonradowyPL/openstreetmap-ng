import * as maplibregl from "maplibre-gl"
import i18next from "i18next"
import { Tooltip } from "bootstrap"

// TODO: make button accually work lol
export const getGeolocateControl = (map) => {
    const button = document.createElement("button")
    const icon = document.createElement("img")
    button.appendChild(icon)
    button.className = "control-button"
    icon.classList = "icon geolocate"
    icon.src = "/static/img/leaflet/geolocate.webp"

    new Tooltip(button, {
        title: i18next.t("javascripts.map.locate.title"),
        placement: "left",
    })

    return button
}
