function formatPostedDate(publishedAt?: string | null): string {
  if (!publishedAt) return 'Recently posted';
  const days = Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86400000);
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted 1 day ago';
  if (days < 7) return `Posted ${days} days ago`;
  return new Date(publishedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatExperience(level?: string | null): string {
  if (!level) return 'Any level';
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function formatPayment(type?: string | null): string {
  if (!type) return '—';
  return type === 'milestone_payment' ? 'Milestone Payment' : 'Single Payment';
}

function formatFileSizeHint(type?: string | null): string {
  if (!type) return 'File';
  if (type.startsWith('image/')) return 'Image';
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('video')) return 'Video';
  if (type.includes('zip')) return 'Archive';
  return type.split('/').pop()?.toUpperCase() ?? 'File';
}

export { formatPostedDate, formatExperience, formatPayment, formatFileSizeHint };
