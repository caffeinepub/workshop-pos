// Stub hook - old products system replaced by inventory management
export function useProducts() {
  return {
    data: [] as unknown[],
    isLoading: false,
    deleteProduct: (_id: string) => {},
  };
}
