'use client';

type SellOnlineToggleProps = {
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  onChange: (checked: boolean) => void;
};

export function SellOnlineToggle({
  checked,
  disabled = false,
  loading = false,
  label = 'Web Store',
  onChange,
}: SellOnlineToggleProps) {
  const isDisabled = disabled || loading;

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        minHeight: 44,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        userSelect: 'none',
      }}
      aria-label={`${label}: ${checked ? 'aktif' : 'nonaktif'}`}
    >
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={isDisabled}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          width: 44,
          height: 26,
          borderRadius: 999,
          border: 'none',
          padding: 0,
          flexShrink: 0,
          background: checked ? '#2563eb' : '#cbd5e1',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.25)',
            transition: 'left 0.15s ease',
          }}
        />
      </button>
      {loading ? (
        <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }} aria-live="polite">
          …
        </span>
      ) : null}
    </label>
  );
}
