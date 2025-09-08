import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getBundle, updateBundle } from "~/services/bundle-metaobject.server";
import {
  getCombinationsForBundle,
  createCombination,
  deleteCombination,
  ensureCombinationDefinitionExists,
} from "~/services/bundle-combination.server";
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

// GET /api/bundles/:bundleId/combinations
export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const { admin } = await authenticate.admin(request);
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
    
    // Fetch the bundle
    const bundle = await getBundle(admin, decodedBundleId);
    if (!bundle) {
      return createErrorResponse(
        "Bundle not found",
        "BUNDLE_NOT_FOUND",
        404
      );
    }

    // Ensure combination metaobject definition exists
    await ensureCombinationDefinitionExists(admin);

    // Get combinations for this bundle
    const combinations = await getCombinationsForBundle(
      admin,
      bundle.combinationImages || []
    );

    // Get all available products from bundle steps
    const availableProducts = bundle.steps.flatMap((step) =>
      step.products.map((product) => ({
        id: product.id,
        title: `Product ${product.id}`, // This will be populated with actual product data by frontend
        stepTitle: step.title,
        stepPosition: step.position,
      }))
    );

    return json({
      combinations,
      availableProducts,
    });
  } catch (error) {
    console.error("Error fetching bundle combinations:", error);
    return createErrorResponse(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}

// POST /api/bundles/:bundleId/combinations
// DELETE /api/bundles/:bundleId/combinations (bulk delete)
export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const { admin } = await authenticate.admin(request);
    const method = request.method;
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

    // Fetch the bundle
    const bundle = await getBundle(admin, decodedBundleId);
    if (!bundle) {
      return createErrorResponse(
        "Bundle not found",
        "BUNDLE_NOT_FOUND",
        404
      );
    }

    if (method === "POST") {
      const data = await request.json();

      // Validate request data
      if (!data.productIds || !Array.isArray(data.productIds) || data.productIds.length < 2) {
        return createErrorResponse(
          "At least 2 product IDs are required",
          "VALIDATION_ERROR",
          400
        );
      }

      if (!data.imageBase64 || typeof data.imageBase64 !== "string") {
        return createErrorResponse(
          "Base64 image data is required",
          "VALIDATION_ERROR",
          400
        );
      }

      // Create the combination
      const result = await createCombination(
        admin,
        data.productIds,
        data.imageBase64,
        data.title
      );

      if (!result.combination) {
        return createErrorResponse(
          result.errors.join(", "),
          "VALIDATION_ERROR",
          400
        );
      }

      // Update bundle with new combination reference
      const combinationImages = [...(bundle.combinationImages || []), result.combination.id];
      await updateBundle(admin, decodedBundleId, { combinationImages });

      return json({ combination: result.combination }, { status: 201 });
    }

    if (method === "DELETE") {
      // Bulk delete - expects array of combination IDs in body
      const data = await request.json();
      
      if (!data.combinationIds || !Array.isArray(data.combinationIds)) {
        return createErrorResponse(
          "Combination IDs array is required",
          "VALIDATION_ERROR",
          400
        );
      }

      const results = [];
      let deleted = 0;
      let failed = 0;

      for (const combinationId of data.combinationIds) {
        const result = await deleteCombination(admin, combinationId);
        if (result.success) {
          deleted++;
          results.push({ combinationId, success: true });
        } else {
          failed++;
          results.push({ 
            combinationId, 
            success: false, 
            error: result.errors.join(", ") 
          });
        }
      }

      // Update bundle to remove deleted combination references
      if (deleted > 0) {
        const updatedCombinationImages = (bundle.combinationImages || [])
          .filter(id => !data.combinationIds.includes(id));
        await updateBundle(admin, decodedBundleId, { 
          combinationImages: updatedCombinationImages 
        });
      }

      return json({
        success: failed === 0,
        results,
        summary: {
          total: data.combinationIds.length,
          deleted,
          failed,
        },
      });
    }

    return createErrorResponse(
      "Method not allowed",
      "VALIDATION_ERROR",
      405
    );
  } catch (error) {
    console.error("Error in bundle combinations action:", error);
    return createErrorResponse(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}