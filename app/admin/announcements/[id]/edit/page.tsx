"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import QuillEditor from "@/components/QuillEditor";

export default function EditAnnouncementPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const quillRef = useRef<any>(null);

  useEffect(() => {
    const loadAnnouncement = async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        alert("공지사항을 불러올 수 없습니다.");
        router.push("/admin/announcements");
        return;
      }

      if (data) {
        setTitle(data.title);
        // HTML 내용을 그대로 설정 (띄어쓰기/줄바꿈 유지)
        setContent(data.content || "");
        setIsPinned(data.is_pinned || false);
      }

      setLoading(false);
    };

    if (id) {
      loadAnnouncement();
    }
  }, [id, router]);

  // 이미지 업로드 핸들러
  // 이미지 리사이즈 함수
  const resizeImage = (file: File, maxWidth: number, maxHeight: number, quality: number = 0.9): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // 비율 유지하면서 리사이즈
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            } else {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const resizedFile = new File([blob], file.name, { type: file.type });
                  resolve(resizedFile);
                } else {
                  resolve(file);
                }
              },
              file.type,
              quality
            );
          } else {
            resolve(file);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const quill = quillRef.current;
      if (!quill) return;

      // 로딩 표시를 위한 플레이스홀더 이미지 삽입
      const range = quill.getSelection(true);
      const index = range ? range.index : quill.getLength();
      quill.insertText(index, '\n', 'user');
      quill.insertEmbed(index + 1, "image", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='100'%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3E업로드 중...%3C/text%3E%3C/svg%3E", 'user');
      quill.insertText(index + 2, '\n', 'user');
      const loadingIndex = index + 1;

      try {
        // 이미지 사이즈 조절 (최대 1920x1080, 품질 0.8로 낮춤)
        const resizedFile = await resizeImage(file, 1920, 1080, 0.8);
        
        const formData = new FormData();
        formData.append("file", resizedFile);

        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          // 로딩 이미지 제거
          quill.deleteText(loadingIndex - 1, 3);
          alert("이미지 업로드에 실패했습니다: " + data.error);
          return;
        }

        // 로딩 이미지를 실제 이미지로 교체
        quill.deleteText(loadingIndex - 1, 1);
        quill.insertEmbed(loadingIndex - 1, "image", data.url, 'user');
        quill.setSelection(loadingIndex + 1);
        
        // 이미지 강제 업데이트
        setTimeout(() => {
          quill.update();
          const imgElements = quill.root.querySelectorAll('img');
          imgElements.forEach((img: HTMLImageElement) => {
            if (img.src === data.url && !img.complete) {
              img.onload = () => quill.update();
            }
          });
        }, 100);
      } catch (error: any) {
        // 로딩 이미지 제거
        quill.deleteText(loadingIndex - 1, 3);
        console.error("Image upload error:", error);
        alert("이미지 업로드 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"));
      }
    };
  };

  const audioHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "audio/*,.mp3,.m4a,.wav,.webm,.ogg,.aac");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const quill = quillRef.current;
      if (!quill) return;

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const extOk = ["mp3", "m4a", "wav", "webm", "ogg", "aac", "flac"].includes(ext);
      if (!file.type.startsWith("audio/") && !extOk) {
        alert("음성 파일만 업로드할 수 있습니다. (mp3, m4a, wav 등)");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert("파일 크기는 50MB 이하여야 합니다.");
        return;
      }

      const range = quill.getSelection(true);
      const index = range ? range.index : quill.getLength();
      quill.insertText(index, "\n", "user");
      const start = index + 1;
      const loadingText = "음성 업로드 중...";
      quill.insertText(start, loadingText + "\n", "user");
      const loadLen = loadingText.length + 1;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          quill.deleteText(start, loadLen);
          alert("로그인이 필요합니다.");
          return;
        }

        const presignRes = await fetch("/api/announcement-audio-presign", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileSize: file.size, extension: ext || "mp3" }),
        });

        const presignRaw = await presignRes.text();
        let presign: { path?: string; token?: string; error?: string };
        try {
          presign = JSON.parse(presignRaw) as { path?: string; token?: string; error?: string };
        } catch {
          quill.deleteText(start, loadLen);
          alert(
            `서명 요청 응답을 읽을 수 없습니다. (${presignRes.status})`
          );
          return;
        }

        if (!presignRes.ok || presign.error || !presign.path || !presign.token) {
          quill.deleteText(start, loadLen);
          alert(presign.error || `업로드 준비에 실패했습니다. (${presignRes.status})`);
          return;
        }

        const { error: upErr } = await supabase.storage
          .from("files")
          .uploadToSignedUrl(presign.path, presign.token, file, {
            contentType: file.type || "audio/mpeg",
            upsert: false,
          });

        if (upErr) {
          quill.deleteText(start, loadLen);
          alert("Storage 업로드 실패: " + upErr.message);
          return;
        }

        const { data: urlData } = supabase.storage.from("files").getPublicUrl(presign.path);
        const audioUrl = (urlData.publicUrl || "").trim().replace(/\s+/g, "");

        if (!audioUrl) {
          quill.deleteText(start, loadLen);
          alert("파일 주소를 받지 못했습니다.");
          return;
        }
        try {
          const u = new URL(audioUrl);
          if (u.protocol !== "http:" && u.protocol !== "https:") {
            throw new Error("invalid protocol");
          }
        } catch {
          quill.deleteText(start, loadLen);
          alert("파일 주소 형식이 올바르지 않습니다. Supabase URL 환경 변수에 공백이 없는지 확인해 주세요.");
          return;
        }

        quill.deleteText(start, loadLen);
        quill.insertEmbed(start, "audio", audioUrl, "user");
        quill.insertText(start + 1, "\n", "user");
        quill.setSelection(start + 2);
      } catch (error: unknown) {
        quill.deleteText(start, loadLen);
        console.error("Audio upload error:", error);
        const msg = error instanceof Error ? error.message : "알 수 없는 오류";
        alert("음성 업로드 중 오류가 발생했습니다: " + msg);
      }
    };
  };

  // 구분선 삽입 핸들러
  const dividerHandlerSimple = () => {
    const quill = quillRef.current;
    if (quill) {
      const range = quill.getSelection(true);
      const index = range ? range.index : quill.getLength();
      quill.insertText(index, '\n', 'user');
      quill.insertEmbed(index + 1, 'divider', true, 'user');
      quill.insertText(index + 2, '\n', 'user');
      quill.setSelection(index + 3);
    }
  };

  // Quill 모듈 설정
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['10px', '11px', '12px', '13px', '14px', '15px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        [{ 'custom-audio': true }],
        [{ 'custom-divider': true }],
        ['clean']
      ],
      handlers: {
        image: imageHandler,
        'custom-audio': audioHandler,
        'custom-divider': dividerHandlerSimple,
      },
    },
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'align',
    'list', 'indent',
    'blockquote', 'code-block',
    'link', 'image', 'audio', 'divider'
  ];


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!content.trim() || content === '<p><br></p>') {
      alert("내용을 입력해주세요.");
      return;
    }

    setSaving(true);

    // content는 HTML이므로 trim()을 사용하지 않고, 빈 HTML만 체크
    const cleanContent = content && content.trim() && content !== '<p><br></p>' && content !== '<p></p>' 
      ? content 
      : '';

    const { error } = await supabase
      .from("announcements")
      .update({
        title: title.trim(),
        content: cleanContent,
        is_pinned: isPinned,
      })
      .eq("id", id);

    if (error) {
      alert("공지사항 수정에 실패했습니다.");
      setSaving(false);
    } else {
      router.push("/admin/announcements");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F0EEEB' }}>
        <div className="text-center">
          <div className="mx-auto mb-4" style={{ 
            animation: 'spin 2s linear infinite, pulse 2s ease-in-out infinite',
            width: '80px',
            height: '80px'
          }}>
            <img 
              src="/bishop-logo.png" 
              alt="Loading" 
              className="w-full h-full"
              style={{ filter: 'grayscale(100%) brightness(0.8)' }}
            />
          </div>
          <p style={{ color: '#13181B' }}>로딩 중...</p>
          <style jsx>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.6; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/admin/announcements"
            className="inline-flex items-center mb-4 transition-colors"
            style={{ color: '#13181B' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            공지사항 목록으로 돌아가기
          </Link>
          <div className="flex items-center gap-3">
            <img src="/pawn_black.svg" alt="Pawn" className="w-10 h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h1 className="text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
              공지 수정
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all"
              style={{
                backgroundColor: '#F0EEEB',
                borderColor: '#CCD5DA',
                color: '#13181B',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(19, 24, 27, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="공지사항 제목을 입력하세요"
              disabled={saving}
            />
            <style jsx>{`
              input::placeholder {
                color: #13181B;
                opacity: 0.5;
              }
            `}</style>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
              내용
            </label>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.75rem' }} key={`quill-editor-${id}`}>
              <QuillEditor
                value={content}
                onChange={setContent}
                modules={modules}
                formats={formats}
                placeholder="공지사항 내용을 입력하세요"
                style={{
                  minHeight: '400px',
                }}
                onEditorReady={(editor) => {
                  quillRef.current = editor;
                }}
              />
            </div>
            <style jsx global>{`
              .ql-container {
                min-height: 400px;
                font-size: 16px;
                color: #13181B;
                background-color: #F0EEEB;
                border-bottom-left-radius: 0.75rem;
                border-bottom-right-radius: 0.75rem;
              }
              .ql-editor {
                min-height: 400px;
                line-height: 1.8;
                white-space: pre-wrap;
              }
              .ql-editor p {
                white-space: pre-wrap;
              }
              .ql-editor li {
                white-space: pre-wrap;
                line-height: 1.8;
              }
              .ql-toolbar {
                background-color: #FFFFFF;
                border-top-left-radius: 0.75rem;
                border-top-right-radius: 0.75rem;
                border: 2px solid #CCD5DA;
                border-bottom: none;
              }
              .ql-container {
                border: 2px solid #CCD5DA;
                border-top: none;
              }
              .ql-editor.ql-blank::before {
                color: #13181B;
                opacity: 0.5;
                font-style: normal;
              }
              .ql-snow .ql-stroke {
                stroke: #13181B;
              }
              .ql-snow .ql-fill {
                fill: #13181B;
              }
              .ql-snow .ql-picker-label {
                color: #13181B;
              }
              /* 폰트 크기 숫자로 표시 */
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="10px"]::before {
                content: '10px' !important;
                font-size: 10px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="10px"]::before {
                content: '10px' !important;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="11px"]::before {
                content: '11px' !important;
                font-size: 11px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="11px"]::before {
                content: '11px' !important;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="12px"]::before {
                content: '12px' !important;
                font-size: 12px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="12px"]::before {
                content: '12px' !important;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="13px"]::before {
                content: '13px' !important;
                font-size: 13px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="13px"]::before {
                content: '13px' !important;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="14px"]::before {
                content: '14px' !important;
                font-size: 14px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="14px"]::before {
                content: '14px' !important;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="15px"]::before {
                content: '15px' !important;
                font-size: 15px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="15px"]::before {
                content: '15px' !important;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="16px"]::before {
                content: '16px' !important;
                font-size: 16px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="16px"]::before {
                content: '16px' !important;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="18px"]::before {
                content: '18px' !important;
                font-size: 18px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="18px"]::before {
                content: '18px' !important;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="20px"]::before {
                content: '20px' !important;
                font-size: 20px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="20px"]::before {
                content: '20px' !important;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="24px"]::before {
                content: '24px' !important;
                font-size: 24px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="24px"]::before {
                content: '24px' !important;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="28px"]::before {
                content: '28px' !important;
                font-size: 28px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="28px"]::before {
                content: '28px' !important;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="32px"]::before {
                content: '32px' !important;
                font-size: 32px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="32px"]::before {
                content: '32px' !important;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="36px"]::before {
                content: '36px' !important;
                font-size: 36px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="36px"]::before {
                content: '36px' !important;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="48px"]::before {
                content: '48px' !important;
                font-size: 48px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="48px"]::before {
                content: '48px' !important;
              }
              /* 기본 텍스트 숨기기 */
              .ql-snow .ql-picker.ql-size .ql-picker-item,
              .ql-snow .ql-picker.ql-size .ql-picker-label {
                font-size: 14px;
              }
              .ql-snow .ql-picker.ql-size .ql-picker-item span,
              .ql-snow .ql-picker.ql-size .ql-picker-label span {
                display: none;
              }
              .ql-toolbar .ql-custom-audio::before {
                content: '🎵';
                font-size: 16px;
              }
              .ql-toolbar .ql-divider::before {
                content: '━';
                font-size: 18px;
              }
              .ql-editor audio {
                width: 100%;
                max-width: 28rem;
                display: block;
                margin: 0.75em 0;
              }
              /* 들여쓰기 스타일 - Quill은 클래스 기반으로 작동 (ql-indent-1, ql-indent-2 등) */
              .ql-editor .ql-indent-1 {
                padding-left: 3em !important;
              }
              .ql-editor .ql-indent-2 {
                padding-left: 6em !important;
              }
              .ql-editor .ql-indent-3 {
                padding-left: 9em !important;
              }
              .ql-editor .ql-indent-4 {
                padding-left: 12em !important;
              }
              .ql-editor .ql-indent-5 {
                padding-left: 15em !important;
              }
              .ql-editor .ql-indent-6 {
                padding-left: 18em !important;
              }
              .ql-editor .ql-indent-7 {
                padding-left: 21em !important;
              }
              .ql-editor .ql-indent-8 {
                padding-left: 24em !important;
              }
              /* inline style로 적용된 경우도 처리 */
              .ql-editor [style*="padding-left"] {
                /* inline style이 우선순위가 높으므로 그대로 적용됨 */
              }
              /* 리스트 들여쓰기 */
              .ql-editor ol,
              .ql-editor ul {
                padding-left: 1.5em;
              }
              .ql-editor li {
                padding-left: 0.5em;
              }
              /* 들여쓰기가 적용된 요소는 block으로 표시 */
              .ql-editor p.ql-indent-1,
              .ql-editor p.ql-indent-2,
              .ql-editor p.ql-indent-3,
              .ql-editor p.ql-indent-4,
              .ql-editor p.ql-indent-5,
              .ql-editor p.ql-indent-6,
              .ql-editor p.ql-indent-7,
              .ql-editor p.ql-indent-8,
              .ql-editor div.ql-indent-1,
              .ql-editor div.ql-indent-2,
              .ql-editor div.ql-indent-3,
              .ql-editor div.ql-indent-4,
              .ql-editor div.ql-indent-5,
              .ql-editor div.ql-indent-6,
              .ql-editor div.ql-indent-7,
              .ql-editor div.ql-indent-8 {
                display: block;
              }
            `}</style>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-5 h-5"
              style={{ accentColor: '#13181B' }}
              disabled={saving}
            />
            <label htmlFor="isPinned" className="text-sm font-medium" style={{ color: '#13181B' }}>
              중요 공지로 고정하기
            </label>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (!saving) {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {saving ? "수정 중..." : "수정하기"}
            </button>
            <Link
              href="/admin/announcements"
              className="px-8 py-3 rounded-xl font-semibold transition-all shadow-sm"
              style={{ backgroundColor: '#F0EEEB', color: '#13181B' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#CCD5DA';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F0EEEB';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
              }}
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
