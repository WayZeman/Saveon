"use client";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
};

export function AppleSwitch({ checked, onChange, disabled = false, ariaLabel }: Props) {
  return (
    <span className="apple-switch-wrap">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`apple-switch ${checked ? "apple-switch--on" : "apple-switch--off"}`}
      >
        <span className="apple-switch__thumb" aria-hidden />
      </button>
    </span>
  );
}
