import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import "./BundleForm.css";
import {
  Form,
  BlockStack,
  Box,
  Banner,
  Tabs,
} from "@shopify/polaris";
import type { CreateBundleRequest, UpdateBundleRequest, LayoutSettings } from "~/types/bundle";
import type { BundleFormProps, BundleFormData, FormStep, ValidationErrors, TouchedFields } from "./bundle-form/BundleFormTypes";
import { BundleDetailsForm } from "./bundle-form/BundleDetailsForm";
import { BundleDiscountSettings } from "./bundle-form/BundleDiscountSettings";
import { BundleLayoutSettings } from "./bundle-form/BundleLayoutSettings";
import { BundleStepManager } from "./bundle-form/BundleStepManager";
import { CombinationImagesTab } from "./bundle-form/CombinationImagesTab";
import { 
  validateBundleForm, 
  filterErrorsByTouched, 
  createSubmitTouchedState 
} from "./bundle-form/BundleFormValidation";

export function BundleForm({ 
  bundle, 
  onSubmit, 
  onCancel, 
  isSubmitting = false, 
  onFormStateChange 
}: BundleFormProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingCombinations, setPendingCombinations] = useState<Array<{
    productIds: string[];
    imageBase64: string;
    title?: string;
  }>>([]);
  
  // Form data state
  const [formData, setFormData] = useState<BundleFormData>({
    title: bundle?.title || "",
    status: bundle?.status || "draft",
    discountType: bundle?.discountType || "percentage",
    discountValue: bundle?.discountValue?.toString() || "",
    layoutType: bundle?.layoutType || "basic",
    mobileColumns: bundle?.mobileColumns || 2,
    desktopColumns: bundle?.desktopColumns || 4,
    layoutSettings: bundle?.layoutSettings || {
      basicSettings: {
        imagePosition: "left",
        imageAspectRatio: "square",
        imageBehavior: "zoom",
        imageGalleryType: "thumbnails",
        contentWidth: "medium",
        mobileLayout: "stacked",
        showProgressBar: true,
        stepTransition: "slide",
      },
      gridSettings: {
        productsPerRow: {
          mobile: 2,
          tablet: 3,
          desktop: 4,
        },
        enableQuickAdd: true,
        imagePosition: "top",
      },
      sliderSettings: {
        slidesToShow: {
          mobile: 1,
          tablet: 2,
          desktop: 4,
        },
        slidesToScroll: 1,
        infiniteLoop: true,
        autoplay: false,
        autoplaySpeed: 5000,
        enableThumbnails: false,
      },
      modalSettings: {
        triggerType: "button",
        modalBehavior: "stayOpen",
        blockPageScroll: true,
        modalSize: "fixed",
      },
      selectionSettings: {
        selectionMode: "click",
        emptySlotBehavior: "show",
        progressTracking: "counter",
        selectionLimit: 10,
      },
      stepperSettings: {
        showProgressBar: true,
        progressBarPosition: "top",
        allowBackNavigation: true,
        completionBehavior: "summary",
        showStepNumbers: true,
        animationStyle: "slide",
      },
    },
  });

  // Steps state
  const [steps, setSteps] = useState<FormStep[]>(() => {
    if (bundle?.steps) {
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
          selectionType: 'product' as const, // Default to product selection
          products: [],
          displayType: 'grid',
          mobileColumns: 2,
          desktopColumns: 4,
        },
      ];
    }
  });

  // Validation state
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});

  // Mark field as touched
  const markFieldTouched = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  // Validate form
  const validateForm = useCallback((showAllErrors: boolean = false): boolean => {
    const allErrors = validateBundleForm(formData, steps);
    
    if (showAllErrors) {
      setErrors(allErrors);
    } else {
      setErrors(filterErrorsByTouched(allErrors, touched));
    }
    
    return Object.keys(allErrors).length === 0;
  }, [formData, steps, touched]);

  // Get all validation errors (for parent component)
  const getAllValidationErrors = useCallback(() => {
    return validateBundleForm(formData, steps);
  }, [formData, steps]);

  // Notify parent component of form state changes with debounce
  useEffect(() => {
    if (onFormStateChange) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

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

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, steps, onFormStateChange, getAllValidationErrors, touched]);

  // Smart field highlighting: determine which fields/tabs need attention
  const getNextRequiredField = useMemo(() => {
    if (!formData.title.trim()) {
      return { field: 'title', tab: null };
    }

    const discountNum = parseFloat(formData.discountValue);
    if (!formData.discountValue || isNaN(discountNum) || discountNum <= 0) {
      return { field: 'discountValue', tab: 0 };
    }

    const hasValidStep = steps.some(step =>
      step.title.trim() && step.products.length > 0
    );

    if (!hasValidStep) {
      return { field: 'steps', tab: 2 };
    }

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

  // Validate on changes
  useEffect(() => {
    validateForm();
  }, [formData, steps, validateForm]);

  // Form submission
  const handleSubmit = useCallback(async () => {
    const allTouched = createSubmitTouchedState(steps);
    setTouched(allTouched);

    if (!validateForm(true)) {
      console.log("Validation failed");
      return;
    }

    // Only include the relevant layoutSettings based on layoutType
    const layoutSettings: LayoutSettings = {};
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
      discountType: formData.discountType,
      discountValue: parseFloat(formData.discountValue),
      layoutType: formData.layoutType,
      mobileColumns: formData.mobileColumns,
      desktopColumns: formData.desktopColumns,
      layoutSettings,
      steps: steps.map((step, index) => ({
        title: step.title,
        description: step.description || undefined,
        position: index + 1,
        minSelections: step.minSelections,
        maxSelections: step.maxSelections || undefined,
        required: step.required,
        selectionType: step.selectionType || 'product', // Include selectionType
        products: step.products.map(product => ({
          id: product.id,
          position: product.position,
          variantId: product.variantId, // Include variantId when present
        })),
      })),
    };
    
    // Include combinations if creating a new bundle
    if (!bundle && pendingCombinations.length > 0) {
      data.combinations = pendingCombinations;
    }

    console.log("Submitting data:", data);
    await onSubmit(data);
  }, [formData, steps, validateForm, onSubmit, bundle, pendingCombinations]);

  // Update handlers
  const handleDetailsChange = useCallback((details: Partial<Pick<BundleFormData, 'title' | 'status'>>) => {
    setFormData(prev => ({ ...prev, ...details }));
    if (details.title !== undefined) {
      markFieldTouched('title');
    }
  }, [markFieldTouched]);

  const handleDiscountChange = useCallback((discount: Partial<Pick<BundleFormData, 'discountType' | 'discountValue'>>) => {
    setFormData(prev => ({ ...prev, ...discount }));
    if (discount.discountValue !== undefined) {
      markFieldTouched('discountValue');
    }
  }, [markFieldTouched]);

  const handleLayoutSettingsChange = useCallback((settings: Partial<Pick<BundleFormData, 'layoutType' | 'layoutSettings' | 'mobileColumns' | 'desktopColumns'>>) => {
    setFormData(prev => ({ ...prev, ...settings }));
  }, []);

  const handleStepsChange = useCallback((newSteps: FormStep[]) => {
    setSteps(newSteps);
    // Mark step fields as touched when they change
    newSteps.forEach((step, index) => {
      if (step.title || step.products.length > 0) {
        markFieldTouched(`step_${index}_title`);
        markFieldTouched(`step_${index}_min`);
        markFieldTouched(`step_${index}_max`);
        markFieldTouched(`step_${index}_products`);
      }
    });
  }, [markFieldTouched]);

  // Tab configuration
  const tabs = [
    {
      id: "pricing",
      content: `Pricing${shouldHighlightTab(0) && getNextRequiredField.field === 'discountValue' ? ' ⚠️' : ''}`,
      panelID: "pricing-panel",
    },
    {
      id: "layout",
      content: "Layout",
      panelID: "layout-panel",
    },
    {
      id: "bundle-steps",
      content: `Bundle Steps (${steps.length})${shouldHighlightTab(2) && getNextRequiredField.field === 'steps' ? ' ⚠️' : ''}`,
      panelID: "bundle-steps-panel",
    },
    {
      id: "combination-images",
      content: "Combination Images",
      panelID: "combination-images-panel",
    },
  ];

  return (
    <Form onSubmit={handleSubmit}>
      <BlockStack gap="400">
        {/* Attention banner */}
        {getNextRequiredField.field && (
          <Banner tone="warning">
            <p>
              {getNextRequiredField.field === 'title' && "Start by giving your bundle a title"}
              {getNextRequiredField.field === 'discountValue' && "Next, set the discount value in the Pricing tab"}
              {getNextRequiredField.field === 'steps' && "Finally, add bundle steps with products in the Bundle Steps tab"}
            </p>
          </Banner>
        )}

        {/* Basic Information */}
        <BundleDetailsForm
          title={formData.title}
          status={formData.status}
          onDetailsChange={handleDetailsChange}
          errors={errors}
          touched={touched}
        />

        {/* Tabbed Content */}
        <Box>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            {/* Pricing Tab */}
            {selectedTab === 0 && (
              <Box paddingBlockStart="400">
                <BundleDiscountSettings
                  discountType={formData.discountType}
                  discountValue={formData.discountValue}
                  onDiscountChange={handleDiscountChange}
                  errors={errors}
                  touched={touched}
                />
              </Box>
            )}

            {/* Layout Configuration Tab */}
            {selectedTab === 1 && (
              <Box paddingBlockStart="400">
                <BundleLayoutSettings
                  layoutType={formData.layoutType}
                  layoutSettings={formData.layoutSettings}
                  mobileColumns={formData.mobileColumns}
                  desktopColumns={formData.desktopColumns}
                  onLayoutSettingsChange={handleLayoutSettingsChange}
                />
              </Box>
            )}

            {/* Bundle Steps Tab */}
            {selectedTab === 2 && (
              <Box paddingBlockStart="400">
                <BundleStepManager
                  steps={steps}
                  onStepsChange={handleStepsChange}
                  errors={errors}
                  touched={touched}
                  layoutType={formData.layoutType}
                />
              </Box>
            )}

            {/* Combination Images Tab */}
            {selectedTab === 3 && (
              <Box paddingBlockStart="400">
                <CombinationImagesTab
                  bundleId={bundle?.id || ""}
                  steps={steps}
                  layoutType={formData.layoutType}
                  onCombinationsChange={setPendingCombinations}
                />
              </Box>
            )}
          </Tabs>
        </Box>
      </BlockStack>
    </Form>
  );
}