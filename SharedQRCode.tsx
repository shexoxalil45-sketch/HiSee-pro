import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface SharedQRCodeProps {
  value: string;
  size?: number;
  avatarUrl?: string;
  className?: string;
}

export const SharedQRCode: React.FC<SharedQRCodeProps> = ({ value, size = 200, avatarUrl, className }) => {
  return (
    <div className={`bg-white p-4 rounded-2xl inline-block ${className}`}>
      <QRCodeSVG 
        value={value}
        size={size}
        level="H"
        includeMargin={true}
        imageSettings={avatarUrl ? {
          src: avatarUrl,
          x: undefined,
          y: undefined,
          height: size / 5,
          width: size / 5,
          excavate: true,
        } : undefined}
      />
    </div>
  );
};
