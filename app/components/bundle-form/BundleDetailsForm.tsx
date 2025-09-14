import { useCallback } from "react";
import {
  FormLayout,
  TextField,
  Select,
  BlockStack,
  Card,
  InlineStack,
  Text,
  Link,
  Icon,
  Box,
  Checkbox,
} from "@shopify/polaris";
import { ExternalIcon } from "@shopify/polaris-icons";
import type { BundleDetailsFormProps } from "./BundleFormTypes";

const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export function BundleDetailsForm({
  title,
  status,
  useCombinationImages,
  onDetailsChange,
  errors,
  touched,
  productId,
  isEdit,
}: BundleDetailsFormProps) {
  const handleTitleChange = useCallback((value: string) => {
    onDetailsChange({ title: value });
  }, [onDetailsChange]);

  const handleStatusChange = useCallback((value: string) => {
    onDetailsChange({ status: value as "active" | "draft" | "inactive" });
  }, [onDetailsChange]);
  
  const handleUseCombinationImagesChange = useCallback((value: boolean) => {
    onDetailsChange({ useCombinationImages: value });
  }, [onDetailsChange]);

  const hasError = touched?.title && errors?.title;
  
  // Helper function to extract numeric ID from Shopify GID
  const extractProductId = (gid: string | undefined): string | null => {
    if (!gid) return null;
    const match = gid.match(/\/(\d+)$/);
    return match ? match[1] : null;
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack gap="100" blockAlign="center">
          <Text variant="headingMd" as="h2">
            Basic Info
          </Text>
          {hasError && (
            <Text as="span" variant="bodySm">
              ⚠️
            </Text>
          )}
        </InlineStack>
        <FormLayout>
          <div className={hasError ? 'field-highlight' : ''}>
            <TextField
              label="Title"
              value={title}
              onChange={handleTitleChange}
              autoComplete="off"
              error={errors?.title}
              requiredIndicator
              helpText={hasError ? "Please fill in the bundle title" : undefined}
            />
          </div>
          <Select
            label="Status"
            options={statusOptions}
            value={status}
            onChange={handleStatusChange}
          />
          
          <Checkbox
            label="Use combination images"
            helpText="Show custom images when specific product combinations are selected in your theme"
            checked={useCombinationImages}
            onChange={handleUseCombinationImagesChange}
          />
          
          {/* Shopify Product Link - Only show in edit mode when product exists */}
          {isEdit && productId && (
            <Box>
              <BlockStack gap="200">
                <Text variant="bodyMd" fontWeight="semibold">Shopify Product</Text>
                <Link
                  url={`/admin/products/${extractProductId(productId)}`}
                  external
                  monochrome
                >
                  <InlineStack gap="100" align="center">
                    <Text variant="bodyMd">View in Shopify Admin</Text>
                    <Icon source={ExternalIcon} />
                  </InlineStack>
                </Link>
                <Text variant="bodySm" tone="subdued">
                  Edit product details like price, inventory, and SEO in Shopify admin
                </Text>
              </BlockStack>
            </Box>
          )}
        </FormLayout>
      </BlockStack>
    </Card>
  );
}