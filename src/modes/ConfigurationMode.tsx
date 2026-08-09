// ConfigurationMode.tsx
import { framer, type ManagedCollectionFieldInput } from "framer-plugin";
import React, { useEffect, useState } from "react";
import { usePermissions } from "../components/PermissionContext";
import { useAuth } from "../components/AuthContext";

// top of file, near helpers
const DEFAULT_ALLOWED_FILE_TYPES = ["png", "jpg", "jpeg", "webp", "pdf"];

// Infer all valid field types from Framer's API types
export type FieldType = ManagedCollectionFieldInput["type"] | "array";

// Core field input shape
export type FieldInputT = {
  id: string;
  name: string;
  type: FieldType;
  fields?: FieldInputT[];
  userEditable?: boolean;

  // extras for special types (custom fields only)
  allowedFileTypes?: string[]; // file
  collectionId?: string; // collectionReference / multiCollectionReference
  enumCases?: { name: string }[]; // enum
};

// Utility function to construct a field input
export function createFieldInput({
  id,
  name,
  type,
  userEditable,
  fields,
}: FieldInputT) {
  return {
    id,
    name,
    type,
    userEditable,
    fields,
  } as ManagedCollectionFieldInput;
}

// helpers (top of file)
const toCaseId = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);

function createCustomFieldInput(
  f: FieldInputT,
): ManagedCollectionFieldInput | null {
  switch (f.type) {
    case "array": {
      const inner: ManagedCollectionFieldInput = {
        id: f.fields?.[0]?.id ?? `${f.id}_image`,
        name: f.fields?.[0]?.name ?? "Image",
        type: "image",
        userEditable: true,
      };
      return {
        id: f.id,
        name: f.name,
        type: "array",
        fields: [inner],
        userEditable: true,
      };
    }

    case "file":
      return {
        id: f.id,
        name: f.name,
        type: "file",
        allowedFileTypes: f.allowedFileTypes?.length
          ? f.allowedFileTypes
          : ["png", "jpg", "jpeg", "webp", "pdf"],
        userEditable: true,
      };

    case "collectionReference":
    case "multiCollectionReference":
      if (!f.collectionId) return null;
      return {
        id: f.id,
        name: f.name,
        type: f.type,
        collectionId: f.collectionId,
        userEditable: true,
      };

    case "enum":
      return {
        id: f.id,
        name: f.name,
        type: "enum",
        cases: f.enumCases?.length
          ? f.enumCases.map((c) => ({
              id: toCaseId(c.name),
              name: c.name,
            }))
          : ["Option 1", "Option 2", "Option 3"].map((label) => ({
              id: toCaseId(label),
              name: label,
            })),
        userEditable: true,
      };

    default:
      return { id: f.id, name: f.name, type: f.type, userEditable: true };
  }
}

function normalizeCustomFields(fields: FieldInputT[]): FieldInputT[] {
  return fields.map((f) => {
    if (f.type === "file") {
      return {
        ...f,
        allowedFileTypes:
          f.allowedFileTypes && f.allowedFileTypes.length > 0
            ? f.allowedFileTypes
            : DEFAULT_ALLOWED_FILE_TYPES,
      };
    }
    if (f.type === "enum") {
      return {
        ...f,
        enumCases:
          f.enumCases && f.enumCases.length > 0
            ? f.enumCases.slice(0, 5)
            : [{ name: "Default" }],
      };
    }
    if (f.type === "array") {
      const innerId = f.fields?.[0]?.id ?? `${f.id}_image`;
      const innerName = f.fields?.[0]?.name ?? "Image";
      return {
        ...f,
        fields: [
          {
            id: innerId,
            name: innerName,
            type: "image",
          } as FieldInputT,
        ],
      };
    }
    return f;
  });
}

