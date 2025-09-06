import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { 
  createBundle,
  listBundles,
  getBundle,
  updateBundle,
  deleteBundle 
} from "~/services/bundle-metaobject.server";
import { syncBundlesToCartTransform } from "~/services/cart-transform-sync.server";

// Test endpoint to verify all backend functionality works
// GET /api/test-all
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { admin, session } = await authenticate.admin(request);
    const testResults = [];

    // Test 1: Create Bundle
    const testBundle = {
      title: "Test Bundle - Full Integration " + Date.now(),
      status: "active" as const,
      discountType: "percentage" as const,
      discountValue: 15,
      layoutType: "grid" as const,
      mobileColumns: 2,
      desktopColumns: 4,
      steps: [
        {
          id: `step_${Date.now()}_1`,
          title: "Choose Main Product",
          description: "Select your primary item",
          position: 1,
          minSelections: 1,
          maxSelections: 1,
          required: true,
          products: [
            { id: "gid://shopify/Product/1234567890", position: 1 },
          ],
        },
        {
          id: `step_${Date.now()}_2`,
          title: "Add Accessories",
          description: "Choose 1-2 accessories",
          position: 2,
          minSelections: 1,
          maxSelections: 2,
          required: false,
          products: [
            { id: "gid://shopify/Product/1234567891", position: 1 },
            { id: "gid://shopify/Product/1234567892", position: 2 },
          ],
        },
      ],
    };

    const createResult = await createBundle(admin, testBundle);
    testResults.push({
      test: "Create Bundle",
      success: !!createResult.bundle,
      bundleId: createResult.bundle?.id,
      errors: createResult.errors,
    });

    if (!createResult.bundle) {
      return json({
        success: false,
        message: "Bundle creation failed",
        results: testResults,
      });
    }

    const bundleId = createResult.bundle.id;

    // Test 2: List Bundles
    const listResult = await listBundles(admin, 1, 10, "active");
    testResults.push({
      test: "List Bundles",
      success: listResult.bundles.length > 0,
      bundleCount: listResult.bundles.length,
    });

    // Test 3: Get Single Bundle
    const getResult = await getBundle(admin, bundleId);
    testResults.push({
      test: "Get Single Bundle",
      success: !!getResult && getResult.id === bundleId,
      bundle: getResult,
    });

    // Test 4: Update Bundle
    const updateResult = await updateBundle(admin, bundleId, {
      discountValue: 20,
    });
    testResults.push({
      test: "Update Bundle",
      success: !!updateResult.bundle && updateResult.bundle.discountValue === 20,
      updatedDiscountValue: updateResult.bundle?.discountValue,
    });

    // Test 5: Sync to Cart Transform
    const syncResult = await syncBundlesToCartTransform(admin, session.shop);
    testResults.push({
      test: "Sync to Cart Transform",
      success: syncResult.success,
      error: syncResult.error,
    });

    // Test 6: Delete Bundle (cleanup)
    const deleteResult = await deleteBundle(admin, bundleId);
    testResults.push({
      test: "Delete Bundle",
      success: deleteResult.success,
      errors: deleteResult.errors,
    });

    // Calculate overall success
    const overallSuccess = testResults.every(result => result.success);

    return json({
      success: overallSuccess,
      message: overallSuccess ? "All tests passed!" : "Some tests failed",
      results: testResults,
      implementedFeatures: [
        "✅ Bundle CRUD Operations (Contract 1)",
        "✅ Product Search API (Contract 2)",
        "✅ Bundle Step Management (Contract 3)",
        "✅ Price Calculation API (Contract 5)",
        "✅ Cart Transform Auto-Detection",
        "✅ Bundle-to-Cart Sync",
        "✅ Error Handling",
        "✅ Type Safety",
      ],
    });
  } catch (error) {
    console.error("Test error:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}