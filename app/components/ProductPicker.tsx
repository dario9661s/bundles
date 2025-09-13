import { useState, useCallback, useEffect } from "react";
import {
  Modal,
  TextField,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Text,
  BlockStack,
  Box,
  Spinner,
  EmptyState,
  Filters,
  ChoiceList,
  Tag,
  InlineStack,
  Button,
  Checkbox,
  Collapsible,
  Badge,
  Divider,
} from "@shopify/polaris";
import { SearchIcon, ChevronDownIcon, ChevronUpIcon } from "@shopify/polaris-icons";
import type { ProductSearchResponse } from "~/types/bundle";

interface ProductPickerProps {
  selectedProducts: string[];
  selectedVariants?: Array<{ productId: string; variantId: string }>;
  selectionType?: "product" | "variant";
  onSelect?: (productIds: string[]) => void;
  onSelectVariants?: (selections: Array<{
    productId: string;
    variantId: string;
    variantTitle: string;
    price: string;
  }>) => void;
  onClose: () => void;
  maxSelections?: number;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  featuredImage?: string;
  vendor: string;
  productType: string;
  availableForSale: boolean;
  priceRange: {
    min: string;
    max: string;
  };
  variantsCount: number;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    availableForSale: boolean;
    image?: string;
    selectedOptions?: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

export function ProductPicker({
  selectedProducts: initialSelected,
  selectedVariants,
  selectionType = "product",
  onSelect,
  onSelectVariants,
  onClose,
  maxSelections,
}: ProductPickerProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>(initialSelected);
  const [selectedProductVariants, setSelectedProductVariants] = useState<
    Array<{ productId: string; variantId: string }>
  >(selectedVariants || []);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([]);
  const [availableOnly, setAvailableOnly] = useState(false); // Show all products by default

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      params.append("limit", "50");

      console.log('Fetching products with params:', params.toString());
      const response = await fetch(`/api/products/search?${params}`);
      
      if (!response.ok) {
        console.error('Product search failed:', response.status, response.statusText);
        setError(`Failed to load products: ${response.statusText}`);
        return;
      }
      
      const data: ProductSearchResponse = await response.json();
      console.log('Products received:', data);

      if ("error" in data) {
        setError(data.error || "Failed to load products");
      } else {
        setProducts(data.products || []);
        console.log(`Loaded ${data.products?.length || 0} products`);
      }
    } catch (err) {
      setError("Failed to load products");
      console.error("Product search error:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Get unique vendors and product types for filters
  const vendors = [...new Set(products.map(p => p.vendor).filter(Boolean))];
  const productTypes = [...new Set(products.map(p => p.productType).filter(Boolean))];

  // Filter products
  const filteredProducts = products.filter(product => {
    if (selectedVendors.length > 0 && !selectedVendors.includes(product.vendor)) {
      return false;
    }
    if (selectedProductTypes.length > 0 && !selectedProductTypes.includes(product.productType)) {
      return false;
    }
    if (availableOnly && !product.availableForSale) {
      return false;
    }
    return true;
  });

  const handleToggleProduct = useCallback((productId: string) => {
    if (selectionType === "product") {
      setSelectedProducts((current) => {
        if (current.includes(productId)) {
          return current.filter(id => id !== productId);
        } else {
          if (maxSelections && current.length >= maxSelections) {
            return current;
          }
          return [...current, productId];
        }
      });
    } else {
      // For variant selection, toggle product expansion
      setExpandedProducts(current => {
        const newSet = new Set(current);
        if (newSet.has(productId)) {
          newSet.delete(productId);
        } else {
          newSet.add(productId);
        }
        return newSet;
      });
    }
  }, [maxSelections, selectionType]);

  const handleToggleVariant = useCallback((productId: string, variantId: string) => {
    setSelectedProductVariants(current => {
      const existingIndex = current.findIndex(
        s => s.productId === productId && s.variantId === variantId
      );
      if (existingIndex >= 0) {
        // Remove variant
        return current.filter((_, index) => index !== existingIndex);
      } else {
        if (maxSelections && current.length >= maxSelections) {
          return current;
        }
        // Add variant
        return [...current, { productId, variantId }];
      }
    });
  }, [maxSelections]);

  const handleSave = () => {
    if (selectionType === "product" && onSelect) {
      onSelect(selectedProducts);
    } else if (selectionType === "variant" && onSelectVariants) {
      // Get variant details for selected variants
      const selections = selectedProductVariants.map(({ productId, variantId }) => {
        const product = products.find(p => p.id === productId);
        const variant = product?.variants.find(v => v.id === variantId);
        return {
          productId,
          variantId,
          variantTitle: variant?.title || "",
          price: variant?.price || "0",
        };
      });
      onSelectVariants(selections);
    }
    onClose();
  };

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedVendors([]);
    setSelectedProductTypes([]);
    setAvailableOnly(true);
  }, []);

