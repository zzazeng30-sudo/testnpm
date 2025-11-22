import React from 'react';
import { useMap } from '../../../../contexts/MapContext';
import styles from "../../pages/MapPage.module.css";

export default function ImAnalysisModal() {
  const { imContent, setImContent } = useMap();

  if (!imContent) return null;

  return (
    <div className={styles.imModalOverlay}>
      <div className={styles.imModal}>
        <h2 className={styles.imModalTitle}>AI 생성 입지 분석 (실데이터 기반)</h2>
        <div className={styles.imContentScroll}>
          <pre className={styles.imContentPre}>{imContent}</pre>
        </div>
        <button
          onClick={() => setImContent(null)}
          className={`${styles.button} ${styles.buttonRed}`}
        >
          닫기
        </button>
      </div>
    </div>
  );
}