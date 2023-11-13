import { DeleteSavedGroupResponse } from "../../../types/openapi";
import {
  deleteSavedGroupById,
  getSavedGroupById,
} from "../../models/SavedGroupModel";
import { createApiRequestHandler } from "../../util/handler";
import { deleteSavedGroupValidator } from "../../validators/openapi";

export const deleteSavedGroup = createApiRequestHandler(
  deleteSavedGroupValidator
)(
  async (req): Promise<DeleteSavedGroupResponse> => {
    const savedGroup = await getSavedGroupById(req.params.id, req.organization);

    if (!savedGroup) {
      throw new Error("Unable to delete saved group. No group found.");
    }

    await deleteSavedGroupById(req.params.id, req.organization.id);

    return {
      deletedId: req.params.id,
    };
  }
);
