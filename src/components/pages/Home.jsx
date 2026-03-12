import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import devicesData from '../data/devices-info.json';

/* ══════════════════════════════════════════════════════════════
   HEADER
══════════════════════════════════════════════════════════════ */
function Header() {
  return (
    <header className="site-header">
      <div className="header-logo">
        <img src="/img/logo.png" alt="HorizonDroid" />
      </div>
      <span className="site-header-name">HorizonDroid</span>
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════
   HERO
══════════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <section id="hero">
      <div className="hero-glow" aria-hidden="true" />
      <div className="section-label reveal">Custom Android ROM</div>
      <h1 className="reveal delay-1">
        Horizon<br />Droid
      </h1>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   GALLERY
══════════════════════════════════════════════════════════════ */
const SCREENSHOTS = Array.from({ length: 14 }, (_, i) => ({
  src: `/img/UI (${i + 1}).png`,
  alt: `HorizonDroid UI ${i + 1}`,
}));

function Gallery() {
  const trackRef = useRef(null);
  const rafRef   = useRef(null);
  const dragRef  = useRef({ x: 0, scrollLeft: 0 });
  const [active,   setActive]   = useState(0);
  const [grabbing, setGrabbing] = useState(false);

  /* width of one slide + gap — recalculated on each call so it's responsive */
  const slideW = () =>
    window.innerWidth <= 640
      ? window.innerWidth * 0.84 + 12   // mobile: 84vw + 12px gap
      : 220 + 18;                         // desktop: 220px + 18px gap

  const scrollTo = useCallback((idx) => {
    const max     = SCREENSHOTS.length - 1;
    const clamped = Math.max(0, Math.min(idx, max));
    setActive(clamped);
    trackRef.current?.scrollTo({ left: clamped * slideW(), behavior: 'smooth' });
  }, []);

  /* sync dot indicator when user scrolls manually */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const idx = Math.round(el.scrollLeft / slideW());
        setActive(Math.min(idx, SCREENSHOTS.length - 1));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* drag to scroll (desktop) */
  const onMouseDown = (e) => {
    setGrabbing(true);
    dragRef.current = { x: e.pageX, scrollLeft: trackRef.current.scrollLeft };
  };
  const onMouseMove = useCallback((e) => {
    if (!grabbing) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (trackRef.current)
        trackRef.current.scrollLeft = dragRef.current.scrollLeft - (e.pageX - dragRef.current.x);
    });
  }, [grabbing]);
  const stopGrab = () => setGrabbing(false);

  /* autoplay */
  useEffect(() => {
    const t = setInterval(() => scrollTo((active + 1) % SCREENSHOTS.length), 4200);
    return () => clearInterval(t);
  }, [active, scrollTo]);

  return (
    <section id="gallery" className="section">
      <div className="section-hd reveal">
        <div className="section-label">Interface Showcase</div>
        <h2 className="section-title">Looks</h2>
        <p className="section-subtitle">
          An interface designed to feel native — and then some.
        </p>
      </div>

      <div className="gallery-track-wrap">
        <div className="gallery-fade-l" aria-hidden="true" />
        <div
          className={`gallery-track${grabbing ? ' grabbing' : ''}`}
          ref={trackRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={stopGrab}
          onMouseLeave={stopGrab}
        >
          {SCREENSHOTS.map((s, i) => (
            <div
              key={i}
              className="gallery-slide"
              onClick={() => i !== active && scrollTo(i)}
            >
              <img src={s.src} alt={s.alt} loading="lazy" draggable="false" />
            </div>
          ))}
        </div>
        <div className="gallery-fade-r" aria-hidden="true" />
      </div>

      <div className="gallery-controls container">
        <div className="gallery-dots" role="tablist" aria-label="Gallery navigation">
          {SCREENSHOTS.map((_, i) => (
            <button
              key={i}
              className={`gallery-dot${i === active ? ' active' : ''}`}
              onClick={() => scrollTo(i)}
              aria-label={`Screenshot ${i + 1}`}
              role="tab"
              aria-selected={i === active}
            />
          ))}
        </div>
        <div className="gallery-arrows">
          <button className="gallery-arrow" onClick={() => scrollTo(active - 1)} aria-label="Previous">
            <i className="fas fa-chevron-left" />
          </button>
          <button className="gallery-arrow" onClick={() => scrollTo(active + 1)} aria-label="Next">
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   DEVICE MODAL
══════════════════════════════════════════════════════════════ */
const fmtSize = (b) => {
  if (!b) return 'N/A';
  const k = 1024, labels = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${labels[i]}`;
};
const fmtDate = (ts) =>
  ts
    ? new Date(ts * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

function DeviceModal({ device, onClose }) {
  const [variants, setVariants] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [gRes, vRes] = await Promise.allSettled([
          fetch(`https://raw.githubusercontent.com/HorizonV2/OTA/lineage-22.2/GAPPS/${device.codename}.json`),
          fetch(`https://raw.githubusercontent.com/HorizonV2/OTA/lineage-22.2/VANILLA/${device.codename}.json`),
        ]);
        const results = [];
        if (gRes.status === 'fulfilled' && gRes.value.ok) {
          const d = await gRes.value.json();
          if (d?.response?.[0]) results.push({ variant: 'GAPPS', ...d.response[0] });
        }
        if (vRes.status === 'fulfilled' && vRes.value.ok) {
          const d = await vRes.value.json();
          if (d?.response?.[0]) results.push({ variant: 'VANILLA', ...d.response[0] });
        }
        if (!cancelled) setVariants(results);
      } catch {
        if (!cancelled) setVariants([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [device.codename]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{device.device_name}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <>
              <div className="spinner-ring" style={{ marginTop: 36 }} />
              <p className="loading-text">Loading builds…</p>
            </>
          ) : variants && variants.length > 0 ? (
            <>
              {variants.map((vr, i) => (
                <div className="variant-card" key={i}>
                  <div className="variant-head">
                    <span className="variant-name">{vr.variant} Build</span>
                    <span className="variant-type">{vr.buildtype}</span>
                  </div>
                  <div className="detail-grid">
                    {[
                      ['Version',    vr.version,              false],
                      ['Build Date', fmtDate(vr.datetime),    false],
                      ['File Size',  fmtSize(vr.size),        false],
                      ['MD5',        vr.md5,                  true],
                      ['Filename',   vr.filename,             true],
                    ].map(([label, value, mono]) => (
                      <div className="detail-row" key={label}>
                        <span className="detail-label">{label}</span>
                        <span className={`detail-value${mono ? ' mono' : ''}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="variant-actions">
                    <a href={vr.download} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                      <i className="fas fa-download" /> Download {vr.variant}
                    </a>
                    {vr.changelogs && (
                      <a href={vr.changelogs} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                        Changelog
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {device.support_group && (
                <div className="support-block">
                  <h4>Need help with this device?</h4>
                  <a href={device.support_group} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                    <i className="fab fa-telegram" /> Join Support Group
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="no-builds">
              <p>No builds available for this device yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DEVICE CARD  (memoised so re-renders only when its data changes)
══════════════════════════════════════════════════════════════ */
const DeviceCard = React.memo(function DeviceCard({ device, index, onClick }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      className="device-card reveal"
      style={{ transitionDelay: `${Math.min(index * 0.05, 0.4)}s` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`View builds for ${device.device_name}`}
    >
      <div className="device-card-img">
        {device.image && !imgError ? (
          <img
            src={device.image}
            alt={device.device_name}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <i className="fas fa-mobile-alt placeholder-icon" aria-hidden="true" />
        )}
      </div>
      <div className="device-card-body">
        <p className="device-card-name">{device.device_name}</p>
        <span className="device-card-codename">{device.codename}</span>
        <p className="device-card-meta">
          Maintainer: <strong>{device.maintainer || 'Unknown'}</strong>
        </p>
        {device.status && (
          <span className={`device-status status-${device.status}`}>{device.status}</span>
        )}
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════
   DEVICES SECTION
══════════════════════════════════════════════════════════════ */
function Devices() {
  const devices = devicesData.devices;
  const [selected,     setSelected]     = useState(null);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = useMemo(
    () =>
      devices.filter((d) => {
        const q = search.toLowerCase();
        return (
          (filterStatus === 'all' || d.status === filterStatus) &&
          (
            (d.device_name || '').toLowerCase().includes(q) ||
            (d.codename    || '').toLowerCase().includes(q)
          )
        );
      }),
    [search, filterStatus, devices]
  );

  return (
    <section id="devices" className="section">
      <div className="container">
        <div className="section-hd reveal">
          <div className="section-label">Download</div>
          <h2 className="section-title">Supported Devices</h2>
          <p className="section-subtitle">
            Pick your device and download the latest HorizonDroid build.
          </p>
        </div>

        <div className="devices-controls reveal delay-1">
          <input
            type="search"
            className="search-input"
            placeholder="Search device or codename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search devices"
          />
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="devices-empty">No devices match your search.</div>
        ) : (
          <div className="devices-grid">
            {filtered.map((device, i) => (
              <DeviceCard
                key={device.codename || i}
                device={device}
                index={i}
                onClick={() => setSelected(device)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <DeviceModal device={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   ACCORDION  (used inside Build)
══════════════════════════════════════════════════════════════ */
function AccordionItem({ icon, title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`acc-item${open ? ' open' : ''}`}>
      <button className="acc-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="acc-trigger-left">
          <i className={`fas fa-${icon}`} aria-hidden="true" />
          {title}
        </span>
        <i className="fas fa-chevron-down acc-chevron" aria-hidden="true" />
      </button>
      <div className="acc-body" aria-hidden={!open}>
        <div className="acc-body-inner">{children}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   BUILD SECTION
══════════════════════════════════════════════════════════════ */
function Build() {
  return (
    <section id="build" className="section">
      <div className="container">
        <div className="section-hd reveal">
          <div className="section-label">Developers</div>
          <h2 className="section-title">Build &amp; Maintain</h2>
          <p className="section-subtitle">
            Everything you need to build HorizonDroid or become an official maintainer.
          </p>
        </div>

        <div className="build-grid">

          {/* Source Code */}
          <div className="build-card reveal">
            <div className="build-card-icon">
              <i className="fas fa-code-branch" aria-hidden="true" />
            </div>
            <h3>Source Code</h3>
            <p>Sync the manifest for your target Android version to start building HorizonDroid.</p>
            <div className="source-links">
              <a href="https://github.com/horizonv2/android" target="_blank" rel="noopener noreferrer" className="source-link">
                <i className="fab fa-github" /> Android 15 Source
              </a>
              <a href="https://github.com/HorizonDroidLabs/manifest.git" target="_blank" rel="noopener noreferrer" className="source-link">
                <i className="fab fa-github" /> Android 14 Source
              </a>
              <a href="https://github.com/HorizonDroid-13/manifest.git" target="_blank" rel="noopener noreferrer" className="source-link">
                <i className="fab fa-github" /> Android 13 Source
              </a>
            </div>
          </div>

          {/* Building Guide */}
          <div className="build-card reveal delay-1">
            <div className="build-card-icon">
              <i className="fab fa-youtube" aria-hidden="true" />
            </div>
            <h3>Building Guide</h3>
            <p>
              From setting up your environment to signing your first build — our tutorial series
              covers every step for beginners and experienced developers alike.
            </p>
            <a
              href="https://www.youtube.com/playlist?list=PLrDdnF-jkUITWPgIDbmKuYrNgybmLM4WR"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <i className="fab fa-youtube" /> Watch Tutorial Series
            </a>
          </div>

          {/* Requirements accordion — full width */}
          <div className="build-card reveal delay-2" style={{ gridColumn: '1 / -1' }}>
            <div className="build-card-icon">
              <i className="fas fa-clipboard-list" aria-hidden="true" />
            </div>
            <h3>Requirements</h3>
            <p>Review the maintainership and device requirements before applying.</p>
            <div className="accordion">

              <AccordionItem icon="user-check" title="Maintainership Requirements">
                <ul className="req-list">
                  <li>You <strong>MUST</strong> own the device you want to maintain. Blind, untested builds are not allowed.</li>
                  <li>Solid knowledge of git operations is required — cherry-pick, squash, rebase, etc.</li>
                  <li>Device trees must be <strong>clean</strong> with proper authorships and meaningful commit messages.</li>
                  <li>Device sources <strong>MUST</strong> be completely open source and publicly available.</li>
                  <li>Your build <strong>MUST</strong> run SELinux in enforcing mode.</li>
                  <li>Prebuilt kernels are only allowed <strong>if proper kernel sources are unavailable</strong>.</li>
                  <li>You should be able to read logcats and debug device-related issues.</li>
                  <li>You must not maintain more than 3 ROMs simultaneously (including HorizonDroid).</li>
                  <li>You <strong>MUST</strong> provide an unofficial build with your maintainership application.</li>
                </ul>
              </AccordionItem>

              <AccordionItem icon="mobile-alt" title="Device Requirements">
                <ul className="req-list">
                  <li><strong>Audio:</strong> Full support for media playback, in-call audio, and speaker functionality.</li>
                  <li><strong>Connectivity:</strong> Working RIL for calls/data, Wi-Fi with correct MAC address, emergency calling.</li>
                  <li><strong>Hardware:</strong> Proper USB/MTP functionality and tethering where applicable.</li>
                  <li><strong>Location:</strong> GPS must work if supported by stock OS.</li>
                  <li><strong>Camera:</strong> Front and rear cameras must function with video recording support.</li>
                  <li><strong>Biometrics:</strong> Fingerprint sensors must work on Marshmallow+ devices.</li>
                  <li><strong>Sensors:</strong> Accelerometer, gyroscope, proximity, and ambient light must all function.</li>
                  <li><strong>Security:</strong> SELinux enforcing mode is mandatory (exceptions may be granted).</li>
                  <li><strong>Source Code:</strong> Kernel sources must be publicly available and properly maintained.</li>
                </ul>
                <div className="info-callout">
                  <i className="fas fa-info-circle" />
                  <span>
                    Requirements incorporate{' '}
                    <a href="https://github.com/LineageOS/charter/blob/master/device-support-requirements.md" target="_blank" rel="noopener noreferrer">
                      LineageOS device support standards
                    </a>{' '}
                    (CC-BY-3.0) with HorizonDroid-specific modifications.
                  </span>
                </div>
              </AccordionItem>

            </div>
          </div>

          {/* Apply CTA */}
          <div className="apply-card reveal">
            <div>
              <h3>Ready to Apply?</h3>
              <p>
                If you meet all requirements and want to contribute, reach out to start your official
                maintainership application.
              </p>
            </div>
            <a href="https://t.me/superxorn" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <i className="fas fa-rocket" /> Submit Application
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-logo">
          <div className="footer-logo-img">
            <img src="/img/logo.png" alt="HorizonDroid" />
          </div>
          <span>HorizonDroid</span>
        </div>
        <p className="footer-copy">
          Made with <span className="footer-heart">♥</span> by the Horizon Droid Team &mdash; &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════
   HOME  (default export — the full page)
══════════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <div className="section-divider" />
        <Gallery />
        <div className="section-divider" />
        <Devices />
        <div className="section-divider" />
        <Build />
      </main>
      <Footer />
    </>
  );
}
