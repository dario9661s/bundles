import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Card,
  BlockStack,
  Text,
  Button,
  ResourceList,
  ResourceItem,
  Thumbnail,
  InlineStack,
  Badge,
  Banner,
  DropZone,
  Box,
  EmptyState,
  SkeletonBodyText,
  Icon,
  TextField,
  Divider,
  Select,
  Collapsible,
  Link,
} from "@shopify/polaris";
import { XIcon, ImageIcon, PlusIcon } from "@shopify/polaris-icons";
import type { CombinationImagesTabProps, BundleCombination } from "./BundleFormTypes";

interface LocalCombination {
  id: string;
  productIds: string[];
  imageFile?: File;
  imagePreview?: string;
  imageBase64?: string;
  title?: string;
}

export function CombinationImagesTab({ bundleId, steps, layoutType, onCombinationsChange }: CombinationImagesTabProps) {
  const [savedCombinations, setSavedCombinations] = useState<BundleCombination[]>([]);
  const [localCombinations, setLocalCombinations] = useState<Record<string, LocalCombination>>({});
  const [deletedCombinationIds, setDeletedCombinationIds] = useState<string[]>([]);
  const [productDetails, setProductDetails] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [productDisplayMode, setProductDisplayMode] = useState<"names" | "ids">("names");

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!bundleId) return false; // New bundle, changes handled by parent
    
    // Check for new combinations
    const newCombinations = Object.values(localCombinations).filter(
      combo => combo.imageBase64 && !savedCombinations.some(
        saved => saved.products.sort().join(',') === combo.productIds.sort().join(',')
      )
    );
    
    return newCombinations.length > 0 || deletedCombinationIds.length > 0;
  }, [bundleId, localCombinations, savedCombinations, deletedCombinationIds]);

  // Generate all possible combinations of 2+ products
  const generatedCombinations = useMemo(() => {
    const allProducts = steps.flatMap(step => 
      step.products.map(product => ({
        ...product,
        stepTitle: step.title,
        stepPosition: step.position,
      }))
    );

    const combinations: Array<{
      id: string;
      productIds: string[];
      products: any[];
    }> = [];

    // Generate combinations of 2 products
    for (let i = 0; i < allProducts.length; i++) {
      for (let j = i + 1; j < allProducts.length; j++) {
        const combo = {
          id: `combo-${allProducts[i].id}-${allProducts[j].id}`,
          productIds: [allProducts[i].id, allProducts[j].id].sort(),
          products: [allProducts[i], allProducts[j]],
        };
        combinations.push(combo);
      }
    }

    // Generate combinations of 3 products
    for (let i = 0; i < allProducts.length; i++) {
      for (let j = i + 1; j < allProducts.length; j++) {
        for (let k = j + 1; k < allProducts.length; k++) {
          const combo = {
            id: `combo-${allProducts[i].id}-${allProducts[j].id}-${allProducts[k].id}`,
            productIds: [allProducts[i].id, allProducts[j].id, allProducts[k].id].sort(),
            products: [allProducts[i], allProducts[j], allProducts[k]],
          };
          combinations.push(combo);
        }
      }
    }

    // Optionally generate 4+ product combinations (limit to prevent UI overload)
    if (allProducts.length <= 10) {
      for (let i = 0; i < allProducts.length; i++) {
        for (let j = i + 1; j < allProducts.length; j++) {
          for (let k = j + 1; k < allProducts.length; k++) {
            for (let l = k + 1; l < allProducts.length; l++) {
              const combo = {
                id: `combo-${allProducts[i].id}-${allProducts[j].id}-${allProducts[k].id}-${allProducts[l].id}`,
                productIds: [allProducts[i].id, allProducts[j].id, allProducts[k].id, allProducts[l].id].sort(),
                products: [allProducts[i], allProducts[j], allProducts[k], allProducts[l]],
              };
              combinations.push(combo);
            }
          }
        }
      }
    }

    return combinations;
  }, [steps]);

  // Fetch product details
  const fetchProductDetails = useCallback(async (productIds: string[]) => {
    try {
      const idsToFetch = productIds.filter(id => !productDetails[id]);
      if (idsToFetch.length === 0) return;

      const response = await fetch(`/api/products/search?ids=${idsToFetch.join(',')}`);
      const data = await response.json();
      
      const details = data.products.reduce((acc: any, product: any) => {
        acc[product.id] = {
          title: product.title,
          featuredImage: product.featuredImage,
        };
        return acc;
      }, {});
      
      setProductDetails(prev => ({ ...prev, ...details }));
    } catch (error) {
      console.error('Failed to fetch product details:', error);
    }
  }, [productDetails]);

  // Load saved combinations if in edit mode
  useEffect(() => {
    if (bundleId) {
      loadSavedCombinations();
    }
  }, [bundleId]);

  // Fetch details for all products
  useEffect(() => {
    const allProductIds = steps.flatMap(step => step.products.map(p => p.id));
    if (allProductIds.length > 0) {
      fetchProductDetails(allProductIds);
    }
  }, [steps, fetchProductDetails]);

  // Notify parent of combination changes
  useEffect(() => {
    if (onCombinationsChange) {
      const combinationsWithImages = Object.values(localCombinations)
        .filter(combo => combo.imageBase64)
        .map(combo => ({
          productIds: combo.productIds,
          imageBase64: combo.imageBase64!,
          title: combo.title,
        }));
      onCombinationsChange(combinationsWithImages);
    }
  }, [localCombinations, onCombinationsChange]);

  const loadSavedCombinations = async () => {
    if (!bundleId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/app/api/bundles/${encodeURIComponent(bundleId)}/combinations`);
      const data = await response.json();
      
      if (response.ok) {
        setSavedCombinations(data.combinations || []);
      } else {
        setError(data.message || "Failed to load combinations");
      }
    } catch (error) {
      console.error("Error loading combinations:", error);
      setError("Failed to load combinations");
    } finally {
      setIsLoading(false);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix to get just base64
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Handle image upload for a combination
  const handleImageUpload = useCallback(async (
    combinationId: string, 
    productIds: string[], 
    _dropFiles: File[], 
    acceptedFiles: File[], 
    _rejectedFiles: File[]
  ) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith("image/")) {
      const imagePreview = window.URL.createObjectURL(file);
      const imageBase64 = await fileToBase64(file);
      
      setLocalCombinations(prev => ({
        ...prev,
        [combinationId]: {
          id: combinationId,
          productIds,
          imageFile: file,
          imagePreview,
          imageBase64,
          title: prev[combinationId]?.title,
        },
      }));
    }
  }, []);

  // Handle title change
  const handleTitleChange = useCallback((combinationId: string, productIds: string[], title: string) => {
    setLocalCombinations(prev => ({
      ...prev,
      [combinationId]: {
        ...prev[combinationId],
        id: combinationId,
        productIds,
        title,
      },
    }));
  }, []);

  // Remove image
  const handleRemoveImage = useCallback((combinationId: string) => {
    setLocalCombinations(prev => {
      const updated = { ...prev };
      delete updated[combinationId];
      return updated;
    });
  }, []);

  // Delete saved combination
  const handleDeleteSavedCombination = useCallback((combinationId: string) => {
    setDeletedCombinationIds(prev => [...prev, combinationId]);
  }, []);

  // Save changes
  const handleSaveChanges = useCallback(async () => {
    if (!bundleId || !hasUnsavedChanges) return;
    
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Process new combinations
      const newCombinations = Object.values(localCombinations).filter(
        combo => combo.imageBase64 && !savedCombinations.some(
          saved => saved.products.sort().join(',') === combo.productIds.sort().join(',')
        )
      );
      
      // Create new combinations
      for (const combo of newCombinations) {
        const response = await fetch(`/app/api/bundles/${encodeURIComponent(bundleId)}/combinations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productIds: combo.productIds,
            imageBase64: combo.imageBase64,
            title: combo.title || undefined,
          }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to create combination");
        }
      }
      
      // Delete combinations
      if (deletedCombinationIds.length > 0) {
        const response = await fetch(`/app/api/bundles/${encodeURIComponent(bundleId)}/combinations`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            combinationIds: deletedCombinationIds,
          }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to delete combinations");
        }
      }
      
      // Success! Reload combinations
      setSuccessMessage("Changes saved successfully");
      setDeletedCombinationIds([]);
      setLocalCombinations({});
      await loadSavedCombinations();
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error) {
      console.error("Error saving combinations:", error);
      setError(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [bundleId, hasUnsavedChanges, localCombinations, savedCombinations, deletedCombinationIds]);


  // Get product display text
  const getProductDisplay = (productIds: string[]) => {
    return productIds.map(id => {
      if (productDisplayMode === "ids") {
        // Extract numeric ID from GID if present
        const match = id.match(/\/(\d+)$/);
        return match ? match[1] : id;
      }
      const product = steps.flatMap(s => s.products).find(p => p.id === id);
      return productDetails[id]?.title || product?.title || "Unknown product";
    });
  };

  // Group combinations by product count
  const groupedCombinations = generatedCombinations.reduce((acc, combination) => {
    const key = `${combination.productIds.length} products`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(combination);
    return acc;
  }, {} as Record<string, typeof generatedCombinations>);

  // Check if combination has saved data
  const getCombinationData = (combinationId: string, productIds: string[]) => {
    // Check local state first
    const local = localCombinations[combinationId];
    if (local) return { ...local, isLocal: true };

    // Check saved combinations (for edit mode)
    const saved = savedCombinations.find(c => 
      c.products.length === productIds.length && 
      c.products.every(p => productIds.includes(p))
    );
    
    if (saved && !deletedCombinationIds.includes(saved.id)) {
      return {
        id: saved.id,
        savedId: saved.id,
        productIds,
        imagePreview: saved.imageUrl,
        title: saved.title,
        isSaved: true,
      };
    }

    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <SkeletonBodyText lines={5} />
      </Card>
    );
  }

  const totalProducts = steps.reduce((sum, step) => sum + step.products.length, 0);

  // Check if layout type supports combination images
  const supportedLayouts = ['basic', 'modal', 'stepper'];
  if (!supportedLayouts.includes(layoutType || '')) {
    return (
      <Card>
        <EmptyState
          heading="Combination images not available"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>Combination images are only available for Basic, Modal, and Stepper layouts.</p>
        </EmptyState>
      </Card>
    );
  }

  if (totalProducts < 2) {
    return (
      <Card>
        <EmptyState
          heading="Add more products to create combinations"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>Combination images require at least 2 products. Add products to your bundle steps to see available combinations.</p>
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="start">
          <Box>
            <Text variant="headingMd" as="h2">
              Combination Images
            </Text>
            <Text variant="bodySm" tone="subdued" as="p">
              Upload images for product combinations to help customers visualize their selections
            </Text>
          </Box>
          <Box minWidth="150px">
            <Select
              label="Display"
              labelHidden
              options={[
                { label: "Product names", value: "names" },
                { label: "Product IDs", value: "ids" }
              ]}
              value={productDisplayMode}
              onChange={(value) => setProductDisplayMode(value as "names" | "ids")}
            />
          </Box>
        </InlineStack>

        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}
        
        {successMessage && (
          <Banner tone="success" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Banner>
        )}

        {!bundleId && (
          <Banner tone="info">
            <p>Images will be saved when you create the bundle</p>
          </Banner>
        )}
        
        {bundleId && hasUnsavedChanges && (
          <Box>
            <InlineStack align="end">
              <Button
                variant="primary"
                onClick={handleSaveChanges}
                loading={isSaving}
                disabled={isSaving}
              >
                Save changes
              </Button>
            </InlineStack>
          </Box>
        )}

        <BlockStack gap="400">
          {Object.entries(groupedCombinations)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([groupName, combinations]) => (
              <Box key={groupName}>
                <Box paddingBlockEnd="200">
                  <Text variant="headingSm" as="h3" fontWeight="semibold">
                    {groupName} ({combinations.length} combinations)
                  </Text>
                </Box>
                <BlockStack gap="300">
                  {combinations.map(({ id, productIds, products }) => {
                    const combinationData = getCombinationData(id, productIds);
                    const productDisplay = getProductDisplay(productIds);
                    const isMarkedForDeletion = combinationData?.isSaved && 
                      combinationData.savedId && 
                      deletedCombinationIds.includes(combinationData.savedId);
                    
                    return (
                      <Box key={id}>
                        <Box 
                          padding="400" 
                          background={isMarkedForDeletion ? "bg-critical-subdued" : "bg-surface-secondary"}
                          borderRadius="300"
                          borderColor={isMarkedForDeletion ? "border-critical" : "border-secondary"}
                          borderWidth="025"
                          style={{ opacity: isMarkedForDeletion ? 0.7 : 1 }}
                        >
                          <InlineStack align="space-between" blockAlign="center" gap="400">
                            <BlockStack gap="200">
                              <InlineStack gap="200" blockAlign="center">
                                <Text variant="bodyMd" fontWeight="semibold">
                                  {productDisplay.join(" + ")}
                                </Text>
                                {isMarkedForDeletion && (
                                  <Badge tone="critical">Marked for deletion</Badge>
                                )}
                              </InlineStack>
                              <InlineStack gap="200" wrap>
                                {products.map((product: any) => (
                                  <Badge key={product.id} tone="info">
                                    {product.stepTitle}
                                  </Badge>
                                ))}
                              </InlineStack>
                            </BlockStack>
                            
                            {combinationData?.imagePreview ? (
                              isMarkedForDeletion ? (
                                <Button
                                  onClick={() => {
                                    setDeletedCombinationIds(prev => 
                                      prev.filter(id => id !== combinationData.savedId)
                                    );
                                  }}
                                  variant="plain"
                                >
                                  Undo deletion
                                </Button>
                              ) : (
                                <Box position="relative">
                                  <Thumbnail
                                    source={combinationData.imagePreview}
                                    size="medium"
                                    alt="Combination image"
                                  />
                                  <Box position="absolute" insetBlockStart="0" insetInlineEnd="0">
                                    <Button
                                      onClick={() => {
                                        if (combinationData.isSaved && combinationData.savedId) {
                                          handleDeleteSavedCombination(combinationData.savedId);
                                        } else {
                                          handleRemoveImage(id);
                                        }
                                      }}
                                      variant="tertiary"
                                      icon={XIcon}
                                      accessibilityLabel="Remove image"
                                      size="slim"
                                      tone={combinationData.isSaved ? "critical" : undefined}
                                    />
                                  </Box>
                                </Box>
                              )
                            ) : (
                              <Button
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      handleImageUpload(id, productIds, [file], [file], []);
                                    }
                                  };
                                  input.click();
                                }}
                                variant="tertiary"
                                icon={PlusIcon}
                                size="medium"
                              >
                                Add image
                              </Button>
                            )}
                          </InlineStack>
                        </Box>
                      </Box>
                    );
                  })}
                </BlockStack>
              </Box>
            ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}