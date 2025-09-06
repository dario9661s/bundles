export default `#graphql
mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      key
      namespace
      ownerType
      value
    }
    userErrors {
      field
      message
    }
  }
}
`;
