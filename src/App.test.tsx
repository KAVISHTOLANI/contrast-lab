import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('Contrast Lab workflow', () => {
  it('shows the landing page by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/readable/i);
    expect(screen.getByTestId('hero-ratio')).toHaveTextContent(':1');
  });

  it('checks a pair, rejects bad input, applies a fix and saves', async () => {
    window.location.hash = '/check';
    const user = userEvent.setup();
    render(<App />);
    const fg = screen.getByLabelText('Text colour');
    await user.clear(fg);
    await user.type(fg, 'nope');
    expect(screen.getByText(/Not a colour I recognise/)).toBeInTheDocument();

    await user.clear(fg);
    await user.type(fg, '#999999');
    expect(screen.getByTestId('ratio')).toHaveTextContent('2.84:1');
    expect(screen.getByText(/Too low for text/)).toBeInTheDocument();

    // Validation: empty name
    await user.click(screen.getByRole('button', { name: 'Save pair' }));
    expect(screen.getByText(/Give this pair a name/)).toBeInTheDocument();

    // Apply the AA suggestion
    const firstSuggestion = screen.getAllByRole('button', { name: 'Apply' })[0].closest('li')!;
    expect(within(firstSuggestion).getByText('AA')).toBeInTheDocument();
    await user.click(within(firstSuggestion).getByRole('button', { name: 'Apply' }));
    const ratio = parseFloat(screen.getByTestId('ratio').textContent!);
    expect(ratio).toBeGreaterThanOrEqual(4.5);

    await user.type(screen.getByLabelText('Save this pair as'), 'Caption text');
    await user.click(screen.getByRole('button', { name: 'Save pair' }));
    expect(screen.getByText(/Saved “Caption text”/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('contrast-lab:pairs')!).filter((p: { demo?: boolean }) => !p.demo)).toHaveLength(1);
  });

  it('starts with labelled demo pairs that can be cleared', async () => {
    window.location.hash = '/saved';
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getAllByText('Demo data').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Clear demo pairs' }));
    expect(screen.getByText('No saved pairs yet')).toBeInTheDocument();
  });

  it('shows an empty state and can load demo pairs', async () => {
    localStorage.setItem('contrast-lab:pairs', '[]');
    window.location.hash = '/saved';
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('No saved pairs yet')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Add demo pairs' })[0]);
    expect(screen.getByText('muted caption')).toBeInTheDocument();
  });
});
