import { omit } from "lodash";
import uniqid from "uniqid";
import mongoose from "mongoose";
import {
  GithubIntegrationInterface,
  CreateGithubIntegrationInput,
} from "../../types/github";
import { OrganizationInterface } from "../../types/organization";
import { deleteGithubUserToken, doesTokenExist } from "./GithubUserTokenModel";

type GithubIntegrationDocument = mongoose.Document & GithubIntegrationInterface;

const githubIntegrationSchema = new mongoose.Schema({
  id: String,
  organization: String,
  tokenId: String,
  installationId: String,
  createdBy: String,
  createdAt: Date,
  repositories: [
    {
      id: String,
      name: String,
      watching: Boolean,
    },
  ],
});

githubIntegrationSchema.index({ organization: 1 }, { unique: true });
githubIntegrationSchema.index({ tokenId: 1 }, { unique: true });

const GithubIntegrationModel = mongoose.model<GithubIntegrationDocument>(
  "GithubIntegration",
  githubIntegrationSchema
);

const toInterface = (
  doc: GithubIntegrationDocument
): GithubIntegrationInterface =>
  omit(doc.toJSON<GithubIntegrationDocument>(), ["__v", "_id"]);

export const getGithubIntegrationByOrg = async (
  orgId: OrganizationInterface["id"]
) => {
  const doc = await GithubIntegrationModel.findOne({ organization: orgId });
  return doc ? toInterface(doc) : null;
};

export const createGithubIntegration = async (
  input: CreateGithubIntegrationInput
) => {
  if (!(await doesTokenExist(input.tokenId)))
    throw new Error("Token does not exist");

  if (
    await GithubIntegrationModel.exists({
      $or: [{ tokenId: input.tokenId }, { organization: input.organization }],
    })
  )
    throw new Error("Github integration already exists");

  const doc = await GithubIntegrationModel.create({
    ...input,
    id: uniqid("ghi_"),
    createdAt: new Date(),
  });

  return toInterface(doc);
};

export const toggleWatchingForRepo = async ({
  orgId,
  repoId,
}: {
  orgId: OrganizationInterface["id"];
  repoId: string;
}) => {
  const doc = await GithubIntegrationModel.findOne({ organization: orgId });
  if (!doc) throw new Error("Github integration does not exist");

  const repo = doc.repositories.find((repo) => repo.id === repoId);
  if (!repo) throw new Error("Repository does not exist");

  repo.watching = !repo.watching;

  await doc.save();

  return repo.watching;
};

export const deleteGithubIntegration = async (
  integration: GithubIntegrationInterface
) => {
  const doc = await GithubIntegrationModel.findOne({
    id: integration.id,
  });
  if (!doc) throw new Error("Github integration does not exist");
  await deleteGithubUserToken(doc.tokenId);
  await doc.delete();
};

export const getGithubIntegrationByInstallationId = async (
  installationId: string
) => {
  const doc = await GithubIntegrationModel.findOne({
    installationId,
  });

  return doc ? toInterface(doc) : null;
};
