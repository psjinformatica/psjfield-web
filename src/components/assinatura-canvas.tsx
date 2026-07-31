"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type AssinaturaCanvasRef = {
  limpar: () => void;
  gerarPng: () => Promise<Blob | null>;
  estaVazia: () => boolean;
};

export const AssinaturaCanvas = forwardRef<AssinaturaCanvasRef, {
  onPreviewChange?: (imagem: string | null) => void;
}>(function AssinaturaCanvas({ onPreviewChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhandoRef = useRef(false);
  const vaziaRef = useRef(true);
  const [vazia, setVazia] = useState(true);

  function prepararCanvas(preservarDesenho = false) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const copia = document.createElement("canvas");
    if (preservarDesenho && !vaziaRef.current && canvas.width && canvas.height) {
      copia.width = canvas.width;
      copia.height = canvas.height;
      copia.getContext("2d")?.drawImage(canvas, 0, 0);
    }
    const largura = canvas.getBoundingClientRect().width;
    const escala = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.max(1, Math.round(largura * escala));
    canvas.height = Math.round(190 * escala);
    const contexto = canvas.getContext("2d");
    if (!contexto) return;
    contexto.scale(escala, escala);
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, largura, 190);
    contexto.strokeStyle = "#17221f";
    contexto.lineWidth = 2.25;
    contexto.lineCap = "round";
    contexto.lineJoin = "round";
    if (copia.width && copia.height) {
      contexto.drawImage(copia, 0, 0, largura, 190);
    } else {
      vaziaRef.current = true;
      setVazia(true);
    }
  }

  useEffect(() => {
    prepararCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observador = new ResizeObserver(() => prepararCanvas(true));
    observador.observe(canvas);
    return () => observador.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    limpar: () => {
      prepararCanvas(false);
      onPreviewChange?.(null);
    },
    gerarPng: () => new Promise((resolver) => canvasRef.current?.toBlob(resolver, "image/png") || resolver(null)),
    estaVazia: () => vaziaRef.current,
  }));

  function ponto(evento: React.PointerEvent<HTMLCanvasElement>) {
    const retangulo = evento.currentTarget.getBoundingClientRect();
    return { x: evento.clientX - retangulo.left, y: evento.clientY - retangulo.top };
  }

  function iniciar(evento: React.PointerEvent<HTMLCanvasElement>) {
    evento.preventDefault();
    evento.currentTarget.setPointerCapture(evento.pointerId);
    const contexto = evento.currentTarget.getContext("2d");
    const coordenada = ponto(evento);
    contexto?.beginPath();
    contexto?.moveTo(coordenada.x, coordenada.y);
    desenhandoRef.current = true;
  }

  function desenhar(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhandoRef.current) return;
    evento.preventDefault();
    const contexto = evento.currentTarget.getContext("2d");
    const coordenada = ponto(evento);
    contexto?.lineTo(coordenada.x, coordenada.y);
    contexto?.stroke();
    if (vaziaRef.current) {
      vaziaRef.current = false;
      setVazia(false);
    }
  }

  function encerrar(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhandoRef.current) return;
    evento.preventDefault();
    desenhandoRef.current = false;
    evento.currentTarget.getContext("2d")?.closePath();
    onPreviewChange?.(evento.currentTarget.toDataURL("image/png"));
  }

  return (
    <div className="signature-pad">
      <canvas
        ref={canvasRef}
        aria-label="Área para assinatura"
        onPointerDown={iniciar}
        onPointerMove={desenhar}
        onPointerUp={encerrar}
        onPointerCancel={encerrar}
        onPointerLeave={encerrar}
      />
      {vazia && <span>Assine nesta área com o dedo ou mouse.</span>}
    </div>
  );
});
