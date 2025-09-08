import { useCallback } from "react";
import {
  FormLayout,
  TextField,
  Select,
  BlockStack,
  Card,
  InlineStack,
  Text,
} from "@shopify/polaris";
import type { BundleDetailsFormProps } from "./BundleFormTypes";

const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export function BundleDetailsForm({
  title,
  status,
  onDetailsChange,
  errors,
  touched,
}: BundleDetailsFormProps) {
  const handleTitleChange = useCallback((value: string) => {
    onDetailsChange({ title: value });
  }, [onDetailsChange]);

  const handleStatusChange = useCallback((value: string) => {
    onDetailsChange({ status: value as "active" | "draft" | "inactive" });
  }, [onDetailsChange]);

  const hasError = touched?.title && errors?.title;

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
        </FormLayout>
      </BlockStack>
    </Card>
  );
}