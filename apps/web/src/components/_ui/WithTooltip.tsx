import { Tooltip } from "@kobalte/core/tooltip";
import { type JSX, createSignal, splitProps } from "solid-js";

type WithTooltipBaseProps<TAs extends keyof JSX.IntrinsicElements> = {
    children?: JSX.Element;
    tooltip: string;
    placement?: "top" | "bottom" | "left" | "right";
    class: string;
    as?: TAs;
};

type WithTooltipProps<TAs extends keyof JSX.IntrinsicElements> = WithTooltipBaseProps<TAs> &
    Omit<JSX.IntrinsicElements[TAs], keyof WithTooltipBaseProps<TAs>>;

export default function WithTooltip<TAs extends keyof JSX.IntrinsicElements>(props: WithTooltipProps<TAs>) {
    const [local, rest] = splitProps(props, ["children", "tooltip", "class", "as", "placement"]);
    const [open, setOpen] = createSignal(false);

    return (
        <Tooltip
            openDelay={0}
            closeDelay={0}
            open={open()}
            onOpenChange={setOpen}
            gutter={7}
            placement={local.placement ?? "bottom"}
        >
            <Tooltip.Trigger
                as={local.as}
                onPointerEnter={() => setOpen(true)}
                onPointerLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                class={local.class}
                {...rest}
            >
                {local.children}
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content class="shadow-tertiary z-100 rounded-lg">
                    <div class="proeminent-button text-label-primary rounded-lg px-1.5 py-1 text-xs">
                        {local.tooltip}
                    </div>
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip>
    );
}
