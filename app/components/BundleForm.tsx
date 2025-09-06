import { useCallback, useState, useEffect } from "react";
import {
  Form,
  FormLayout,
  TextField,
  Select,
  Card,
  BlockStack,
  Text,
  Button,
  InlineError,
  Badge,
  Box,
  Divider,
  Grid,
  Modal,
  ResourceList,
  ResourceItem,
  Thumbnail,
  ButtonGroup,
  EmptyState,
  Icon,
} from "@shopify/polaris";
import { DeleteIcon, DragHandleIcon, SearchIcon } from "@shopify/polaris-icons";
import type { Bundle, BundleStep, CreateBundleRequest, UpdateBundleRequest } from "~/types/bundle";
import { ProductPicker } from "./ProductPicker";

interface BundleFormProps {
  bundle?: Bundle; // undefined for create, defined for edit
  onSubmit: (data: CreateBundleRequest | UpdateBundleRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface FormStep extends Omit<BundleStep, 'id'> {
  id: string;
  products: Array<{
    id: string;
    position: number;
  }>;
}

export function BundleForm({ bundle, onSubmit, onCancel, isSubmitting = false }: BundleFormProps) {
  const [formData, setFormData] = useState({
    title: bundle?.title || "",
    status: bundle?.status || "draft" as "active" | "draft" | "inactive",
    discountType: bundle?.discountType || "percentage" as "percentage" | "fixed" | "total",
    discountValue: bundle?.discountValue?.toString() || "",
    layoutType: bundle?.layoutType || "grid" as "grid" | "slider" | "portrait" | "landscape",
    mobileColumns: bundle?.mobileColumns?.toString() || "2",
    desktopColumns: bundle?.desktopColumns?.toString() || "4",
  });

  const [steps, setSteps] = useState<FormStep[]>(
    bundle?.steps || [
      {
        id: `step_${Date.now()}`,
        title: "Step 1",
        description: "",
        position: 1,
        minSelections: 1,
        maxSelections: 1,
        required: true,
        products: [],
      },
    ]
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showProductPicker, setShowProductPicker] = useState<string | null>(null);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.discountValue || parseFloat(formData.discountValue) <= 0) {
      newErrors.discountValue = "Discount value must be greater than 0";
    }

    if (formData.discountType === "percentage" && parseFloat(formData.discountValue) > 100) {
      newErrors.discountValue = "Percentage cannot be greater than 100";
    }

    // Only validate steps that have been modified (have a title or products)
    steps.forEach((step, index) => {
      const isStepTouched = step.title.trim() || step.products.length > 0;
      
      if (isStepTouched) {
        if (!step.title.trim()) {
          newErrors[`step_${index}_title`] = "Step title is required";
        }
        if (step.minSelections < 0) {
          newErrors[`step_${index}_min`] = "Minimum selections cannot be negative";
        }
        if (step.maxSelections !== undefined && step.maxSelections < step.minSelections) {
          newErrors[`step_${index}_max`] = "Maximum must be greater than or equal to minimum";
        }
        if (step.products.length === 0) {
          newErrors[`step_${index}_products`] = "At least one product is required";
        }
      }
    });

    // Ensure at least one valid step exists
    const hasValidStep = steps.some(step => step.title.trim());
    if (!hasValidStep) {
      newErrors.steps = "At least one step with a title is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, steps]);

  const handleSubmit = useCallback(async () => {
    console.log("Form submitted, validating...");
    if (!validateForm()) {
      console.log("Validation failed");
      return;
    }

    const data: CreateBundleRequest | UpdateBundleRequest = {
      title: formData.title,
      status: formData.status as "active" | "draft",
      discountType: formData.discountType as "percentage" | "fixed" | "total",
      discountValue: parseFloat(formData.discountValue),
      layoutType: formData.layoutType as "grid" | "slider" | "portrait" | "landscape",
      mobileColumns: parseInt(formData.mobileColumns),
      desktopColumns: parseInt(formData.desktopColumns),
      steps: steps.map((step, index) => ({
        title: step.title,
        description: step.description || undefined,
        position: index + 1,
        minSelections: step.minSelections,
        maxSelections: step.maxSelections || undefined,
        required: step.required,
        products: step.products,
      })),
    };

    console.log("Submitting data:", data);
    await onSubmit(data);
  }, [formData, steps, validateForm, onSubmit]);

  const addStep = () => {
    setSteps([
      ...steps,
      {
        id: `step_${Date.now()}`,
        title: "",
        description: "",
        position: steps.length + 1,
        minSelections: 1,
        maxSelections: undefined,
        required: false,
        products: [],
      },
    ]);
  };

  const updateStep = (index: number, updates: Partial<FormStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const discountTypeOptions = [
    { label: "Percentage off", value: "percentage" },
    { label: "Fixed amount off", value: "fixed" },
    { label: "Total price", value: "total" },
  ];

  const statusOptions = [
    { label: "Active", value: "active" },
    { label: "Draft", value: "draft" },
    { label: "Inactive", value: "inactive" },
  ];

  const layoutOptions = [
    { label: "Grid", value: "grid" },
    { label: "Slider", value: "slider" },
    { label: "Portrait", value: "portrait" },
    { label: "Landscape", value: "landscape" },
  ];

  const mobileColumnOptions = [
    { label: "1 column", value: "1" },
    { label: "2 columns", value: "2" },
    { label: "3 columns", value: "3" },
    { label: "4 columns", value: "4" },
  ];

  const desktopColumnOptions = [
    { label: "1 column", value: "1" },
    { label: "2 columns", value: "2" },
    { label: "3 columns", value: "3" },
    { label: "4 columns", value: "4" },
    { label: "5 columns", value: "5" },
    { label: "6 columns", value: "6" },
  ];

  return (
    <Form onSubmit={handleSubmit}>
      <BlockStack gap="600">
        {/* Basic Information */}
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              Bundle Information
            </Text>
            <FormLayout>
              <TextField
                label="Title"
                value={formData.title}
                onChange={(value) => setFormData({ ...formData, title: value })}
                autoComplete="off"
                error={errors.title}
                requiredIndicator
              />
              <Select
                label="Status"
                options={statusOptions}
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as any })}
              />
            </FormLayout>
          </BlockStack>
        </Card>

        {/* Pricing */}
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              Pricing
            </Text>
            <FormLayout>
              <FormLayout.Group>
                <Select
                  label="Discount type"
                  options={discountTypeOptions}
                  value={formData.discountType}
                  onChange={(value) => setFormData({ ...formData, discountType: value as any })}
                />
                <TextField
                  label={
                    formData.discountType === "percentage"
                      ? "Percentage off"
                      : formData.discountType === "fixed"
                      ? "Amount off"
                      : "Total price"
                  }
                  type="number"
                  value={formData.discountValue}
                  onChange={(value) => setFormData({ ...formData, discountValue: value })}
                  autoComplete="off"
                  error={errors.discountValue}
                  requiredIndicator
                  prefix={formData.discountType === "percentage" ? "" : "$"}
                  suffix={formData.discountType === "percentage" ? "%" : ""}
                />
              </FormLayout.Group>
            </FormLayout>
          </BlockStack>
        </Card>

        {/* Display Settings */}
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              Display Settings
            </Text>
            <FormLayout>
              <Select
                label="Layout type"
                options={layoutOptions}
                value={formData.layoutType}
                onChange={(value) => setFormData({ ...formData, layoutType: value as any })}
              />
              <FormLayout.Group>
                <Select
                  label="Mobile columns"
                  options={mobileColumnOptions}
                  value={formData.mobileColumns}
                  onChange={(value) => setFormData({ ...formData, mobileColumns: value })}
                />
                <Select
                  label="Desktop columns"
                  options={desktopColumnOptions}
                  value={formData.desktopColumns}
                  onChange={(value) => setFormData({ ...formData, desktopColumns: value })}
                />
              </FormLayout.Group>
            </FormLayout>
          </BlockStack>
        </Card>

        {/* Bundle Steps */}
        <Card>
          <BlockStack gap="400">
            <Box>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                  Bundle Steps
                </Text>
                <Text variant="bodySm" tone="subdued">
                  Define the steps customers will follow to build their bundle
                </Text>
              </BlockStack>
            </Box>

            {errors.steps && (
              <InlineError message={errors.steps} />
            )}

            <BlockStack gap="400">
              {steps.map((step, index) => (
                <Card key={step.id} subdued>
                  <BlockStack gap="400">
                    <Box>
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 8, lg: 9 }}>
                          <BlockStack gap="200">
                            <Text variant="headingSm" as="h3">
                              Step {index + 1}
                              {step.required && (
                                <Box paddingInlineStart="200" inlineSize="auto">
                                  <Badge status="info">Required</Badge>
                                </Box>
                              )}
                            </Text>
                          </BlockStack>
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 3 }}>
                          <Box inlineAlign="end">
                            <ButtonGroup variant="segmented">
                              <Button
                                icon={DragHandleIcon}
                                accessibilityLabel="Move up"
                                onClick={() => moveStep(index, "up")}
                                disabled={index === 0}
                              />
                              <Button
                                icon={DragHandleIcon}
                                accessibilityLabel="Move down"
                                onClick={() => moveStep(index, "down")}
                                disabled={index === steps.length - 1}
                              />
                              <Button
                                icon={DeleteIcon}
                                accessibilityLabel="Delete step"
                                onClick={() => removeStep(index)}
                                disabled={steps.length === 1}
                              />
                            </ButtonGroup>
                          </Box>
                        </Grid.Cell>
                      </Grid>
                    </Box>

