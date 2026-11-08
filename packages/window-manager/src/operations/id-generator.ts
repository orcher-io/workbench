/**
 * ID generator for layout nodes
 */
let idCounter = 0;

/**
 * Generate a unique ID for layout nodes
 */
export function generateId(): string {
  return `${Date.now()}-${++idCounter}`;
}

/**
 * Reset the ID counter (useful for testing)
 */
export function resetIdCounter(): void {
  idCounter = 0;
}
