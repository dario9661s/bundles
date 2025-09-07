import {
  Card,
  BlockStack,
  Text,
  Box,
  InlineStack,
  Badge,
  Button,
} from "@shopify/polaris";
import type { Bundle } from "~/types/bundle";

interface FormStep {
  id: string;
  title: string;
  products: Array<{ id: string; position: number }>;
}

interface BundleSummaryProps {
  title: string;
  status: Bundle['status'];
  layoutType: Bundle['layoutType'];
  discountType: Bundle['discountType'];
  discountValue: number;
  steps: FormStep[];
  isValid: boolean;
  isEdit: boolean;
  isSubmitting?: boolean;
  onSubmit: () => void;
}

export function BundleSummary({
  title,
  status,
  layoutType,
  discountType,
  discountValue,
  steps,
  isValid,
  isEdit,
  isSubmitting = false,
  onSubmit,
}: BundleSummaryProps) {
  // Helper functions
  const getTotalProducts = () => {
    return steps.reduce((total, step) => total + step.products.length, 0);
  };

  const getStatusTone = (status: Bundle['status']) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'info';
      case 'inactive': return 'attention';
      default: return 'info';
    }
  };

  const getDiscountDisplay = () => {
    if (discountValue === 0) return 'No discount';
    
    switch (discountType) {
      case 'percentage':
        return `${discountValue}% off`;
      case 'fixed':
        return `$${discountValue} off`;
      case 'total':
        return `$${discountValue} fixed price`;
      default:
        return 'No discount';
    }
  };

  const renderMiniLayoutSVG = () => {
    const svgProps = {
      width: "60",
      height: "60",
      viewBox: "0 0 100 100",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    };

    switch (layoutType) {
      case 'grid':
        return (
          <svg {...svgProps}>
            <rect x="10" y="10" width="37" height="37" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1.5"/>
            <rect x="53" y="10" width="37" height="37" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1.5"/>
            <rect x="10" y="53" width="37" height="37" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1.5"/>
            <rect x="53" y="53" width="37" height="37" rx="4" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1.5"/>
            <rect x="16" y="16" width="25" height="18" rx="2" fill="#8C9196" fillOpacity="0.3"/>
            <rect x="59" y="16" width="25" height="18" rx="2" fill="#8C9196" fillOpacity="0.3"/>
            <rect x="16" y="59" width="25" height="18" rx="2" fill="#8C9196" fillOpacity="0.3"/>
            <rect x="59" y="59" width="25" height="18" rx="2" fill="#8C9196" fillOpacity="0.3"/>
          </svg>
        );
      
      case 'slider':
        return (
          <svg {...svgProps}>
            <path d="M15 50L24 41L24 59L15 50Z" fill="#8C9196" fillOpacity="0.5"/>
            <path d="M85 50L76 59L76 41L85 50Z" fill="#8C9196" fillOpacity="0.5"/>
            <rect x="30" y="20" width="40" height="50" rx="4" fill="#8C9196" fillOpacity="0.3" stroke="#8C9196" strokeWidth="2"/>
            <rect x="5" y="30" width="22" height="30" rx="3" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1"/>
            <rect x="73" y="30" width="22" height="30" rx="3" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1"/>
            <rect x="35" y="25" width="30" height="22" rx="2" fill="#8C9196" fillOpacity="0.4"/>
            <circle cx="40" cy="82" r="2.5" fill="#8C9196" fillOpacity="0.3"/>
            <circle cx="50" cy="82" r="3" fill="#8C9196" fillOpacity="0.8"/>
            <circle cx="60" cy="82" r="2.5" fill="#8C9196" fillOpacity="0.3"/>
          </svg>
        );
      
      case 'modal':
        return (
          <svg {...svgProps}>
            <rect x="15" y="10" width="70" height="80" rx="4" fill="#E3E5E7" fillOpacity="0.6" stroke="#8C9196" strokeOpacity="0.3" strokeWidth="1.5"/>
            <rect x="25" y="20" width="50" height="60" rx="4" fill="#FAFBFB" stroke="#8C9196" strokeWidth="2"/>
            <line x1="25" y1="35" x2="75" y2="35" stroke="#8C9196" strokeWidth="1.5" strokeOpacity="0.5"/>
            <rect x="65" y="24" width="6" height="6" rx="1" fill="#8C9196" fillOpacity="0.8"/>
            <rect x="33" y="44" width="34" height="20" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
            <rect x="52" y="68" width="15" height="3" rx="1.5" fill="#00AA5E" fillOpacity="0.8"/>
          </svg>
        );
      
      case 'selection':
        return (
          <svg {...svgProps}>
            <rect x="20" y="10" width="60" height="35" rx="4" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1.5" strokeDasharray="3 3"/>
            <text x="50" y="30" textAnchor="middle" fill="#8C9196" fontSize="10" fontFamily="Arial">Drop</text>
            <rect x="35" y="50" width="14" height="14" rx="3" fill="#8C9196" fillOpacity="0.3" stroke="#8C9196" strokeWidth="1.5"/>
            <rect x="52" y="50" width="14" height="14" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
            <rect x="15" y="72" width="17" height="17" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
            <rect x="35" y="72" width="17" height="17" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
            <rect x="55" y="72" width="17" height="17" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
            <path d="M43 72L43 66L47 66L47 72" stroke="#8C9196" strokeWidth="1.5" strokeOpacity="0.6" fill="none"/>
          </svg>
        );
      
      default:
        return (
          <svg {...svgProps}>
            <rect x="20" y="20" width="60" height="60" rx="8" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="2"/>
            <text x="50" y="55" textAnchor="middle" fill="#8C9196" fontSize="12" fontFamily="Arial">?</text>
          </svg>
        );
    }
  };

  const formatLayoutType = () => {
    switch (layoutType) {
      case 'grid': return 'Grid';
      case 'slider': return 'Slider';
      case 'modal': return 'Modal';
      case 'selection': return 'Selection Box';
      default: return 'Unknown';
    }
  };

  const totalProducts = getTotalProducts();

  return (
    <Box 
      position="sticky" 
      style={{ 
        position: 'sticky', 
        top: '20px',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto'
      }}
    >
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">Bundle Preview</Text>

          {/* Bundle Title */}
          <Box>
            <Text variant="headingSm" as="h4" truncate>
              {title || "Untitled Bundle"}
            </Text>
          </Box>

          {/* Layout Visual */}
          <Box>
            <BlockStack gap="200" inlineAlign="center">
              <Box width="60px" height="60px">
                {renderMiniLayoutSVG()}
              </Box>
              <Text variant="bodySm" alignment="center" tone="subdued">
                {formatLayoutType()} Layout
              </Text>
            </BlockStack>
          </Box>

          {/* Steps & Products Visual */}
          <Box>
            <BlockStack gap="200">
              <Text variant="bodySm" tone="subdued">Steps & Products</Text>
              
              {steps.length > 0 ? (
                <>
                  <InlineStack gap="100" wrap={false}>
                    {steps.slice(0, 6).map((step, index) => (
                      <Box 
                        key={step.id}
                        minWidth="32px" 
                        minHeight="32px" 
                        background={step.products.length > 0 ? "bg-fill-info" : "bg-fill-subdued"}
                        borderRadius="200"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text variant="captionMd" alignment="center" tone="base">
                          {step.products.length}
                        </Text>
                      </Box>
                    ))}
                    {steps.length > 6 && (
                      <Box 
                        minWidth="32px" 
                        minHeight="32px" 
                        background="bg-fill-subdued"
                        borderRadius="200"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text variant="captionMd" alignment="center" tone="subdued">
                          +{steps.length - 6}
                        </Text>
                      </Box>
                    )}
                  </InlineStack>
                  
                  <Text variant="caption" tone="subdued">
                    {steps.length} step{steps.length === 1 ? '' : 's'} • {totalProducts} product{totalProducts === 1 ? '' : 's'}
                  </Text>
                </>
              ) : (
                <Text variant="bodySm" tone="subdued">No steps configured yet</Text>
              )}
            </BlockStack>
          </Box>

          {/* Status & Discount */}
          <InlineStack gap="200" align="space-between">
            <Badge tone={getStatusTone(status)}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            <Text variant="bodySm" fontWeight="semibold">
              {getDiscountDisplay()}
            </Text>
          </InlineStack>

          {/* CTA Button */}
          <Button 
            variant="primary" 
            size="large" 
            fullWidth 
            disabled={!isValid || isSubmitting} 
            loading={isSubmitting}
            onClick={onSubmit}
          >
            {isEdit ? "Update Bundle" : "Create Bundle"}
          </Button>

          {!isValid && (
            <Text variant="bodySm" tone="critical" alignment="center">
              Complete required fields to save
            </Text>
          )}
        </BlockStack>
      </Card>
    </Box>
  );
}