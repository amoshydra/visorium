import { minimatch } from "minimatch";

export interface ScanFilterOptions {
  includeHidden: boolean;
  ignore: string[];
}

const toPosixPath = (value: string) => value.replace(/\\/g, "/");

const pathSegments = (value: string) =>
  toPosixPath(value)
    .split("/")
    .filter((segment) => segment.length > 0);

export const isHiddenPath = (value: string): boolean => {
  return pathSegments(value).some(
    (segment) =>
      segment !== "." && segment !== ".." && segment.startsWith("."),
  );
};

const hasNodeModulesSegment = (value: string): boolean => {
  return pathSegments(value).includes("node_modules");
};

const expandIgnorePattern = (pattern: string): string[] => {
  const normalized = toPosixPath(pattern)
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");

  const variants = new Set([normalized]);

  if (normalized.endsWith("/**")) {
    variants.add(normalized.slice(0, -3));
  }
  if (normalized.endsWith("/")) {
    variants.add(normalized.slice(0, -1));
  }

  return Array.from(variants).filter(Boolean);
};

const pathPrefixes = (value: string): string[] => {
  const segments = pathSegments(value);
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
};

export const matchesIgnorePatterns = (
  value: string,
  patterns: string[],
): boolean => {
  const prefixes = pathPrefixes(value);
  const options = {
    dot: true,
    nocase: process.platform === "win32",
  };

  return patterns.some((pattern) => {
    const variants = expandIgnorePattern(pattern);

    return prefixes.some((prefix) =>
      variants.some((variant) =>
        minimatch(prefix, variant, {
          ...options,
          matchBase: !variant.includes("/"),
        }),
      ),
    );
  });
};

export const createScanFilter = (options: ScanFilterOptions) => {
  const ignore = options.ignore.filter((pattern) => pattern.trim() !== "");

  return (value: string): boolean => {
    if (!options.includeHidden && isHiddenPath(value)) {
      return true;
    }
    if (hasNodeModulesSegment(value)) {
      return true;
    }
    return matchesIgnorePatterns(value, ignore);
  };
};
