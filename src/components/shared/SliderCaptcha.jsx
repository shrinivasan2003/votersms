import { useState, useRef } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';

const HANDLE_W = 48;

const SliderCaptcha = ({ onVerify }) => {
  const [verified, setVerified] = useState(false);
  const [pos, setPos]           = useState(0);
  const draggingRef             = useRef(false);
  const startRef                = useRef({ clientX: 0, startPos: 0 });
  const trackRef                = useRef(null);

  const maxPos = () => (trackRef.current ? trackRef.current.offsetWidth - HANDLE_W : 0);

  const startDrag = (clientX) => {
    if (verified) return;
    draggingRef.current = true;
    startRef.current = { clientX, startPos: pos };
  };

  const moveDrag = (clientX) => {
    if (!draggingRef.current || verified) return;
    const max = maxPos();
    if (max <= 0) return;
    const newPos = Math.max(0, Math.min(startRef.current.startPos + (clientX - startRef.current.clientX), max));
    setPos(newPos);
    if (newPos >= max * 0.95) {
      draggingRef.current = false;
      setPos(max);
      setVerified(true);
      onVerify(true);
    }
  };

  const endDrag = () => {
    if (draggingRef.current && !verified) setPos(0);
    draggingRef.current = false;
  };

  return (
    <div className="space-y-1.5">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">CAPTCHA</span>
        {!verified && (
          <span className="text-xs text-gray-400">Hold &amp; slide the button to the right</span>
        )}
      </div>

      {/* Slider track */}
      <div
        ref={trackRef}
        className="relative h-12 bg-gray-100 rounded-xl border border-gray-200 select-none overflow-hidden"
        onMouseMove={(e) => moveDrag(e.clientX)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchMove={(e) => { e.preventDefault(); moveDrag(e.touches[0].clientX); }}
        onTouchEnd={endDrag}
      >
        {/* Progress fill */}
        <div
          className={`absolute left-0 top-0 h-full transition-colors duration-150 ${verified ? 'bg-green-100' : 'bg-blue-100'}`}
          style={{ width: `${pos + HANDLE_W}px` }}
        />

        {/* Hint / success label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingLeft: `${HANDLE_W + 8}px` }}>
          {verified ? (
            <span className="text-xs font-bold text-green-600 flex items-center gap-1.5">
              <CheckCircle size={13} /> Verified — you&apos;re human!
            </span>
          ) : (
            <span className="text-xs text-gray-400 font-medium">→ →</span>
          )}
        </div>

        {/* Draggable handle */}
        <div
          className={`absolute top-0 left-0 z-10 flex items-center justify-center transition-colors ${
            verified
              ? 'bg-green-500 border-green-500 cursor-default'
              : 'bg-white border-gray-200 cursor-grab active:cursor-grabbing hover:bg-blue-50 hover:border-blue-300'
          } border rounded-xl shadow-sm`}
          style={{ width: HANDLE_W, height: '100%', transform: `translateX(${pos}px)` }}
          onMouseDown={(e) => { startDrag(e.clientX); e.preventDefault(); }}
          onTouchStart={(e) => startDrag(e.touches[0].clientX)}
        >
          {verified
            ? <CheckCircle size={18} className="text-white" />
            : <ArrowRight size={18} className="text-blue-500" />
          }
        </div>
      </div>
    </div>
  );
};

export default SliderCaptcha;
