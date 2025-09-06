export default `#graphql
  query ProductVariant ($id: ID!) {
    productVariant(id: $id) {
      title
      image {
        url
      }
      product {
        title
        media(first: 1, query: "media_type=IMAGE") {
          nodes {
            ... on MediaImage {
              image {
                url
              }
            }
          }
        }
      }
    }
  }
`;
