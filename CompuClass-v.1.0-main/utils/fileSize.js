// Sizes under 1 MB are shown in KB. Dividing a small file by 1024² and
// printing megabytes rounds it to 0.00 MB.
function trimNumber(value, digits) {
  return value.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

export function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  const kb = 1024;
  if (size < kb * kb) {
    const value = size / kb;
    const digits = value < 10 ? 2 : value < 100 ? 1 : 0;
    return `${trimNumber(value, digits)} KB`;
  }
  if (size < kb * kb * kb) {
    const value = size / (kb * kb);
    return `${trimNumber(value, value < 10 ? 2 : 1)} MB`;
  }
  const value = size / (kb * kb * kb);
  return `${trimNumber(value, value < 10 ? 2 : 1)} GB`;
}
