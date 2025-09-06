import { Page, Layout, Card, BlockStack, Text, Banner } from "@shopify/polaris";
import { useNavigate, useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { BundleForm } from "~/components/BundleForm";
import { authenticate } from "~/shopify.server";
import { getBundle, updateBundle } from "~/services/bundle-metaobject.server";
import type { CreateBundleRequest, Bundle } from "~/types/bundle";
import { useCallback, useState } from "react";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  if (!params.id) {
    throw new Response("Bundle ID is required", { status: 400 });
  }

  try {
    const bundle = await getBundle(admin, params.id);
    
    if (!bundle) {
      throw new Response("Bundle not found", { status: 404 });
    }

    return json({ bundle });
  } catch (error) {
    console.error("Error loading bundle:", error);
    throw new Response("Failed to load bundle", { status: 500 });
  }
};

export default function EditBundlePage() {
  const { bundle } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (data: CreateBundleRequest) => {
    console.log("Updating bundle with data:", data);
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/bundles/${bundle.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update bundle");
      }

      console.log("Bundle updated successfully:", result);
      navigate("/app/bundles");
    } catch (err) {
      console.error("Error updating bundle:", err);
      setError(err instanceof Error ? err.message : "Failed to update bundle");
      setIsSubmitting(false);
    }
  }, [bundle.id, navigate]);

  const handleCancel = useCallback(() => {
    navigate("/app/bundles");
  }, [navigate]);

  return (
    <Page
      title={`Edit Bundle: ${bundle.title}`}
      breadcrumbs={[{ content: "Bundles", url: "/app/bundles" }]}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Edit Bundle
              </Text>
              {error && (
                <Banner status="critical" onDismiss={() => setError(null)}>
                  {error}
                </Banner>
              )}
              <BundleForm
                bundle={bundle}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}