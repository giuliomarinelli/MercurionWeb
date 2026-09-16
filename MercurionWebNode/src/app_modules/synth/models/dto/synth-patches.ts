import { SynthStepInput } from './synth-step.input'
import { SynthesisInput } from './synthesis.input'

export type SynthesisPatch = {
    title: string
    notes: string | null
}

export type SynthStepPatch = {
    order: number
    description: string | null
    reactionType: string | null
}

export function toSynthesisPatch(input: SynthesisInput): SynthesisPatch {
    return {
        title: input.title,
        notes: input.notes ?? null
    }
}

export function toSynthStepPatch(input: Pick<SynthStepInput, 'order' | 'description' | 'reactionType'>): SynthStepPatch {
    return {
        order: input.order,
        description: input.description ?? null,
        reactionType: input.reactionType ?? null
    }
}
