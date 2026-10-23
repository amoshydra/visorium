export const formatBytes = (bytes?: number): string => {
  if (bytes == null || !Number.isFinite(bytes)) {
    return "—";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Math.max(0, bytes);
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return unit === 0
    ? `${Math.round(value)} ${units[unit]}`
    : `${value.toFixed(1)} ${units[unit]}`;
};

export const formatDate = (mtime?: number): string => {
  if (mtime == null || !Number.isFinite(mtime)) {
    return "—";
  }

  const date = new Date(mtime);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

export const formatDimensions = (
  width?: number,
  height?: number,
): string => {
  return width && height ? `${width} × ${height}` : "—";
};

export const formatCount = (value: number): string => {
  return value.toLocaleString();
};
