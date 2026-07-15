import type { IBackendSerializer } from "./serializer";

export class SerializerRegistry {
  private serializers = new Map<string, IBackendSerializer>();

  register(serializer: IBackendSerializer): void {
    this.serializers.set(serializer.id, serializer);
  }

  get(id: string): IBackendSerializer | undefined {
    return this.serializers.get(id);
  }

  list(): IBackendSerializer[] {
    return Array.from(this.serializers.values());
  }
}
