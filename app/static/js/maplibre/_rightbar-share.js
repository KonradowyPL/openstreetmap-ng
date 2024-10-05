import { Tooltip } from "bootstrap"
import i18next from "i18next"
import * as maplibregl from "maplibre-gl"
import { toggleRightbar } from "./_right-sidebar"

// TODO: accual accually ability to share lol

export const getShareButton = (map) => {
    const button = document.createElement("button")
    const icon = document.createElement("span")
    icon.classList = "icon share"

    button.appendChild(icon)
    button.className = "control-button"

    button.onclick = () => toggleRightbar("share")

    new Tooltip(button, {
        title: i18next.t("javascripts.share.title"),
        placement: "left",
    })

    return button
}
