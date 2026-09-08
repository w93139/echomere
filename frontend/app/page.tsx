'use client';

import { useEffect, useState } from 'react';
import RippleDistortion from './RippleDistortion';
import { BrandLockup } from '@/components/echomere-chrome';
import { useAuth } from '@/components/auth-provider';

export default function Home() {
  const [orbActive, setOrbActive] = useState(false);
  const [visualReady, setVisualReady] = useState(false);
  const [orbReady, setOrbReady] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fallback = window.setTimeout(() => setOrbReady(true), 700);
    return () => window.clearTimeout(fallback);
  }, []);

  return (
    <main className={`hero-shell${visualReady ? ' is-visual-ready' : ''}${orbReady ? ' is-orb-ready' : ''}`}>
      <RippleDistortion
        brushSize={97.5}
        strength={0.105}
        swirl={1}
        rings={2.5}
        spread={5.75}
        onReady={() => {
          setVisualReady(true);
          setOrbReady(true);
        }}
      />

      <div className="hero-vignette" aria-hidden="true" />
      <div className="film-grain" aria-hidden="true" />

      <nav className="site-nav" aria-label="主导航">
        <BrandLockup href="#top" />
      </nav>

      <section className="hero-content" id="top">
        <div className="hero-copy" id="begin">
          <p className="kicker">ECHO · WATER · MERE</p>
          <h1><span>一念成漪</span><span>照见未见</span></h1>
        </div>

      </section>

      <div className="echo-orb-stage">
        <button
          className={`echo-orb${orbActive ? ' is-active' : ''}`}
          type="button"
          aria-label="聆听回响"
          aria-pressed={orbActive}
          onClick={() => {
            setOrbActive(true);
            window.setTimeout(() => window.location.assign(user ? '/chat' : '/login'), 360);
          }}
        >
          <span className="orb-aura" aria-hidden="true" />
          <span className="orb-flow flow-one" aria-hidden="true" />
          <span className="orb-flow flow-two" aria-hidden="true" />
          <span className="orb-flow flow-three" aria-hidden="true" />
          <span className="orb-copy">
            <span>聆听回响</span>
          </span>
        </button>
      </div>

      <div className="surface-note" aria-hidden="true">
        <span>MOVE TO DISTURB THE SURFACE</span>
        <i />
        <span>23° 08′</span>
      </div>
    </main>
  );
}
