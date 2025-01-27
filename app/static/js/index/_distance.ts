import type { Feature, LineString } from "geojson"
import {
    type GeoJSONSource,
    type LngLat,
    LngLatBounds,
    type LngLatLike,
    MapMouseEvent,
    type Map as MaplibreMap,
    Marker,
    Point,
} from "maplibre-gl"
import { formatDistance } from "../_format-utils"
import { decodeLonLat, encodeLonLat } from "../_polyline.ts"
import { qsParse } from "../_qs"
import { range, throttle } from "../_utils"
import {
    type LayerId,
    addMapLayer,
    emptyFeatureCollection,
    hasMapLayer,
    layersConfig,
    removeMapLayer,
} from "../leaflet/_layers"
import { closestPointOnSegment, getMarkerIconElement, markerIconAnchor } from "../leaflet/_utils"
import { getActionSidebar, switchActionSidebar } from "./_action-sidebar"
import type { IndexController } from "./_router"

const layerId = "distance" as LayerId
layersConfig.set(layerId as LayerId, {
    specification: {
        type: "geojson",
        data: emptyFeatureCollection,
    },
    layerTypes: ["line"],
    layerOptions: {
        layout: {
            "line-join": "round",
            "line-cap": "round",
        },
        paint: {
            "line-color": "#6ea8fe",
            "line-width": 5,
        },
    },
    priority: 160,
})

