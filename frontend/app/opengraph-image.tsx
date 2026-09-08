import { ImageResponse } from 'next/og';

export const alt = 'ECHOMERE 洄映 — 一念成漪，照见未见';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#eeede9',
          background:
            'radial-gradient(ellipse at 52% 50%, #010102 0 9%, #17101c 19%, #0c171a 34%, #07070a 58%, #030304 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 520,
            height: 230,
            border: '3px solid rgba(112, 205, 210, .35)',
            borderRadius: '50%',
            transform: 'rotate(-10deg)',
            boxShadow: '0 0 70px rgba(122, 92, 151, .45), inset 0 0 55px rgba(0, 0, 0, .9)',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
          <div style={{ fontSize: 78, letterSpacing: '0.16em', fontWeight: 500 }}>ECHOMERE</div>
          <div style={{ marginTop: 18, fontSize: 32, letterSpacing: '0.5em', color: '#c9c4ca' }}>洄映</div>
          <div style={{ marginTop: 58, fontSize: 23, letterSpacing: '0.3em', color: '#9f9aa2' }}>一念成漪 · 照见未见</div>
        </div>
      </div>
    ),
    size,
  );
}
