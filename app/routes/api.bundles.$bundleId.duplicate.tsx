import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { duplicateBundle } from "~/services/bundle-metaobject.server";
import type {
  DuplicateBundleRequest,
  DuplicateBundleResponse,
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

export async function action({ request, params }: ActionFunctionArgs) {
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

    // Get bundleId from params
    const bundleId = params.bundleId;
    if (!bundleId) {
      return createErrorResponse(
        "Bundle ID is required",
        "VALIDATION_ERROR",
        400
      );
    }
    
    // Decode the ID in case it's URL-encoded
    const decodedBundleId = decodeURIComponent(bundleId);

    // Parse request body
    const data = await request.json();
    
    // Validate request
    if (!data.title || typeof data.title !== "string" || data.title.trim().length === 0) {
      return createErrorResponse(
        "Title is required and must be a non-empty string",
        "VALIDATION_ERROR",
        400
      );
    }

    // Validate status if provided
    if (data.status && !["active", "draft"].includes(data.status)) {
      return createErrorResponse(
        "Status must be 'active' or 'draft'",
        "VALIDATION_ERROR",
        400
      );
    }

    const duplicateRequest: DuplicateBundleRequest = {
      title: data.title.trim(),
      status: data.status || "draft", // Default to draft
    };

    // Duplicate the bundle
    const result = await duplicateBundle(
      admin,
      decodedBundleId,
      duplicateRequest.title,
      duplicateRequest.status
    );

    // Handle errors
    if (!result.bundle) {
      if (result.errors.includes("Bundle not found")) {
        return createErrorResponse(
          "Bundle not found",
          "BUNDLE_NOT_FOUND",
          404
        );
      }
      
      // Check for duplicate title errors
      if (result.errors.some(e => e.includes("duplicate") || e.includes("already exists"))) {
        return createErrorResponse(
          "A bundle with this title already exists",
          "DUPLICATE_BUNDLE",
          409
        );
      }

      return createErrorResponse(
        result.errors.join(", "),
        "INTERNAL_ERROR",
        500,
        { errors: result.errors }
      );
    }

    // Return success response
    const response: DuplicateBundleResponse = {
      bundle: result.bundle,
    };

    return json(response, { status: 201 });
  } catch (error) {
    console.error("Error duplicating bundle:", error);
    return createErrorResponse(
      `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}