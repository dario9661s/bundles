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
  onStatusToggle: (bundleId: string, status: Bundle['status']) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export function BundleList({
  bundles,
  pagination,
  onEdit,
  onDelete,
  onStatusToggle,
  loading = false,
  error,
}: BundleListProps) {
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
              url={`/app/bundles/${id}`}
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
                      <Button onClick={() => onEdit(id)}>Edit</Button>
                      <Button
                        onClick={async () => {
                          const newStatus = status === 'active' ? 'inactive' : 'active';
                          await onStatusToggle(id, newStatus);
                        }}
                        plain
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
      
      {pagination.hasNext && (
        <Box padding="400" insetBlockEnd="200">
          <Button fullWidth url={`/app/bundles?page=${pagination.page + 1}`}>
            Load more bundles
          </Button>
        </Box>
      )}
    </Card>
  );
}