/**
Validate that a value is a valid positive integer within range.
@param value - The string to validate
@param max - Maximum allowed value
@returns The parsed number, or undefined if invalid
*/
export function validateIntegerInput(value: string, max: number): number | undefined {
  const number_ = Math.trunc(Number(value));
  return Number.isNaN(number_) || number_ < 0 || number_ > max ? undefined : number_;
}
