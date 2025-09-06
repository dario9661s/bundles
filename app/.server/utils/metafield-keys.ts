export function getFirstFreeMetafieldKey(usedMetafieldKeys: string[]) {
  return (
    getAllAvailableMetafieldKeys().filter(
      (metafieldKey) => !usedMetafieldKeys.includes(metafieldKey),
    )[0] || undefined
  );
}

export function getAllAvailableMetafieldKeys() {
  return [
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
}
