import * as maplibregl from "maplibre-gl"
import { Tooltip } from "bootstrap"
import i18next from "i18next"

export class NavigationControl extends maplibregl.NavigationControl {
    onAdd(map) {
        const container = super.onAdd(map)
        console.log(this)
        new Tooltip(this._zoomInButton, {
            title: i18next.t("javascripts.map.zoom.in"),
            placement: "left",
        })
        new Tooltip(this._zoomOutButton, {
            title: i18next.t("javascripts.map.zoom.out"),
            placement: "left",
        })
        new Tooltip(this._compass, {
            title: i18next.t("javascripts.map.rotate"),
            placement: "left",
        })


        return container
    }
}
