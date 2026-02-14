import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface GridMotionProps {
  items?: (string | React.ReactNode)[];
  gradientColor?: string;
}

const GridMotion = ({ items = [], gradientColor = 'black' }: GridMotionProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mouseXRef = useRef(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);

  const totalItems = 28;
  const defaultItems = Array.from({ length: totalItems }, (_, index) => `Item ${index + 1}`);
  const combinedItems = items.length > 0 ? items.slice(0, totalItems) : defaultItems;

  useEffect(() => {
    gsap.ticker.lagSmoothing(0);

    const handleMouseMove = (e: MouseEvent) => {
      mouseXRef.current = e.clientX;
    };

    const updateMotion = () => {
      const maxMoveAmount = 300;
      const baseDuration = 0.8;
      const inertiaFactors = [0.6, 0.4, 0.3, 0.2];

      rowRefs.current.forEach((row, index) => {
        if (row) {
          const direction = index % 2 === 0 ? 1 : -1;
          const moveAmount = ((mouseXRef.current / window.innerWidth) * maxMoveAmount - maxMoveAmount / 2) * direction;

          gsap.to(row, {
            x: moveAmount,
            duration: baseDuration + inertiaFactors[index % inertiaFactors.length],
            ease: 'power3.out',
            overwrite: 'auto'
          });
        }
      });
    };

    const removeAnimationLoop = gsap.ticker.add(updateMotion);

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      removeAnimationLoop();
    };
  }, []);

  return (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden' }} ref={gridRef}>
      <section
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle, ${gradientColor} 0%, transparent 100%)`
        }}
      >
        <div style={{
          gap: '1rem',
          flex: 'none',
          position: 'relative',
          width: '150vw',
          height: '150vh',
          display: 'grid',
          gridTemplateRows: 'repeat(4, 1fr)',
          gridTemplateColumns: '100%',
          transform: 'rotate(-15deg)',
          transformOrigin: 'center center',
          zIndex: 2
        }}>
          {[...Array(4)].map((_, rowIndex) => (
            <div key={rowIndex} style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(7, 1fr)',
              willChange: 'transform, filter'
            }} ref={el => { rowRefs.current[rowIndex] = el; }}>
              {[...Array(7)].map((_, itemIndex) => {
                const content = combinedItems[rowIndex * 7 + itemIndex];
                return (
                  <div key={itemIndex} style={{ position: 'relative' }}>
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      overflow: 'hidden',
                      borderRadius: '10px',
                      backgroundColor: '#111',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.5rem'
                    }}>
                      {typeof content === 'string' && content.startsWith('http') ? (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          backgroundSize: 'cover',
                          backgroundPosition: '50% 50%',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          backgroundImage: `url(${content})`
                        }} />
                      ) : (
                        <div style={{ padding: '1rem', textAlign: 'center', zIndex: 1 }}>{content}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default GridMotion;
