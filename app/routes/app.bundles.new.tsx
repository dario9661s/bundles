import { Page, Layout, Card, BlockStack, Text } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { BundleForm } from "~/components/BundleForm";
import type { CreateBundleRequest } from "~/types/bundle";
import { useCallback } from "react";

export default function NewBundlePage() {
  const navigate = useNavigate();

  const handleSubmit = useCallback(async (data: CreateBundleRequest) => {
    console.log("Form submitted with data:", data);
    // For now, just log and navigate back
    navigate("/app/bundles");
  }, [navigate]);

  const handleCancel = useCallback(() => {
    navigate("/app/bundles");
  }, [navigate]);

  return (
    <Page
      title="Create New Bundle"
      breadcrumbs={[{ content: "Bundles", url: "/app/bundles" }]}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Create a New Product Bundle
              </Text>
              <BundleForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={false}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}