# Utilities Reference

Create Bun Stack includes a collection of utility functions and helpers for common tasks. This reference covers all built-in utilities and patterns for creating your own.

## Authentication Utilities

### JWT Utilities

```typescript
// src/lib/jwt.ts
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: {
  id: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: "create-bun-stack",
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error("Invalid token");
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): any {
  return jwt.decode(token);
}

/**
 * Extract token from Authorization header
 */
export function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded?.exp) return true;
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
```

### Password Utilities

```typescript
// src/lib/crypto.ts

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error("Password cannot be empty");
  }
  
  return await Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 19456,  // 19 MB
    timeCost: 2,        // 2 iterations
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

/**
 * Generate a random password
 */
export function generatePassword(length: number = 16): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  for (let i = 0; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  return password;
}

/**
 * Check password strength
 */
export interface PasswordStrength {
  score: number;      // 0-5
  feedback: string[];
  isStrong: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const feedback: string[] = [];

  // Length
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  else feedback.push("Use at least 8 characters");

  // Character types
  if (/[a-z]/.test(password)) score += 0.5;
  else feedback.push("Include lowercase letters");

  if (/[A-Z]/.test(password)) score += 0.5;
  else feedback.push("Include uppercase letters");

  if (/[0-9]/.test(password)) score += 0.5;
  else feedback.push("Include numbers");

  if (/[^A-Za-z0-9]/.test(password)) score += 1.5;
  else feedback.push("Include special characters");

  return {
    score: Math.min(score, 5),
    feedback,
    isStrong: score >= 4,
  };
}
```

## Validation Utilities

### Common Validators

```typescript
// src/lib/validation.ts

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate phone number (basic)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
}

/**
 * Validate UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize string for safe display
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 1000); // Limit length
}

/**
 * Validate file type
 */
export function isValidFileType(
  filename: string,
  allowedTypes: string[]
): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? allowedTypes.includes(ext) : false;
}
```

### Zod Helpers

```typescript
// src/lib/validation/zod-helpers.ts
import { z } from "zod";

/**
 * Common Zod schemas
 */
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((pwd) => /[A-Z]/.test(pwd), "Password must contain uppercase")
  .refine((pwd) => /[a-z]/.test(pwd), "Password must contain lowercase")
  .refine((pwd) => /[0-9]/.test(pwd), "Password must contain number");

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s-()]+$/, "Invalid phone format")
  .transform((val) => val.replace(/\D/g, ""));

export const dateSchema = z
  .string()
  .or(z.date())
  .transform((val) => new Date(val));

/**
 * Create paginated query schema
 */
export function paginatedSchema<T extends z.ZodObject<any>>(
  schema: T
) {
  return schema.extend({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
  });
}
```

## String Utilities

### String Manipulation

```typescript
// src/lib/utils/string.ts

/**
 * Convert string to slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Truncate string with ellipsis
 */
export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text;
  return text.slice(0, length - 3) + "...";
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert camelCase to kebab-case
 */
export function camelToKebab(text: string): string {
  return text.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(text: string): string {
  return text.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Generate random string
 */
export function randomString(
  length: number = 10,
  charset: string = "abcdefghijklmnopqrstuvwxyz0123456789"
): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
}
```

## Date/Time Utilities

### Date Formatting

```typescript
// src/lib/utils/date.ts

/**
 * Format date to readable string
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }).format(d);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  
  return formatDate(d);
}

/**
 * Get start and end of day
 */
export function getDayBounds(date: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Add days to date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Check if date is in past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return d < new Date();
}
```

## Number Utilities

### Number Formatting

```typescript
// src/lib/utils/number.ts

/**
 * Format currency
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Format number with commas
 */
export function formatNumber(
  num: number,
  decimals: number = 0
): string {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format percentage
 */
export function formatPercent(
  value: number,
  total: number,
  decimals: number = 1
): string {
  const percent = (value / total) * 100;
  return `${percent.toFixed(decimals)}%`;
}

/**
 * Clamp number between min and max
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * Round to decimal places
 */
export function round(num: number, decimals: number = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
```

## Array/Object Utilities

### Array Helpers

```typescript
// src/lib/utils/array.ts

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Remove duplicates from array
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Group array by key
 */
export function groupBy<T, K extends keyof any>(
  array: T[],
  getKey: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = getKey(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

/**
 * Shuffle array
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Pick random items from array
 */
export function sample<T>(array: T[], count: number = 1): T[] {
  const shuffled = shuffle(array);
  return shuffled.slice(0, count);
}
```

### Object Helpers

```typescript
// src/lib/utils/object.ts

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  
  const cloned = {} as T;
  for (const key in obj) {
    cloned[key] = deepClone(obj[key]);
  }
  return cloned;
}

/**
 * Pick properties from object
 */
export function pick<T, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const picked = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) picked[key] = obj[key];
  });
  return picked;
}

/**
 * Omit properties from object
 */
export function omit<T, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const omitted = { ...obj };
  keys.forEach(key => delete omitted[key]);
  return omitted;
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends object>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;
  const source = sources.shift();
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key] as any, source[key] as any);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  
  return deepMerge(target, ...sources);
}

function isObject(item: any): item is object {
  return item && typeof item === "object" && !Array.isArray(item);
}
```

## HTTP Utilities

### Request Helpers

