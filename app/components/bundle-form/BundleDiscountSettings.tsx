import { useCallback } from "react";
import {
  FormLayout,
  TextField,
  Select,
  BlockStack,
  Card,
} from "@shopify/polaris";
import type { BundleDiscountSettingsProps } from "./BundleFormTypes";

const discountTypeOptions = [
  { label: "Percentage", value: "percentage" },
  { label: "Fixed amount", value: "fixed" },
  { label: "Total price", value: "total" },
];

export function BundleDiscountSettings({
  discountType,
  discountValue,
  onDiscountChange,
  errors,
  touched,
}: BundleDiscountSettingsProps) {
  const handleDiscountTypeChange = useCallback((value: string) => {
    onDiscountChange({ discountType: value as "percentage" | "fixed" | "total" });
  }, [onDiscountChange]);

  const handleDiscountValueChange = useCallback((value: string) => {
    onDiscountChange({ discountValue: value });
  }, [onDiscountChange]);

  const hasError = touched?.discountValue && errors?.discountValue;

  return (
    <Card>
      <BlockStack gap="400">
        <FormLayout>
          <FormLayout.Group>
            <Select
              label="Discount type"
              options={discountTypeOptions}
              value={discountType}
              onChange={handleDiscountTypeChange}
            />
            <div className={hasError ? 'field-highlight' : ''}>
              <TextField
                label="Discount value"
                type="number"
                value={discountValue}
                onChange={handleDiscountValueChange}
                autoComplete="off"
                error={errors?.discountValue}
                requiredIndicator
                prefix={discountType === "percentage" ? "" : "$"}
                suffix={discountType === "percentage" ? "%" : ""}
                helpText={hasError ? "Please enter a discount value greater than 0" : undefined}
              />
            </div>
          </FormLayout.Group>
        </FormLayout>
      </BlockStack>
    </Card>
  );
}