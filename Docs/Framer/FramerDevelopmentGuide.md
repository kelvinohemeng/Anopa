# Framer Development Guide

**A comprehensive guide to building production-ready Shopify integrations in Framer**

Version: 1.0  
Last Updated: February 2026

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [State Management with Zustand](#state-management-with-zustand)
3. [CMS Data Injection](#cms-data-injection)
4. [Component Communication](#component-communication)
5. [Property Controls Reference](#property-controls-reference)
6. [Best Practices](#best-practices)
7. [Common Patterns](#common-patterns)
8. [Things to Avoid](#things-to-avoid)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────┐
│  Shopify API                                     │
│  - Product data source                           │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│  Zustand Store (Global State)                   │
│  - Products (all + filtered)                     │
│  - Cart items                                    │
│  - Filter selections                             │
│  - Sort preferences                              │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
┌──────────────┐    ┌──────────────────┐
│  UI Layer    │    │  CMS Renderer    │
│  - Filters   │    │  - Injects data  │
│  - Sorting   │    │  - Preserves     │
│  - Chips     │    │    Framer design │
└──────────────┘    └──────────────────┘
```

### Data Flow

```
Fetch Shopify → Store in Zustand → Apply Filters → Map to CMS Format → Render
```

---

## State Management with Zustand

### Store Structure

```typescript
import { create } from "zustand";

interface Product {
  id: string;
  title: string;
  handle: string;
  price: number;
  productType: string;
  tags: string[];
  collections: string[];
  featuredImage: string | null;
  vendor: string;
}

interface FilterStore {
  // Data
  allProducts: Product[];
  filteredProducts: Product[];

  // Filter options (auto-extracted)
  options: {
    categories: string[];
    tags: string[];
    collections: string[];
    colors: string[];
  };

  // Selected filters
  selectedCategories: string[];
  selectedTags: string[];
  selectedCollections: string[];
  selectedColors: string[];
  priceRange: [number, number];
  searchQuery: string;
  sortBy: SortOption;

  // Actions
  setAllProducts: (products: Product[]) => void;
  toggleCategory: (category: string) => void;
  toggleTag: (tag: string) => void;
  setSortBy: (sort: SortOption) => void;
  clearFilters: () => void;
  applyFilters: () => void;
}
```

### Key Principles

**1. Single Source of Truth**

- All product data lives in Zustand
- Components read from store, never maintain local product state

**2. Automatic Filter Extraction**

```typescript
setAllProducts: (products) => {
    // Auto-extract unique values
    const categories = [...new Set(products.map(p => p.productType))].sort()
    const tags = [...new Set(products.flatMap(p => p.tags))].sort()

    set({
        allProducts: products,
        filteredProducts: products,
        options: { categories, tags, ... }
    })
}
```

**3. Centralized Filtering**

```typescript
applyFilters: () => {
  const state = get();
  let filtered = [...state.allProducts];

  // Apply all filters
  if (state.selectedCategories.length > 0) {
    filtered = filtered.filter((p) =>
      state.selectedCategories.includes(p.productType),
    );
  }

  // Apply sorting
  const sorted = get().applySorting(filtered);

  set({ filteredProducts: sorted });
};
```

**4. Trigger Filtering After Every Change**

```typescript
toggleCategory: (category) => {
  set((state) => ({
    selectedCategories: state.selectedCategories.includes(category)
      ? state.selectedCategories.filter((c) => c !== category)
      : [...state.selectedCategories, category],
  }));
  get().applyFilters(); // ← Always call this
};
```

---

## CMS Data Injection

### Problem

Framer's CMS Collection doesn't support external data sources directly. We need to inject Shopify products while preserving Framer's design.

### Solution: Recursive Function Discovery

**Don't hardcode depth:**

```typescript
// ❌ FRAGILE - breaks when Framer updates
const renderFn = children.props.children.props.children.props.children;
```

**Do this instead:**

```typescript
// ✅ ROBUST - searches recursively
function findRenderFunction(element, depth = 0, maxDepth = 15) {
  if (depth > maxDepth || !element) return null;

  if (element.props?.children && typeof element.props.children === "function") {
    const fn = element.props.children;
    const fnString = fn.toString();

    // Validate it's the CMS render function
    if (
      fn.length >= 2 &&
      (fnString.includes("collection") || fnString.includes("paginationInfo"))
    ) {
      return { renderFunction: fn, depth };
    }
  }

  if (element.props?.children && typeof element.props.children === "object") {
    return findRenderFunction(element.props.children, depth + 1, maxDepth);
  }

  return null;
}
```

### Field Mapping

**Centralize your CMS field mappings:**

```typescript
const CMS_FIELD_MAP = {
  ID: "id",
  TITLE: "mDiyxiEMr",
  PRODUCT_ID: "tJM2Wmlhg",
  PRICE: "WcZw7umz8",
  IMAGE: "bf3n0ciw_",
  SLUG: "SZ0PWeGZz",
  TYPE: "YTheMexzf",
  COLLECTIONS: "R6QQZvg64",
  TAGS: "y__b8NK6Q",
  VENDOR: "aYKxdtJ2t",
} as const;

function mapProductToCMS(product) {
  return {
    [CMS_FIELD_MAP.ID]: product.id,
    [CMS_FIELD_MAP.TITLE]: product.title,
    [CMS_FIELD_MAP.PRICE]: product.price,
    [CMS_FIELD_MAP.IMAGE]: product.featuredImage
      ? {
          src: product.featuredImage,
          srcSet: product.featuredImage,
          alt: product.title,
        }
      : null,
    // ... map all fields
  };
}
```

### Tree Cloning

```typescript
function cloneTreeWithNewRenderer(rootElement, newRenderFn, targetDepth) {
  function cloneRecursive(element, currentDepth = 0) {
    if (!element || typeof element !== "object") return element;

    if (currentDepth === targetDepth) {
      return React.cloneElement(element, {
        ...element.props,
        children: newRenderFn,
      });
    }

    const clonedChildren = element.props?.children
      ? cloneRecursive(element.props.children, currentDepth + 1)
      : element.props?.children;

    return React.cloneElement(element, {
      ...element.props,
      children: clonedChildren,
    });
  }

  return cloneRecursive(rootElement);
}
```

### Full Implementation Pattern

```typescript
export default function CMSRenderer({ children, enablePagination, itemsPerPage }) {
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const filteredProducts = useFilterStore(s => s.filteredProducts)

    // Canvas mode: show original CMS
    if (isCanvas) {
        return <div>{children}</div>
    }

    // Map products to CMS format
    const mappedData = useMemo(
        () => filteredProducts.map(mapProductToCMS),
        [filteredProducts]
    )

    // Find render function
    const found = findRenderFunction(children)
    if (!found) {
        return <div>CMS structure not recognized</div>
    }

    // Wrap with our data
    const wrappedRenderFn = (collection, paginationInfo, loadMore) => {
        return found.renderFunction(mappedData, paginationInfo, loadMore)
    }

    // Clone tree and inject
    const newChildren = cloneTreeWithNewRenderer(
        children,
        wrappedRenderFn,
        found.depth
    )

    return newChildren
}
```

---

## Component Communication

### Pattern: Event Bridge

**Use Case:** Component A has a function, Component B (on different page) needs to call it.

**Solution:** Document-level custom events

#### Step 1: Expose the Function (Component A)

```typescript
export default function ComponentA({ onAction }) {
    // Listen for custom event
    useEffect(() => {
        const handleEvent = () => {
            if (onAction) {
                onAction()  // Call the EventHandler prop
            }
        }

        document.addEventListener('customActionTrigger', handleEvent)

        return () => {
            document.removeEventListener('customActionTrigger', handleEvent)
        }
    }, [onAction])

    return <button onClick={onAction}>Click Me</button>
}

addPropertyControls(ComponentA, {
    onAction: {
        type: ControlType.EventHandler
    }
})
```

#### Step 2: Trigger From Anywhere (Component B)

```typescript
export default function ComponentB() {
    const handleClick = () => {
        // Dispatch the event
        document.dispatchEvent(new CustomEvent('customActionTrigger'))
    }

    return <button onClick={handleClick}>Trigger A</button>
}
```

### Real Example: Cart Overlay

**Cart Counter (in Nav):**

```typescript
export default function CartCounter({ triggerCartModal }) {
    useEffect(() => {
        const handler = () => triggerCartModal?.()
        document.addEventListener('toggleCartModal', handler)
        return () => document.removeEventListener('toggleCartModal', handler)
    }, [triggerCartModal])

    return <div onClick={triggerCartModal}>{count}</div>
}
```

**Add to Cart Button (anywhere):**

```typescript
const handleAddToCart = async () => {
  await addToCart(product);
  document.dispatchEvent(new CustomEvent("toggleCartModal"));
};
```

### Benefits

✅ **No parent-child relationship required**  
✅ **Works across pages**  
✅ **Simple to debug**  
✅ **No prop drilling**  
✅ **Multiple listeners possible**

---

## Property Controls Reference

### EventHandler

**Use for:** Functions that should be wired up in Framer's UI

```typescript
addPropertyControls(Component, {
  onTap: {
    type: ControlType.EventHandler,
    title: "On Tap",
  },
});

// User can set: "Open Overlay", "Navigate to Page", etc.
```

### Link

**Use for:** Selecting pages/overlays from dropdown

```typescript
addPropertyControls(Component, {
  targetPage: {
    type: ControlType.Link,
    title: "Target Page",
    description: "Select destination page",
  },
});

// User sees dropdown of all pages
```

### ComponentInstance

**Use for:** Slot-based components

```typescript
addPropertyControls(Component, {
  button: {
    type: ControlType.ComponentInstance,
    title: "Button Design",
  },
});

// User drags in a styled component
```

### Enum for Modes

**Use for:** Switching between behaviors

```typescript
addPropertyControls(Component, {
  displayMode: {
    type: ControlType.Enum,
    title: "Display As",
    options: ["checkboxes", "buttons", "dropdown"],
    optionTitles: ["Checkboxes", "Buttons", "Dropdown"],
    defaultValue: "checkboxes",
  },
});
```

### Hidden Properties

**Use for:** Conditional controls

```typescript
addPropertyControls(Component, {
  enableFeature: {
    type: ControlType.Boolean,
    defaultValue: false,
  },
  featureOptions: {
    type: ControlType.String,
    hidden: (props) => !props.enableFeature, // ← Conditional
  },
});
```

---

## Best Practices

### 1. Canvas vs Preview

**Always check render target:**

```typescript
const isCanvas = RenderTarget.current() === RenderTarget.canvas

if (isCanvas) {
    return <div>Canvas preview</div>
}

// Runtime code
```

**Why:** Prevent API calls, network requests in canvas mode.

### 2. File Organization

```
/code
  /components
    - ProductCard.tsx
    - FilterUI.tsx
  /stores
    - filterStore.ts
    - cartStore.ts
  /utils
    - shopifyAPI.ts
    - cmsMapping.ts
  /overrides
    - cartOverrides.tsx
```

### 3. Error Handling

**Always provide fallbacks:**

```typescript
try {
    const found = findRenderFunction(children)
    if (!found) {
        console.warn("CMS structure not recognized")
        return <div>{children}</div>  // Show original
    }
    // ... proceed
} catch (err) {
    console.error("Render error:", err)
    return <div>{children}</div>  // Graceful degradation
}
```

### 4. Performance

**Use useMemo for expensive operations:**

```typescript
const mappedData = useMemo(() => products.map(mapProductToCMS), [products]);
```

**Use useCallback for stable functions:**

```typescript
const handleFilter = useCallback(
  (category) => {
    toggleCategory(category);
  },
  [toggleCategory],
);
```

### 5. Debugging

**Add comprehensive logging:**

```typescript
console.log("📦 Loaded products:", products.length);
console.log("🔍 Filtered:", filtered.length);
console.log("🎨 Rendering:", mapped.length);
console.log("✅ Success");
```

**Use emoji for easy scanning in console!**

### 6. TypeScript

**Define interfaces for all data:**

```typescript
interface Product {
  id: string;
  title: string;
  price: number;
  // ... all fields
}

interface FilterStore {
  allProducts: Product[];
  // ... state and actions
}
```

---

## Common Patterns

### Pattern: Filter Component

**Reusable filter that works with any variant:**

```typescript
export default function Filter({
    variant,  // "categories" | "tags" | "collections"
    displayMode = "auto"
}) {
    const options = useFilterStore(s => s.options)
    const selected = useFilterStore(s => {
        switch(variant) {
            case "categories": return s.selectedCategories
            case "tags": return s.selectedTags
            case "collections": return s.selectedCollections
        }
    })

    const toggle = useFilterStore(s => {
        switch(variant) {
            case "categories": return s.toggleCategory
            case "tags": return s.toggleTag
            case "collections": return s.toggleCollection
        }
    })

    const items = options[variant] || []

    return (
        <div>
            {items.map(item => (
                <label key={item}>
                    <input
                        type="checkbox"
                        checked={selected.includes(item)}
                        onChange={() => toggle(item)}
                    />
                    {item}
                </label>
            ))}
        </div>
    )
}
```

### Pattern: Active Filter Chips

**Show what filters are active:**

```typescript
export default function ActiveChips() {
    const selectedCategories = useFilterStore(s => s.selectedCategories)
    const selectedTags = useFilterStore(s => s.selectedTags)
    const toggleCategory = useFilterStore(s => s.toggleCategory)
    const toggleTag = useFilterStore(s => s.toggleTag)
    const clearFilters = useFilterStore(s => s.clearFilters)

    const chips = [
        ...selectedCategories.map(cat => ({
            label: `Category: ${cat}`,
            onRemove: () => toggleCategory(cat)
        })),
        ...selectedTags.map(tag => ({
            label: `Tag: ${tag}`,
            onRemove: () => toggleTag(tag)
        }))
    ]

    if (chips.length === 0) return null

    return (
        <div>
            {chips.map((chip, i) => (
                <div key={i}>
                    <span>{chip.label}</span>
                    <button onClick={chip.onRemove}>×</button>
                </div>
            ))}
            {chips.length > 1 && (
                <button onClick={clearFilters}>Clear all</button>
            )}
        </div>
    )
}
```

### Pattern: Sorting

**Integrated with filtering:**

```typescript
// In store
applySorting: (products) => {
  const { sortBy } = get();
  const sorted = [...products];

  switch (sortBy) {
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "name-asc":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    // ... other sorts
  }

  return sorted;
};

applyFilters: () => {
  // ... filter logic
  const sorted = get().applySorting(filtered);
  set({ filteredProducts: sorted });
};
```

### Pattern: Price Range Detection

**Only show chip if range changed:**

```typescript
const defaultPriceRange = useMemo(() => {
  const prices = allProducts.map((p) => p.price).filter(Boolean);
  return [
    prices.length ? Math.min(...prices) : 0,
    prices.length ? Math.max(...prices) : 1000,
  ];
}, [allProducts]);

const isPriceRangeActive =
  priceRange[0] !== defaultPriceRange[0] ||
  priceRange[1] !== defaultPriceRange[1];

if (isPriceRangeActive) {
  // Show price chip
}
```

---

## Things to Avoid

### ❌ Don't Use These Patterns

**1. Hardcoded Tree Depth**

```typescript
// ❌ BAD - breaks when Framer updates
const renderFn = children.props.children.props.children.props.children;

// ✅ GOOD - recursive search
const found = findRenderFunction(children);
```

**2. Direct CMS Field IDs in Components**

```typescript
// ❌ BAD - scattered field names
<Text>{product.mDiyxiEMr}</Text>

// ✅ GOOD - centralized mapping
const CMS_FIELD_MAP = { TITLE: "mDiyxiEMr" }
mapProductToCMS(product)
```

**3. Local Product State**

```typescript
// ❌ BAD - state in component
const [products, setProducts] = useState([]);

// ✅ GOOD - state in Zustand
const products = useFilterStore((s) => s.filteredProducts);
```

**4. Filtering Without Applying**

```typescript
// ❌ BAD - forgot to apply
toggleCategory: (cat) => {
  set({ selectedCategories: [...state, cat] });
  // Missing: get().applyFilters()
};

// ✅ GOOD - always apply
toggleCategory: (cat) => {
  set({ selectedCategories: [...state, cat] });
  get().applyFilters(); // ← Essential
};
```

**5. API Calls in Canvas Mode**

```typescript
// ❌ BAD - fetches in canvas
useEffect(() => {
  fetch("/api/products");
}, []);

// ✅ GOOD - check render target
useEffect(() => {
  if (RenderTarget.current() === RenderTarget.canvas) return;
  fetch("/api/products");
}, []);
```

**6. Assuming Price Range is Custom**

```typescript
// ❌ BAD - shows chip always
if (priceRange) {
  showChip(); // Always true!
}

// ✅ GOOD - compare to default
if (priceRange[0] !== defaultMin || priceRange[1] !== defaultMax) {
  showChip();
}
```

**7. Not Cleaning Up Event Listeners**

```typescript
// ❌ BAD - memory leak
useEffect(() => {
  document.addEventListener("event", handler);
  // Missing cleanup!
}, []);

// ✅ GOOD - cleanup
useEffect(() => {
  document.addEventListener("event", handler);
  return () => document.removeEventListener("event", handler);
}, []);
```

**8. Using localStorage in Canvas**

```typescript
// ❌ BAD - runs in canvas
localStorage.setItem("data", JSON.stringify(data));

// ✅ GOOD - check first
if (RenderTarget.current() !== RenderTarget.canvas) {
  localStorage.setItem("data", JSON.stringify(data));
}
```

---

## Troubleshooting

### Products Not Showing

**Check:**

1. Is `setAllProducts()` being called?
2. Console: Look for "📦 Loaded X products"
3. Check `filteredProducts.length` in store
4. Are filters too restrictive?

**Debug:**

```typescript
console.log("All:", allProducts.length);
console.log("Filtered:", filteredProducts.length);
console.log("Selected filters:", selectedCategories);
```

### Filters Not Working

**Check:**

1. Is `applyFilters()` being called after toggle?
2. Are filter arrays being updated correctly?
3. Is filter logic correct?

**Debug:**

```typescript
applyFilters: () => {
  console.log("🔍 Applying filters...");
  console.log("Before:", state.allProducts.length);
  console.log("After:", filtered.length);
};
```

### CMS Not Injecting Data

**Check:**

1. Is component in preview mode (not canvas)?
2. Does `findRenderFunction()` find the function?
3. Are field mappings correct?

**Debug:**

```typescript
const found = findRenderFunction(children);
console.log("Found function?", !!found);
console.log("At depth:", found?.depth);
console.log("Mapped data:", mappedData);
```

### Events Not Firing

**Check:**

1. Is listener component mounted?
2. Is event name spelled correctly?
3. Is listener registered before dispatch?

**Debug:**

```typescript
// In listener component
useEffect(() => {
  console.log("✅ Registered listener for: myEvent");
  const handler = () => console.log("🔔 Event received!");
  document.addEventListener("myEvent", handler);
  return () => {
    console.log("❌ Removed listener");
    document.removeEventListener("myEvent", handler);
  };
}, []);

// In dispatcher
console.log("📤 Dispatching event: myEvent");
document.dispatchEvent(new CustomEvent("myEvent"));
```

---

## Performance Optimization

### 1. Pagination

**For large catalogs (100+ products):**

```typescript
const [visibleCount, setVisibleCount] = useState(20);

const paginatedData = useMemo(
  () => mappedData.slice(0, visibleCount),
  [mappedData, visibleCount],
);

const loadMore = () => {
  setVisibleCount((prev) => Math.min(prev + 20, mappedData.length));
};
```

### 2. Virtualization

**For extremely large lists (1000+ products):**

Consider using react-window or similar libraries.

### 3. Debouncing

**For search/filter inputs:**

```typescript
import { useMemo } from "react";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
const debouncedSearch = useDebounce(searchQuery, 300);
useEffect(() => {
  setSearchQuery(debouncedSearch);
  applyFilters();
}, [debouncedSearch]);
```

### 4. Memoization

**Expensive computations:**

```typescript
const options = useMemo(() => {
  return {
    categories: [...new Set(products.map((p) => p.type))].sort(),
    tags: [...new Set(products.flatMap((p) => p.tags))].sort(),
  };
}, [products]);
```

---

## Testing Checklist

### Before Deployment

- [ ] Test with 0 products (empty state)
- [ ] Test with 1 product (edge case)
- [ ] Test with 100+ products (performance)
- [ ] Test all filter combinations
- [ ] Test clearing filters
- [ ] Test sorting options
- [ ] Test on mobile viewport
- [ ] Test in different browsers
- [ ] Check console for errors
- [ ] Verify no memory leaks (check DevTools Memory tab)

### Filter Testing

- [ ] Select one category → filters correctly
- [ ] Select multiple categories → OR logic works
- [ ] Select category + tag → AND logic works
- [ ] Adjust price range → filters correctly
- [ ] Search query → filters correctly
- [ ] All filters combined → works correctly
- [ ] Clear filters → resets to all products

### UI Testing

- [ ] Active chips show correctly
- [ ] Active chips can be removed
- [ ] Filter counts are accurate
- [ ] Empty states show properly
- [ ] Loading states work
- [ ] Errors display gracefully

---

## Version History

### v1.0 - February 2026

- Initial documentation
- Core patterns established
- Production-ready implementations

---

**This documentation is a living document. Update it as you discover new patterns and solutions.**
