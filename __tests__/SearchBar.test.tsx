import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SearchBar } from '../src/components/toolbar/SearchBar';

test('renders SearchBar component', () => {
  render(<SearchBar />);
  const searchInput = screen.getByPlaceholderText('Szukaj zleceń...');
  expect(searchInput).toBeInTheDocument();
});
