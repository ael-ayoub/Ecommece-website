import { adminCategoriesRepository } from "./categories.repository.js";
import { slugify } from "../../../lib/slugify.js";
import { recordAuditLog } from "../../../lib/audit.js";
import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import type { z } from "zod";
import type { createCategoryBodySchema, updateCategoryBodySchema } from "./categories.schema.js";

type CreateCategoryInput = z.infer<typeof createCategoryBodySchema>;
type UpdateCategoryInput = z.infer<typeof updateCategoryBodySchema>;

export const adminCategoriesService = {
  list(includeDeleted: boolean) {
    return adminCategoriesRepository.list(includeDeleted);
  },

  async getById(id: string) {
    const category = await adminCategoriesRepository.findById(id);
    if (!category) throw new NotFoundError("Category not found");
    return category;
  },

  async create(adminId: string, input: CreateCategoryInput) {
    const slug = slugify(input.slug ?? input.name);
    const existing = await adminCategoriesRepository.findBySlug(slug);
    if (existing) throw new ConflictError(`Slug "${slug}" is already in use`);

    const category = await adminCategoriesRepository.create({
      name: input.name,
      slug,
      image_url: input.image_url,
      parent: input.parent_id ? { connect: { id: input.parent_id } } : undefined,
    });

    await recordAuditLog({ adminId, action: "category.created", entityType: "category", entityId: category.id, after: category });
    return category;
  },

  async update(adminId: string, id: string, input: UpdateCategoryInput) {
    const before = await adminCategoriesRepository.findById(id);
    if (!before) throw new NotFoundError("Category not found");

    if (input.parent_id === id) throw new ConflictError("A category cannot be its own parent");

    let slug = before.slug;
    if (input.slug || input.name) {
      slug = slugify(input.slug ?? input.name ?? before.name);
      if (slug !== before.slug) {
        const existing = await adminCategoriesRepository.findBySlug(slug);
        if (existing) throw new ConflictError(`Slug "${slug}" is already in use`);
      }
    }

    const updated = await adminCategoriesRepository.update(id, {
      name: input.name,
      slug,
      image_url: input.image_url,
      parent: input.parent_id === undefined ? undefined : input.parent_id === null ? { disconnect: true } : { connect: { id: input.parent_id } },
    });

    await recordAuditLog({ adminId, action: "category.updated", entityType: "category", entityId: id, before, after: updated });
    return updated;
  },

  /** Soft delete only — refuses if products or subcategories still reference it. */
  async remove(adminId: string, id: string) {
    const before = await adminCategoriesRepository.findById(id);
    if (!before) throw new NotFoundError("Category not found");

    const [productCount, childCount] = await Promise.all([
      adminCategoriesRepository.countProductsInCategory(id),
      adminCategoriesRepository.countChildren(id),
    ]);
    if (productCount > 0) throw new ConflictError("Cannot delete a category that still has products — move or delete them first");
    if (childCount > 0) throw new ConflictError("Cannot delete a category that still has subcategories");

    const deleted = await adminCategoriesRepository.softDelete(id);
    await recordAuditLog({ adminId, action: "category.deleted", entityType: "category", entityId: id, before, after: deleted });
    return { message: "Category deleted" };
  },
};
