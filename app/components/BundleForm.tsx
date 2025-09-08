import { useCallback, useState, useEffect, useRef, useMemo } from "react";
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
  Banner,
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
import { DeleteIcon, SearchIcon, DragHandleIcon, CheckIcon, CashDollarIcon, LayoutSectionIcon, ListBulletedIcon } from "@shopify/polaris-icons";
import type { Bundle, BundleStep, CreateBundleRequest, UpdateBundleRequest } from "~/types/bundle";
import { ProductPicker } from "./ProductPicker";

interface BundleFormProps {
  bundle?: Bundle; // undefined for create, defined for edit
  onSubmit: (data: CreateBundleRequest | UpdateBundleRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  onFormStateChange?: (formState: {
    title: string;
    status: Bundle['status'];
    layoutType: Bundle['layoutType'];
    discountType: Bundle['discountType'];
    discountValue: number;
    steps: FormStep[];
    isValid: boolean;
    validationErrors?: Record<string, string>;
    touched?: Record<string, boolean>;
  }) => void;
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

export function BundleForm({ bundle, onSubmit, onCancel, isSubmitting = false, onFormStateChange }: BundleFormProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [productDetails, setProductDetails] = useState<Record<string, any>>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = useState({
    title: bundle?.title || "",
    status: bundle?.status || "draft" as "active" | "draft" | "inactive",
    discountType: bundle?.discountType || "percentage" as "percentage" | "fixed" | "total",
    discountValue: bundle?.discountValue?.toString() || "",
    layoutType: bundle?.layoutType || "basic" as "basic" | "modal" | "selection" | "stepper",
    mobileColumns: bundle?.mobileColumns || 2,
    desktopColumns: bundle?.desktopColumns || 4,
    layoutSettings: bundle?.layoutSettings || {
      basicSettings: {
        imagePosition: "left" as "left" | "right",
        imageAspectRatio: "square" as "square" | "portrait" | "landscape",
        imageBehavior: "zoom" as "zoom" | "lightbox" | "none",
        imageGalleryType: "thumbnails" as "thumbnails" | "dots" | "none",
        contentWidth: "medium" as "narrow" | "medium" | "wide",
        mobileLayout: "stacked" as "stacked" | "horizontal",
        showProgressBar: true,
        stepTransition: "slide" as "slide" | "fade" | "none",
      },
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
      stepperSettings: {
        showProgressBar: true,
        progressBarPosition: "top" as "top" | "bottom",
        allowBackNavigation: true,
        completionBehavior: "summary" as "summary" | "auto-add" | "redirect",
        showStepNumbers: true,
        animationStyle: "slide" as "slide" | "fade" | "none",
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
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

  const validateForm = useCallback((showAllErrors: boolean = false): boolean => {
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

    // Only show errors for touched fields unless showAllErrors is true
    if (!showAllErrors) {
      const filteredErrors: Record<string, string> = {};
      Object.keys(newErrors).forEach(key => {
        if (touched[key]) {
          filteredErrors[key] = newErrors[key];
        }
      });
      setErrors(filteredErrors);
    } else {
      setErrors(newErrors);
    }

    return Object.keys(newErrors).length === 0;
  }, [formData, steps, touched]);

  // Helper function to mark field as touched
  const markFieldTouched = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  // Get all validation errors (for parent component)
  const getAllValidationErrors = useCallback(() => {
    const allErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      allErrors.title = "Title is required";
    }

    if (!formData.discountValue || parseFloat(formData.discountValue) <= 0) {
      allErrors.discountValue = "Discount value must be greater than 0";
    }

    if (formData.discountType === "percentage" && parseFloat(formData.discountValue) > 100) {
      allErrors.discountValue = "Percentage cannot be greater than 100";
    }

    // Only validate steps that have been modified (have a title or products)
    steps.forEach((step, index) => {
      const isStepTouched = step.title.trim() || step.products.length > 0;

      if (isStepTouched) {
        if (!step.title.trim()) {
          allErrors[`step_${index}_title`] = "Step title is required";
        }
        if (step.minSelections < 0) {
          allErrors[`step_${index}_min`] = "Minimum selections cannot be negative";
        }
        if (step.maxSelections !== undefined && step.maxSelections < step.minSelections) {
          allErrors[`step_${index}_max`] = "Maximum must be greater than or equal to minimum";
        }
        if (step.products.length === 0) {
          allErrors[`step_${index}_products`] = "At least one product is required";
        }
      }
    });

    // Ensure at least one valid step exists
    const hasValidStep = steps.some(step => step.title.trim());
    if (!hasValidStep) {
      allErrors.steps = "At least one step with a title is required";
    }

    return allErrors;
  }, [formData, steps]);

  // Notify parent component of form state changes with debounce to prevent focus loss
  useEffect(() => {
    if (onFormStateChange) {
      // Clear any existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set a new timer with 100ms delay
      debounceTimerRef.current = setTimeout(() => {
        const allErrors = getAllValidationErrors();
        const isValid = Object.keys(allErrors).length === 0;
        onFormStateChange({
          title: formData.title,
          status: formData.status,
          layoutType: formData.layoutType,
          discountType: formData.discountType,
          discountValue: parseFloat(formData.discountValue) || 0,
          steps,
          isValid,
          validationErrors: allErrors,
          touched,
        });
      }, 100);
    }

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, steps, onFormStateChange, getAllValidationErrors, touched]);

  const handleSubmit = useCallback(async () => {
    console.log("Form submitted, validating...");
    // Mark all fields as touched on submit
    const allTouched: Record<string, boolean> = {
      title: true,
      discountValue: true,
      steps: true,
    };
    steps.forEach((step, index) => {
      const isStepModified = step.title.trim() || step.products.length > 0;
      if (isStepModified) {
        allTouched[`step_${index}_title`] = true;
        allTouched[`step_${index}_min`] = true;
        allTouched[`step_${index}_max`] = true;
        allTouched[`step_${index}_products`] = true;
      }
    });
    setTouched(allTouched);

    if (!validateForm(true)) {
      console.log("Validation failed");
      return;
    }

    // Only include the relevant layoutSettings based on layoutType
    const layoutSettings: any = {};
    switch (formData.layoutType) {
      case 'basic':
        if (formData.layoutSettings.basicSettings) {
          layoutSettings.basicSettings = formData.layoutSettings.basicSettings;
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
      case 'stepper':
        if (formData.layoutSettings.stepperSettings) {
          layoutSettings.stepperSettings = formData.layoutSettings.stepperSettings;
        }
        break;
    }

    const data: CreateBundleRequest | UpdateBundleRequest = {
      title: formData.title,
      status: formData.status as "active" | "draft",
      discountType: formData.discountType as "percentage" | "fixed" | "total",
      discountValue: parseFloat(formData.discountValue),
      layoutType: formData.layoutType as "basic" | "modal" | "selection" | "stepper",
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
    { label: "Selection", value: "selection" },
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

  // Smart field highlighting: determine which fields/tabs need attention
  const getNextRequiredField = useMemo(() => {
    // Check title field
    if (!formData.title.trim()) {
      return { field: 'title', tab: null };
    }

    // Check discount value
    const discountNum = parseFloat(formData.discountValue);
    if (!formData.discountValue || isNaN(discountNum) || discountNum <= 0) {
      return { field: 'discountValue', tab: 0 }; // Pricing tab
    }

    // Check if we have at least one step with products
    const hasValidStep = steps.some(step =>
      step.title.trim() && step.products.length > 0
    );

    if (!hasValidStep) {
      return { field: 'steps', tab: 2 }; // Bundle Steps tab
    }

    // All required fields are filled
    return { field: null, tab: null };
  }, [formData.title, formData.discountValue, steps]);

  // Helper to check if a field should be highlighted
  const shouldHighlightField = (fieldName: string) => {
    return getNextRequiredField.field === fieldName && !touched[fieldName];
  };

  // Helper to check if a tab should be highlighted
  const shouldHighlightTab = (tabIndex: number) => {
    return getNextRequiredField.tab === tabIndex;
  };

  // Helper function to update nested layoutSettings without losing focus
  const updateLayoutSettings = useCallback((updater: (prev: typeof formData.layoutSettings) => typeof formData.layoutSettings) => {
    setFormData(prev => ({
      ...prev,
      layoutSettings: updater(prev.layoutSettings)
    }));
  }, []);

  const tabs = [
    {
      id: 'pricing',
      content: (
        <InlineStack gap="100" blockAlign="center">
          <Icon source={CashDollarIcon} tone="base" />
          <Text as="span" variant="bodyMd">Pricing</Text>
          {shouldHighlightTab(0) && (
            <Text as="span" variant="bodySm">
              ⚠️
            </Text>
          )}
        </InlineStack>
      ),
      accessibilityLabel: 'Pricing configuration',
    },
    {
      id: 'layout',
      content: (
        <InlineStack gap="100" blockAlign="center">
          <Icon source={LayoutSectionIcon} tone="base" />
          <Text as="span" variant="bodyMd">Layout Configuration</Text>
        </InlineStack>
      ),
      accessibilityLabel: 'Layout configuration',
    },
    {
      id: 'steps',
      content: (
        <InlineStack gap="100" blockAlign="center">
          <Icon source={ListBulletedIcon} tone="base" />
          <Text as="span" variant="bodyMd">Bundle Steps</Text>
          {shouldHighlightTab(2) && (
            <Text as="span" variant="bodySm">
              ⚠️
            </Text>
          )}
        </InlineStack>
      ),
      accessibilityLabel: 'Bundle steps configuration',
    },
  ];

  return (
    <Form onSubmit={handleSubmit}>
      <BlockStack gap="600">
        {/* Progress Guidance Banner - Only show in create mode */}
        {!bundle && !getNextRequiredField.field && (
          <Banner status="success">
            <p>All required fields are filled! You can now save your bundle.</p>
          </Banner>
        )}
        {!bundle && getNextRequiredField.field && (
          <Banner status="info">
            <p>
              {getNextRequiredField.field === 'title' && "Start by giving your bundle a title"}
              {getNextRequiredField.field === 'discountValue' && "Next, set the discount value in the Pricing tab"}
              {getNextRequiredField.field === 'steps' && "Finally, add bundle steps with products in the Bundle Steps tab"}
            </p>
          </Banner>
        )}

        {/* Basic Information - Always visible */}
        <Card>
          <BlockStack gap="400">
            <InlineStack gap="100" blockAlign="center">
              <Text variant="headingMd" as="h2">
                Basic Info
              </Text>
              {getNextRequiredField.field === 'title' && (
                <Text as="span" variant="bodySm">
                  ⚠️
                </Text>
              )}
            </InlineStack>
            <FormLayout>
              <div className={shouldHighlightField('title') ? 'field-highlight' : ''}>
                <TextField
                  label="Title"
                  value={formData.title}
                  onChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
                  onBlur={() => markFieldTouched('title')}
                  autoComplete="off"
                  error={errors.title}
                  requiredIndicator
                  helpText={shouldHighlightField('title') ? "Please fill in the bundle title" : undefined}
                />
              </div>
              <Select
                label="Status"
                options={statusOptions}
                value={formData.status}
                onChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
              />
            </FormLayout>
          </BlockStack>
        </Card>

        {/* Tabbed Content */}
        <Box>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            {/* Pricing Tab */}
            {selectedTab === 0 && (
              <Box paddingBlockStart="400">
                <Card>
                  <BlockStack gap="400">
                    <FormLayout>
                      <FormLayout.Group>
                      <Select
                        label="Discount type"
                        options={discountTypeOptions}
                        value={formData.discountType}
                        onChange={(value) => setFormData(prev => ({ ...prev, discountType: value as any }))}
                      />
                      <div className={shouldHighlightField('discountValue') ? 'field-highlight' : ''}>
                        <TextField
                          label="Discount value"
                          type="number"
                          value={formData.discountValue}
                          onChange={(value) => setFormData(prev => ({ ...prev, discountValue: value }))}
                          onBlur={() => markFieldTouched('discountValue')}
                          autoComplete="off"
                          error={errors.discountValue}
                          requiredIndicator
                          prefix={formData.discountType === "percentage" ? "" : "$"}
                          suffix={formData.discountType === "percentage" ? "%" : ""}
                          helpText={shouldHighlightField('discountValue') ? "Please enter a discount value greater than 0" : undefined}
                        />
                      </div>
                    </FormLayout.Group>
                  </FormLayout>
                </BlockStack>
                </Card>
              </Box>
            )}

            {/* Layout Configuration Tab */}
            {selectedTab === 1 && (
              <Box paddingBlockStart="400">
                <BlockStack gap="400">
                  {bundle ? (
          // Edit page - Use radio buttons with images
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

              {/* Radio button layout selector for edit page */}
              <Box width="100%">
              <BlockStack gap="400">
                {/* Basic Layout Option */}
                <RadioButton
                    label={
                      <InlineStack gap="300" blockAlign="center">
                          <Box width="40px" height="40px" style={{ flexShrink: 0 }}>
                            <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                              {/* Left side - image placeholder */}
                              <rect x="10" y="20" width="35" height="60" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1.5"/>
                              <rect x="15" y="25" width="25" height="35" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                              <rect x="15" y="65" width="25" height="3" rx="1.5" fill="#8C9196" fillOpacity="0.5"/>
                              <rect x="15" y="71" width="18" height="2" rx="1" fill="#8C9196" fillOpacity="0.4"/>
                              
                              {/* Right side - bundle products */}
                              <rect x="52" y="20" width="38" height="60" rx="3" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1.2" strokeDasharray="3 2"/>
                              
                              {/* Product items */}
                              <rect x="57" y="25" width="28" height="8" rx="1.5" fill="#8C9196" fillOpacity="0.3"/>
                              <rect x="57" y="36" width="28" height="8" rx="1.5" fill="#8C9196" fillOpacity="0.3"/>
                              <rect x="57" y="47" width="28" height="8" rx="1.5" fill="#8C9196" fillOpacity="0.3"/>
                              
                              {/* Add to cart button */}
                              <rect x="57" y="65" width="28" height="10" rx="2" fill="#00AA5E" fillOpacity="0.8"/>
                              <text x="71" y="72" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="bold" fontFamily="Arial">Add</text>
                            </svg>
                        </Box>
                        <Box>
                          <Text variant="bodyLg" fontWeight="semibold">Basic Layout</Text>
                          <Text variant="bodySm" tone="subdued">Image left, products right</Text>
                        </Box>
                      </InlineStack>
                    }
                    checked={formData.layoutType === 'basic'}
                    id="layout-basic-edit"
                    onChange={() => setFormData(prev => ({ ...prev, layoutType: 'basic' }))}
                />

                {/* Modal Layout Option */}
                <RadioButton
                    label={
                      <InlineStack gap="300" blockAlign="center">
                          <Box width="100px" height="40px" style={{ flexShrink: 0 }}>
                            <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                            <rect x="20" y="15" width="60" height="70" rx="3" fill="#E3E5E7" fillOpacity="0.6" stroke="#8C9196" strokeOpacity="0.3" strokeWidth="1.2"/>
                            <rect x="28" y="23" width="44" height="52" rx="3" fill="#FAFBFB" stroke="#8C9196" strokeWidth="1.5"/>
                            <line x1="28" y1="36" x2="72" y2="36" stroke="#8C9196" strokeWidth="1.2" strokeOpacity="0.5"/>
                            <rect x="64" y="27" width="5" height="5" rx="0.8" fill="#8C9196" fillOpacity="0.8"/>
                            <rect x="35" y="43" width="30" height="18" rx="2.5" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                            <rect x="39" y="47" width="22" height="9" rx="1.5" fill="#8C9196" fillOpacity="0.3"/>
                            <rect x="35" y="65" width="13" height="2.5" rx="1.25" fill="#8C9196" fillOpacity="0.5"/>
                            <rect x="52" y="65" width="13" height="2.5" rx="1.25" fill="#00AA5E" fillOpacity="0.8"/>
                          </svg>
                        </Box>
                        <Box>
                          <Text variant="bodyLg" fontWeight="semibold">Modal Layout</Text>
                          <Text variant="bodySm" tone="subdued">Display products in a popup modal</Text>
                        </Box>
                      </InlineStack>
                    }
                    checked={formData.layoutType === 'modal'}
                    id="layout-modal-edit"
                    onChange={() => setFormData(prev => ({ ...prev, layoutType: 'modal' }))}
                />

                {/* Selection Layout Option */}
                <RadioButton
                    label={
                      <InlineStack gap="300" blockAlign="center">
                          <Box width="100px" height="40px" style={{ flexShrink: 0 }}>
                            <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                            <rect x="20" y="10" width="60" height="35" rx="4" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1.5" strokeDasharray="3 3"/>
                            <text x="50" y="30" textAnchor="middle" fill="#8C9196" fontSize="12" fontFamily="Arial">Drop Here</text>
                            <rect x="35" y="50" width="14" height="14" rx="3" fill="#8C9196" fillOpacity="0.3" stroke="#8C9196" strokeWidth="1.5"/>
                            <rect x="52" y="56" width="9" height="2" rx="1" fill="#8C9196" fillOpacity="0.6"/>
                            <rect x="52" y="50" width="14" height="14" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                            <rect x="67" y="56" width="10" height="2" rx="1" fill="#8C9196" fillOpacity="0.6"/>
                            <rect x="15" y="72" width="17" height="17" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                            <rect x="35" y="72" width="17" height="17" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                            <rect x="55" y="72" width="17" height="17" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                            <path d="M43 72L43 66L47 66L47 72" stroke="#8C9196" strokeWidth="1.5" strokeOpacity="0.6" fill="none" markerEnd="url(#arrowhead)"/>
                            <defs>
                              <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                                <polygon points="0 0, 6 3, 0 6" fill="#8C9196" fillOpacity="0.6" />
                              </marker>
                            </defs>
                          </svg>
                        </Box>
                        <Box>
                          <Text variant="bodyLg" fontWeight="semibold">Selection</Text>
                          <Text variant="bodySm" tone="subdued">Display products with drag-and-drop selection</Text>
                        </Box>
                      </InlineStack>
                    }
                    checked={formData.layoutType === 'selection'}
                    id="layout-selection-edit"
                    onChange={() => setFormData(prev => ({ ...prev, layoutType: 'selection' }))}
                />

                {/* Stepper Layout Option */}
                <RadioButton
                    label={
                      <InlineStack gap="300" blockAlign="center">
                          <Box width="100px" height="40px" style={{ flexShrink: 0 }}>
                            <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                            {/* Progress bar at top */}
                            <rect x="12" y="12" width="76" height="3" rx="1.5" fill="#8C9196" fillOpacity="0.2"/>
                            <rect x="12" y="12" width="30" height="3" rx="1.5" fill="#00AA5E" fillOpacity="0.8"/>

                            {/* Step indicators */}
                            <circle cx="20" cy="13.5" r="6" fill="#00AA5E" stroke="#FFFFFF" strokeWidth="1.5"/>
                            <text x="20" y="17" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="Arial">1</text>

                            <circle cx="50" cy="13.5" r="6" fill="#8C9196" fillOpacity="0.8" stroke="#FFFFFF" strokeWidth="1.5"/>
                            <text x="50" y="17" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="Arial">2</text>

                            <circle cx="80" cy="13.5" r="6" fill="#8C9196" fillOpacity="0.3" stroke="#FFFFFF" strokeWidth="1.5"/>
                            <text x="80" y="17" textAnchor="middle" fill="#8C9196" fontSize="8" fontWeight="bold" fontFamily="Arial">3</text>

                            {/* Current step content */}
                            <rect x="18" y="28" width="64" height="32" rx="3" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1"/>
                            <text x="50" y="36" textAnchor="middle" fill="#8C9196" fontSize="7" fontFamily="Arial">Step 1: Choose Base</text>

                            {/* Products in current step */}
                            <rect x="26" y="42" width="14" height="14" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                            <rect x="43" y="42" width="14" height="14" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                            <rect x="60" y="42" width="14" height="14" rx="2" fill="#8C9196" fillOpacity="0.3"/>

                            {/* Navigation buttons */}
                            <rect x="23" y="65" width="25" height="15" rx="2.5" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                            <text x="35.5" y="74" textAnchor="middle" fill="#8C9196" fontSize="7" fontFamily="Arial">Back</text>

                            <rect x="52" y="65" width="25" height="15" rx="2.5" fill="#00AA5E" fillOpacity="0.8"/>
                            <text x="64.5" y="74" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold" fontFamily="Arial">Next</text>
                          </svg>
                        </Box>
                        <Box>
                          <Text variant="bodyLg" fontWeight="semibold">Stepper Layout</Text>
                          <Text variant="bodySm" tone="subdued">Guide customers through steps</Text>
                        </Box>
                      </InlineStack>
                    }
                    checked={formData.layoutType === 'stepper'}
                    id="layout-stepper-edit"
                    onChange={() => setFormData(prev => ({ ...prev, layoutType: 'stepper' }))}
                />
              </BlockStack>
              </Box>

              {/* Column settings for edit page */}
              {['stepper'].includes(formData.layoutType) && (
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
                          onChange={(value) => setFormData(prev => ({ ...prev, mobileColumns: parseInt(value) }))}
                          helpText="Number of columns on mobile devices"
                        />
                        <Select
                          label="Desktop columns"
                          options={desktopColumnOptions}
                          value={formData.desktopColumns.toString()}
                          onChange={(value) => setFormData(prev => ({ ...prev, desktopColumns: parseInt(value) }))}
                          helpText="Number of columns on desktop"
                        />
                      </FormLayout.Group>
                    </FormLayout>
                  </Box>
                </Box>
              )}

              {/* Modal-specific settings for edit page */}
              {formData.layoutType === 'modal' && (
                <Box>
                  <Divider />
                  <Box paddingBlockStart="400">
                    <FormLayout>
                      <Text variant="headingSm" as="h4" fontWeight="semibold">
                        Modal settings
                      </Text>
                      <FormLayout.Group>
                        <Select
                          label="Trigger type"
                          options={[
                            { label: "Button", value: "button" },
                            { label: "Auto open", value: "auto" },
                            { label: "Exit intent", value: "exit" },
                          ]}
                          value={formData.modalSettings?.triggerType || "button"}
                          onChange={(value) => setFormData({
                            ...formData,
                            modalSettings: { ...formData.modalSettings, triggerType: value as any }
                          })}
                        />
                        <Select
                          label="Modal behavior"
                          options={[
                            { label: "Close on overlay click", value: "closeOnOverlay" },
                            { label: "Stay open", value: "stayOpen" },
                          ]}
                          value={formData.modalSettings?.modalBehavior || "closeOnOverlay"}
                          onChange={(value) => setFormData({
                            ...formData,
                            modalSettings: { ...formData.modalSettings, modalBehavior: value as any }
                          })}
                        />
                      </FormLayout.Group>
                      <FormLayout>
                        <Checkbox
                          label="Block page scroll when open"
                          checked={formData.modalSettings?.blockPageScroll !== false}
                          onChange={(checked) => setFormData({
                            ...formData,
                            modalSettings: { ...formData.modalSettings, blockPageScroll: checked }
                          })}
                        />
                        <RadioButton
                          label="Fixed size (800px × 600px)"
                          checked={formData.modalSettings?.modalSize === "fixed"}
                          id="modal-size-fixed"
                          onChange={() => setFormData({
                            ...formData,
                            modalSettings: { ...formData.modalSettings, modalSize: "fixed" }
                          })}
                        />
                        <RadioButton
                          label="Responsive (90% viewport)"
                          checked={formData.modalSettings?.modalSize === "responsive"}
                          id="modal-size-responsive"
                          onChange={() => setFormData({
                            ...formData,
                            modalSettings: { ...formData.modalSettings, modalSize: "responsive" }
                          })}
                        />
                      </FormLayout>
                    </FormLayout>
                  </Box>
                </Box>
              )}

              {/* Selection-specific settings for edit page */}
              {formData.layoutType === 'selection' && (
                <Box>
                  <Divider />
                  <Box paddingBlockStart="400">
                    <BlockStack gap="400">
                      <Text variant="headingSm" as="h4" fontWeight="semibold">
                        Selection box settings
                      </Text>
                      <FormLayout>
                        <FormLayout.Group>
                          <Select
                            label="Selection mode"
                            options={[
                              { label: "Click to select", value: "click" },
                              { label: "Drag and drop", value: "drag" },
                              { label: "Both", value: "both" },
                            ]}
                            value={formData.selectionSettings?.selectionMode || "both"}
                            onChange={(value) => setFormData({
                              ...formData,
                              selectionSettings: { ...formData.selectionSettings, selectionMode: value as any }
                            })}
                          />
                          <Select
                            label="Empty slot behavior"
                            options={[
                              { label: "Show placeholder", value: "show" },
                              { label: "Hide empty slots", value: "hide" },
                              { label: "Collapse slots", value: "collapse" },
                            ]}
                            value={formData.selectionSettings?.emptySlotBehavior || "show"}
                            onChange={(value) => setFormData({
                              ...formData,
                              selectionSettings: { ...formData.selectionSettings, emptySlotBehavior: value as any }
                            })}
                          />
                        </FormLayout.Group>
                        <Select
                          label="Progress tracking"
                          options={[
                            { label: "Progress bar", value: "bar" },
                            { label: "Step counter", value: "counter" },
                            { label: "Both", value: "both" },
                            { label: "None", value: "none" },
                          ]}
                          value={formData.selectionSettings?.progressTracking || "counter"}
                          onChange={(value) => setFormData({
                            ...formData,
                            selectionSettings: { ...formData.selectionSettings, progressTracking: value as any }
                          })}
                          helpText="How to show bundle completion progress"
                        />
                      </FormLayout>
                    </BlockStack>
                  </Box>
                </Box>
              )}

              {/* Stepper-specific settings for edit page */}
              {formData.layoutType === 'stepper' && (
                <Box>
                  <Divider />
                  <Box paddingBlockStart="400">
                    <BlockStack gap="400">
                      <Text variant="headingSm" as="h4" fontWeight="semibold">
                        Stepper settings
                      </Text>
                      <FormLayout>
                        <FormLayout.Group>
                          <Select
                            label="Navigation type"
                            options={[
                              { label: "Linear (must complete in order)", value: "linear" },
                              { label: "Non-linear (can jump between steps)", value: "non-linear" },
                            ]}
                            value={formData.stepperSettings?.navigationMode || "linear"}
                            onChange={(value) => setFormData({
                              ...formData,
                              stepperSettings: { ...formData.stepperSettings, navigationMode: value as any }
                            })}
                            helpText="How users navigate between steps"
                          />
                          <Checkbox
                            label="Allow step review"
                            checked={formData.stepperSettings?.allowStepReview ?? true}
                            onChange={(checked) => setFormData({
                              ...formData,
                              stepperSettings: { ...formData.stepperSettings, allowStepReview: checked }
                            })}
                            helpText="Allow users to go back and review previous steps"
                          />
                        </FormLayout.Group>
                        <FormLayout.Group>
                          <Checkbox
                            label="Show progress bar"
                            checked={formData.stepperSettings?.showProgressBar ?? true}
                            onChange={(checked) => setFormData({
                              ...formData,
                              stepperSettings: { ...formData.stepperSettings, showProgressBar: checked }
                            })}
                          />
                          <Checkbox
                            label="Show step numbers"
                            checked={formData.stepperSettings?.showStepNumbers ?? true}
                            onChange={(checked) => setFormData({
                              ...formData,
                              stepperSettings: { ...formData.stepperSettings, showStepNumbers: checked }
                            })}
                          />
                        </FormLayout.Group>
                        <TextField
                          label="Completion message"
                          value={formData.stepperSettings?.completionMessage || "Your bundle is complete!"}
                          onChange={(value) => setFormData({
                            ...formData,
                            stepperSettings: { ...formData.stepperSettings, completionMessage: value }
                          })}
                          helpText="Message shown when all steps are completed"
                          autoComplete="off"
                        />
                      </FormLayout>
                    </BlockStack>
                  </Box>
                </Box>
              )}
            </BlockStack>
          </Card>
        ) : (
          // Create page - Original visual layout chooser
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
              <Box width="100%">
              <Grid columns={{ xs: 2, sm: 2, md: 4, lg: 4 }} gap="200">
                {/* Basic Layout Card */}
                <Box>
                  <div
                    onClick={() => setFormData({ ...formData, layoutType: 'basic' })}
                    style={{
                      cursor: 'pointer',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <Card
                      background={formData.layoutType === 'basic' ? 'bg-surface-selected' : 'bg-surface'}
                      padding="300"
                      style={{
                        border: formData.layoutType === 'basic' ? '2px solid var(--p-color-border-emphasis)' : '1px solid var(--p-color-border)',
                        transition: 'all 0.15s ease',
                        height: '100%'
                      }}
                    >
                      <BlockStack gap="300" inlineAlign="center">
                        <Box width="60px" height="60px">
                          <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Left side - image placeholder */}
                            <rect x="10" y="20" width="35" height="60" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1.5"/>
                            <rect x="15" y="25" width="25" height="35" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                            <rect x="15" y="65" width="25" height="3" rx="1.5" fill="#8C9196" fillOpacity="0.5"/>
                            <rect x="15" y="71" width="18" height="2" rx="1" fill="#8C9196" fillOpacity="0.4"/>
                            
                            {/* Right side - bundle products */}
                            <rect x="52" y="20" width="38" height="60" rx="3" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1.2" strokeDasharray="3 2"/>
                            
                            {/* Product items */}
                            <rect x="57" y="25" width="28" height="8" rx="1.5" fill="#8C9196" fillOpacity="0.3"/>
                            <rect x="57" y="36" width="28" height="8" rx="1.5" fill="#8C9196" fillOpacity="0.3"/>
                            <rect x="57" y="47" width="28" height="8" rx="1.5" fill="#8C9196" fillOpacity="0.3"/>
                            
                            {/* Add to cart button */}
                            <rect x="57" y="65" width="28" height="10" rx="2" fill="#00AA5E" fillOpacity="0.8"/>
                            <text x="71" y="72" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="bold" fontFamily="Arial">Add</text>
                          </svg>
                        </Box>
                        <Text variant="bodyMd" fontWeight="medium" alignment="center">
                          Basic
                        </Text>
                        {formData.layoutType === 'basic' && (
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
                      padding="300"
                      style={{
                        border: formData.layoutType === 'modal' ? '2px solid var(--p-color-border-emphasis)' : '1px solid var(--p-color-border)',
                        transition: 'all 0.15s ease',
                        height: '100%'
                      }}
                    >
                      <BlockStack gap="300" inlineAlign="center">
                        <Box width="60px" height="60px">
                          <svg width="60" height="60" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                        <Text variant="bodyMd" fontWeight="medium" alignment="center">
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

                {/* Selection Layout Card */}
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
                      padding="300"
                      style={{
                        border: formData.layoutType === 'selection' ? '2px solid var(--p-color-border-emphasis)' : '1px solid var(--p-color-border)',
                        transition: 'all 0.15s ease',
                        height: '100%'
                      }}
                    >
                      <BlockStack gap="300" inlineAlign="center">
                        <Box width="60px" height="60px">
                          <svg width="60" height="60" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                        <Text variant="bodyMd" fontWeight="medium" alignment="center">
                          Selection
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

                {/* Stepper Layout Card */}
                <Box>
                  <div
                    onClick={() => setFormData({ ...formData, layoutType: 'stepper' })}
                    style={{
                      cursor: 'pointer',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    <Card
                      background={formData.layoutType === 'stepper' ? 'bg-surface-selected' : 'bg-surface'}
                      padding="300"
                      style={{
                        border: formData.layoutType === 'stepper' ? '2px solid var(--p-color-border-emphasis)' : '1px solid var(--p-color-border)',
                        transition: 'all 0.15s ease',
                        height: '100%'
                      }}
                    >
                      <BlockStack gap="300" inlineAlign="center">
                        <Box width="60px" height="60px">
                          <svg width="60" height="60" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Progress bar at top */}
                            <rect x="10" y="10" width="80" height="4" rx="2" fill="#8C9196" fillOpacity="0.2"/>
                            <rect x="10" y="10" width="30" height="4" rx="2" fill="#00AA5E" fillOpacity="0.8"/>

                            {/* Step indicators */}
                            <circle cx="20" cy="12" r="8" fill="#00AA5E" stroke="#FFFFFF" strokeWidth="2"/>
                            <text x="20" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="Arial">1</text>

                            <circle cx="50" cy="12" r="8" fill="#8C9196" fillOpacity="0.8" stroke="#FFFFFF" strokeWidth="2"/>
                            <text x="50" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="Arial">2</text>

                            <circle cx="80" cy="12" r="8" fill="#8C9196" fillOpacity="0.3" stroke="#FFFFFF" strokeWidth="2"/>
                            <text x="80" y="16" textAnchor="middle" fill="#8C9196" fontSize="10" fontWeight="bold" fontFamily="Arial">3</text>

                            {/* Current step content */}
                            <rect x="15" y="28" width="70" height="40" rx="4" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1"/>
                            <text x="50" y="38" textAnchor="middle" fill="#8C9196" fontSize="8" fontFamily="Arial">Step 1: Choose Base</text>

                            {/* Products in current step */}
                            <rect x="22" y="45" width="18" height="18" rx="3" fill="#8C9196" fillOpacity="0.3"/>
                            <rect x="42" y="45" width="18" height="18" rx="3" fill="#8C9196" fillOpacity="0.3"/>
                            <rect x="62" y="45" width="18" height="18" rx="3" fill="#8C9196" fillOpacity="0.3"/>

                            {/* Navigation buttons */}
                            <rect x="20" y="72" width="30" height="18" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                            <text x="35" y="83" textAnchor="middle" fill="#8C9196" fontSize="8" fontFamily="Arial">Back</text>

                            <rect x="55" y="72" width="30" height="18" rx="3" fill="#00AA5E" fillOpacity="0.8"/>
                            <text x="70" y="83" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="Arial">Next</text>
                          </svg>
                        </Box>
                        <Text variant="bodyMd" fontWeight="medium" alignment="center">
                          Stepper
                        </Text>
                        {formData.layoutType === 'stepper' && (
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

            {/* Basic layout settings */}
            {formData.layoutType === 'basic' && (
              <Box>
                <Divider />
                <Box paddingBlockStart="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h4" fontWeight="semibold">
                      Basic Layout Settings
                    </Text>

                    <FormLayout>
                      <FormLayout.Group>
                        <Select
                          label="Image position"
                          options={[
                            { label: "Left", value: "left" },
                            { label: "Right", value: "right" },
                          ]}
                          value={formData.layoutSettings.basicSettings?.imagePosition || "left"}
                          onChange={(value) => setFormData({
                            ...formData,
                            layoutSettings: {
                              ...formData.layoutSettings,
                              basicSettings: {
                                ...formData.layoutSettings.basicSettings!,
                                imagePosition: value as "left" | "right"
                              }
                            }
                          })}
                          helpText="Position of the product image"
                        />

                        <Select
                          label="Image aspect ratio"
                          options={[
                            { label: "Square", value: "square" },
                            { label: "Portrait", value: "portrait" },
                            { label: "Landscape", value: "landscape" },
                          ]}
                          value={formData.layoutSettings.basicSettings?.imageAspectRatio || "square"}
                          onChange={(value) => setFormData({
                            ...formData,
                            layoutSettings: {
                              ...formData.layoutSettings,
                              basicSettings: {
                                ...formData.layoutSettings.basicSettings!,
                                imageAspectRatio: value as "square" | "portrait" | "landscape"
                              }
                            }
                          })}
                          helpText="Aspect ratio for product images"
                        />
                      </FormLayout.Group>

                      <FormLayout.Group>
                        <Select
                          label="Image behavior"
                          options={[
                            { label: "Zoom on hover", value: "zoom" },
                            { label: "Lightbox", value: "lightbox" },
                            { label: "None", value: "none" },
                          ]}
                          value={formData.layoutSettings.basicSettings?.imageBehavior || "zoom"}
                          onChange={(value) => setFormData({
                            ...formData,
                            layoutSettings: {
                              ...formData.layoutSettings,
                              basicSettings: {
                                ...formData.layoutSettings.basicSettings!,
                                imageBehavior: value as "zoom" | "lightbox" | "none"
                              }
                            }
                          })}
                          helpText="How images behave on interaction"
                        />

                        <Select
                          label="Image gallery type"
                          options={[
                            { label: "Thumbnails", value: "thumbnails" },
                            { label: "Dots", value: "dots" },
                            { label: "None", value: "none" },
                          ]}
                          value={formData.layoutSettings.basicSettings?.imageGalleryType || "thumbnails"}
                          onChange={(value) => setFormData({
                            ...formData,
                            layoutSettings: {
                              ...formData.layoutSettings,
                              basicSettings: {
                                ...formData.layoutSettings.basicSettings!,
                                imageGalleryType: value as "thumbnails" | "dots" | "none"
                              }
                            }
                          })}
                          helpText="Type of image gallery navigation"
                        />
                      </FormLayout.Group>

                      <FormLayout.Group>
                        <Select
                          label="Content width"
                          options={[
                            { label: "Narrow", value: "narrow" },
                            { label: "Medium", value: "medium" },
                            { label: "Wide", value: "wide" },
                          ]}
                          value={formData.layoutSettings.basicSettings?.contentWidth || "medium"}
                          onChange={(value) => setFormData({
                            ...formData,
                            layoutSettings: {
                              ...formData.layoutSettings,
                              basicSettings: {
                                ...formData.layoutSettings.basicSettings!,
                                contentWidth: value as "narrow" | "medium" | "wide"
                              }
                            }
                          })}
                          helpText="Width of the content container"
                        />

                        <Select
                          label="Mobile layout"
                          options={[
                            { label: "Stacked", value: "stacked" },
                            { label: "Horizontal scroll", value: "horizontal" },
                          ]}
                          value={formData.layoutSettings.basicSettings?.mobileLayout || "stacked"}
                          onChange={(value) => setFormData({
                            ...formData,
                            layoutSettings: {
                              ...formData.layoutSettings,
                              basicSettings: {
                                ...formData.layoutSettings.basicSettings!,
                                mobileLayout: value as "stacked" | "horizontal"
                              }
                            }
                          })}
                          helpText="Layout on mobile devices"
                        />
                      </FormLayout.Group>

                      <Checkbox
                        label="Show progress bar"
                        helpText="Display a progress bar for bundle completion"
                        checked={formData.layoutSettings.basicSettings?.showProgressBar || true}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            basicSettings: {
                              ...formData.layoutSettings.basicSettings!,
                              showProgressBar: value
                            }
                          }
                        })}
                      />

                      <Select
                        label="Step transition"
                        options={[
                          { label: "Slide", value: "slide" },
                          { label: "Fade", value: "fade" },
                          { label: "None", value: "none" },
                        ]}
                        value={formData.layoutSettings.basicSettings?.stepTransition || "slide"}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            basicSettings: {
                              ...formData.layoutSettings.basicSettings!,
                              stepTransition: value as "slide" | "fade" | "none"
                            }
                          }
                        })}
                        helpText="Animation between bundle steps"
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

            {/* Selection settings */}
            {formData.layoutType === 'selection' && (
              <Box>
                <Divider />
                <Box paddingBlockStart="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h4" fontWeight="semibold">
                      Selection Settings
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

            {/* Stepper-specific settings */}
            {formData.layoutType === 'stepper' && (
              <Box>
                <Divider />
                <Box paddingBlockStart="400">
                  <BlockStack gap="400">
                    <Text variant="headingSm" as="h4" fontWeight="semibold">
                      Stepper Settings
                    </Text>

                    <FormLayout>
                      <Checkbox
                        label="Show progress bar"
                        helpText="Display a progress bar to show completion status"
                        checked={formData.layoutSettings.stepperSettings.showProgressBar}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            stepperSettings: {
                              ...formData.layoutSettings.stepperSettings,
                              showProgressBar: value
                            }
                          }
                        })}
                      />

                      {formData.layoutSettings.stepperSettings.showProgressBar && (
                        <BlockStack gap="200">
                          <Text variant="bodyMd" fontWeight="medium">Progress bar position</Text>
                          <BlockStack gap="200">
                            <RadioButton
                              label="Top"
                              helpText="Show progress bar at the top of the stepper"
                              checked={formData.layoutSettings.stepperSettings.progressBarPosition === 'top'}
                              id="progressBarTop"
                              name="progressBarPosition"
                              onChange={() => setFormData({
                                ...formData,
                                layoutSettings: {
                                  ...formData.layoutSettings,
                                  stepperSettings: {
                                    ...formData.layoutSettings.stepperSettings,
                                    progressBarPosition: 'top'
                                  }
                                }
                              })}
                            />
                            <RadioButton
                              label="Bottom"
                              helpText="Show progress bar at the bottom of the stepper"
                              checked={formData.layoutSettings.stepperSettings.progressBarPosition === 'bottom'}
                              id="progressBarBottom"
                              name="progressBarPosition"
                              onChange={() => setFormData({
                                ...formData,
                                layoutSettings: {
                                  ...formData.layoutSettings,
                                  stepperSettings: {
                                    ...formData.layoutSettings.stepperSettings,
                                    progressBarPosition: 'bottom'
                                  }
                                }
                              })}
                            />
                          </BlockStack>
                        </BlockStack>
                      )}

                      <Checkbox
                        label="Allow back navigation"
                        helpText="Let customers go back to previous steps"
                        checked={formData.layoutSettings.stepperSettings.allowBackNavigation}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            stepperSettings: {
                              ...formData.layoutSettings.stepperSettings,
                              allowBackNavigation: value
                            }
                          }
                        })}
                      />

                      <Checkbox
                        label="Show step numbers"
                        helpText="Display step numbers in the progress indicator"
                        checked={formData.layoutSettings.stepperSettings.showStepNumbers}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            stepperSettings: {
                              ...formData.layoutSettings.stepperSettings,
                              showStepNumbers: value
                            }
                          }
                        })}
                      />

                      <Select
                        label="Completion behavior"
                        options={[
                          { label: "Summary", value: "summary" },
                          { label: "Auto-add to cart", value: "auto-add" },
                          { label: "Redirect to cart", value: "redirect" },
                        ]}
                        value={formData.layoutSettings.stepperSettings.completionBehavior}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            stepperSettings: {
                              ...formData.layoutSettings.stepperSettings,
                              completionBehavior: value as "summary" | "auto-add" | "redirect"
                            }
                          }
                        })}
                        helpText="What happens when all steps are completed"
                      />

                      <Select
                        label="Animation style"
                        options={[
                          { label: "Slide", value: "slide" },
                          { label: "Fade", value: "fade" },
                          { label: "None", value: "none" },
                        ]}
                        value={formData.layoutSettings.stepperSettings.animationStyle}
                        onChange={(value) => setFormData({
                          ...formData,
                          layoutSettings: {
                            ...formData.layoutSettings,
                            stepperSettings: {
                              ...formData.layoutSettings.stepperSettings,
                              animationStyle: value as "slide" | "fade" | "none"
                            }
                          }
                        })}
                        helpText="Transition effect between steps"
                      />
                    </FormLayout>
                  </BlockStack>
                </Box>
              </Box>
            )}
                      </BlockStack>
                    </Card>
                  )}
                </BlockStack>
              </Box>
            )}

            {/* Bundle Steps Tab */}
            {selectedTab === 2 && (
              <Box paddingBlockStart="400">
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

            {/* Show attention banner if discount is filled but steps are not */}
            {getNextRequiredField.field === 'steps' && formData.discountValue && parseFloat(formData.discountValue) > 0 && (
              <Banner status="attention">
                <p>Great! Now add at least one bundle step with products to complete your bundle configuration.</p>
              </Banner>
            )}

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
                          content: `Details & Products${(step.title.trim() && step.products.length === 0) ? ' ⚠️' : ''}`,
                        },
                        {
                          id: 'rules',
                          content: 'Rules',
                        },
                        ...(['basic', 'modal'].includes(formData.layoutType) ? [{
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
                                onChange={(value) => updateStep(index, { title: value })}
                                onBlur={() => markFieldTouched(`step_${index}_title`)}
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
                                      onBlur={() => markFieldTouched(`step_${index}_min`)}
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
                                      onBlur={() => markFieldTouched(`step_${index}_max`)}
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
                                <BlockStack gap="400" align="start">
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
                                        padding="300"
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
                                        padding="300"
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
              </Box>
            )}
          </Tabs>
        </Box>
      </BlockStack>

      {/* Product Picker Modal */}
      {showProductPicker && (
        <ProductPicker
          selectedProducts={steps.find((s) => s.id === showProductPicker)?.products.map(p => p.id) || []}
          onSelect={async (productIds) => {
            const stepIndex = steps.findIndex((s) => s.id === showProductPicker);
            if (stepIndex !== -1) {
              // Mark products field as touched
              markFieldTouched(`step_${stepIndex}_products`);

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
