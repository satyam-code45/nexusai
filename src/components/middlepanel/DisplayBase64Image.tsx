import { useState } from "react";

export default function DisplayBase64Image() {
  const [imageData] = useState(
    ""
  );

  return (
    <div>
      <h2>Base64 Image:</h2>
      <img src={imageData} alt="Captured" style={{ maxWidth: "100%" }} />
    </div>
  );
}
