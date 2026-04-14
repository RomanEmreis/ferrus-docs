import type {ReactNode} from 'react';
import styles from './styles.module.css';

/**
 * 8-bit vibe: an isometric grid scrolling toward the vanishing point,
 * plus a scanline overlay and a handful of glowing pixel "stars".
 * Purely decorative, CSS-animated, no client JS required.
 */
export default function IsoGrid(): ReactNode {
  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={styles.sky} />
      <div className={styles.sun} />
      <div className={styles.gridStage}>
        <div className={styles.gridRot}>
          <div className={styles.grid} />
        </div>
      </div>
      <div className={styles.stars}>
        {Array.from({length: 40}).map((_, i) => (
          <span
            key={i}
            className={styles.star}
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 55}%`,
              animationDelay: `${(i % 10) * 0.4}s`,
            }}
          />
        ))}
      </div>
      <div className={styles.scanlines} />
      <div className={styles.vignette} />
    </div>
  );
}
