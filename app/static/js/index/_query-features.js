import i18next from "i18next"
import * as L from "leaflet"
import { qsEncode, qsParse } from "../_qs.js"
import { getPageTitle } from "../_title.js"
import { isLatitude, isLongitude } from "../_utils.js"
import { focusMapObject, focusStyles } from "../leaflet/_focus-layer.js"
import { getActionSidebar, switchActionSidebar } from "./_action-sidebar.js"

/**
 * Create a new query features controller
 * @param {L.Map} map Leaflet map
 * @returns {object} Controller
 */
export const getQueryFeaturesController = (map) => {
    const sidebar = getActionSidebar("query-features")
    const sidebarTitle = sidebar.querySelector(".sidebar-title").textContent
    const nearbyContainer = sidebar.querySelector(".nearby-container")
    const nearbyLoadingHtml = nearbyContainer.innerHTML
    const enclosingContainer = sidebar.querySelector(".enclosing-container")
    const enclosingLoadingHtml = enclosingContainer.innerHTML
    const emptyText = i18next.t("javascripts.query.nothing_found")

    let abortController = null

    // Get query position from URL
    const getQueryPosition = () => {
        const searchParams = qsParse(location.search.substring(1))
        if (searchParams.lon && searchParams.lat) {
            const lon = Number.parseFloat(searchParams.lon)
            const lat = Number.parseFloat(searchParams.lat)

            if (isLongitude(lon) && isLatitude(lat)) {
                const zoom = map.getZoom()
                return { lon, lat, zoom }
            }
        }

        return null
    }

    // Configure result actions to handle focus and clicks
    const configureResultActions = (container) => {
        const resultActions = container.querySelectorAll(".social-action")

        for (const resultAction of resultActions) {
            // Get params
            const params = JSON.parse(resultAction.dataset.params)
            const mainElementType = params.type
            const mainElementId = params.id
            const elements = params.elements

            // TODO: leaflet elements
            const elementMap = parseElements(elements)
            const mainElement = elementMap[mainElementType].get(mainElementId)

            // TODO: check event order on high activity
            // On hover, focus on the element
            const onResultActionMouseEnter = () => {
                focusMapObject(map, mainElement)
            }

            // On hover end, unfocus the element
            const onResultActionMouseLeave = () => {
                focusMapObject(map, null)
            }

            // Listen for events
            resultAction.addEventListener("mouseenter", onResultActionMouseEnter)
            resultAction.addEventListener("mouseleave", onResultActionMouseLeave)
        }
    }

    // On sidebar loading, display loading content and show map animation
    const onSidebarLoading = (latLng, zoom, abortSignal) => {
        nearbyContainer.innerHTML = nearbyLoadingHtml
        enclosingContainer.innerHTML = enclosingLoadingHtml

        // Fade out circle in steps
        const radius = 10 * 1.5 ** (19 - zoom)
        const circle = L.circle(latLng, { ...focusStyles.element, radius })
        const steps = 25
        const stepDuration = 30
        const opacityStep = 1 / steps
        // total: 750ms
        // TODO: reduced motion

        let opacity = focusStyles.element.opacity

        const fadeOut = () => {
            opacity = Math.max(0, opacity - opacityStep)
            circle.setStyle({ opacity })
            if (opacity > 0.01 && !abortSignal.aborted) setTimeout(fadeOut, stepDuration)
            else map.removeLayer(circle)
        }

        map.addLayer(circle)
        setTimeout(fadeOut, stepDuration)
    }

    // On sidebar loaded, display content
    const onSidebarNearbyLoaded = (html) => {
        nearbyContainer.innerHTML = html
        configureResultActions(nearbyContainer)
    }
    const onSidebarEnclosingLoaded = (html) => {
        enclosingContainer.innerHTML = html
    }

    // TODO: on tab close, disable query mode

    return {
        load: () => {
            switchActionSidebar(map, "query-features")
            document.title = getPageTitle(sidebarTitle)

            const position = getQueryPosition()
            if (!position) {
                nearbyContainer.textContent = emptyText
                enclosingContainer.textContent = emptyText
                return
            }

            const { lon, lat, zoom } = position

            // Focus on the query area if it's offscreen
            const latLng = L.latLng(lat, lon)
            if (!map.getBounds().contains(latLng)) {
                map.panTo(latLng, { animate: false })
            }

            if (abortController) abortController.abort()
            abortController = new AbortController()
            const abortSignal = abortController.signal

            onSidebarLoading(latLng, zoom, abortSignal)

            // Fetch nearby features
            const queryString = qsEncode({ lon, lat, zoom })

            fetch(`/api/partial/query/nearby?${queryString}`, {
                method: "GET",
                mode: "same-origin",
                cache: "no-store", // request params are too volatile to cache
                signal: abortSignal,
                priority: "high",
            })
                .then(async (resp) => {
                    onSidebarNearbyLoaded(await resp.text())
                })
                .catch((error) => {
                    if (error.name === "AbortError") return
                    console.error("Failed to fetch nearby features", error)
                    // TODO: nicer error html
                    onSidebarNearbyLoaded(
                        i18next.t("javascripts.query.error", {
                            server: "OpenStreetMap",
                            error: error.message,
                        }),
                    )
                })

            // Fetch enclosing features
            fetch(`/api/partial/query/enclosing?${queryString}`, {
                method: "GET",
                mode: "same-origin",
                cache: "no-store", // request params are too volatile to cache
                signal: abortSignal,
                priority: "high",
            })
                .then(async (resp) => {
                    onSidebarEnclosingLoaded(await resp.text())
                })
                .catch((error) => {
                    if (error.name === "AbortError") return
                    console.error("Failed to fetch enclosing features", error)
                    onSidebarEnclosingLoaded(
                        i18next.t("javascripts.query.error", {
                            server: "OpenStreetMap",
                            error: error.message,
                        }),
                    )
                })
        },
        unload: () => {
            if (abortController) abortController.abort()
            abortController = null
            focusMapObject(map, null)
        },
    }
}
