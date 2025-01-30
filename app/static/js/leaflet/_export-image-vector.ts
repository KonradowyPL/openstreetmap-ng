import type { Map as MaplibreMap } from "maplibre-gl"
import { makePainter } from "./_fake_painter"

export const exportMapImage = (mimeType: string, map: MaplibreMap): void => {
    const list: SVGImageElement[] = []
    const oryginal = map.painter.renderLayer
    map.painter.renderLayer = makePainter(map.painter, list)
    map.redraw()
    console.log(list)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")




    // save svg as blob
    svg.append(...list)
    svg.setAttribute("width", String(map.getCanvas().width))
    svg.setAttribute("height", String(map.getCanvas().height))
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    const container = document.createElement("div")
    container.appendChild(svg)
    const blob = new Blob([container.innerHTML], { type: "image/svg+xml" })
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");

    map.painter.renderLayer = oryginal
}

window.exportMapImage = exportMapImage
