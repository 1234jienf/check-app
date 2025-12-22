"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QuillEditor from "@/components/QuillEditor";

export default function NewQuestionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState<"korean" | "english">("korean");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; url: string }>>([]);
  const quillRef = useRef<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setStudentId(user.id);

      // 현재 선택한 과목 가져오기
      if (typeof window !== 'undefined') {
        const savedSubject = sessionStorage.getItem('selectedSubject') as "korean" | "english" | null;
        if (savedSubject) {
          setSubject(savedSubject);
        }
      }
    };

    loadData();
  }, [router]);

  // 이미지 업로드 핸들러
  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload-question-image", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.error) {
          alert("이미지 업로드에 실패했습니다: " + data.error);
          return;
        }

        // Quill 에디터에 이미지 삽입
        const quill = quillRef.current;
        if (quill) {
          const range = quill.getSelection(true);
          const index = range ? range.index : quill.getLength();
          
          // 이미지를 embed로 삽입 (Quill의 기본 방식)
          quill.insertText(index, '\n', 'user');
          quill.insertEmbed(index + 1, 'image', data.url, 'user');
          quill.insertText(index + 2, '\n', 'user');
          quill.setSelection(index + 3);
          
          // 에디터 강제 업데이트
          setTimeout(() => {
            quill.update();
            // 이미지가 로드되도록 강제
            const imgElements = quill.root.querySelectorAll('img');
            imgElements.forEach((img: HTMLImageElement) => {
              if (img.src === data.url && !img.complete) {
                img.onload = () => quill.update();
              }
            });
          }, 100);
        }
      } catch (error: any) {
        alert("이미지 업로드 중 오류가 발생했습니다: " + error.message);
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

  // 첨부파일 업로드 핸들러
  const fileHandler = async () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "*/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload-question-file", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.error) {
          alert("파일 업로드에 실패했습니다: " + data.error);
          return;
        }

      } catch (error: any) {
        alert("파일 업로드 중 오류가 발생했습니다: " + error.message);
      }
    };
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
        [{ 'custom-divider': true }],
        ['clean']
      ],
      handlers: {
        image: imageHandler,
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
    'link', 'image', 'divider'
  ];


  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !studentId) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("questions")
      .insert({
        student_id: studentId,
        subject: subject,
        title: title.trim(),
        content: content.trim(),
      });

    if (error) {
      alert("질문 작성에 실패했습니다: " + error.message);
      setSaving(false);
    } else {
      alert("질문이 작성되었습니다.");
      router.push("/student/questions");
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-4xl mx-auto">
        <Link
          href="/student/questions"
          className="inline-flex items-center mb-6 transition-colors"
          style={{ color: '#13181B' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          게시판으로 돌아가기
        </Link>

        <div className="rounded-xl p-6 md:p-8 shadow-xl border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: '#13181B' }}>
            {subject === "korean" ? "국어" : "영어"} 질문 작성
          </h1>

          <div className="space-y-6">
            {/* 제목 */}
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#13181B' }}>
                제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-2"
                style={{ borderColor: '#CCD5DA', color: '#13181B' }}
                placeholder="질문 제목을 입력하세요"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#13181B';
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CCD5DA';
                }}
              />
            </div>

            {/* 내용 */}
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#13181B' }}>
                내용
              </label>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0.75rem' }}>
                <QuillEditor
                  value={content}
                  onChange={setContent}
                  modules={modules}
                  formats={formats}
                  placeholder="질문 내용을 입력하세요"
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
                .ql-toolbar .ql-divider::before {
                  content: '━';
                  font-size: 18px;
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
                /* 첨부파일 버튼 스타일 */
                .ql-toolbar .ql-custom-file {
                  width: 28px;
                  height: 28px;
                  border: none;
                  background: transparent;
                  cursor: pointer;
                  font-size: 18px;
                }
                .ql-toolbar .ql-custom-file:hover {
                  opacity: 0.7;
                }
                /* 이미지 스타일 - 바로 보이도록 */
                .ql-editor img {
                  max-width: 100%;
                  height: auto;
                  display: block !important;
                  margin: 1em 0;
                  object-fit: contain;
                }
                .ql-editor .ql-image {
                  display: inline-block;
                }
                .ql-editor a {
                  color: #13181B;
                  text-decoration: underline;
                }
                .ql-editor a:hover {
                  opacity: 0.7;
                }
              `}</style>
            </div>

            {/* 첨부파일 업로드 */}
            <div>
              <label className="block font-semibold mb-2" style={{ color: '#13181B' }}>
                첨부파일
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="file"
                  id="fileUpload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      const formData = new FormData();
                      formData.append("file", file);

                      const response = await fetch("/api/upload-question-file", {
                        method: "POST",
                        body: formData,
                      });

                      const data = await response.json();

                      if (data.error) {
                        alert("파일 업로드에 실패했습니다: " + data.error);
                        return;
                      }

                      // 첨부파일 목록에 추가
                      setAttachedFiles([...attachedFiles, { name: data.originalName, url: data.url }]);

                      // Quill 에디터에 파일 삽입 (이미지면 이미지로, 아니면 링크로)
                      const quill = quillRef.current;
                      if (quill) {
                        const range = quill.getSelection(true);
                        const index = range ? range.index : quill.getLength();
                        
                        // 이미지 파일인지 확인
                        const isImage = file.type.startsWith('image/');
                        
                        if (isImage) {
                          // 이미지 파일이면 이미지로 삽입
                          quill.insertText(index, '\n', 'user');
                          quill.insertEmbed(index + 1, 'image', data.url, 'user');
                          quill.insertText(index + 2, '\n', 'user');
                          quill.setSelection(index + 3);
                          
                          // 에디터 강제 업데이트
                          setTimeout(() => {
                            quill.update();
                            const imgElements = quill.root.querySelectorAll('img');
                            imgElements.forEach((img: HTMLImageElement) => {
                              if (img.src === data.url && !img.complete) {
                                img.onload = () => quill.update();
                              }
                            });
                          }, 100);
                        } else {
                          // 일반 파일이면 링크로 삽입
                          const linkHtml = `<a href="${data.url}" target="_blank" rel="noopener noreferrer">📎 ${data.originalName}</a>`;
                          quill.clipboard.dangerouslyPasteHTML(index, `\n${linkHtml}\n`);
                          quill.setSelection(index + linkHtml.length + 2);
                        }
                      }

                      // input 초기화
                      e.target.value = '';
                    } catch (error: any) {
                      alert("파일 업로드 중 오류가 발생했습니다: " + error.message);
                    }
                  }}
                />
                <label
                  htmlFor="fileUpload"
                  className="inline-block px-4 py-2 border-2 rounded-lg cursor-pointer text-sm transition-all"
                  style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#13181B';
                    e.currentTarget.style.backgroundColor = '#CCD5DA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#CCD5DA';
                    e.currentTarget.style.backgroundColor = '#F0EEEB';
                  }}
                >
                  📎 파일 첨부
                </label>
                <span className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                  최대 2MB
                </span>
              </div>
              {attachedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg border" style={{ borderColor: '#CCD5DA', backgroundColor: '#F0EEEB' }}>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm flex items-center gap-2"
                        style={{ color: '#13181B' }}
                      >
                        📎 {file.name}
                      </a>
                      <button
                        onClick={() => {
                          setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
                        }}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 제출 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={saving || !title.trim() || !content.trim()}
                className="px-6 py-3 rounded-xl font-semibold transition-all"
                style={{
                  backgroundColor: '#13181B',
                  color: '#F0EEEB',
                  opacity: (saving || !title.trim() || !content.trim()) ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!saving && title.trim() && content.trim()) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {saving ? "작성 중..." : "작성하기"}
              </button>
              <Link
                href="/student/questions"
                className="px-6 py-3 rounded-xl font-semibold transition-all text-center"
                style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}
              >
                취소
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
