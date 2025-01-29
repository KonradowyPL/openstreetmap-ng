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

export const makePainter = (_this: Painter) => {
    return (
        painter: Painter,
        sourceCache: SourceCache,
        layer: StyleLayer,
        coords: Array<OverscaledTileID>,
        renderOptions: RenderOptions,
    ) => {
        if (layer.isHidden(_this.transform.zoom)) return
        if (layer.type !== "background" && layer.type !== "custom" && !(coords || []).length) return
        _this.id = layer.id

        if (isSymbolStyleLayer(layer)) {
            drawSymbols(painter, sourceCache, layer, coords, _this.style.placement.variableOffsets, renderOptions)
        } else if (isCircleStyleLayer(layer)) {
            drawCircles(painter, sourceCache, layer, coords, renderOptions)
        } else if (isHeatmapStyleLayer(layer)) {
            drawHeatmap(painter, sourceCache, layer, coords, renderOptions)
        } else if (isLineStyleLayer(layer)) {
            drawLine(painter, sourceCache, layer, coords, renderOptions)
        } else if (isFillStyleLayer(layer)) {
            drawFill(painter, sourceCache, layer, coords, renderOptions)
        } else if (isFillExtrusionStyleLayer(layer)) {
            drawFillExtrusion(painter, sourceCache, layer, coords, renderOptions)
        } else if (isHillshadeStyleLayer(layer)) {
            drawHillshade(painter, sourceCache, layer, coords, renderOptions)
        } else if (isRasterStyleLayer(layer)) {
            drawRaster(painter, sourceCache, layer, coords, renderOptions)
        } else if (isBackgroundStyleLayer(layer)) {
            drawBackground(painter, sourceCache, layer, coords, renderOptions)
        } else if (isCustomStyleLayer(layer)) {
            drawCustom(painter, sourceCache, layer, renderOptions)
        }
    }
}
