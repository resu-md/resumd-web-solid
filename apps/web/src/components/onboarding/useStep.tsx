import { createContext, createSignal, useContext, type Accessor } from "solid-js";

const StepContext = createContext<{
    step: Accessor<number>;
    setStep: (step: number) => void;
    stepRelative: (to: number) => number;
    incrementStep: () => void;
    decrementStep: () => void;
    stepIn: (...steps: Array<number>) => boolean;
    stepInRange: (min: number, max: number) => boolean;
}>();

export function StepProvider(props: { children: any; maxStep: number; minStep: number; initialStep?: number }) {
    const [step, setStep] = createSignal(props.initialStep ?? props.minStep);

    const stepRelative = (to: number) => step() - to;
    const incrementStep = () => setStep((s) => Math.min(s + 1, props.maxStep));
    const decrementStep = () => setStep((s) => Math.max(s - 1, props.minStep));
    const stepIn = (...steps: Array<number>) => steps.includes(step());
    const stepInRange = (min: number, max: number) => step() >= min && step() <= max;

    return (
        <StepContext.Provider
            value={{ step, setStep, stepRelative, incrementStep, decrementStep, stepIn, stepInRange }}
        >
            {props.children}
        </StepContext.Provider>
    );
}

export function useStep() {
    const context = useContext(StepContext);
    if (!context) {
        throw new Error("useStep must be used within a StepProvider");
    }
    return context;
}
