import { useCallback, useState, useMemo } from "react";
import {
  Card,
  BlockStack,
  Text,
  Button,
  InlineError,
  Badge,
  Banner,
  Box,
  Divider,
  FormLayout,
  TextField,
  Checkbox,
  Tabs,
  InlineStack,
  Select,
  Icon,
  Thumbnail,
} from "@shopify/polaris";
import { DeleteIcon, SearchIcon, DragHandleIcon, CheckIcon } from "@shopify/polaris-icons";
import type { BundleStepManagerProps, FormStep, DragState } from "./BundleFormTypes";
import { ProductPicker } from "../ProductPicker";

interface StepTabState {
  [stepId: string]: number;
}

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

export function BundleStepManager({
  steps,
  onStepsChange,
  errors,
  touched,
  layoutType,
}: BundleStepManagerProps) {
  const [activeTabPerStep, setActiveTabPerStep] = useState<StepTabState>({});
  const [showProductPicker, setShowProductPicker] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<Record<string, any>>({});
  const [draggedProduct, setDraggedProduct] = useState<DragState | null>(null);
  const [dragOverProduct, setDragOverProduct] = useState<DragState | null>(null);

  // Fetch product details for display
  const fetchProductDetails = useCallback(async (productIds: string[]) => {
    try {
      // Filter out products we already have details for
      const idsToFetch = productIds.filter(id => !productDetails[id]);
      if (idsToFetch.length === 0) return;

      const response = await fetch(`/api/products/search?ids=${idsToFetch.join(',')}`);
      const data = await response.json();
      
      const details = data.products.reduce((acc: any, product: any) => {
        acc[product.id] = {
          title: product.title,
          featuredImage: product.featuredImage,
          priceRange: product.priceRange,
        };
        return acc;
      }, {});
      
      setProductDetails(prev => ({ ...prev, ...details }));
    } catch (error) {
      console.error('Failed to fetch product details:', error);
    }
  }, [productDetails]);

  // Add a new step
  const handleAddStep = useCallback(() => {
    const newStepId = `step_${Date.now()}`;
    const newStep: FormStep = {
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
    };
    
    onStepsChange([...steps, newStep]);
    setActiveTabPerStep(prev => ({ ...prev, [newStepId]: 0 }));
  }, [steps, onStepsChange]);

  // Update a specific step
  const handleUpdateStep = useCallback((index: number, updates: Partial<FormStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onStepsChange(newSteps);
  }, [steps, onStepsChange]);

  // Remove a step
  const handleRemoveStep = useCallback((index: number) => {
    if (steps.length > 1) {
      const stepToRemove = steps[index];
      const newSteps = steps.filter((_, i) => i !== index);
      onStepsChange(newSteps);

      // Clean up tab state
      const newTabState = { ...activeTabPerStep };
      delete newTabState[stepToRemove.id];
      setActiveTabPerStep(newTabState);
    }
  }, [steps, onStepsChange, activeTabPerStep]);

  // Reorder products within a step
  const handleReorderProducts = useCallback((stepIndex: number, oldIndex: number, newIndex: number) => {
    const step = steps[stepIndex];
    const newProducts = [...step.products];
    const [movedProduct] = newProducts.splice(oldIndex, 1);
    newProducts.splice(newIndex, 0, movedProduct);

    // Update positions
    const reorderedProducts = newProducts.map((product, idx) => ({
      ...product,
      position: idx + 1
    }));

    handleUpdateStep(stepIndex, { products: reorderedProducts });
  }, [steps, handleUpdateStep]);

  // Handle tab changes
  const handleTabChange = useCallback((stepId: string, tabIndex: number) => {
    setActiveTabPerStep(prev => ({ ...prev, [stepId]: tabIndex }));
  }, []);

  // Check if we need to show attention banner
  const showAttentionBanner = useMemo(() => {
    const hasValidStep = steps.some(step => step.title.trim() && step.products.length > 0);
    return !hasValidStep && errors?.steps;
  }, [steps, errors]);

  // Render product card
  const renderProductCard = useCallback((product: any, index: number, stepIndex: number) => {
    const isDragging = draggedProduct?.stepIndex === stepIndex && draggedProduct?.productIndex === index;
    const isDragOver = dragOverProduct?.stepIndex === stepIndex && dragOverProduct?.productIndex === index;
    const details = productDetails[product.id];

    return (
      <Box
        key={product.id}
        position="relative"
        width="150px"
        draggable
        onDragStart={(e: any) => {
          setDraggedProduct({ stepIndex, productIndex: index });
          e.dataTransfer.effectAllowed = 'move';
          setTimeout(() => {
            e.target.style.opacity = '0.5';
          }, 0);
        }}
        onDragEnd={(e: any) => {
          e.target.style.opacity = '';
          setDraggedProduct(null);
          setDragOverProduct(null);
        }}
        onDragOver={(e: any) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDragEnter={(e: any) => {
          if (draggedProduct && draggedProduct.stepIndex === stepIndex) {
            setDragOverProduct({ stepIndex, productIndex: index });
          }
        }}
        onDrop={(e: any) => {
          e.preventDefault();
          if (draggedProduct && draggedProduct.stepIndex === stepIndex) {
            const draggedIndex = draggedProduct.productIndex;
            if (draggedIndex !== index) {
              handleReorderProducts(stepIndex, draggedIndex, index);
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
                  {details?.title || "Loading..."}
                </Text>
                <Text variant="bodySm" tone="subdued" alignment="center">
                  {details?.priceRange ? (
                    <>
                      ${details.priceRange.min}
                      {details.priceRange.max !== details.priceRange.min && ` - $${details.priceRange.max}`}
                    </>
                  ) : (
                    <>&nbsp;</>
                  )}
                </Text>
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
  }, [draggedProduct, dragOverProduct, productDetails, handleReorderProducts]);

  // Render layout option card
  const renderLayoutCard = (
    type: 'grid' | 'carousel',
    step: FormStep,
    stepIndex: number,
    svgContent: React.ReactNode,
    label: string
  ) => (
    <Box width="150px">
      <div
        onClick={() => handleUpdateStep(stepIndex, { displayType: type })}
        style={{
          cursor: 'pointer',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        <Card
          background={step.displayType === type ? 'bg-surface-selected' : 'bg-surface'}
          padding="300"
          style={{
            border: step.displayType === type ? '2px solid var(--p-color-border-emphasis)' : '1px solid var(--p-color-border)',
            transition: 'all 0.15s ease'
          }}
        >
          <BlockStack gap="300" inlineAlign="center">
            <Box width="80px" height="80px">
              {svgContent}
            </Box>
            <Text variant="bodyMd" fontWeight="medium" alignment="center">
              {label}
            </Text>
            {step.displayType === type && (
              <Box position="absolute" insetBlockStart="200" insetInlineEnd="200">
                <Icon source={CheckIcon} tone="success" />
              </Box>
            )}
          </BlockStack>
        </Card>
      </div>
    </Box>
  );

  return (
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

        {showAttentionBanner && (
          <Banner status="attention">
            <p>Great! Now add at least one bundle step with products to complete your bundle configuration.</p>
          </Banner>
        )}

        {errors?.steps && (
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
                      onClick={() => handleRemoveStep(index)}
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
                      content: `Details & Products${(step.title.trim() && step.products.length === 0) ? ' ⚠️' : ''}`,
                    },
                    {
                      id: 'rules',
                      content: 'Rules',
                    },
                    ...(['basic', 'modal'].includes(layoutType) ? [{
                      id: 'layout',
                      content: 'Layout',
                    }] : []),
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
                            onChange={(value) => handleUpdateStep(index, { title: value })}
                            autoComplete="off"
                            error={errors?.[`step_${index}_title`]}
                            requiredIndicator
                            placeholder={`Step ${index + 1} title`}
                            helpText="This title will be shown to customers"
                          />
                          <TextField
                            label="Description"
                            value={step.description || ""}
                            onChange={(value) => handleUpdateStep(index, { description: value })}
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
                                    handleUpdateStep(index, { minSelections: parseInt(value) || 0 })
                                  }
                                  autoComplete="off"
                                  error={errors?.[`step_${index}_min`]}
                                  requiredIndicator
                                />
                                <TextField
                                  label="Maximum selections"
                                  type="number"
                                  value={step.maxSelections?.toString() || ""}
                                  onChange={(value) =>
                                    handleUpdateStep(index, {
                                      maxSelections: value ? parseInt(value) : undefined,
                                    })
                                  }
                                  autoComplete="off"
                                  error={errors?.[`step_${index}_max`]}
                                  helpText="Leave empty for unlimited"
                                />
                              </FormLayout.Group>

                              <Checkbox
                                label="Step is required"
                                helpText="Customers must complete this step to purchase the bundle"
                                checked={step.required}
                                onChange={(value) => handleUpdateStep(index, { required: value })}
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

                            {errors?.[`step_${index}_products`] && (
                              <InlineError message={errors[`step_${index}_products`]} fieldID={`step-${index}-products-error`} />
                            )}

                            {/* Product thumbnails */}
                            {step.products.length > 0 && (
                              <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                                <InlineStack gap="300" wrap>
                                  {step.products.map((product, productIndex) => 
                                    renderProductCard(product, productIndex, index)
                                  )}
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
                      <BlockStack gap="400">
                        <Text variant="bodyMd" tone="subdued">
                          Configure how products are displayed in this step
                        </Text>

                        {/* Visual Layout Chooser */}
                        <Box>
                          <Text variant="headingSm" as="h4" fontWeight="semibold">
                            Choose display layout
                          </Text>
                          <Box paddingBlockStart="300">
                            <BlockStack gap="400" align="start">
                              {renderLayoutCard(
                                'grid',
                                step,
                                index,
                                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="8" y="8" width="30" height="30" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                                  <rect x="42" y="8" width="30" height="30" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                                  <rect x="8" y="42" width="30" height="30" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                                  <rect x="42" y="42" width="30" height="30" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                                  <rect x="13" y="13" width="20" height="14" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                                  <rect x="47" y="13" width="20" height="14" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                                  <rect x="13" y="47" width="20" height="14" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                                  <rect x="47" y="47" width="20" height="14" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                                  <rect x="13" y="30" width="20" height="2" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                                  <rect x="47" y="30" width="20" height="2" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                                  <rect x="13" y="64" width="20" height="2" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                                  <rect x="47" y="64" width="20" height="2" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                                </svg>,
                                'Grid'
                              )}

                              {renderLayoutCard(
                                'carousel',
                                step,
                                index,
                                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 40L20 32L20 48L12 40Z" fill="#8C9196" fillOpacity="0.5"/>
                                  <path d="M68 40L60 48L60 32L68 40Z" fill="#8C9196" fillOpacity="0.5"/>
                                  <rect x="25" y="16" width="30" height="40" rx="4" fill="#8C9196" fillOpacity="0.3" stroke="#8C9196" strokeWidth="1.5"/>
                                  <rect x="30" y="22" width="20" height="20" rx="2" fill="#8C9196" fillOpacity="0.4"/>
                                  <rect x="30" y="46" width="20" height="2" rx="1" fill="#8C9196" fillOpacity="0.6"/>
                                  <rect x="30" y="50" width="14" height="2" rx="1" fill="#8C9196" fillOpacity="0.4"/>
                                  <rect x="10" y="20" width="12" height="32" rx="3" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1" strokeOpacity="0.3"/>
                                  <rect x="58" y="20" width="12" height="32" rx="3" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1" strokeOpacity="0.3"/>
                                  <circle cx="32" cy="66" r="2" fill="#8C9196" fillOpacity="0.3"/>
                                  <circle cx="40" cy="66" r="2.5" fill="#8C9196" fillOpacity="0.8"/>
                                  <circle cx="48" cy="66" r="2" fill="#8C9196" fillOpacity="0.3"/>
                                </svg>,
                                'Slider'
                              )}
                            </BlockStack>
                          </Box>
                        </Box>

                        {/* Column Options - Only show for Grid and Slider */}
                        {step.displayType !== 'list' && (
                          <Box>
                            <Divider />
                            <Box paddingBlockStart="400">
                              <FormLayout>
                                <Text variant="headingSm" as="h4" fontWeight="semibold">
                                  Column settings
                                </Text>
                                <FormLayout.Group>
                                  <Select
                                    label="Mobile columns"
                                    options={mobileColumnOptions}
                                    value={(step.mobileColumns || 2).toString()}
                                    onChange={(value) => handleUpdateStep(index, { mobileColumns: parseInt(value) })}
                                    helpText="Number of columns on mobile devices"
                                  />
                                  <Select
                                    label="Desktop columns"
                                    options={desktopColumnOptions}
                                    value={(step.desktopColumns || 4).toString()}
                                    onChange={(value) => handleUpdateStep(index, { desktopColumns: parseInt(value) })}
                                    helpText="Number of columns on desktop"
                                  />
                                </FormLayout.Group>
                              </FormLayout>
                            </Box>
                          </Box>
                        )}
                      </BlockStack>
                    </Box>
                  )}
                </Tabs>
              </BlockStack>
            </Card>
          ))}
        </BlockStack>

        <Box paddingBlockStart="300">
          <InlineStack align="center">
            <Box width="200px">
              <Button onClick={handleAddStep} variant="primary" fullWidth>
                Add step
              </Button>
            </Box>
          </InlineStack>
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

              handleUpdateStep(stepIndex, {
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
    </Card>
  );
}