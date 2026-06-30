
// "use client";

// import { useEffect, useState } from "react";
// import MindMapModel from "./MindMapModal";


// export default function MindMapModalWrapper() {
//     const [ready, setReady] = useState(false);
 

//     // Wait for client hydration
//     useEffect(() => {
//         setReady(true);
//     }, []);


//     if (!ready) return null;  // prevents hydration mismatch



//     return <MindMapModel />
// }
"use client";

import dynamic from "next/dynamic";

const MindMapModel = dynamic(() => import("./MindMapModal"), {
  ssr: false,
  loading: () => <p>Loading Mind Map...</p>, // Optional loading state
});

export default function MindMapModalWrapper() {

  return <MindMapModel />;
}