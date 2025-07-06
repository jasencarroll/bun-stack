# Frontend

Create Bun Stack includes a modern React frontend with TypeScript, Tailwind CSS, and React Query. This guide covers the frontend architecture and best practices.

## Overview

The frontend stack includes:

- ⚛️ **React 18** - Latest React with concurrent features
- 📘 **TypeScript** - Full type safety
- 🎨 **Tailwind CSS** - Utility-first styling
- 🔄 **React Query** - Server state management
- 🧭 **React Router** - Client-side routing
- 📦 **Bun Bundler** - Fast builds and HMR
- 🎯 **Component Architecture** - Modular, reusable components

## Project Structure

```
src/app/
├── components/          # Reusable UI components
│   ├── ui/             # Generic UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   └── features/       # Feature-specific components
│       ├── UserProfile.tsx
│       └── ProductCard.tsx
├── hooks/              # Custom React hooks
│   ├── useAuth.ts
│   ├── useApi.ts
│   └── useDebounce.ts
├── layouts/            # Page layouts
│   └── MainLayout.tsx
├── lib/                # Utilities and helpers
│   └── api/           # API client
│       ├── client.ts
│       └── endpoints/
├── pages/              # Page components
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   └── DashboardPage.tsx
├── types/              # TypeScript types
├── App.tsx            # Main app component
├── index.css          # Global styles
└── main.tsx           # Entry point
```

## Components

### Creating Components

Follow these patterns for consistent components:

```typescript
// src/app/components/ui/Button.tsx
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-accent-purple text-white hover:bg-purple-600",
      secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
      danger: "bg-red-500 text-white hover:bg-red-600",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2",
      lg: "px-6 py-3 text-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-accent-purple focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
```

### Component Composition

Build complex components from smaller ones:

```typescript
// src/app/components/features/ProductCard.tsx
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { formatCurrency } from "@/lib/utils";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    description: string;
  };
  onAddToCart?: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-48 object-cover rounded-md mb-4"
      />
      <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {product.description}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold">
          {formatCurrency(product.price)}
        </span>
        <Button
          size="sm"
          onClick={() => onAddToCart?.(product.id)}
        >
          Add to Cart
        </Button>
      </div>
    </Card>
  );
}
```

## State Management

### Local State

Use React hooks for component state:

```typescript
// src/app/components/SearchBar.tsx
import { useState, useCallback } from "react";
import { useDebounce } from "@/app/hooks/useDebounce";

export function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  return (
    <input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
    />
  );
}
```

### Server State with React Query

```typescript
// src/app/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/app/lib/api/products";

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => productsApi.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: (newProduct) => {
      // Update cache
      queryClient.invalidateQueries({ queryKey: ["products"] });
      
      // Optimistically update single product
      queryClient.setQueryData(["product", newProduct.id], newProduct);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductDto }) =>
      productsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["product", id] });

      // Snapshot previous value
      const previousProduct = queryClient.getQueryData(["product", id]);

      // Optimistically update
      queryClient.setQueryData(["product", id], (old: any) => ({
        ...old,
        ...data,
      }));

      return { previousProduct };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousProduct) {
        queryClient.setQueryData(
          ["product", variables.id],
          context.previousProduct
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["product", variables.id] });
    },
  });
}
```

### Global State (Optional)

For complex state, use Zustand:

```typescript
// src/app/stores/cartStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        })),
      clearCart: () => set({ items: [] }),
      total: () => {
        const state = get();
        return state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
    }),
    {
      name: "cart-storage",
    }
  )
);
```

## Styling

### Tailwind CSS

Use Tailwind utilities for styling:

```typescript
// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Content */}
</div>

// Dark mode support (if configured)
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  {/* Content */}
</div>

// Custom animations
<div className="animate-fade-in hover:scale-105 transition-transform">
  {/* Content */}
</div>
```

### Component Styling Patterns

```typescript
// Using clsx/cn for conditional classes
import { cn } from "@/lib/utils";

interface AlertProps {
  type: "info" | "success" | "warning" | "error";
  children: React.ReactNode;
}

export function Alert({ type, children }: AlertProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border",
        {
          "bg-blue-50 border-blue-200 text-blue-800": type === "info",
          "bg-green-50 border-green-200 text-green-800": type === "success",
          "bg-yellow-50 border-yellow-200 text-yellow-800": type === "warning",
          "bg-red-50 border-red-200 text-red-800": type === "error",
        }
      )}
    >
      {children}
    </div>
  );
}
```

### CSS Modules (Alternative)

```css
/* Button.module.css */
.button {
  @apply px-4 py-2 rounded-md font-medium transition-colors;
}

.primary {
  @apply bg-accent-purple text-white hover:bg-purple-600;
}

.secondary {
  @apply bg-gray-200 text-gray-800 hover:bg-gray-300;
}
```

```typescript
import styles from "./Button.module.css";

export function Button({ variant = "primary" }) {
  return (
    <button className={`${styles.button} ${styles[variant]}`}>
      Click me
    </button>
  );
}
```

## Forms

### Form Handling with React Hook Form