/** Controller for distance measurement functionality */
export const getDistanceController = (map: MaplibreMap): IndexController => {
    const mapContainer = map.getContainer()
    const source = map.getSource(layerId) as GeoJSONSource
    const sidebar = getActionSidebar("distance")
    const totalDistanceLabel = sidebar.querySelector(".total-distance")

    const positionsUrl: [number, number][] = []
    const lines: Feature<LineString>[] = []
    const labels: Marker[] = []
    const markers: Marker[] = []
    let ghostMarker: Marker | null = null
    let ghostMarkerIndex = -1

    const markerFactory = (index: number, color: string): Marker => {
        const marker = new Marker({
            anchor: markerIconAnchor,
            element: getMarkerIconElement(color, true),
            className: "distance-marker",
            draggable: true,
        })
        // Listen for events on real markers
        if (index >= 0) {
            // On marker drag, update the state
            const markerDirtyIndex = [index]
            marker.on(
                "drag",
                throttle(() => update(markerDirtyIndex), 16),
            )
            // On marker click, remove that marker
            marker.getElement().addEventListener(
                "click",
                (e) => {
                    e.stopPropagation()
                    removeMarker(index)
                },
                { once: true },
            )
        }
        return marker
    }

    const ghostMarkerFactory = (): Marker => {
        const marker = markerFactory(-1, "blue")
        marker.addClassName("ghost-marker")
        marker.addClassName("hidden")
        marker.setOffset([0, 8])
        marker.on("dragstart", startGhostMarkerDrag)
        marker.on("drag", handleGhostMarkerDrag)
        marker.on("dragend", () => {
            ghostMarker.removeClassName("dragging")
            tryHideGhostMarker()
        })
        const element = marker.getElement()
        element.addEventListener("mousemove", updateGhostMarkerPosition)
        element.addEventListener("mouseleave", tryHideGhostMarker)
        element.addEventListener("click", onGhostMarkerClick)
        return marker
    }

    // Encodes current marker positions into URL polyline parameter
    const updateUrl = throttle((dirtyIndices: number[]): void => {
        const newLength = markers.length
        if (newLength < positionsUrl.length) {
            // Truncate positions
            positionsUrl.length = newLength
        }
        for (const markerIndex of dirtyIndices) {
            const lngLat = markers[markerIndex].getLngLat()
            positionsUrl[markerIndex] = [lngLat.lng, lngLat.lat]
        }
        const url = new URL(window.location.href)
        url.searchParams.set("line", encodeLonLat(positionsUrl, 5))
        window.history.replaceState(null, "", url)
    }, 250)

    // Updates GeoJSON line features between consecutive markers
    const updateLines = (dirtyIndices: number[]): void => {
        const newLength = Math.max(markers.length - 1, 0)
        if (newLength < lines.length) {
            // Truncate lines
            lines.length = newLength
        }
        for (const markerIndex of dirtyIndices) {
            const lineIndex = markerIndex - 1
            if (lineIndex >= lines.length) {
                // Create new line
                lines[lineIndex] = {
                    type: "Feature",
                    id: lineIndex,
                    properties: {},
                    geometry: {
                        type: "LineString",
                        coordinates: [
                            markers[markerIndex - 1].getLngLat().toArray(),
                            markers[markerIndex].getLngLat().toArray(),
                        ],
                    },
                }
            }
            for (const lineIndexOffset of [lineIndex, lineIndex + 1]) {
                // Update existing line (before and after)
                if (lineIndexOffset < 0 || lineIndexOffset >= lines.length) continue
                lines[lineIndexOffset].geometry.coordinates = [
                    markers[lineIndexOffset].getLngLat().toArray(),
                    markers[lineIndexOffset + 1].getLngLat().toArray(),
                ]
            }
        }
        source.setData({
            type: "FeatureCollection",
            features: lines,
        })
    }

    // Updates distance labels and calculates total measurement
    const updateLabels = (dirtyIndices: number[]): void => {
        const newLength = Math.max(markers.length - 1, 0)
        if (newLength < labels.length) {
            // Truncate labels
            for (let i = newLength; i < labels.length; i++) labels[i].remove()
            labels.length = newLength
        }
        for (const markerIndex of dirtyIndices) {
            const labelIndex = markerIndex - 1
            if (labelIndex >= labels.length) {
                // Create new label
                labels[labelIndex] = new Marker({
                    anchor: "center",
                    element: document.createElement("div"),
                    className: "distance-label",
                })
                    .setLngLat([0, 0])
                    .addTo(map)
            }
            for (const labelIndexOffset of [labelIndex, labelIndex + 1]) {
                // Update existing label (before and after)
                if (labelIndexOffset < 0 || labelIndexOffset >= labels.length) continue

                const startPoint = markers[labelIndexOffset].getLngLat()
                const endPoint = markers[labelIndexOffset + 1].getLngLat()
                const middlePoint: LngLatLike = [
                    (startPoint.lng + endPoint.lng) / 2,
                    (startPoint.lat + endPoint.lat) / 2,
                ]
                const startScreenPoint = map.project(startPoint)
                const endScreenPoint = map.project(endPoint)

                let angle = Math.atan2(endScreenPoint.y - startScreenPoint.y, endScreenPoint.x - startScreenPoint.x)
                if (angle > Math.PI / 2) angle -= Math.PI
                if (angle < -Math.PI / 2) angle += Math.PI

                const label = labels[labelIndexOffset]
                label.setLngLat(middlePoint)
                const distance = startPoint.distanceTo(endPoint)
                ;(label as any).distance = distance
                label.setRotation((angle * 180) / Math.PI)
                label.getElement().textContent = formatDistance(distance)
            }
        }
        let totalDistance = 0
        for (const label of labels) totalDistance += (label as any).distance
        totalDistanceLabel.textContent = formatDistance(totalDistance)
    }

    // Schedule updates to all components after marker changes, dirtyIndices must be sorted
    const update = (dirtyIndices: number[]): void => {
        updateUrl(dirtyIndices)
        updateLines(dirtyIndices)
        updateLabels(dirtyIndices)
    }

    // Removes a marker and updates subsequent geometry
    const removeMarker = (index: number): void => {
        console.debug("Remove distance marker", index)
        // Pop tailing markers
        const tail = markers.splice(index + 1)
        {
            // Remove indexed marker
            const marker = markers[index]
            marker.remove()
            markers.length = index
        }
        update([])

        if (tail.length) {
            // Add markers back
            for (const marker of tail) {
                const lngLat = marker.getLngLat()
                marker.remove()
                createNewMarker({ lngLat, skipUpdates: true })
            }
            update(range(index, markers.length))
        } else if (index >= 2) {
            // If no tail, turn previous marker into red
            markers[index - 1].getElement().replaceChildren(...getMarkerIconElement("red", true).children)
        }
    }

    // Inserts new marker at specified position and updates connections
    const insertMarker = (index: number, lngLat: LngLatLike) => {
        console.debug("Insert distance marker", index, lngLat)
        // Pop tailing markers
        const tail = markers.splice(index)
        update([])

        // Add new marker
        createNewMarker({ lngLat, skipUpdates: true })

        // Add markers back
        for (const marker of tail) {
            const markerLngLat = marker.getLngLat()
            marker.remove()
            createNewMarker({ lngLat: markerLngLat, skipUpdates: true })
        }
        update(range(index, markers.length))
    }

    // Adds new endpoint marker and updates visualization
    const createNewMarker = ({ lngLat, skipUpdates }: { lngLat: LngLatLike; skipUpdates?: boolean }): void => {
        // Avoid event handlers after the controller is unloaded
        if (!hasMapLayer(map, layerId)) return
        console.debug("Create distance marker", lngLat, skipUpdates)
        const markerIndex = markers.length
        // Turn previous marker into blue
        if (markerIndex >= 2) {
            markers[markerIndex - 1].getElement().replaceChildren(...getMarkerIconElement("blue", true).children)
        }
        // Create new marker
        const marker = markerFactory(markerIndex, markerIndex === 0 ? "green" : "red")
            .setLngLat(lngLat)
            .addTo(map)
        markers.push(marker)
        if (!skipUpdates) update([markerIndex])
    }

    // Handles ghost marker positioning near existing line segments
    const updateGhostMarkerPosition = throttle((event: MapMouseEvent | MouseEvent): void => {
        if (ghostMarker.getElement().classList.contains("dragging")) return

        let point: Point
        let lngLat: LngLat
        if (event instanceof MapMouseEvent) {
            point = event.point
            lngLat = event.lngLat
        } else {
            const mapRect = mapContainer.getBoundingClientRect()
            point = new Point(
                event.clientX - mapRect.left,
                event.clientY - mapRect.top + 20, // offset for marker height
            )
            lngLat = map.unproject(point)
        }

        let minDistance = Number.POSITIVE_INFINITY
        let minLngLat: LngLat | null = null
        ghostMarkerIndex = -1
        for (let i = 1; i < markers.length; i++) {
            const closestLngLat = map.unproject(
                closestPointOnSegment(
                    point,
                    map.project(markers[i - 1].getLngLat()),
                    map.project(markers[i].getLngLat()),
                ),
            )
            const distance = closestLngLat.distanceTo(lngLat)
            if (distance < minDistance) {
                minDistance = distance
                minLngLat = closestLngLat
                ghostMarkerIndex = i
            }
        }
        if (minLngLat) ghostMarker.setLngLat(minLngLat)
    }, 16)
    map.on("mouseenter", layerId, (e) => {
        tryShowGhostMarker()
        updateGhostMarkerPosition(e)
    })

    /** On ghost marker drag start, replace it with a real marker */
    const startGhostMarkerDrag = () => {
        console.debug("materializeGhostMarker")
        ghostMarker.removeClassName("hidden")
        ghostMarker.addClassName("dragging")
        // Add a real marker
        insertMarker(ghostMarkerIndex, ghostMarker.getLngLat())
    }

    /** On ghost marker drag, update the real marker position */
    const handleGhostMarkerDrag = throttle((e: Event) => {
        if (!ghostMarker.getElement().classList.contains("dragging")) return
        const marker = markers[ghostMarkerIndex]
        marker.setLngLat(ghostMarker.getLngLat())
        marker.fire(e.type, e)
    }, 16)

    /** On ghost marker click, convert it into a real marker */
    const onGhostMarkerClick = () => {
        console.debug("onGhostMarkerClick")
        startGhostMarkerDrag()
        ghostMarker.removeClassName("dragging")
        tryHideGhostMarker()
    }

    /** Toggle ghost marker out of hidden state */
    const tryShowGhostMarker = () => {
        if (!ghostMarker) ghostMarker = ghostMarkerFactory().setLngLat([0, 0]).addTo(map)
        else if (ghostMarker.getElement().classList.contains("dragging")) return
        ghostMarker.removeClassName("hidden")
    }

    /** Toggle ghost marker into hidden state */
    const tryHideGhostMarker = () => {
        if (ghostMarker.getElement().classList.contains("dragging")) return
        ghostMarker.addClassName("hidden")
    }

    return {
        load: () => {
            switchActionSidebar(map, sidebar)

            // Load markers from URL
            const searchParams = qsParse(location.search.substring(1))
            let positions: [number, number][] = []
            if (searchParams.line) {
                try {
                    positions = decodeLonLat(searchParams.line, 5)
                } catch (error) {
                    console.error("Failed to decode line points from", searchParams.line, error)
                }
            }
            for (const [lon, lat] of positions) {
                createNewMarker({ lngLat: [lon, lat], skipUpdates: true })
            }
            console.debug("Loaded", positions.length, "distance line points")
            update(range(0, markers.length))

            // Focus on the makers if they're offscreen
            if (markers.length > 1) {
                const mapBounds = map.getBounds()
                let markerBounds = new LngLatBounds(markers[0].getLngLat())
                let contains = true
                for (const marker of markers.slice(1)) {
                    const markerLngLat = marker.getLngLat()
                    markerBounds = markerBounds.extend(markerLngLat)
                    if (contains && !mapBounds.contains(markerLngLat)) contains = false
                }
                if (!contains) map.fitBounds(markerBounds, { animate: false })
            }

            addMapLayer(map, layerId)
            map.on("click", createNewMarker)
        },
        unload: () => {
            map.off("click", createNewMarker)
            removeMapLayer(map, layerId)
            source.setData(emptyFeatureCollection)
            ghostMarker?.remove()
            ghostMarker = null
            for (const marker of markers) marker.remove()
            markers.length = 0
            update([])
        },
    }
}
