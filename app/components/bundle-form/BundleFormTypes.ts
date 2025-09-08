import type { Bundle, BundleStep, CreateBundleRequest, UpdateBundleRequest, LayoutSettings } from "~/types/bundle";

// Main form props interface
export interface BundleFormProps {
  bundle?: Bundle; // undefined for create, defined for edit
  onSubmit: (data: CreateBundleRequest | UpdateBundleRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  onFormStateChange?: (formState: BundleFormState) => void;
}

// Form state that gets passed to parent
export interface BundleFormState {
  title: string;
  status: Bundle['status'];
  layoutType: Bundle['layoutType'];
  discountType: Bundle['discountType'];
  discountValue: number;
  steps: FormStep[];
  isValid: boolean;
  validationErrors?: Record<string, string>;
  touched?: Record<string, boolean>;
}

// Extended step interface for form usage
export interface FormStep extends Omit<BundleStep, 'id'> {
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

// Form data structure
export interface BundleFormData {
  title: string;
  status: "active" | "draft" | "inactive";
  discountType: "percentage" | "fixed" | "total";
  discountValue: string;
  layoutType: "basic" | "modal" | "selection" | "stepper";
  mobileColumns: number;
  desktopColumns: number;
  layoutSettings: LayoutSettings;
}

// Component-specific props
export interface BundleDetailsFormProps {
  title: string;
  status: Bundle['status'];
  onDetailsChange: (details: Partial<Pick<BundleFormData, 'title' | 'status'>>) => void;
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
}

export interface BundleDiscountSettingsProps {
  discountType: Bundle['discountType'];
  discountValue: string;
  onDiscountChange: (discount: Partial<Pick<BundleFormData, 'discountType' | 'discountValue'>>) => void;
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
}

export interface BundleLayoutSettingsProps {
  layoutType: Bundle['layoutType'];
  layoutSettings: LayoutSettings;
  mobileColumns: number;
  desktopColumns: number;
  onLayoutSettingsChange: (settings: Partial<Pick<BundleFormData, 'layoutType' | 'layoutSettings' | 'mobileColumns' | 'desktopColumns'>>) => void;
}

export interface BundleStepManagerProps {
  steps: FormStep[];
  onStepsChange: (steps: FormStep[]) => void;
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
  layoutType: Bundle['layoutType'];
}

// Drag and drop state
export interface DragState {
  stepIndex: number;
  productIndex: number;
}

// Product picker state
export interface ProductPickerState {
  stepId: string | null;
  isOpen: boolean;
}

// Validation error types
export type ValidationErrors = Record<string, string>;
export type TouchedFields = Record<string, boolean>;