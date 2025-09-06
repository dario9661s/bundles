import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import {
  listBundles,
  getBundle,
  createBundle,
  updateBundle,
  deleteBundle,
} from "~/services/bundle-metaobject.server";
import type {
  ListBundlesRequest,
  ListBundlesResponse,
  CreateBundleRequest,
  UpdateBundleRequest,
  ErrorResponse,
  ErrorCode,
  Bundle,
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

function validateBundleData(data: any): string[] {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== "string") {
    errors.push("Title is required and must be a string");
  }

  if (!["active", "draft"].includes(data.status)) {
    errors.push("Status must be 'active' or 'draft'");
  }

  if (!["percentage", "fixed", "total"].includes(data.discountType)) {
    errors.push("Discount type must be 'percentage', 'fixed', or 'total'");
  }

  if (typeof data.discountValue !== "number" || data.discountValue < 0) {
    errors.push("Discount value must be a non-negative number");
  }

  if (!["grid", "slider", "portrait", "landscape"].includes(data.layoutType)) {
    errors.push("Layout type must be 'grid', 'slider', 'portrait', or 'landscape'");
  }

  if (
    typeof data.mobileColumns !== "number" ||
    data.mobileColumns < 1 ||
    data.mobileColumns > 4
  ) {
    errors.push("Mobile columns must be a number between 1 and 4");
  }

  if (
    typeof data.desktopColumns !== "number" ||
    data.desktopColumns < 1 ||
    data.desktopColumns > 6
  ) {
    errors.push("Desktop columns must be a number between 1 and 6");
  }

  if (!Array.isArray(data.steps) || data.steps.length === 0) {
    errors.push("Steps must be a non-empty array");
  } else {
    data.steps.forEach((step: any, index: number) => {
      if (!step.title || typeof step.title !== "string") {
        errors.push(`Step ${index + 1}: Title is required`);
      }

      if (typeof step.position !== "number") {
        errors.push(`Step ${index + 1}: Position must be a number`);
      }

      if (typeof step.minSelections !== "number" || step.minSelections < 0) {
        errors.push(`Step ${index + 1}: Min selections must be a non-negative number`);
      }

      if (
        step.maxSelections !== undefined &&
        step.maxSelections !== null &&
        (typeof step.maxSelections !== "number" || step.maxSelections < step.minSelections)
      ) {
        errors.push(
          `Step ${index + 1}: Max selections must be a number greater than or equal to min selections`
        );
      }

      if (typeof step.required !== "boolean") {
        errors.push(`Step ${index + 1}: Required must be a boolean`);
      }

      if (!Array.isArray(step.products)) {
        errors.push(`Step ${index + 1}: Products must be an array`);
      } else {
        step.products.forEach((product: any, productIndex: number) => {
          if (!product.id || typeof product.id !== "string") {
            errors.push(`Step ${index + 1}, Product ${productIndex + 1}: ID is required`);
          }

          if (typeof product.position !== "number") {
            errors.push(
              `Step ${index + 1}, Product ${productIndex + 1}: Position must be a number`
            );
          }
        });
      }
    });
  }

  return errors;
}

function generateStepIds(steps: any[]): any[] {
  return steps.map((step, index) => ({
    ...step,
    id: `step_${Date.now()}_${index}`,
  }));
}

// GET /api/bundles - List bundles
// GET /api/bundles/:id - Get single bundle
export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);

    // Check if this is a single bundle request
    if (params.id) {
      const bundle = await getBundle(admin, params.id);
      
      if (!bundle) {
        return createErrorResponse(
          "Bundle not found",
          "BUNDLE_NOT_FOUND",
          404
        );
      }

      return json({ bundle });
    }

    // List bundles
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const status = url.searchParams.get("status") as ListBundlesRequest["status"];

    if (limit > 100) {
      return createErrorResponse(
        "Limit cannot exceed 100",
        "LIMIT_EXCEEDED",
        400
      );
    }

    const result = await listBundles(admin, page, limit, status);

    const response: ListBundlesResponse = {
      bundles: result.bundles,
      pagination: {
        page,
        limit,
        total: result.total,
        hasNext: result.hasNext,
      },
    };

    return json(response);
  } catch (error) {
    console.error("Error in bundle loader:", error);
    return createErrorResponse(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}

// POST /api/bundles - Create bundle
// PUT /api/bundles/:id - Update bundle
// DELETE /api/bundles/:id - Delete bundle
export async function action({ request, params }: ActionFunctionArgs) {
  try {
    const { admin } = await authenticate.admin(request);
    const method = request.method;

    // DELETE request
    if (method === "DELETE") {
      if (!params.id) {
        return createErrorResponse(
          "Bundle ID is required",
          "VALIDATION_ERROR",
          400
        );
      }

      const result = await deleteBundle(admin, params.id);

      if (!result.success) {
        return createErrorResponse(
          result.errors.join(", "),
          "BUNDLE_NOT_FOUND",
          404
        );
      }

      return json({ success: true });
    }

    // POST or PUT request
    const data = await request.json();

    // PUT request - Update bundle
    if (method === "PUT") {
      if (!params.id) {
        return createErrorResponse(
          "Bundle ID is required",
          "VALIDATION_ERROR",
          400
        );
      }

      // For update, validate only provided fields
      const updateData: UpdateBundleRequest = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.discountType !== undefined) updateData.discountType = data.discountType;
      if (data.discountValue !== undefined) updateData.discountValue = data.discountValue;
      if (data.layoutType !== undefined) updateData.layoutType = data.layoutType;
      if (data.mobileColumns !== undefined) updateData.mobileColumns = data.mobileColumns;
      if (data.desktopColumns !== undefined) updateData.desktopColumns = data.desktopColumns;
      if (data.steps !== undefined) {
        updateData.steps = generateStepIds(data.steps);
      }

      const result = await updateBundle(admin, params.id, updateData);

      if (!result.bundle) {
        if (result.errors.some(e => e.includes("not found"))) {
          return createErrorResponse(
            "Bundle not found",
            "BUNDLE_NOT_FOUND",
            404
          );
        }
        return createErrorResponse(
          result.errors.join(", "),
          "VALIDATION_ERROR",
          400
        );
      }

      return json({ bundle: result.bundle });
    }

    // POST request - Create bundle
    if (method === "POST") {
      const validationErrors = validateBundleData(data);
      
      if (validationErrors.length > 0) {
        return createErrorResponse(
          validationErrors.join(", "),
          "VALIDATION_ERROR",
          400,
          { errors: validationErrors }
        );
      }

      const createData: CreateBundleRequest = {
        title: data.title,
        status: data.status,
        discountType: data.discountType,
        discountValue: data.discountValue,
        layoutType: data.layoutType,
        mobileColumns: data.mobileColumns,
        desktopColumns: data.desktopColumns,
        steps: generateStepIds(data.steps),
      };

      const result = await createBundle(admin, createData);

      if (!result.bundle) {
        if (result.errors.some(e => e.includes("duplicate"))) {
          return createErrorResponse(
            "Bundle with this title already exists",
            "DUPLICATE_BUNDLE",
            409
          );
        }
        return createErrorResponse(
          result.errors.join(", "),
          "VALIDATION_ERROR",
          400
        );
      }

      return json({ bundle: result.bundle }, { status: 201 });
    }

    return createErrorResponse(
      "Method not allowed",
      "VALIDATION_ERROR",
      405
    );
  } catch (error) {
    console.error("Error in bundle action:", error);
    return createErrorResponse(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}

// Route configuration for dynamic parameters
export const handle = {
  dynamicParams: true,
};