function validateCustomFields(fields: FieldInputT[]): string | null {
  for (const f of fields) {
    if (
      f.type === "file" &&
      (!f.allowedFileTypes || f.allowedFileTypes.length === 0)
    ) {
      return `File field "${f.name}" needs at least one allowed file type`;
    }
    if (
      (f.type === "collectionReference" ||
        f.type === "multiCollectionReference") &&
      !f.collectionId
    ) {
      return `Reference field "${f.name}" needs a target collectionId`;
    }
    if (f.type === "enum" && (!f.enumCases || f.enumCases.length === 0)) {
      return `Select field "${f.name}" needs at least one option`;
    }
    if (f.type === "enum" && f.enumCases && f.enumCases.length > 5) {
      return `Select field "${f.name}" can have maximum 5 options`;
    }
    if (f.type === "array") {
      const inner = f.fields?.[0];
      if (!inner || inner.type !== "image") {
        return `Gallery field "${f.name}" must contain exactly one inner Image field`;
      }
    }
  }
  return null;
}

type SafeLabels = Partial<Record<FieldType, string>> & Record<string, string>;

export const labelByFieldTypeOption: SafeLabels = {
  string: "Text",
  number: "Number",
  image: "Image",
  boolean: "Boolean",
  date: "Date",
  color: "Color",
  formattedText: "Formatted Text",
  array: "Gallery",
  link: "Link",
  file: "File",
  collectionReference: "Collection Reference",
  enum: "Options",
};

const standardFields = [
  { id: "title", name: "Title", type: "string", default: true },
  { id: "productId", name: "Product Id", type: "string", default: true },
  {
    id: "description",
    name: "Description",
    type: "formattedText",
    default: true,
  },
  { id: "variants", name: "Variants", type: "string", default: true },
  { id: "price", name: "Price", type: "number", default: true },
  {
    id: "images",
    name: "Product Images",
    type: "image",
  },
  { id: "vendor", name: "Vendor", type: "string" },
  { id: "tags", name: "Tags", type: "string" },
  { id: "productType", name: "Product Type", type: "string" },
  { id: "collections", name: "Collections", type: "string" },
  { id: "seo_title", name: "SEO Title", type: "string" },
  { id: "seo_description", name: "SEO Description", type: "string" },
];

// ── Sub-components ──────────────────────────────────────────────────────────