                    <FormLayout>
                      <TextField
                        label="Step title"
                        value={step.title}
                        onChange={(value) => updateStep(index, { title: value })}
                        autoComplete="off"
                        error={errors[`step_${index}_title`]}
                        requiredIndicator
                      />
                      <TextField
                        label="Description"
                        value={step.description || ""}
                        onChange={(value) => updateStep(index, { description: value })}
                        autoComplete="off"
                        multiline={2}
                      />
                      <FormLayout.Group>
                        <TextField
                          label="Minimum selections"
                          type="number"
                          value={step.minSelections.toString()}
                          onChange={(value) =>
                            updateStep(index, { minSelections: parseInt(value) || 0 })
                          }
                          autoComplete="off"
                          error={errors[`step_${index}_min`]}
                          requiredIndicator
                        />
                        <TextField
                          label="Maximum selections"
                          type="number"
                          value={step.maxSelections?.toString() || ""}
                          onChange={(value) =>
                            updateStep(index, {
                              maxSelections: value ? parseInt(value) : undefined,
                            })
                          }
                          autoComplete="off"
                          error={errors[`step_${index}_max`]}
                          helpText="Leave empty for unlimited"
                        />
                      </FormLayout.Group>
                      <Select
                        label="Step requirement"
                        options={[
                          { label: "Required", value: "true" },
                          { label: "Optional", value: "false" },
                        ]}
                        value={step.required.toString()}
                        onChange={(value) => updateStep(index, { required: value === "true" })}
                      />
                    </FormLayout>

