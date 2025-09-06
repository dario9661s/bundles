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
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import type { ProductSearchResponse } from "~/types/bundle";

interface ProductPickerProps {
  selectedProducts: string[];
  onSelect: (productIds: string[]) => void;
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
  }>;
}

export function ProductPicker({
  selectedProducts: initialSelected,
  onSelect,
  onClose,
  maxSelections,
}: ProductPickerProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>(initialSelected);
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
  }, [maxSelections]);

  const handleSave = () => {
    onSelect(selectedProducts);
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
      title="Select Products"
      primaryAction={{
        content: `Select ${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''}`,
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
                    disabled={isDisabled}
                  >
                    <BlockStack gap="100">
                      <InlineStack align="space-between">
                        <Text variant="bodyMd" fontWeight="semibold">
                          {product.title}
                        </Text>
                        {isSelected && <Tag>Selected</Tag>}
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
                        <Badge status="critical">Unavailable</Badge>
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