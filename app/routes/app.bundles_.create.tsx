import { Page, Layout, Card, BlockStack, Text, Banner } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { BundleForm } from "~/components/BundleForm";
import type { CreateBundleRequest } from "~/types/bundle";
import { useCallback, useState } from "react";

export default function CreateBundlePage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (data: CreateBundleRequest) => {
    console.log("Form submitted with data:", data);
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/bundles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create bundle");
      }

      console.log("Bundle created successfully:", result);
      navigate("/app/bundles");
    } catch (err) {
      console.error("Error creating bundle:", err);
      setError(err instanceof Error ? err.message : "Failed to create bundle");
      setIsSubmitting(false);
    }
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
          <BlockStack gap="400">
            {error && (
              <Banner status="critical" onDismiss={() => setError(null)}>
                {error}
              </Banner>
            )}
            <BundleForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
            />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}