import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { startAmbient, stopAmbient } from './audio/ambient';
import { doorPoint, layoutCity } from './city/layout';
import { EditDialog } from './components/EditDialog';
import { ProfileDialog } from './components/ProfileDialog';
import { loadProfile, saveProfile, type Profile } from './data/profile';
import { ProfileContext } from './state/profileContext';
import { Header } from './components/Header';
import { HowDialog } from './components/HowDialog';
import { Toast } from './components/Toast';
import { UsagePanel } from './components/UsagePanel';
import { fmtMinutes, headline, periodLabel, topApp, totalMinutes } from './data/format';
import { MAX_FLAG, getProgress, loadProgress, periodKey, saveProgress, setProgress, withEntered, withFlag, withFloor, withRoof, type ProgressStore } from './data/progress';
import { createSampleCity } from './data/sample';
import { clearCity, loadCity, loadQuality, saveCity, saveQuality, type Quality } from './data/storage';
import type { CityData, Theme } from './data/types';
import { SCENE_H, SCENE_W, composePhoto, downloadBlob } from './export/composePhoto';
import { Joystick } from './input/Joystick';
import { useKeyboard } from './input/useKeyboard';
import { INTERIOR } from './interior/config';
import { kindLabel, lobbyMessage, messageFor } from './interior/messages';
import { LocaleContext, detectLocale, setCurrentLocale, tr, type Locale } from './i18n';
import { appLabel, appName } from './data/apps';
import { themeFor } from './interior/themes';
import type { Mode } from './scene/CameraRig';
import type { WorldKind } from './scene/CityScene';
import { CityPreview } from './components/CityPreview';
import { SceneBoundary } from './components/SceneBoundary';
import { AnalyticsConsent } from './components/AnalyticsConsent';
import { ShareDialog } from './components/ShareDialog';
import { shareService } from './sharing/share';
import { track } from './analytics/analytics';
const CityScene = lazy(() => import('./scene/CityScene').then(m => ({ default: m.CityScene })));
import type { InteriorStatus } from './scene/interior/InteriorWorld';
import { runtime } from './state/runtime';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Reaction = 'cheer' | 'dance' | 'throw';

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function useMedia(q: string) {
  const [m, setM] = useState(() => matchMedia(q).matches);
  useEffect(() => { const mq = matchMedia(q); const f = () => setM(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, [q]);
  return m;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => { const l = detectLocale(); setCurrentLocale(l); return l; });
  const t = tr(locale);
  const [city, setCity] = useState<CityData>(loadCity);
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [pendingWalk, setPendingWalk] = useState(false);
  const [pendingEnter, setPendingEnter] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('overview');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nearBuilding, setNearBuilding] = useState<string | null>(null);
  const [nearBench, setNearBench] = useState<string | null>(null);
  const [nearDoor, setNearDoor] = useState<string | null>(null);
  const [sitting, setSitting] = useState(false);
  const [quality, setQuality] = useState<Quality>(loadQuality);
  const [editOpen, setEditOpen] = useState(false);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [webgl] = useState(hasWebGL);
  const touchUi = useMedia('(pointer: coarse), (max-width: 760px)');
  const toastTimer = useRef<number>(0);

  // 탐험
  const [world, setWorld] = useState<WorldKind>('city');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [interiorStart, setInteriorStart] = useState<number | null>(null);
  const [status, setStatus] = useState<InteriorStatus | null>(null);
  const [fade, setFade] = useState<'none' | 'dark' | 'light'>('none');
  const [doorOpen, setDoorOpen] = useState(false);
  const [roofMsg, setRoofMsg] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [fast, setFast] = useState(false);
  const [resume, setResume] = useState<{ id: string; floor: number } | null>(null);
  const [progress, setProgressStore] = useState<ProgressStore>(loadProgress);
  const transitioning = useRef(false);
  const [askFlag, setAskFlag] = useState(false);
  const [flagDraft, setFlagDraft] = useState('');
  const [flagPlant, setFlagPlant] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const [phoneThrown, setPhoneThrown] = useState(false);
  const roofTimers = useRef<number[]>([]);
  const [caption, setCaption] = useState<{ key: number; floor: string; kind: string; text: string; by?: string } | null>(null);
  const captionTimer = useRef(0);

  useEffect(() => saveCity(city), [city]);
  useEffect(() => { if (profile) saveProfile(profile); }, [profile]);
  useEffect(() => saveQuality(quality), [quality]);
  useEffect(() => saveProgress(progress), [progress]);
  useEffect(() => { runtime.fast = fast; }, [fast]);

  const say = useCallback((t: string) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  const showCaption = useCallback((c: { floor: string; kind: string; text: string; by?: string }) => {
    setCaption({ key: Date.now(), ...c });
    clearTimeout(captionTimer.current);
    captionTimer.current = window.setTimeout(() => setCaption(null), 5000);
  }, []);

  const lots = useMemo(() => layoutCity(city.apps, city.slotOf), [city.apps, city.slotOf]);
  const total = totalMinutes(city.apps);
  const top = topApp(city.apps);
  const filled = city.apps.filter((a) => a.minutes > 0).length;
  const night = city.theme === 'night';
  const period = periodLabel(city.period);
  const pKey = periodKey(city);
  const lotOf = (id: string | null) => lots.find((l) => l.app.id === id && l.kind === 'building') ?? null;
  const activeLot = lotOf(activeId);
  const progressOf = useCallback((id: string) => {
    const l = lots.find((x) => x.app.id === id);
    return getProgress(progress, pKey, city, id, l?.floors ?? 0);
  }, [progress, pKey, city, lots]);
  const updateProgress = useCallback((id: string, f: (p: ReturnType<typeof progressOf>) => ReturnType<typeof progressOf>) => {
    setProgressStore((store) => {
      const l = lots.find((x) => x.app.id === id);
      return setProgress(store, pKey, f(getProgress(store, pKey, city, id, l?.floors ?? 0)));
    });
  }, [lots, pKey, city]);

  const flags = useMemo(() => {
    const out: Record<string, string> = {};
    for (const l of lots) { const f = progress.periods[pKey]?.[l.app.id]?.flag; if (f) out[l.app.id] = f; }
    return out;
  }, [lots, progress, pKey]);

  const setTheme = (t: Theme) => setCity((c) => ({ ...c, theme: t }));

  const toggleSit = useCallback(() => {
    const a = runtime.avatar;
    if (a.sitting) { a.sitting = null; setSitting(false); }
    else if (nearBench) { a.sitting = nearBench; setSitting(true); }
  }, [nearBench]);

  // ---- 건물 입장 / 퇴장 ----
  const enterBuilding = useCallback(async (id: string, startFloor: number | null) => {
    const lot = lotOf(id);
    if (!lot || transitioning.current) return;
    transitioning.current = true;
    setResume(null);
    setSelectedId(null);
    runtime.avatar.sitting = null; setSitting(false);
    runtime.avatar.phone = 'held';
    setPhoneThrown(false);
    const d = doorPoint(lot.slot);
    runtime.autoWalk = { x: d.x, z: d.z - 0.05 }; // 문 안으로 걸어 들어감
    await wait(450);
    setFade('dark');
    await wait(450);
    runtime.autoWalk = null;
    runtime.faded.clear();
    setActiveId(id);
    lastFloorShown.current = startFloor ?? 0;
    setInteriorStart(startFloor);
    interiorStartRef.current = startFloor;
    setStatus(null);
    statusRef.current = null;
    setDoorOpen(false);
    setWorld('interior');
    track('phonecity_building_enter');
    updateProgress(id, (p) => withEntered(p, new Date()));
    await wait(150);
    setFade('none');
    transitioning.current = false;
  }, [lots, updateProgress]); // eslint-disable-line

  const openBuilding = useCallback((id: string) => {
    const p = progressOf(id);
    if (p.lastFloor > 1 && !p.roofReached) setResume({ id, floor: p.lastFloor });
    else void enterBuilding(id, null);
  }, [progressOf, enterBuilding]);
  const requestEnter = useCallback((id: string) => {
    setSceneReady(true);
    if (!profile) { setPendingEnter(id); setProfileOpen(true); return; }
    openBuilding(id);
  }, [profile, openBuilding]);


  const exitToCity = useCallback(async () => {
    const lot = activeLot;
    if (transitioning.current) return;
    transitioning.current = true;
    setRoofMsg(false);
    setCaption(null);
    setAskFlag(false);
    setFlagPlant(false);
    roofTimers.current.forEach(clearTimeout);
    roofTimers.current = [];
    runtime.avatar.action = null;
    setFade('dark');
    await wait(450);
    stopAmbient();
    runtime.cinematic = null;
    const a = runtime.avatar;
    if (lot) { const d = doorPoint(lot.slot); a.x = d.x; a.z = d.z + 0.8; a.y = 0; a.rot = 0; }
    a.climbing = false;
    setWorld('city');
    setMode('walk');
    setStatus(null);
    setDoorOpen(false);
    await wait(150);
    setFade('none');
    transitioning.current = false;
  }, [activeLot]);

  const openRoofDoor = useCallback(async () => {
    if (!activeLot || transitioning.current) return;
    transitioning.current = true;
    const base = (activeLot.floors - 1) * INTERIOR.floorHeight;
    if (soundOn) startAmbient();
    // 1) 문 앞으로 카메라가 캐릭터 뒤에서 다가감 2) 문이 천천히 열림 3) 빛 속으로
    runtime.cinematic = { pos: [-0.2, base + 2.1, 0.75], target: [-4.2, base + 1.3, 0.75] };
    await wait(500);
    setDoorOpen(true);
    await wait(1100);
    runtime.cinematic = { pos: [-2.2, base + 1.55, 0.75], target: [-6, base + 1.4, 0.75] };
    await wait(900);
    setFade('light');
    await wait(700);
    runtime.cinematic = null;
    updateProgress(activeLot.app.id, (p) => withRoof(p, new Date()));
    setCaption(null);
    setWorld('rooftop');
    track('phonecity_rooftop_reached');
    await wait(200);
    setFade('none');
    transitioning.current = false;
    setFlagPlant(false);
    // 도착 축하: 메시지 → 자동 만세 → (깃발이 없으면) 하고 싶은 일 질문
    const hasFlag = !!getProgress(progress, pKey, city, activeLot.app.id, activeLot.floors).flag;
    roofTimers.current.forEach(clearTimeout);
    roofTimers.current = [
      window.setTimeout(() => setRoofMsg(true), 2600),
      window.setTimeout(() => { runtime.avatar.action = { kind: 'cheer', t0: -1 }; }, 3400),
      window.setTimeout(() => { if (!hasFlag) { setRoofMsg(false); setFlagDraft(''); setAskFlag(true); } }, 7600),
    ];
  }, [activeLot, soundOn, updateProgress, progress, pKey, city]);

  const react = useCallback((kind: Reaction) => {
    if (world !== 'rooftop') return; // 리액션은 옥상에서만
    if (kind === 'throw' && runtime.avatar.phone !== 'held') return;
    runtime.avatar.action = { kind, t0: -1 };
    // 리액션 클로즈업: 만세·춤은 정면에서, 던지기는 어깨 뒤에서 폰이 날아가는 쪽을 본다
    const a = runtime.avatar;
    let pos: [number, number, number], target: [number, number, number];
    if (kind === 'throw' && activeLot) {
      const d = { x: -activeLot.slot.x, z: -activeLot.slot.z };
      const n = Math.hypot(d.x, d.z) || 1;
      const fx = d.x / n, fz = d.z / n;
      pos = [a.x - fx * 2.6 - fz * 1.1, a.y + 2.2, a.z - fz * 2.6 + fx * 1.1];
      target = [a.x + fx * 6, a.y - 2.5, a.z + fz * 6];
    } else {
      const fx = Math.sin(a.rot), fz = Math.cos(a.rot);
      pos = [a.x + fx * 3.4 + fz * 0.8, a.y + 1.9, a.z + fz * 3.4 - fx * 0.8];
      target = [a.x, a.y + 1.0, a.z];
    }
    runtime.cinematic = { pos, target };
    const len = kind === 'throw' ? 3200 : kind === 'dance' ? 4300 : 2700;
    roofTimers.current.push(window.setTimeout(() => { runtime.cinematic = null; }, len));
    if (kind === 'throw') {
      setPhoneThrown(true);
      window.setTimeout(() => showCaption({ floor: 'ROOF', kind: tr().throwKind, text: tr().thrown(profile?.nickname ?? '') }), 900);
    }
  }, [world, showCaption, activeLot, profile]);

  const plantFlag = useCallback((text: string) => {
    const t = text.replace(/\s+/g, ' ').trim();
    if (!t || !activeLot) return;
    updateProgress(activeLot.app.id, (p) => withFlag(p, t, new Date()));
    setAskFlag(false);
    track('phonecity_flag_planted');
    setFlagPlant(true);
    setCelebrate((c) => c + 1);
    runtime.avatar.action = { kind: 'cheer', t0: -1 };
    showCaption({ floor: 'ROOF', kind: tr().flagKind, text: tr().flagPlanted([...t].slice(0, MAX_FLAG).join('')) });
  }, [activeLot, updateProgress, showCaption]);


  const lastFloorShown = useRef(0);
  const statusRef = useRef<InteriorStatus | null>(null);
  const interiorStartRef = useRef<number | null>(null);
  const onInteriorStatus = useCallback((s: InteriorStatus) => {
    const prev = statusRef.current;
    statusRef.current = s;
    setStatus(s);
    // 새 층에 도착하면 그 층 벽 문구를 화면에도 잠깐 보여준다(모바일에서 벽 글씨가 작을 때 대비)
    const act = lots.find((l) => l.app.id === activeId);
    if (act && s.where === 'stairs' && s.floor > 1 && s.floor !== lastFloorShown.current && (!prev || prev.floor !== s.floor)) {
      lastFloorShown.current = s.floor;
      const msg = messageFor(act.app.id, s.floor, act.floors);
      showCaption({ floor: `${s.floor}F`, kind: kindLabel(msg.kind), text: msg.text, by: msg.by });
    }
    if (act && s.where === 'lobby' && prev === null && interiorStartRef.current === null) showCaption({ floor: '1F', kind: tr().lobbyKind, text: lobbyMessage(tr().tower(appLabel(act.app)), act.floors) });
    if (activeId && s.where === 'stairs') updateProgress(activeId, (p) => (p.lastFloor === s.floor ? p : withFloor(p, s.floor, new Date())));
  }, [activeId, updateProgress, lots, showCaption]);

  const onKey = useCallback((code: string) => {
    if (code === 'KeyE') {
      if (world === 'city') { if (nearDoor) requestEnter(nearDoor); else toggleSit(); }
      else if (world === 'interior') { if (status?.atTop) void openRoofDoor(); else if (status?.nearExit) void exitToCity(); }
    } else if (world === 'rooftop' && (code === 'Digit1' || code === 'Digit2' || code === 'Digit3')) {
      react(code === 'Digit1' ? 'cheer' : code === 'Digit2' ? 'dance' : 'throw');
    } else if (code === 'KeyN') setCity((c) => ({ ...c, theme: c.theme === 'night' ? 'day' : 'night' }));
    else if (code === 'Escape' && world === 'city') setMode('overview');
  }, [world, nearDoor, requestEnter, toggleSit, status, openRoofDoor, exitToCity, react]);
  const controlsEnabled = ((world === 'city' && mode === 'walk') || world !== 'city')
    && !editOpen && !howOpen && !profileOpen && !shareOpen && !resume && !askFlag && fade === 'none'
    && !(world === 'interior' && doorOpen);
  useKeyboard(controlsEnabled, onKey);
  const mobilePlay = touchUi && (mode === 'walk' || world !== 'city');
  useEffect(() => {
    if (!mobilePlay) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [mobilePlay]);

  useEffect(() => {
    if (!soundOn) stopAmbient();
    else if (world === 'rooftop') startAmbient();
  }, [soundOn, world]);

  const startWalk = () => {
    setSelectedId(null); setSceneReady(true);
    if (!profile) { setPendingWalk(true); setProfileOpen(true); return; }
    if (mode !== 'walk') track('phonecity_walk_start');
    setMode((m) => m === 'walk' ? 'overview' : 'walk');
  };
  const shareApp = async () => {
    // Leave a selectable link visible if an in-app share API never resolves.
    setShareOpen(true);
    const result = await shareService(t.brand, t.shareText, {
      secure: window.isSecureContext,
      share: navigator.share?.bind(navigator), copy: navigator.clipboard?.writeText.bind(navigator.clipboard),
    });
    if (result === 'copied') say(t.shareCopied);
    if (result === 'copied' || result === 'shared') setShareOpen(false);
    if (result === 'manual') setShareOpen(true);
    if (result === 'shared' || result === 'copied') track('phonecity_share');
  };

  const takePhoto = async () => {
    if (busy) return;
    if (!webgl) { say(t.toastNoPhoto); return; }
    const prev = mode;
    setBusy(true);
    setSceneReady(true);
    setSelectedId(null);
    setMode('photo');
    try {
      for (let i = 0; !runtime.capture && i < 100; i++) await wait(100);
      if (!runtime.capture) throw new Error('City is still loading');
      await wait(900);
      setFlash(true);
      const scene = runtime.capture(SCENE_W, SCENE_H);
      const blob = await composePhoto(city, scene);
      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      downloadBlob(blob, `${t.photoFile}-${stamp}.png`);
      say(t.toastPhotoSaved);
      track('phonecity_photo_saved');
      await wait(650);
    } catch {
      say(t.toastPhotoFail);
    } finally {
      setFlash(false);
      setMode(prev === 'photo' ? 'overview' : prev);
      setBusy(false);
    }
  };

  const reset = () => {
    clearCity();
    runtime.avatar.sitting = null;
    setSitting(false);
    setSelectedId(null);
    setCity({ ...createSampleCity(), theme: city.theme });
    say(t.toastReset);
  };

  const detailId = selectedId ?? (mode === 'walk' ? nearBuilding : null);
  const detailApp = world === 'city' && mode !== 'photo' ? city.apps.find((a) => a.id === detailId) : undefined;
  const detailLot = detailApp ? lots.find((l) => l.app.id === detailApp.id) : undefined;
  const detailProg = detailApp && detailLot?.kind === 'building' ? progressOf(detailApp.id) : null;
  const doorLot = world === 'city' && mode === 'walk' ? lotOf(nearDoor) : null;

  const hint = world === 'interior'
    ? (touchUi ? (status?.where === 'lobby' ? t.hintLobbyTouch : t.hintInteriorTouch) : t.hintInterior)
    : world === 'rooftop'
      ? t.hintRoof
      : mode === 'walk'
        ? touchUi ? t.hintWalkTouch : t.hintWalk
        : sceneReady ? t.hintOverview : t.previewHint;

  const ui = world !== 'city';
  const act = activeLot;
  const curFloor = status?.floor ?? 1;
  const pct = act ? Math.round((curFloor / act.floors) * 100) : 0;
  const share = (m: number) => (total ? Math.round((m / total) * 100) : 0);

  const me = profile ?? { nickname: '', look: 'girl' as const };
  const cityName = city.name === tr('ko').defaultCityName ? t.defaultCityName : city.name;
  const switchLocale = () => { const next: Locale = locale === 'ko' ? 'en' : 'ko'; setCurrentLocale(next); setLocale(next); };
  return (
    <LocaleContext.Provider value={locale}>
    <ProfileContext.Provider value={me}>
    <div className="wrap">
      <Header onHow={() => setHowOpen(true)} nickname={profile?.nickname} onProfile={() => setProfileOpen(true)} onLocale={switchLocale} />
      <main>
        <div className="intro">
          <div>
            <div className="eyebrow">{t.eyebrow}</div>
            <h1>{t.heroTitle}</h1>
            <p>{t.heroSub}</p>
            <p className="hero-note">{t.heroNote}</p>
          </div>
          <div className="period" title={city.isExample ? t.periodExampleTitle : t.periodCustomTitle}>
            {period.tag && <span className="period-tag">{period.tag}</span>}
            {period.range} <span className="period-year">{period.year}</span>
          </div>
        </div>
        <div className="grid">
          <section>
            <div className={`city-card${night ? ' night' : ''}${mode === 'walk' ? ' walking' : ''}${ui ? ' immersive' : ''}${mobilePlay ? ' mobile-play' : ''}`}>
              <div className={`city-top${mode === 'photo' ? ' hide' : ''}`}>
                {!ui ? (
                  <div className="city-name"><span>{cityName}</span><small>{t.cityVol}</small></div>
                ) : act && (
                  <div className="tower-hud" style={{ ['--accent' as string]: themeFor(act.app.id, act.app).accent }}>
                    <strong><i style={{ background: act.app.roof }}>{act.app.icon}</i>{t.tower(appLabel(act.app, locale))}</strong>
                    <span>{t.weeklyShare(fmtMinutes(act.app.minutes * 7, locale), share(act.app.minutes))}</span>
                    {world === 'interior' ? (
                      <>
                        <b className="floor-now">{curFloor}F <em>/ {act.floors}F</em></b>
                        <div className="prog"><i style={{ width: `${pct}%` }} /></div>
                        <span>{t.progressLine(pct, curFloor >= act.floors ? t.atRoofDoor : t.toRoof(act.floors - curFloor))}</span>
                      </>
                    ) : (
                      <b className="floor-now">{t.rooftop} <em>{t.aboveFloor(act.floors)}</em></b>
                    )}
                  </div>
                )}
                <div className="toggle" role="group" aria-label={t.lighting}>
                  <button className={night ? '' : 'on'} aria-pressed={!night} onClick={() => setTheme('day')}>{t.day}</button>
                  <button className={night ? 'on' : ''} aria-pressed={night} onClick={() => setTheme('night')}>{t.night}</button>
                </div>
              </div>
              <div className="scene">
                {webgl ? (
                  <SceneBoundary message={t.sceneError} retry={t.reloadCity}>
                  {sceneReady ? <Suspense fallback={<CityPreview lots={lots} onSelect={setSelectedId} onStart={startWalk} loading />}><CityScene
                    lots={lots}
                    theme={city.theme}
                    mode={mode}
                    quality={quality}
                    world={world}
                    activeId={activeId}
                    interiorStart={interiorStart}
                    doorOpen={doorOpen}
                    selectedId={selectedId}
                    nearBuildingId={nearBuilding}
                    nearBenchId={nearBench}
                    nearDoorId={nearDoor}
                    onSelect={setSelectedId}
                    onNearBuilding={setNearBuilding}
                    onNearBench={setNearBench}
                    onNearDoor={setNearDoor}
                    onStand={() => setSitting(false)}
                    onInteriorStatus={onInteriorStatus}
                    flags={flags}
                    flagPlant={flagPlant}
                    celebrate={celebrate}
                  /></Suspense> : <CityPreview lots={lots} onSelect={setSelectedId} onStart={startWalk} />}
                  </SceneBoundary>
                ) : (
                  <div className="no-webgl" role="alert">
                    <strong>{t.noWebglTitle}</strong>
                    {t.noWebglBody}
                  </div>
                )}
                {detailApp && (
                  <div className="detail" role="status">
                    <strong><span className="detail-icon" style={{ background: detailApp.roof }}>{detailApp.icon}</span>{appName(detailApp, locale)}{detailLot?.floors ? ` · ${t.floorUnit(detailLot.floors)}` : ''}</strong>
                    {detailApp.minutes ? (
                      <>
                        {t.detailWeekly(fmtMinutes(detailApp.minutes * 7, locale), fmtMinutes(detailApp.minutes, locale))}<br />
                        {t.detailShare(share(detailApp.minutes))}
                        {detailProg && (detailProg.roofReached ? <em className="badge">{t.badgeRoof}</em> : detailProg.bestFloor > 1 ? <em className="badge">{t.badgeBest(detailProg.bestFloor)}</em> : null)}
                      </>
                    ) : t.detailPark}
                    {mode === 'overview' && detailLot?.kind === 'building' && (
                      <button className="primary explore" onClick={() => requestEnter(detailApp.id)}>{t.exploreTower}</button>
                    )}
                  </div>
                )}

                {touchUi && sceneReady && world === 'city' && mode === 'overview' && (
                  <button className="hud-btn hud-start" onClick={startWalk} disabled={!webgl || busy}>{t.walk}</button>
                )}
                {/* 도시 산책 HUD */}
                {world === 'city' && mode === 'walk' && (
                  <>
                    <button className="hud-btn hud-exit" onClick={() => setMode('overview')}>{t.overviewShort}</button>
                    {doorLot && !resume ? (
                      <button className="hud-btn hud-sit" onClick={() => requestEnter(doorLot.app.id)}>{t.enterTower(appName(doorLot.app, locale))}{!touchUi && <kbd>E</kbd>}</button>
                    ) : (nearBench || sitting) && (
                      <button className="hud-btn hud-sit" onClick={toggleSit}>{sitting ? t.stand : t.sit}{!touchUi && <kbd>E</kbd>}</button>
                    )}
                    {touchUi && controlsEnabled && <Joystick />}
                  </>
                )}
                {resume && (
                  <div className="resume-card" role="dialog" aria-label={t.resumeFrom(resume.floor)}>
                    <strong>{t.resumeTitle(resume.floor)}</strong>
                    <div>
                      <button className="primary" onClick={() => void enterBuilding(resume.id, resume.floor)}>{t.resumeFrom(resume.floor)}</button>
                      <button className="secondary" onClick={() => void enterBuilding(resume.id, null)}>{t.resumeLobby}</button>
                    </div>
                    <button className="subtle" onClick={() => setResume(null)}>{t.cancel}</button>
                  </div>
                )}

                {/* 건물 내부 HUD */}
                {world === 'interior' && (
                  <>
                    <div className="hud-corner">
                      <button className={`hud-btn small${fast ? ' on' : ''}`} onClick={() => setFast((f) => !f)} aria-pressed={fast}>{t.fast}</button>
                      <button className="hud-btn small" onClick={() => void exitToCity()}>{t.leaveBuilding}</button>
                    </div>
                    {status?.atTop && !doorOpen && (
                      <button className="hud-btn hud-sit" onClick={() => void openRoofDoor()}>{t.openRoof}{!touchUi && <kbd>E</kbd>}</button>
                    )}
                    {status?.nearExit && (
                      <button className="hud-btn hud-sit" onClick={() => void exitToCity()}>{t.exitToCity}{!touchUi && <kbd>E</kbd>}</button>
                    )}
                    {touchUi && controlsEnabled && <Joystick />}
                    {caption && (
                      <div className="floor-caption" key={caption.key} role="status">
                        <b>{caption.floor}</b><i>{caption.kind}</i>
                        <span>{caption.text}{caption.by && <small> — {caption.by}</small>}</span>
                      </div>
                    )}
                  </>
                )}

                {/* 옥상 HUD */}
                {world === 'rooftop' && (
                  <>
                    {roofMsg && !askFlag && (
                      <div className="roof-msg" role="status">
                        <b className="roof-congrats">{t.congrats(profile?.nickname ?? '', act?.floors ?? 0)}</b>
                        <p>{t.roofMessage}</p>
                        <small>{act && t.roofSub(t.tower(appLabel(act.app, locale)), fmtMinutes(act.app.minutes * 7, locale))}</small>
                        <button className="subtle" onClick={() => setRoofMsg(false)}>{t.close}</button>
                      </div>
                    )}
                    {askFlag && (
                      <form className="ask-card" onSubmit={(e) => { e.preventDefault(); plantFlag(flagDraft); }}>
                        <strong>{t.askTitle(profile?.nickname ?? '')}</strong>
                        <small>{t.askSub}</small>
                        <input autoFocus={!touchUi} maxLength={MAX_FLAG} value={flagDraft} placeholder={t.askPlaceholder} onChange={(e) => setFlagDraft(e.target.value)} aria-label={t.askLabel} />
                        <div className="chips">
                          {t.flagIdeas.map((idea) => <button type="button" key={idea} onClick={() => setFlagDraft(idea)}>{idea}</button>)}
                        </div>
                        <div className="ask-actions">
                          <button type="button" className="secondary" onClick={() => setAskFlag(false)}>{t.later}</button>
                          <button type="submit" className="primary" disabled={!flagDraft.trim()}>{t.plantFlag}</button>
                        </div>
                      </form>
                    )}
                    {caption && (
                      <div className="floor-caption" key={caption.key} role="status">
                        <b>{caption.floor}</b><i>{caption.kind}</i>
                        <span>{caption.text}</span>
                      </div>
                    )}
                    <div className="reactions" role="group" aria-label={t.reactions}>
                      <button className="hud-btn small" onClick={() => react('cheer')}>{t.cheer}{!touchUi && <kbd>1</kbd>}</button>
                      <button className="hud-btn small" onClick={() => react('dance')}>{t.dance}{!touchUi && <kbd>2</kbd>}</button>
                      <button className="hud-btn small" onClick={() => react('throw')} disabled={phoneThrown}>{t.throwPhone}{!touchUi && <kbd>3</kbd>}</button>
                    </div>
                    <div className="hud-corner">
                      {!askFlag && <button className="hud-btn small" onClick={() => { setFlagDraft(act ? flags[act.app.id] ?? '' : ''); setRoofMsg(false); setAskFlag(true); }}>{act && flags[act.app.id] ? t.changeFlag : t.plantFlag}</button>}
                      <button className="hud-btn small" onClick={() => setSoundOn((s) => !s)} aria-pressed={soundOn}>{soundOn ? t.soundOff : t.soundOn}</button>
                      <button className="hud-btn small" onClick={() => void exitToCity()}>{t.goDown}</button>
                    </div>
                    {touchUi && controlsEnabled && <Joystick />}
                  </>
                )}
                {mode === 'photo' && <div className="photo-frame" aria-hidden="true" />}
                {flash && <div className="flash" aria-hidden="true" />}
                <div className={`fade fade-${fade}`} aria-hidden="true" />
              </div>
              <div className="city-bottom">
                <p className="hint">{hint}</p>
                {!ui && <p className="city-story">{headline(city, locale)}</p>}
                {!ui && (
                  <div className="stats">
                    <div className="stat"><span>{t.statDaily}</span><strong>{fmtMinutes(total, locale)}</strong></div>
                    <div className="stat"><span>{t.statTop}</span><strong className="ellipsis">{top ? appName(top, locale) : t.statRest}</strong></div>
                    <div className="stat"><span>{t.statApps}</span><strong>{filled}</strong><em>{t.statAppsUnit}</em></div>
                  </div>
                )}
              </div>
            </div>
            <div className="actions">
              {ui ? (
                <button className="primary" onClick={() => void exitToCity()}>{t.backToCity}</button>
              ) : (
                <>
                  <button className="primary" onClick={startWalk} disabled={!webgl || busy}>{mode === 'walk' ? t.overview : t.walk}</button>
                  <button className="secondary strong" onClick={takePhoto} disabled={busy}>{busy ? t.photoBusy : t.photo}</button>
                  <button className="secondary" onClick={() => setEditOpen(true)}>{t.editCity}</button>
                  <button className="secondary" onClick={() => void shareApp()}>{t.shareTitle}</button>
                </>
              )}
            </div>
            <div className="demo-note">
              <span>● {city.isExample ? t.noteExample : t.noteCustom} · {t.noteFloors}</span>
              <span className="demo-links">
                <button onClick={() => setQuality((q) => (q === 'high' ? 'low' : 'high'))} aria-label={t.graphicsToggle}>{t.graphics}: {quality === 'high' ? t.graphicsHigh : t.graphicsLow}</button>
                {!ui && <button onClick={reset}>{t.resetExample}</button>}
              </span>
            </div>
          </section>
          <aside className="side">
            <UsagePanel apps={city.apps} onEdit={() => setEditOpen(true)} onPick={(id) => { if (world === 'city') setSelectedId(id); }} />
            <div className="panel">
              <h2>{t.realCity}</h2>
              <label className="upload">
                {t.fromShot}
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setEditFile(f); setEditOpen(true); } }} />
              </label>
              <button className="subtle" onClick={() => { setEditFile(null); setEditOpen(true); }}>{t.manual}</button>
              <p className="small">{t.privacyNote1}<br />{t.privacyNote2}</p>
            </div>
          </aside>
        </div>
        <section className="faq"><h2>{t.faqTitle}</h2>{[[t.faq1q,t.faq1a],[t.faq2q,t.faq2a],[t.faq3q,t.faq3a]].map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
        <AnalyticsConsent playing={mobilePlay || profileOpen} />
        <p className="unofficial">{t.unofficial}</p>
      </main>
      <footer><span>{t.footerLeft}</span><span className="leaf">✳ MADE OF YOUR EVERYDAY</span></footer>
      <EditDialog open={editOpen} city={city} initialFile={editFile} onClose={() => { setEditOpen(false); setEditFile(null); }} onSubmit={(next) => { setCity(next); setEditOpen(false); setEditFile(null); say(t.toastCityChanged); track('phonecity_city_saved'); }} />
      <HowDialog open={howOpen} onClose={() => setHowOpen(false)} />
      <Toast text={toast} />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
      <ProfileDialog
        open={profileOpen}
        initial={profile}
        onSave={(p) => {
          setProfile(p); setProfileOpen(false); say(t.toastHello(p.nickname));
          if (pendingEnter) { openBuilding(pendingEnter); setPendingEnter(null); }
          else if (pendingWalk) { setMode('walk'); track('phonecity_walk_start'); }
          setPendingWalk(false);
        }}
        onClose={() => { setProfileOpen(false); setPendingWalk(false); setPendingEnter(null); }}
      />
    </div>
    </ProfileContext.Provider>
    </LocaleContext.Provider>
  );
}
