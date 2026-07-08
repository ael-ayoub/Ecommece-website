import { adminProductsRepository, type ListProductsFilter } from "./products.repository.js";
import { slugify } from "../../../lib/slugify.js";
import { serializeAdminProduct } from "../../../lib/serializers.js";
import { recordAuditLog } from "../../../lib/audit.js";
import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import { paginationMeta } from "../../../lib/common-schemas.js";
import type { z } from "zod";
import type { createProductBodySchema, updateProductBodySchema, updateStockBodySchema } from "./products.schema.js";

type CreateProductInput = z.infer<typeof createProductBodySchema>;
type UpdateProductInput = z.infer<typeof updateProductBodySchema>;
type UpdateStockInput = z.infer<typeof updateStockBodySchema>;

export const adminProductsService = {
  async list(filter: ListProductsFilter) {
    const { items, total } = await adminProductsRepository.list(filter);
    return {
      items: items.map(serializeAdminProduct),
      meta: paginationMeta(filter.page, filter.pageSize, total),
    };
  },

  async getById(id: string) {
    const product = await adminProductsRepository.findByIdIncludingDeleted(id);
    if (!product) throw new NotFoundError("Product not found");
    return serializeAdminProduct(product);
  },

  async create(adminId: string, input: CreateProductInput) {
    const slug = slugify(input.slug ?? input.name);
    const existing = await adminProductsRepository.findBySlug(slug);
    if (existing) throw new ConflictError(`Slug "${slug}" is already in use`);

    const product = await adminProductsRepository.create({
      category: { connect: { id: input.category_id } },
      name: input.name,
      slug,
      description: input.description,
      price: input.price,
      cost_price: input.cost_price,
      stock_real: input.stock_real,
      stock_display: input.stock_display,
      is_enabled: input.is_enabled,
      images: input.images,
    });

    await recordAuditLog({
      adminId,
      action: "product.created",
      entityType: "product",
      entityId: product.id,
      after: serializeAdminProduct(product),
    });

    return serializeAdminProduct(product);
  },

  async update(adminId: string, id: string, input: UpdateProductInput) {
    const before = await adminProductsRepository.findByIdIncludingDeleted(id);
    if (!before) throw new NotFoundError("Product not found");

    let slug = before.slug;
    if (input.slug || input.name) {
      slug = slugify(input.slug ?? input.name ?? before.name);
      if (slug !== before.slug) {
        const existing = await adminProductsRepository.findBySlug(slug);
        if (existing) throw new ConflictError(`Slug "${slug}" is already in use`);
      }
    }

    const updated = await adminProductsRepository.update(id, {
      category: input.category_id ? { connect: { id: input.category_id } } : undefined,
      name: input.name,
      slug,
      description: input.description,
      price: input.price,
      cost_price: input.cost_price,
      stock_real: input.stock_real,
      stock_display: input.stock_display,
      is_enabled: input.is_enabled,
      images: input.images,
    });

    await recordAuditLog({
      adminId,
      action: "product.updated",
      entityType: "product",
      entityId: id,
      before: serializeAdminProduct(before),
      after: serializeAdminProduct(updated),
    });

    return serializeAdminProduct(updated);
  },

  async updateStock(adminId: string, id: string, input: UpdateStockInput) {
    const before = await adminProductsRepository.findByIdIncludingDeleted(id);
    if (!before) throw new NotFoundError("Product not found");

    const updated = await adminProductsRepository.update(id, {
      stock_real: input.stock_real,
      stock_display: input.stock_display,
    });

    await recordAuditLog({
      adminId,
      action: "product.stock_updated",
      entityType: "product",
      entityId: id,
      before: { stock_real: before.stock_real, stock_display: before.stock_display },
      after: { stock_real: updated.stock_real, stock_display: updated.stock_display },
    });

    return serializeAdminProduct(updated);
  },

  async toggleEnabled(adminId: string, id: string, isEnabled: boolean) {
    const before = await adminProductsRepository.findByIdIncludingDeleted(id);
    if (!before) throw new NotFoundError("Product not found");

    const updated = await adminProductsRepository.update(id, { is_enabled: isEnabled });

    await recordAuditLog({
      adminId,
      action: isEnabled ? "product.enabled" : "product.disabled",
      entityType: "product",
      entityId: id,
      before: { is_enabled: before.is_enabled },
      after: { is_enabled: updated.is_enabled },
    });

    return serializeAdminProduct(updated);
  },

  /** Soft delete only — a product referenced by past order_items must never be hard-deleted. */
  async remove(adminId: string, id: string) {
    const before = await adminProductsRepository.findByIdIncludingDeleted(id);
    if (!before) throw new NotFoundError("Product not found");

    const deleted = await adminProductsRepository.softDelete(id);

    await recordAuditLog({
      adminId,
      action: "product.deleted",
      entityType: "product",
      entityId: id,
      before: serializeAdminProduct(before),
      after: serializeAdminProduct(deleted),
    });

    return { message: "Product deleted" };
  },
};
