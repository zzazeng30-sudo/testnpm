// src/0004_Features/006_Map/03_Sections/04_Modals/ImageViewerModal.jsx
import React from 'react';
import { useMap } from '../../02_Contexts/MapContext';
// ★ 수정됨: pages -> 01_Pages
import styles from "../../01_Pages/MapOverlays.module.css";

export default function ImageViewerModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.imageViewerContent} onClick={(e) => e.stopPropagation()}>
        <img src={imageUrl} alt="확대 보기" className={styles.fullImage} />
        <button className={styles.closeButton} onClick={onClose}>
          &times;
        </button>
      </div>
    </div>
  );
}