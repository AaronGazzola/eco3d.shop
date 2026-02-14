import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface PointerControlState {
  isActive: boolean;
  targetPosition: THREE.Vector2 | null;
}

export function usePointerControl(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const [state, setState] = useState<PointerControlState>({
    isActive: false,
    targetPosition: null,
  });

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const clearLongPressTimer = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const getRelativePosition = (clientX: number, clientY: number): THREE.Vector2 => {
      const rect = canvas.getBoundingClientRect();
      return new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    const handleStart = (clientX: number, clientY: number, isTouch: boolean) => {
      startPosRef.current = { x: clientX, y: clientY };
      isLongPressRef.current = false;

      if (isTouch) {
        longPressTimerRef.current = setTimeout(() => {
          isLongPressRef.current = true;
          setState({
            isActive: true,
            targetPosition: getRelativePosition(clientX, clientY),
          });
        }, 100);
      } else {
        isLongPressRef.current = true;
        setState({
          isActive: true,
          targetPosition: getRelativePosition(clientX, clientY),
        });
      }
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (startPosRef.current) {
        const dx = clientX - startPosRef.current.x;
        const dy = clientY - startPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 10) {
          clearLongPressTimer();
        }
      }

      if (isLongPressRef.current) {
        setState({
          isActive: true,
          targetPosition: getRelativePosition(clientX, clientY),
        });
      }
    };

    const handleEnd = () => {
      clearLongPressTimer();
      setState({ isActive: false, targetPosition: null });
      isLongPressRef.current = false;
      startPosRef.current = null;
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY, false);
    };

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      handleEnd();
    };

    const onMouseLeave = () => {
      handleEnd();
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        handleStart(touch.clientX, touch.clientY, true);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const onTouchEnd = () => {
      handleEnd();
    };

    const onTouchCancel = () => {
      clearLongPressTimer();
      handleEnd();
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchCancel);

    return () => {
      clearLongPressTimer();
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [canvasRef]);

  return state;
}
