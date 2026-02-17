'use client'

interface AvatarWithFrameProps {
  src?: string
  alt: string
  equippedFrame?: number | null
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  className?: string
  onClick?: () => void
  style?: React.CSSProperties
  frameScale?: number
}

export default function AvatarWithFrame({
  src,
  alt,
  equippedFrame = null,
  size = 'md',
  className = '',
  onClick,
  style,
  frameScale = 1,
}: AvatarWithFrameProps) {
  const frameMap: Record<number, string> = {
    1: '/Visuals/WhiteAvatarFrame.png',
    2: '/Visuals/NeonAvatarFrame.png',
    3: '/Visuals/CrimsonAvatarFrame.png',
  }

  const hasFrame = equippedFrame && frameMap[equippedFrame]
  const frameImage = hasFrame ? frameMap[equippedFrame] : null

  // Base avatar sizes - these are the AVATAR sizes when there's NO frame
  const baseSizes: Record<string, number> = {
    sm: 40,
    md: 48,
    lg: 56,
    xl: 144,
    xxl: 180,
  }

  const basePx = baseSizes[size]

  // When frame is equipped:
  // - Container stays at base size for layout consistency
  // - Avatar becomes 85% of container to fill most of the frame's interior
  // - Frame covers the full container
  const avatarScale = 0.85
  const containerPx = basePx
  const avatarPx = hasFrame ? Math.round(basePx * avatarScale) : basePx
  const offsetPx = hasFrame ? Math.round((containerPx - avatarPx) / 2) : 0

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        position: 'relative',
        width: containerPx,
        height: containerPx,
        flexShrink: 0,
        ...style,
      }}
    >
      {/* AVATAR - centered inside the frame */}
      <div
        style={{
          position: 'absolute',
          top: offsetPx,
          left: offsetPx,
          width: avatarPx,
          height: avatarPx,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {src && src.trim() ? (
          <img
            src={src}
            alt={alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            draggable={false}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#4B5563',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ 
              fontWeight: 'bold', 
              color: 'white',
              fontSize: size === 'xl' ? 36 : size === 'lg' ? 18 : size === 'md' ? 14 : 12,
            }}>
              ?
            </span>
          </div>
        )}
      </div>
      
      {/* FRAME - covers entire container */}
      {frameImage && (
        <img
          src={frameImage}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${frameScale})`,
            width: containerPx,
            height: containerPx,
            pointerEvents: 'none',
            zIndex: 10,
            transformOrigin: 'center',
          }}
        />
      )}
    </div>
  )
}
