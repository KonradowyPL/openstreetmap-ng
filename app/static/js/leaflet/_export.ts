import {FakePainter} from "./_fake_painter"

export const swizzleContext = () => {
    const originalCreateElement = document.createElement
    const ctxProxy = {
        get(target: any, prop: string | symbol) {
            // Return the function wrapped in a proxy to ensure its behavior is maintained
            if (typeof target[prop] === "function")
                return (...args: any[]) => {
                    // console.log("Calling:", prop)
                    return target[prop](...args)
                }

            return target[prop]
        },
        set(target: any, prop: string | symbol, value: any) {
            target[prop] = value
            return true
        },
    }

    document.createElement = (tagName: string, ...args: any[]) => {
        const element = originalCreateElement.call(document, tagName, ...args)

        if (element instanceof HTMLCanvasElement) {
            console.debug("Captured canvas creation")

            const originalGetContext = element.getContext.bind(element)

            element.getContext = (type, ...args2) => {
                console.debug("Captured getContext")

                // Call the original getContext method to get the WebGL context
                const ctx = originalGetContext(type, ...args2)

                // Only proxy the context if it's a WebGL context
                if (ctx instanceof WebGL2RenderingContext)
                    // Create a proxy around the WebGL context
                    return new Proxy(ctx, ctxProxy)

                // If it's not a WebGL context, just return the context as is
                return ctx
            }
        }

        return element
    }
}
