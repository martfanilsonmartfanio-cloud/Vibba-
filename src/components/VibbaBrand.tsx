import React from 'react';

interface VibbaAvatarProps {
  src: string;
  alt: string;
  sizeClass?: string;
  isOnline?: boolean;
  initials?: string;
}

export const VibbaAvatar: React.FC<VibbaAvatarProps> = ({
  src,
  alt,
  sizeClass = 'w-11 h-11',
  isOnline = false,
  initials = 'VB',
}) => {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [src]);

  const validSrc = src && src.trim().length > 0 ? src : null;

  return (
    <div
      className={`relative shrink-0 rounded-full bg-[#3A3B3C] p-[1px] ${sizeClass}`}
    >
      <div className="w-full h-full rounded-full overflow-hidden bg-[#242526] flex items-center justify-center">
        {validSrc && !imgError ? (
          <img
            src={validSrc}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold text-[#E4E6EB] font-display">
            {initials}
          </span>
        )}
      </div>
      {isOnline && (
        <span
          title="Online agora"
          aria-label="Online agora"
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#31A24C] ring-2 ring-[#242526]"
        />
      )}
    </div>
  );
};
