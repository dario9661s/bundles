import { useState, useCallback } from "react";
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
  ButtonGroup,
  Box,
  InlineError,
  Modal,
  TextField,
  Select,
  FormLayout,
} from "@shopify/polaris";
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
  if (loading) {
    return (
      <Card>
        <Box padding="400">
          <BlockStack gap="400" align="center">
            <Spinner accessibilityLabel="Loading bundles" />
            <Text variant="bodyMd" tone="subdued">Loading bundles...</Text>
          </BlockStack>
        </Box>
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

          const statusBadge = (
            <Badge
              status={status === 'active' ? 'success' : status === 'inactive' ? 'warning' : 'info'}
            >
              {status}
            </Badge>
          );

          const discountText = discountType === 'percentage' 
            ? `${discountValue}% off`
            : discountType === 'fixed'
            ? `$${discountValue} off`
            : `$${discountValue} total`;

          return (
            <ResourceItem
              id={id}
              url={`/app/bundles/${encodeURIComponent(id)}`}
              accessibilityLabel={`View details for ${title}`}
              persistActions
            >
              <Box>
                <BlockStack gap="200">
                  <Box>
                    <BlockStack gap="100">
                      <Text variant="headingMd" as="h3">{title}</Text>
                      <Box>
                        <Text variant="bodySm" tone="subdued">
                          Handle: {handle}
                        </Text>
                      </Box>
                    </BlockStack>
                  </Box>
                  
                  <Box>
                    <BlockStack gap="200">
                      <Box>
                        {statusBadge}
                      </Box>
                      <Text variant="bodyMd">
                        {steps.length} {steps.length === 1 ? 'step' : 'steps'} • {discountText}
                      </Text>
                      <Text variant="bodySm" tone="subdued">
                        <span suppressHydrationWarning>
                          Last updated: {new Date(updatedAt).toLocaleDateString()}
                        </span>
                      </Text>
                    </BlockStack>
                  </Box>
                  
                  <Box paddingBlockStart="200">
                    <ButtonGroup>
                      <Button 
                        onClick={() => onEdit(id)}
                        disabled={actionLoadingIds.has(id)}
                      >
                        Edit
                      </Button>
                      <Button 
                        onClick={() => handleDuplicateClick(bundle)} 
                        plain
                        disabled={actionLoadingIds.has(id)}
                      >
                        Duplicate
                      </Button>
                      <Button
                        onClick={async () => {
                          const newStatus = status === 'active' ? 'inactive' : 'active';
                          await onStatusToggle(id, newStatus);
                        }}
                        plain
                        loading={actionLoadingIds.has(id)}
                        disabled={actionLoadingIds.has(id)}
                      >
                        {status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete "${title}"?`)) {
                            await onDelete(id);
                          }
                        }}
                        tone="critical"
                        plain
                        loading={actionLoadingIds.has(id)}
                        disabled={actionLoadingIds.has(id)}
                      >
                        Delete
                      </Button>
                    </ButtonGroup>
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
    </Card>
  );
}