```typescript
// src/app/components/forms/ProductForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().positive("Price must be positive"),
  description: z.string().optional(),
  category: z.enum(["electronics", "clothing", "food"]),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  onSubmit: (data: ProductFormData) => void;
  defaultValues?: Partial<ProductFormData>;
}

export function ProductForm({ onSubmit, defaultValues }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Product Name
        </label>
        <input
          {...register("name")}
          type="text"
          id="name"
          className={cn(
            "w-full px-3 py-2 border rounded-md",
            errors.name && "border-red-500"
          )}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium mb-1">
          Price
        </label>
        <input
          {...register("price", { valueAsNumber: true })}
          type="number"
          step="0.01"
          id="price"
          className={cn(
            "w-full px-3 py-2 border rounded-md",
            errors.price && "border-red-500"
          )}
        />
        {errors.price && (
          <p className="mt-1 text-sm text-red-500">{errors.price.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-1">
          Category
        </label>
        <select
          {...register("category")}
          id="category"
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select a category</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="food">Food</option>
        </select>
        {errors.category && (
          <p className="mt-1 text-sm text-red-500">{errors.category.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          {...register("description")}
          id="description"
          rows={3}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      <Button type="submit" isLoading={isSubmitting}>
        {defaultValues ? "Update" : "Create"} Product
      </Button>
    </form>
  );
}
```

### File Uploads

```typescript
// src/app/components/forms/ImageUpload.tsx
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface ImageUploadProps {
  onUpload: (file: File) => Promise<string>;
  value?: string;
  onChange: (url: string) => void;
}

export function ImageUpload({ onUpload, value, onChange }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      setIsUploading(true);
      try {
        const url = await onUpload(file);
        onChange(url);
      } catch (error) {
        console.error("Upload failed:", error);
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer",
        "hover:border-accent-purple transition-colors",
        isDragActive && "border-accent-purple bg-purple-50"
      )}
    >
      <input {...getInputProps()} />
      
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="max-h-48 mx-auto rounded"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
              <div className="text-white">Uploading...</div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            {isDragActive
              ? "Drop the image here"
              : "Drag and drop an image, or click to select"}
          </p>
        </div>
      )}
    </div>
  );
}
```

## Performance Optimization

### Code Splitting

```typescript
// src/app/App.tsx
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

// Lazy load pages
const HomePage = lazy(() => import("./pages/HomePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
      </Routes>
    </Suspense>
  );
}
```

### Memoization

```typescript
// src/app/components/ExpensiveList.tsx
import { memo, useMemo } from "react";

interface Item {
  id: string;
  name: string;
  price: number;
}

interface ExpensiveListProps {
  items: Item[];
  taxRate: number;
}

export const ExpensiveList = memo(function ExpensiveList({
  items,
  taxRate,
}: ExpensiveListProps) {
  // Memoize expensive calculations
  const itemsWithTax = useMemo(() => {
    return items.map((item) => ({
      ...item,
      priceWithTax: item.price * (1 + taxRate),
    }));
  }, [items, taxRate]);

  const total = useMemo(() => {
    return itemsWithTax.reduce((sum, item) => sum + item.priceWithTax, 0);
  }, [itemsWithTax]);

  return (
    <div>
      <ul>
        {itemsWithTax.map((item) => (
          <li key={item.id}>
            {item.name}: ${item.priceWithTax.toFixed(2)}
          </li>
        ))}
      </ul>
      <div className="font-bold">Total: ${total.toFixed(2)}</div>
    </div>
  );
});
```

### Virtual Lists

```typescript
// src/app/components/VirtualProductList.tsx
import { useVirtualizer } from "@tanstack/react-virtual";

export function VirtualProductList({ products }: { products: Product[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated row height
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ProductCard product={products[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Testing

### Component Testing

```typescript
// tests/app/components/Button.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/app/components/ui/Button";

describe("Button", () => {
  test("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  test("handles click events", () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test("shows loading state", () => {
    render(<Button isLoading>Submit</Button>);
    expect(screen.getByText("Submit")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

### Hook Testing

```typescript
// tests/app/hooks/useDebounce.test.ts
import { renderHook, act } from "@testing-library/react-hooks";
import { useDebounce } from "@/app/hooks/useDebounce";

describe("useDebounce", () => {
  jest.useFakeTimers();

  test("debounces value changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    );

    expect(result.current).toBe("initial");

    // Change value
    rerender({ value: "updated", delay: 500 });
    expect(result.current).toBe("initial");

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe("updated");
  });
});
```

## Accessibility

### ARIA Labels and Roles

```typescript
// src/app/components/Modal.tsx
export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Trap focus
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
        <h2 id="modal-title" className="text-xl font-bold mb-4">
          {title}
        </h2>
        <button
          onClick={onClose}
          className="absolute top-4 right-4"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
```

### Keyboard Navigation

```typescript
// src/app/components/Dropdown.tsx
export function Dropdown({ options, value, onChange }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < options.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        onChange(options[highlightedIndex]);
        setIsOpen(false);
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full px-4 py-2 text-left border rounded"
      >
        {value || "Select an option"}
      </button>
      
      {isOpen && (
        <ul
          role="listbox"
          className="absolute w-full mt-1 bg-white border rounded shadow-lg"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              className={cn(
                "px-4 py-2 cursor-pointer",
                highlightedIndex === index && "bg-gray-100",
                value === option.value && "font-semibold"
              )}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Best Practices

1. **Component Organization**
   - Keep components small and focused
   - Use composition over inheritance
   - Extract reusable logic into hooks

2. **Type Safety**
   - Define interfaces for all props
   - Use strict TypeScript settings
   - Avoid `any` types

3. **Performance**
   - Memoize expensive operations
   - Use React.memo for pure components
   - Lazy load routes and heavy components

4. **Accessibility**
   - Use semantic HTML
   - Add ARIA labels where needed
   - Test with keyboard navigation

5. **Testing**
   - Write tests for critical paths
   - Test user interactions
   - Mock external dependencies

## Next Steps

- Learn about [State Management](/docs/advanced/state-management)
- Explore [Component Patterns](/docs/advanced/component-patterns)
- Set up [Storybook](/docs/advanced/storybook)
- Implement [Internationalization](/docs/advanced/i18n)