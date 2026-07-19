import { Prisma, OptionTemplateOwnerType } from "@prisma/client";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  normalizedTemplateKey,
  normalizeTemplateText,
  rankOptionTemplates,
} from "@/domain/option-template";
import type { OptionTemplateCreateInput, OptionTemplateUpdateInput } from "@/lib/validators";

const templateInclude = {
  values: { where: { isActive: true }, orderBy: { position: "asc" as const } },
  categories: true,
  preferences: true,
} as const;

function duplicateConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ConflictError("A template or value with the same normalized name already exists.");
  }
  throw error;
}

export async function listOptionTemplates(
  userId: number,
  params: { categoryId?: number; search?: string } = {},
) {
  const templates = await db.optionTemplate.findMany({
    where: {
      isActive: true,
      OR: [
        { ownerType: OptionTemplateOwnerType.SYSTEM },
        { ownerType: OptionTemplateOwnerType.USER, ownerUserId: userId },
      ],
      ...(params.search ? { name: { contains: params.search, mode: "insensitive" as const } } : {}),
    },
    include: templateInclude,
  });

  return rankOptionTemplates(
    templates.map((template) => {
      const preference = template.preferences.find((item) => item.userId === userId);
      const recommendation = params.categoryId
        ? template.categories.find((item) => item.categoryId === params.categoryId)
        : undefined;
      return {
        ...template,
        preferences: undefined,
        recommendedPriority: recommendation?.priority ?? null,
        isPinned: preference?.isPinned ?? false,
        usageCount: preference?.usageCount ?? 0,
        lastUsedAt: preference?.lastUsedAt ?? null,
        source: template.ownerType === "SYSTEM" ? "COMMON" : "SAVED",
      };
    }),
  );
}

export async function createPersonalOptionTemplate(
  userId: number,
  input: OptionTemplateCreateInput,
) {
  try {
    let sourceValues = input.values;
    let inputType = input.inputType;
    let description = input.description;
    if (input.cloneFromTemplateId) {
      const source = await db.optionTemplate.findFirst({
        where: {
          id: input.cloneFromTemplateId,
          isActive: true,
          OR: [{ ownerType: "SYSTEM" }, { ownerUserId: userId }],
        },
        include: { values: { where: { isActive: true }, orderBy: { position: "asc" } } },
      });
      if (!source) throw new NotFoundError("Template not found.");
      sourceValues = source.values.map((value) => ({
        value: value.value,
        metadata:
          value.metadata && typeof value.metadata === "object"
            ? (value.metadata as Record<string, unknown>)
            : null,
        isActive: true,
      }));
      inputType = source.inputType;
      description ??= source.description;
    }
    const uniqueValues = new Set<string>();
    const values = sourceValues.map((item, position) => {
      const value = normalizeTemplateText(item.value);
      const normalizedValue = normalizedTemplateKey(value);
      if (uniqueValues.has(normalizedValue)) {
        throw new ConflictError("Template values must be unique.");
      }
      uniqueValues.add(normalizedValue);
      return {
        value,
        normalizedValue,
        metadata: item.metadata ? (item.metadata as Prisma.InputJsonValue) : undefined,
        isActive: item.isActive,
        position,
      };
    });
    return await db.optionTemplate.create({
      data: {
        ownerType: OptionTemplateOwnerType.USER,
        ownerUserId: userId,
        name: normalizeTemplateText(input.name),
        normalizedName: normalizedTemplateKey(input.name),
        inputType,
        description,
        values: { create: values },
        categories: {
          create: input.categoryIds.map((categoryId, priority) => ({
            categoryId,
            priority: input.categoryIds.length - priority,
          })),
        },
      },
      include: templateInclude,
    });
  } catch (error) {
    duplicateConflict(error);
  }
}

async function requireOwnedTemplate(userId: number, templateId: number) {
  const template = await db.optionTemplate.findFirst({
    where: {
      id: templateId,
      ownerType: OptionTemplateOwnerType.USER,
      ownerUserId: userId,
    },
  });
  if (!template) throw new NotFoundError("Template not found.");
  return template;
}

export async function updatePersonalOptionTemplate(
  userId: number,
  templateId: number,
  input: OptionTemplateUpdateInput,
) {
  await requireOwnedTemplate(userId, templateId);
  try {
    return await db.$transaction(async (tx) => {
      if (input.values) {
        await tx.optionTemplateValue.deleteMany({ where: { templateId } });
      }
      if (input.categoryIds) {
        await tx.optionTemplateCategory.deleteMany({ where: { templateId } });
      }
      return tx.optionTemplate.update({
        where: { id: templateId },
        data: {
          ...(input.name
            ? {
                name: normalizeTemplateText(input.name),
                normalizedName: normalizedTemplateKey(input.name),
              }
            : {}),
          ...(input.inputType ? { inputType: input.inputType } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.values
            ? {
                values: {
                  create: input.values.map((item, position) => ({
                    value: normalizeTemplateText(item.value),
                    normalizedValue: normalizedTemplateKey(item.value),
                    metadata: item.metadata ? (item.metadata as Prisma.InputJsonValue) : undefined,
                    isActive: item.isActive,
                    position,
                  })),
                },
              }
            : {}),
          ...(input.categoryIds
            ? {
                categories: {
                  create: input.categoryIds.map((categoryId, priority) => ({
                    categoryId,
                    priority: input.categoryIds!.length - priority,
                  })),
                },
              }
            : {}),
        },
        include: templateInclude,
      });
    });
  } catch (error) {
    duplicateConflict(error);
  }
}

export async function disablePersonalOptionTemplate(userId: number, templateId: number) {
  await requireOwnedTemplate(userId, templateId);
  return db.optionTemplate.update({ where: { id: templateId }, data: { isActive: false } });
}

export async function setOptionTemplatePinned(
  userId: number,
  templateId: number,
  isPinned: boolean,
) {
  const visible = await db.optionTemplate.findFirst({
    where: {
      id: templateId,
      isActive: true,
      OR: [{ ownerType: "SYSTEM" }, { ownerUserId: userId }],
    },
  });
  if (!visible) throw new NotFoundError("Template not found.");
  return db.userOptionTemplatePreference.upsert({
    where: { userId_templateId: { userId, templateId } },
    create: { userId, templateId, isPinned },
    update: { isPinned },
  });
}

export async function recordOptionTemplateUsage(userId: number, templateIds: number[]) {
  const uniqueIds = Array.from(new Set(templateIds));
  await db.$transaction(
    uniqueIds.map((templateId) =>
      db.userOptionTemplatePreference.upsert({
        where: { userId_templateId: { userId, templateId } },
        create: { userId, templateId, usageCount: 1, lastUsedAt: new Date() },
        update: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
      }),
    ),
  );
}
