import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { ensureMetaobjectDefinitionExists, createBundle, listBundles } from "~/services/bundle-metaobject.server";

// Test endpoint to verify metaobject implementation
// GET /api/bundles/test
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { admin } = await authenticate.admin(request);
    
    // Step 1: Ensure metaobject definition exists
    await ensureMetaobjectDefinitionExists(admin);
    
    // Step 2: Create a test bundle
    const testBundle = {
      title: "Test Bundle - " + new Date().toISOString(),
      status: "draft" as const,
      discountType: "percentage" as const,
      discountValue: 10,
      layoutType: "grid" as const,
      mobileColumns: 2,
      desktopColumns: 4,
      steps: [
        {
          id: "step_1",
          title: "Choose Your Products",
          description: "Select 2-3 products",
          position: 1,
          minSelections: 2,
          maxSelections: 3,
          required: true,
          products: [
            { id: "gid://shopify/Product/1", position: 1 },
            { id: "gid://shopify/Product/2", position: 2 },
          ],
        },
      ],
    };
    
    const createResult = await createBundle(admin, testBundle);
    
    // Step 3: List bundles to verify
    const listResult = await listBundles(admin, 1, 10);
    
    return json({
      success: true,
      test: "GraphQL metaobject operations",
      results: {
        definitionCreated: true,
        createBundle: {
          success: !!createResult.bundle,
          errors: createResult.errors,
          bundle: createResult.bundle,
        },
        listBundles: {
          count: listResult.bundles.length,
          total: listResult.total,
          bundles: listResult.bundles,
        },
      },
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