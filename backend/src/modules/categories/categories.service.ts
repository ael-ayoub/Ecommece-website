import { categoriesRepository } from "./categories.repository.js";
import { NotFoundError } from "../../lib/errors.js";

function serialize(category: { id: string; parent_id: string | null; name: string; slug: string; image_url: string | null }) {
  return {
    id: category.id,
    parent_id: category.parent_id,
    name: category.name,
    slug: category.slug,
    image_url: category.image_url,
  };
}

export const categoriesService = {
  async list() {
    const categories = await categoriesRepository.listVisible();
    return categories.map(serialize);
  },

  async getBySlug(slug: string) {
    const category = await categoriesRepository.findBySlug(slug);
    if (!category) throw new NotFoundError("Category not found");
    return serialize(category);
  },
};
