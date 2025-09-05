export function assert(condition: any, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

export function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected}, but got ${actual}`
    )
  }
}

export function assertArrayEquals<T>(actual: T[], expected: T[], message?: string): void {
  if (actual.length !== expected.length) {
    throw new Error(
      message || `Array lengths differ: expected ${expected.length}, got ${actual.length}`
    )
  }
  
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(
        message || `Arrays differ at index ${i}: expected ${expected[i]}, got ${actual[i]}`
      )
    }
  }
}

export function assertApproximately(actual: number, expected: number, tolerance: number = 0.001, message?: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      message || `Expected approximately ${expected}, but got ${actual} (tolerance: ${tolerance})`
    )
  }
}