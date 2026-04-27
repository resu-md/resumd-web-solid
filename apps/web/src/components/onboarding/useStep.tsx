import { createContext, createSignal, useContext, type Accessor } from "solid-js";

const StepContext = createContext<{
    step: Accessor<number>;
    visited: Accessor<Array<number>>;
    setStep: (step: number) => void;
    stepRelative: (to: number) => number;
    incrementStep: () => void;
    decrementStep: () => void;
    stepIn: (...steps: Array<number>) => boolean;
    stepInRange: (min: number, max: number) => boolean;
    stepVisited: (step: number) => boolean;
}>();

export function StepProvider(props: { children: any; maxStep: number; minStep: number; initialStep?: number }) {
    const initialStep = props.initialStep ?? props.minStep;
    const [step, setCurrentStep] = createSignal(initialStep);
    const [visited, setVisited] = createSignal<Array<number>>([]);

    const moveToStep = (currentStep: number, nextStep: number) => {
        if (nextStep !== currentStep) {
            setVisited((visitedSteps) =>
                visitedSteps.includes(currentStep) ? visitedSteps : [...visitedSteps, currentStep],
            );
        }
        return nextStep;
    };

    const setStep = (nextStep: number) => setCurrentStep((currentStep) => moveToStep(currentStep, nextStep));
    const stepRelative = (to: number) => step() - to;
    const incrementStep = () =>
        setCurrentStep((currentStep) => moveToStep(currentStep, Math.min(currentStep + 1, props.maxStep)));
    const decrementStep = () =>
        setCurrentStep((currentStep) => moveToStep(currentStep, Math.max(currentStep - 1, props.minStep)));
    const stepIn = (...steps: Array<number>) => steps.includes(step());
    const stepInRange = (min: number, max: number) => step() >= min && step() <= max;
    const stepVisited = (targetStep: number) => visited().includes(targetStep);

    return (
        <StepContext.Provider
            value={{
                step,
                visited,
                setStep,
                stepRelative,
                incrementStep,
                decrementStep,
                stepIn,
                stepInRange,
                stepVisited,
            }}
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
