export const COMPONENT_CATEGORIES = [
  "Generative Prompts",
  "Autonomous Agents",
  "RAG Architectures",
  "Fine-Tuned Models",
  "Computer Vision",
  "UI/UX AI Assets",
  "Data Pipelines",
  "Other",
] as const;

export type ComponentDeliveryMethod = "secure_text" | "file_upload";

export type ComponentFormState = {
  title: string;
  category: string;
  custom_category: string;
  description: string;
  price_usd: number;
  delivery_method: ComponentDeliveryMethod;
  secure_payload_text: string;
  license_type: string;
};

export type ComponentFormInitialData = ComponentFormState & {
  isFree: boolean;
  thumbnail_url: string | null;
  asset_file_name: string | null;
  asset_file_path: string | null;
  asset_bucket: string | null;
  asset_file_size: number | null;
  asset_content_type: string | null;
};

export const EMPTY_COMPONENT_FORM: ComponentFormState = {
  title: "",
  category: "Generative Prompts",
  custom_category: "",
  description: "",
  price_usd: 2,
  delivery_method: "secure_text",
  secure_payload_text: "",
  license_type: "Standard Commercial",
};

export type ComponentRecord = {
  id: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  price_usd?: number | null;
  thumbnail_url?: string | null;
  delivery_method?: ComponentDeliveryMethod | string | null;
  secure_payload_text?: string | null;
  asset_bucket?: string | null;
  asset_file_path?: string | null;
  asset_file_name?: string | null;
  asset_file_size?: number | null;
  asset_content_type?: string | null;
  license_type?: string | null;
};

export function componentToFormState(component: ComponentRecord): ComponentFormInitialData {
  const knownCategories = COMPONENT_CATEGORIES.filter((cat) => cat !== "Other");
  const storedCategory = component.category?.trim() || "";
  const isKnownCategory = (knownCategories as readonly string[]).includes(storedCategory);

  const priceUsd = Number(component.price_usd ?? 0);

  return {
    title: component.title?.trim() || "",
    category: isKnownCategory ? storedCategory : "Other",
    custom_category: isKnownCategory ? "" : storedCategory,
    description: component.description?.trim() || "",
    price_usd: priceUsd,
    delivery_method:
      component.delivery_method === "file_upload" ? "file_upload" : "secure_text",
    secure_payload_text: component.secure_payload_text?.trim() || "",
    license_type: component.license_type?.trim() || "Standard Commercial",
    isFree: priceUsd === 0,
    thumbnail_url: component.thumbnail_url ?? null,
    asset_file_name: component.asset_file_name ?? null,
    asset_file_path: component.asset_file_path ?? null,
    asset_bucket: component.asset_bucket ?? null,
    asset_file_size: component.asset_file_size ?? null,
    asset_content_type: component.asset_content_type ?? null,
  };
}

export function resolveComponentCategory(form: ComponentFormState): string {
  return form.category === "Other" ? form.custom_category.trim() : form.category;
}

export function validateComponentForm(
  form: ComponentFormState,
  options: {
    isFree: boolean;
    hasThumbnail: boolean;
    hasAssetFile: boolean;
    mode: "create" | "edit";
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!form.title.trim()) errors.push("Component title is required.");
  if (!form.description.trim()) errors.push("Technical description is required.");
  if (form.category === "Other" && !form.custom_category.trim()) {
    errors.push("Please specify your custom category.");
  }
  if (!options.hasThumbnail) errors.push("Thumbnail image is required.");
  if (!options.isFree && form.price_usd < 2) {
    errors.push("Premium assets must be priced at $2 or higher.");
  }
  if (form.delivery_method === "secure_text" && !form.secure_payload_text.trim()) {
    errors.push("Locked content is required for secure text delivery.");
  }
  if (form.delivery_method === "file_upload" && !options.hasAssetFile) {
    errors.push(
      options.mode === "edit"
        ? "Upload a replacement asset file or keep the existing download."
        : "Please upload your .ZIP or .PDF asset file."
    );
  }

  return { valid: errors.length === 0, errors };
}
