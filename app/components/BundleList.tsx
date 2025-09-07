import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "@remix-run/react";
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
  Checkbox,
  ButtonGroup,
  ProgressBar,
} from "@shopify/polaris";
import { MenuHorizontalIcon } from "@shopify/polaris-icons";
import type { Bundle, BulkDeleteBundlesResponse, BulkStatusUpdateResponse } from "~/types/bundle";

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
  
  // New bulk operation props per Contract 8
  bulkOperationsEnabled?: boolean; // Default: true
  selectedBundleIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onBulkDelete?: (bundleIds: string[]) => Promise<BulkDeleteBundlesResponse>;
  onBulkStatusUpdate?: (bundleIds: string[], status: Bundle['status']) => Promise<BulkStatusUpdateResponse>;
  bulkOperationInProgress?: boolean;
  individualActionInProgress?: boolean;
  
  loading?: boolean;
  error?: string;
}

export function BundleList({
  bundles,
  pagination,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusToggle,
  
  // Bulk operation props
  bulkOperationsEnabled = true,
  selectedBundleIds = [],
  onSelectionChange,
  onBulkDelete,
  onBulkStatusUpdate,
  bulkOperationInProgress = false,
  individualActionInProgress = false,
  
  loading = false,
  error,
}: BundleListProps) {
  const navigate = useNavigate();
  
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicatingBundleId, setDuplicatingBundleId] = useState<string | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState("");
  const [duplicateStatus, setDuplicateStatus] = useState<"active" | "draft">("draft");
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingBundle, setDeletingBundle] = useState<Bundle | null>(null);
  const [navigatingToBundleId, setNavigatingToBundleId] = useState<string | null>(null);
  
  // Bulk operations state
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState<Bundle['status']>('active');
  const [bulkOperationResult, setBulkOperationResult] = useState<BulkDeleteBundlesResponse | BulkStatusUpdateResponse | null>(null);
  const [showBulkResultModal, setShowBulkResultModal] = useState(false);
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

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

  // Bulk operation handlers
  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    
    const allIds = bundles.map(b => b.id);
    const isAllSelected = selectedBundleIds.length === bundles.length && 
      selectedBundleIds.every(id => allIds.includes(id));
    
    onSelectionChange(isAllSelected ? [] : allIds);
  }, [bundles, selectedBundleIds, onSelectionChange]);

  const handleItemSelection = useCallback((bundleId: string, selected: boolean) => {
    if (!onSelectionChange) return;
    
    if (selected) {
      onSelectionChange([...selectedBundleIds, bundleId]);
    } else {
      onSelectionChange(selectedBundleIds.filter(id => id !== bundleId));
    }
  }, [selectedBundleIds, onSelectionChange]);

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedBundleIds.length === 0) return;
    setBulkDeleteModalOpen(true);
  }, [selectedBundleIds]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (!onBulkDelete || selectedBundleIds.length === 0) return;
    
    try {
      const result = await onBulkDelete(selectedBundleIds);
      setBulkOperationResult(result);
      setBulkDeleteModalOpen(false);
      setShowBulkResultModal(true);
      
      // Clear selection after successful operation
      if (onSelectionChange) {
        onSelectionChange([]);
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
    }
  }, [onBulkDelete, selectedBundleIds, onSelectionChange]);

  const handleBulkStatusClick = useCallback(() => {
    if (selectedBundleIds.length === 0) return;
    setBulkStatusModalOpen(true);
  }, [selectedBundleIds]);

  const handleBulkStatusConfirm = useCallback(async () => {
    if (!onBulkStatusUpdate || selectedBundleIds.length === 0) return;
    
    try {
      const result = await onBulkStatusUpdate(selectedBundleIds, bulkNewStatus);
      setBulkOperationResult(result);
      setBulkStatusModalOpen(false);
      setShowBulkResultModal(true);
      
      // Clear selection after successful operation
      if (onSelectionChange) {
        onSelectionChange([]);
      }
    } catch (error) {
      console.error('Bulk status update error:', error);
    }
  }, [onBulkStatusUpdate, selectedBundleIds, bulkNewStatus, onSelectionChange]);

  // Define resourceName at the top to avoid initialization issues
  const resourceName = {
    singular: "bundle",
    plural: "bundles",
  };

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

  // Bulk action toolbar component
  const bulkActionToolbar = bulkOperationsEnabled && selectedBundleIds.length > 0 && (
    <Box paddingBlockStart="400" paddingBlockEnd="400" paddingInlineStart="400" paddingInlineEnd="400">
      <InlineStack align="space-between" blockAlign="center">
        <Text variant="bodySm" tone="subdued">
          {selectedBundleIds.length} bundle{selectedBundleIds.length === 1 ? '' : 's'} selected
        </Text>
        <ButtonGroup>
          <Button
            size="medium"
            onClick={handleBulkStatusClick}
            disabled={bulkOperationInProgress}
            loading={bulkOperationInProgress}
          >
            Change Status
          </Button>
          <Button
            size="medium"
            variant="primary"
            tone="critical"
            onClick={handleBulkDeleteClick}
            disabled={bulkOperationInProgress}
            loading={bulkOperationInProgress}
          >
            Delete Selected
          </Button>
        </ButtonGroup>
      </InlineStack>
      {bulkOperationInProgress && (
        <Box paddingBlockStart="200">
          <ProgressBar progress={75} size="small" />
          <Text variant="bodySm" tone="subdued" alignment="center">
            Processing bulk operation...
          </Text>
        </Box>
      )}
    </Box>
  );

  // Navigation loading bar
  const navigationLoadingBar = navigatingToBundleId && (
    <Box paddingBlockStart="0" paddingBlockEnd="400" paddingInlineStart="0" paddingInlineEnd="0">
      <ProgressBar progress={75} size="small" />
      <Box paddingBlockStart="200">
        <Text variant="bodySm" tone="subdued" alignment="center">
          Opening bundle...
        </Text>
      </Box>
    </Box>
  );

  // Individual action loading bar
  const individualActionLoadingBar = individualActionInProgress && (
    <Box paddingBlockStart="0" paddingBlockEnd="400" paddingInlineStart="0" paddingInlineEnd="0">
      <ProgressBar progress={75} size="small" />
      <Box paddingBlockStart="200">
        <Text variant="bodySm" tone="subdued" alignment="center">
          Processing action...
        </Text>
      </Box>
    </Box>
  );

  return (
    <Card>
      {navigationLoadingBar}
      {individualActionLoadingBar}
      {bulkActionToolbar}
      <ResourceList
        resourceName={resourceName}
        items={bundles}
        selectable={bulkOperationsEnabled}
        selectedItems={bulkOperationsEnabled ? selectedBundleIds : undefined}
        onSelectionChange={bulkOperationsEnabled ? (selection) => {
          if (onSelectionChange) {
            if (selection === 'all') {
              handleSelectAll();
            } else {
              onSelectionChange(selection as string[]);
            }
          }
        } : undefined}
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
              persistActions
            >
              <Box 
                position="relative" 
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setNavigatingToBundleId(id);
                  // Navigate using React Router
                  navigate(`/app/bundles/${encodeURIComponent(id)}`);
                }}
              >
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
                    
                    {/* Actions dropdown - stop propagation to prevent navigation */}
                    <Box onClick={(e) => e.stopPropagation()}>
                      <Popover
                        active={activePopoverId === id}
                        activator={
                          <Button
                            icon={MenuHorizontalIcon}
                            variant="plain"
                            onClick={() => setActivePopoverId(activePopoverId === id ? null : id)}
                            accessibilityLabel="More actions"
                            disabled={individualActionInProgress}
                          />
                        }
                        onClose={() => setActivePopoverId(null)}
                        preferredAlignment="right"
                      >
                        <ActionList
                          items={[
                            {
                              content: 'Duplicate',
                              onAction: () => {
                                handleDuplicateClick(bundle);
                                setActivePopoverId(null);
                              },
                            },
                            {
                              content: status === 'active' ? 'Deactivate' : 'Activate',
                              onAction: async () => {
                                const newStatus = status === 'active' ? 'inactive' : 'active';
                                await onStatusToggle(id, newStatus);
                                setActivePopoverId(null);
                              },
                            },
                            {
                              content: 'Delete',
                              destructive: true,
                              onAction: () => {
                                setDeletingBundle(bundle);
                                setDeleteModalOpen(true);
                                setActivePopoverId(null);
                              },
                            },
                          ]}
                        />
                      </Popover>
                    </Box>
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
                  <Box>
                    <Text variant="bodySm" tone="subdued">
                      <span suppressHydrationWarning>
                        Last updated {new Date(updatedAt).toLocaleDateString()}
                      </span>
                    </Text>
                  </Box>
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
          loading: individualActionInProgress,
          disabled: individualActionInProgress,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: handleDeleteCancel,
            disabled: individualActionInProgress,
          },
        ]}
      >
        <Modal.Section>
          <p>Are you sure you want to delete "{deletingBundle?.title}"? This action cannot be undone.</p>
        </Modal.Section>
      </Modal>
      
      {/* Bulk Delete Confirmation Modal */}
      <Modal
        open={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        title="Delete Selected Bundles"
        primaryAction={{
          content: `Delete ${selectedBundleIds.length} bundle${selectedBundleIds.length === 1 ? '' : 's'}`,
          destructive: true,
          onAction: handleBulkDeleteConfirm,
          loading: bulkOperationInProgress,
          disabled: bulkOperationInProgress,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setBulkDeleteModalOpen(false),
            disabled: bulkOperationInProgress,
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            Are you sure you want to delete {selectedBundleIds.length} selected bundle{selectedBundleIds.length === 1 ? '' : 's'}? 
            This action cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>

      {/* Bulk Status Update Modal */}
      <Modal
        open={bulkStatusModalOpen}
        onClose={() => setBulkStatusModalOpen(false)}
        title="Change Status of Selected Bundles"
        primaryAction={{
          content: `Update ${selectedBundleIds.length} bundle${selectedBundleIds.length === 1 ? '' : 's'}`,
          onAction: handleBulkStatusConfirm,
          loading: bulkOperationInProgress,
          disabled: bulkOperationInProgress,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setBulkStatusModalOpen(false),
            disabled: bulkOperationInProgress,
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <Select
              label="New status"
              options={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "Draft", value: "draft" },
              ]}
              value={bulkNewStatus}
              onChange={(value) => setBulkNewStatus(value as Bundle['status'])}
              disabled={bulkOperationInProgress}
            />
            <Text as="p" tone="subdued">
              This will update the status of {selectedBundleIds.length} selected bundle{selectedBundleIds.length === 1 ? '' : 's'}.
            </Text>
          </FormLayout>
        </Modal.Section>
      </Modal>

      {/* Bulk Operation Results Modal */}
      <Modal
        open={showBulkResultModal}
        onClose={() => setShowBulkResultModal(false)}
        title="Operation Results"
        primaryAction={{
          content: "Close",
          onAction: () => {
            setShowBulkResultModal(false);
            setBulkOperationResult(null);
          },
        }}
      >
        <Modal.Section>
          {bulkOperationResult && (
            <BlockStack gap="300">
              <Text variant="headingSm" as="h3">
                {'summary' in bulkOperationResult && 'deleted' in bulkOperationResult.summary
                  ? `Delete Operation Complete`
                  : `Status Update Operation Complete`}
              </Text>
              
              <InlineStack gap="600">
                <Box>
                  <Text variant="bodySm" tone="subdued">Total</Text>
                  <Text variant="headingMd" as="p">{bulkOperationResult.summary.total}</Text>
                </Box>
                <Box>
                  <Text variant="bodySm" tone="subdued">
                    {'deleted' in bulkOperationResult.summary ? 'Deleted' : 'Updated'}
                  </Text>
                  <Text variant="headingMd" as="p" tone="success">
                    {'deleted' in bulkOperationResult.summary 
                      ? bulkOperationResult.summary.deleted 
                      : bulkOperationResult.summary.updated}
                  </Text>
                </Box>
                <Box>
                  <Text variant="bodySm" tone="subdued">Failed</Text>
                  <Text variant="headingMd" as="p" tone={bulkOperationResult.summary.failed > 0 ? "critical" : undefined}>
                    {bulkOperationResult.summary.failed}
                  </Text>
                </Box>
              </InlineStack>
              
              {bulkOperationResult.summary.failed > 0 && (
                <Box>
                  <Text variant="headingSm" as="h4">Failed Operations:</Text>
                  {bulkOperationResult.results
                    .filter(r => !r.success)
                    .map((result, index) => (
                      <Text key={index} variant="bodySm" tone="critical">
                        Bundle {result.bundleId}: {result.error}
                      </Text>
                    ))}
                </Box>
              )}
            </BlockStack>
          )}
        </Modal.Section>
      </Modal>
    </Card>
  );
}