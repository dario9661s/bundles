import {
  Card,
  BlockStack,
  Text,
  Badge,
  Box,
  InlineStack,
  Divider,
  Layout,
  Page,
  Button,
  Banner,
  Grid,
  Thumbnail,
  ResourceList,
  ResourceItem,
  EmptyState,
} from "@shopify/polaris";
import type { Bundle } from "~/types/bundle";
import { useCallback, useEffect, useState } from "react";

interface BundleDetailProps {
  bundle: Bundle;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

interface ProductDetails {
  id: string;
  title: string;
  featuredImage?: string;
  priceRange?: {
    min: string;
    max: string;
  };
}

export function BundleDetail({ bundle, onEdit, onDelete, onDuplicate }: BundleDetailProps) {
  const [productDetails, setProductDetails] = useState<Record<string, ProductDetails>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fetch product details for all products in the bundle
  useEffect(() => {
    const fetchProductDetails = async () => {
      const allProductIds = bundle.steps.flatMap(step => step.products.map(p => p.id));
      const uniqueProductIds = [...new Set(allProductIds)];
      
      if (uniqueProductIds.length === 0) {
        setLoadingProducts(false);
        return;
      }

      try {
        const response = await fetch(`/api/products/by-ids?ids=${uniqueProductIds.join(',')}`);
        if (response.ok) {
          const data = await response.json();
          const details: Record<string, ProductDetails> = {};
          data.products.forEach((product: any) => {
            details[product.id] = {
              id: product.id,
              title: product.title,
              featuredImage: product.featuredImage,
              priceRange: product.priceRange,
            };
          });
          setProductDetails(details);
        }
      } catch (error) {
        console.error('Failed to fetch product details:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProductDetails();
  }, [bundle.steps]);

  const getStatusBadge = () => {
    const statusMap = {
      active: { status: 'success' as const, label: 'Active' },
      inactive: { status: 'warning' as const, label: 'Inactive' },
      draft: { status: 'info' as const, label: 'Draft' },
    };
    
    const { status, label } = statusMap[bundle.status] || statusMap.draft;
    return <Badge status={status}>{label}</Badge>;
  };

  const getDiscountText = () => {
    switch (bundle.discountType) {
      case 'percentage':
        return `${bundle.discountValue}% off`;
      case 'fixed':
        return `$${bundle.discountValue} off`;
      case 'total':
        return `$${bundle.discountValue} total price`;
      default:
        return 'No discount';
    }
  };

  const getLayoutBadge = () => {
    const layoutMap = {
      grid: 'Grid Layout',
      slider: 'Slider Layout',
      modal: 'Modal Layout',
      selection: 'Selection Box',
    };
    return <Badge status="info">{layoutMap[bundle.layoutType] || bundle.layoutType}</Badge>;
  };

  return (
    <BlockStack gap="600">
      {/* Header Information */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between">
            <BlockStack gap="200">
              <Text variant="headingLg" as="h2">{bundle.title}</Text>
              <Text variant="bodySm" tone="subdued">Handle: {bundle.handle}</Text>
            </BlockStack>
            <InlineStack gap="200">
              {getStatusBadge()}
              {getLayoutBadge()}
            </InlineStack>
          </InlineStack>
          
          <Divider />
          
          <Grid>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Discount</Text>
                <Text variant="headingMd" as="h3">{getDiscountText()}</Text>
              </BlockStack>
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Total Steps</Text>
                <Text variant="headingMd" as="h3">{bundle.steps.length}</Text>
              </BlockStack>
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Created</Text>
                <Text variant="bodyMd">{new Date(bundle.createdAt).toLocaleDateString()}</Text>
              </BlockStack>
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Last Updated</Text>
                <Text variant="bodyMd">{new Date(bundle.updatedAt).toLocaleDateString()}</Text>
              </BlockStack>
            </Grid.Cell>
          </Grid>
        </BlockStack>
      </Card>

      {/* Bundle Structure */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">Bundle Structure</Text>
          <Text variant="bodySm" tone="subdued">
            This bundle contains {bundle.steps.length} step{bundle.steps.length !== 1 ? 's' : ''} for customers to complete
          </Text>
          
          {bundle.steps.map((step, stepIndex) => (
            <Box key={step.id} background="bg-surface-secondary" padding="400" borderRadius="200">
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <InlineStack gap="200" align="center">
                    <Box background="bg-surface" padding="200" borderRadius="100">
                      <Text variant="headingMd" fontWeight="bold">{stepIndex + 1}</Text>
                    </Box>
                    <BlockStack gap="100">
                      <Text variant="headingMd" as="h4">{step.title}</Text>
                      {step.description && (
                        <Text variant="bodySm" tone="subdued">{step.description}</Text>
                      )}
                    </BlockStack>
                  </InlineStack>
                  {step.required && <Badge status="info">Required</Badge>}
                </InlineStack>
                
                <Box paddingInlineStart="800">
                  <BlockStack gap="200">
                    <Text variant="bodySm" tone="subdued">
                      Selection requirements: {step.minSelections} - {step.maxSelections || 'unlimited'}
                    </Text>
                    
                    {step.products.length > 0 ? (
                      <Box>
                        <Text variant="bodySm" tone="subdued" fontWeight="semibold">
                          Products ({step.products.length}):
                        </Text>
                        <Box paddingBlockStart="200">
                          <InlineStack gap="300" wrap>
                            {step.products.map((product) => {
                              const details = productDetails[product.id];
                              return (
                                <Box key={product.id} width="120px">
                                  <BlockStack gap="100">
                                    <Thumbnail
                                      source={details?.featuredImage || "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"}
                                      size="large"
                                      alt={details?.title || "Product"}
                                    />
                                    <Text variant="bodySm" truncate>
                                      {details?.title || "Loading..."}
                                    </Text>
                                    {details?.priceRange && (
                                      <Text variant="bodySm" tone="subdued">
                                        ${details.priceRange.min}
                                        {details.priceRange.max !== details.priceRange.min && ` - $${details.priceRange.max}`}
                                      </Text>
                                    )}
                                  </BlockStack>
                                </Box>
                              );
                            })}
                          </InlineStack>
                        </Box>
                      </Box>
                    ) : (
                      <Text variant="bodySm" tone="subdued">No products added yet</Text>
                    )}
                  </BlockStack>
                </Box>
              </BlockStack>
            </Box>
          ))}
        </BlockStack>
      </Card>

      {/* Layout Settings */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">Layout Configuration</Text>
          <Grid>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Layout Type</Text>
                <Text variant="bodyMd" fontWeight="semibold">{bundle.layoutType}</Text>
              </BlockStack>
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Mobile Columns</Text>
                <Text variant="bodyMd">{bundle.mobileColumns}</Text>
              </BlockStack>
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Desktop Columns</Text>
                <Text variant="bodyMd">{bundle.desktopColumns}</Text>
              </BlockStack>
            </Grid.Cell>
          </Grid>
          
          {/* Display layout-specific settings if available */}
          {bundle.layoutSettings && (
            <>
              <Divider />
              <Text variant="headingSm" as="h4">Advanced Settings</Text>
              <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                <pre style={{ 
                  fontSize: '12px', 
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {JSON.stringify(bundle.layoutSettings, null, 2)}
                </pre>
              </Box>
            </>
          )}
        </BlockStack>
      </Card>

      {/* Analytics Placeholder */}
      <Card>
        <BlockStack gap="400">
          <Text variant="headingMd" as="h3">Bundle Analytics</Text>
          <Banner status="info">
            <p>Analytics features are coming soon! You'll be able to track bundle performance, conversion rates, and customer behavior.</p>
          </Banner>
          <EmptyState
            heading="Analytics Coming Soon"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Track your bundle's performance with detailed analytics including:</p>
            <ul style={{ textAlign: 'left', display: 'inline-block', marginTop: '12px' }}>
              <li>Conversion rates</li>
              <li>Average order value</li>
              <li>Most popular product combinations</li>
              <li>Customer engagement metrics</li>
            </ul>
          </EmptyState>
        </BlockStack>
      </Card>
      
      {/* Bottom padding */}
      <Box paddingBlockEnd="400" />
    </BlockStack>
  );
}