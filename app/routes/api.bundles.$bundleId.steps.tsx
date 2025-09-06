import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getBundle, updateBundle } from "~/services/bundle-metaobject.server";
import { syncBundleOnChange } from "~/services/cart-transform-sync.server";
import type {
  AddStepRequest,
  AddStepResponse,
  BundleStep,
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

function generateStepId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// POST /api/bundles/:bundleId/steps - Add step to bundle
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

    const data: AddStepRequest = await request.json();

    // Validate request data
    if (!data.title || typeof data.title !== "string") {
      return createErrorResponse(
        "Step title is required",
        "VALIDATION_ERROR",
        400
      );
    }

    if (typeof data.minSelections !== "number" || data.minSelections < 0) {
      return createErrorResponse(
        "Min selections must be a non-negative number",
        "VALIDATION_ERROR",
        400
      );
    }

    if (typeof data.required !== "boolean") {
      return createErrorResponse(
        "Required field must be a boolean",
        "VALIDATION_ERROR",
        400
      );
    }

    if (!Array.isArray(data.products)) {
      return createErrorResponse(
        "Products must be an array",
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

    // Create new step
    const newStep: BundleStep = {
      id: generateStepId(),
      title: data.title,
      description: data.description,
      position: data.position ?? bundle.steps.length + 1,
      minSelections: data.minSelections,
      maxSelections: data.maxSelections,
      required: data.required,
      products: data.products,
    };

    // Add the new step to the bundle
    const updatedSteps = [...bundle.steps, newStep];
    
    // If position was specified and it's not at the end, reorder steps
    if (data.position !== undefined && data.position <= bundle.steps.length) {
      updatedSteps.sort((a, b) => a.position - b.position);
    }

    // Update the bundle with the new step
    const updateResult = await updateBundle(admin, params.bundleId, {
      steps: updatedSteps.map(step => ({
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

    // Find the created step in the updated bundle
    const createdStep = updateResult.bundle.steps.find(step => step.id === newStep.id);
    
    if (!createdStep) {
      return createErrorResponse(
        "Failed to create step",
        "INTERNAL_ERROR",
        500
      );
    }

    // Sync to cart transform
    await syncBundleOnChange(admin, session.shop, params.bundleId, "update");

    const response: AddStepResponse = {
      step: createdStep,
    };

    return json(response, { status: 201 });
  } catch (error) {
    console.error("Error adding step:", error);
    return createErrorResponse(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}