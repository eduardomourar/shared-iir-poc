/**
 * Dependency between resources
 */
export interface Dependency {
  readonly targetResourceId: string;
  readonly dependencyType: 'explicit' | 'implicit';
}
