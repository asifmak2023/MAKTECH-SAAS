"use client";

import { useState } from "react";
import { generateStrongPassword } from "@/lib/password";

type Props = {
  id: string;
  name: string;
  label?: string;
  required?: boolean;
  optionalHint?: string;
  hint?: string;
  showGenerate?: boolean;
  autoComplete?: string;
  defaultValue?: string;
};

export default function PasswordField({
  id,
  name,
  label = "Password",
  required,
  optionalHint,
  hint,
  showGenerate = true,
  autoComplete = "new-password",
  defaultValue = "",
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [visible, setVisible] = useState(false);

  function generate() {
    const next = generateStrongPassword(12);
    setValue(next);
    setVisible(true);
  }

  const hintText = hint !== undefined ? hint : "8–12 characters. Use Generate for a strong password.";

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id={id}
            name={name}
            type={visible ? "text" : "password"}
            required={required}
            minLength={8}
            maxLength={12}
            autoComplete={autoComplete}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={optionalHint || "8–12 characters"}
            style={{ paddingRight: "5.5rem" }}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 cursor-pointer px-3 text-[#767676] transition-colors hover:text-black"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>
        {showGenerate && (
          <button type="button" className="btn-ghost shrink-0" onClick={generate}>
            Generate
          </button>
        )}
      </div>
      {hintText && <p className="mt-1 text-xs text-[#767676]">{hintText}</p>}
    </div>
  );
}
