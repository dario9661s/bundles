import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { updateBundleStatuses } from "~/services/bundle-metaobject.server";
import type {
  BulkStatusUpdateRequest,
  BulkStatusUpdateResponse,
  ErrorResponse,
  ErrorCode,
  Bundle,
} from "~/types/bundle";

function createErrorResponse(
  message: string,
  code: ErrorCode,
  status: number,
  details?: any
): Response {
  const errorResponse: ErrorResponse = {
    error: true,
    message,
    code,
    details,
  };
  return json(errorResponse, { status });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Only handle POST requests
    if (request.method !== "POST") {
      return createErrorResponse(
        "Method not allowed",
        "VALIDATION_ERROR",
        405
      );
    }

    const { admin } = await authenticate.admin(request);

    // Parse request body
    const data = await request.json();
    
    // Validate bundleIds
    if (!Array.isArray(data.bundleIds)) {
      return createErrorResponse(
        "bundleIds must be an array",
        "VALIDATION_ERROR",
        400
      );
    }

    if (data.bundleIds.length === 0) {
      return createErrorResponse(
        "bundleIds array cannot be empty",
        "VALIDATION_ERROR",
        400
      );
    }

    // Limit to reasonable number of bundles to prevent timeouts
    if (data.bundleIds.length > 100) {
      return createErrorResponse(
        "Cannot update more than 100 bundles at once",
        "LIMIT_EXCEEDED",
        400
      );
    }

    // Validate each bundle ID is a string
    const invalidIds = data.bundleIds.filter((id: any) => typeof id !== "string" || id.trim().length === 0);
    if (invalidIds.length > 0) {
      return createErrorResponse(
        "All bundle IDs must be non-empty strings",
        "VALIDATION_ERROR",
        400,
        { invalidIds }
      );
    }

    // Validate status
    if (!data.status || !["active", "inactive", "draft"].includes(data.status)) {
      return createErrorResponse(
        "Status must be 'active', 'inactive', or 'draft'",
        "VALIDATION_ERROR",
        400
      );
    }

    const bulkStatusUpdateRequest: BulkStatusUpdateRequest = {
      bundleIds: data.bundleIds.map((id: string) => id.trim()),
      status: data.status as Bundle['status'],
    };

    // Perform bulk status update
    const result = await updateBundleStatuses(
      admin, 
      bulkStatusUpdateRequest.bundleIds, 
      bulkStatusUpdateRequest.status
    );

    const response: BulkStatusUpdateResponse = result;

    // Return 200 even if some operations failed - the client should check individual results
    return json(response, { status: 200 });
  } catch (error) {
    console.error("Error in bulk status update:", error);
    return createErrorResponse(
      `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR",
      500,
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}