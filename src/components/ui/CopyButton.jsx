import React, { useState, useEffect } from 'react';

const CopyButton = ({ textToCopy, className = "" }) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    let timeoutId;
    if (isCopied) {
      timeoutId = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isCopied]);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (isCopied) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <>
      <style>{`
        .checkmark-draw {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: drawCheck 0.4s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }
        @keyframes drawCheck {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
      <button
        onClick={handleCopy}
        type="button"
        aria-label={isCopied ? "Copiado" : "Copiar al portapapeles"}
        className={`
          group relative flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
          transition-colors duration-200 ease-in-out border outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${isCopied 
            ? 'bg-transparent border-emerald-500 text-emerald-500 focus-visible:ring-emerald-500/50 dark:focus-visible:ring-offset-gray-900' 
            : 'bg-transparent dark:bg-transparent dark:border-gray-700 border-gray-200 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-gray-300 dark:focus-visible:ring-gray-600 dark:focus-visible:ring-offset-gray-900'
          } ${className}
        `}
      >
        <div className="relative flex items-center justify-center w-4 h-4">
          {/* Clipboard Icon */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 transform ${
              isCopied ? 'opacity-0 scale-75' : 'opacity-100 scale-100 delay-[50ms]'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            </svg>
          </div>

          {/* Checkmark Icon */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 transform ${
              isCopied ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
          >
            {isCopied && (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline className="checkmark-draw" points="20 6 9 17 4 12"/>
              </svg>
            )}
          </div>
        </div>

        {/* Text Container with Crossfade */}
        <div className="relative grid place-items-center w-[54px]">
          <span 
            className={`col-start-1 row-start-1 transition-all duration-300 transform ${
              isCopied ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0 delay-[50ms]'
            }`}
          >
            Copy
          </span>
          <span 
            className={`col-start-1 row-start-1 transition-all duration-300 transform ${
              isCopied ? 'opacity-100 translate-y-0 delay-[50ms]' : 'opacity-0 translate-y-1'
            }`}
          >
            Copied!
          </span>
        </div>
      </button>
    </>
  );
};

export default CopyButton;
