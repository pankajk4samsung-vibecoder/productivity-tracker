import { render, screen } from '@testing-library/react';
import App from './App';

test('renders tic-tac-toe title and initial status', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /tic-tac-toe/i })).toBeInTheDocument();
  expect(screen.getByText(/next player: x/i)).toBeInTheDocument();
});
