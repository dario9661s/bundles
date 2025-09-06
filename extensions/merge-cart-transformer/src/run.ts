import type {
  RunInput,
  FunctionRunResult,
  CartOperation,
} from "../generated/api";

const NO_CHANGES: FunctionRunResult = {
  operations: [],
};

type LineItemPropertyKey =
  | "lineItemProperty1"
  | "lineItemProperty2"
  | "lineItemProperty3"
  | "lineItemProperty4"
  | "lineItemProperty5"
  | "lineItemProperty6"
  | "lineItemProperty7"
  | "lineItemProperty8"
  | "lineItemProperty9"
  | "lineItemProperty10";

export function run(input: RunInput): FunctionRunResult {
  // If there is no merge config, we just abort
  if (!input.cartTransform.mergeConfigurations) {
    console.error("No merge configurations found.");

    return NO_CHANGES;
  }

  const mergeConfigurations = JSON.parse(
    input.cartTransform.mergeConfigurations.value,
  );

  const lineItemProperties: LineItemPropertyKey[] = [
    "lineItemProperty1",
    "lineItemProperty2",
    "lineItemProperty3",
    "lineItemProperty4",
    "lineItemProperty5",
    "lineItemProperty6",
    "lineItemProperty7",
    "lineItemProperty8",
    "lineItemProperty9",
    "lineItemProperty10",
  ];

  // This will create an object with all active lineItemProperty attributes from the merge configuration
  const groupedItems: Record<
    string,
    Record<
      string,
      {
        id: string;
        quantity: number;
        merchandise: { id: string; product: { title: string } };
      }[]
    >
  > = Object.fromEntries(
    lineItemProperties
      .filter((lineItemProperty) => mergeConfigurations[lineItemProperty])
      .map((lineItemProperty) => [lineItemProperty, {}]),
  );

  lineItemProperties.forEach((lineItemProperty) => {
    input.cart.lines.forEach((line) => {
      if (!("product" in line.merchandise)) {
        return;
      }

      const lineItemPropertyValue = line[lineItemProperty]?.value;
      if (!lineItemPropertyValue) {
        return;
      }

      if (!groupedItems[lineItemProperty][lineItemPropertyValue]) {
        groupedItems[lineItemProperty][lineItemPropertyValue] = [];
      }

      // @ts-ignore We know that we have a ProductVariant since we filter before
      groupedItems[lineItemProperty][lineItemPropertyValue].push(line);
    });
  });

  const mergeOperations = Object.keys(groupedItems)
    .flatMap((lineItemProperty) => {
      const lineItemPropertyValue = mergeConfigurations[lineItemProperty];
      const extensionProducts =
        mergeConfigurations.mergeConfigurations[lineItemPropertyValue];

      if (
        !extensionProducts ||
        !Array.isArray(extensionProducts) ||
        !extensionProducts.length
      ) {
        console.error(
          `No extension products for merge configuration ${lineItemProperty}.`,
        );

        return null;
      }

      return Object.values(groupedItems[lineItemProperty]).map((group) => {
        const parentProduct = group.find(
          (product) => !extensionProducts.includes(product.merchandise.id),
        );

        if (!parentProduct) {
          return null;
        }

        const mergeOperation: CartOperation = {
          merge: {
            cartLines: group.map((line) => {
              return {
                cartLineId: line.id,
                quantity: line.quantity,
              };
            }),
            title: group
              .map((line) => line.merchandise.product.title)
              .join(" + "),
            parentVariantId: parentProduct.merchandise.id,
          },
        };
        return mergeOperation;
      });
    })
    .filter((mergeOperation) => mergeOperation !== null);

  return {
    operations: mergeOperations,
  };
}
