import mongoose from "mongoose";
import uniqid from "uniqid";
import { cloneDeep } from "lodash";
import {
  Invite,
  Member,
  OrganizationInterface,
  OrganizationMessage,
} from "../../types/organization";
import { upgradeOrganizationDoc } from "../util/migrations";
import { ApiOrganization } from "../../types/openapi";
import { IS_CLOUD } from "../util/secrets";
import { logger } from "../util/logger";
import { getOrganizationById } from "../services/organizations";

const baseMemberFields = {
  _id: false,
  role: String,
  dateCreated: Date,
  limitAccessByEnvironment: Boolean,
  environments: [String],
  projectRoles: [
    {
      _id: false,
      project: String,
      role: String,
      limitAccessByEnvironment: Boolean,
      environments: [String],
    },
  ],
  teams: [String],
  externalId: String,
  managedByIdp: Boolean,
};

const organizationSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
  },
  dateCreated: Date,
  verifiedDomain: String,
  externalId: String,
  url: String,
  name: String,
  ownerEmail: String,
  restrictLoginMethod: String,
  restrictAuthSubPrefix: String,
  autoApproveMembers: Boolean,
  members: [
    {
      ...baseMemberFields,
      id: String,
      lastLoginDate: Date,
    },
  ],
  invites: [
    {
      ...baseMemberFields,
      email: String,
      key: String,
    },
  ],
  pendingMembers: [
    {
      ...baseMemberFields,
      id: String,
      name: String,
      email: String,
    },
  ],
  messages: {
    required: false,
    type: [
      {
        _id: false,
        message: {
          required: true,
          type: String,
        },
        level: {
          required: true,
          type: String,
          enum: ["info", "warning", "danger"],
        },
      },
    ],
  },
  stripeCustomerId: String,
  discountCode: String,
  priceId: String,
  freeSeats: Number,
  disableSelfServeBilling: Boolean,
  freeTrialDate: Date,
  enterprise: Boolean,
  subscription: {
    id: String,
    qty: Number,
    trialEnd: Date,
    status: String,
    current_period_end: Number,
    cancel_at: Number,
    canceled_at: Number,
    cancel_at_period_end: Boolean,
    planNickname: String,
    priceId: String,
    hasPaymentMethod: Boolean,
  },
  licenseKey: String,
  connections: {
    slack: {
      team: String,
      token: String,
    },
    vercel: {
      token: String,
      configurationId: String,
      teamId: String,
    },
  },
  settings: {},
});

organizationSchema.index({ "members.id": 1 });

type OrganizationDocument = mongoose.Document & OrganizationInterface;

const OrganizationModel = mongoose.model<OrganizationInterface>(
  "Organization",
  organizationSchema
);

function toInterface(doc: OrganizationDocument): OrganizationInterface {
  return upgradeOrganizationDoc(doc.toJSON());
}

export async function createOrganization({
  email,
  userId,
  name,
  url = "",
  verifiedDomain = "",
  externalId = "",
}: {
  email: string;
  userId: string;
  name: string;
  url?: string;
  verifiedDomain?: string;
  externalId?: string;
}) {
  // TODO: sanitize fields
  const doc = await OrganizationModel.create({
    ownerEmail: email,
    name,
    url,
    verifiedDomain,
    externalId,
    invites: [],
    members: [
      {
        id: userId,
        role: "admin",
        dateCreated: new Date(),
        limitAccessByEnvironment: false,
        environments: [],
      },
    ],
    id: uniqid("org_"),
    dateCreated: new Date(),
    settings: {
      environments: [
        {
          id: "production",
          description: "",
          toggleOnList: true,
          defaultState: true,
        },
      ],
      // Default to the same attributes as the auto-wrapper for the Javascript SDK
      attributeSchema: [
        { property: "id", datatype: "string", hashAttribute: true },
        { property: "url", datatype: "string" },
        { property: "path", datatype: "string" },
        { property: "host", datatype: "string" },
        { property: "query", datatype: "string" },
        { property: "deviceType", datatype: "enum", enum: "desktop,mobile" },
        {
          property: "browser",
          datatype: "enum",
          enum: "chrome,edge,firefox,safari,unknown",
        },
        { property: "utmSource", datatype: "string" },
        { property: "utmMedium", datatype: "string" },
        { property: "utmCampaign", datatype: "string" },
        { property: "utmTerm", datatype: "string" },
        { property: "utmContent", datatype: "string" },
      ],
    },
  });
  return toInterface(doc);
}

