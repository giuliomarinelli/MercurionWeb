import { registerEnumType } from '@nestjs/graphql';

export enum SynthStepItemPosition {
    BeforeArrow = 'BeforeArrow',
    OnArrow = 'OnArrow',
    AfterArrow = 'AfterArrow'
}

registerEnumType(SynthStepItemPosition, {
    name: 'SynthStepItemPosition',
    description: 'Visual placement of an item relative to the reaction arrow'
})
