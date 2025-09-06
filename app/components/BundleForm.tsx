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
  RadioButton,
} from "@shopify/polaris";
import { DeleteIcon, SearchIcon, DragHandleIcon, CheckIcon } from "@shopify/polaris-icons";
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
    layoutType: bundle?.layoutType || "grid" as "grid" | "slider" | "modal" | "selection",
    mobileColumns: bundle?.mobileColumns || 2,
    desktopColumns: bundle?.desktopColumns || 4,
    layoutSettings: bundle?.layoutSettings || {
      gridSettings: {
        productsPerRow: {
          mobile: 2 as 1 | 2,
          tablet: 3 as 2 | 3 | 4,
          desktop: 4 as 3 | 4 | 5 | 6,
        },
        enableQuickAdd: true,
        imagePosition: "top" as "top" | "left",
      },
      sliderSettings: {
        slidesToShow: {
          mobile: 1 as 1 | 2,
          tablet: 2 as 2 | 3,
          desktop: 4 as 3 | 4 | 5,
        },
        slidesToScroll: 1,
        infiniteLoop: true,
        autoplay: false,
        autoplaySpeed: 5000,
        enableThumbnails: false,
      },
      modalSettings: {
        triggerType: "button" as "button" | "auto" | "exit-intent",
        modalBehavior: "stayOpen" as "closeOnAdd" | "stayOpen" | "redirectToCart",
        blockPageScroll: true,
        modalSize: "fixed" as "productCount" | "fixed",
      },
      selectionSettings: {
        selectionMode: "click" as "click" | "drag" | "both",
        emptySlotBehavior: "show" as "hide" | "show" | "showGhost",
        progressTracking: "counter" as "counter" | "percentage" | "visual",
        selectionLimit: 10,
      },
    },
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
    const uniqueProductIds = [...new Set(allProductIds)]; // Remove duplicates
    
    // Check if we need to fetch any new products
    const newProductIds = uniqueProductIds.filter(id => !productDetails[id]);
    
    if (newProductIds.length > 0) {
      console.log('Fetching product details for:', newProductIds);
      fetchProductDetails(newProductIds);
    }
  }, [steps, fetchProductDetails]);

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

    // Only include the relevant layoutSettings based on layoutType
    const layoutSettings: any = {};
    switch (formData.layoutType) {
      case 'grid':
        if (formData.layoutSettings.gridSettings) {
          layoutSettings.gridSettings = formData.layoutSettings.gridSettings;
        }
        break;
      case 'slider':
        if (formData.layoutSettings.sliderSettings) {
          layoutSettings.sliderSettings = formData.layoutSettings.sliderSettings;
        }
        break;
      case 'modal':
        if (formData.layoutSettings.modalSettings) {
          layoutSettings.modalSettings = formData.layoutSettings.modalSettings;
        }
        break;
      case 'selection':
        if (formData.layoutSettings.selectionSettings) {
          layoutSettings.selectionSettings = formData.layoutSettings.selectionSettings;
        }
        break;
    }

    const data: CreateBundleRequest | UpdateBundleRequest = {
      title: formData.title,
      status: formData.status as "active" | "draft",
      discountType: formData.discountType as "percentage" | "fixed" | "total",
      discountValue: parseFloat(formData.discountValue),
      layoutType: formData.layoutType as "grid" | "slider" | "modal" | "selection",
      mobileColumns: formData.mobileColumns,
      desktopColumns: formData.desktopColumns,
      layoutSettings: layoutSettings,
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
    { label: "Modal", value: "modal" },
    { label: "Selection Box", value: "selection" },
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

        {/* Layout Configuration */}
        <Card>
          <BlockStack gap="400">
            <Box>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                  Layout Configuration
                </Text>
                <Text variant="bodySm" tone="subdued" as="p">
                  Choose how your bundle will be displayed to customers
                </Text>
              </BlockStack>
            </Box>
            
            {/* Visual Layout Chooser */}
            <Box>
              <Grid columns={{ xs: 2, sm: 3, md: 4, lg: 6 }} gap="400">
                {/* Grid Layout Card */}
                <Box>
                  <div
                    onClick={() => setFormData({ ...formData, layoutType: 'grid' })}
                    style={{ 
                      cursor: 'pointer',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <Card
                      background={formData.layoutType === 'grid' ? 'bg-surface-selected' : 'bg-surface'}
                      padding="400"
                      style={{ 
                        border: formData.layoutType === 'grid' ? '2px solid var(--p-color-border-emphasis)' : '1px solid var(--p-color-border)',
                        transition: 'all 0.15s ease',
                        height: '100%'
                      }}
                    >
                      <BlockStack gap="300" inlineAlign="center">
                        {/* Grid SVG Icon */}
                        <Box width="100px" height="100px">
                          <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Product cards in 2x2 grid */}
                            <rect x="10" y="10" width="37" height="37" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1.5"/>
                            <rect x="53" y="10" width="37" height="37" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1.5"/>
                            <rect x="10" y="53" width="37" height="37" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1.5"/>
                            <rect x="53" y="53" width="37" height="37" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1.5"/>
                            
                            {/* Placeholder content in cards */}
                            <rect x="16" y="16" width="25" height="18" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                            <rect x="59" y="16" width="25" height="18" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                            <rect x="16" y="59" width="25" height="18" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                            <rect x="59" y="59" width="25" height="18" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                            
                            {/* Text lines */}
                            <rect x="16" y="38" width="25" height="2" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                            <rect x="59" y="38" width="25" height="2" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                            <rect x="16" y="81" width="25" height="2" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                            <rect x="59" y="81" width="25" height="2" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                          </svg>
                        </Box>
                        <Text variant="bodyLg" fontWeight="medium" alignment="center">
                          Grid
                        </Text>
                        {formData.layoutType === 'grid' && (
                          <Box position="absolute" insetBlockStart="200" insetInlineEnd="200">
                            <Icon source={CheckIcon} tone="success" />
                          </Box>
                        )}
                      </BlockStack>
                    </Card>
                  </div>
                </Box>

                {/* Slider Layout Card */}
                <Box>
                  <div
                    onClick={() => setFormData({ ...formData, layoutType: 'slider' })}
                    style={{ 
                      cursor: 'pointer',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <Card
                      background={formData.layoutType === 'slider' ? 'bg-surface-selected' : 'bg-surface'}
                      padding="400"
                      style={{ 
                        border: formData.layoutType === 'slider' ? '2px solid var(--p-color-border-emphasis)' : '1px solid var(--p-color-border)',
                        transition: 'all 0.15s ease',
                        height: '100%'
                      }}
                    >
                      <BlockStack gap="300" inlineAlign="center">
                        <Box width="100px" height="100px">
                          <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Navigation arrows */}
                            <path d="M15 50L24 41L24 59L15 50Z" fill="#8C9196" fillOpacity="0.5"/>
                            <path d="M85 50L76 59L76 41L85 50Z" fill="#8C9196" fillOpacity="0.5"/>
                            
                            {/* Center card (active) */}
                            <rect x="30" y="20" width="40" height="50" rx="4" fill="#8C9196" fillOpacity="0.3" stroke="#8C9196" strokeWidth="2"/>
                            <rect x="37" y="28" width="26" height="26" rx="2" fill="#8C9196" fillOpacity="0.4"/>
                            <rect x="37" y="58" width="26" height="2" rx="1" fill="#8C9196" fillOpacity="0.6"/>
                            <rect x="37" y="63" width="18" height="2" rx="1" fill="#8C9196" fillOpacity="0.4"/>
                            
                            {/* Side cards (partially visible) */}
                            <rect x="12" y="25" width="15" height="40" rx="3" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1" strokeOpacity="0.3"/>
                            <rect x="73" y="25" width="15" height="40" rx="3" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1" strokeOpacity="0.3"/>
                            
                            {/* Dots indicator */}
                            <circle cx="40" cy="82" r="2.5" fill="#8C9196" fillOpacity="0.3"/>
                            <circle cx="50" cy="82" r="3" fill="#8C9196" fillOpacity="0.8"/>
                            <circle cx="60" cy="82" r="2.5" fill="#8C9196" fillOpacity="0.3"/>
                          </svg>
                        </Box>
                        <Text variant="bodyLg" fontWeight="medium" alignment="center">
                          Slider
                        </Text>
                        {formData.layoutType === 'slider' && (
                          <Box position="absolute" insetBlockStart="200" insetInlineEnd="200">
                            <Icon source={CheckIcon} tone="success" />
                          </Box>
                        )}
                      </BlockStack>
                    </Card>
                  </div>
                </Box>


                {/* Modal Layout Card */}
                <Box>
                  <div
                    onClick={() => setFormData({ ...formData, layoutType: 'modal' })}
                    style={{ 
                      cursor: 'pointer',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <Card
                      background={formData.layoutType === 'modal' ? 'bg-surface-selected' : 'bg-surface'}
                      padding="400"
                      style={{ 
                        border: formData.layoutType === 'modal' ? '2px solid var(--p-color-border-emphasis)' : '1px solid var(--p-color-border)',
                        transition: 'all 0.15s ease',
                        height: '100%'
                      }}
                    >
                      <BlockStack gap="300" inlineAlign="center">
                        <Box width="100px" height="100px">
                          <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Background overlay */}
                            <rect x="0" y="0" width="100" height="100" fill="#000000" fillOpacity="0.1" rx="4"/>
                            
                            {/* Modal window sliding from right */}
                            <rect x="35" y="15" width="60" height="70" rx="4" fill="#FFFFFF" stroke="#8C9196" strokeWidth="2"/>
                            
                            {/* Modal header */}
                            <rect x="35" y="15" width="60" height="12" rx="4 4 0 0" fill="#8C9196" fillOpacity="0.1"/>
                            <circle cx="88" cy="21" r="3" fill="#8C9196" fillOpacity="0.5"/>
                            
                            {/* Modal content - steps */}
                            <rect x="42" y="32" width="46" height="8" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                            <rect x="42" y="43" width="46" height="8" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                            <rect x="42" y="54" width="46" height="8" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                            
                            {/* Products in modal */}
                            <rect x="42" y="66" width="10" height="10" rx="2" fill="#8C9196" fillOpacity="0.4"/>
                            <rect x="54" y="66" width="10" height="10" rx="2" fill="#8C9196" fillOpacity="0.4"/>
                            <rect x="66" y="66" width="10" height="10" rx="2" fill="#8C9196" fillOpacity="0.4"/>
                            <rect x="78" y="66" width="10" height="10" rx="2" fill="#8C9196" fillOpacity="0.4"/>
                            
                            {/* Main page content (partially visible) */}
                            <rect x="5" y="20" width="25" height="30" rx="3" fill="#8C9196" fillOpacity="0.1"/>
                            <rect x="5" y="55" width="25" height="30" rx="3" fill="#8C9196" fillOpacity="0.1"/>
                            
                            {/* Arrow indicating slide direction */}
                            <path d="M30 50L25 45L25 55L30 50Z" fill="#8C9196" fillOpacity="0.6"/>
                          </svg>
                        </Box>
                        <Text variant="bodyLg" fontWeight="medium" alignment="center">
                          Modal
                        </Text>
                        {formData.layoutType === 'modal' && (
                          <Box position="absolute" insetBlockStart="200" insetInlineEnd="200">
                            <Icon source={CheckIcon} tone="success" />
                          </Box>
                        )}
                      </BlockStack>
                    </Card>
                  </div>
                </Box>

                {/* Selection Box Layout Card */}
                <Box>
                  <div
                    onClick={() => setFormData({ ...formData, layoutType: 'selection' })}
                    style={{ 
                      cursor: 'pointer',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <Card
                      background={formData.layoutType === 'selection' ? 'bg-surface-selected' : 'bg-surface'}
                      padding="400"
                      style={{ 
                        border: formData.layoutType === 'selection' ? '2px solid var(--p-color-border-emphasis)' : '1px solid var(--p-color-border)',
                        transition: 'all 0.15s ease',
                        height: '100%'
                      }}
                    >
                      <BlockStack gap="300" inlineAlign="center">
                        <Box width="100px" height="100px">
                          <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Empty slots container */}
                            <rect x="10" y="10" width="80" height="55" rx="4" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1.5" strokeDasharray="4 2"/>
                            
                            {/* Empty slots */}
                            <rect x="15" y="15" width="22" height="22" rx="3" fill="#FFFFFF" stroke="#8C9196" strokeWidth="1" strokeDasharray="3 2"/>
                            <rect x="39" y="15" width="22" height="22" rx="3" fill="#FFFFFF" stroke="#8C9196" strokeWidth="1" strokeDasharray="3 2"/>
                            <rect x="63" y="15" width="22" height="22" rx="3" fill="#FFFFFF" stroke="#8C9196" strokeWidth="1" strokeDasharray="3 2"/>
                            <rect x="15" y="39" width="22" height="22" rx="3" fill="#FFFFFF" stroke="#8C9196" strokeWidth="1" strokeDasharray="3 2"/>
                            
                            {/* Filled slots */}
                            <rect x="39" y="39" width="22" height="22" rx="3" fill="#8C9196" fillOpacity="0.3" stroke="#8C9196" strokeWidth="1.5"/>
                            <rect x="63" y="39" width="22" height="22" rx="3" fill="#8C9196" fillOpacity="0.3" stroke="#8C9196" strokeWidth="1.5"/>
                            
                            {/* Plus signs in empty slots */}
                            <path d="M26 20L26 32M20 26L32 26" stroke="#8C9196" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
                            <path d="M50 20L50 32M44 26L56 26" stroke="#8C9196" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
                            <path d="M74 20L74 32M68 26L80 26" stroke="#8C9196" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
                            <path d="M26 44L26 56M20 50L32 50" stroke="#8C9196" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
                            
                            {/* Content in filled slots */}
                            <rect x="43" y="43" width="14" height="10" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                            <rect x="43" y="56" width="10" height="2" rx="1" fill="#8C9196" fillOpacity="0.6"/>
                            <rect x="67" y="43" width="14" height="10" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                            <rect x="67" y="56" width="10" height="2" rx="1" fill="#8C9196" fillOpacity="0.6"/>
                            
                            {/* Available products below */}
                            <rect x="15" y="72" width="17" height="17" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                            <rect x="35" y="72" width="17" height="17" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                            <rect x="55" y="72" width="17" height="17" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                            
                            {/* Arrow showing movement */}
                            <path d="M43 72L43 66L47 66L47 72" stroke="#8C9196" strokeWidth="1.5" strokeOpacity="0.6" fill="none" markerEnd="url(#arrowhead)"/>
                            <defs>
                              <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                                <polygon points="0 0, 6 3, 0 6" fill="#8C9196" fillOpacity="0.6" />
                              </marker>
                            </defs>
                          </svg>
                        </Box>
                        <Text variant="bodyLg" fontWeight="medium" alignment="center">
                          Selection Box
                        </Text>
                        {formData.layoutType === 'selection' && (
                          <Box position="absolute" insetBlockStart="200" insetInlineEnd="200">
                            <Icon source={CheckIcon} tone="success" />
                          </Box>
                        )}
                      </BlockStack>
                    </Card>
                  </div>
                </Box>
              </Grid>
            </Box>

            {/* Column settings for applicable layouts */}
            {['grid', 'slider'].includes(formData.layoutType) && (
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
                        value={formData.mobileColumns.toString()}
                        onChange={(value) => setFormData({ ...formData, mobileColumns: parseInt(value) })}
                        helpText="Number of columns on mobile devices"
                      />
                      <Select
                        label="Desktop columns"
                        options={desktopColumnOptions}
                        value={formData.desktopColumns.toString()}
                        onChange={(value) => setFormData({ ...formData, desktopColumns: parseInt(value) })}
                        helpText="Number of columns on desktop"
                      />
                    </FormLayout.Group>
                  </FormLayout>
                </Box>
              </Box>
            )}

            {/* Grid-specific settings */}
            {formData.layoutType === 'grid' && (
              <Box>
                <Divider />
                <Box paddingBlockStart="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h4" fontWeight="semibold">
                      Grid Settings
                    </Text>
                    
                    <FormLayout>
                      <Text variant="bodyMd" fontWeight="medium">Products per row</Text>
                      <FormLayout.Group>
                        <Select
                          label="Mobile"
                          options={[
                            { label: "1 product", value: "1" },
                            { label: "2 products", value: "2" },
                          ]}
                          value={formData.layoutSettings.gridSettings.productsPerRow.mobile.toString()}
                          onChange={(value) => setFormData({
                            ...formData,
                            layoutSettings: {
                              ...formData.layoutSettings,
                              gridSettings: {
                                ...formData.layoutSettings.gridSettings,
                                productsPerRow: {
                                  ...formData.layoutSettings.gridSettings.productsPerRow,
                                  mobile: parseInt(value) as 1 | 2
                                }
                              }
                            }
                          })}
                        />
                        <Select
                          label="Tablet"
                          options={[
                            { label: "2 products", value: "2" },
                            { label: "3 products", value: "3" },
                            { label: "4 products", value: "4" },
                          ]}
                          value={formData.layoutSettings.gridSettings.productsPerRow.tablet.toString()}
                          onChange={(value) => setFormData({
                            ...formData,
                            layoutSettings: {
                              ...formData.layoutSettings,
                              gridSettings: {
                                ...formData.layoutSettings.gridSettings,
                                productsPerRow: {
                                  ...formData.layoutSettings.gridSettings.productsPerRow,
                                  tablet: parseInt(value) as 2 | 3 | 4
                                }
                              }
                            }
                          })}
                        />
                        <Select
                          label="Desktop"
                          options={[
                            { label: "3 products", value: "3" },
                            { label: "4 products", value: "4" },
                            { label: "5 products", value: "5" },
                            { label: "6 products", value: "6" },
                          ]}
                          value={formData.layoutSettings.gridSettings.productsPerRow.desktop.toString()}
                          onChange={(value) => setFormData({
                            ...formData,
                            layoutSettings: {
                              ...formData.layoutSettings,
                              gridSettings: {
                                ...formData.layoutSettings.gridSettings,
                                productsPerRow: {
                                  ...formData.layoutSettings.gridSettings.productsPerRow,
                                  desktop: parseInt(value) as 3 | 4 | 5 | 6
                                }
                              }
                            }
                          })}
                        />
                      </FormLayout.Group>

                      <Checkbox
                        label="Enable quick add"
                        helpText="Allow customers to quickly add products to cart without opening product details"
                        checked={formData.layoutSettings.gridSettings.enableQuickAdd}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            gridSettings: {
                              ...formData.layoutSettings.gridSettings,
                              enableQuickAdd: value
                            }
                          }
                        })}
                      />

                      <BlockStack gap="200">
                        <Text variant="bodyMd" fontWeight="medium">Image position</Text>
                        <BlockStack gap="200">
                          <RadioButton
                            label="Top"
                            helpText="Image above product details"
                            checked={formData.layoutSettings.gridSettings.imagePosition === 'top'}
                            id="imagePositionTop"
                            name="imagePosition"
                            onChange={() => setFormData({
                              ...formData,
                              layoutSettings: {
                                ...formData.layoutSettings,
                                gridSettings: {
                                  ...formData.layoutSettings.gridSettings,
                                  imagePosition: 'top'
                                }
                              }
                            })}
                          />
                          <RadioButton
                            label="Left"
                            helpText="Image to the left of product details"
                            checked={formData.layoutSettings.gridSettings.imagePosition === 'left'}
                            id="imagePositionLeft"
                            name="imagePosition"
                            onChange={() => setFormData({
                              ...formData,
                              layoutSettings: {
                                ...formData.layoutSettings,
                                gridSettings: {
                                  ...formData.layoutSettings.gridSettings,
                                  imagePosition: 'left'
                                }
                              }
                            })}
                          />
                        </BlockStack>
                      </BlockStack>
                    </FormLayout>
                  </BlockStack>
                </Box>
              </Box>
            )}

            {/* Slider-specific settings */}
            {formData.layoutType === 'slider' && (
              <Box>
                <Divider />
                <Box paddingBlockStart="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h4" fontWeight="semibold">
                      Slider Settings
                    </Text>
                    
                    <FormLayout>
                      <Text variant="bodyMd" fontWeight="medium">Slides to show</Text>
                      <FormLayout.Group>
                        <Select
                          label="Mobile"
                          options={[
                            { label: "1 slide", value: "1" },
                            { label: "2 slides", value: "2" },
                          ]}
                          value={formData.layoutSettings.sliderSettings.slidesToShow.mobile.toString()}
                          onChange={(value) => setFormData({
                            ...formData,
                            layoutSettings: {
                              ...formData.layoutSettings,
                              sliderSettings: {
                                ...formData.layoutSettings.sliderSettings,
                                slidesToShow: {
                                  ...formData.layoutSettings.sliderSettings.slidesToShow,
                                  mobile: parseInt(value) as 1 | 2
                                }
                              }
                            }
                          })}
                        />
                        <Select
                          label="Tablet"
                          options={[
                            { label: "2 slides", value: "2" },
                            { label: "3 slides", value: "3" },
                          ]}
                          value={formData.layoutSettings.sliderSettings.slidesToShow.tablet.toString()}
                          onChange={(value) => setFormData({
                            ...formData,
                            layoutSettings: {
                              ...formData.layoutSettings,
                              sliderSettings: {
                                ...formData.layoutSettings.sliderSettings,
                                slidesToShow: {
                                  ...formData.layoutSettings.sliderSettings.slidesToShow,
                                  tablet: parseInt(value) as 2 | 3
                                }
                              }
                            }
                          })}
                        />
                        <Select
                          label="Desktop"
                          options={[
                            { label: "3 slides", value: "3" },
                            { label: "4 slides", value: "4" },
                            { label: "5 slides", value: "5" },
                          ]}
                          value={formData.layoutSettings.sliderSettings.slidesToShow.desktop.toString()}
                          onChange={(value) => setFormData({
                            ...formData,
                            layoutSettings: {
                              ...formData.layoutSettings,
                              sliderSettings: {
                                ...formData.layoutSettings.sliderSettings,
                                slidesToShow: {
                                  ...formData.layoutSettings.sliderSettings.slidesToShow,
                                  desktop: parseInt(value) as 3 | 4 | 5
                                }
                              }
                            }
                          })}
                        />
                      </FormLayout.Group>

                      <TextField
                        label="Slides to scroll"
                        type="number"
                        value={formData.layoutSettings.sliderSettings.slidesToScroll.toString()}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            sliderSettings: {
                              ...formData.layoutSettings.sliderSettings,
                              slidesToScroll: parseInt(value) || 1
                            }
                          }
                        })}
                        helpText="Number of slides to scroll at a time"
                        min={1}
                      />

                      <Checkbox
                        label="Infinite loop"
                        helpText="Continue scrolling from the beginning after reaching the end"
                        checked={formData.layoutSettings.sliderSettings.infiniteLoop}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            sliderSettings: {
                              ...formData.layoutSettings.sliderSettings,
                              infiniteLoop: value
                            }
                          }
                        })}
                      />

                      <Checkbox
                        label="Autoplay"
                        helpText="Automatically advance slides"
                        checked={formData.layoutSettings.sliderSettings.autoplay}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            sliderSettings: {
                              ...formData.layoutSettings.sliderSettings,
                              autoplay: value
                            }
                          }
                        })}
                      />

                      {formData.layoutSettings.sliderSettings.autoplay && (
                        <TextField
                          label="Autoplay speed (ms)"
                          type="number"
                          value={formData.layoutSettings.sliderSettings.autoplaySpeed.toString()}
                          onChange={(value) => setFormData({
                            ...formData,
                            layoutSettings: {
                              ...formData.layoutSettings,
                              sliderSettings: {
                                ...formData.layoutSettings.sliderSettings,
                                autoplaySpeed: parseInt(value) || 5000
                              }
                            }
                          })}
                          helpText="Time between slide transitions in milliseconds"
                          min={1000}
                          max={10000}
                        />
                      )}

                      <Checkbox
                        label="Enable thumbnails"
                        helpText="Show thumbnail navigation below the slider"
                        checked={formData.layoutSettings.sliderSettings.enableThumbnails}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            sliderSettings: {
                              ...formData.layoutSettings.sliderSettings,
                              enableThumbnails: value
                            }
                          }
                        })}
                      />
                    </FormLayout>
                  </BlockStack>
                </Box>
              </Box>
            )}

            {/* Modal-specific settings */}
            {formData.layoutType === 'modal' && (
              <Box>
                <Divider />
                <Box paddingBlockStart="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h4" fontWeight="semibold">
                      Modal Settings
                    </Text>
                    
                    <FormLayout>
                      <Select
                        label="Trigger type"
                        options={[
                          { label: "Button", value: "button" },
                          { label: "Auto open", value: "auto" },
                          { label: "Exit intent", value: "exit-intent" },
                        ]}
                        value={formData.layoutSettings.modalSettings.triggerType}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            modalSettings: {
                              ...formData.layoutSettings.modalSettings,
                              triggerType: value as "button" | "auto" | "exit-intent"
                            }
                          }
                        })}
                        helpText="How the modal should be triggered"
                      />

                      <Select
                        label="Modal behavior"
                        options={[
                          { label: "Close on add", value: "closeOnAdd" },
                          { label: "Stay open", value: "stayOpen" },
                          { label: "Redirect to cart", value: "redirectToCart" },
                        ]}
                        value={formData.layoutSettings.modalSettings.modalBehavior}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            modalSettings: {
                              ...formData.layoutSettings.modalSettings,
                              modalBehavior: value as "closeOnAdd" | "stayOpen" | "redirectToCart"
                            }
                          }
                        })}
                        helpText="What happens after adding to cart"
                      />

                      <Checkbox
                        label="Block page scroll"
                        helpText="Prevent scrolling the main page when modal is open"
                        checked={formData.layoutSettings.modalSettings.blockPageScroll}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            modalSettings: {
                              ...formData.layoutSettings.modalSettings,
                              blockPageScroll: value
                            }
                          }
                        })}
                      />

                      <BlockStack gap="200">
                        <Text variant="bodyMd" fontWeight="medium">Modal size</Text>
                        <BlockStack gap="200">
                          <RadioButton
                            label="Product count"
                            helpText="Modal size adjusts based on number of products"
                            checked={formData.layoutSettings.modalSettings.modalSize === 'productCount'}
                            id="modalSizeProductCount"
                            name="modalSize"
                            onChange={() => setFormData({
                              ...formData,
                              layoutSettings: {
                                ...formData.layoutSettings,
                                modalSettings: {
                                  ...formData.layoutSettings.modalSettings,
                                  modalSize: 'productCount'
                                }
                              }
                            })}
                          />
                          <RadioButton
                            label="Fixed"
                            helpText="Modal has a fixed size regardless of content"
                            checked={formData.layoutSettings.modalSettings.modalSize === 'fixed'}
                            id="modalSizeFixed"
                            name="modalSize"
                            onChange={() => setFormData({
                              ...formData,
                              layoutSettings: {
                                ...formData.layoutSettings,
                                modalSettings: {
                                  ...formData.layoutSettings.modalSettings,
                                  modalSize: 'fixed'
                                }
                              }
                            })}
                          />
                        </BlockStack>
                      </BlockStack>
                    </FormLayout>
                  </BlockStack>
                </Box>
              </Box>
            )}

            {/* Selection Box settings */}
            {formData.layoutType === 'selection' && (
              <Box>
                <Divider />
                <Box paddingBlockStart="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h4" fontWeight="semibold">
                      Selection Box Settings
                    </Text>
                    
                    <FormLayout>
                      <Select
                        label="Selection mode"
                        options={[
                          { label: "Click", value: "click" },
                          { label: "Drag", value: "drag" },
                          { label: "Both", value: "both" },
                        ]}
                        value={formData.layoutSettings.selectionSettings.selectionMode}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            selectionSettings: {
                              ...formData.layoutSettings.selectionSettings,
                              selectionMode: value as "click" | "drag" | "both"
                            }
                          }
                        })}
                        helpText="How customers can select products"
                      />

                      <Select
                        label="Empty slot behavior"
                        options={[
                          { label: "Hide", value: "hide" },
                          { label: "Show", value: "show" },
                          { label: "Show ghost", value: "showGhost" },
                        ]}
                        value={formData.layoutSettings.selectionSettings.emptySlotBehavior}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            selectionSettings: {
                              ...formData.layoutSettings.selectionSettings,
                              emptySlotBehavior: value as "hide" | "show" | "showGhost"
                            }
                          }
                        })}
                        helpText="How to display empty selection slots"
                      />

                      <Select
                        label="Progress tracking"
                        options={[
                          { label: "Counter", value: "counter" },
                          { label: "Percentage", value: "percentage" },
                          { label: "Visual", value: "visual" },
                        ]}
                        value={formData.layoutSettings.selectionSettings.progressTracking}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            selectionSettings: {
                              ...formData.layoutSettings.selectionSettings,
                              progressTracking: value as "counter" | "percentage" | "visual"
                            }
                          }
                        })}
                        helpText="How to show selection progress"
                      />

                      <TextField
                        label="Selection limit"
                        type="number"
                        value={formData.layoutSettings.selectionSettings.selectionLimit.toString()}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            selectionSettings: {
                              ...formData.layoutSettings.selectionSettings,
                              selectionLimit: parseInt(value) || 10
                            }
                          }
                        })}
                        helpText="Maximum selections across all steps"
                        min={1}
                      />
                    </FormLayout>
                  </BlockStack>
                </Box>
              </Box>
            )}
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
                                <InlineStack gap="400" align="start">
                                  {/* Grid Layout Card */}
                                  <Box width="150px">
                                    <div
                                      onClick={() => updateStep(index, { displayType: 'grid' })}
                                      style={{ 
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      <Card
                                        background={step.displayType === 'grid' ? 'bg-surface-selected' : 'bg-surface'}
                                        padding="400"
                                        style={{ 
                                          border: step.displayType === 'grid' ? '2px solid var(--p-color-border-emphasis)' : '1px solid var(--p-color-border)',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        <BlockStack gap="300" inlineAlign="center">
                                          {/* Grid SVG Icon */}
                                          <Box width="80px" height="80px">
                                            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              {/* Product cards in 2x2 grid */}
                                              <rect x="8" y="8" width="30" height="30" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                                              <rect x="42" y="8" width="30" height="30" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                                              <rect x="8" y="42" width="30" height="30" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                                              <rect x="42" y="42" width="30" height="30" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                                              
                                              {/* Placeholder content in cards */}
                                              <rect x="13" y="13" width="20" height="14" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                                              <rect x="47" y="13" width="20" height="14" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                                              <rect x="13" y="47" width="20" height="14" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                                              <rect x="47" y="47" width="20" height="14" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                                              
                                              {/* Text lines */}
                                              <rect x="13" y="30" width="20" height="2" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                                              <rect x="47" y="30" width="20" height="2" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                                              <rect x="13" y="64" width="20" height="2" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                                              <rect x="47" y="64" width="20" height="2" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                                            </svg>
                                          </Box>
                                          <Text variant="bodyMd" fontWeight="medium" alignment="center">
                                            Grid
                                          </Text>
                                          {step.displayType === 'grid' && (
                                            <Box position="absolute" insetBlockStart="200" insetInlineEnd="200">
                                              <Icon source={CheckIcon} tone="success" />
                                            </Box>
                                          )}
                                        </BlockStack>
                                      </Card>
                                    </div>
                                  </Box>

                                  {/* Slider/Carousel Layout Card */}
                                  <Box width="150px">
                                    <div
                                      onClick={() => updateStep(index, { displayType: 'carousel' })}
                                      style={{ 
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      <Card
                                        background={step.displayType === 'carousel' ? 'bg-surface-selected' : 'bg-surface'}
                                        padding="400"
                                        style={{ 
                                          border: step.displayType === 'carousel' ? '2px solid var(--p-color-border-emphasis)' : '1px solid var(--p-color-border)',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        <BlockStack gap="300" inlineAlign="center">
                                          {/* Slider SVG Icon */}
                                          <Box width="80px" height="80px">
                                            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              {/* Navigation arrows */}
                                              <path d="M12 40L20 32L20 48L12 40Z" fill="#8C9196" fillOpacity="0.5"/>
                                              <path d="M68 40L60 48L60 32L68 40Z" fill="#8C9196" fillOpacity="0.5"/>
                                              
                                              {/* Center card (active) */}
                                              <rect x="25" y="16" width="30" height="40" rx="4" fill="#8C9196" fillOpacity="0.3" stroke="#8C9196" strokeWidth="1.5"/>
                                              <rect x="30" y="22" width="20" height="20" rx="2" fill="#8C9196" fillOpacity="0.4"/>
                                              <rect x="30" y="46" width="20" height="2" rx="1" fill="#8C9196" fillOpacity="0.6"/>
                                              <rect x="30" y="50" width="14" height="2" rx="1" fill="#8C9196" fillOpacity="0.4"/>
                                              
                                              {/* Side cards (partially visible) */}
                                              <rect x="10" y="20" width="12" height="32" rx="3" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1" strokeOpacity="0.3"/>
                                              <rect x="58" y="20" width="12" height="32" rx="3" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1" strokeOpacity="0.3"/>
                                              
                                              {/* Dots indicator */}
                                              <circle cx="32" cy="66" r="2" fill="#8C9196" fillOpacity="0.3"/>
                                              <circle cx="40" cy="66" r="2.5" fill="#8C9196" fillOpacity="0.8"/>
                                              <circle cx="48" cy="66" r="2" fill="#8C9196" fillOpacity="0.3"/>
                                            </svg>
                                          </Box>
                                          <Text variant="bodyMd" fontWeight="medium" alignment="center">
                                            Slider
                                          </Text>
                                          {step.displayType === 'carousel' && (
                                            <Box position="absolute" insetBlockStart="200" insetInlineEnd="200">
                                              <Icon source={CheckIcon} tone="success" />
                                            </Box>
                                          )}
                                        </BlockStack>
                                      </Card>
                                    </div>
                                  </Box>

                                  {/* List/Accordion Layout Card */}
                                  <Box width="150px">
                                    <div
                                      onClick={() => updateStep(index, { displayType: 'list' })}
                                      style={{ 
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      <Card
                                        background={step.displayType === 'list' ? 'bg-surface-selected' : 'bg-surface'}
                                        padding="400"
                                        style={{ 
                                          border: step.displayType === 'list' ? '2px solid var(--p-color-border-emphasis)' : '1px solid var(--p-color-border)',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        <BlockStack gap="300" inlineAlign="center">
                                          {/* Accordion SVG Icon */}
                                          <Box width="80px" height="80px">
                                            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              {/* Expanded section */}
                                              <rect x="12" y="10" width="56" height="8" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                                              <path d="M60 14L64 11L64 17L60 14Z" fill="#8C9196" transform="rotate(90 62 14)"/>
                                              
                                              {/* Expanded content */}
                                              <rect x="16" y="22" width="48" height="20" rx="2" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1" strokeOpacity="0.2"/>
                                              <rect x="20" y="26" width="20" height="12" rx="1" fill="#8C9196" fillOpacity="0.2"/>
                                              <rect x="44" y="28" width="16" height="2" rx="1" fill="#8C9196" fillOpacity="0.4"/>
                                              <rect x="44" y="32" width="12" height="2" rx="1" fill="#8C9196" fillOpacity="0.3"/>
                                              
                                              {/* Collapsed sections */}
                                              <rect x="12" y="46" width="56" height="8" rx="2" fill="#8C9196" fillOpacity="0.2"/>
                                              <path d="M60 50L63 47L57 47L60 50Z" fill="#8C9196" fillOpacity="0.6"/>
                                              
                                              <rect x="12" y="58" width="56" height="8" rx="2" fill="#8C9196" fillOpacity="0.2"/>
                                              <path d="M60 62L63 59L57 59L60 62Z" fill="#8C9196" fillOpacity="0.6"/>
                                              
                                              <rect x="12" y="70" width="56" height="8" rx="2" fill="#8C9196" fillOpacity="0.15"/>
                                              <path d="M60 74L63 71L57 71L60 74Z" fill="#8C9196" fillOpacity="0.5"/>
                                            </svg>
                                          </Box>
                                          <Text variant="bodyMd" fontWeight="medium" alignment="center">
                                            Accordion
                                          </Text>
                                          {step.displayType === 'list' && (
                                            <Box position="absolute" insetBlockStart="200" insetInlineEnd="200">
                                              <Icon source={CheckIcon} tone="success" />
                                            </Box>
                                          )}
                                        </BlockStack>
                                      </Card>
                                    </div>
                                  </Box>
                                </InlineStack>
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
                                        onChange={(value) => updateStep(index, { mobileColumns: parseInt(value) })}
                                        helpText="Number of columns on mobile devices"
                                      />
                                      <Select
                                        label="Desktop columns"
                                        options={desktopColumnOptions}
                                        value={(step.desktopColumns || 4).toString()}
                                        onChange={(value) => updateStep(index, { desktopColumns: parseInt(value) })}
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
                  <Button onClick={addStep} variant="primary" fullWidth>
                    Add step
                  </Button>
                </Box>
              </InlineStack>
            </Box>
          </BlockStack>
        </Card>

        {/* Form Actions */}
        <Box paddingBlockStart="400" paddingBlockEnd="800">
          <InlineStack align="end">
            <ButtonGroup>
              <Button onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
              <Button variant="primary" submit loading={isSubmitting} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : bundle ? "Update bundle" : "Create bundle"}
              </Button>
            </ButtonGroup>
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