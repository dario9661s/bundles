import { useCallback } from "react";
import {
  Card,
  BlockStack,
  Text,
  Box,
  Divider,
  FormLayout,
  Select,
  Checkbox,
  RadioButton,
  TextField,
  Grid,
  Icon,
  InlineStack,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import type { BundleLayoutSettingsProps } from "./BundleFormTypes";
import type { LayoutSettings } from "~/types/bundle";

const mobileColumnOptions = [
  { label: "1 column", value: "1" },
  { label: "2 columns", value: "2" },
  { label: "3 columns", value: "3" },
  { label: "4 columns", value: "4" },
];

const desktopColumnOptions = [
  { label: "1 column", value: "1" },
  { label: "2 columns", value: "2" },
  { label: "3 columns", value: "3" },
  { label: "4 columns", value: "4" },
  { label: "5 columns", value: "5" },
  { label: "6 columns", value: "6" },
];

export function BundleLayoutSettings({
  layoutType,
  layoutSettings,
  mobileColumns,
  desktopColumns,
  onLayoutSettingsChange,
}: BundleLayoutSettingsProps) {
  const handleLayoutTypeChange = useCallback((newLayoutType: string) => {
    onLayoutSettingsChange({ 
      layoutType: newLayoutType as "basic" | "modal" | "selection" | "stepper" 
    });
  }, [onLayoutSettingsChange]);

  const handleLayoutSettingsUpdate = useCallback((updates: Partial<LayoutSettings>) => {
    onLayoutSettingsChange({ 
      layoutSettings: { ...layoutSettings, ...updates } 
    });
  }, [layoutSettings, onLayoutSettingsChange]);

  const handleColumnsChange = useCallback((field: 'mobileColumns' | 'desktopColumns', value: string) => {
    onLayoutSettingsChange({ 
      [field]: parseInt(value) 
    });
  }, [onLayoutSettingsChange]);

  // Render layout option card for create page
  const renderLayoutCard = (
    type: string,
    title: string,
    svgContent: React.ReactNode
  ) => (
    <Box>
      <div
        onClick={() => handleLayoutTypeChange(type)}
        style={{
          cursor: 'pointer',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        <Card
          background={layoutType === type ? 'bg-surface-selected' : 'bg-surface'}
          padding="300"
          style={{
            border: layoutType === type ? '2px solid var(--p-color-border-emphasis)' : '1px solid var(--p-color-border)',
            transition: 'all 0.15s ease',
            height: '100%'
          }}
        >
          <BlockStack gap="300" inlineAlign="center">
            <Box width="60px" height="60px">
              {svgContent}
            </Box>
            <Text variant="bodyMd" fontWeight="medium" alignment="center">
              {title}
            </Text>
            {layoutType === type && (
              <Box position="absolute" insetBlockStart="200" insetInlineEnd="200">
                <Icon source={CheckIcon} tone="success" />
              </Box>
            )}
          </BlockStack>
        </Card>
      </div>
    </Box>
  );

  // Render layout option for edit page
  const renderLayoutRadio = (
    type: string,
    title: string,
    subtitle: string,
    svgContent: React.ReactNode
  ) => (
    <RadioButton
      label={
        <InlineStack gap="300" blockAlign="center">
          <Box width="40px" height="40px" style={{ flexShrink: 0 }}>
            {svgContent}
          </Box>
          <Box>
            <Text variant="bodyLg" fontWeight="semibold">{title}</Text>
            <Text variant="bodySm" tone="subdued">{subtitle}</Text>
          </Box>
        </InlineStack>
      }
      checked={layoutType === type}
      id={`layout-${type}-edit`}
      onChange={() => handleLayoutTypeChange(type)}
    />
  );

  return (
    <BlockStack gap="400">
      {/* Layout Type Selection - Create Page Style */}
      <Card>
        <BlockStack gap="400">
          <Box>
            <BlockStack gap="200">
              <Text variant="headingMd" as="h2">
                Layout Configuration
              </Text>
              <Text variant="bodySm" tone="subdued" as="p">
                Choose how your bundle will be displayed to customers
              </Text>
            </BlockStack>
          </Box>

          {/* Visual Layout Chooser */}
          <Box width="100%">
            <Grid columns={{ xs: 2, sm: 2, md: 4, lg: 4 }} gap="200">
              {renderLayoutCard('basic', 'Basic', 
                <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="20" width="35" height="60" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1.5"/>
                  <rect x="15" y="25" width="25" height="35" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                  <rect x="15" y="65" width="25" height="3" rx="1.5" fill="#8C9196" fillOpacity="0.5"/>
                  <rect x="15" y="71" width="18" height="2" rx="1" fill="#8C9196" fillOpacity="0.4"/>
                  <rect x="52" y="20" width="38" height="60" rx="3" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1.2" strokeDasharray="3 2"/>
                  <rect x="57" y="25" width="28" height="8" rx="1.5" fill="#8C9196" fillOpacity="0.3"/>
                  <rect x="57" y="36" width="28" height="8" rx="1.5" fill="#8C9196" fillOpacity="0.3"/>
                  <rect x="57" y="47" width="28" height="8" rx="1.5" fill="#8C9196" fillOpacity="0.3"/>
                  <rect x="57" y="65" width="28" height="10" rx="2" fill="#00AA5E" fillOpacity="0.8"/>
                  <text x="71" y="72" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="bold" fontFamily="Arial">Add</text>
                </svg>
              )}

              {renderLayoutCard('modal', 'Modal',
                <svg width="60" height="60" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="0" width="100" height="100" fill="#000000" fillOpacity="0.1" rx="4"/>
                  <rect x="35" y="15" width="60" height="70" rx="4" fill="#FFFFFF" stroke="#8C9196" strokeWidth="2"/>
                  <rect x="35" y="15" width="60" height="12" rx="4 4 0 0" fill="#8C9196" fillOpacity="0.1"/>
                  <circle cx="88" cy="21" r="3" fill="#8C9196" fillOpacity="0.5"/>
                  <rect x="42" y="32" width="46" height="8" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                  <rect x="42" y="43" width="46" height="8" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                  <rect x="42" y="54" width="46" height="8" rx="2" fill="#8C9196" fillOpacity="0.3"/>
                  <rect x="42" y="66" width="10" height="10" rx="2" fill="#8C9196" fillOpacity="0.4"/>
                  <rect x="54" y="66" width="10" height="10" rx="2" fill="#8C9196" fillOpacity="0.4"/>
                  <rect x="66" y="66" width="10" height="10" rx="2" fill="#8C9196" fillOpacity="0.4"/>
                  <rect x="78" y="66" width="10" height="10" rx="2" fill="#8C9196" fillOpacity="0.4"/>
                  <rect x="5" y="20" width="25" height="30" rx="3" fill="#8C9196" fillOpacity="0.1"/>
                  <rect x="5" y="55" width="25" height="30" rx="3" fill="#8C9196" fillOpacity="0.1"/>
                  <path d="M30 50L25 45L25 55L30 50Z" fill="#8C9196" fillOpacity="0.6"/>
                </svg>
              )}

              {renderLayoutCard('selection', 'Selection',
                <svg width="60" height="60" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="10" width="80" height="55" rx="4" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1.5" strokeDasharray="4 2"/>
                  <rect x="15" y="15" width="22" height="22" rx="3" fill="#FFFFFF" stroke="#8C9196" strokeWidth="1" strokeDasharray="3 2"/>
                  <rect x="39" y="15" width="22" height="22" rx="3" fill="#FFFFFF" stroke="#8C9196" strokeWidth="1" strokeDasharray="3 2"/>
                  <rect x="63" y="15" width="22" height="22" rx="3" fill="#FFFFFF" stroke="#8C9196" strokeWidth="1" strokeDasharray="3 2"/>
                  <rect x="15" y="39" width="22" height="22" rx="3" fill="#FFFFFF" stroke="#8C9196" strokeWidth="1" strokeDasharray="3 2"/>
                  <rect x="39" y="39" width="22" height="22" rx="3" fill="#8C9196" fillOpacity="0.3" stroke="#8C9196" strokeWidth="1.5"/>
                  <rect x="63" y="39" width="22" height="22" rx="3" fill="#8C9196" fillOpacity="0.3" stroke="#8C9196" strokeWidth="1.5"/>
                  <path d="M26 20L26 32M20 26L32 26" stroke="#8C9196" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
                  <path d="M50 20L50 32M44 26L56 26" stroke="#8C9196" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
                  <path d="M74 20L74 32M68 26L80 26" stroke="#8C9196" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
                  <path d="M26 44L26 56M20 50L32 50" stroke="#8C9196" strokeWidth="2" strokeOpacity="0.5" strokeLinecap="round"/>
                  <rect x="43" y="43" width="14" height="10" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                  <rect x="43" y="56" width="10" height="2" rx="1" fill="#8C9196" fillOpacity="0.6"/>
                  <rect x="67" y="43" width="14" height="10" rx="1" fill="#8C9196" fillOpacity="0.5"/>
                  <rect x="67" y="56" width="10" height="2" rx="1" fill="#8C9196" fillOpacity="0.6"/>
                  <rect x="15" y="72" width="17" height="17" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                  <rect x="35" y="72" width="17" height="17" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                  <rect x="55" y="72" width="17" height="17" rx="3" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                </svg>
              )}

              {renderLayoutCard('stepper', 'Stepper',
                <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="15" width="80" height="4" rx="2" fill="#8C9196" fillOpacity="0.2"/>
                  <rect x="10" y="15" width="32" height="4" rx="2" fill="#00AA5E" fillOpacity="0.8"/>
                  <circle cx="20" cy="17" r="7" fill="#00AA5E" stroke="#FFFFFF" strokeWidth="1.5"/>
                  <text x="20" y="20.5" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="Arial">1</text>
                  <circle cx="50" cy="17" r="7" fill="#8C9196" fillOpacity="0.8" stroke="#FFFFFF" strokeWidth="1.5"/>
                  <text x="50" y="20.5" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="Arial">2</text>
                  <circle cx="80" cy="17" r="7" fill="#8C9196" fillOpacity="0.3" stroke="#FFFFFF" strokeWidth="1.5"/>
                  <text x="80" y="20.5" textAnchor="middle" fill="#8C9196" fontSize="8" fontWeight="bold" fontFamily="Arial">3</text>
                  <rect x="20" y="32" width="60" height="38" rx="4" fill="#8C9196" fillOpacity="0.1" stroke="#8C9196" strokeWidth="1.2"/>
                  <text x="50" y="42" textAnchor="middle" fill="#8C9196" fontSize="9" fontFamily="Arial">Step 1: Choose Base</text>
                  <rect x="28" y="48" width="15" height="15" rx="2.5" fill="#8C9196" fillOpacity="0.3"/>
                  <rect x="45" y="48" width="15" height="15" rx="2.5" fill="#8C9196" fillOpacity="0.3"/>
                  <rect x="62" y="48" width="15" height="15" rx="2.5" fill="#8C9196" fillOpacity="0.3"/>
                  <rect x="25" y="75" width="25" height="12" rx="2.5" fill="#8C9196" fillOpacity="0.2" stroke="#8C9196" strokeWidth="1"/>
                  <text x="37.5" y="83" textAnchor="middle" fill="#8C9196" fontSize="7" fontFamily="Arial">Back</text>
                  <rect x="55" y="75" width="25" height="12" rx="2.5" fill="#00AA5E" fillOpacity="0.8"/>
                  <text x="67.5" y="83" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold" fontFamily="Arial">Next</text>
                </svg>
              )}
            </Grid>
          </Box>

          {/* Column settings for stepper layout */}
          {['stepper'].includes(layoutType) && (
            <Box>
              <Divider />
              <Box paddingBlockStart="400">
                <FormLayout>
                  <Text variant="headingSm" as="h4" fontWeight="semibold">
                    Column settings
                  </Text>
                  <FormLayout.Group>
                    <Select
                      label="Mobile columns"
                      options={mobileColumnOptions}
                      value={mobileColumns.toString()}
                      onChange={(value) => handleColumnsChange('mobileColumns', value)}
                      helpText="Number of columns on mobile devices"
                    />
                    <Select
                      label="Desktop columns"
                      options={desktopColumnOptions}
                      value={desktopColumns.toString()}
                      onChange={(value) => handleColumnsChange('desktopColumns', value)}
                      helpText="Number of columns on desktop"
                    />
                  </FormLayout.Group>
                </FormLayout>
              </Box>
            </Box>
          )}

          {/* Basic layout settings */}
          {layoutType === 'basic' && (
            <Box>
              <Divider />
              <Box paddingBlockStart="400">
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h4" fontWeight="semibold">
                    Basic Layout Settings
                  </Text>

                  <FormLayout>
                    <FormLayout.Group>
                      <Select
                        label="Image position"
                        options={[
                          { label: "Left", value: "left" },
                          { label: "Right", value: "right" },
                        ]}
                        value={layoutSettings.basicSettings?.imagePosition || "left"}
                        onChange={(value) => handleLayoutSettingsUpdate({
                          basicSettings: {
                            ...layoutSettings.basicSettings!,
                            imagePosition: value as "left" | "right"
                          }
                        })}
                        helpText="Position of the product image"
                      />

                      <Select
                        label="Image aspect ratio"
                        options={[
                          { label: "Square", value: "square" },
                          { label: "Portrait", value: "portrait" },
                          { label: "Landscape", value: "landscape" },
                        ]}
                        value={layoutSettings.basicSettings?.imageAspectRatio || "square"}
                        onChange={(value) => handleLayoutSettingsUpdate({
                          basicSettings: {
                            ...layoutSettings.basicSettings!,
                            imageAspectRatio: value as "square" | "portrait" | "landscape"
                          }
                        })}
                        helpText="Aspect ratio for product images"
                      />
                    </FormLayout.Group>

                    <FormLayout.Group>
                      <Select
                        label="Image behavior"
                        options={[
                          { label: "Zoom on hover", value: "zoom" },
                          { label: "Lightbox", value: "lightbox" },
                          { label: "None", value: "none" },
                        ]}
                        value={layoutSettings.basicSettings?.imageBehavior || "zoom"}
                        onChange={(value) => handleLayoutSettingsUpdate({
                          basicSettings: {
                            ...layoutSettings.basicSettings!,
                            imageBehavior: value as "zoom" | "lightbox" | "none"
                          }
                        })}
                        helpText="How images behave on interaction"
                      />

                      <Select
                        label="Image gallery type"
                        options={[
                          { label: "Thumbnails", value: "thumbnails" },
                          { label: "Dots", value: "dots" },
                          { label: "None", value: "none" },
                        ]}
                        value={layoutSettings.basicSettings?.imageGalleryType || "thumbnails"}
                        onChange={(value) => handleLayoutSettingsUpdate({
                          basicSettings: {
                            ...layoutSettings.basicSettings!,
                            imageGalleryType: value as "thumbnails" | "dots" | "none"
                          }
                        })}
                        helpText="Type of image gallery navigation"
                      />
                    </FormLayout.Group>

                    <FormLayout.Group>
                      <Select
                        label="Content width"
                        options={[
                          { label: "Narrow", value: "narrow" },
                          { label: "Medium", value: "medium" },
                          { label: "Wide", value: "wide" },
                        ]}
                        value={layoutSettings.basicSettings?.contentWidth || "medium"}
                        onChange={(value) => handleLayoutSettingsUpdate({
                          basicSettings: {
                            ...layoutSettings.basicSettings!,
                            contentWidth: value as "narrow" | "medium" | "wide"
                          }
                        })}
                        helpText="Width of the content container"
                      />

                      <Select
                        label="Mobile layout"
                        options={[
                          { label: "Stacked", value: "stacked" },
                          { label: "Horizontal scroll", value: "horizontal" },
                        ]}
                        value={layoutSettings.basicSettings?.mobileLayout || "stacked"}
                        onChange={(value) => handleLayoutSettingsUpdate({
                          basicSettings: {
                            ...layoutSettings.basicSettings!,
                            mobileLayout: value as "stacked" | "horizontal"
                          }
                        })}
                        helpText="Layout on mobile devices"
                      />
                    </FormLayout.Group>

                    <Checkbox
                      label="Show progress bar"
                      helpText="Display a progress bar for bundle completion"
                      checked={layoutSettings.basicSettings?.showProgressBar ?? true}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        basicSettings: {
                          ...layoutSettings.basicSettings!,
                          showProgressBar: value
                        }
                      })}
                    />

                    <Select
                      label="Step transition"
                      options={[
                        { label: "Slide", value: "slide" },
                        { label: "Fade", value: "fade" },
                        { label: "None", value: "none" },
                      ]}
                      value={layoutSettings.basicSettings?.stepTransition || "slide"}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        basicSettings: {
                          ...layoutSettings.basicSettings!,
                          stepTransition: value as "slide" | "fade" | "none"
                        }
                      })}
                      helpText="Animation between bundle steps"
                    />
                  </FormLayout>
                </BlockStack>
              </Box>
            </Box>
          )}

          {/* Modal-specific settings */}
          {layoutType === 'modal' && (
            <Box>
              <Divider />
              <Box paddingBlockStart="400">
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h4" fontWeight="semibold">
                    Modal Settings
                  </Text>

                  <FormLayout>
                    <Select
                      label="Trigger type"
                      options={[
                        { label: "Button", value: "button" },
                        { label: "Auto open", value: "auto" },
                        { label: "Exit intent", value: "exit-intent" },
                      ]}
                      value={layoutSettings.modalSettings?.triggerType || "button"}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        modalSettings: {
                          ...layoutSettings.modalSettings!,
                          triggerType: value as "button" | "auto" | "exit-intent"
                        }
                      })}
                      helpText="How the modal should be triggered"
                    />

                    <Select
                      label="Modal behavior"
                      options={[
                        { label: "Close on add", value: "closeOnAdd" },
                        { label: "Stay open", value: "stayOpen" },
                        { label: "Redirect to cart", value: "redirectToCart" },
                      ]}
                      value={layoutSettings.modalSettings?.modalBehavior || "stayOpen"}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        modalSettings: {
                          ...layoutSettings.modalSettings!,
                          modalBehavior: value as "closeOnAdd" | "stayOpen" | "redirectToCart"
                        }
                      })}
                      helpText="What happens after adding to cart"
                    />

                    <Checkbox
                      label="Block page scroll"
                      helpText="Prevent scrolling the main page when modal is open"
                      checked={layoutSettings.modalSettings?.blockPageScroll ?? true}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        modalSettings: {
                          ...layoutSettings.modalSettings!,
                          blockPageScroll: value
                        }
                      })}
                    />

                    <BlockStack gap="200">
                      <Text variant="bodyMd" fontWeight="medium">Modal size</Text>
                      <BlockStack gap="200">
                        <RadioButton
                          label="Product count"
                          helpText="Modal size adjusts based on number of products"
                          checked={layoutSettings.modalSettings?.modalSize === 'productCount'}
                          id="modalSizeProductCount"
                          name="modalSize"
                          onChange={() => handleLayoutSettingsUpdate({
                            modalSettings: {
                              ...layoutSettings.modalSettings!,
                              modalSize: 'productCount'
                            }
                          })}
                        />
                        <RadioButton
                          label="Fixed"
                          helpText="Modal has a fixed size regardless of content"
                          checked={layoutSettings.modalSettings?.modalSize === 'fixed'}
                          id="modalSizeFixed"
                          name="modalSize"
                          onChange={() => handleLayoutSettingsUpdate({
                            modalSettings: {
                              ...layoutSettings.modalSettings!,
                              modalSize: 'fixed'
                            }
                          })}
                        />
                      </BlockStack>
                    </BlockStack>
                  </FormLayout>
                </BlockStack>
              </Box>
            </Box>
          )}

          {/* Selection settings */}
          {layoutType === 'selection' && (
            <Box>
              <Divider />
              <Box paddingBlockStart="400">
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h4" fontWeight="semibold">
                    Selection Settings
                  </Text>

                  <FormLayout>
                    <Select
                      label="Selection mode"
                      options={[
                        { label: "Click", value: "click" },
                        { label: "Drag", value: "drag" },
                        { label: "Both", value: "both" },
                      ]}
                      value={layoutSettings.selectionSettings?.selectionMode || "click"}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        selectionSettings: {
                          ...layoutSettings.selectionSettings!,
                          selectionMode: value as "click" | "drag" | "both"
                        }
                      })}
                      helpText="How customers can select products"
                    />

                    <Select
                      label="Empty slot behavior"
                      options={[
                        { label: "Hide", value: "hide" },
                        { label: "Show", value: "show" },
                        { label: "Show ghost", value: "showGhost" },
                      ]}
                      value={layoutSettings.selectionSettings?.emptySlotBehavior || "show"}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        selectionSettings: {
                          ...layoutSettings.selectionSettings!,
                          emptySlotBehavior: value as "hide" | "show" | "showGhost"
                        }
                      })}
                      helpText="How to display empty selection slots"
                    />

                    <Select
                      label="Progress tracking"
                      options={[
                        { label: "Counter", value: "counter" },
                        { label: "Percentage", value: "percentage" },
                        { label: "Visual", value: "visual" },
                      ]}
                      value={layoutSettings.selectionSettings?.progressTracking || "counter"}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        selectionSettings: {
                          ...layoutSettings.selectionSettings!,
                          progressTracking: value as "counter" | "percentage" | "visual"
                        }
                      })}
                      helpText="How to show selection progress"
                    />

                    <TextField
                      label="Selection limit"
                      type="number"
                      value={layoutSettings.selectionSettings?.selectionLimit?.toString() || "10"}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        selectionSettings: {
                          ...layoutSettings.selectionSettings!,
                          selectionLimit: parseInt(value) || 10
                        }
                      })}
                      helpText="Maximum selections across all steps"
                      min={1}
                    />
                  </FormLayout>
                </BlockStack>
              </Box>
            </Box>
          )}

          {/* Stepper-specific settings */}
          {layoutType === 'stepper' && (
            <Box>
              <Divider />
              <Box paddingBlockStart="400">
                <BlockStack gap="400">
                  <Text variant="headingSm" as="h4" fontWeight="semibold">
                    Stepper Settings
                  </Text>

                  <FormLayout>
                    <Checkbox
                      label="Show progress bar"
                      helpText="Display a progress bar to show completion status"
                      checked={layoutSettings.stepperSettings?.showProgressBar ?? true}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        stepperSettings: {
                          ...layoutSettings.stepperSettings!,
                          showProgressBar: value
                        }
                      })}
                    />

                    {layoutSettings.stepperSettings?.showProgressBar && (
                      <BlockStack gap="200">
                        <Text variant="bodyMd" fontWeight="medium">Progress bar position</Text>
                        <BlockStack gap="200">
                          <RadioButton
                            label="Top"
                            helpText="Show progress bar at the top of the stepper"
                            checked={layoutSettings.stepperSettings?.progressBarPosition === 'top'}
                            id="progressBarTop"
                            name="progressBarPosition"
                            onChange={() => handleLayoutSettingsUpdate({
                              stepperSettings: {
                                ...layoutSettings.stepperSettings!,
                                progressBarPosition: 'top'
                              }
                            })}
                          />
                          <RadioButton
                            label="Bottom"
                            helpText="Show progress bar at the bottom of the stepper"
                            checked={layoutSettings.stepperSettings?.progressBarPosition === 'bottom'}
                            id="progressBarBottom"
                            name="progressBarPosition"
                            onChange={() => handleLayoutSettingsUpdate({
                              stepperSettings: {
                                ...layoutSettings.stepperSettings!,
                                progressBarPosition: 'bottom'
                              }
                            })}
                          />
                        </BlockStack>
                      </BlockStack>
                    )}

                    <Checkbox
                      label="Allow back navigation"
                      helpText="Let customers go back to previous steps"
                      checked={layoutSettings.stepperSettings?.allowBackNavigation ?? true}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        stepperSettings: {
                          ...layoutSettings.stepperSettings!,
                          allowBackNavigation: value
                        }
                      })}
                    />

                    <Checkbox
                      label="Show step numbers"
                      helpText="Display step numbers in the progress indicator"
                      checked={layoutSettings.stepperSettings?.showStepNumbers ?? true}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        stepperSettings: {
                          ...layoutSettings.stepperSettings!,
                          showStepNumbers: value
                        }
                      })}
                    />

                    <Select
                      label="Completion behavior"
                      options={[
                        { label: "Summary", value: "summary" },
                        { label: "Auto-add to cart", value: "auto-add" },
                        { label: "Redirect to cart", value: "redirect" },
                      ]}
                      value={layoutSettings.stepperSettings?.completionBehavior || "summary"}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        stepperSettings: {
                          ...layoutSettings.stepperSettings!,
                          completionBehavior: value as "summary" | "auto-add" | "redirect"
                        }
                      })}
                      helpText="What happens when all steps are completed"
                    />

                    <Select
                      label="Animation style"
                      options={[
                        { label: "Slide", value: "slide" },
                        { label: "Fade", value: "fade" },
                        { label: "None", value: "none" },
                      ]}
                      value={layoutSettings.stepperSettings?.animationStyle || "slide"}
                      onChange={(value) => handleLayoutSettingsUpdate({
                        stepperSettings: {
                          ...layoutSettings.stepperSettings!,
                          animationStyle: value as "slide" | "fade" | "none"
                        }
                      })}
                      helpText="Transition effect between steps"
                    />
                  </FormLayout>
                </BlockStack>
              </Box>
            </Box>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}