export async function findAllOrganizations(
  page: number,
  search: string,
  limit: number = 50
) {
  const regex = new RegExp(search, "i");

  const query = search
    ? {
        $or: [
          { name: regex },
          { ownerEmail: regex },
          { id: regex },
          { externalId: regex },
        ],
      }
    : {};

  const docs = await OrganizationModel.find(query)
    .sort({ _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await (search
    ? OrganizationModel.find(query).countDocuments()
    : OrganizationModel.find().estimatedDocumentCount());

  return { organizations: docs.map(toInterface), total };
}

export async function findOrganizationById(id: string) {
  const doc = await OrganizationModel.findOne({ id });
  return doc ? toInterface(doc) : null;
}

export async function updateOrganization(
  id: string,
  update: Partial<OrganizationInterface>
) {
  await OrganizationModel.updateOne(
    {
      id,
    },
    {
      $set: update,
    }
  );
}

export async function updateOrganizationByStripeId(
  stripeCustomerId: string,
  update: Partial<OrganizationInterface>
) {
  await OrganizationModel.updateOne(
    {
      stripeCustomerId,
    },
    {
      $set: update,
    }
  );
}

export async function findOrganizationByStripeCustomerId(id: string) {
  const doc = await OrganizationModel.findOne({
    stripeCustomerId: id,
  });

  return doc ? toInterface(doc) : null;
}

export async function getAllInviteEmailsInDb() {
  if (IS_CLOUD) {
    throw new Error("getAllInviteEmailsInDb() is not supported on cloud");
  }

  const organizations = await OrganizationModel.find(
    {},
    { "invites.email": 1 }
  );

  const inviteEmails: string[] = organizations.reduce(
    (emails: string[], organization) => {
      const orgEmails = organization.invites.map((invite) => invite.email);
      return emails.concat(orgEmails);
    },
    []
  );

  return inviteEmails;
}

export async function getSelfHostedOrganization() {
  if (IS_CLOUD) {
    throw new Error("getSelfHostedOrganization() is not supported on cloud");
  }

  const doc = await OrganizationModel.findOne();
  return doc ? toInterface(doc) : null;
}

export async function hasOrganization() {
  const res = await OrganizationModel.findOne();
  return !!res;
}

export async function findOrganizationsByMemberId(userId: string) {
  const docs = await OrganizationModel.find({
    members: {
      $elemMatch: {
        id: userId,
      },
    },
  });
  return docs.map(toInterface);
}

// find all orgs that contain user id in either members, invites, or pendingMembers
// collections
export async function findOrganizationsByUserId(userId: string) {
  const docs = await OrganizationModel.find({
    $or: [
      {
        members: {
          $elemMatch: {
            id: userId,
          },
        },
      },
      {
        pendingMembers: {
          $elemMatch: {
            id: userId,
          },
        },
      },
      {
        invites: {
          $elemMatch: {
            id: userId,
          },
        },
      },
    ],
  });
  return docs.map(toInterface);
}

export async function findOrganizationByInviteKey(key: string) {
  const doc = await OrganizationModel.findOne({
    "invites.key": key,
  });
  return doc ? toInterface(doc) : null;
}

export async function getOrganizationFromSlackTeam(teamId: string) {
  const organization = await OrganizationModel.findOne({
    "connections.slack.team": teamId,
  });
  if (!organization) {
    throw new Error("Unknown slack team id");
  }

  return toInterface(organization);
}

export async function getOrganizationsWithNorthStars() {
  const withNorthStars = await OrganizationModel.find({
    "settings.northStar.metricIds": {
      $exists: true,
      $ne: [],
    },
  });
  return withNorthStars.map(toInterface);
}

export async function removeProjectFromProjectRoles(
  project: string,
  org: OrganizationInterface
) {
  if (!org) return;

  const updates: {
    members?: Member[];
    invites?: Invite[];
  } = {};

  const members = cloneDeep(org.members);
  members.forEach((m) => {
    if (!m.projectRoles?.length) return;
    m.projectRoles = m.projectRoles.filter((pr) => pr.project !== project);
  });
  if (JSON.stringify(members) !== JSON.stringify(org.members)) {
    updates["members"] = members;
  }

  const invites = cloneDeep(org.invites);
  invites.forEach((inv) => {
    if (!inv.projectRoles?.length) return;
    inv.projectRoles = inv.projectRoles.filter((pr) => pr.project !== project);
  });
  if (JSON.stringify(invites) !== JSON.stringify(org.invites)) {
    updates["invites"] = invites;
  }

  if (Object.keys(updates).length > 0) {
    await OrganizationModel.updateOne({ id: org.id }, { $set: updates });
  }
}

export async function findOrganizationsByDomain(domain: string) {
  const docs = await OrganizationModel.find({ verifiedDomain: domain });
  return docs.map(toInterface);
}

export async function setOrganizationMessages(
  orgId: string,
  messages: OrganizationMessage[]
): Promise<void> {
  await OrganizationModel.updateOne(
    {
      id: orgId,
    },
    { messages },
    {
      runValidators: true,
    }
  );
}

export function toOrganizationApiInterface(
  org: OrganizationInterface
): ApiOrganization {
  const { id, externalId, name, ownerEmail, dateCreated } = org;
  return {
    id,
    externalId,
    name,
    ownerEmail,
    dateCreated: dateCreated?.toISOString() || "",
  };
}

export async function updateMember(
  org: OrganizationInterface,
  userId: string,
  updates: Partial<Member>
) {
  if (updates.id) throw new Error("Cannot update member id");

  const member = org.members.find((m) => m.id === userId);

  if (!member) throw new Error("Member not found");

  await updateOrganization(org.id, {
    members: org.members.map((m) => {
      if (m.id === userId) {
        return {
          ...m,
          ...updates,
        };
      }
      return m;
    }),
  });
}

/**
 * Delete an organization and all associated data
 */
export async function deleteOrganizationData(orgId: string) {
  logger.info("Deleting org %s", orgId);

  const org = await getOrganizationById(orgId);

  if (!org) throw new Error("Organization not found");

  const userIds = org.members.map((m: Member) => m.id);

  const usersToDelete = [];
  for (const userId of userIds) {
    const allOrgsWithUser = await findOrganizationsByUserId(userId);
    if (allOrgsWithUser.length === 1) usersToDelete.push(userId);
  }

  // these collecttions are not tied to orgs
  const collectionsIgnored = ["agendaJobs", "installations"];

  const allCollections = await mongoose.connection.db
    .listCollections()
    .toArray();

  const collections = allCollections
    .map((c) => c.name)
    .filter((c) => !collectionsIgnored.includes(c));

  const orgFieldAliases = ["organization", "org", "orgId", "organizationId"];
  const query = {
    $or: [...orgFieldAliases.map((field) => ({ [field]: orgId }))],
  };

  const collectionsHit: string[] = [];
  const collectionsMissed: string[] = [];

  for (const collection of collections) {
    let result;
    try {
      // special case for authrefreshes and forgotpasswords which only have FK to users
      if (collection === "authrefreshes" || collection === "forgotpasswords") {
        result = await mongoose.connection.db
          .collection(collection)
          .deleteMany({ userId: { $in: usersToDelete } });
      } else {
        result = await mongoose.connection.db
          .collection(collection)
          .deleteMany(query);
      }
      logger.info(
        "Deleted %s documents from %s",
        result.deletedCount,
        collection
      );
      if (result.deletedCount > 0) {
        collectionsHit.push(collection);
      } else {
        collectionsMissed.push(collection);
      }
    } catch (e) {
      logger.error("Error deleting from collection %s", collection, e);
      collectionsMissed.push(collection);
    }
  }

  logger.info("Collections hit %s", collectionsHit.length);
  logger.info(
    "Collections missed %s: %s",
    collectionsMissed.length,
    collectionsMissed.join(", ")
  );

  const usersDeleted = await mongoose.connection.db
    .collection("users")
    .deleteMany({ id: { $in: usersToDelete } });

  if (usersDeleted.deletedCount > 0) {
    logger.info("Deleted %s users", usersDeleted.deletedCount);
  } else {
    logger.info("No users deleted");
  }

  const orgDeleted = await mongoose.connection.db
    .collection("organizations")
    .deleteOne({ id: orgId });

  if (orgDeleted.deletedCount > 0) {
    logger.info("Deleted org %s", orgId);
  } else {
    logger.info("Org was not deleted %s", orgId);
  }
}
