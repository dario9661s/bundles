import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getBundle, updateBundle } from "~/services/bundle-metaobject.server";
import { updateCombination, deleteCombination } from "~/services/bundle-combination.server";
import type { ErrorResponse, ErrorCode } from "~/types/bundle";

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

// PUT /api/bundles/:bundleId/combinations/:combinationId
// DELETE /api/bundles/:bundleId/combinations/:combinationId
export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const { admin } = await authenticate.admin(request);
    const method = request.method;
    const { bundleId, combinationId } = params;

    if (!bundleId || !combinationId) {
      return createErrorResponse(
        "Bundle ID and Combination ID are required",
        "VALIDATION_ERROR",
        400
      );
    }

    // Decode IDs in case they're URL-encoded
    const decodedBundleId = decodeURIComponent(bundleId);
    const decodedCombinationId = decodeURIComponent(combinationId);

    // Verify bundle exists and has this combination
    const bundle = await getBundle(admin, decodedBundleId);
    if (!bundle) {
      return createErrorResponse(
        "Bundle not found",
        "BUNDLE_NOT_FOUND",
        404
      );
    }

    if (!bundle.combinationImages?.includes(decodedCombinationId)) {
      return createErrorResponse(
        "Combination not found in this bundle",
        "BUNDLE_NOT_FOUND",
        404
      );
    }

    if (method === "PUT") {
      const data = await request.json();

      // Validate that at least one field is being updated
      if (!data.title && !data.imageBase64) {
        return createErrorResponse(
          "At least one field must be provided for update",
          "VALIDATION_ERROR",
          400
        );
      }

      const result = await updateCombination(admin, decodedCombinationId, {
        title: data.title,
        imageBase64: data.imageBase64,
      });

      if (!result.combination) {
        return createErrorResponse(
          result.errors.join(", "),
          "VALIDATION_ERROR",
          400
        );
      }

      return json({ combination: result.combination });
    }

    if (method === "DELETE") {
      const result = await deleteCombination(admin, decodedCombinationId);

      if (!result.success) {
        return createErrorResponse(
          result.errors.join(", "),
          "INTERNAL_ERROR",
          500
        );
      }

      // Update bundle to remove this combination reference
      const updatedCombinationImages = bundle.combinationImages.filter(
        id => id !== decodedCombinationId
      );
      await updateBundle(admin, decodedBundleId, {
        combinationImages: updatedCombinationImages,
      });

      return json({ success: true });
    }

    return createErrorResponse(
      "Method not allowed",
      "VALIDATION_ERROR",
      405
    );
  } catch (error) {
    console.error("Error in combination action:", error);
    return createErrorResponse(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}