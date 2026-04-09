"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import "quill/dist/quill.snow.css";

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  modules?: any;
  formats?: string[];
  placeholder?: string;
  style?: React.CSSProperties;
  onEditorReady?: (editor: any) => void;
}

// 전역 변수로 Quill 인스턴스 추적
const quillInstances = new WeakMap<HTMLDivElement, any>();
const globalInitFlags = new WeakMap<HTMLDivElement, boolean>();

export default function QuillEditor({
  value,
  onChange,
  modules,
  formats,
  placeholder,
  style,
  onEditorReady,
}: QuillEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<any>(null);
  const [quillLoaded, setQuillLoaded] = useState(false);
  const isInitializingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  // modules와 formats를 메모이제이션하여 불필요한 재생성 방지
  const memoizedModules = useMemo(() => modules || {}, [JSON.stringify(modules)]);
  const memoizedFormats = useMemo(() => formats || [], [JSON.stringify(formats)]);

  useEffect(() => {
    // 마운트 플래그 설정
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!editorRef.current) return;
    if (!mountedRef.current) return;
    
    // 전역 초기화 플래그 확인
    if (globalInitFlags.has(editorRef.current) && globalInitFlags.get(editorRef.current)) {
      // 이미 초기화된 경우 기존 인스턴스 사용
      if (quillInstances.has(editorRef.current)) {
        quillInstanceRef.current = quillInstances.get(editorRef.current);
        setQuillLoaded(true);
        if (onEditorReady && quillInstanceRef.current) {
          onEditorReady(quillInstanceRef.current);
        }
      }
      return;
    }
    
    // 이미 이 div에 Quill이 초기화되었는지 확인
    if (quillInstances.has(editorRef.current)) {
      quillInstanceRef.current = quillInstances.get(editorRef.current);
      setQuillLoaded(true);
      globalInitFlags.set(editorRef.current, true);
      if (onEditorReady && quillInstanceRef.current) {
        onEditorReady(quillInstanceRef.current);
      }
      return;
    }

    // 이미 초기화 중이거나 완료된 경우 중복 실행 방지
    if (isInitializingRef.current) return;
    if (quillInstanceRef.current) return;
    
    // editorRef.current에 이미 Quill이 있는지 확인 (더 강력한 체크)
    const hasQuill = editorRef.current.querySelector('.ql-container') || 
                     editorRef.current.querySelector('.ql-toolbar') ||
                     editorRef.current.querySelector('.ql-editor');
    
    if (hasQuill) {
      // 이미 Quill이 있으면 기존 인스턴스 찾기
      const existingQuill = (editorRef.current as any).__quill;
      if (existingQuill) {
        quillInstanceRef.current = existingQuill;
        quillInstances.set(editorRef.current, existingQuill);
        globalInitFlags.set(editorRef.current, true);
        setQuillLoaded(true);
        if (onEditorReady) {
          onEditorReady(existingQuill);
        }
      }
      return;
    }

    // editorRef.current가 비어있지 않은 경우 (이미 내용이 있으면) 정리
    if (editorRef.current.innerHTML.trim() !== '') {
      editorRef.current.innerHTML = '';
    }

    isInitializingRef.current = true;
    globalInitFlags.set(editorRef.current, true);

    const initQuill = async () => {
      try {
        // 다시 한 번 확인 (더 강력한 체크)
        if (!mountedRef.current || quillInstanceRef.current || !editorRef.current) {
          isInitializingRef.current = false;
          return;
        }
        
        // editorRef에 이미 Quill이 있는지 최종 확인
        if (editorRef.current.querySelector('.ql-container') || 
            editorRef.current.querySelector('.ql-toolbar')) {
          isInitializingRef.current = false;
          return;
        }

        const Quill = (await import("quill")).default;
        
        // 커스텀 Size 블롯 등록 (숫자로 표시)
        try {
          // 기존 클래스 기반 Size 제거
          try {
            const OldSize = Quill.import('formats/size') as any;
            Quill.register(OldSize, false);
          } catch (e) {
            // 무시
          }
          
          // Style 기반 Size attributor 가져오기 및 설정
          const SizeStyle = Quill.import('attributors/style/size') as any;
          const sizes = ['10px', '11px', '12px', '13px', '14px', '15px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];
          SizeStyle.whitelist = sizes;
          
          // SizeStyle을 formats/size로 등록
          Quill.register('formats/size', SizeStyle, true);
        } catch (e) {
          console.error("Size registration error:", e);
        }
        
        // 구분선 커스텀 블롯 등록
        try {
          const Block = Quill.import('blots/block') as any;
          const DividerBlot: any = class extends Block {
            static blotName = 'divider';
            static tagName = 'hr';
            static create() {
              const node = super.create();
              node.setAttribute('style', 'border-top: 2px solid #CCD5DA; margin: 20px 0; padding: 0; border-bottom: none; border-left: none; border-right: none;');
              return node;
            }
          };
          Quill.register(DividerBlot as any, true);
        } catch (e) {
          // 이미 등록된 경우 무시
        }

        // 음성 첨부용 <audio> 블록 임베드 (공지사항 등)
        try {
          const BlockEmbed = Quill.import("blots/block/embed") as any;
          class AudioBlot extends BlockEmbed {
            static blotName = "audio";
            static tagName = "AUDIO";
            static create(value: string) {
              const node = super.create();
              node.setAttribute("controls", "true");
              node.setAttribute("preload", "metadata");
              if (typeof value === "string" && value.trim()) {
                // 공백/줄바꿈만 제거 (호스트·경로는 서버·클라이언트에서 검증)
                node.setAttribute("src", value.trim().replace(/\s+/g, ""));
              }
              node.setAttribute(
                "style",
                "width:100%;max-width:28rem;display:block;margin:0.75em 0"
              );
              return node;
            }
            static value(node: HTMLElement) {
              return node.getAttribute("src") || "";
            }
          }
          Quill.register(AudioBlot as any, true);
        } catch (e) {
          // 이미 등록된 경우 무시
        }
        
        // 마지막으로 한 번 더 확인
        if (!mountedRef.current || !editorRef.current) {
          isInitializingRef.current = false;
          return;
        }
        
        if (editorRef.current.querySelector('.ql-container')) {
          isInitializingRef.current = false;
          return;
        }
        
        const quill = new Quill(editorRef.current, {
          theme: "snow",
          modules: memoizedModules,
          formats: memoizedFormats,
          placeholder: placeholder || "",
        });

        // Quill 인스턴스를 DOM 요소에 직접 저장 (추가 보호)
        (editorRef.current as any).__quill = quill;
        quillInstanceRef.current = quill;
        quillInstances.set(editorRef.current, quill);
        globalInitFlags.set(editorRef.current, true);
        setQuillLoaded(true);

        // 초기 값 설정
        if (value && value.trim() && value !== "<p><br></p>" && value !== "<p></p>") {
          quill.root.innerHTML = value;
        }

        // 변경 이벤트 리스너
        quill.on("text-change", () => {
          if (!mountedRef.current) return;
          const html = quill.root.innerHTML;
          if (html !== value && html !== "<p><br></p>" && html !== "<p></p>") {
            onChange(html);
          }
        });

        // 에디터 준비 완료 콜백
        if (onEditorReady) {
          onEditorReady(quill);
        }
      } catch (error) {
        console.error("Quill initialization error:", error);
        isInitializingRef.current = false;
        globalInitFlags.set(editorRef.current!, false);
      }
    };

    initQuill();

    // Cleanup 함수 - React Strict Mode에서도 안전하게
    return () => {
      // React Strict Mode에서는 cleanup이 두 번 호출될 수 있으므로
      // 실제로 정리할지 확인
      if (editorRef.current && globalInitFlags.get(editorRef.current)) {
        const hasQuill = editorRef.current.querySelector('.ql-container') || 
                         editorRef.current.querySelector('.ql-toolbar');
        
        if (hasQuill && !mountedRef.current) {
          // Quill 인스턴스가 있으면 정리
          const quill = (editorRef.current as any).__quill || quillInstanceRef.current;
          if (quill) {
            try {
              // Quill의 이벤트 리스너 제거
              quill.off('text-change');
            } catch (e) {
              // 무시
            }
            delete (editorRef.current as any).__quill;
          }
          
          // Quill이 생성한 DOM 요소들 제거
          editorRef.current.innerHTML = '';
          
          quillInstances.delete(editorRef.current);
          globalInitFlags.set(editorRef.current, false);
        }
      }
      quillInstanceRef.current = null;
      isInitializingRef.current = false;
    };
  }, []); // 한 번만 실행

  // value가 외부에서 변경될 때 업데이트 (에디터가 준비된 후)
  useEffect(() => {
    if (quillInstanceRef.current && quillLoaded && value !== undefined && mountedRef.current) {
      const currentHtml = quillInstanceRef.current.root.innerHTML;
      // 빈 값이나 기본값이 아닌 경우에만 업데이트
      if (value && value.trim() && value !== "<p><br></p>" && value !== currentHtml) {
        const selection = quillInstanceRef.current.getSelection();
        quillInstanceRef.current.root.innerHTML = value;
        if (selection) {
          setTimeout(() => {
            try {
              quillInstanceRef.current.setSelection(selection);
            } catch (e) {
              // Selection이 유효하지 않을 수 있음
            }
          }, 0);
        }
      }
    }
  }, [value, quillLoaded]);

  return (
    <div ref={containerRef} style={style}>
      <div ref={editorRef} style={{ minHeight: "400px" }} />
    </div>
  );
}
