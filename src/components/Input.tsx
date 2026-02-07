"use client";

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

type InputSize = "sm" | "md" | "lg";
type InputState = "default" | "error" | "success";

interface BaseInputProps {
  size?: InputSize;
  state?: InputState;
  icon?: React.ReactNode;
  label?: string;
  helperText?: string;
  errorText?: string;
}

type InputFieldProps = BaseInputProps & InputHTMLAttributes<HTMLInputElement> & {
  as?: "input";
};

type TextareaFieldProps = BaseInputProps & TextareaHTMLAttributes<HTMLTextAreaElement> & {
  as: "textarea";
};

type SelectFieldProps = BaseInputProps & SelectHTMLAttributes<HTMLSelectElement> & {
  as: "select";
  children: React.ReactNode;
};

type InputProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, InputProps>(
  (props, ref) => {
    const {
      as = "input",
      size = "md",
      state = "default",
      icon,
      label,
      helperText,
      errorText,
      className = "",
      id,
      ...rest
    } = props;

    const sizeClass = size !== "md" ? `input-field--${size}` : "";
    const stateClass = state !== "default" ? `input-field--${state}` : "";
    const inputClasses = `input-field ${sizeClass} ${stateClass} ${className}`.trim();

    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const renderInput = () => {
      if (as === "textarea") {
        const { as: _, children, ...textareaProps } = rest as TextareaFieldProps;
        return (
          <textarea
            id={inputId}
            className={inputClasses}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            {...textareaProps}
          />
        );
      }

      if (as === "select") {
        const { as: _, children, ...selectProps } = rest as SelectFieldProps;
        return (
          <select
            id={inputId}
            className={inputClasses}
            ref={ref as React.Ref<HTMLSelectElement>}
            {...selectProps}
          >
            {(props as SelectFieldProps).children}
          </select>
        );
      }

      const { as: _, ...inputProps } = rest as InputFieldProps;
      return (
        <input
          id={inputId}
          className={inputClasses}
          ref={ref as React.Ref<HTMLInputElement>}
          {...inputProps}
        />
      );
    };

    const displayText = state === "error" && errorText ? errorText : helperText;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        {icon ? (
          <div className="input-group">
            <span className="input-group__icon">{icon}</span>
            {renderInput()}
          </div>
        ) : (
          renderInput()
        )}
        {displayText && (
          <p className={`mt-1.5 text-sm ${state === "error" ? "text-red-600" : "text-foreground-muted"}`}>
            {displayText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
