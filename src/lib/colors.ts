// Generate deterministic colors for resources/machines
export function getResourceColor(resourceName: string): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
    '#14B8A6', '#F59E0B', '#DC2626', '#7C3AED', '#059669'
  ];
  
  let hash = 0;
  for (let i = 0; i < resourceName.length; i++) {
    const char = resourceName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Generate colors for order routes (multi-route view)
export function getOrderColor(orderNo: string): string {
  const routeColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#F4A460', '#98D8C8', '#FFB6C1', '#87CEEB'
  ];
  
  let hash = 0;
  for (let i = 0; i < orderNo.length; i++) {
    const char = orderNo.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % routeColors.length;
  return routeColors[index];
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);  
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}