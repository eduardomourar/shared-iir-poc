import type { Expression } from "../../iir/shared/expression.ts";
import type { SharedIirManifest } from "../../iir/shared/manifest.ts";
import type { IirResource } from "../../iir/shared/model.ts";
import type { ILoweringContext } from "../context.ts";
import type { ILoweringPhase } from "../phase.ts";

/**
 * Lowers semantic Storage resources into platform-specific storage resources.
 *
 * Input: A generic storage resource with semantic capabilities (versioning, encryption).
 * Output: Platform-specific storage resource with provider properties expanded.
 */
export class StorageLoweringPhase implements ILoweringPhase {
  readonly id = 'storage-lowering';
  readonly displayName = 'Storage Resource Lowering';

  run(model: SharedIirManifest, context: ILoweringContext): SharedIirManifest {
    const loweredResources = model.resources.map(res => {
      if (res.resourceType.service === 'storage' && res.resourceType.resource === 'bucket') {
        return this.lowerStorage(res, context);
      }
      return res;
    });

    return {
      ...model,
      resources: loweredResources,
    };
  }

  private lowerStorage(res: IirResource, context: ILoweringContext): IirResource {
    const platform = context.targetPlatform;
    const expanded: Record<string, Expression> = { ...res.properties };

    // Expand versioning capability
    const hasVersioning = res.capabilities.some(c => c.id === 'storage.versioning');
    if (hasVersioning) {
      if (platform === 'aws') {
        expanded['VersioningConfiguration'] = {
          kind: 'Object',
          objectFields: {
            Status: { kind: 'Literal', literalValue: 'Enabled' },
          },
        };
      } else if (platform === 'azure') {
        expanded['isVersioningEnabled'] = { kind: 'Literal', literalValue: true };
      }
    }

    // Expand encryption capability
    const hasEncryption = res.capabilities.some(c => c.id === 'storage.encryption');
    if (hasEncryption) {
      if (platform === 'aws') {
        expanded['BucketEncryption'] = {
          kind: 'Object',
          objectFields: {
            ServerSideEncryptionConfiguration: {
              kind: 'List',
              elements: [{
                kind: 'Object',
                objectFields: {
                  ServerSideEncryptionByDefault: {
                    kind: 'Object',
                    objectFields: {
                      SSEAlgorithm: { kind: 'Literal', literalValue: 'AES256' },
                    },
                  },
                },
              }],
            },
          },
        };
      } else if (platform === 'azure') {
        expanded['encryption'] = {
          kind: 'Object',
          objectFields: {
            services: {
              kind: 'Object',
              objectFields: {
                blob: {
                  kind: 'Object',
                  objectFields: {
                    enabled: { kind: 'Literal', literalValue: true },
                  },
                },
              },
            },
          },
        };
      }
    }

    // Expand lifecycle capability
    const hasLifecycle = res.capabilities.some(c => c.id === 'storage.lifecycle');
    if (hasLifecycle) {
      if (platform === 'aws') {
        expanded['LifecycleConfiguration'] = {
          kind: 'Object',
          objectFields: {
            Rules: {
              kind: 'List',
              elements: [{
                kind: 'Object',
                objectFields: {
                  Status: { kind: 'Literal', literalValue: 'Enabled' },
                },
              }],
            },
          },
        };
      }
    }

    // Map to platform-specific resource type
    const resourceType = platform === 'aws'
      ? { provider: 'aws', service: 's3', resource: 'bucket' }
      : platform === 'azure'
        ? { provider: 'azure', service: 'storage', resource: 'account' }
        : res.resourceType;

    return {
      ...res,
      resourceType,
      properties: expanded,
    };
  }
}
