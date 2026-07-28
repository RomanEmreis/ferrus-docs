import {useEffect, useId, useState} from 'react';
import CodeBlock from '@theme/CodeBlock';

import styles from './styles.module.css';

type InstallTarget = 'windows' | 'unix';

const INSTALL_OPTIONS: Array<{
  id: InstallTarget;
  label: string;
  language: string;
  command: string;
}> = [
  {
    id: 'windows',
    label: 'Windows',
    language: 'powershell',
    command:
      'iwr https://github.com/ferrus-dev/ferrus/releases/latest/download/install.ps1 -useb | iex',
  },
  {
    id: 'unix',
    label: 'Linux/macOS',
    language: 'bash',
    command:
      'curl -fsSL https://github.com/ferrus-dev/ferrus/releases/latest/download/install.sh | sh',
  },
];

function detectInstallTarget(): InstallTarget {
  if (typeof navigator === 'undefined') {
    return 'windows';
  }

  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  const osText = `${platform} ${userAgent}`;

  if (
    osText.includes('mac') ||
    osText.includes('linux') ||
    osText.includes('x11')
  ) {
    return 'unix';
  }

  return 'windows';
}

export default function InstallTabs() {
  const [activeTarget, setActiveTarget] = useState<InstallTarget>('windows');
  const tabGroupId = useId();
  const activeOption =
    INSTALL_OPTIONS.find((option) => option.id === activeTarget) ??
    INSTALL_OPTIONS[0];

  useEffect(() => {
    setActiveTarget(detectInstallTarget());
  }, []);

  return (
    <div className={styles.installTabs}>
      <div className={styles.tabList} role="tablist" aria-label="Install script">
        {INSTALL_OPTIONS.map((option, index) => {
          const selected = option.id === activeTarget;
          const tabId = `${tabGroupId}-${option.id}-tab`;
          const panelId = `${tabGroupId}-${option.id}-panel`;

          return (
            <span key={option.id} className={styles.tabItem}>
              {index > 0 && <span className={styles.separator}>|</span>}
              <button
                id={tabId}
                className={styles.tab}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTarget(option.id)}>
                {option.label}
              </button>
            </span>
          );
        })}
      </div>

      {INSTALL_OPTIONS.map((option) => {
        const selected = option.id === activeTarget;
        const tabId = `${tabGroupId}-${option.id}-tab`;
        const panelId = `${tabGroupId}-${option.id}-panel`;

        return (
          <div
            key={option.id}
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId}
            hidden={!selected}>
            {selected && (
              <CodeBlock language={activeOption.language}>
                {activeOption.command}
              </CodeBlock>
            )}
          </div>
        );
      })}
    </div>
  );
}
