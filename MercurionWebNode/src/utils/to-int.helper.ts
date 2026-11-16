export function toInt(x: unknown): number {
    if (typeof x === 'number') {
        return x
    }
    if (typeof x === 'string') {
        return Number.parseInt(x, 10)
    }
    return Number.NaN
}
