import { useEffect } from "preact/hooks";

export default function PrelineLoader() {
    useEffect(() => {
        import("preline");
    }, []);

    return null;
}
