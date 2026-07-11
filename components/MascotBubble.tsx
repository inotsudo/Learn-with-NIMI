import React from "react";

const MascotBubble: React.FC<{ message: string; emotion?: "happy" | "excited" }> = ({
  message,
  emotion = "happy",
}) => {
  const mascotImage = emotion === "excited" ? "/mascot/happy.png" : "/mascot/smile.png";

  return (
    <div className="flex items-start gap-4 mb-6">
      <img src={mascotImage} alt="Mascot" className="w-16 h-16"  loading="lazy" />
      <div className="bg-white shadow-md px-6 py-4 text-lg font-medium text-gray-700 max-w-xl" style={{ borderRadius: 'var(--leaf-r-lg)' }}>
        {message}
      </div>
    </div>
  );
};

export default MascotBubble;
