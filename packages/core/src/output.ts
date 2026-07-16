import type { Expression } from "./model";

export interface Output {
  readonly id: string;
  readonly value: Expression;
}
