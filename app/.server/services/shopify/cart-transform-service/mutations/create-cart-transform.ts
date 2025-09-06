export default `#graphql
mutation cartTransformCreate($functionId: String!) {
  cartTransformCreate(functionId: $functionId) {
    cartTransform {
      id
    }
    userErrors {
      field
      message
    }
  }
}
`;
