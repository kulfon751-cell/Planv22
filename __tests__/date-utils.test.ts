import { parsePolishDate, combineDateAndTime } from '@/lib/date-utils';

describe('date-utils parsing', () => {
  test('parses dd.MM.yy with comma between date and time', () => {
    const d = parsePolishDate('10.01.25, 06:28:00');
    expect(d).not.toBeNull();
    // Assuming 2025 per two-digit year default
    expect(d!.getFullYear()).toBeGreaterThanOrEqual(2020);
    expect(d!.getFullYear()).toBeLessThan(2100);
    expect(d!.getMonth()).toBe(0); // January
    expect(d!.getDate()).toBe(10);
    expect(d!.getHours()).toBe(6);
    expect(d!.getMinutes()).toBe(28);
  });

  test('parses single digit day/month and two-digit year', () => {
    const d = parsePolishDate('1.1.26 13:47:00');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBeGreaterThanOrEqual(2020);
    expect(d!.getMonth()).toBe(0); // January
    expect(d!.getDate()).toBe(1);
    expect(d!.getHours()).toBe(13);
    expect(d!.getMinutes()).toBe(47);
  });

  test('combineDateAndTime works with comma-separated time', () => {
    const d = combineDateAndTime('30.09.2025', '11:16:00');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2025);
    expect(d!.getMonth()).toBe(8);
    expect(d!.getDate()).toBe(30);
    expect(d!.getHours()).toBe(11);
    expect(d!.getMinutes()).toBe(16);
  });
});
