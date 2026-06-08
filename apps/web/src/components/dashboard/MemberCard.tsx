'use client';

import { useEffect, useRef, useState } from 'react';
import type { MemberCardView } from '@barokah/shared';
import { Button } from '@barokah/ui';
import QRCode from 'qrcode';

interface MemberCardProps {
  card: MemberCardView;
  onPrint?: () => void;
  showPrintButton?: boolean;
}

export function MemberCard({ card, onPrint, showPrintButton = true }: MemberCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, card.qrPayload, {
      width: 120,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch(() => setQrError('QR gagal dimuat'));
  }, [card.qrPayload]);

  return (
    <div className="member-card-root" style={{ display: 'grid', gap: '1rem' }}>
      <div
        className="member-card-printable"
        style={{
          width: '100%',
          maxWidth: 360,
          aspectRatio: '1.586 / 1',
          borderRadius: 16,
          padding: '1.25rem',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #38bdf8 100%)',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(30, 58, 138, 0.25)',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.85, letterSpacing: '0.08em' }}>MEMBER</div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{card.tenantName}</div>
          </div>
          {card.tenantLogoUrl ? (
            <div
              aria-hidden
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: `center/cover no-repeat url(${card.tenantLogoUrl})`,
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.2)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
              }}
            >
              BC
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{card.memberName}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.9375rem', marginTop: 4 }}>{card.memberCode}</div>
            <div style={{ fontSize: '0.8125rem', marginTop: 8, opacity: 0.9 }}>
              {card.points.toLocaleString('id-ID')} poin · {card.tier}
            </div>
          </div>
          <div
            style={{
              background: '#fff',
              padding: 6,
              borderRadius: 8,
              flexShrink: 0,
            }}
          >
            <canvas ref={canvasRef} aria-label="QR Code member" />
            {qrError ? <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>{qrError}</span> : null}
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
          Member sejak {new Date(card.memberSince).toLocaleDateString('id-ID')}
        </div>
      </div>

      {showPrintButton ? (
        <Button type="button" variant="secondary" onClick={onPrint ?? (() => window.print())}>
          Cetak Kartu Member
        </Button>
      ) : null}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .member-card-root,
          .member-card-root * {
            visibility: visible;
          }
          .member-card-root {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          }
          .member-card-printable {
            box-shadow: none !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
