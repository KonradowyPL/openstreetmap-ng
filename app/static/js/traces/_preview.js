import { Map } from "maplibre-gl"

const tracePreviewContainer = document.querySelector(".trace-preview")
if (tracePreviewContainer) {
    console.debug("Initializing trace preview map")
    const isSmall = tracePreviewContainer.classList.contains("trace-preview-sm")
    const coords = JSON.parse(tracePreviewContainer.dataset.coords)
    const coords2D = []
    for (let i = 0; i < coords.length; i += 2) {
        coords2D.push([coords[i], coords[i + 1]])
    }
    const lngs = coords2D.map((coord) => coord[0])
    const lats = coords2D.map((coord) => coord[1])
    const bounds = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
    ]
    const map = new Map({
        container: tracePreviewContainer,
        center: [0, 0],
        zoom: 13,
        hash: false,
        attributionControl: {
            position: "top-left",
            // TODO: propper attribution
            // TODO: import map styles
            customAttribution: "© OpenStreetMap contributors",
            compact: false,
        },
        style: {
            id: "raster",
            version: 8,
            center: [0, 0],
            zoom: 0,
            sources: {
                "raster-tiles": {
                    type: "raster",
                    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                    tileSize: 256,
                    minzoom: 0,
                    maxzoom: 19,
                },
                gpx: {
                    type: "geojson",
                    data: {
                        type: "FeatureCollection",
                        features: [
                            {
                                type: "Feature",
                                geometry: {
                                    type: "LineString",
                                    coordinates: coords2D,
                                },
                            },
                        ],
                    },
                },
            },
            layers: [
                {
                    id: "background",
                    type: "background",
                    paint: {
                        "background-color": "#e0dfdf",
                    },
                },
                {
                    id: "simple-tiles",
                    type: "raster",
                    source: "raster-tiles",
                },
            ],
        },
    })
    map.fitBounds(bounds, {
        padding: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
        },
        duration: 0,
    })

    map.on("load", () => {
        map.addLayer({
            id: "route",
            type: "line",
            source: "gpx",
            layout: {
                "line-join": "round",
                "line-cap": "round",
            },
            paint: {
                "line-color": "#F60",
                "line-width": 2,
            },
        })
        map.addLayer({
            type: "line",
            source: "gpx",
            id: "line-dashed",
            paint: {
                "line-color": "#220",
                "line-width": 3.5,
                "line-dasharray": [0, 4, 3],
            },
        })
        // technique based on https://jsfiddle.net/2mws8y3q/
        // an array of valid line-dasharray values, specifying the lengths of the alternating dashes and gaps that form the dash pattern
        const dashArraySequence = [
            [0, 16, 12],
            [2, 16, 10],
            [4, 16, 8],
            [6, 16, 6],
            [8, 16, 4],
            [10, 16, 2],
            [12, 16, 0],
            [0, 2, 12, 14],
            [0, 4, 12, 12],
            [0, 6, 12, 10],
            [0, 8, 12, 8],
            [0, 10, 12, 6],
            [0, 12, 12, 4],
            [0, 14, 12, 2],
        ]

        let step = 0

        function animateDashArray(timestamp) {
            // Update line-dasharray using the next value in dashArraySequence. The
            // divisor in the expression `timestamp / 50` controls the animation speed.
            const newStep = Number.parseInt((timestamp / 60) % dashArraySequence.length)

            if (newStep !== step) {
                map.setPaintProperty("line-dashed", "line-dasharray", dashArraySequence[step])
                step = newStep
            }

            // Request the next frame of the animation.
            requestAnimationFrame(animateDashArray)
        }

        // start the animation
        animateDashArray(0)
    })
}
