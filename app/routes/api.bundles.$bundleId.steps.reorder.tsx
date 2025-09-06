import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getBundle, updateBundle } from "~/services/bundle-metaobject.server";
import { syncBundleOnChange } from "~/services/cart-transform-sync.server";
import type {
  ReorderStepsRequest,
  ReorderStepsResponse,
  ErrorResponse,
  ErrorCode,
} from "~/types/bundle.types";

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

// POST /api/bundles/:bundleId/steps/reorder - Reorder steps
export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const { admin, session } = await authenticate.admin(request);
    
    if (request.method !== "POST") {
      return createErrorResponse(
        "Method not allowed",
        "VALIDATION_ERROR",
        405
      );
    }

    if (!params.bundleId) {
      return createErrorResponse(
        "Bundle ID is required",
        "VALIDATION_ERROR",
        400
      );
    }

    const data: ReorderStepsRequest = await request.json();

    // Validate request data
    if (!Array.isArray(data.stepOrder) || data.stepOrder.length === 0) {
      return createErrorResponse(
        "Step order array is required",
        "VALIDATION_ERROR",
        400
      );
    }

    // Get the current bundle
    const bundle = await getBundle(admin, params.bundleId);
    
    if (!bundle) {
      return createErrorResponse(
        "Bundle not found",
        "BUNDLE_NOT_FOUND",
        404
      );
    }

    // Validate that all step IDs exist in the bundle
    const bundleStepIds = new Set(bundle.steps.map(step => step.id));
    const requestStepIds = new Set(data.stepOrder.map(item => item.stepId));
    
    if (bundleStepIds.size !== requestStepIds.size) {
      return createErrorResponse(
        "Step count mismatch",
        "VALIDATION_ERROR",
        400
      );
    }

    for (const stepId of requestStepIds) {
      if (!bundleStepIds.has(stepId)) {
        return createErrorResponse(
          `Step ID ${stepId} not found in bundle`,
          "VALIDATION_ERROR",
          400
        );
      }
    }

    // Create a map for quick lookup of current steps
    const stepMap = new Map(bundle.steps.map(step => [step.id, step]));
    
    // Create reordered steps array
    const reorderedSteps = data.stepOrder
      .sort((a, b) => a.position - b.position) // Sort by position
      .map(({ stepId, position }) => {
        const step = stepMap.get(stepId)!;
        return {
          ...step,
          position,
        };
      });

    // Update the bundle with reordered steps
    const updateResult = await updateBundle(admin, params.bundleId, {
      steps: reorderedSteps.map(step => ({
        id: step.id,
        title: step.title,
        description: step.description,
        position: step.position,
        minSelections: step.minSelections,
        maxSelections: step.maxSelections,
        required: step.required,
        products: step.products,
      })),
    });

    if (!updateResult.bundle) {
      return createErrorResponse(
        updateResult.errors.join(", "),
        "INTERNAL_ERROR",
        500
      );
    }

    // Sync to cart transform
    await syncBundleOnChange(admin, session.shop, params.bundleId, "update");

    const response: ReorderStepsResponse = {
      steps: updateResult.bundle.steps,
    };

    return json(response);
  } catch (error) {
    console.error("Error reordering steps:", error);
    return createErrorResponse(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}