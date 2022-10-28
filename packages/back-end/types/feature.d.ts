/* eslint-disable @typescript-eslint/no-explicit-any */

import { UserRef } from "./user";

export type FeatureValueType = "boolean" | "string" | "number" | "json";

export interface FeatureEnvironment {
  enabled: boolean;
  rules: FeatureRule[];
}

export type LegacyFeatureInterface = FeatureInterface & {
  /** @deprecated */
  environments?: string[];
  /** @deprecated */
  rules?: FeatureRule[];
};

export interface FeatureDraftChanges {
  active: boolean;
  dateCreated?: Date;
  dateUpdated?: Date;
  defaultValue?: string;
  rules?: Record<string, FeatureRule[]>;
  comment?: string;
}

export interface FeatureInterface {
  id: string;
  archived?: boolean;
  description?: string;
  organization: string;
  owner: string;
  project?: string;
  dateCreated: Date;
  dateUpdated: Date;
  valueType: FeatureValueType;
  defaultValue: string;
  tags?: string[];
  environmentSettings?: Record<string, FeatureEnvironment>;
  draft?: FeatureDraftChanges;
  revision?: {
    version: number;
    comment: string;
    date: Date;
    publishedBy: UserRef;
  };
}

export interface BaseRule {
  description: string;
  condition?: string;
  id: string;
  enabled?: boolean;
}

export interface ForceRule extends BaseRule {
  type: "force";
  value: string;
}

export interface RolloutRule extends BaseRule {
  type: "rollout";
  value: string;
  coverage: number;
  hashAttribute: string;
}

type ExperimentValue = {
  value: string;
  weight: number;
  name?: string;
};

export type NamespaceValue = {
  enabled: boolean;
  name: string;
  range: [number, number];
};

/**
 * @deprecated
 */
export interface ExperimentRule extends BaseRule {
  type: "experiment";
  trackingKey: string;
  hashAttribute: string;
  namespace?: NamespaceValue;
  coverage?: number;
  values: ExperimentValue[];
}

export interface ExperimentReferenceRule extends BaseRule {
  type: "experiment-ref";
  experimentId: string;
  variations: {
    value: string;
  }[];
}

export type FeatureRule = ForceRule | RolloutRule | ExperimentRule;
