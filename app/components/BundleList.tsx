import { useState, useCallback, useEffect } from "react";
import {
  Badge,
  Card,
  EmptyState,
  ResourceItem,
  ResourceList,
  Text,
  Spinner,
  BlockStack,
  Button,
  Box,
  InlineError,
  Modal,
  TextField,
  Select,
  FormLayout,
  InlineStack,
  Popover,
  ActionList,
} from "@shopify/polaris";
import { MenuHorizontalIcon } from "@shopify/polaris-icons";
import type { Bundle } from "~/types/bundle";

interface BundleListProps {
  bundles: Bundle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
  onEdit: (bundleId: string) => void;
  onDelete: (bundleId: string) => Promise<void>;
  onDuplicate: (bundleId: string, title: string, status?: "active" | "draft") => Promise<void>;
  onStatusToggle: (bundleId: string, status: Bundle['status']) => Promise<void>;
  loading?: boolean;
  error?: string;
  actionLoadingIds?: Set<string>;
}

export function BundleList({
  bundles,
  pagination,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusToggle,
  loading = false,
  error,
  actionLoadingIds = new Set(),
}: BundleListProps) {
  
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicatingBundleId, setDuplicatingBundleId] = useState<string | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [duplicateStatus, setDuplicateStatus] = useState<"active" | "draft">("draft");
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingBundle, setDeletingBundle] = useState<Bundle | null>(null);
  const [navigatingToBundleId, setNavigatingToBundleId] = useState<string | null>(null);

  const handleDuplicateClick = useCallback((bundle: Bundle) => {
    setDuplicatingBundleId(bundle.id);
    
    // Generate a unique title suggestion
    const baseName = bundle.title.replace(/ - Copy( \d+)?$/, ''); // Remove existing copy suffix
    const copyPattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} - Copy( \\d+)?$`);
    const existingCopies = bundles.filter(b => copyPattern.test(b.title));
    
    let copyNumber = 1;
    if (existingCopies.length > 0) {
      // Find the highest copy number
      const numbers = existingCopies.map(b => {
        const match = b.title.match(/ - Copy (\d+)$/);
        return match ? parseInt(match[1]) : 1;
      });
      copyNumber = Math.max(...numbers) + 1;
    }
    
    const suggestedTitle = copyNumber === 1 
      ? `${baseName} - Copy` 
      : `${baseName} - Copy ${copyNumber}`;
    
    setDuplicateTitle(suggestedTitle);
    setDuplicateStatus("draft");
    setDuplicateError(null);
    setDuplicateModalOpen(true);
  }, [bundles]);

  const handleDuplicateConfirm = useCallback(async () => {
    if (!duplicatingBundleId || !duplicateTitle.trim()) {
      setDuplicateError("Title is required");
      return;
    }

    setDuplicating(true);
    setDuplicateError(null);

    try {
      await onDuplicate(duplicatingBundleId, duplicateTitle, duplicateStatus);
      // Close modal and reset state on success
      setDuplicateModalOpen(false);
      setDuplicatingBundleId(null);
      setDuplicateTitle("");
      setDuplicateError(null);
      setDuplicating(false);
    } catch (error) {
      setDuplicateError(error instanceof Error ? error.message : "Failed to duplicate bundle");
      setDuplicating(false);
    }
  }, [duplicatingBundleId, duplicateTitle, duplicateStatus, onDuplicate]);

  const handleDuplicateCancel = useCallback(() => {
    setDuplicateModalOpen(false);
    setDuplicatingBundleId(null);
    setDuplicateTitle("");
    setDuplicateError(null);
  }, []);
  
  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingBundle) return;
    
    try {
      await onDelete(deletingBundle.id);
      setDeleteModalOpen(false);
      setDeletingBundle(null);
    } catch (error) {
      console.error('Delete Bundle Error:', error);
    }
  }, [deletingBundle, onDelete]);
  
  const handleDeleteCancel = useCallback(() => {
    setDeleteModalOpen(false);
    setDeletingBundle(null);
  }, []);

  if (loading && bundles.length === 0) {
    // Show skeleton loading state with placeholder items
    const placeholderItems = Array.from({ length: 3 }, (_, index) => ({
      id: `placeholder-${index}`,
      title: '',
      status: 'draft' as const,
    }));

    return (
      <Card>
        <ResourceList
          resourceName={resourceName}
          items={placeholderItems}
          renderItem={() => (
            <Box padding="400">
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <InlineStack gap="300">
                    <Box background="bg-surface-secondary" borderRadius="100" minHeight="24px" width="60px" />
                    <Box background="bg-surface-secondary" borderRadius="100" minHeight="24px" width="200px" />
                  </InlineStack>
                  <Box background="bg-surface-secondary" borderRadius="100" minHeight="32px" width="32px" />
                </InlineStack>
                <InlineStack gap="400">
                  <Box background="bg-surface-secondary" borderRadius="100" minHeight="20px" width="80px" />
                  <Box background="bg-surface-secondary" borderRadius="100" minHeight="20px" width="100px" />
                  <Box background="bg-surface-secondary" borderRadius="100" minHeight="20px" width="60px" />
                </InlineStack>
                <Box background="bg-surface-secondary" borderRadius="100" minHeight="16px" width="140px" />
              </BlockStack>
            </Box>
          )}
          loading
        />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Box padding="400">
          <InlineError message={error} />
        </Box>
      </Card>
    );
  }

  const resourceName = {
    singular: "bundle",
    plural: "bundles",
  };

  const emptyState = (
    <EmptyState
      heading="Create your first product bundle"
      action={{ content: "Create bundle", url: "/app/bundles/new" }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>
        Build attractive product bundles with custom discounts to increase your average order value.
      </p>
    </EmptyState>
  );

  return (
    <Card>
      <ResourceList
        resourceName={resourceName}
        items={bundles}
        renderItem={(bundle) => {
          const { id, handle, title, status, discountType, discountValue, steps, updatedAt } = bundle;

          const discountText = discountType === 'percentage' 
            ? `${discountValue}% off`
            : discountType === 'fixed'
            ? `$${discountValue} off`
            : `$${discountValue} fixed price`;

          // Calculate total products across all steps
          const totalProducts = steps.reduce((sum, step) => sum + step.products.length, 0);

          return (
            <ResourceItem
              id={id}
              url={`/app/bundles/${encodeURIComponent(id)}`}
              accessibilityLabel={`View details for ${title}`}
              onClick={() => setNavigatingToBundleId(id)}
              actions={[
                {
                  content: 'Duplicate',
                  onAction: () => {
                    handleDuplicateClick(bundle);
                  },
                },
                {
                  content: status === 'active' ? 'Deactivate' : 'Activate',
                  onAction: () => {
                    const newStatus = status === 'active' ? 'inactive' : 'active';
                    onStatusToggle(id, newStatus);
                  },
                },
                {
                  content: 'Delete',
                  destructive: true,
                  onAction: () => {
                    setDeletingBundle(bundle);
                    setDeleteModalOpen(true);
                  },
                },
              ]}
            >
              <Box position="relative">
                {/* Loading state - show inline spinner instead of overlay */}
                {navigatingToBundleId === id && (
                  <Box 
                    position="absolute" 
                    insetBlockStart="50%" 
                    insetInlineEnd="16px" 
                    style={{ transform: 'translateY(-50%)' }}
                    zIndex="10"
                  >
                    <InlineStack gap="200" align="center">
                      <Spinner size="small" />
                    </InlineStack>
                  </Box>
                )}
                
                {/* Action loading overlay - keep this for delete/status actions */}
                {actionLoadingIds.has(id) && (
                  <Box 
                    position="absolute" 
                    insetBlockStart="0" 
                    insetInlineStart="0" 
                    insetBlockEnd="0" 
                    insetInlineEnd="0" 
                    background="bg-surface" 
                    opacity="0.9"
                    zIndex="1"
                  >
                    <Box padding="400">
                      <InlineStack align="center">
                        <Spinner size="small" />
                      </InlineStack>
                    </Box>
                  </Box>
                )}
                
                <BlockStack gap="300">
                  {/* Header with status, title and actions */}
                  <InlineStack align="space-between" blockAlign="start">
                    <InlineStack gap="300" align="start" blockAlign="center">
                      {/* Status on the left */}
                      <Badge
                        tone={status === 'active' ? 'success' : status === 'draft' ? 'info' : 'attention'}
                        size="small"
                      >
                        {status === 'active' ? 'Active' : status === 'draft' ? 'Draft' : 'Inactive'}
                      </Badge>
                      
                      {/* Title */}
                      <Box maxWidth="400px">
                        <Text variant="headingMd" as="h3" fontWeight="semibold">
                          {title}
                        </Text>
                      </Box>
                    </InlineStack>
                  </InlineStack>
                  
                  {/* Key info in a subtle inline format */}
                  <Box>
                    <InlineStack gap="400" wrap={false}>
                      <InlineStack gap="100">
                        <Text variant="bodyMd" tone="subdued">Products:</Text>
                        <Text variant="bodyMd" fontWeight="semibold">{totalProducts}</Text>
                      </InlineStack>
                      
                      <Box minWidth="1px" maxWidth="1px" background="border-subdued" />
                      
                      <InlineStack gap="100">
                        <Text variant="bodyMd" tone="subdued">Discount:</Text>
                        <Text variant="bodyMd" fontWeight="semibold" tone={discountValue > 0 ? 'success' : undefined}>
                          {discountText}
                        </Text>
                      </InlineStack>
                      
                      <Box minWidth="1px" maxWidth="1px" background="border-subdued" />
                      
                      <InlineStack gap="100">
                        <Text variant="bodyMd" tone="subdued">Steps:</Text>
                        <Text variant="bodyMd" fontWeight="semibold">{steps.length}</Text>
                      </InlineStack>
                    </InlineStack>
                  </Box>
                  
                  {/* Footer */}
                  <Text variant="bodySm" tone="subdued">
                    <span suppressHydrationWarning>
                      Last updated {new Date(updatedAt).toLocaleDateString()}
                    </span>
                  </Text>
                </BlockStack>
              </Box>
            </ResourceItem>
          );
        }}
        emptyState={emptyState}
        totalItemsCount={pagination.total}
      />
      
      <Modal
        open={duplicateModalOpen}
        onClose={handleDuplicateCancel}
        title="Duplicate Bundle"
        primaryAction={{
          content: "Duplicate",
          onAction: handleDuplicateConfirm,
          loading: duplicating,
          disabled: duplicating || !duplicateTitle.trim(),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleDuplicateCancel,
            disabled: duplicating,
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            {duplicateError && (
              <Box paddingBlockEnd="400">
                <InlineError message={duplicateError} />
              </Box>
            )}
            
            <TextField
              label="Bundle title"
              value={duplicateTitle}
              onChange={setDuplicateTitle}
              autoComplete="off"
              error={!duplicateTitle.trim() ? "Title is required" : undefined}
              helpText="Enter a unique title for the duplicated bundle"
              requiredIndicator
              disabled={duplicating}
            />
            
            <Select
              label="Status"
              options={[
                { label: "Draft", value: "draft" },
                { label: "Active", value: "active" },
              ]}
              value={duplicateStatus}
              onChange={(value) => setDuplicateStatus(value as "active" | "draft")}
              helpText="Choose the initial status for the duplicated bundle"
              disabled={duplicating}
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={handleDeleteCancel}
        title="Delete bundle?"
        primaryAction={{
          content: "Delete bundle",
          destructive: true,
          onAction: handleDeleteConfirm,
          loading: deletingBundle && actionLoadingIds.has(deletingBundle.id),
          disabled: deletingBundle && actionLoadingIds.has(deletingBundle.id),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleDeleteCancel,
            disabled: deletingBundle && actionLoadingIds.has(deletingBundle.id),
          },
        ]}
      >
        <Modal.Section>
          <p>Are you sure you want to delete "{deletingBundle?.title}"? This action cannot be undone.</p>
        </Modal.Section>
      </Modal>
    </Card>
  );
}