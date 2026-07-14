import type { Expression } from "./expression.ts";

export interface Output {
  readonly id: string;
  readonly value: Expression;
}
