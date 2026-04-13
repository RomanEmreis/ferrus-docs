import type {ReactNode} from 'react';
import styles from './styles.module.css';

/**
 * The same block-character banner ferrus prints on startup in its HQ TUI:
 *
 *   src/hq/tui.rs → fn ferrus_logo_lines()
 *
 * Colored with the same gradient used there:
 *   start = rgb(148, 36, 20)
 *   end   = rgb(226, 128, 18)
 */
const LINES = [
  '███████  ███████  █████   █████   ██   ██  ███████',
  '██       ██       ██  ██  ██  ██  ██   ██  ██     ',
  '█████    █████    █████   █████   ██   ██  ███████',
  '██       ██       ██  ██  ██  ██  ██   ██       ██',
  '██       ███████  ██  ██  ██  ██   █████   ███████',
];

const START: [number, number, number] = [148, 36, 20];
const END: [number, number, number] = [226, 128, 18];

function mix(t: number): string {
  const r = Math.round(START[0] + (END[0] - START[0]) * t);
  const g = Math.round(START[1] + (END[1] - START[1]) * t);
  const b = Math.round(START[2] + (END[2] - START[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function FerrusLogo(): ReactNode {
  return (
    <pre className={styles.logo} aria-label="FERRUS">
      {LINES.map((line, idx) => (
        <span
          key={idx}
          className={styles.line}
          style={{color: mix(idx / (LINES.length - 1))}}>
          {line}
          {'\n'}
        </span>
      ))}
    </pre>
  );
}
