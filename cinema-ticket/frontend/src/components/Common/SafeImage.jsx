import { useState } from 'react';

const SafeImage = ({ src, alt, className, style, fallback }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isError, setIsError] = useState(false);

  // Modern, cinematic fallback image
  const defaultFallback = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop';

  const handleError = () => {
    if (!isError) {
      setImgSrc(fallback || defaultFallback);
      setIsError(true);
    }
  };

  return (
    <div className={className} style={{ ...style, overflow: 'hidden', position: 'relative', backgroundColor: '#1a2235' }}>
      <img
        src={imgSrc || fallback || defaultFallback}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={handleError}
      />
      {isError && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          color: 'white',
          fontSize: '0.8rem',
          fontWeight: 700,
          textAlign: 'center',
          padding: '10px',
          textTransform: 'uppercase'
        }}>
          {alt || 'CinemaHub'}
        </div>
      )}
    </div>
  );
};

export default SafeImage;
