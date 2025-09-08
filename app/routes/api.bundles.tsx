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
  LayoutSettings,
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

function validateLayoutSettings(layoutSettings: any, layoutType: string): string[] {
  const errors: string[] = [];
  
  if (!layoutSettings) return errors;
  
  // Ensure only settings for the active layout type are present
  const allowedSettings = {
    basic: 'basicSettings',
    grid: 'gridSettings',
    slider: 'sliderSettings',
    modal: 'modalSettings',
    selection: 'selectionSettings',
    stepper: 'stepperSettings',
  };
  
  const expectedSetting = allowedSettings[layoutType as keyof typeof allowedSettings];
  
  // Check for invalid settings for the current layout type
  Object.keys(allowedSettings).forEach((type) => {
    const settingKey = allowedSettings[type as keyof typeof allowedSettings];
    if (type !== layoutType && layoutSettings[settingKey]) {
      errors.push(`${settingKey} is not allowed for layout type '${layoutType}'`);
    }
  });
  
  // Validate specific settings based on layout type
  if (layoutType === 'grid' && layoutSettings.gridSettings) {
    const grid = layoutSettings.gridSettings;
    if (grid.productsPerRow) {
      if (![1, 2].includes(grid.productsPerRow.mobile)) {
        errors.push('Grid mobile products per row must be 1 or 2');
      }
      if (![2, 3, 4].includes(grid.productsPerRow.tablet)) {
        errors.push('Grid tablet products per row must be 2, 3, or 4');
      }
      if (![3, 4, 5, 6].includes(grid.productsPerRow.desktop)) {
        errors.push('Grid desktop products per row must be 3, 4, 5, or 6');
      }
    }
    if (!['top', 'left'].includes(grid.imagePosition)) {
      errors.push('Grid image position must be "top" or "left"');
    }
  }
  
  if (layoutType === 'slider' && layoutSettings.sliderSettings) {
    const slider = layoutSettings.sliderSettings;
    if (slider.slidesToShow) {
      if (![1, 2].includes(slider.slidesToShow.mobile)) {
        errors.push('Slider mobile slides to show must be 1 or 2');
      }
      if (![2, 3].includes(slider.slidesToShow.tablet)) {
        errors.push('Slider tablet slides to show must be 2 or 3');
      }
      if (![3, 4, 5].includes(slider.slidesToShow.desktop)) {
        errors.push('Slider desktop slides to show must be 3, 4, or 5');
      }
    }
    if (typeof slider.slidesToScroll !== 'number' || slider.slidesToScroll < 1) {
      errors.push('Slider slides to scroll must be a positive number');
    }
    if (typeof slider.autoplaySpeed !== 'number' || slider.autoplaySpeed < 1000) {
      errors.push('Slider autoplay speed must be at least 1000 milliseconds');
    }
  }
  
  if (layoutType === 'modal' && layoutSettings.modalSettings) {
    const modal = layoutSettings.modalSettings;
    if (!['button', 'auto', 'exit-intent'].includes(modal.triggerType)) {
      errors.push('Modal trigger type must be "button", "auto", or "exit-intent"');
    }
    if (!['closeOnAdd', 'stayOpen', 'redirectToCart'].includes(modal.modalBehavior)) {
      errors.push('Modal behavior must be "closeOnAdd", "stayOpen", or "redirectToCart"');
    }
    if (!['productCount', 'fixed'].includes(modal.modalSize)) {
      errors.push('Modal size must be "productCount" or "fixed"');
    }
  }
  
  if (layoutType === 'selection' && layoutSettings.selectionSettings) {
    const selection = layoutSettings.selectionSettings;
    if (!['click', 'drag', 'both'].includes(selection.selectionMode)) {
      errors.push('Selection mode must be "click", "drag", or "both"');
    }
    if (!['hide', 'show', 'showGhost'].includes(selection.emptySlotBehavior)) {
      errors.push('Empty slot behavior must be "hide", "show", or "showGhost"');
    }
    if (!['counter', 'percentage', 'visual'].includes(selection.progressTracking)) {
      errors.push('Progress tracking must be "counter", "percentage", or "visual"');
    }
    if (typeof selection.selectionLimit !== 'number' || selection.selectionLimit < 1) {
      errors.push('Selection limit must be a positive number');
    }
  }
  
  if (layoutType === 'basic' && layoutSettings.basicSettings) {
    const basic = layoutSettings.basicSettings;
    if (!['left', 'right'].includes(basic.imagePosition)) {
      errors.push('Basic image position must be "left" or "right"');
    }
    if (!['square', 'portrait', 'landscape'].includes(basic.imageAspectRatio)) {
      errors.push('Basic image aspect ratio must be "square", "portrait", or "landscape"');
    }
    if (!['zoom', 'lightbox', 'none'].includes(basic.imageBehavior)) {
      errors.push('Basic image behavior must be "zoom", "lightbox", or "none"');
    }
    if (!['thumbnails', 'dots', 'none'].includes(basic.imageGalleryType)) {
      errors.push('Basic image gallery type must be "thumbnails", "dots", or "none"');
    }
    if (!['narrow', 'medium', 'wide'].includes(basic.contentWidth)) {
      errors.push('Basic content width must be "narrow", "medium", or "wide"');
    }
    if (!['stacked', 'horizontal'].includes(basic.mobileLayout)) {
      errors.push('Basic mobile layout must be "stacked" or "horizontal"');
    }
    if (typeof basic.showProgressBar !== 'boolean') {
      errors.push('Basic show progress bar must be a boolean');
    }
    if (!['slide', 'fade', 'none'].includes(basic.stepTransition)) {
      errors.push('Basic step transition must be "slide", "fade", or "none"');
    }
  }
  
  if (layoutType === 'stepper' && layoutSettings.stepperSettings) {
    const stepper = layoutSettings.stepperSettings;
    if (typeof stepper.showProgressBar !== 'boolean') {
      errors.push('Stepper show progress bar must be a boolean');
    }
    if (!['top', 'bottom'].includes(stepper.progressBarPosition)) {
      errors.push('Stepper progress bar position must be "top" or "bottom"');
    }
    if (typeof stepper.allowBackNavigation !== 'boolean') {
      errors.push('Stepper allow back navigation must be a boolean');
    }
    if (!['summary', 'auto-add', 'redirect'].includes(stepper.completionBehavior)) {
      errors.push('Stepper completion behavior must be "summary", "auto-add", or "redirect"');
    }
    if (typeof stepper.showStepNumbers !== 'boolean') {
      errors.push('Stepper show step numbers must be a boolean');
    }
    if (!['slide', 'fade', 'none'].includes(stepper.animationStyle)) {
      errors.push('Stepper animation style must be "slide", "fade", or "none"');
    }
  }
  
  return errors;
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

  if (!["basic", "modal", "selection", "stepper"].includes(data.layoutType)) {
    errors.push("Layout type must be 'basic', 'modal', 'selection', or 'stepper'");
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

  // Validate layout settings if provided
  if (data.layoutSettings) {
    const layoutSettingsErrors = validateLayoutSettings(data.layoutSettings, data.layoutType);
    errors.push(...layoutSettingsErrors);
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
      // Decode the ID in case it's URL-encoded
      const decodedId = decodeURIComponent(params.id);
      const bundle = await getBundle(admin, decodedId);
      
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
      pagination: result.pagination,
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

      // Decode the ID in case it's URL-encoded
      const decodedId = decodeURIComponent(params.id);
      const result = await deleteBundle(admin, decodedId);

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
      if (data.layoutSettings !== undefined) {
        // Validate layout settings for update
        if (data.layoutType || updateData.layoutType) {
          const layoutType = data.layoutType || updateData.layoutType;
          const layoutSettingsErrors = validateLayoutSettings(data.layoutSettings, layoutType);
          if (layoutSettingsErrors.length > 0) {
            return createErrorResponse(
              layoutSettingsErrors.join(", "),
              "VALIDATION_ERROR",
              400,
              { errors: layoutSettingsErrors }
            );
          }
        }
        updateData.layoutSettings = data.layoutSettings;
      }
      if (data.steps !== undefined) {
        updateData.steps = generateStepIds(data.steps);
      }

      // Decode the ID in case it's URL-encoded
      const decodedId = decodeURIComponent(params.id);
      const result = await updateBundle(admin, decodedId, updateData);

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
        layoutSettings: data.layoutSettings,
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
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return createErrorResponse(
      `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
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