function StandardFieldsPanel({
  selectedFields,
  toggleField,
  syncImageAsGallery,
  setSyncImageAsGallery,
}: {
  selectedFields: string[];
  toggleField: (id: string) => void;
  syncImageAsGallery: boolean;
  setSyncImageAsGallery: (v: boolean) => void;
}) {
  return (
    <div className=" flex-1 !h-full !min-h-0 flex flex-col gap-2">
      <div className="!h-full !min-h-0 !overflow-y-auto scrollbar-hidden rounded-xl">
        <div className="!space-y-2 !h-fit !p-3 framer-color-bg-secondary rounded-xl ">
          {standardFields.map((field, f_index) => {
            return (
              <label
                key={field.id ?? f_index}
                style={{ display: "block", marginTop: 8 }}
                className={` !rounded-md items-start !gap-2 ${
                  field.default && "!opacity-100"
                }`}
              >
                <div
                  className={`flex items-center !p-2 framer-color-bg rounded-md cursor-pointer transition-all ${
                    field.default
                      ? "!bg-brand-primary/70 text-white"
                      : "hover:brightness-98"
                  }`}
                  onClick={() => !field.default && toggleField(field.id)}
                >
                  <div className=" w-full relative flex items-start justify-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => {}}
                      disabled={field.default}
                      className="absolute opacity-0 top-0 left-0 !w-full !h-full cursor-pointer"
                    />

                    <div
                      className={`
    w-5 h-5 rounded-md flex items-center justify-center transition-all border
    ${
      selectedFields.includes(field.id)
        ? "bg-brand-primary/70 border-brand-primary"
        : "!bg-black/20 border-white/20"
    }
  `}
                    >
                      {selectedFields.includes(field.id) && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-xs tracking-tight ${field.default ? "framer-color-text-muted " : "framer-color-text"}`}
                    >
                      {field.name} {field.default && "(Required)"}
                    </span>
                  </div>
                </div>

                {field.id === "images" && selectedFields.includes("images") && (
                  <div
                    className="flex gap-2 !mt-2 !p-3 framer-color-bg rounded-md cursor-pointer hover:brightness-98 transition-all"
                    onClick={() => setSyncImageAsGallery(!syncImageAsGallery)}
                  >
                    <div className="relative flex items-start justify-start pt-0.5">
                      <input
                        type="checkbox"
                        checked={syncImageAsGallery}
                        onChange={() => {}}
                        className="absolute opacity-0 w-full h-full cursor-pointer z-10"
                      />

                      <div
                        className={`
          w-5 h-5 rounded-md flex items-center justify-center transition-all border
          ${
            syncImageAsGallery
              ? "bg-brand-primary/70 border-brand-primary"
              : "!bg-black/20 border-white/20"
          }
        `}
                      >
                        {syncImageAsGallery && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 pr-2">
                      <p className="text-xs leading-none flex items-center gap-1.5">
                        <strong className="framer-color-text">
                          Sync images as gallery field
                        </strong>
                      </p>
                      <p className="text-[11px] leading-normal opacity-60 framer-color-text-muted">
                        {syncImageAsGallery
                          ? "Images will be synced as a single gallery field (product_gallery) in the CMS, ideal for carousels."
                          : "Images will be synced as up to 8 individual fields (image_1 to image_8) in the CMS, ideal for fixed layouts."}
                      </p>
                    </div>
                  </div>
                )}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CustomFieldsPanel({
  customFields,
  setCustomFields,
  customFieldInput,
  setCustomFieldInput,
  handleAddCustomField,
  handleRemoveCustomField,
  collections,
}: {
  customFields: FieldInputT[];
  setCustomFields: React.Dispatch<React.SetStateAction<FieldInputT[]>>;
  customFieldInput: Pick<FieldInputT, "name" | "type">;
  setCustomFieldInput: React.Dispatch<
    React.SetStateAction<Pick<FieldInputT, "name" | "type">>
  >;
  handleAddCustomField: () => void;
  handleRemoveCustomField: (index: number) => void;
  collections: { id: string; name: string }[];
}) {
  return (
    <div className=" flex-1 flex flex-col justify-between !w-full !min-h-0 !h-full relative !overflow-y-scroll scrollbar-hidden">
      <div className="sticky top-0 z-[999] w-full framer-color-bg">
        <div className="flex flex-col gap-3 !h-full">
          <div className="flex gap-2">
            <input
              placeholder="Field name"
              value={customFieldInput.name}
              onChange={(e) =>
                setCustomFieldInput((p) => ({
                  ...p,
                  name: e.target.value,
                }))
              }
              className="flex-1 border px-2 py-1"
            />

            <select
              title="Field type"
              name="type"
              className="flex-1  border px-2 py-1"
              value={customFieldInput.type}
              onChange={(e) =>
                setCustomFieldInput((p) => ({
                  ...p,
                  type: e.target.value as FieldType,
                }))
              }
            >
              {Object.entries(labelByFieldTypeOption).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="!mt-4 !space-y-4 !h-full !min-h-0 !overflow-y-auto scrollbar-hidden rounded-xl">
        {customFields.map((f, index) => (
          <div
            key={f.id}
            className=" space-y-2 framer-color-bg-secondary border border-dashed dark:!border-brand-primary rounded-Zxl !p-2 rounded-xl"
          >
            <div className="flex gap-2 items-start">
              <input
                title="Field name"
                type="text"
                value={f.name}
                className="flex-1 px-2 !py-2 framer-color-bg dark:!bg-white/5"
                onChange={(e) => {
                  const updatedFields = [...customFields];
                  updatedFields[index].name = e.target.value;
                  setCustomFields(updatedFields);
                }}
              />

              <select
                title="Field type"
                value={f.type}
                className="flex-1 px-2 !py-2 framer-color-bg dark:!bg-white/5"
                onChange={(e) => {
                  const value = e.target.value as FieldType;
                  const updatedFields = [...customFields];
                  updatedFields[index].type = value;

                  delete updatedFields[index].allowedFileTypes;
                  delete updatedFields[index].collectionId;
                  delete updatedFields[index].enumCases;

                  if (value === "enum") {
                    updatedFields[index].enumCases = [
                      { name: "Option 1" },
                      { name: "Option 2" },
                      { name: "Option 3" },
                    ];
                  }

                  if (value === "array") {
                    updatedFields[index].fields = [
                      {
                        id: `${updatedFields[index].id}_image`,
                        name: "Image",
                        type: "image",
                      },
                    ];
                  }
                  setCustomFields(updatedFields);
                }}
              >
                {Object.entries(labelByFieldTypeOption).map(([key, label]) => (
                  <option key={key} value={key} className="!text-black/80">
                    {label}
                  </option>
                ))}
              </select>

              <button
                title="Remove field"
                type="button"
                className="!h-[32px] aspect-square !text-red-500 rounded framer-color-bg framer-color-bg dark:!bg-white/5"
                onClick={() => handleRemoveCustomField(index)}
              >
                ×
              </button>
            </div>
            {f.type === "enum" && (
              <div className="!space-y-2 !py-2">
                <div className=" !space-y-2 ">
                  <div className="!space-y-2">
                    {(f.enumCases ?? []).map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className="flex items-center gap-2"
                      >
                        <input
                          title="Option name"
                          type="text"
                          className="flex-1 border px-2 !py-2 rounded framer-color-bg"
                          value={option.name}
                          onChange={(e) => {
                            const updated = [...customFields];
                            updated[index].enumCases![optionIndex].name =
                              e.target.value;
                            setCustomFields(updated);
                          }}
                        />
                        <button
                          type="button"
                          aria-label="Remove option"
                          className="w-[20px] aspect-square rounded !text-red-500 framer-color-bg hover:!bg-white/50"
                          onClick={() => {
                            const updated = [...customFields];
                            const cases = updated[index].enumCases ?? [];

                            if (cases.length <= 1) {
                              framer.notify("At least one option is required", {
                                variant: "warning",
                              });
                              return;
                            }

                            cases.splice(optionIndex, 1);
                            updated[index].enumCases = [...cases];
                            setCustomFields(updated);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="!w-full border-dashed py-2 framer-color-bg  hover:!bg-brand-primary/20 !border-brand-primary/30 !border-2 hover:!text-brand-primary rounded"
                      onClick={() => {
                        const updated = [...customFields];
                        if (!updated[index].enumCases)
                          updated[index].enumCases = [];
                        if (updated[index].enumCases!.length < 5) {
                          updated[index].enumCases!.push({
                            name: `Option ${
                              updated[index].enumCases!.length + 1
                            }`,
                          });
                        }
                        setCustomFields(updated);
                      }}
                      disabled={(f.enumCases ?? []).length >= 5}
                    >
                      Add more option
                    </button>
                  </div>
                </div>
              </div>
            )}
            {(f.type === "collectionReference" ||
              f.type === "multiCollectionReference") && (
              <div className="!pt-2">
                <select
                  title="Target collection"
                  className="w-full border !px-2 !py-2 rounded"
                  value={f.collectionId ?? ""}
                  onChange={(e) => {
                    const updated = [...customFields];
                    updated[index].collectionId = e.target.value;
                    setCustomFields(updated);
                  }}
                >
                  <option value="">Select a collection</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {f.type === "file" && (
              <div className="!pt-2">
                <input
                  type="text"
                  className="w-full border !px-2 !py-2 rounded"
                  placeholder="png,jpg,jpeg,webp,pdf"
                  value={(
                    f.allowedFileTypes ?? DEFAULT_ALLOWED_FILE_TYPES
                  ).join(",")}
                  onChange={(e) => {
                    const updated = [...customFields];
                    updated[index].allowedFileTypes = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    setCustomFields(updated);
                  }}
                />
                <small className="text-gray-500">
                  Comma separated. No dots. Example: png,jpg,webp
                </small>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleAddCustomField}
        className=" sticky bottom-0 w-fit px-4 !mt-4 !bg-brand-primary/70 hover:!bg-brand-primary/80 !border-brand-primary !border-2  !text-white rounded flex items-center gap-2"
      >
        <span>Add Field</span>
      </button>
    </div>
  );
}

function MetafieldsPanel({
  metafields,
  setMetafields,
  metaInput,
  setMetaInput,
  handleAddMetafield,
  handleRemoveMetafield,
}: {
  metafields: { namespace: string; key: string; type: string }[];
  setMetafields: React.Dispatch<
    React.SetStateAction<{ namespace: string; key: string; type: string }[]>
  >;
  metaInput: { namespace: string; key: string; type: string };
  setMetaInput: React.Dispatch<
    React.SetStateAction<{ namespace: string; key: string; type: string }>
  >;
  handleAddMetafield: () => void;
  handleRemoveMetafield: (index: number) => void;
}) {
  return (
    <div className="flex-1 flex flex-col !w-full !min-h-0 !h-full relative !overflow-y-scroll scrollbar-hidden">
      <div className="sticky top-0 z-[999] w-full framer-color-bg">
        <div className="flex flex-col gap-3 !h-full">
          <div className="flex gap-2">
            <input
              placeholder="Namespace"
              value={metaInput.namespace}
              onChange={(e) =>
                setMetaInput((p) => ({
                  ...p,
                  namespace: e.target.value,
                }))
              }
              className="flex-1 border px-2 py-1"
            />
            <input
              placeholder="Key"
              value={metaInput.key}
              onChange={(e) =>
                setMetaInput((p) => ({ ...p, key: e.target.value }))
              }
              className="flex-1 border px-2 py-1"
            />
            <select
              title="Field type"
              className="flex-1 bg-gray-100 border px-2 py-1"
              value={metaInput.type}
              onChange={(e) =>
                setMetaInput((p) => ({
                  ...p,
                  type: e.target.value,
                }))
              }
            >
              {Object.entries(labelByFieldTypeOption).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <hr />
        </div>
      </div>
      <div className="!mt-4 !h-full !space-y-4">
        {metafields.map((f, index) => (
          <div key={index} className="rounded p-3 space-y-2">
            <div className="flex gap-2 items-start">
              <input
                placeholder="Namespace"
                value={f.namespace}
                onChange={(e) => {
                  const updated = [...metafields];
                  updated[index].namespace = e.target.value;
                  setMetafields(updated);
                }}
                className="flex-1 border px-2 !py-2"
              />
              <input
                placeholder="Key"
                value={f.key}
                onChange={(e) => {
                  const updated = [...metafields];
                  updated[index].key = e.target.value;
                  setMetafields(updated);
                }}
                className="flex-1 px-2 py-2"
              />
              <select
                title="Field type"
                // className="flex-1 bg-gray-100 border px-2 py-1"
                value={f.type}
                onChange={(e) => {
                  const updated = [...metafields];
                  updated[index].type = e.target.value;
                  setMetafields(updated);
                }}
                className="flex-1 px-2 py-2"
              >
                {Object.entries(labelByFieldTypeOption).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
              <button
                type="button"
                onClick={() => handleRemoveMetafield(index)}
                className="px-2 py-2 bg-red-500 text-white rounded"
              >
                ×
              </button>
            </div>
            <hr className="!mt-4" />
          </div>
        ))}
      </div>
      <button
        onClick={handleAddMetafield}
        className=" sticky bottom-0 w-fit px-4 !mt-4 !bg-brand-primary/70 hover:!bg-brand-primary/80 !border-brand-primary !border-2  !text-white rounded flex items-center gap-2"
      >
        <span>Add Metafield</span>
      </button>
    </div>
  );
}

// ── Tab nav ─────────────────────────────────────────────────────────────────

type ActiveTab = "shopify" | "custom" | "metafields";

function ConfigTabNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}) {
  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "shopify", label: "Shopify Fields" },
    { id: "custom", label: "Custom Fields" },
    { id: "metafields", label: "Metafields" },
  ];

  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  const indicatorStyles = [
    "left-[1.5%] w-[31%]",
    "left-[35%] w-[31%]",
    "left-[68.5%] w-[31%]",
  ];

  return (
    <nav className="relative w-full flex justify-between gap-2 text-sm font-medium framer-color-bg-secondary rounded-lg flex-shrink-0">
      <div className="nav-container w-full h-full flex justify-between gap-0 relative z-10 !p-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="flex justify-center items-center w-full cursor-pointer z-10"
            onClick={() => setActiveTab(tab.id)}
          >
            <p
              className={`text-center w-full h-full !py-2 text-[12px] transition-all ${tab.id === activeTab ? "!text-brand-primary" : ""}`}
            >
              {tab.label}
            </p>
          </div>
        ))}

        {/* Sliding indicator */}
        <div
          className={`absolute shadow-lg framer-color-bg h-[calc(100%-8px)] top-1/2 transform -translate-y-1/2 transition-all duration-300 ease-in-out rounded-md dark:!bg-white ${
            indicatorStyles[activeIndex] ?? indicatorStyles[0]
          }`}
        />
      </div>
    </nav>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ConfigurationMode() {
  const { appUser, refreshAppUser } = useAuth();

  // Auto-refresh user status when plugin is focused
  useEffect(() => {
    const handleFocus = () => {
      refreshAppUser();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshAppUser]);

  const [activeTab, setActiveTab] = useState<ActiveTab>("shopify");

  const [collections, setCollections] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const allCollections = await framer.getManagedCollections();
        setCollections(
          allCollections.map((collection) => ({
            id: collection.id,
            name: collection.name,
          })),
        );
      } catch (error) {
        console.error("Failed to fetch collections:", error);
      }
    };

    fetchCollections();
  }, []);

  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [showUI, setShowUi] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowUi(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const { canConfigure } = usePermissions();

  const [selectedFields, setSelectedFields] = useState<string[]>(
    standardFields.filter((field) => field.default).map((f) => f.id),
  );

  const [syncImageAsGallery, setSyncImageAsGallery] = useState(false);

  const [customFields, setCustomFields] = useState<FieldInputT[]>([]);

  const [customFieldInput, setCustomFieldInput] = useState<
    Pick<FieldInputT, "name" | "type">
  >({
    name: "",
    type: "string",
  });

  const [metafields, setMetafields] = useState<
    { namespace: string; key: string; type: string }[]
  >([]);

  const [metaInput, setMetaInput] = useState({
    namespace: "",
    key: "",
    type: "string",
  });

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId],
    );
  };

  const handleAddCustomField = () => {
    if (!customFieldInput.name.trim()) return;

    const id = customFieldInput.name.toLowerCase().replace(/\s+/g, "_");
    if (
      customFields.some((f) => f.id === id || f.name === customFieldInput.name)
    ) {
      framer.notify("❌ Field name already exists.", { variant: "error" });
      return;
    }
    setCustomFields((prev) => [...prev, { ...customFieldInput, id }]);
    setCustomFieldInput({ name: "", type: "string" });
  };

  const handleAddMetafield = () => {
    if (!metaInput.namespace.trim() || !metaInput.key.trim()) return;

    if (
      metafields.some(
        (m) => m.namespace === metaInput.namespace && m.key === metaInput.key,
      )
    ) {
      framer.notify("Metafield already exists", { variant: "error" });
      return;
    }

    setMetafields((prev) => [...prev, { ...metaInput }]);
    setMetaInput({ namespace: "", key: "", type: "string" });
  };

  const handleRemoveMetafield = (index: number) => {
    setMetafields((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleCreateCollection = async () => {
    setSyncError(null);
    setSyncStatus("Creating collection...");
    setSyncing(true);

    try {
      const collection = await framer.getActiveManagedCollection();

      const syncedFields: ManagedCollectionFieldInput[] = standardFields
        .filter((f) => selectedFields.includes(f.id))
        .flatMap((f) => {
          if (f.id === "images") {
            if (syncImageAsGallery) {
              return [
                createFieldInput({
                  id: "featured_image",
                  name: "Featured Image",
                  type: "image",
                }),
                createFieldInput({
                  id: "product_gallery",
                  name: "Product Gallery",
                  type: "array",
                  fields: [
                    createFieldInput({
                      id: "gallery_image",
                      name: "Image",
                      type: "image",
                    }),
                  ],
                }),
              ];
            } else {
              return Array.from({ length: 8 }).map((_, index) =>
                createFieldInput({
                  id: `image_${index + 1}`,
                  name:
                    index === 0 ? "Image 1 (Featured)" : `Image ${index + 1}`,
                  type: "image",
                }),
              );
            }
          }
          return [
            createFieldInput({
              id: f.id,
              name: f.name,
              type: f.type as FieldType,
            }),
          ];
        });

      const customFieldsNormalized = normalizeCustomFields(customFields);

      const customValidationError = validateCustomFields(
        customFieldsNormalized,
      );
      if (customValidationError) {
        framer.notify(`❌ ${customValidationError}`, { variant: "error" });
        setSyncStatus(null);
        setSyncing(false);
        return;
      }

      const managedIdSet = new Set(collections.map((c) => c.id));

      const editableCustomFieldsRaw = customFieldsNormalized.map((f) => {
        if (
          (f.type === "collectionReference" ||
            f.type === "multiCollectionReference") &&
          (!f.collectionId || !managedIdSet.has(f.collectionId))
        ) {
          framer.notify(
            `⚠️ Reference "${f.name}" points to a collection this plugin doesn't manage. Skipping.`,
            { variant: "warning" },
          );
          return null;
        }
        return createCustomFieldInput(f);
      });

      const editableCustomFields = editableCustomFieldsRaw.filter(
        (x): x is ManagedCollectionFieldInput => x !== null,
      );

      const editableMetafields = metafields.map((f) =>
        createFieldInput({
          id: `${f.namespace}_${f.key}`,
          name: `${f.namespace}.${f.key}`,
          type: f.type as FieldType,
        }),
      );

      const allFields = [
        ...syncedFields,
        ...editableCustomFields,
        ...editableMetafields,
      ];
      setSyncStatus("Updating collection fields...");
      await collection.setFields(allFields);

      await framer.setPluginData("customFields", JSON.stringify(customFields));
      await framer.setPluginData(
        "selectedFields",
        JSON.stringify(selectedFields),
      );
      await framer.setPluginData("metafields", JSON.stringify(metafields));
      await framer.setPluginData(
        "syncImageAsGallery",
        JSON.stringify(syncImageAsGallery),
      );

      setSyncStatus("Syncing products...");
      const { syncProductsCore } = await import("../utils/syncProducts");

      setSyncStatus("Syncing products...");
      const syncedCount = await syncProductsCore(appUser, collection, true);

      setSyncStatus(`✅ Synced ${syncedCount} products successfully!`);

      framer.notify("✅ Collection created and products synced!", {
        variant: "success",
      });

      framer.closePlugin("Sync complete", { variant: "success" });
    } catch (error: any) {
      console.error("[Sync] FAILED at step — error:", error);
      setSyncError(error.message || "Failed to create collection.");
      setSyncStatus(null);
      try {
        framer.notify("❌ Failed to create collection.", { variant: "error" });
      } catch {
        // Framer connection may be gone — swallow
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleReset = async () => {
    try {
      await framer.setPluginData("customFields", null);
      await framer.setPluginData("selectedFields", null);
      await framer.setPluginData("metafields", null);
      await framer.setPluginData("syncImageAsGallery", null);
      setCustomFields([]);
      setSelectedFields(
        standardFields.filter((f) => f.default).map((f) => f.id),
      );
      setMetafields([]);
      setSyncImageAsGallery(false);
    } catch (e) {
      console.error("Failed to reset plugin data", e);
      framer.notify("❌ Failed to reset settings.", { variant: "error" });
    }
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  useEffect(() => {
    async function loadSettings() {
      if (!canConfigure) return;

      try {
        const custom = await framer.getPluginData("customFields");
        const selected = await framer.getPluginData("selectedFields");
        const metas = await framer.getPluginData("metafields");
        const galleryMode = await framer.getPluginData("syncImageAsGallery");

        if (custom) {
          const parsed = JSON.parse(custom);
          // console.log("🔁 Loaded Custom Fields:", parsed);
          setCustomFields(parsed);
        }

        if (selected) {
          const parsed = JSON.parse(selected);
          // console.log("🔁 Loaded Selected Standard Fields:", parsed);
          setSelectedFields(parsed);
        }

        if (metas) {
          const parsed = JSON.parse(metas);
          // console.log("🔁 Loaded Metafields:", parsed);
          setMetafields(parsed);
        }

        if (galleryMode) {
          const parsed = JSON.parse(galleryMode);
          // console.log("🔁 Loaded Gallery Mode:", parsed);
          setSyncImageAsGallery(parsed);
        }
      } catch (e) {
        console.error("❌ Failed to load plugin settings", e);
      }
    }

    const waitForFramerReady = async () => {
      try {
        let tries = 0;
        while (!framer.getActiveManagedCollection && tries < 10) {
          await new Promise((r) => setTimeout(r, 100));
          tries++;
        }

        await loadSettings();
      } catch (e) {
        console.error("❌ Plugin never initialized", e);
      }
    };

    waitForFramerReady();
  }, [canConfigure]);

  return (
    <div className=" h-[100%] !w-full ">
      {syncing ? (
        <div className="absolute top-0 left-0 right-0 h-full !w-full flex items-center justify-center p-4 text-center">
          {syncing && (
            <div className="flex flex-col justify-center items-center">
              <div className="flex items-center gap-2">
                <div className="framer-spinner " />
                <p className="text-[10px] framer-color-text-tertiary">
                  {syncStatus}
                </p>
              </div>
              <h4 className="max-w-[310px] text-[32px] font-bold">
                Your Product is Syncing
              </h4>
            </div>
          )}

          {syncError && (
            <div className="mb-2 p-2 bg-red-700 rounded text-white text-center">
              {syncError}
            </div>
          )}
        </div>
      ) : showUI ? (
        <div className="!h-full !p-4 flex flex-col gap-3">
          {/* Header */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className="flex justify-between w-full items-center">
              <div className=" ap-logo !h-[40px]" />
            </div>
          </div>

          {/* Tab nav */}
          <ConfigTabNav activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Active panel */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === "shopify" && (
              <StandardFieldsPanel
                selectedFields={selectedFields}
                toggleField={toggleField}
                syncImageAsGallery={syncImageAsGallery}
                setSyncImageAsGallery={setSyncImageAsGallery}
              />
            )}
            {activeTab === "custom" && (
              <CustomFieldsPanel
                customFields={customFields}
                setCustomFields={setCustomFields}
                customFieldInput={customFieldInput}
                setCustomFieldInput={setCustomFieldInput}
                handleAddCustomField={handleAddCustomField}
                handleRemoveCustomField={handleRemoveCustomField}
                collections={collections}
              />
            )}
            {activeTab === "metafields" && (
              <MetafieldsPanel
                metafields={metafields}
                setMetafields={setMetafields}
                metaInput={metaInput}
                setMetaInput={setMetaInput}
                handleAddMetafield={handleAddMetafield}
                handleRemoveMetafield={handleRemoveMetafield}
              />
            )}
          </div>

          {/* Footer */}
          <div className="">
            <div className="flex gap-2 w-full framer-color-bg">
              <button
                onClick={handleReset}
                className="flex-1 framer-button-secondary "
              >
                Reset Fields
              </button>
              <button
                onClick={handleCreateCollection}
                className="flex-1 bg-brand-primary text-white"
              >
                Sync Products
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute top-0 left-0 right-0 !h-full !w-full ">
          <div className="!flex !items-center !justify-center !h-full">
            <div className="framer-spinner " />
          </div>
        </div>
      )}
    </div>
  );
}
