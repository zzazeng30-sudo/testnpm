// src/features/map/components/Modals/ImageViewerModal.jsx
import React from 'react';
// ▼ 경로 수정 (기존: ../../context/MapContext -> 수정: ../../../../contexts/MapContext)
import { useMap } from '../../../../contexts/MapContext';
import styles from "../../pages/MapPage.module.css";

export default function ImageViewerModal() {
  const { viewingImage, setViewingImage } = useMap();

  if (!viewingImage) return null;

  return (
    <div
      className={styles.imModalOverlay} 
      onClick={() => setViewingImage(null)}
    >
      <div
        className={styles.imageViewerModal} 
        onClick={(e) => e.stopPropagation()} 
      >
        <img
          src={viewingImage.startsWith('blob:') ? viewingImage : viewingImage + `?t=${new Date().getTime()}`}
          alt="확대 보기"
        />
        <button
          onClick={() => setViewingImage(null)}
          className={styles.imageViewerCloseButton} 
        >
          X
        </button>
      </div>
    </div>
  );
}