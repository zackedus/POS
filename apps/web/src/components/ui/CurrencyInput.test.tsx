import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CurrencyInput } from '@barokah/ui';

function CurrencyInputHarness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <CurrencyInput label="Nominal" value={value} onChange={setValue} />
      <output data-testid="stored-value">{value}</output>
    </div>
  );
}

describe('CurrencyInput', () => {
  it('formats Indonesian thousands while typing and stores integer rupiah', () => {
    render(<CurrencyInputHarness />);
    const input = screen.getByLabelText('Nominal');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '1' } });
    expect(input).toHaveValue('1');
    expect(screen.getByTestId('stored-value')).toHaveTextContent('1');

    fireEvent.change(input, { target: { value: '15' } });
    expect(input).toHaveValue('15');
    expect(screen.getByTestId('stored-value')).toHaveTextContent('15');

    fireEvent.change(input, { target: { value: '1500000' } });
    expect(input).toHaveValue('1.500.000');
    expect(screen.getByTestId('stored-value')).toHaveTextContent('1500000');
  });

  it('accepts pasted formatted IDR and keeps value after blur', () => {
    render(<CurrencyInputHarness />);
    const input = screen.getByLabelText('Nominal');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Rp 2.500.000' } });
    expect(input).toHaveValue('2.500.000');
    expect(screen.getByTestId('stored-value')).toHaveTextContent('2500000');

    fireEvent.blur(input);
    expect(input).toHaveValue('2.500.000');
    expect(screen.getByTestId('stored-value')).toHaveTextContent('2500000');
  });

  it('does not reset to empty while user is still typing digits', () => {
    render(<CurrencyInputHarness />);
    const input = screen.getByLabelText('Nominal');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.change(input, { target: { value: '5000' } });
    fireEvent.change(input, { target: { value: '50000' } });

    expect(input).toHaveValue('50.000');
    expect(screen.getByTestId('stored-value')).toHaveTextContent('50000');
  });

  it('clears stored value when input is emptied', () => {
    render(<CurrencyInputHarness initial="75000" />);
    const input = screen.getByLabelText('Nominal');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(input).toHaveValue('');
    expect(screen.getByTestId('stored-value')).toHaveTextContent('');
  });

  it('shows formatted value from parent when not focused', () => {
    render(<CurrencyInputHarness initial="1500000" />);
    const input = screen.getByLabelText('Nominal');

    expect(input).toHaveValue('1.500.000');
    expect(screen.getByTestId('stored-value')).toHaveTextContent('1500000');
  });
});
