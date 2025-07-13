import { useLayoutEffect } from "preact/hooks";

export default function PrelineLoader() {
    useLayoutEffect(() => {
        import("preline");
    }, []);

    return null;
}
