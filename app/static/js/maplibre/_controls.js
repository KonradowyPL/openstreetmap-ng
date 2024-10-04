import * as maplibregl from "maplibre-gl"

export class ControlGroup {
    constructor(controls) {
        this.controls = controls
    }
    onAdd(map) {
        this._map = map
        this._container = document.createElement("div")
        this._container.classList = "maplibregl-ctrl maplibregl-ctrl-group"
        this._container.append(...this.controls.map((control) => control(map)))
        return this._container
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container)
        this._map = null
    }
}
