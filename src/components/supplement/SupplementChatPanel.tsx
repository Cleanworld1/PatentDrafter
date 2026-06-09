"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createUploadedFileFromBrowserFile,
  getSupportedExtensions,
  isSupportedFile
} from "@/lib/fileExtractService";
import { registerSupplementChatBlob, removeSupplementChatBlob } from "@/lib/client/supplementChatBlobRegistry";
import { coerceSupplementSectionUpdates } from "@/lib/supplement/parseSupplementSectionUpdates";
import { sectionIdToTitle } from "@/types/specificationSection";
import type { SupplementChatMessage } from "@/types/supplementChat";
import { usePatentDraftStore } from "@/store/patentDraftStore";
import { useSessionApiKeyStore } from "@/store/sessionApiKeyStore";

function resolveMessageSectionUpdates(msg: SupplementChatMessage) {
  return msg.sectionUpdates ?? coerceSupplementSectionUpdates(msg.content, []);
}

export function SupplementChatPanel() {
  const analysis = usePatentDraftStore((s) => s.analysis);
  const messages = usePatentDraftStore((s) => s.supplementChatMessages);
  const attachments = usePatentDraftStore((s) => s.supplementChatAttachments);
  const loadingStage = usePatentDraftStore((s) => s.loadingStage);
  const projectStatus = usePatentDraftStore((s) => s.currentProject.status);
  const canRunAi = useSessionApiKeyStore((s) => s.canRunAi());

  const error = usePatentDraftStore((s) => s.error);
  const sendSupplementMessage = usePatentDraftStore((s) => s.sendSupplementMessage);
  const applySupplementUpdates = usePatentDraftStore((s) => s.applySupplementUpdates);
  const addSupplementAttachment = usePatentDraftStore((s) => s.addSupplementAttachment);
  const removeSupplementAttachment = usePatentDraftStore((s) => s.removeSupplementAttachment);
  const clearSupplementChat = usePatentDraftStore((s) => s.clearSupplementChat);
  const initSupplementChatWelcome = usePatentDraftStore((s) => s.initSupplementChatWelcome);

  const [input, setInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSending = loadingStage === "supplement_chat";
  const canChat = Boolean(analysis) && canRunAi && !isSending;
  const draftReady =
    projectStatus === "draft_complete" || projectStatus === "spec_writing" || messages.length > 1;

  useEffect(() => {
    if (messages.length === 0) {
      initSupplementChatWelcome();
    }
  }, [messages.length, initSupplementChatWelcome]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isSending]);

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      setUploadError("");
      for (const file of Array.from(files)) {
        if (!isSupportedFile(file.name)) {
          setUploadError(`지원하지 않는 파일: ${file.name}`);
          continue;
        }
        const entry = createUploadedFileFromBrowserFile(file);
        registerSupplementChatBlob(entry.id, file);
        addSupplementAttachment(entry);
      }
    },
    [addSupplementAttachment]
  );

  const handleSend = () => {
    const text = input.trim();
    if (!text || !canChat) return;
    setInput("");
    void sendSupplementMessage(text);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!analysis) {
    return (
      <div className="supplement-chat-empty">
        <p>발명 분석 또는 전체 자동 작성을 먼저 실행한 뒤 AI 보완 채팅을 사용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="supplement-chat">
      <header className="supplement-chat-header">
        <h2 className="supplement-chat-title">AI 보완 채팅</h2>
        <p className="supplement-chat-subtitle">
          {draftReady
            ? "초안이 준비되었습니다. 수정·보완 요청을 입력하고, 필요하면 파일을 첨부하세요."
            : "명세서 초안 작성 전에도 질문·자료 제공이 가능합니다."}
        </p>
        <button type="button" className="btn-text-danger supplement-chat-clear" onClick={clearSupplementChat}>
          대화 지우기
        </button>
      </header>

      <div ref={listRef} className="supplement-chat-messages">
        {messages.map((msg) => {
          const sectionUpdates =
            msg.role === "assistant" ? resolveMessageSectionUpdates(msg) : [];
          const pendingUpdates = sectionUpdates.filter(
            (u) => !(msg.appliedSectionIds ?? []).includes(u.section_id)
          );

          return (
            <div
              key={msg.id}
              className={`supplement-chat-bubble supplement-chat-bubble--${msg.role}`}
            >
              <span className="supplement-chat-bubble-role">
                {msg.role === "user" ? "나" : msg.role === "assistant" ? "AI" : "시스템"}
              </span>
              <p className="supplement-chat-bubble-text">{msg.content}</p>
              {msg.attachmentNames && msg.attachmentNames.length > 0 && (
                <p className="supplement-chat-attachments-label">
                  첨부: {msg.attachmentNames.join(", ")}
                </p>
              )}
              {sectionUpdates.length > 0 && (
                <div className="supplement-chat-updates">
                  {sectionUpdates.map((u) => {
                    const applied = (msg.appliedSectionIds ?? []).includes(u.section_id);
                    return (
                      <div key={`${msg.id}-${u.section_id}`} className="supplement-chat-update-card">
                        <strong>{sectionIdToTitle(u.section_id)}</strong>
                        {u.reason && <p className="supplement-chat-update-reason">{u.reason}</p>}
                        <p className="supplement-chat-update-preview">
                          {u.content.length > 160 ? `${u.content.slice(0, 160)}…` : u.content}
                        </p>
                        <button
                          type="button"
                          className="btn-primary btn-secondary--small"
                          disabled={applied}
                          onClick={() => applySupplementUpdates([u], msg.id)}
                        >
                          {applied ? "반영 완료" : "명세서에 반영"}
                        </button>
                      </div>
                    );
                  })}
                  {pendingUpdates.length > 1 && (
                    <button
                      type="button"
                      className="btn-accent btn-secondary--small"
                      onClick={() => applySupplementUpdates(pendingUpdates, msg.id)}
                    >
                      전체 {pendingUpdates.length}건 반영
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {isSending && (
          <div className="supplement-chat-bubble supplement-chat-bubble--assistant">
            <span className="supplement-chat-bubble-role">AI</span>
            <p className="supplement-chat-bubble-text supplement-chat-typing">응답 작성 중…</p>
          </div>
        )}
      </div>

      <div
        className={`supplement-chat-composer${dragOver ? " is-drag-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
        }}
      >
        {attachments.length > 0 && (
          <ul className="supplement-chat-attach-list">
            {attachments.map((f) => (
              <li key={f.id} className="supplement-chat-attach-chip">
                <span title={f.name}>{f.name}</span>
                <button
                  type="button"
                  aria-label="첨부 제거"
                  onClick={() => {
                    removeSupplementChatBlob(f.id);
                    removeSupplementAttachment(f.id);
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {uploadError && <p className="upload-error">{uploadError}</p>}

        <div className="supplement-chat-input-row">
          <button
            type="button"
            className="supplement-chat-file-btn"
            title="파일 첨부"
            aria-label="파일 첨부"
            disabled={!canChat}
            onClick={() => fileInputRef.current?.click()}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="supplement-chat-file-input"
            tabIndex={-1}
            aria-hidden
            accept={getSupportedExtensions().join(",")}
            onChange={(e) => {
              if (e.target.files) processFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <textarea
            ref={textareaRef}
            className="supplement-chat-textarea"
            placeholder="보완 요청을 입력하세요… (Enter 전송, Shift+Enter 줄바꿈)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!canChat}
            rows={3}
          />
          <button
            type="button"
            className="btn-primary supplement-chat-send"
            disabled={!canChat || !input.trim()}
            onClick={handleSend}
          >
            전송
          </button>
        </div>
        <p className="supplement-chat-hint">
          파일을 여기로 드래그하거나 📎로 선택 · 지원: {getSupportedExtensions().join(", ")}
        </p>
        {error && <p className="upload-error supplement-chat-error">{error}</p>}
      </div>
    </div>
  );
}
