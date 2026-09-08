"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productFormSchema, type ProductFormInput } from "@/lib/admin-validation";
import type { Category, Material, Product } from "@/lib/types";
import type { PlaceholderTone } from "@/components/placeholder-photo";
import type { ProductMutationResult } from "@/server/repositories/product-repository";
import type { ProductMaterialUsageWithMaterial, RawMaterial } from "@/server/types";
import { uploadImageAction } from "@/app/actions/upload";
import { formatPrice } from "@/lib/format";

const TYPES: { value: Product["type"]; label: string }[] = [
  { value: "pronta_entrega", label: "Pronta entrega" },
  { value: "sob_encomenda", label: "Sob encomenda" },
];

const IMAGE_TONES: { value: PlaceholderTone; label: string }[] = [
  { value: "fitness", label: "Fitness" },
  { value: "surf", label: "Surf" },
  { value: "street", label: "Street" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "ink", label: "Ink" },
  { value: "sand", label: "Sand" },
];

function labelClass() {
  return "label-caps text-[11px] text-graphite";
}

function inputClass(hasError?: boolean) {
  return `border px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm ${hasError ? "border-red-500" : "border-mist"}`;
}

export type ProductFormAction = (input: ProductFormInput) => Promise<ProductMutationResult>;

export function ProductForm({
  product,
  categories,
  materials,
  rawMaterials,
  materialUsages,
  action,
}: {
  product?: Product;
  categories: Category[];
  materials: Material[];
  rawMaterials: RawMaterial[];
  materialUsages?: ProductMaterialUsageWithMaterial[];
  action: ProductFormAction;
}) {
  const router = useRouter();
  const isEditing = Boolean(product);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          slug: product.slug,
          name: product.name,
          categorySlug: product.categorySlug,
          type: product.type,
          price: product.price ?? "",
          compareAtPrice: product.compareAtPrice ?? "",
          stock: product.stock,
          materials: product.materials,
          scaleOptions: product.scaleOptions,
          weightGrams: product.weightGrams ?? "",
          dimensions: product.dimensions ?? "",
          estimatedProductionDays: product.estimatedProductionDays ?? "",
          description: product.description,
          tagsRaw: product.tags.join(", "),
          isNew: product.isNew ?? false,
          isBestSeller: product.isBestSeller ?? false,
          imageTone: product.imageTone,
          images: product.images ?? [],
          laborCost: product.laborCost ?? "",
          materialUsages: (materialUsages ?? []).map((usage) => ({
            rawMaterialId: usage.rawMaterialId,
            quantity: usage.quantity,
          })),
        }
      : {
          type: "pronta_entrega",
          categorySlug: categories[0]?.slug ?? "",
          materials: [],
          scaleOptions: [],
          stock: 0,
          images: [],
          materialUsages: [],
        },
  });

  const materialFields = useFieldArray({ control, name: "materials" });
  const usageFields = useFieldArray({ control, name: "materialUsages" });
  const [scaleItems, setScaleItems] = useState<string[]>(product?.scaleOptions ?? []);
  const [imageItems, setImageItems] = useState<string[]>(product?.images ?? []);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const selectedType = watch("type");
  const watchedMaterials = watch("materials") ?? [];
  const watchedUsages = watch("materialUsages") ?? [];
  const watchedLaborCost = watch("laborCost");
  const watchedPrice = watch("price");

  const rawMaterialById = new Map(rawMaterials.map((rm) => [rm.id, rm]));
  const materialCost = watchedUsages.reduce((sum, usage) => {
    const rawMaterial = usage?.rawMaterialId ? rawMaterialById.get(usage.rawMaterialId) : undefined;
    const quantity = typeof usage?.quantity === "number" ? usage.quantity : 0;
    return sum + (rawMaterial ? quantity * rawMaterial.costPerUnit : 0);
  }, 0);
  const laborCostValue = typeof watchedLaborCost === "number" ? watchedLaborCost : 0;
  const totalCost = materialCost + laborCostValue;
  const priceValue = typeof watchedPrice === "number" ? watchedPrice : undefined;
  const margin = priceValue !== undefined ? priceValue - totalCost : undefined;
  const marginPercent = priceValue !== undefined && priceValue > 0 ? (margin! / priceValue) * 100 : undefined;

  const updateScales = (next: string[]) => {
    setScaleItems(next);
    setValue("scaleOptions", next, { shouldValidate: true });
  };

  const updateImages = (next: string[]) => {
    setImageItems(next);
    setValue("images", next, { shouldValidate: true });
  };

  const handleImageUpload = async (index: number, file: File) => {
    setUploadError(null);
    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadImageAction(formData);
      if (!result.success) {
        setUploadError(result.error);
        return;
      }
      const next = [...imageItems];
      next[index] = result.url;
      updateImages(next);
    } catch {
      setUploadError("Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setUploadingIndex(null);
    }
  };

  const toggleMaterialColor = (materialIndex: number, colorName: string) => {
    const current = watchedMaterials[materialIndex]?.colors ?? [];
    const next = current.includes(colorName)
      ? current.filter((c) => c !== colorName)
      : [...current, colorName];
    setValue(`materials.${materialIndex}.colors`, next, { shouldValidate: true });
  };

  const onSubmit = async (data: ProductFormInput) => {
    setServerError(null);
    const result = await action(data);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push("/admin/produtos");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="name">
            Nome
          </label>
          <input id="name" className={inputClass(Boolean(errors.name))} {...register("name")} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="slug">
            Slug (URL)
          </label>
          <input
            id="slug"
            disabled={isEditing}
            className={`${inputClass(Boolean(errors.slug))} disabled:bg-mist/40 disabled:text-graphite`}
            {...register("slug")}
          />
          {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="categorySlug">
            Categoria
          </label>
          <select id="categorySlug" className={inputClass(Boolean(errors.categorySlug))} {...register("categorySlug")}>
            <option value="">Selecione…</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.categorySlug && <p className="text-xs text-red-600">{errors.categorySlug.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className={labelClass()}>Tipo</p>
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setValue("type", t.value, { shouldValidate: true })}
                className={`label-caps border px-3.5 py-2 text-[11px] transition-colors ${
                  selectedType === t.value ? "border-ink bg-ink text-paper" : "border-mist text-graphite hover:border-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="price">
            Preço (R$, opcional)
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            className={inputClass(Boolean(errors.price))}
            {...register("price", { setValueAs: (v) => (v === "" ? "" : Number(v)) })}
          />
          <p className="text-[11px] text-graphite">Deixe em branco para &ldquo;Sob consulta&rdquo;.</p>
          {errors.price && <p className="text-xs text-red-600">{errors.price.message}</p>}
          {isEditing && product && (
            <Link
              href={`/admin/precificacao?produto=${product.slug}`}
              className="text-[11px] text-petrol hover:underline"
            >
              Calcular preço →
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="compareAtPrice">
            Preço &ldquo;de&rdquo; (opcional)
          </label>
          <input
            id="compareAtPrice"
            type="number"
            step="0.01"
            className={inputClass()}
            {...register("compareAtPrice", { setValueAs: (v) => (v === "" ? "" : Number(v)) })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="stock">
            Estoque
          </label>
          <input
            id="stock"
            type="number"
            className={inputClass(Boolean(errors.stock))}
            {...register("stock", { valueAsNumber: true })}
          />
          {errors.stock && <p className="text-xs text-red-600">{errors.stock.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="laborCost">
            Mão de obra (R$, opcional)
          </label>
          <input
            id="laborCost"
            type="number"
            step="0.01"
            className={inputClass(Boolean(errors.laborCost))}
            {...register("laborCost", { setValueAs: (v) => (v === "" ? "" : Number(v)) })}
          />
          {errors.laborCost && <p className="text-xs text-red-600">{errors.laborCost.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="weightGrams">
            Peso (g, opcional)
          </label>
          <input
            id="weightGrams"
            type="number"
            className={inputClass()}
            {...register("weightGrams", { setValueAs: (v) => (v === "" ? "" : Number(v)) })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="dimensions">
            Dimensões (opcional)
          </label>
          <input
            id="dimensions"
            placeholder="10 x 10 x 15 cm"
            className={inputClass()}
            {...register("dimensions")}
          />
        </div>

        {selectedType === "sob_encomenda" && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass()} htmlFor="estimatedProductionDays">
              Prazo de produção (dias)
            </label>
            <input
              id="estimatedProductionDays"
              type="number"
              className={inputClass()}
              {...register("estimatedProductionDays", { setValueAs: (v) => (v === "" ? "" : Number(v)) })}
            />
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className={labelClass()}>Materiais e cores</p>
          <button
            type="button"
            onClick={() => materialFields.append({ material: materials[0]?.name ?? "", colors: [] })}
            disabled={materials.length === 0}
            className="label-caps text-[11px] text-petrol hover:underline disabled:pointer-events-none disabled:text-graphite"
          >
            + adicionar material
          </button>
        </div>
        {materials.length === 0 ? (
          <p className="text-xs text-graphite">
            Nenhum material cadastrado ainda. Crie materiais em{" "}
            <a href="/admin/materiais" className="text-petrol hover:underline">
              Admin → Materiais
            </a>{" "}
            antes de montar este produto.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {materialFields.fields.map((field, index) => {
              const selectedName = watchedMaterials[index]?.material ?? "";
              const materialDef = materials.find((m) => m.name === selectedName);
              const selectedColors = watchedMaterials[index]?.colors ?? [];
              return (
                <div key={field.id} className="border border-mist p-3">
                  <div className="flex items-center gap-2">
                    <select
                      className={`flex-1 ${inputClass()}`}
                      {...register(`materials.${index}.material`)}
                    >
                      {materials.map((m) => (
                        <option key={m.slug} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => materialFields.remove(index)}
                      className="label-caps shrink-0 px-2 text-[11px] text-graphite hover:text-red-600"
                    >
                      remover
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(materialDef?.colors ?? []).map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => toggleMaterialColor(index, c.name)}
                        className={`label-caps flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] transition-colors ${
                          selectedColors.includes(c.name)
                            ? "border-ink bg-ink text-paper"
                            : "border-mist text-graphite hover:border-ink"
                        }`}
                      >
                        <span className="h-3 w-3 rounded-full border border-mist" style={{ backgroundColor: c.hex }} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                  {errors.materials?.[index]?.colors && (
                    <p className="mt-1 text-xs text-red-600">{errors.materials[index]?.colors?.message}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {errors.materials && !Array.isArray(errors.materials) && (
          <p className="mt-1 text-xs text-red-600">{errors.materials.message}</p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className={labelClass()}>Consumo de insumos (BOM)</p>
          <button
            type="button"
            onClick={() => usageFields.append({ rawMaterialId: rawMaterials[0]?.id ?? "", quantity: 0 })}
            disabled={rawMaterials.length === 0}
            className="label-caps text-[11px] text-petrol hover:underline disabled:pointer-events-none disabled:text-graphite"
          >
            + adicionar insumo
          </button>
        </div>
        {rawMaterials.length === 0 ? (
          <p className="text-xs text-graphite">
            Nenhum insumo cadastrado ainda. Crie insumos em{" "}
            <a href="/admin/insumos" className="text-petrol hover:underline">
              Admin → Insumos
            </a>{" "}
            para montar a ficha técnica deste produto.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {usageFields.fields.map((field, index) => {
              const selectedId = watchedUsages[index]?.rawMaterialId ?? "";
              const rawMaterial = rawMaterialById.get(selectedId);
              return (
                <div key={field.id} className="flex items-center gap-2">
                  <select
                    className={`flex-1 ${inputClass()}`}
                    {...register(`materialUsages.${index}.rawMaterialId`)}
                  >
                    {rawMaterials.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name} ({rm.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Quantidade"
                    className={`w-32 ${inputClass(Boolean(errors.materialUsages?.[index]?.quantity))}`}
                    {...register(`materialUsages.${index}.quantity`, { valueAsNumber: true })}
                  />
                  <span className="w-14 shrink-0 text-[11px] text-graphite">{rawMaterial?.unit ?? ""}</span>
                  <button
                    type="button"
                    onClick={() => usageFields.remove(index)}
                    className="label-caps shrink-0 px-2 text-[11px] text-graphite hover:text-red-600"
                  >
                    remover
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {usageFields.fields.length > 0 && (
          <div className="mt-3 flex flex-col gap-1 border border-mist bg-mist/20 p-3 text-sm">
            <p>
              Custo de material: <span className="font-medium">{formatPrice(materialCost)}</span>
            </p>
            <p>
              Custo total (material + mão de obra): <span className="font-medium">{formatPrice(totalCost)}</span>
            </p>
            {margin !== undefined && marginPercent !== undefined && (
              <p>
                Margem: <span className="font-medium">{formatPrice(margin)}</span> ({marginPercent.toFixed(1)}%)
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className={labelClass()}>Escalas disponíveis (opcional)</p>
          <button
            type="button"
            onClick={() => updateScales([...scaleItems, ""])}
            className="label-caps text-[11px] text-petrol hover:underline"
          >
            + adicionar escala
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {scaleItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                placeholder="1:10, P, 15cm…"
                className={`flex-1 ${inputClass()}`}
                value={item}
                onChange={(e) => {
                  const next = [...scaleItems];
                  next[index] = e.target.value;
                  updateScales(next);
                }}
              />
              <button
                type="button"
                onClick={() => updateScales(scaleItems.filter((_, i) => i !== index))}
                className="label-caps px-2 text-[11px] text-graphite hover:text-red-600"
              >
                remover
              </button>
            </div>
          ))}
          {scaleItems.length === 0 && (
            <p className="text-xs text-graphite">Sem escalas cadastradas. O produto não terá seletor de escala.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass()} htmlFor="description">
          Descrição
        </label>
        <textarea
          id="description"
          rows={3}
          className={inputClass(Boolean(errors.description))}
          {...register("description")}
        />
        {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass()} htmlFor="tagsRaw">
          Tags (separadas por vírgula)
        </label>
        <input id="tagsRaw" className={inputClass()} {...register("tagsRaw")} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className={labelClass()}>Fotos do produto (URLs)</p>
          <button
            type="button"
            onClick={() => updateImages([...imageItems, ""])}
            className="label-caps text-[11px] text-petrol hover:underline"
          >
            + adicionar foto
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {imageItems.map((url, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <div className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden border border-mist bg-mist/30 text-[9px] text-graphite">
                {url && (
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
              <input
                placeholder="https://exemplo.com/foto.jpg"
                className={`min-w-0 flex-1 ${inputClass()}`}
                value={url}
                onChange={(e) => {
                  const next = [...imageItems];
                  next[index] = e.target.value;
                  updateImages(next);
                }}
              />
              <label className="label-caps flex h-9 shrink-0 cursor-pointer items-center justify-center border border-mist px-3 text-center text-[11px] text-graphite transition-colors hover:border-ink">
                {uploadingIndex === index ? "Enviando…" : "Enviar arquivo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingIndex !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(index, file);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => updateImages(imageItems.filter((_, i) => i !== index))}
                className="label-caps px-2 text-[11px] text-graphite hover:text-red-600"
              >
                remover
              </button>
            </div>
          ))}
        </div>
        {uploadError && <p className="mt-2 text-xs text-red-600">{uploadError}</p>}
        {imageItems.length === 0 && (
          <p className="mt-2 text-xs text-graphite">
            Sem fotos, o produto usa uma imagem ilustrativa até que você adicione uma. Clique em
            &ldquo;+ adicionar foto&rdquo; e depois em &ldquo;Enviar arquivo&rdquo; para subir do computador ou
            celular, ou cole uma URL diretamente.
          </p>
        )}
      </div>

      <div>
        <p className={labelClass() + " mb-2"}>Tratamento visual (imagem ilustrativa)</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setValue("imageTone", undefined)}
            className={`label-caps border px-3.5 py-2 text-[11px] transition-colors ${
              !watch("imageTone") ? "border-ink bg-ink text-paper" : "border-mist text-graphite hover:border-ink"
            }`}
          >
            Automático
          </button>
          {IMAGE_TONES.map((tone) => (
            <button
              key={tone.value}
              type="button"
              onClick={() => setValue("imageTone", tone.value)}
              className={`label-caps border px-3.5 py-2 text-[11px] transition-colors ${
                watch("imageTone") === tone.value
                  ? "border-ink bg-ink text-paper"
                  : "border-mist text-graphite hover:border-ink"
              }`}
            >
              {tone.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" {...register("isNew")} />
          Novidade
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" {...register("isBestSeller")} />
          Best seller
        </label>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="label-caps bg-ink px-8 py-4 text-xs text-paper transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar produto"}
        </button>
      </div>
    </form>
  );
}
