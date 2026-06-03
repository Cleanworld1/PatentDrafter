"use client";

import { useCallback, useState } from "react";
import {
  createUploadedFileFromBrowserFile,
  getSupportedExtensions,
  isSupportedFile
} from "@/lib/fileExtractService";
import { getAiInputModeLabel, getFileStatusLabel } from "@/lib/fileInput/detectFileType";
import { registerFileBlob, removeFileBlob } from "@/lib/client/fileBlobRegistry";
import { usePatentDraftStore } from "@/store/patentDraftStore";
import type { MaterialType, UploadedFile } from "@/types/patentDraft";
import { MATERIAL_TYPES } from "@/types/patentDraft";

export function FileDropzone() {
  const addUploadedFile = usePatentDraftStore((s) => s.addUploadedFile);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      setUploadError("");
      for (const file of Array.from(files)) {
        if (!isSupportedFile(file.name)) {
          setUploadError(`지원하지 않는 파일: ${file.name}`);
          continue;
        }
        const entry = createUploadedFileFromBrowserFile(file);
        entry.fileObjectRef = entry.id;
        registerFileBlob(entry.id, file);
        addUploadedFile(entry);
      }
    },
    [addUploadedFile]
  );

  const extensions = getSupportedExtensions().join(", ");

  return (
    <div className="settings-card">
      <h3 className="settings-card-title">파일 업로드</h3>
      <p className="settings-card-hint">
        이미지·PDF·DOCX·PPTX·XLSX 등은 원본 파일을 AI에 직접 전달해 분석합니다. 텍스트 추출은 불가능한 경우에만 fallback으로 사용됩니다.
      </p>
      <div
        className={`file-dropzone${dragOver ? " drag-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          processFiles(e.dataTransfer.files);
        }}
      >
        <p>파일을 드래그앤드롭하거나 클릭하여 선택</p>
        <p className="file-dropzone-formats">지원: {extensions}</p>
        <input
          type="file"
          multiple
          accept={getSupportedExtensions().join(",")}
          className="file-input-hidden"
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {uploadError && <p className="upload-error">{uploadError}</p>}
    </div>
  );
}

export function UploadedFileList() {
  const files = usePatentDraftStore((s) => s.uploadedFiles);
  const removeUploadedFile = usePatentDraftStore((s) => s.removeUploadedFile);
  const updateMaterialType = usePatentDraftStore((s) => s.updateUploadedFileMaterialType);

  if (files.length === 0) return null;

  return (
    <div className="settings-card">
      <h3 className="settings-card-title">업로드된 파일</h3>
      <ul className="uploaded-file-list">
        {files.map((file) => (
          <UploadedFileRow
            key={file.id}
            file={file}
            onRemove={() => {
              removeFileBlob(file.id);
              removeUploadedFile(file.id);
            }}
            onMaterialChange={(type) => updateMaterialType(file.id, type)}
          />
        ))}
      </ul>
    </div>
  );
}

function UploadedFileRow({
  file,
  onRemove,
  onMaterialChange
}: {
  file: UploadedFile;
  onRemove: () => void;
  onMaterialChange: (type: MaterialType) => void;
}) {
  const modeLabel = getAiInputModeLabel(file.aiInputMode, file.name);
  const statusLabel = getFileStatusLabel(file.status, file.fallbackUsed);

  return (
    <li className="uploaded-file-item">
      <div className="uploaded-file-info">
        <span className="uploaded-file-name" title={modeLabel}>
          {file.name}
        </span>
        <span className={`uploaded-file-status status-${file.status}`}>{statusLabel}</span>
      </div>
      <p className="uploaded-file-mode">{modeLabel}</p>
      {file.analysisNotes && <p className="uploaded-file-notes">{file.analysisNotes}</p>}
      <select value={file.materialType} onChange={(e) => onMaterialChange(e.target.value as MaterialType)}>
        {MATERIAL_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <button type="button" className="btn-text-danger" onClick={onRemove}>
        삭제
      </button>
    </li>
  );
}