```typescript
// src/lib/utils/http.ts

/**
 * Get client IP address
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  return req.headers.get("x-real-ip") ||
         req.headers.get("cf-connecting-ip") || // Cloudflare
         "unknown";
}

/**
 * Parse cookies from header
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  
  return cookieHeader
    .split(";")
    .map(cookie => cookie.trim().split("="))
    .reduce((acc, [key, value]) => {
      if (key) acc[key] = decodeURIComponent(value || "");
      return acc;
    }, {} as Record<string, string>);
}

/**
 * Get cookie value
 */
export function getCookie(req: Request, name: string): string | undefined {
  const cookies = parseCookies(req.headers.get("cookie"));
  return cookies[name];
}

/**
 * Create cookie header
 */
export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
}

export function createCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
  if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.domain) cookie += `; Domain=${options.domain}`;
  if (options.secure) cookie += "; Secure";
  if (options.httpOnly) cookie += "; HttpOnly";
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  
  return cookie;
}

/**
 * Parse form data to object
 */
export async function parseFormData(
  formData: FormData
): Promise<Record<string, any>> {
  const data: Record<string, any> = {};
  
  for (const [key, value] of formData.entries()) {
    if (data[key]) {
      // Convert to array if multiple values
      if (!Array.isArray(data[key])) {
        data[key] = [data[key]];
      }
      data[key].push(value);
    } else {
      data[key] = value;
    }
  }
  
  return data;
}
```

## File System Utilities

### File Helpers

```typescript
// src/lib/utils/file.ts

/**
 * Ensure directory exists
 */
export async function ensureDir(path: string): Promise<void> {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    if ((error as any).code !== "EEXIST") throw error;
  }
}

/**
 * Read JSON file
 */
export async function readJSON<T = any>(path: string): Promise<T> {
  const file = Bun.file(path);
  return await file.json();
}

/**
 * Write JSON file
 */
export async function writeJSON(
  path: string,
  data: any,
  pretty: boolean = true
): Promise<void> {
  const json = pretty
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);
  
  await Bun.write(path, json);
}

/**
 * Get file extension
 */
export function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : "";
}

/**
 * Generate unique filename
 */
export function uniqueFilename(originalName: string): string {
  const ext = getExtension(originalName);
  const name = originalName.slice(0, -ext.length);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${slugify(name)}-${timestamp}-${random}${ext}`;
}

/**
 * Check if path is safe (prevent directory traversal)
 */
export function isSafePath(path: string, root: string): boolean {
  const resolved = resolve(root, path);
  return resolved.startsWith(resolve(root));
}
```

## Crypto Utilities

### Hashing and Encryption

```typescript
// src/lib/utils/crypto.ts
import { createHash, randomBytes } from "crypto";

/**
 * Generate random token
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

/**
 * Hash string with SHA256
 */
export function hash(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Generate secure random string
 */
export function secureRandom(length: number = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  let result = "";
  
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Constant time string comparison (prevent timing attacks)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
```

## React Utilities

### Custom Hooks

```typescript
// src/app/hooks/useDebounce.ts
import { useEffect, useState } from "react";

/**
 * Debounce a value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// src/app/hooks/useLocalStorage.ts
/**
 * Sync state with localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error saving to localStorage:`, error);
    }
  };

  return [storedValue, setValue];
}
```

### Class Name Utility

```typescript
// src/lib/utils/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind CSS support
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn(
  "px-4 py-2 rounded",
  isActive && "bg-blue-500",
  isDisabled && "opacity-50 cursor-not-allowed"
)} />
```

## Environment Utilities

### Environment Helpers

```typescript
// src/lib/utils/env.ts

/**
 * Get environment variable with type safety
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  return value || defaultValue!;
}

/**
 * Get numeric environment variable
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Invalid numeric environment variable: ${key}`);
  }
  
  return num || defaultValue!;
}

/**
 * Get boolean environment variable
 */
export function getEnvBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  
  if (!value) return defaultValue;
  
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}

/**
 * Environment checks
 */
export const env = {
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
  isCI: getEnvBoolean("CI"),
  isDebug: getEnvBoolean("DEBUG"),
};
```

## Performance Utilities

### Timing and Profiling

```typescript
// src/lib/utils/performance.ts

/**
 * Measure function execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T> | T,
  label?: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  if (label) {
    console.log(`${label}: ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let lastCall = 0;
  let timeout: Timer | null = null;
  
  return ((...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall >= delay) {
      lastCall = now;
      return fn(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        timeout = null;
        fn(...args);
      }, delay - timeSinceLastCall);
    }
  }) as T;
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map();
  
  return ((...args) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}
```

## Testing Utilities

### Test Helpers

```typescript
// tests/utils/helpers.ts

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error("Timeout waiting for condition");
}

/**
 * Create mock request
 */
export function createMockRequest(
  url: string,
  options: RequestInit = {}
): Request {
  return new Request(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
}

/**
 * Assert response matches expected
 */
export async function assertResponse(
  response: Response,
  expected: {
    status?: number;
    body?: any;
    headers?: Record<string, string>;
  }
): Promise<void> {
  if (expected.status !== undefined) {
    expect(response.status).toBe(expected.status);
  }
  
  if (expected.body !== undefined) {
    const body = await response.json();
    expect(body).toEqual(expected.body);
  }
  
  if (expected.headers) {
    for (const [key, value] of Object.entries(expected.headers)) {
      expect(response.headers.get(key)).toBe(value);
    }
  }
}
```

## Best Practices

1. **Pure Functions** - Utilities should be pure when possible
2. **Type Safety** - Always use TypeScript types
3. **Error Handling** - Handle edge cases gracefully
4. **Documentation** - Document parameters and return values
5. **Testing** - Write unit tests for utilities
6. **Performance** - Consider performance implications
7. **Reusability** - Make utilities generic and reusable

## Next Steps

- Explore [Testing](/docs/features/testing) utilities in practice
- Learn about [Performance](/docs/advanced/performance) optimization
- Understand [Security](/docs/features/security) utilities