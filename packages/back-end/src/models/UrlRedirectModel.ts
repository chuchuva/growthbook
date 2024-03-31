import { keyBy } from "lodash";
import { getAffectedEnvsForExperiment } from "shared/util";
import { isURLTargeted } from "@growthbook/growthbook";
import { ExperimentInterface } from "../../types/experiment";
import { DestinationURL, URLRedirectInterface } from "../../types/url-redirect";
import { refreshSDKPayloadCache } from "../services/features";
import { urlRedirectValidator } from "../routers/url-redirects/url-redirects.validators";
import {
  getAllPayloadExperiments,
  getAllURLRedirectExperiments,
  getPayloadKeys,
  updateExperiment,
} from "./ExperimentModel";
import { MakeModelClass } from "./BaseModel";

type WriteOptions = {
  checkCircularDependencies?: boolean;
  bypassWebhooks?: boolean;
};

const BaseClass = MakeModelClass({
  schema: urlRedirectValidator,
  collectionName: "urlredirects",
  idPrefix: "url_",
  auditLog: {
    entity: "urlRedirect",
    createEvent: "urlRedirect.create",
    updateEvent: "urlRedirect.update",
    deleteEvent: "urlRedirect.delete",
  },
  projectScoping: "none",
  globallyUniqueIds: false,
  readonlyFields: ["experiment"],
});

export class UrlRedirectModel extends BaseClass<WriteOptions> {
  public findByExperiment(experiment: string) {
    // Assume we already checked read permissions for the experiment
    return this._find({ experiment }, { bypassReadPermissionChecks: true });
  }

  protected canRead(doc: URLRedirectInterface): boolean {
    const { experiment } = this.getForeignRefs(doc);
    return this.context.hasPermission("readData", experiment?.project || "");
  }
  protected canCreate(doc: URLRedirectInterface): boolean {
    const { experiment } = this.getForeignRefs(doc);
    const envs = experiment ? getAffectedEnvsForExperiment({ experiment }) : [];
    return this.context.hasPermission(
      "runExperiments",
      experiment?.project || "",
      envs
    );
  }
  protected canUpdate(doc: URLRedirectInterface): boolean {
    const { experiment } = this.getForeignRefs(doc);
    const envs = experiment ? getAffectedEnvsForExperiment({ experiment }) : [];
    return this.context.hasPermission(
      "runExperiments",
      experiment?.project || "",
      envs
    );
  }
  protected canDelete(doc: URLRedirectInterface): boolean {
    const { experiment } = this.getForeignRefs(doc);
    const envs = experiment ? getAffectedEnvsForExperiment({ experiment }) : [];
    return this.context.hasPermission(
      "runExperiments",
      experiment?.project || "",
      envs
    );
  }

  protected async beforeCreate(doc: URLRedirectInterface) {
    const { experiment } = this.getForeignRefs(doc);
    if (!experiment) {
      throw new Error("Could not find experiment");
    }
    const variationIds = experiment.variations.map((v) => v.id);
    const reqVariationIds = doc.destinationURLs.map((r) => r.variation);

    const areValidVariations = variationIds.every((v) =>
      reqVariationIds.includes(v)
    );
    if (!areValidVariations) {
      throw new Error("Invalid variation IDs for urlRedirects");
    }
  }

  protected async customValidation(
    doc: URLRedirectInterface,
    writeOptions?: WriteOptions
  ) {
    if (!doc.urlPattern) {
      throw new Error("url pattern cannot be empty");
    }

    if (writeOptions?.checkCircularDependencies) {
      await this.checkCircularDependencies(
        doc.urlPattern,
        doc.destinationURLs,
        doc.id
      );
    }
  }

  protected async afterCreateOrUpdate(
    doc: URLRedirectInterface,
    writeOptions?: WriteOptions
  ) {
    let { experiment } = this.getForeignRefs(doc);
    if (experiment && !experiment.hasURLRedirects) {
      experiment = await updateExperiment({
        context: this.context,
        experiment,
        changes: { hasURLRedirects: true },
        bypassWebhooks: true,
      });
    }

    if (experiment && !writeOptions?.bypassWebhooks) {
      const payloadKeys = getPayloadKeys(this.context, experiment);
      await refreshSDKPayloadCache(this.context, payloadKeys);
    }
  }

  protected async afterDelete(doc: URLRedirectInterface) {
    const { experiment } = this.getForeignRefs(doc);
    if (!experiment) return;

    const remaining = await this.findByExperiment(doc.experiment);
    if (remaining.length === 0) {
      if (experiment && experiment.hasURLRedirects) {
        await updateExperiment({
          context: this.context,
          experiment,
          changes: { hasURLRedirects: false },
          bypassWebhooks: true,
        });
      }
    }

    const payloadKeys = getPayloadKeys(this.context, experiment);
    await refreshSDKPayloadCache(this.context, payloadKeys);
  }

  // when an experiment adds/removes variations, we need to update
  // url redirect changes to be in sync
  public async syncURLRedirectsWithVariations(
    urlRedirect: URLRedirectInterface,
    experiment: ExperimentInterface
  ) {
    const { variations } = experiment;
    const { destinationURLs } = urlRedirect;
    const byVariationId = keyBy(destinationURLs, "variation");
    const newDestinationURLs = variations.map((variation) => {
      const destination = byVariationId[variation.id];
      return destination ? destination : { variation: variation.id, url: "" };
    });

    return await this.update(
      urlRedirect,
      {
        destinationURLs: newDestinationURLs,
      },
      { bypassWebhooks: true }
    );
  }

  private async checkCircularDependencies(
    origin: string,
    destinations: DestinationURL[],
    urlRedirectId?: string
  ) {
    const payloadExperiments = await getAllPayloadExperiments(this.context);
    const urlRedirects = await getAllURLRedirectExperiments(
      this.context,
      payloadExperiments
    );
    const originUrl = origin;

    const existingRedirects = urlRedirects.filter(
      (r) => r.urlRedirect.id !== urlRedirectId
    );

    existingRedirects.forEach((existing) => {
      if (
        isURLTargeted(originUrl, [
          {
            type: "simple",
            pattern: existing.urlRedirect.urlPattern,
            include: true,
          },
        ])
      ) {
        throw new Error(
          "Origin URL matches an existing redirect's origin URL."
        );
      }
      existing.urlRedirect.destinationURLs?.forEach((d) => {
        if (
          isURLTargeted(d.url, [
            {
              type: "simple",
              pattern: origin,
              include: true,
            },
          ])
        ) {
          throw new Error(
            "Origin URL targets the destination url of an existing redirect."
          );
        }
      });
      destinations.forEach((dest) => {
        if (
          isURLTargeted(dest.url, [
            {
              type: "simple",
              pattern: existing.urlRedirect.urlPattern,
              include: true,
            },
          ])
        ) {
          throw new Error(
            "Origin URL of an existing redirect targets a destination URL in this redirect."
          );
        }
      });
    });
  }
}
