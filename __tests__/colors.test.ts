import { getOrderColor } from '../src/lib/colors';

test('returns correct color for order', () => {
  const color = getOrderColor('high');
  expect(color).toBe('#F4A460');
});
