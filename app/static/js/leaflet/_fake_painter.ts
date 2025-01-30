import { Painter, type RenderOptions } from "../../../../../node_modules/maplibre-gl/src/render/painter.ts"
import { SourceCache } from "../../../../../node_modules/maplibre-gl/src/render/../source/source_cache"
import { drawSymbols } from "../../../../../node_modules/maplibre-gl/src/render/./draw_symbol"
import { drawCircles } from "../../../../../node_modules/maplibre-gl/src/render/./draw_circle"
import { drawHeatmap } from "../../../../../node_modules/maplibre-gl/src/render/./draw_heatmap"
import { drawLine } from "../../../../../node_modules/maplibre-gl/src/render/./draw_line"
import { drawFill } from "../../../../../node_modules/maplibre-gl/src/render/./draw_fill"
import { drawFillExtrusion } from "../../../../../node_modules/maplibre-gl/src/render/./draw_fill_extrusion"
import { drawHillshade } from "../../../../../node_modules/maplibre-gl/src/render/./draw_hillshade"
import { drawRaster } from "../../../../../node_modules/maplibre-gl/src/render/./draw_raster"
import { drawBackground } from "../../../../../node_modules/maplibre-gl/src/render/./draw_background"
import { drawCustom } from "../../../../../node_modules/maplibre-gl/src/render/./draw_custom"
import { type OverscaledTileID } from "../../../../../node_modules/maplibre-gl/src/render/../source/tile_id"
import type { StyleLayer } from "../../../../../node_modules/maplibre-gl/src/render/../style/style_layer"
import { isSymbolStyleLayer } from "../../../../../node_modules/maplibre-gl/src/render/../style/style_layer/symbol_style_layer"
import { isCircleStyleLayer } from "../../../../../node_modules/maplibre-gl/src/render/../style/style_layer/circle_style_layer"
import { isHeatmapStyleLayer } from "../../../../../node_modules/maplibre-gl/src/render/../style/style_layer/heatmap_style_layer"
import { isLineStyleLayer } from "../../../../../node_modules/maplibre-gl/src/render/../style/style_layer/line_style_layer"
import { isFillStyleLayer } from "../../../../../node_modules/maplibre-gl/src/render/../style/style_layer/fill_style_layer"
import { isFillExtrusionStyleLayer } from "../../../../../node_modules/maplibre-gl/src/render/../style/style_layer/fill_extrusion_style_layer"
import { isHillshadeStyleLayer } from "../../../../../node_modules/maplibre-gl/src/render/../style/style_layer/hillshade_style_layer"
import { isRasterStyleLayer } from "../../../../../node_modules/maplibre-gl/src/render/../style/style_layer/raster_style_layer"
import { isBackgroundStyleLayer } from "../../../../../node_modules/maplibre-gl/src/render/../style/style_layer/background_style_layer"
import { isCustomStyleLayer } from "../../../../../node_modules/maplibre-gl/src/render/../style/style_layer/custom_style_layer"
import type { LineStyleLayer } from "../../../../../node_modules/maplibre-gl/src/render/../style/style_layer/line_style_layer"
import { DepthMode } from "../../../../../node_modules/maplibre-gl/src/render/../gl/depth_mode"
import type { LineBucket } from "../../../../../node_modules/maplibre-gl/src/render/../data/bucket/line_bucket"





// https://github.com/maplibre/maplibre-gl-js/blob/main/developer-guides/life-of-a-tile.md

