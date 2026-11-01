"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./Background3D.module.css";

const Background3DCanvas = dynamic(() => import("./Background3D"), {
  ssr: false,
});

export default function Background3DLoader() {
  const pathname = usePathname();
  const [showCanvas, setShowCanvas] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 761px)");
    const updateCanvasVisibility = () => {
      setShowCanvas(media.matches && !pathname?.startsWith("/history"));
    };

    updateCanvasVisibility();
    media.addEventListener("change", updateCanvasVisibility);
    return () => media.removeEventListener("change", updateCanvasVisibility);
  }, [pathname]);

  if (showCanvas) return <Background3DCanvas />;

  return (
    <div
      aria-hidden="true"
      className={`${styles.canvasContainer} ${styles.staticBackground}`}
    />
  );
}