                    <Box>
                      <BlockStack gap="200">
                        <Text variant="bodyMd" as="p">
                          Products ({step.products.length})
                        </Text>
                        {errors[`step_${index}_products`] && (
                          <InlineError message={errors[`step_${index}_products`]} />
                        )}
                        <Button
                          onClick={() => setShowProductPicker(step.id)}
                          icon={SearchIcon}
                        >
                          Select products
                        </Button>
                      </BlockStack>
                    </Box>
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>

            <Button onClick={addStep} variant="plain">
              Add step
            </Button>
          </BlockStack>
        </Card>

        {/* Form Actions */}
        <Box>
          <ButtonGroup>
            <Button onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
            <Button primary submit loading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : bundle ? "Update bundle" : "Create bundle"}
            </Button>
          </ButtonGroup>
        </Box>
      </BlockStack>

      {/* Product Picker Modal */}
      {showProductPicker && (
        <ProductPicker
          selectedProducts={steps.find((s) => s.id === showProductPicker)?.products.map(p => p.id) || []}
          onSelect={(productIds) => {
            const stepIndex = steps.findIndex((s) => s.id === showProductPicker);
            if (stepIndex !== -1) {
              updateStep(stepIndex, {
                products: productIds.map((id, index) => ({
                  id,
                  position: index + 1,
                })),
              });
            }
            setShowProductPicker(null);
          }}
          onClose={() => setShowProductPicker(null)}
          maxSelections={
            steps.find((s) => s.id === showProductPicker)?.maxSelections
          }
        />
      )}
    </Form>
  );
}