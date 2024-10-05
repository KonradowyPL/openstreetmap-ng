import i18next from "i18next"
import * as maplibregl from "maplibre-gl"
import { thunderforestApiKey, tracestrackApiKey } from "../_api-keys.js"
import "../_types.js"

const copyrightText = i18next.t("javascripts.map.openstreetmap_contributors")
const copyright = `© <a href="/copyright" rel="license" target="_blank">${copyrightText}</a>`
const termsText = i18next.t("javascripts.map.website_and_api_terms")
const terms = `<a href="https://osmfoundation.org/wiki/Terms_of_Use" rel="terms-of-service" target="_blank">${termsText}</a>`

const donateTitle = i18next.t("layouts.make_a_donation.title")
const donateText = i18next.t("layouts.make_a_donation.text")

const osmFranceText = i18next.t("javascripts.map.osm_france")
const osmFranceLink = `<a href="https://www.openstreetmap.fr" target="_blank">${osmFranceText}</a>`

const cyclosmText = i18next.t("javascripts.map.cyclosm_name")
const cyclosmLink = `<a href="https://www.cyclosm.org" target="_blank">${cyclosmText}</a>`
const cyclosmCredit = i18next.t("javascripts.map.cyclosm_credit", {
    // biome-ignore lint/style/useNamingConvention:
    cyclosm_link: cyclosmLink,
    // biome-ignore lint/style/useNamingConvention:
    osm_france_link: osmFranceLink,
    interpolation: { escapeValue: false },
})

const thunderforestText = i18next.t("javascripts.map.andy_allan")
const thunderforestLink = `<a href="https://www.thunderforest.com" target="_blank">${thunderforestText}</a>`
const thunderforestCredit = i18next.t("javascripts.map.thunderforest_credit", {
    // biome-ignore lint/style/useNamingConvention:
    thunderforest_link: thunderforestLink,
    interpolation: { escapeValue: false },
})

const tracestrackText = i18next.t("javascripts.map.tracestrack")
const tracestrackLink = `<a href="https://www.tracestrack.com" target="_blank">${tracestrackText}</a>`
const tracestrackCredit = i18next.t("javascripts.map.tracestrack_credit", {
    // biome-ignore lint/style/useNamingConvention:
    tracestrack_link: tracestrackLink,
    interpolation: { escapeValue: false },
})

const hotosmText = i18next.t("javascripts.map.hotosm_name")
const hotosmLink = `<a href="https://www.hotosm.org" target="_blank">${hotosmText}</a>`
const hotosmCredit = i18next.t("javascripts.map.hotosm_credit", {
    // biome-ignore lint/style/useNamingConvention:
    hotosm_link: hotosmLink,
    // biome-ignore lint/style/useNamingConvention:
    osm_france_link: osmFranceLink,
    interpolation: { escapeValue: false },
})

export const layers = {
    standardLayer: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,
        layerCode: "",
        versitile: true,
        attribution: `${copyright} ♥ <a class="donate" href="https://supporting.openstreetmap.org" target="_blank" title="${donateTitle}">${donateText}</a>. ${terms}`,
    },
    cyclosm: {
        type: "raster",
        tiles: [
            "https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
            "https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
            "https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        maxzoom: 20,
        layerCode: "Y",
        attribution: `${copyright}. ${cyclosmCredit}. ${terms}`,
    },
    cycleMap: {
        type: "raster",
        tiles: [
            `https://tile.thunderforest.com/cycle/{z}/{x}/{y}@2x.png?apikey=${thunderforestApiKey}`,
        ],
        tileSize: 256,
        maxzoom: 21, // supports up to 22
        layerCode: "C",
        attribution: `${copyright}. ${thunderforestCredit}. ${terms}`,
    },
    transportMap: {
        type: "raster",
        tiles: [
            `https://tile.thunderforest.com/transport/{z}/{x}/{y}@2x.png?apikey=${thunderforestApiKey}`,
        ],
        tileSize: 256,
        maxzoom: 21, // supports up to 22
        layerCode: "T",
        attribution: `${copyright}. ${thunderforestCredit}. ${terms}`,
    },
    tracestrackTopo: {
        type: "raster",
        tiles: [
            `https://tile.tracestrack.com/topo__/{z}/{x}/{y}.png?key=${tracestrackApiKey}`,
        ],
        tileSize: 256,
        maxzoom: 19,
        layerCode: "P",
        attribution: `${copyright}. ${tracestrackCredit}. ${terms}`,
    },
    hotosm: {
        type: "raster",
        tiles: [
            "https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        maxzoom: 20,
        layerCode: "H",
        attribution: `${copyright}. ${hotosmCredit}. ${terms}`,
    },
}
