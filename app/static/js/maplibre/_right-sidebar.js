const rightbar = document.querySelector(".rightbar.sidebar")
console.log(rightbar)
export const switchRightbar = (className) => {
    for (const element of rightbar.children) {
        element.classList.toggle("d-none", !element.classList.contains(className))
    }
}
// TODO: maybe insead of inputing class name input element
// TODO: add active class to buttons

export const toggleRightbar = (className) => {
    if (rightbar.querySelector(`&>.${className}.d-none`)) switchRightbar(className)
    else closeRightbar()
}

export const closeRightbar = () => {
    for (const element of rightbar.children) element.classList.add("d-none")
}

export const getRightBar = (className) => rightbar.querySelector(`&>.${className}`)

export const registerButton = (button, className) => {
    button.onclick = () => {
        toggleRightbar(className)
        button.blur()
    }
}

// debugging porposes ONLY!!
// TODO: remove this
window.rightbar = rightbar

for (const element of rightbar.children) {
    element.querySelector(".sidebar-close-btn").onclick = () => closeRightbar()
}
