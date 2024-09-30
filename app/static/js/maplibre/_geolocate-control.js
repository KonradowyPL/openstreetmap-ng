import * as maplibregl from "maplibre-gl"
import i18next from "i18next"
import { Tooltip } from "bootstrap"

// TODO: make button accually work lol
export const getGeolocateControl = (map) => {
    class GeolocationControl {
        onAdd(map) {
            this._map = map
            this._container = document.createElement("div")
            this._container.className = "geolocate maplibregl-ctrl maplibregl-ctrl-group"
            const button = document.createElement("button")
            const icon = document.createElement("img")
            this._container.appendChild(button)
            button.appendChild(icon)
            button.className = "control-button"
            icon.classList = "icon geolocate"
            icon.src = "/static/img/leaflet/geolocate.webp"

            const buttonText = i18next.t("javascripts.map.locate.title")

            new Tooltip(button, {
                title: buttonText,
                placement: "left",
            })

            return this._container
        }

        onRemove() {
            this._container.parentNode.removeChild(this._container)
            this._map = undefined
        }
    }

    return new GeolocationControl()
}
