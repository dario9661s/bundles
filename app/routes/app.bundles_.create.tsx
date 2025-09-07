import { Page, Layout, Card, BlockStack, Text, Banner } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { BundleForm } from "~/components/BundleForm";
import { BundleSummary } from "~/components/BundleSummary";
import type { CreateBundleRequest, Bundle } from "~/types/bundle";
import { useCallback, useState } from "react";
import "~/styles/bundle-layout.css";

export default function CreateBundlePage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<{
    title: string;
    status: Bundle['status'];
    layoutType: Bundle['layoutType'];
    discountType: Bundle['discountType'];
    discountValue: number;
    steps: any[];
    isValid: boolean;
    validationErrors?: Record<string, string>;
    touched?: Record<string, boolean>;
  }>({
    title: '',
    status: 'draft',
    layoutType: 'grid',
    discountType: 'percentage',
    discountValue: 0,
    steps: [],
    isValid: false,
    validationErrors: {},
    touched: {},
  });

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
      // Navigate to the detail view of the newly created bundle
      navigate(`/app/bundles/${encodeURIComponent(result.bundle.id)}`);
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
      backAction={{content: "Bundles", url: "/app/bundles"}}
      title="Create New Bundle"
    >
      <Layout>
        <Layout.Section variant="twoThirds">
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
              onFormStateChange={setFormState}
            />
          </BlockStack>
        </Layout.Section>
        
        <Layout.Section variant="oneThird">
          <BundleSummary
            title={formState.title}
            status={formState.status}
            layoutType={formState.layoutType}
            discountType={formState.discountType}
            discountValue={formState.discountValue}
            steps={formState.steps}
            isValid={formState.isValid}
            validationErrors={formState.validationErrors}
            touched={formState.touched}
            isEdit={false}
            isSubmitting={isSubmitting}
            onSubmit={() => {
              // Find and click the actual form submit button
              const form = document.querySelector('form');
              if (form) {
                const submitButton = form.querySelector('button[type="submit"]');
                if (submitButton) {
                  (submitButton as HTMLButtonElement).click();
                }
              }
            }}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}