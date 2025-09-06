import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getBundle, updateBundle } from "~/services/bundle-metaobject.server";
import { syncBundleOnChange } from "~/services/cart-transform-sync.server";
import type {
  UpdateStepRequest,
  UpdateStepResponse,
  RemoveStepResponse,
  BundleStep,
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

// PUT /api/bundles/:bundleId/steps/:stepId - Update step
// DELETE /api/bundles/:bundleId/steps/:stepId - Remove step
export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const { admin, session } = await authenticate.admin(request);
    const method = request.method;

    if (!params.bundleId || !params.stepId) {
      return createErrorResponse(
        "Bundle ID and Step ID are required",
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

    // Find the step to update/delete
    const stepIndex = bundle.steps.findIndex(step => step.id === params.stepId);
    
    if (stepIndex === -1) {
      return createErrorResponse(
        "Step not found",
        "BUNDLE_NOT_FOUND",
        404
      );
    }

    // DELETE request - Remove step
    if (method === "DELETE") {
      // Remove the step from the bundle
      const updatedSteps = bundle.steps.filter((_, index) => index !== stepIndex);
      
      // Update the bundle without the step
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

      // Sync to cart transform
      await syncBundleOnChange(admin, session.shop, params.bundleId, "update");

      const response: RemoveStepResponse = {
        success: true,
      };

      return json(response);
    }

    // PUT request - Update step
    if (method === "PUT") {
      const data: UpdateStepRequest = await request.json();
      
      // Get the current step
      const currentStep = bundle.steps[stepIndex];
      
      // Create updated step with merged data
      const updatedStep: BundleStep = {
        id: currentStep.id,
        title: data.title ?? currentStep.title,
        description: data.description !== undefined ? data.description : currentStep.description,
        position: currentStep.position, // Position is managed separately
        minSelections: data.minSelections ?? currentStep.minSelections,
        maxSelections: data.maxSelections !== undefined ? data.maxSelections : currentStep.maxSelections,
        required: data.required ?? currentStep.required,
        products: data.products ?? currentStep.products,
      };

      // Validate the updated step
      if (typeof updatedStep.minSelections !== "number" || updatedStep.minSelections < 0) {
        return createErrorResponse(
          "Min selections must be a non-negative number",
          "VALIDATION_ERROR",
          400
        );
      }

      if (!Array.isArray(updatedStep.products)) {
        return createErrorResponse(
          "Products must be an array",
          "VALIDATION_ERROR",
          400
        );
      }

      // Update the step in the bundle
      const updatedSteps = [...bundle.steps];
      updatedSteps[stepIndex] = updatedStep;
      
      // Update the bundle
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

      // Find the updated step in the response
      const updatedStepFromBundle = updateResult.bundle.steps.find(step => step.id === params.stepId);
      
      if (!updatedStepFromBundle) {
        return createErrorResponse(
          "Failed to update step",
          "INTERNAL_ERROR",
          500
        );
      }

      // Sync to cart transform
      await syncBundleOnChange(admin, session.shop, params.bundleId, "update");

      const response: UpdateStepResponse = {
        step: updatedStepFromBundle,
      };

      return json(response);
    }

    return createErrorResponse(
      "Method not allowed",
      "VALIDATION_ERROR",
      405
    );
  } catch (error) {
    console.error("Error managing step:", error);
    return createErrorResponse(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}