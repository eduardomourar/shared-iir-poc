export interface Dependency {
  readonly target: string;
  readonly kind: 'Explicit' | 'Implicit' | 'Ordering' | 'Replacement';
}
