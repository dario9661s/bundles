import { useCallback, useState, useEffect } from "react";
import "./BundleForm.css";
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
  Tabs,
  Checkbox,
  InlineStack,
} from "@shopify/polaris";
import { DeleteIcon, SearchIcon, DragHandleIcon } from "@shopify/polaris-icons";
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
    // Product details for display
    title?: string;
    featuredImage?: string;
    price?: string;
  }>;
  // Layout properties for each step
  displayType?: 'grid' | 'list' | 'carousel';
  mobileColumns?: number;
  desktopColumns?: number;
}

export function BundleForm({ bundle, onSubmit, onCancel, isSubmitting = false }: BundleFormProps) {
  const [productDetails, setProductDetails] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState({
    title: bundle?.title || "",
    status: bundle?.status || "draft" as "active" | "draft" | "inactive",
    discountType: bundle?.discountType || "percentage" as "percentage" | "fixed" | "total",
    discountValue: bundle?.discountValue?.toString() || "",
  });

  const [steps, setSteps] = useState<FormStep[]>(() => {
    if (bundle?.steps) {
      // Map existing bundle steps to FormStep
      return bundle.steps.map(step => ({
        ...step,
        displayType: 'grid' as const,
        mobileColumns: 2,
        desktopColumns: 4,
      }));
    } else {
      // Default step for new bundles
      return [
        {
          id: `step_${Date.now()}`,
          title: "Step 1",
          description: "",
          position: 1,
          minSelections: 1,
          maxSelections: 5,
          required: true,
          products: [],
          displayType: 'grid' as const,
          mobileColumns: 2,
          desktopColumns: 4,
        },
      ];
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showProductPicker, setShowProductPicker] = useState<string | null>(null);
  const [activeTabPerStep, setActiveTabPerStep] = useState<Record<string, number>>(() => {
    // Initialize all steps to show the first tab
    const initial: Record<string, number> = {};
    steps.forEach(step => {
      initial[step.id] = 0;
    });
    return initial;
  });
  const [draggedProduct, setDraggedProduct] = useState<{stepIndex: number, productIndex: number} | null>(null);
  const [dragOverProduct, setDragOverProduct] = useState<{stepIndex: number, productIndex: number} | null>(null);

  // Fetch product details when products are selected
  const fetchProductDetails = useCallback(async (productIds: string[]) => {
    if (productIds.length === 0) return;
    
    console.log('Fetching details for products:', productIds);
    
    try {
      const response = await fetch(`/api/products/by-ids?ids=${productIds.join(',')}`);
      
      if (!response.ok) {
        console.error('Failed to fetch products:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('Received product data:', data);
      
      if (data.products) {
        const details: Record<string, any> = {};
        data.products.forEach((product: any) => {
          details[product.id] = {
            title: product.title,
            featuredImage: product.featuredImage,
            priceRange: product.priceRange,
          };
        });
        console.log('Setting product details:', details);
        setProductDetails(prev => ({ ...prev, ...details }));
      }
    } catch (error) {
      console.error('Failed to fetch product details:', error);
    }
  }, []);

  // Fetch details for all selected products on mount and when steps change
  useEffect(() => {
    const allProductIds = steps.flatMap(step => step.products.map(p => p.id));
    if (allProductIds.length > 0) {
      console.log('Fetching product details for:', allProductIds);
      fetchProductDetails(allProductIds);
    }
  }, [steps.length, fetchProductDetails]);

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

    // Use the first step's layout settings as the global defaults
    const firstStep = steps[0];
    const data: CreateBundleRequest | UpdateBundleRequest = {
      title: formData.title,
      status: formData.status as "active" | "draft",
      discountType: formData.discountType as "percentage" | "fixed" | "total",
      discountValue: parseFloat(formData.discountValue),
      layoutType: (firstStep?.displayType || "grid") as "grid" | "slider" | "portrait" | "landscape",
      mobileColumns: firstStep?.mobileColumns || 2,
      desktopColumns: firstStep?.desktopColumns || 4,
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
    const newStepId = `step_${Date.now()}`;
    setSteps([
      ...steps,
      {
        id: newStepId,
        title: "",
        description: "",
        position: steps.length + 1,
        minSelections: 1,
        maxSelections: 5,
        required: false,
        products: [],
        displayType: 'grid',
        mobileColumns: 2,
        desktopColumns: 4,
      },
    ]);
    // Initialize tab state for new step
    setActiveTabPerStep({
      ...activeTabPerStep,
      [newStepId]: 0,
    });
  };

  const updateStep = (index: number, updates: Partial<FormStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      const stepToRemove = steps[index];
      setSteps(steps.filter((_, i) => i !== index));
      
      // Clean up tab state for removed step
      const newTabState = { ...activeTabPerStep };
      delete newTabState[stepToRemove.id];
      setActiveTabPerStep(newTabState);
    }
  };

  const reorderProducts = (stepIndex: number, oldIndex: number, newIndex: number) => {
    console.log(`🎯 Reordering products in step ${stepIndex}: moving from position ${oldIndex + 1} to position ${newIndex + 1}`);
    
    const step = steps[stepIndex];
    const newProducts = [...step.products];
    const [movedProduct] = newProducts.splice(oldIndex, 1);
    newProducts.splice(newIndex, 0, movedProduct);
    
    // Update positions
    const reorderedProducts = newProducts.map((product, idx) => ({
      ...product,
      position: idx + 1
    }));
    
    console.log('📦 New product order:', reorderedProducts.map(p => `${p.id} (pos: ${p.position})`));
    
    updateStep(stepIndex, { products: reorderedProducts });
  };

  const handleTabChange = (stepId: string, tabIndex: number) => {
    setActiveTabPerStep({
      ...activeTabPerStep,
      [stepId]: tabIndex,
    });
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

  const displayTypeOptions = [
    { label: "Grid", value: "grid" },
    { label: "List", value: "list" },
    { label: "Carousel", value: "carousel" },
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


        {/* Bundle Steps */}
        <Card>
          <BlockStack gap="400">
            <Box>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                  Bundle Steps
                </Text>
                <Text variant="bodySm" tone="subdued" as="p">
                  Define the steps customers will follow to build their bundle
                </Text>
              </BlockStack>
            </Box>

            {errors.steps && (
              <InlineError message={errors.steps} fieldID="steps-error" />
            )}

            <BlockStack gap="400">
              {steps.map((step, index) => (
                <Card key={step.id}>
                  <BlockStack gap="400">
                    <Box>
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="200" align="start" blockAlign="center">
                          <Text variant="headingSm" as="h3">
                            {step.title || `Step ${index + 1}`}
                          </Text>
                          {step.required && (
                            <Badge tone="info">Required</Badge>
                          )}
                        </InlineStack>
                        <Button
                          icon={DeleteIcon}
                          accessibilityLabel="Delete step"
                          onClick={() => removeStep(index)}
                          disabled={steps.length === 1}
                          tone="critical"
                          variant="tertiary"
                          size="slim"
                        />
                      </InlineStack>
                    </Box>

                    <Tabs
                      tabs={[
                        {
                          id: 'details-products',
                          content: 'Details & Products',
                        },
                        {
                          id: 'rules',
                          content: 'Rules',
                        },
                        {
                          id: 'layout',
                          content: 'Layout',
                        },
                      ]}
                      selected={activeTabPerStep[step.id] || 0}
                      onSelect={(tabIndex) => handleTabChange(step.id, tabIndex)}
                    >
                      {/* Details & Products Tab */}
                      {(activeTabPerStep[step.id] || 0) === 0 && (
                        <Box paddingBlockStart="400">
                          <BlockStack gap="400">
                            <FormLayout>
                              <TextField
                                label="Step title"
                                value={step.title}
                                onChange={(value) => updateStep(index, { title: value })}
                                autoComplete="off"
                                error={errors[`step_${index}_title`]}
                                requiredIndicator
                                placeholder={`Step ${index + 1} title`}
                                helpText="This title will be shown to customers"
                              />
                              <TextField
                                label="Description"
                                value={step.description || ""}
                                onChange={(value) => updateStep(index, { description: value })}
                                autoComplete="off"
                                multiline={2}
                              />
                            </FormLayout>

                            <Divider />

                            {/* Product Selection Rules */}
                            <Box>
                              <BlockStack gap="400">
                                <Text variant="headingSm" as="h4">Selection Rules</Text>
                                <FormLayout>
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

                                  <Checkbox
                                    label="Step is required"
                                    helpText="Customers must complete this step to purchase the bundle"
                                    checked={step.required}
                                    onChange={(value) => updateStep(index, { required: value })}
                                  />
                                </FormLayout>
                              </BlockStack>
                            </Box>
                            
                            <Divider />

                            <Box>
                              <BlockStack gap="300">
                                <InlineStack align="space-between">
                                  <Text variant="bodyMd" as="p">
                                    Products ({step.products.length} selected)
                                  </Text>
                                  <Button
                                    onClick={() => setShowProductPicker(step.id)}
                                    icon={SearchIcon}
                                    size="slim"
                                  >
                                    Select products
                                  </Button>
                                </InlineStack>
                                
                                {errors[`step_${index}_products`] && (
                                  <InlineError message={errors[`step_${index}_products`]} fieldID={`step-${index}-products-error`} />
                                )}
                                
                                {/* Product thumbnails */}
                                {step.products.length > 0 && (
                                  <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                                    <InlineStack gap="300" wrap>
                                      {step.products.map((product, productIndex) => {
                                        const isDragging = draggedProduct?.stepIndex === index && draggedProduct?.productIndex === productIndex;
                                        const isDragOver = dragOverProduct?.stepIndex === index && dragOverProduct?.productIndex === productIndex;
                                        const details = productDetails[product.id];
                                        
                                        return (
                                          <Box 
                                            key={product.id} 
                                            position="relative"
                                            width="150px"
                                            draggable
                                            onDragStart={(e) => {
                                              console.log(`🚀 Started dragging product at position ${productIndex + 1}`);
                                              setDraggedProduct({ stepIndex: index, productIndex });
                                              e.dataTransfer.effectAllowed = 'move';
                                              // Add a slight delay to ensure the drag image is created
                                              setTimeout(() => {
                                                e.target.style.opacity = '0.5';
                                              }, 0);
                                            }}
                                            onDragEnd={(e) => {
                                              console.log('🛑 Drag ended');
                                              e.target.style.opacity = '';
                                              setDraggedProduct(null);
                                              setDragOverProduct(null);
                                            }}
                                            onDragOver={(e) => {
                                              e.preventDefault();
                                              e.dataTransfer.dropEffect = 'move';
                                            }}
                                            onDragEnter={(e) => {
                                              if (draggedProduct && draggedProduct.stepIndex === index) {
                                                console.log(`📍 Dragging over position ${productIndex + 1}`);
                                                setDragOverProduct({ stepIndex: index, productIndex });
                                              }
                                            }}
                                            onDrop={(e) => {
                                              e.preventDefault();
                                              if (draggedProduct && draggedProduct.stepIndex === index) {
                                                const draggedIndex = draggedProduct.productIndex;
                                                if (draggedIndex !== productIndex) {
                                                  console.log(`✅ Dropping at position ${productIndex + 1}`);
                                                  reorderProducts(index, draggedIndex, productIndex);
                                                }
                                              }
                                              setDraggedProduct(null);
                                              setDragOverProduct(null);
                                            }}
                                            style={{ 
                                              cursor: isDragging ? 'grabbing' : 'grab',
                                              transform: isDragOver ? 'scale(1.05)' : 'scale(1)',
                                              transition: 'all 0.2s ease',
                                              opacity: isDragging ? 0.5 : 1,
                                            }}
                                          >
                                            <Card>
                                              <Box 
                                                padding="200"
                                                background={isDragOver ? "bg-surface-hover" : "bg"}
                                                style={{ transition: 'background-color 0.2s ease' }}
                                              >
                                                <BlockStack gap="200">
                                                  <Box>
                                                    <InlineStack align="space-between" blockAlign="center" gap="400">
                                                      <Text variant="headingLg" fontWeight="bold" tone={isDragOver ? "magic" : "base"}>
                                                        {product.position}
                                                      </Text>
                                                      <Box style={{ marginLeft: 'auto' }}>
                                                        <Icon source={DragHandleIcon} tone="subdued" />
                                                      </Box>
                                                    </InlineStack>
                                                  </Box>
                                                  <Box paddingInlineStart="100" paddingInlineEnd="100">
                                                    <Thumbnail
                                                      source={details?.featuredImage || "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"}
                                                      size="large"
                                                      alt={details?.title || "Product thumbnail"}
                                                    />
                                                  </Box>
                                                  <Box paddingBlockStart="100">
                                                    <Text variant="bodyMd" fontWeight="medium" alignment="center" truncate>
                                                      {details?.title || `Product ${productIndex + 1}`}
                                                    </Text>
                                                    {details?.priceRange && (
                                                      <Text variant="bodySm" tone="subdued" alignment="center">
                                                        ${details.priceRange.min}
                                                        {details.priceRange.max !== details.priceRange.min && ` - $${details.priceRange.max}`}
                                                      </Text>
                                                    )}
                                                  </Box>
                                                </BlockStack>
                                              </Box>
                                            </Card>
                                            {isDragOver && (
                                              <Box
                                                position="absolute"
                                                insetInlineStart="0"
                                                insetBlockStart="0"
                                                width="2px"
                                                height="100%"
                                                background="bg-interactive"
                                                style={{
                                                  animation: 'pulse 1s ease-in-out infinite'
                                                }}
                                              />
                                            )}
                                          </Box>
                                        );
                                      })}
                                    </InlineStack>
                                    <Box paddingBlockStart="200">
                                      <Text variant="bodySm" tone="subdued">
                                        Drag products to reorder them
                                      </Text>
                                    </Box>
                                  </Box>
                                )}
                              </BlockStack>
                            </Box>
                          </BlockStack>
                        </Box>
                      )}

                      {/* Rules Tab */}
                      {activeTabPerStep[step.id] === 1 && (
                        <Box paddingBlockStart="400">
                          <Text variant="bodyMd" tone="subdued">
                            Additional rules will be available here in the future
                          </Text>
                        </Box>
                      )}

                      {/* Layout Tab */}
                      {activeTabPerStep[step.id] === 2 && (
                        <Box paddingBlockStart="400">
                          <FormLayout>
                            <Text variant="bodyMd" tone="subdued">
                              Configure how products are displayed in this step
                            </Text>
                            
                            <Select
                              label="Display type for this step"
                              options={displayTypeOptions}
                              value={step.displayType || 'grid'}
                              onChange={(value) => updateStep(index, { displayType: value as any })}
                              helpText="How products are displayed in this step"
                            />

                            {step.displayType !== 'list' && (
                              <FormLayout.Group>
                                <Select
                                  label="Mobile columns"
                                  options={mobileColumnOptions}
                                  value={(step.mobileColumns || 2).toString()}
                                  onChange={(value) => updateStep(index, { mobileColumns: parseInt(value) })}
                                />
                                <Select
                                  label="Desktop columns"
                                  options={desktopColumnOptions}
                                  value={(step.desktopColumns || 4).toString()}
                                  onChange={(value) => updateStep(index, { desktopColumns: parseInt(value) })}
                                />
                              </FormLayout.Group>
                            )}
                          </FormLayout>
                        </Box>
                      )}
                    </Tabs>
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>

            <Box paddingBlockStart="200">
              <Button onClick={addStep} variant="primary" fullWidth>
                Add step
              </Button>
            </Box>
          </BlockStack>
        </Card>

        {/* Form Actions */}
        <Box>
          <ButtonGroup>
            <Button onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" submit loading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : bundle ? "Update bundle" : "Create bundle"}
            </Button>
          </ButtonGroup>
        </Box>
      </BlockStack>

      {/* Product Picker Modal */}
      {showProductPicker && (
        <ProductPicker
          selectedProducts={steps.find((s) => s.id === showProductPicker)?.products.map(p => p.id) || []}
          onSelect={async (productIds) => {
            const stepIndex = steps.findIndex((s) => s.id === showProductPicker);
            if (stepIndex !== -1) {
              // Fetch details for newly selected products
              await fetchProductDetails(productIds);
              
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