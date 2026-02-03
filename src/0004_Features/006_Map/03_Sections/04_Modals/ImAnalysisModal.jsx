// src/0004_Features/006_Map/03_Sections/04_Modals/ImAnalysisModal.jsx
import React from 'react';
// import ReactMarkdown from 'react-markdown'; // 삭제
import { useMap } from '../../02_Contexts/MapContext';
import styles from "../../01_Pages/MapOverlays.module.css";

export default function ImAnalysisModal({ content, onClose }) {
  if (!content) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.analysisModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>AI 입지 분석 리포트</h3>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          {/* ReactMarkdown 대신 그냥 텍스트로 출력 */}
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {content}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.confirmButton} onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}