"use client";

import dynamic from "next/dynamic";

// three.js only runs in the browser; keep it out of the server render and the initial bundle
const PrintHero = dynamic(() => import("@/components/site/PrintHero"), { ssr: false });

export default PrintHero;
