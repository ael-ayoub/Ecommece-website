import { productsRepository, type PublicProductFilter } from "./products.repository.js";
import { serializePublicProduct } from "../../lib/serializers.js";
import { NotFoundError } from "../../lib/errors.js";
import { paginationMeta } from "../../lib/common-schemas.js";

export const productsService = {
  async list(filter: PublicProductFilter) {
    const { items, total } = await productsRepository.list(filter);
    return { items: items.map(serializePublicProduct), meta: paginationMeta(filter.page, filter.pageSize, total) };
  },

  async getBySlug(slug: string) {
    const product = await productsRepository.findVisibleBySlug(slug);
    if (!product) throw new NotFoundError("Product not found");
    return serializePublicProduct(product);
  },

  async related(slug: string, limit = 8) {
    const product = await productsRepository.findVisibleBySlug(slug);
    if (!product) throw new NotFoundError("Product not found");
    const related = await productsRepository.findRelated(product.category_id, product.id, limit);
    return related.map(serializePublicProduct);
  },
};
