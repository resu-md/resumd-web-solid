import { annotate } from "rough-notation";
import { createEffect, onCleanup, splitProps, type JSXElement } from "solid-js";
import clsx from "clsx";

type RoughAnnotationConfig = Parameters<typeof annotate>[1];
type RoughAnnotationType = RoughAnnotationConfig["type"];

type RoughAnnotationProps = {
    type: RoughAnnotationType;
    delay?: number;
    duration?: number;
    active?: boolean;
    class?: string;
    color?: string;
    strokeWidth?: number;
    padding?: RoughAnnotationConfig["padding"];
    iterations?: number;
    animate?: boolean;
    multiline?: boolean;
    rtl?: boolean;
    brackets?: RoughAnnotationConfig["brackets"];
    children: JSXElement;
};

export default function RoughAnnotation(props: RoughAnnotationProps) {
    const [local, rest] = splitProps(props, [
        "type",
        "delay",
        "duration",
        "active",
        "class",
        "color",
        "strokeWidth",
        "padding",
        "iterations",
        "animate",
        "multiline",
        "rtl",
        "brackets",
        "children",
    ]);

    let targetRef: HTMLSpanElement | undefined;
    let annotation: ReturnType<typeof annotate> | undefined;
    let showTimeout: number | undefined;

    const clearAnnotation = () => {
        if (showTimeout !== undefined) {
            clearTimeout(showTimeout);
            showTimeout = undefined;
        }
        annotation?.remove();
        annotation = undefined;
    };

    createEffect(() => {
        const isActive = local.active ?? true;
        const target = targetRef;

        if (!target || !isActive) {
            clearAnnotation();
            return;
        }

        clearAnnotation();

        annotation = annotate(target, {
            type: local.type,
            animate: local.animate ?? true,
            animationDuration: local.duration,
            color: local.color ?? "currentColor",
            strokeWidth: local.strokeWidth,
            padding: local.padding,
            iterations: local.iterations,
            multiline: local.multiline,
            rtl: local.rtl,
            brackets: local.brackets,
        });

        const delay = local.delay ?? 0;
        if (delay > 0) {
            showTimeout = window.setTimeout(() => annotation?.show(), delay);
        } else {
            annotation.show();
        }

        onCleanup(() => {
            clearAnnotation();
        });
    });

    return (
        <span ref={(el) => (targetRef = el)} class={clsx("inline-flex", local.class)} {...rest}>
            {local.children}
        </span>
    );
}