  const formatPriceRange = (priceRange: { min: string; max: string }) => {
    if (priceRange.min === priceRange.max) {
      return `$${priceRange.min}`;
    }
    return `$${priceRange.min} - $${priceRange.max}`;
  };

  const filters = [
    {
      key: "vendor",
      label: "Vendor",
      filter: (
        <ChoiceList
          title="Vendor"
          titleHidden
          choices={vendors.map(vendor => ({ label: vendor, value: vendor }))}
          selected={selectedVendors}
          onChange={setSelectedVendors}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: "productType",
      label: "Product Type",
      filter: (
        <ChoiceList
          title="Product Type"
          titleHidden
          choices={productTypes.map(type => ({ label: type, value: type }))}
          selected={selectedProductTypes}
          onChange={setSelectedProductTypes}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: "availability",
      label: "Availability",
      filter: (
        <ChoiceList
          title="Availability"
          titleHidden
          choices={[
            { label: "Available only", value: "true" },
            { label: "All products", value: "false" },
          ]}
          selected={[availableOnly.toString()]}
          onChange={(selected) => setAvailableOnly(selected[0] === "true")}
        />
      ),
    },
  ];

  const appliedFilters = [];
  if (selectedVendors.length > 0) {
    selectedVendors.forEach(vendor => {
      appliedFilters.push({
        key: `vendor-${vendor}`,
        label: `Vendor: ${vendor}`,
        onRemove: () => setSelectedVendors(current => current.filter(v => v !== vendor)),
      });
    });
  }
  if (selectedProductTypes.length > 0) {
    selectedProductTypes.forEach(type => {
      appliedFilters.push({
        key: `type-${type}`,
        label: `Type: ${type}`,
        onRemove: () => setSelectedProductTypes(current => current.filter(t => t !== type)),
      });
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={selectionType === "variant" ? "Select Product Variants" : "Select Products"}
      primaryAction={{
        content: selectionType === "variant" 
          ? `Select ${selectedProductVariants.length} variant${selectedProductVariants.length !== 1 ? 's' : ''}`
          : `Select ${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''}`,
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
        },
      ]}
      large
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Box>
            <Filters
              queryValue={searchQuery}
              onQueryChange={setSearchQuery}
              onQueryClear={() => setSearchQuery("")}
              filters={filters}
              appliedFilters={appliedFilters}
              onClearAll={handleClearFilters}
            >
              <Box paddingBlockEnd="200">
                {maxSelections && (
                  <Text variant="bodySm" tone="subdued">
                    Select up to {maxSelections} product{maxSelections !== 1 ? 's' : ''}
                  </Text>
                )}
              </Box>
            </Filters>
          </Box>

          {loading ? (
            <Box padding="1600">
              <BlockStack gap="400" align="center">
                <Spinner accessibilityLabel="Loading products" />
                <Text variant="bodyMd" tone="subdued">Loading products...</Text>
              </BlockStack>
            </Box>
          ) : error ? (
            <EmptyState
              heading="Error loading products"
              image=""
            >
              <p>{error}</p>
            </EmptyState>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              heading="No products found"
              image=""
              action={{ content: "Clear filters", onAction: handleClearFilters }}
            >
              <p>Try adjusting your filters or search query</p>
            </EmptyState>
          ) : (
            <ResourceList
              resourceName={{ singular: "product", plural: "products" }}
              items={filteredProducts}
              renderItem={(product) => {
                const isSelected = selectedProducts.includes(product.id);
                // In variant mode, always expand products
                const isExpanded = selectionType === "variant" ? true : expandedProducts.has(product.id);
                const selectedVariantsCount = selectedProductVariants.filter(
                  v => v.productId === product.id
                ).length;
                const isDisabled = !isSelected && maxSelections !== undefined && selectedProducts.length >= maxSelections;
                
                return (
                  <ResourceItem
                    id={product.id}
                    media={
                      <Thumbnail
                        source={product.featuredImage || ""}
                        alt={product.title}
                        size="small"
                      />
                    }
                    onClick={() => !isDisabled && handleToggleProduct(product.id)}
                    disabled={isDisabled && selectionType === "product"}
                  >
                    <BlockStack gap="100">
                      <InlineStack align="space-between">
                        <Text variant="bodyMd" fontWeight="semibold">
                          {product.title}
                        </Text>
                        {selectionType === "product" ? (
                          isSelected && <Tag>Selected</Tag>
                        ) : (
                          selectedVariantsCount > 0 && (
                            <Badge tone="success">{selectedVariantsCount} selected</Badge>
                          )
                        )}
                      </InlineStack>
                      
                      <InlineStack gap="200">
                        <Text variant="bodySm" tone="subdued">
                          {product.vendor}
                        </Text>
                        {product.productType && (
                          <>
                            <Text variant="bodySm" tone="subdued">•</Text>
                            <Text variant="bodySm" tone="subdued">
                              {product.productType}
                            </Text>
                          </>
                        )}
                      </InlineStack>
                      
                      <InlineStack align="space-between">
                        <Text variant="bodyMd">
                          {formatPriceRange(product.priceRange)}
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                          {product.variantsCount} variant{product.variantsCount !== 1 ? 's' : ''}
                        </Text>
                      </InlineStack>
                      
                      {!product.availableForSale && (
                        <Badge tone="critical">Unavailable</Badge>
                      )}
                      
                      {/* Variant selection mode */}
                      {selectionType === "variant" && (
                        <>
                          <Collapsible open={true} id={`variants-${product.id}`}>
                            <Box paddingBlockStart="200">
                              <Divider />
                              <Box paddingBlockStart="300">
                                <BlockStack gap="200">
                                  {product.variants.map((variant) => {
                                    const isVariantSelected = selectedProductVariants.some(
                                      v => v.productId === product.id && v.variantId === variant.id
                                    );
                                    const isVariantDisabled = !isVariantSelected && 
                                      maxSelections !== undefined && 
                                      selectedProductVariants.length >= maxSelections;
                                    
                                    return (
                                      <Box 
                                        key={variant.id} 
                                        paddingInlineStart="400"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <InlineStack align="space-between" blockAlign="center">
                                          <BlockStack gap="050">
                                            <Text variant="bodyMd">{variant.title}</Text>
                                            <Text variant="bodySm" tone="subdued">
                                              ${variant.price}
                                            </Text>
                                          </BlockStack>
                                          <Checkbox
                                            label=""
                                            checked={isVariantSelected}
                                            disabled={isVariantDisabled}
                                            onChange={() => {
                                              handleToggleVariant(product.id, variant.id);
                                            }}
                                          />
                                        </InlineStack>
                                      </Box>
                                    );
                                  })}
                                </BlockStack>
                              </Box>
                            </Box>
                          </Collapsible>
                        </>
                      )}
                    </BlockStack>
                  </ResourceItem>
                );
              }}
            />
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}