export const makePainter = (_this: Painter, list: SVGImageElement[]) => {
    return (
        painter: Painter,
        sourceCache: SourceCache,
        layer: StyleLayer,
        coords: OverscaledTileID[],
        renderOptions: RenderOptions,
    ) => {
        if (layer.isHidden(_this.transform.zoom)) return
        if (layer.type !== "background" && layer.type !== "custom" && !(coords || []).length) return
        _this.id = layer.id
        const gl = _this.context.gl

        console.info("Rendering", layer.type, layer.id)

        const rasterLayer = () => {
            const canvas: HTMLCanvasElement = _this.context.gl.canvas
            const uri = canvas.toDataURL("image/webp")
            const image = document.createElementNS("http://www.w3.org/2000/svg", "image")
            image.setAttribute("x", "0")
            image.setAttribute("y", "0")
            image.setAttribute("width", `${canvas.width}`)
            image.setAttribute("height", `${canvas.height}`)
            image.setAttribute("href", uri)
            list.push(image)
        }

        const drawLine = (
            painter: Painter,
            sourceCache: SourceCache,
            layer: LineStyleLayer,
            coords: Array<OverscaledTileID>,
            renderOptions: RenderOptions,
        ) => {
            const opacity = layer.paint.get("line-opacity")
            const width = layer.paint.get("line-width")
            if (opacity.constantOr(1) === 0 || width.constantOr(1) === 0) return

            const depthMode = painter.getDepthModeForSublayer(0, DepthMode.ReadOnly)
            const colorMode = painter.colorModeForRenderPass()

            const dasharray = layer.paint.get("line-dasharray")
            const patternProperty = layer.paint.get("line-pattern")
            const image = patternProperty.constantOr(1 as any)

            const gradient = layer.paint.get("line-gradient")
            const crossfade = layer.getCrossfadeParameters()

            const programId = image ? "linePattern" : dasharray ? "lineSDF" : gradient ? "lineGradient" : "line"

            const context = painter.context
            const gl = context.gl
            const transform = painter.transform

            let firstTile = true

            for (const coord of coords) {
                const tile = sourceCache.getTile(coord)
                if (image && !tile.patternsLoaded()) continue

                const bucket: LineBucket = tile.getBucket(layer) as any
                if (!bucket) continue

                const projectionData = transform.getProjectionData({
                    overscaledTileID: coord,
                    applyGlobeMatrix: false, //!! Change after https://github.com/openstreetmap-ng/openstreetmap-ng/issues/154
                    applyTerrainMatrix: true,
                })

                const pixelRatio = transform.getPixelScale()

                console.log(projectionData, coord)

            }
        }

        gl.clearColor(0.0, 0.0, 0.0, 0.0) // transparent
        gl.clearDepth(1.0)
        gl.clearStencil(0)

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT) // Clear all buffers

        if (isSymbolStyleLayer(layer)) {
            drawSymbols(painter, sourceCache, layer, coords, _this.style.placement.variableOffsets, renderOptions)
        } else if (isCircleStyleLayer(layer)) {
            drawCircles(painter, sourceCache, layer, coords, renderOptions)
        } else if (isHeatmapStyleLayer(layer)) {
            drawHeatmap(painter, sourceCache, layer, coords, renderOptions)
            rasterLayer()
        } else if (isLineStyleLayer(layer)) {
            console.log(coords)
            drawLine(painter, sourceCache, layer, coords, renderOptions)
        } else if (isFillStyleLayer(layer)) {
            drawFill(painter, sourceCache, layer, coords, renderOptions)
        } else if (isFillExtrusionStyleLayer(layer)) {
            drawFillExtrusion(painter, sourceCache, layer, coords, renderOptions)
        } else if (isHillshadeStyleLayer(layer)) {
            drawHillshade(painter, sourceCache, layer, coords, renderOptions)
            rasterLayer()
        } else if (isRasterStyleLayer(layer)) {
            drawRaster(painter, sourceCache, layer, coords, renderOptions)
            rasterLayer()
        } else if (isBackgroundStyleLayer(layer)) {
            drawBackground(painter, sourceCache, layer, coords, renderOptions)
            rasterLayer() // TODO: create a big rectangle filled with collor
        } else if (isCustomStyleLayer(layer)) {
            drawCustom(painter, sourceCache, layer, renderOptions)
            rasterLayer()
        }
    }
}
