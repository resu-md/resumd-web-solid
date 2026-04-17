import { createEffect, onCleanup, onMount } from "solid-js";
import { useZoom, useZoomShortcuts } from "../zoom/ZoomContext";
import previewTemplate from "./pdf-preview.html?raw";

const PAGED_JS_URL = `${import.meta.env.BASE_URL}vendor/pagedjs/paged.js`;
const TRACKPAD_PINCH_SPEED_MULTIPLIER = 5;

// TODO: Bug: setting padding on body puts padding on the outer container not the page

export default function PagedPdfPreview(props: { html: string; css: string; zoom: number }) {
    const { handleKeyboardEvent } = useZoomShortcuts();
    const { zoom, setZoom, zoomWithWheelDelta } = useZoom();

    let iframeRef: HTMLIFrameElement | undefined;
    let detachInputHandlers: (() => void) | undefined;
    let initialZoomApplied = false;
    let pendingZoomAnchor: { x: number; y: number } | undefined;

    const normalizeWheelDelta = (event: WheelEvent): number => {
        if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
        if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
        return event.deltaY;
    };

    const getZoomDelta = (event: WheelEvent): number => {
        const normalizedDelta = normalizeWheelDelta(event);
        // On macOS/Safari/Chrome, pinch gestures are typically wheel events with ctrlKey + pixel delta.
        const isTrackpadPinch = event.ctrlKey && event.deltaMode === WheelEvent.DOM_DELTA_PIXEL && !event.metaKey;
        return isTrackpadPinch ? normalizedDelta * TRACKPAD_PINCH_SPEED_MULTIPLIER : normalizedDelta;
    };

    const applyZoomScale = (zoomValue: number, anchor?: { x: number; y: number }) => {
        const iframe = iframeRef;
        const doc = iframe?.contentDocument;
        if (!doc) return;

        const scale = zoomValue / 100;

        const contentWindow = iframe?.contentWindow as
            | (Window & { setPreviewZoom?: (scale: number, anchorX?: number, anchorY?: number) => void })
            | null;
        if (contentWindow?.setPreviewZoom) {
            contentWindow.setPreviewZoom(scale, anchor?.x, anchor?.y);
            return;
        }

        // Fallback path while iframe helper script is still booting.
        doc.documentElement.style.setProperty("--preview-zoom-scale", `${scale}`);
    };

    /**
     * Adjust the initial value of zoom to make the page fit the iframe viewport. Called uppon iframe's initialization.
     */
    const applyInitialFitZoom = () => {
        if (initialZoomApplied) return;

        const iframe = iframeRef;
        if (!iframe) {
            requestAnimationFrame(applyInitialFitZoom);
            return;
        }

        const doc = iframe.contentDocument;
        if (!doc) {
            requestAnimationFrame(applyInitialFitZoom);
            return;
        }

        const page = doc.querySelector(".pagedjs_page") as HTMLElement | null;
        const pagesContainer = doc.querySelector(".pagedjs_pages") as HTMLElement | null;
        if (!page) {
            requestAnimationFrame(applyInitialFitZoom);
            return;
        }

        const pageRect = page.getBoundingClientRect();
        const containerStyles = pagesContainer ? window.getComputedStyle(pagesContainer) : null;
        const containerMarginTop = containerStyles ? parseFloat(containerStyles.marginTop) || 0 : 0;
        const containerMarginBottom = containerStyles ? parseFloat(containerStyles.marginBottom) || 0 : 0;
        const totalPageHeight = pageRect.height + containerMarginTop + containerMarginBottom;
        const viewportWidth = iframe.clientWidth;
        const viewportHeight = iframe.clientHeight;
        if (!pageRect.width || !totalPageHeight || !viewportWidth || !viewportHeight) return;

        initialZoomApplied = true;

        const fitScale = Math.min(viewportWidth / pageRect.width, viewportHeight / totalPageHeight);
        if (!Number.isFinite(fitScale)) return;

        const paddingFactor = 0.94;
        const fitZoom = Math.min(100, Math.floor(fitScale * paddingFactor * 100));
        if (fitZoom > 0 && fitZoom < zoom()) {
            setZoom(fitZoom);
        }
    };

    const attachInputHandlers = () => {
        const iframe = iframeRef;
        if (!iframe) return;

        const contentWindow = iframe.contentWindow;
        if (!contentWindow) return;

        const handleWheel = (event: WheelEvent) => {
            if (!event.ctrlKey && !event.metaKey) return;

            event.preventDefault();
            pendingZoomAnchor = { x: event.clientX, y: event.clientY };
            zoomWithWheelDelta(getZoomDelta(event));
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            handleKeyboardEvent(event);
        };

        contentWindow.addEventListener("wheel", handleWheel, { passive: false });
        contentWindow.addEventListener("keydown", handleKeyDown);

        detachInputHandlers = () => {
            contentWindow.removeEventListener("wheel", handleWheel);
            contentWindow.removeEventListener("keydown", handleKeyDown);
        };
    };

    const handleIframeLoad = () => {
        detachInputHandlers?.();
        attachInputHandlers();
        applyZoomScale(props.zoom);
    };

    onMount(() => {
        if (!iframeRef) return;
        iframeRef.addEventListener("load", handleIframeLoad);
        iframeRef.srcdoc = previewTemplate.replace("{{PAGED_JS_URL}}", PAGED_JS_URL);
    });

    onCleanup(() => {
        iframeRef?.removeEventListener("load", handleIframeLoad);
        detachInputHandlers?.();
    });

    createEffect(() => {
        const html = props.html;
        const css = props.css;
        const iframe = iframeRef;

        if (!iframe) return;

        // We need to wait for the iframe to load initially
        const triggerRender = () => {
            if (iframe.contentWindow && (iframe.contentWindow as any).renderPreview) {
                (iframe.contentWindow as any).renderPreview(html, css);
            } else {
                // Retry shortly if not ready (e.g. script loading)
                setTimeout(triggerRender, 100);
            }
        };

        triggerRender();
        applyInitialFitZoom();
    });

    // Update zoom scale CSS variable when zoom changes
    createEffect(() => {
        const iframe = iframeRef;
        if (!iframe?.contentDocument) return;

        const anchor = pendingZoomAnchor;
        pendingZoomAnchor = undefined;
        applyZoomScale(props.zoom, anchor);
    });

    return (
        <iframe
            ref={iframeRef}
            style={{
                width: "100%",
                height: "100%",
                border: "none",
            }}
        />
    );
}
