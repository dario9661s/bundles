import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { deleteBundles } from "~/services/bundle-metaobject.server";
import type {
  BulkDeleteBundlesRequest,
  BulkDeleteBundlesResponse,
  ErrorResponse,
  ErrorCode,
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
    
    // Validate request
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
        "Cannot delete more than 100 bundles at once",
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

    const bulkDeleteRequest: BulkDeleteBundlesRequest = {
      bundleIds: data.bundleIds.map((id: string) => id.trim()),
    };

    // Perform bulk delete
    const result = await deleteBundles(admin, bulkDeleteRequest.bundleIds);

    const response: BulkDeleteBundlesResponse = result;

    // Return 200 even if some operations failed - the client should check individual results
    return json(response, { status: 200 });
  } catch (error) {
    console.error("Error in bulk delete:", error);
    return createErrorResponse(
      `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR",
      500,
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}