import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type { CategoryInput } from "@/lib/validators";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function listCategories() {
  return db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
}

export async function createCategory(input: CategoryInput) {
  const slug = slugify(input.name);

  const existing = await db.category.findUnique({ where: { slug } });
  if (existing) {
    throw new ConflictError("A category with this name already exists.");
  }

  return db.category.create({ data: { name: input.name, slug } });
}

export async function updateCategory(id: number, input: CategoryInput) {
  const category = await db.category.findUnique({ where: { id } });
  if (!category) {
    throw new NotFoundError("Category not found.");
  }

  const slug = slugify(input.name);
  if (slug !== category.slug) {
    const clash = await db.category.findUnique({ where: { slug } });
    if (clash) {
      throw new ConflictError("A category with this name already exists.");
    }
  }

  return db.category.update({ where: { id }, data: { name: input.name, slug } });
}

// One-category-per-product rule (architecture.md §8) means a category with
// products still assigned to it can't be removed without orphaning them —
// enforced here with a clear message before the DB's own onDelete: Restrict
// FK constraint would otherwise surface as an opaque database error.
export async function deleteCategory(id: number) {
  const category = await db.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) {
    throw new NotFoundError("Category not found.");
  }

  if (category._count.products > 0) {
    throw new ConflictError(
      `This category has ${category._count.products} product(s) — reassign or remove them before deleting.`,
    );
  }

  return db.category.delete({ where: { id } });
}
