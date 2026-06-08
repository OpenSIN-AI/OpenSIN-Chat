// SPDX-License-Identifier: MIT
/**
 * Example TypeScript component patterns for common UI components.
 * Demonstrates best practices for React component props typing.
 */

import React, { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";

/**
 * Button Component Props
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
  isFullWidth?: boolean;
}

/**
 * Example Button Component
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      isFullWidth = false,
      disabled,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: "bg-blue-600 text-white hover:bg-blue-700",
      secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
      ghost: "bg-transparent text-blue-600 hover:bg-blue-50",
      danger: "bg-red-600 text-white hover:bg-red-700",
    };

    const sizeClasses = {
      sm: "px-2 py-1 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          rounded transition-colors
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${isFullWidth ? "w-full" : ""}
          ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}
          ${className || ""}
        `}
        {...props}
      >
        {loading ? "Loading..." : children}
      </button>
    );
  }
);

Button.displayName = "Button";

/**
 * Input Component Props
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * Example Input Component
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && <label className="text-sm font-medium">{label}</label>}
        <input
          ref={ref}
          className={`
            border rounded px-3 py-2
            ${error ? "border-red-500" : "border-gray-300"}
            focus:outline-none focus:ring-2
            ${error ? "focus:ring-red-500" : "focus:ring-blue-500"}
            ${className || ""}
          `}
          {...props}
        />
        {error && <span className="text-sm text-red-500">{error}</span>}
        {helperText && <span className="text-sm text-gray-500">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";

/**
 * Modal Component Props
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

/**
 * Example Modal Component
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`bg-white rounded-lg shadow-lg ${sizeClasses[size]}`}>
        {title && (
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
        {footer && <div className="border-t px-6 py-4">{footer}</div>}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

/**
 * Card Component Props
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  children: ReactNode;
}

/**
 * Example Card Component
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ hover = false, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-white rounded-lg border border-gray-200 p-4
          ${hover ? "hover:shadow-lg transition-shadow cursor-pointer" : ""}
          ${className || ""}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

/**
 * Select Component Props
 */
export interface SelectOption<T = string> {
  label: string;
  value: T;
}

export interface SelectProps<T = string> extends InputHTMLAttributes<HTMLSelectElement> {
  options: SelectOption<T>[];
  placeholder?: string;
  label?: string;
}

/**
 * Example Select Component (Generically typed)
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, label, className, ...props }, ref) => {
    return (
      <div>
        {label && <label className="text-sm font-medium">{label}</label>}
        <select
          ref={ref}
          className={`
            border border-gray-300 rounded px-3 py-2 w-full
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${className || ""}
          `}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = "Select";
