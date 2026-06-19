// SPDX-License-Identifier: MIT
import { useState, useEffect } from "react";
import { safeGetItem } from "@/utils/safeStorage";

const VALID_TEXT_SIZES = ["small", "normal", "large"];

export default function useTextSize() {
  const [textSize, setTextSize] = useState("normal");
  const [textSizeClass, setTextSizeClass] = useState("text-[14px]");

  const getTextSizeClass: any = (size) => {
    switch (size) {
      case "small":
        return "text-[12px]";
      case "large":
        return "text-[18px]";
      default:
        return "text-[14px]";
    }
  };

  useEffect(() => {
    const storedTextSize = safeGetItem("openafd_text_size");
    if (storedTextSize && VALID_TEXT_SIZES.includes(storedTextSize)) {
      setTextSize(storedTextSize);
      setTextSizeClass(getTextSizeClass(storedTextSize));
    }

    const handleTextSizeChange: any = (event) => {
      const size = event.detail;
      setTextSize(size);
      setTextSizeClass(getTextSizeClass(size));
    };

    window.addEventListener("textSizeChange", handleTextSizeChange);
    return () => {
      window.removeEventListener("textSizeChange", handleTextSizeChange);
    };
  }, []);

  return { textSize, textSizeClass };
}
