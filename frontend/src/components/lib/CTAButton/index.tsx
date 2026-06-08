// SPDX-License-Identifier: MIT
export default function CTAButton({
  children: any, disabled: any = false, onClick: any, className: any = "", }: any): JSX.Element {
  return (
    <button
      disabled={disabled}
      onClick={() => onClick?.()}
      className={`border-none text-xs px-4 py-1 font-semibold light:text-[#ffffff] rounded-lg bg-primary-button hover:bg-secondary hover:text-white h-[34px] -mr-8 whitespace-nowrap w-fit ${className}`}
    >
      <div className="flex items-center justify-center gap-2">{children}</div>
    </button>
  );
}
