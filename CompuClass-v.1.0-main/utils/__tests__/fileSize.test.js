import { formatFileSize } from '../fileSize';

describe('formatFileSize', () => {
  it('shows kilobytes for a small file instead of 0.00 MB', () => {
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(100)).toBe('0.1 KB');
    expect(formatFileSize(2048)).not.toMatch(/MB/);
  });

  it('keeps megabytes for a file that is at least 1 MB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('treats a missing size as zero', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(undefined)).toBe('0 B');
  });
});
