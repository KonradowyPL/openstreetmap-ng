const rightbar = document.querySelector(".rightbar.sidebar")

let active = null

export const switchRightbar = (target) => {
    for (const element of rightbar.children) {
        element.classList.toggle("d-none", element !== target)
    }
}
// TODO: maybe insead of inputing class name input element
// TODO: add active class to buttons

export const toggleRightbar = (element, button = null) => {
    if (element.classList.contains("d-none")) {
        button.classList.add("active")
        active?.classList.remove("active")
        active = button
        switchRightbar(element)
    } else {
        closeRightbar()
        active?.classList.remove("active")
    }
}

export const closeRightbar = () => {
    for (const element of rightbar.children) element.classList.add("d-none")
}

export const getRightBar = (className) => rightbar.querySelector(`&>.${className}`)

export const registerButton = (button, className) => {
    const rightbar = getRightBar(className)
    button.onclick = () => {
        button.blur()
        toggleRightbar(rightbar, button)
    }
    return rightbar
}

// debugging porposes ONLY!!
// TODO: remove this
window.rightbar = rightbar

for (const element of rightbar.children) {
    element.querySelector(".sidebar-close-btn").onclick = () => closeRightbar()
}
