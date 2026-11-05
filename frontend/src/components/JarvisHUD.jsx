import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { resolvePortal } from '../api/client';
import { askJarvis, speakJarvis } from '../services/jarvisService';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Send,
  Sparkles,
  Radio,
  MessageSquare,
  Flame,
  ChevronDown,
  Maximize2,
  MoreHorizontal,
  Paperclip,
  Layers,
  LayoutGrid,
} from 'lucide-react';

export default function JarvisHUD() {
  const auth = useAuth();
  let user = auth?.user;
  if (!user) {
    const portal = resolvePortal();
    if (portal === 'company') {
      try { user = JSON.parse(localStorage.getItem('surfsync_company_user') || 'null'); } catch (e) {}
    } else if (portal === 'sales') {
      try { user = JSON.parse(localStorage.getItem('surfsync_sales_user') || 'null'); } catch (e) {}
    }
  }
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveSpeechText, setLiveSpeechText] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [audioMuted, setAudioMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('jarvis_voice') || 'fable');
  const [colorTheme, setColorTheme] = useState(() => localStorage.getItem('jarvis_theme') || 'amber'); // 'amber' (Gold/Tony Stark) | 'cyan'
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [handsFreeEnabled, setHandsFreeEnabled] = useState(
    () => localStorage.getItem('jarvis_hands_free') !== 'false'
  );
  const [handsFreeHearing, setHandsFreeHearing] = useState(false);
  const handsFreeEnabledRef = useRef(handsFreeEnabled);
  handsFreeEnabledRef.current = handsFreeEnabled;

  const [dockMinimized, setDockMinimized] = useState(
    () => localStorage.getItem('jarvis_dock_minimized') === 'true'
  );

  const toggleDockMinimized = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDockMinimized((prev) => {
      const next = !prev;
      localStorage.setItem('jarvis_dock_minimized', String(next));
      return next;
    });
  };

  const [lastUserPrompt, setLastUserPrompt] = useState('');
  const [lastJarvisReply, setLastJarvisReply] = useState(
    'Greetings, Sir. J.A.R.V.I.S. 3D Neural Core online.'
  );
  const [secondaryReplyText, setSecondaryReplyText] = useState(
    'How may I assist you today?'
  );

  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      sender: 'jarvis',
      text: `Greetings, ${user?.name || 'Sir'}. J.A.R.V.I.S. holographic neural core active. How may I assist you today?`,
      time: 'ONLINE',
    },
  ]);

  const mountRef = useRef(null);
  const threeAnimRef = useRef(null);
  const energyRef = useRef(1.0);
  const recognitionRef = useRef(null);
  const backgroundWakeRef = useRef(null);
  const audioPlayerRef = useRef(new Audio());
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const silenceTimerRef = useRef(null);

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const isListeningRef = useRef(isListening);
  isListeningRef.current = isListening;
  const isProcessingRef = useRef(isProcessing);
  isProcessingRef.current = isProcessing;
  const isSpeakingRef = useRef(isSpeaking);
  isSpeakingRef.current = isSpeaking;
  const currentTranscriptRef = useRef('');
  const wantListeningRef = useRef(false);

  // Toggle Hands-Free Background Voice Detection
  const toggleHandsFree = (e) => {
    if (e) e.stopPropagation();
    setHandsFreeEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('jarvis_hands_free', String(next));
      if (next) {
        // Prompt for microphone permission immediately on user click gesture
        if (navigator.mediaDevices?.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
        }
      } else {
        setHandsFreeHearing(false);
        if (backgroundWakeRef.current) {
          try { backgroundWakeRef.current.abort(); } catch (err) {}
          backgroundWakeRef.current = null;
        }
      }
      return next;
    });
  };

  // 1. BACKGROUND WAKE WORD DETECTION ("Hey Jarvis" / "Jarvis")
  // Continuous background listener across all pages (Dashboard, Leads, Pipeline, etc.)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isOpen || !handsFreeEnabled) {
      if (backgroundWakeRef.current) {
        try { backgroundWakeRef.current.abort(); } catch (e) {}
        backgroundWakeRef.current = null;
      }
      setHandsFreeHearing(false);
      return;
    }

    let bgRec = null;
    let isActive = true;
    let restartTimer = null;
    let hearingTimer = null;

    // Helper to test phonetic variants of "Jarvis"
    const isJarvisWakeWord = (str) => {
      if (!str) return false;
      const clean = str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
      const wakeKeywords = [
        'jarvis', 'jervis', 'jarviz', 'charvis', 'harvest', 'travis', 'service',
        'starvis', 'jarves', 'jarvish', 'zarvis', 'tarvis', 'jaervis', 'dharvis',
        'darvis', 'hey jarvis', 'hi jarvis', 'hello jarvis', 'ok jarvis', 'hey j'
      ];
      if (wakeKeywords.some((w) => clean.includes(w))) return true;
      if (clean.includes('j a r v i s') || clean.includes('hey j') || clean.includes('hey jar')) return true;
      return false;
    };

    // Extract any command spoken immediately after the wake phrase (e.g. "Hey Jarvis show me leads")
    const extractPostWakeCommand = (fullStr) => {
      if (!fullStr) return '';
      const lower = fullStr.toLowerCase();
      const keys = ['hey jarvis', 'hi jarvis', 'hello jarvis', 'ok jarvis', 'jarvis', 'jarvish', 'jervis', 'service'];
      for (const kw of keys) {
        const idx = lower.indexOf(kw);
        if (idx !== -1) {
          const after = fullStr.slice(idx + kw.length).replace(/^[,.\s]+/, '').trim();
          if (after.length >= 2) return after;
        }
      }
      return '';
    };

    function startWakeListener() {
      if (!isActive || isOpenRef.current || !handsFreeEnabledRef.current) return;
      try {
        if (backgroundWakeRef.current) {
          try { backgroundWakeRef.current.abort(); } catch (e) {}
        }

        bgRec = new SpeechRecognition();
        bgRec.continuous = true;
        bgRec.interimResults = true;
        const userLocale = navigator.language || 'en-IN';
        bgRec.lang = userLocale.startsWith('en') ? userLocale : 'en-IN';

        bgRec.onresult = (e) => {
          let text = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            text += ' ' + e.results[i][0].transcript;
          }
          if (text.trim().length > 0) {
            setHandsFreeHearing(true);
            clearTimeout(hearingTimer);
            hearingTimer = setTimeout(() => {
              if (isActive) setHandsFreeHearing(false);
            }, 1200);
          }
          if (isJarvisWakeWord(text)) {
            if (!isOpenRef.current) {
              try { bgRec.stop(); } catch (err) {}
              const directCommand = extractPostWakeCommand(text);
              openHUD();
              if (directCommand) {
                setLastJarvisReply(`Understood, ${user?.name || 'Sir'}. Processing "${directCommand}"...`);
                setSecondaryReplyText('Voice synthesis active // Speak or submit commands below');
                setTimeout(() => handleProcessCommand(directCommand), 400);
              } else {
                setLastJarvisReply(`Yes, ${user?.name || 'Sir'}? I am online and listening.`);
                setSecondaryReplyText('Voice synthesis active // Speak or submit commands below');
              }
            }
          }
        };

        bgRec.onerror = (e) => {
          if (e.error === 'not-allowed') {
            const onFirstInteraction = () => {
              window.removeEventListener('click', onFirstInteraction);
              window.removeEventListener('keydown', onFirstInteraction);
              if (isActive && !isOpenRef.current && handsFreeEnabledRef.current) {
                navigator.mediaDevices?.getUserMedia({ audio: true })
                  .then(() => startWakeListener())
                  .catch(() => {});
              }
            };
            window.addEventListener('click', onFirstInteraction, { once: true });
            window.addEventListener('keydown', onFirstInteraction, { once: true });
            return;
          }
          if (isActive && !isOpenRef.current && handsFreeEnabledRef.current) {
            clearTimeout(restartTimer);
            restartTimer = setTimeout(startWakeListener, 500);
          }
        };

        bgRec.onend = () => {
          if (isActive && !isOpenRef.current && handsFreeEnabledRef.current) {
            clearTimeout(restartTimer);
            restartTimer = setTimeout(startWakeListener, 350);
          }
        };

        bgRec.start();
        backgroundWakeRef.current = bgRec;
      } catch (err) {
        if (isActive && !isOpenRef.current && handsFreeEnabledRef.current) {
          clearTimeout(restartTimer);
          restartTimer = setTimeout(startWakeListener, 800);
        }
      }
    }

    // Proactively unlock mic permission if already allowed, or schedule start
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' }).then((status) => {
        if (status.state === 'granted') {
          startWakeListener();
        } else {
          const unlock = () => {
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
            navigator.mediaDevices?.getUserMedia({ audio: true })
              .then(() => {
                if (isActive && !isOpenRef.current && handsFreeEnabledRef.current) startWakeListener();
              })
              .catch(() => {});
          };
          window.addEventListener('click', unlock, { once: true });
          window.addEventListener('keydown', unlock, { once: true });
          startWakeListener();
        }
      }).catch(() => startWakeListener());
    } else {
      startWakeListener();
    }

    return () => {
      isActive = false;
      clearTimeout(restartTimer);
      clearTimeout(hearingTimer);
      if (backgroundWakeRef.current) {
        try { backgroundWakeRef.current.abort(); } catch (e) {}
        backgroundWakeRef.current = null;
      }
    };
  }, [isOpen, handsFreeEnabled, user]);

  // 2. ACTIVE CONTINUOUS VOICE RECOGNITION (When HUD is open)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    const userLocale = navigator.language || 'en-IN';
    recognition.lang = userLocale.startsWith('en') ? userLocale : 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalized = '';

      for (let i = 0; i < event.results.length; i++) {
        const item = event.results[i];
        if (item && item[0]) {
          const text = item[0].transcript;
          if (item.isFinal) {
            finalized += text + ' ';
          } else {
            interim += text;
          }
        }
      }

      const fullSpoken = (finalized + interim).trim();
      if (!fullSpoken) return;

      currentTranscriptRef.current = fullSpoken;
      setLiveSpeechText(fullSpoken);
      setInputMessage(fullSpoken); // Live sync to input box so user immediately sees their words!

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      // Auto-submit after natural 1.3s pause after speaking
      if (fullSpoken.length >= 2) {
        silenceTimerRef.current = setTimeout(() => {
          if (!isProcessingRef.current && !isSpeakingRef.current && currentTranscriptRef.current.trim().length >= 2) {
            const toSend = currentTranscriptRef.current.trim();
            currentTranscriptRef.current = '';
            setLiveSpeechText('');
            setInputMessage('');
            try { recognition.stop(); } catch (e) {}
            handleProcessCommand(toSend);
          }
        }, 1300);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        wantListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // If user spoke words and browser ended session, immediately execute command without losing words!
      const pendingSpoken = currentTranscriptRef.current.trim();
      if (pendingSpoken.length >= 2 && !isProcessingRef.current && !isSpeakingRef.current) {
        currentTranscriptRef.current = '';
        setLiveSpeechText('');
        setInputMessage('');
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        handleProcessCommand(pendingSpoken);
        return;
      }

      // If user still wants listening and modal is open, seamlessly keep listening
      if (wantListeningRef.current && isOpenRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          if (wantListeningRef.current && isOpenRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
            try {
              recognition.start();
            } catch (err) {
              console.warn('Auto-restart recognition:', err);
            }
          }
        }, 150);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      wantListeningRef.current = false;
      try { recognition.abort(); } catch (e) {}
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // When modal opens: automatically activate listening
  useEffect(() => {
    if (isOpen) {
      wantListeningRef.current = true;
      const t = setTimeout(() => {
        if (wantListeningRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.warn('Modal open mic start notice:', e);
          }
        }
      }, 350);

      return () => clearTimeout(t);
    } else {
      wantListeningRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch (e) {}
      setIsListening(false);
    }
  }, [isOpen]);

  const openHUD = () => {
    isClosingRef.current = false;
    setIsClosing(false);
    setIsOpen(true);
  };

  const closeHUD = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    wantListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      isClosingRef.current = false;
    }, 320);
  };

  // Escape key to close smoothly
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpenRef.current && !isClosingRef.current) {
        closeHUD();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. PROCESS VOICE/TEXT COMMAND
  async function handleProcessCommand(promptText) {
    if (!promptText || !promptText.trim()) return;
    const text = promptText.trim();

    setLastUserPrompt(text);
    setInputMessage('');
    setLiveSpeechText('');
    setIsProcessing(true);

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Clean conversational context (exclude stale error loops)
      const history = messages
        .filter((m) => !m.id.startsWith('err-') && !m.text.includes('proceed with the assignment of leads from'))
        .slice(-4)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      const jarvisRes = await askJarvis(text, history, user || {});
      const replyText = jarvisRes.reply || 'Understood, Sir. Processing your instruction.';
      setLastJarvisReply(replyText);
      setSecondaryReplyText('Voice synthesis active // Speak or submit commands below');

      const jarvisMsg = {
        id: `jarvis-${Date.now()}`,
        sender: 'jarvis',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, jarvisMsg]);

      // Speaking completion handler: seamlessly resume listening for next question
      const onSpeakingEnd = () => {
        setIsSpeaking(false);
        if (isOpenRef.current) {
          wantListeningRef.current = true;
          setLiveSpeechText('');
          currentTranscriptRef.current = '';
          setTimeout(() => {
            if (isOpenRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              try {
                recognitionRef.current?.start();
              } catch (e) {}
            }
          }, 350);
        }
      };

      // Speak response using Paul Bettany Stark Voice
      if (!audioMuted) {
        try {
          setIsSpeaking(true);
          const audioUrl = await speakJarvis(replyText, selectedVoice);
          if (audioUrl && audioPlayerRef.current) {
            audioPlayerRef.current.src = audioUrl;
            audioPlayerRef.current.onended = onSpeakingEnd;
            audioPlayerRef.current.onerror = onSpeakingEnd;
            await audioPlayerRef.current.play();
          } else {
            // Web Speech API Fallback
            if ('speechSynthesis' in window) {
              const utter = new SpeechSynthesisUtterance(replyText.slice(0, 250));
              utter.rate = 1.0;
              utter.pitch = 0.95;
              const voices = window.speechSynthesis.getVoices();
              const britishMale = voices.find(
                (v) => (v.lang === 'en-GB' || v.lang.startsWith('en')) &&
                       (v.name.toLowerCase().includes('george') ||
                        v.name.toLowerCase().includes('ryan') ||
                        v.name.toLowerCase().includes('daniel') ||
                        v.name.toLowerCase().includes('male'))
              ) || voices.find((v) => v.lang === 'en-GB') || voices.find((v) => v.lang.startsWith('en'));
              if (britishMale) utter.voice = britishMale;
              utter.onend = onSpeakingEnd;
              utter.onerror = onSpeakingEnd;
              window.speechSynthesis.speak(utter);
            } else {
              onSpeakingEnd();
            }
          }
        } catch (e) {
          console.warn('Audio playback error:', e);
          onSpeakingEnd();
        }
      } else {
        setTimeout(onSpeakingEnd, 400);
      }
    } catch (err) {
      console.error('Jarvis command error:', err);
      const errMsg = `Sir, an operational exception occurred: ${err.message || 'System busy'}`;
      setLastJarvisReply(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'jarvis',
          text: errMsg,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }

  function toggleVoiceInput() {
    if (isListening) {
      wantListeningRef.current = false;
      setIsListening(false);
      setLiveSpeechText('');
      currentTranscriptRef.current = '';
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    } else {
      wantListeningRef.current = true;
      setLiveSpeechText('');
      currentTranscriptRef.current = '';
      if (navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            if (recognitionRef.current && wantListeningRef.current) {
              try { recognitionRef.current.start(); } catch (e) {}
            }
          })
          .catch(() => {
            if (recognitionRef.current && wantListeningRef.current) {
              try { recognitionRef.current.start(); } catch (e) {}
            }
          });
      } else if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('Speech start error:', e);
        }
      }
    }
  }

  const toggleListening = toggleVoiceInput;

  // 4. WORLD-CLASS 3D HOLOGRAPHIC AI MODEL ENGINE (Three.js with Additive Blending & Optical Bloom)
  useEffect(() => {
    if (!isOpen || !mountRef.current) return;
    const container = mountRef.current;

    const isAmber = colorTheme === 'amber';
    const primaryHex = isAmber ? 0xff9a00 : 0x00d9ff; // Radiant Gold/Amber or Electric Cyan
    const secondaryHex = isAmber ? 0xffdf55 : 0x7dd3fc;
    const whiteHex = 0xffffff;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = window.innerWidth <= 768 ? 20.5 : 17.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // --- PROCEDURAL GLOW TEXTURE GENERATOR FOR OPTICAL BLOOM ---
    const createGlowTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.15, isAmber ? 'rgba(255, 230, 140, 1)' : 'rgba(200, 245, 255, 1)');
      grad.addColorStop(0.38, isAmber ? 'rgba(255, 160, 10, 0.75)' : 'rgba(0, 217, 255, 0.75)');
      grad.addColorStop(0.72, isAmber ? 'rgba(245, 110, 0, 0.28)' : 'rgba(2, 132, 199, 0.28)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(canvas);
    };
    const glowTexture = createGlowTexture();

    // --- A. VOLUMETRIC OPTICAL GLOW BILLBOARD (Central Star Bloom) ---
    const spriteMat = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreSprite = new THREE.Sprite(spriteMat);
    coreSprite.scale.set(8.5, 8.5, 1);
    rootGroup.add(coreSprite);

    // Inner White-Hot Sphere Core
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: whiteHex,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
    });
    const innerCore = new THREE.Mesh(new THREE.SphereGeometry(1.3, 32, 32), innerCoreMat);
    rootGroup.add(innerCore);

    // Concentric Energy Plasma Shells
    const shellMat = new THREE.MeshBasicMaterial({
      color: secondaryHex,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const shellMesh = new THREE.Mesh(new THREE.SphereGeometry(1.85, 22, 22), shellMat);
    rootGroup.add(shellMesh);

    // --- B. SIGNATURE DIAGONAL ACCRETION STREAM (100% MATCH TO REFERENCE) ---
    // A brilliant diagonal stardust jet & galaxy stream cutting across the core at ~40 degrees
    const accretionStreamGroup = new THREE.Group();
    accretionStreamGroup.rotation.z = Math.PI * 0.22; // ~40° diagonal angle
    accretionStreamGroup.rotation.x = Math.PI * 0.12;

    const streamCount = 3800;
    const streamPositions = new Float32Array(streamCount * 3);
    const streamColors = new Float32Array(streamCount * 3);
    const colorGold = new THREE.Color(isAmber ? 0xffdf55 : 0x7dd3fc);
    const colorAmber = new THREE.Color(isAmber ? 0xf59e0b : 0x00d9ff);
    const colorWhite = new THREE.Color(0xffffff);

    for (let i = 0; i < streamCount; i++) {
      // Linear spread along diagonal axis
      const lengthDist = (Math.random() - 0.5) * 22.0; // from -11 to +11
      const normalizedDist = Math.abs(lengthDist) / 11.0;
      // Cylinder radius flares slightly with distance from core
      const spreadRadius = (0.35 + normalizedDist * 1.6) * Math.pow(Math.random(), 0.7);
      const angle = Math.random() * Math.PI * 2;

      streamPositions[i * 3] = lengthDist;
      streamPositions[i * 3 + 1] = Math.cos(angle) * spreadRadius;
      streamPositions[i * 3 + 2] = Math.sin(angle) * spreadRadius;

      // Color variation: white hot near center, golden amber along stream
      const pickedColor = normalizedDist < 0.25
        ? (Math.random() > 0.4 ? colorWhite : colorGold)
        : (Math.random() > 0.3 ? colorAmber : colorGold);

      streamColors[i * 3] = pickedColor.r;
      streamColors[i * 3 + 1] = pickedColor.g;
      streamColors[i * 3 + 2] = pickedColor.b;
    }

    const streamGeo = new THREE.BufferGeometry();
    streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPositions, 3));
    streamGeo.setAttribute('color', new THREE.BufferAttribute(streamColors, 3));

    const streamMat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const accretionStream = new THREE.Points(streamGeo, streamMat);
    accretionStreamGroup.add(accretionStream);

    // Glowing orbital satellite gem along diagonal axis
    const gemGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const gemMat = new THREE.MeshBasicMaterial({ color: whiteHex, blending: THREE.AdditiveBlending });
    const gemNode = new THREE.Mesh(gemGeo, gemMat);
    gemNode.position.set(4.8, 0, 0);
    accretionStreamGroup.add(gemNode);

    const gemNode2 = new THREE.Mesh(gemGeo, gemMat);
    gemNode2.position.set(-5.6, 0.4, 0);
    accretionStreamGroup.add(gemNode2);

    rootGroup.add(accretionStreamGroup);

    // --- C. 3D GEODESIC NEURAL WIREFRAME LATTICE ---
    const latticeGeo = new THREE.IcosahedronGeometry(4.2, 3);
    const latticeMat = new THREE.MeshBasicMaterial({
      color: primaryHex,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
    rootGroup.add(latticeMesh);

    // Inner Counter-Rotating Geodesic Lattice
    const latticeGeo2 = new THREE.IcosahedronGeometry(3.0, 2);
    const latticeMat2 = new THREE.MeshBasicMaterial({
      color: secondaryHex,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const latticeMesh2 = new THREE.Mesh(latticeGeo2, latticeMat2);
    rootGroup.add(latticeMesh2);

    // --- D. HIGH-TECH HOLOGRAPHIC GIMBAL RINGS WITH TECH TICKS ---
    const createTechRing = (radius, tickCount = 48, tickColor = secondaryHex) => {
      const ringGroup = new THREE.Group();
      // Thin luminous circular edge
      const edgeGeo = new THREE.BufferGeometry();
      const edgePoints = [];
      const segs = 96;
      for (let i = 0; i <= segs; i++) {
        const theta = (i / segs) * Math.PI * 2;
        edgePoints.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
      }
      edgeGeo.setFromPoints(edgePoints);
      const edgeMat = new THREE.LineBasicMaterial({
        color: primaryHex,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      ringGroup.add(new THREE.Line(edgeGeo, edgeMat));

      // Sci-Fi Ticks
      const tickPositions = [];
      for (let i = 0; i < tickCount; i++) {
        const theta = (i / tickCount) * Math.PI * 2;
        const r1 = radius - 0.06;
        const r2 = radius + (i % 4 === 0 ? 0.38 : 0.18);
        tickPositions.push(
          Math.cos(theta) * r1, Math.sin(theta) * r1, 0,
          Math.cos(theta) * r2, Math.sin(theta) * r2, 0
        );
      }
      const tickGeo = new THREE.BufferGeometry();
      tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(tickPositions, 3));
      const tickMat = new THREE.LineBasicMaterial({
        color: tickColor,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      ringGroup.add(new THREE.LineSegments(tickGeo, tickMat));
      return ringGroup;
    };

    // Gimbal 1: Equatorial Gyro
    const gimbal1 = createTechRing(4.8, 48, secondaryHex);
    rootGroup.add(gimbal1);

    // Gimbal 2: Inclined Polar Gyro
    const gimbal2 = createTechRing(5.5, 56, primaryHex);
    gimbal2.rotation.x = Math.PI * 0.44;
    gimbal2.rotation.y = Math.PI * 0.18;
    rootGroup.add(gimbal2);

    // Gimbal 3: Outer Horizon Gyro
    const gimbal3 = createTechRing(6.2, 64, secondaryHex);
    gimbal3.rotation.x = -Math.PI * 0.36;
    gimbal3.rotation.z = Math.PI * 0.22;
    rootGroup.add(gimbal3);

    // --- E. RADIAL LASER BEAMS / NEEDLES ---
    const rayCount = 64;
    const rayPositions = [];
    for (let i = 0; i < rayCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / rayCount);
      const theta = Math.sqrt(rayCount * Math.PI) * phi;
      const dx = Math.cos(theta) * Math.sin(phi);
      const dy = Math.sin(theta) * Math.sin(phi);
      const dz = Math.cos(phi);
      const rInner = 1.4;
      const rOuter = 5.4 + (i % 3 === 0 ? 2.4 : i % 2 === 0 ? 1.5 : 0.9);
      rayPositions.push(
        dx * rInner, dy * rInner, dz * rInner,
        dx * rOuter, dy * rOuter, dz * rOuter
      );
    }
    const rayGeo = new THREE.BufferGeometry();
    rayGeo.setAttribute('position', new THREE.Float32BufferAttribute(rayPositions, 3));
    const rayMat = new THREE.LineBasicMaterial({
      color: secondaryHex,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
    });
    const rayGroup = new THREE.LineSegments(rayGeo, rayMat);
    rootGroup.add(rayGroup);

    // --- F. HOLOGRAPHIC BASE PEDESTAL CONCENTRIC RINGS (Ground Anchor directly below sphere) ---
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.y = -5.0;
    pedestalGroup.rotation.x = Math.PI * 0.46; // Horizontal projection tilt

    const createPedestalRing = (radius, opacity = 0.5, isDashed = false) => {
      const pts = [];
      const segs = 80;
      for (let i = 0; i <= segs; i++) {
        const th = (i / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(th) * radius, Math.sin(th) * radius, 0));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: isDashed ? secondaryHex : primaryHex,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
      });
      return new THREE.Line(geo, mat);
    };

    const pedRing1 = createPedestalRing(5.6, 0.65);
    const pedRing2 = createPedestalRing(4.4, 0.5, true);
    const pedRing3 = createPedestalRing(3.2, 0.7);
    const pedRing4 = createPedestalRing(2.0, 0.4);
    pedestalGroup.add(pedRing1);
    pedestalGroup.add(pedRing2);
    pedestalGroup.add(pedRing3);
    pedestalGroup.add(pedRing4);
    rootGroup.add(pedestalGroup);

    // --- F. EXPANDING HOLOGRAPHIC SHOCKWAVE PULSES ---
    const shockwaves = [];
    for (let i = 0; i < 3; i++) {
      const swPoints = [];
      for (let j = 0; j <= 64; j++) {
        const th = (j / 64) * Math.PI * 2;
        swPoints.push(new THREE.Vector3(Math.cos(th), Math.sin(th), 0));
      }
      const swGeo = new THREE.BufferGeometry().setFromPoints(swPoints);
      const swMat = new THREE.LineBasicMaterial({
        color: secondaryHex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      });
      const swMesh = new THREE.Line(swGeo, swMat);
      swMesh.rotation.x = Math.PI * 0.5;
      rootGroup.add(swMesh);
      shockwaves.push({ mesh: swMesh, progress: i * 0.33 });
    }

    // --- G. 2,600 SWIRLING ACCRETION EMBER PARTICLES ---
    const particleCount = 2600;
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const isDisc = i < 1800;
      if (isDisc) {
        const radius = 4.8 + Math.pow(Math.random(), 1.5) * 3.6;
        pPositions[i * 3] = Math.cos(theta) * radius;
        pPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.7;
        pPositions[i * 3 + 2] = Math.sin(theta) * radius;
      } else {
        const rad = 2.0 + Math.random() * 5.0;
        const phi = Math.acos(2 * Math.random() - 1);
        pPositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
        pPositions[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
        pPositions[i * 3 + 2] = rad * Math.cos(phi);
      }
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const partMat = new THREE.PointsMaterial({
      color: primaryHex,
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(partGeo, partMat);
    particles.rotation.x = Math.PI * 0.28;
    rootGroup.add(particles);

    // --- H. HOLOGRAPHIC FLOOR PROJECTOR RETICLE (Ground Anchor) ---
    const floorReticle = new THREE.Group();
    floorReticle.position.y = -6.2;
    floorReticle.rotation.x = Math.PI * 0.5;

    // Outer floor ring
    const fRingPoints1 = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      fRingPoints1.push(new THREE.Vector3(Math.cos(t) * 5.4, Math.sin(t) * 5.4, 0));
    }
    const fRing1 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(fRingPoints1),
      new THREE.LineBasicMaterial({ color: primaryHex, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })
    );
    floorReticle.add(fRing1);

    // Inner floor ring
    const fRingPoints2 = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      fRingPoints2.push(new THREE.Vector3(Math.cos(t) * 3.6, Math.sin(t) * 3.6, 0));
    }
    const fRing2 = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(fRingPoints2),
      new THREE.LineBasicMaterial({ color: secondaryHex, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending })
    );
    floorReticle.add(fRing2);
    rootGroup.add(floorReticle);

    // --- I. INTERACTIVE MOUSE / TOUCH ROTATION ---
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      rootGroup.rotation.y += deltaX * 0.007;
      rootGroup.rotation.x += deltaY * 0.007;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseUp = () => { isDragging = false; };

    const onTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e) => {
      if (!isDragging || !e.touches || !e.touches[0]) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      rootGroup.rotation.y += deltaX * 0.007;
      rootGroup.rotation.x += deltaY * 0.007;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    };
    const onTouchEnd = () => { isDragging = false; };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.position.z = window.innerWidth <= 768 ? 20.5 : 17.5;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- J. 60 FPS ANIMATION LOOP ---
    let time = 0;
    let bootProgress = 0.0;
    function animate() {
      threeAnimRef.current = requestAnimationFrame(animate);
      time += 0.015;

      // Holographic ignition boot sequence
      if (bootProgress < 1.0) {
        bootProgress += 0.03;
        const p = Math.min(bootProgress, 1.0);
        const s = Math.sin(p * Math.PI * 0.5) * (1.0 + Math.sin(p * Math.PI) * 0.18);
        rootGroup.scale.set(s, s, s);
      } else if (isClosingRef.current) {
        rootGroup.scale.multiplyScalar(0.88);
      }

      const targetEnergy = isSpeakingRef.current ? 2.4 : isListeningRef.current ? 1.7 : isProcessingRef.current ? 1.4 : 1.0;
      energyRef.current += (targetEnergy - energyRef.current) * 0.08;
      const energy = energyRef.current;

      // Group auto-rotation with gentle oscillation
      if (!isDragging) {
        rootGroup.rotation.y += 0.007 * energy;
        rootGroup.rotation.x = Math.sin(time * 0.4) * 0.1;
      }

      // Gimbal counter-rotations
      gimbal1.rotation.z += 0.012 * energy;
      gimbal2.rotation.z -= 0.01 * energy;
      gimbal3.rotation.z += 0.015 * energy;

      // Geodesic wireframe lattice shimmer
      latticeMesh.rotation.y -= 0.009 * energy;
      latticeMesh.rotation.z += 0.004 * energy;
      latticeMesh2.rotation.y += 0.014 * energy;

      // Radial laser rays pulse
      rayGroup.rotation.y += 0.008 * energy;
      const rayScale = 1.0 + Math.sin(time * 3.5 * energy) * 0.14;
      rayGroup.scale.set(rayScale, rayScale, rayScale);

      // Core star bloom breathing
      const corePulse = 1.0 + Math.sin(time * 4 * energy) * 0.1;
      coreSprite.scale.set(6.8 * corePulse, 6.8 * corePulse, 1);
      innerCore.scale.set(corePulse, corePulse, corePulse);
      shellMesh.scale.set(corePulse * 1.1, corePulse * 1.1, corePulse * 1.1);

      // Shockwave expansions
      shockwaves.forEach((sw) => {
        sw.progress = (sw.progress + 0.009 * energy) % 1;
        const s = 1.2 + sw.progress * 5.6;
        sw.mesh.scale.set(s, s, 1);
        sw.mesh.material.opacity = Math.sin(sw.progress * Math.PI) * 0.7;
      });

      // Accretion stream orbital rotation & shimmer
      accretionStreamGroup.rotation.x += 0.003 * energy;
      accretionStream.rotation.x += 0.005 * energy;

      // Accretion ember swirl
      particles.rotation.z += 0.006 * energy;

      // Holographic base pedestal slow spin
      pedestalGroup.rotation.z -= 0.004 * energy;
      floorReticle.rotation.z -= 0.003 * energy;

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      cancelAnimationFrame(threeAnimRef.current);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [isOpen, colorTheme]);

  return (
    <>
      {/* 1. FLOATING UNIFIED J.A.R.V.I.S. CYBERNETIC COMMAND CAPSULE */}
      {!isOpen && (
        <div className="jarvis-unified-dock">
          {dockMinimized ? (
            /* MINIMIZED COMPACT FLOATING ARC REACTOR ORB */
            <div
              className="jarvis-dock-mini-orb"
              onClick={openHUD}
              title="J.A.R.V.I.S. AI Core (Click to Open Neural Interface)"
            >
              <div className="jarvis-capsule-reactor">
                <div className="jarvis-reactor-spin-ring" />
                <div className="jarvis-reactor-center-core" />
              </div>
              <button
                type="button"
                className="jarvis-mini-expand-btn"
                onClick={toggleDockMinimized}
                title="Expand J.A.R.V.I.S. Command Dock"
              >
                <Maximize2 size={9} />
              </button>
            </div>
          ) : (
            /* EXPANDED CHAMFERED GLASSMORPHISM CAPSULE CHASSIS */
            <div className={`jarvis-capsule-chassis ${handsFreeEnabled ? 'is-active' : 'is-muted'} ${handsFreeHearing ? 'is-hearing' : ''}`}>
              
              {/* LEFT ZONE: Hands-Free Voice Controller */}
              <div
                className="jarvis-zone-handsfree"
                onClick={toggleHandsFree}
                title={
                  handsFreeEnabled
                    ? 'Hands-Free Listening ACTIVE: Speak "Hey Jarvis" anytime to talk. Click to Mute.'
                    : 'Hands-Free Muted: Click to Enable background voice wake detection.'
                }
              >
                {/* Animated Wave Orb / Reactor Icon */}
                <div className="jarvis-capsule-mic-orb">
                  {handsFreeEnabled ? (
                    <div className="jarvis-capsule-eq-dance">
                      <span className="ceq ceq-1" />
                      <span className="ceq ceq-2" />
                      <span className="ceq ceq-3" />
                    </div>
                  ) : (
                    <MicOff size={13} className="jarvis-capsule-mic-muted" />
                  )}
                  <div className="jarvis-capsule-orb-pulse" />
                </div>

                {/* Status & Caption */}
                <div className="jarvis-capsule-text-group">
                  <div className="jarvis-capsule-status-line">
                    <span className={`jarvis-capsule-dot ${handsFreeEnabled ? (handsFreeHearing ? 'pulse-green' : 'pulse-amber') : 'is-off'}`} />
                    <span className="jarvis-capsule-title">
                      {handsFreeEnabled ? (handsFreeHearing ? 'HEARING...' : 'HANDS-FREE') : 'HANDS-FREE'}
                    </span>
                  </div>
                  <span className="jarvis-capsule-desc">
                    {handsFreeEnabled ? (handsFreeHearing ? 'Voice Detected' : 'Say "Hey Jarvis"') : 'Click to Enable'}
                  </span>
                </div>

                {/* Tactile Mini Switch */}
                <div className={`jarvis-capsule-toggle ${handsFreeEnabled ? 'on' : 'off'}`}>
                  <div className="jarvis-capsule-toggle-knob" />
                </div>
              </div>

              {/* HIGH-TECH LASER SEAM DIVIDER */}
              <div className="jarvis-capsule-seam">
                <span className="jarvis-seam-laser" />
              </div>

              {/* RIGHT ZONE: J.A.R.V.I.S. Core Launcher */}
              <div
                className="jarvis-zone-launcher"
                onClick={openHUD}
                title='Click to Open J.A.R.V.I.S. 3D Neural Interface'
              >
                {/* Micro Arc Reactor Core */}
                <div className="jarvis-capsule-reactor">
                  <div className="jarvis-reactor-spin-ring" />
                  <div className="jarvis-reactor-center-core" />
                </div>

                {/* J.A.R.V.I.S. Typography */}
                <div className="jarvis-capsule-brand-group">
                  <span className="jarvis-capsule-brand-title">J.A.R.V.I.S.</span>
                  <span className="jarvis-capsule-brand-sub">CLICK TO OPEN</span>
                </div>

                {/* Futuristic Sparkle Accent */}
                <div className="jarvis-capsule-spark-wrap">
                  <Sparkles size={13} className="jarvis-capsule-sparkle" />
                </div>
              </div>

              {/* MINIMIZE CAPSULE BUTTON */}
              <button
                type="button"
                className="jarvis-capsule-minimize-btn"
                onClick={toggleDockMinimized}
                title="Minimize J.A.R.V.I.S. dock to compact orb"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. TRANSLUCENT OVERLAY (Current CRM Page Remains Visible Behind) */}
      {isOpen && (
        <div className={`jarvis-modal-backdrop ${isClosing ? 'is-closing' : ''}`}>
          {/* Top Floating Control Bar */}
          <div className="jarvis-modal-topbar">
            {/* Left: Branding & Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="jarvis-badge-icon">
                ⚡
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff', letterSpacing: '0.14em', fontFamily: 'monospace' }}>
                  J . A . R . V . I . S .
                </div>
                <div style={{ fontSize: '11px', color: colorTheme === 'amber' ? '#f59e0b' : '#00d9ff', fontWeight: 600 }}>
                  3D Holographic AI // {user?.name || 'Administrator'}
                </div>
              </div>
            </div>

            {/* Center State Indicator Capsule */}
            <div className="jarvis-status-capsule">
              <span className="jarvis-capsule-wave">
                <span className="cw1" />
                <span className="cw2" />
                <span className="cw3" />
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#fef3c7', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                {isListening
                  ? 'LISTENING TO YOUR VOICE'
                  : isSpeaking
                  ? 'SYNTHESIZING AUDIO REPLY'
                  : isProcessing
                  ? 'ANALYZING CRM QUERY'
                  : 'AWAITING VOICE COMMAND'}
              </span>
            </div>

            {/* Right Tools: Voice, Theme Color, Mute, History, Close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={selectedVoice}
                onChange={(e) => {
                  setSelectedVoice(e.target.value);
                  localStorage.setItem('jarvis_voice', e.target.value);
                }}
                className="jarvis-ctrl-select"
              >
                <option value="fable">🎙️ Stark (British Male)</option>
                <option value="onyx">🎙️ Onyx (Deep Male)</option>
                <option value="echo">🎙️ Echo (Calm Male)</option>
                <option value="ash">🎙️ Ash (Crisp Male)</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  const next = colorTheme === 'amber' ? 'cyan' : 'amber';
                  setColorTheme(next);
                  localStorage.setItem('jarvis_theme', next);
                }}
                title={`Switch to ${colorTheme === 'amber' ? 'Electric Cyan' : 'Gold Amber'} Core`}
                className="jarvis-ctrl-btn"
                style={{ color: colorTheme === 'amber' ? '#f59e0b' : '#00d9ff' }}
              >
                <Flame size={15} />
              </button>

              <button
                type="button"
                onClick={() => setAudioMuted((v) => !v)}
                title={audioMuted ? 'Unmute Audio' : 'Mute Audio'}
                className="jarvis-ctrl-btn"
                style={{ color: audioMuted ? '#ef4444' : '#ffffff' }}
              >
                {audioMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              <button
                type="button"
                onClick={() => setShowChatHistory((v) => !v)}
                title="Toggle Dialogue Transcript"
                className="jarvis-ctrl-btn"
                style={{ color: showChatHistory ? '#00d9ff' : '#94a3b8' }}
              >
                <MessageSquare size={15} />
              </button>

              <button
                type="button"
                onClick={closeHUD}
                title="Close (or press Esc)"
                className="jarvis-ctrl-btn"
                style={{ color: '#ffffff' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Central 3D Canvas Stage */}
          <div className="jarvis-3d-stage">
            <div className="jarvis-holo-beam-flare" />
            <div ref={mountRef} className="jarvis-three-container" />
            <div className="jarvis-stage-hint">
              Drag to rotate 3D hologram core
            </div>
          </div>

          {/* Dialogue Transcript Drawer (Optional slide-out) */}
          {showChatHistory && (
            <div className="jarvis-chat-drawer">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.08em' }}>DIALOGUE STREAM</span>
                <button type="button" onClick={() => setShowChatHistory(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px' }}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '90%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      backgroundColor: m.sender === 'user' ? 'rgba(30, 41, 59, 0.85)' : 'rgba(7, 20, 38, 0.85)',
                      border: m.sender === 'user' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0, 217, 255, 0.4)',
                      fontSize: '12px',
                      color: m.sender === 'user' ? '#ffffff' : '#e0f2fe',
                    }}
                  >
                    {m.text}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* UNIFIED LUXURY HOLOGRAPHIC HUD CONSOLE (100% MATCH TO REFERENCE) */}
          <div className="jarvis-hud-console-wrap">
            {/* Top Holographic Telemetry Badge */}
            <div className="jarvis-telemetry-badge">
              <span>CORE</span>
              <span className="telemetry-sep">|</span>
              <span>NEURAL GRID</span>
              <span className="telemetry-sep">|</span>
              <span>AI ENGINE</span>
            </div>

            <div className="jarvis-hud-chassis">
              <div className="jarvis-chassis-flank flank-left" />
              <div className="jarvis-chassis-flank flank-right" />
              <div className="jarvis-hud-console">
                {/* Hyper-Glossy Specular Sheen Overlays */}
                <div className="jarvis-glass-specular-sheen" />
                <div className="jarvis-glass-tech-grid" />

                {/* Header Bar inside the Console */}
                <div className="jarvis-console-header">
                  <div className="jarvis-console-title-group">
                    <div className="jarvis-arc-mini-reactor">
                      <div className="jarvis-arc-mini-pulse" />
                      <span className="jarvis-arc-mini-core" />
                    </div>
                    <span className="jarvis-console-title">J . A . R . V . I . S .</span>
                    <span className="jarvis-console-subtitle">NEURAL LINK</span>
                    <span className="jarvis-console-pipe">|</span>
                    <div className="jarvis-console-status">
                      <span className="jarvis-status-green-dot" />
                      <span className="jarvis-status-green-text">
                        {isListening ? 'LISTENING' : isSpeaking ? 'SYNTHESIZING' : isProcessing ? 'PROCESSING' : 'SYSTEM ONLINE'}
                      </span>
                    </div>
                  </div>

                  <div className="jarvis-console-actions">
                    <button
                      type="button"
                      className="jarvis-console-action-btn"
                      title="Toggle Expand / Full HUD"
                      onClick={() => setShowChatHistory((prev) => !prev)}
                    >
                      <Maximize2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="jarvis-console-action-btn"
                      title="Jarvis Settings"
                      onClick={() => {
                        const newVoice = selectedVoice === 'fable' ? 'alloy' : 'fable';
                        setSelectedVoice(newVoice);
                        localStorage.setItem('jarvis_voice', newVoice);
                      }}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                  </div>
                </div>

                {/* Dialogue Response Bubble with Waveform Avatar */}
                <div className="jarvis-dialogue-row">
                  <div
                    className={`jarvis-wave-badge ${isSpeaking ? 'speaking' : isListening ? 'listening' : ''}`}
                    title="Neural Audio Frequency"
                  >
                    <span className="jarvis-wave-bar b1" />
                    <span className="jarvis-wave-bar b2" />
                    <span className="jarvis-wave-bar b3" />
                    <span className="jarvis-wave-bar b4" />
                    <span className="jarvis-wave-bar b5" />
                  </div>

                  <div className="jarvis-speech-bubble">
                    <div className="jarvis-speech-bubble-tail" />
                    <div className="jarvis-speech-primary">
                      {isProcessing ? (
                        <span className="jarvis-speech-thinking">
                          <Sparkles size={14} className="animate-spin" />
                          Processing neural instructions across CRM database…
                        </span>
                      ) : isListening && liveSpeechText ? (
                        <span className="jarvis-speech-capturing">"{liveSpeechText}"</span>
                      ) : (
                        <span>
                          {typeof lastJarvisReply === 'string' && /\[([^\]]+)\]\(([^)]+)\)/.test(lastJarvisReply) ? (
                            <span>
                              {lastJarvisReply.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')}
                              <button
                                type="button"
                                onClick={() => handleProcessCommand('Export current CRM leads to Excel spreadsheet')}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  marginLeft: '8px',
                                  padding: '3px 10px',
                                  backgroundColor: '#F59E0B',
                                  color: '#0B0F19',
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  verticalAlign: 'middle',
                                }}
                              >
                                <Paperclip size={12} />
                                Download Excel
                              </button>
                            </span>
                          ) : (
                            lastJarvisReply
                          )}
                        </span>
                      )}
                    </div>
                    {!isProcessing && !liveSpeechText && (
                      <div className="jarvis-speech-secondary">
                        {secondaryReplyText}
                      </div>
                    )}
                    <div className="jarvis-bubble-accent-tab" />
                  </div>
                </div>

                {/* Input Command Deck */}
                <div className="jarvis-command-deck">
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    disabled={isProcessing}
                    title={isListening ? 'Click to pause listening' : 'Click to Speak'}
                    className={`jarvis-deck-mic-btn ${isListening ? 'listening' : ''}`}
                  >
                    <div className="jarvis-deck-mic-glow" />
                    <Mic size={21} />
                  </button>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const textToSend = (inputMessage || liveSpeechText || currentTranscriptRef.current).trim();
                      if (textToSend) {
                        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                        try { recognitionRef.current?.stop(); } catch (err) {}
                        handleProcessCommand(textToSend);
                      }
                    }}
                    className="jarvis-deck-form"
                  >
                    <input
                      ref={inputRef}
                      value={inputMessage || liveSpeechText}
                      onChange={(e) => {
                        setInputMessage(e.target.value);
                        setLiveSpeechText(e.target.value);
                      }}
                      placeholder='Ask anything... e.g. "show hot leads", "analyze pipeline", "draft a follow-up"'
                      disabled={isProcessing}
                      className="jarvis-deck-input"
                    />
                    <div className="jarvis-deck-inline-actions">
                      <button
                        type="button"
                        className="jarvis-deck-icon-btn"
                        title="Expand view"
                        onClick={() => setShowChatHistory((prev) => !prev)}
                      >
                        <Maximize2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="jarvis-deck-icon-btn"
                        title="Download Leads Excel"
                        onClick={() => handleProcessCommand('Export current CRM leads to Excel spreadsheet')}
                      >
                        <Paperclip size={14} />
                      </button>
                      <button
                        type="submit"
                        disabled={(!inputMessage.trim() && !liveSpeechText.trim() && !currentTranscriptRef.current.trim()) || isProcessing}
                        className="jarvis-deck-send-btn"
                        title="Send command"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </form>
                </div>

                {/* Quick Commands Divider & Chips */}
                <div className="jarvis-quick-section">
                  <div className="jarvis-quick-divider">
                    <span className="jarvis-quick-line" />
                    <span className="jarvis-quick-label">QUICK COMMANDS</span>
                    <span className="jarvis-quick-line" />
                  </div>

                  <div className="jarvis-quick-chips">
                    <button
                      type="button"
                      onClick={() => handleProcessCommand('Show me all hot leads')}
                      className="jarvis-quick-chip"
                    >
                      <span>🔥</span>
                      <span>Show Hot Leads</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProcessCommand('What is our current sales pipeline status?')}
                      className="jarvis-quick-chip"
                    >
                      <Layers size={13} color="#F59E0B" />
                      <span>Check Pipeline Status</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProcessCommand('Draft a follow-up message for contacted leads')}
                      className="jarvis-quick-chip"
                    >
                      <Send size={13} color="#F59E0B" />
                      <span>Draft Follow-up Message</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProcessCommand('Show all available Jarvis CRM voice and database commands')}
                      className="jarvis-quick-chip"
                    >
                      <LayoutGrid size={13} color="#F59E0B" />
                      <span>More Commands</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Ambient Warm Golden Floor Pool Reflection & Rings */}
            <div className="jarvis-console-floor-rig">
              <div className="jarvis-floor-ring ring-1" />
              <div className="jarvis-floor-ring ring-2" />
              <div className="jarvis-floor-glow-pool" />
            </div>
          </div>
        </div>
      )}

      {/* 3. Global CSS Styling */}
      <style>{`
        /* =========================================================
           UNIFIED J.A.R.V.I.S. CYBERNETIC COMMAND CAPSULE DOCK
           ========================================================= */
        .jarvis-unified-dock {
          position: fixed;
          bottom: 20px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          pointer-events: auto;
          user-select: none;
        }

        /* 1. Ultra-Compact Mini Arc Reactor Orb (When Minimized) */
        .jarvis-dock-mini-orb {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, rgba(245, 158, 11, 0.35) 0%, rgba(15, 23, 42, 0.96) 100%);
          border: 1.5px solid #f59e0b;
          box-shadow: 
            0 12px 28px rgba(0, 0, 0, 0.8),
            0 0 20px rgba(245, 158, 11, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .jarvis-dock-mini-orb:hover {
          transform: scale(1.08) translateY(-2px);
          border-color: #fbbf24;
          box-shadow: 
            0 16px 36px rgba(0, 0, 0, 0.9),
            0 0 28px rgba(245, 158, 11, 0.75),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }
        .jarvis-mini-expand-btn {
          position: absolute;
          top: -3px;
          left: -3px;
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #1e293b;
          border: 1px solid rgba(245, 158, 11, 0.7);
          color: #fbbf24;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0.9;
          transition: all 0.2s ease;
        }
        .jarvis-mini-expand-btn:hover {
          opacity: 1;
          background: #0f172a;
          transform: scale(1.15);
        }
        .jarvis-capsule-minimize-btn {
          background: transparent;
          border: none;
          color: rgba(245, 158, 11, 0.65);
          padding: 5px 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 50%;
          margin-left: 2px;
          transition: all 0.2s ease;
        }
        .jarvis-capsule-minimize-btn:hover {
          color: #fbbf24;
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.12);
        }

        /* 2. Main Chamfered Cyber Capsule Chassis */
        .jarvis-capsule-chassis {
          position: relative;
          display: flex;
          align-items: center;
          padding: 5px 6px;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(16, 26, 44, 0.96) 0%, rgba(7, 13, 23, 0.98) 100%);
          border: 1.5px solid rgba(245, 158, 11, 0.42);
          box-shadow: 
            0 16px 36px -4px rgba(0, 0, 0, 0.8),
            0 0 24px rgba(245, 158, 11, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            inset 0 -1px 0 rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .jarvis-capsule-chassis:hover {
          border-color: #fbbf24;
          box-shadow: 
            0 20px 42px -4px rgba(0, 0, 0, 0.85),
            0 0 32px rgba(245, 158, 11, 0.45),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }
        .jarvis-capsule-chassis.is-muted {
          border-color: rgba(148, 163, 184, 0.3);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6), 0 0 16px rgba(245, 158, 11, 0.15);
        }
        .jarvis-capsule-chassis.is-hearing {
          border-color: #10b981 !important;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.85), 0 0 36px rgba(16, 185, 129, 0.65) !important;
        }

        /* Top Specular Sheen */
        .jarvis-capsule-chassis::before {
          content: '';
          position: absolute;
          top: 0;
          left: 15%;
          right: 15%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
          pointer-events: none;
        }

        /* LEFT ZONE: Hands-Free Voice */
        .jarvis-zone-handsfree {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px 6px 10px;
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .jarvis-zone-handsfree:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        /* Mic Orb with Pulse */
        .jarvis-capsule-mic-orb {
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, rgba(245, 158, 11, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%);
          border: 1px solid rgba(245, 158, 11, 0.5);
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.3), inset 0 0 8px rgba(245, 158, 11, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }
        .jarvis-capsule-chassis.is-muted .jarvis-capsule-mic-orb {
          background: radial-gradient(circle at 35% 30%, rgba(100, 116, 139, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%);
          border-color: rgba(148, 163, 184, 0.3);
          box-shadow: none;
        }
        .jarvis-capsule-chassis.is-hearing .jarvis-capsule-mic-orb {
          background: radial-gradient(circle at 35% 30%, rgba(16, 185, 129, 0.4) 0%, rgba(6, 78, 59, 0.9) 100%);
          border-color: #10b981;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.7);
        }
        .jarvis-capsule-mic-muted {
          color: #94a3b8;
        }

        /* Dancing Equalizer in Orb */
        .jarvis-capsule-eq-dance {
          display: flex;
          align-items: center;
          gap: 2.5px;
          height: 14px;
        }
        .jarvis-capsule-eq-dance .ceq {
          width: 2.5px;
          background: #fbbf24;
          border-radius: 2px;
          box-shadow: 0 0 6px #f59e0b;
          animation: jarvisCeq 1.1s ease-in-out infinite alternate;
        }
        .jarvis-capsule-chassis.is-hearing .jarvis-capsule-eq-dance .ceq {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation-duration: 0.32s;
        }
        .jarvis-capsule-eq-dance .ceq-1 { height: 6px; animation-delay: 0.1s; }
        .jarvis-capsule-eq-dance .ceq-2 { height: 13px; animation-delay: 0.3s; }
        .jarvis-capsule-eq-dance .ceq-3 { height: 8px; animation-delay: 0.2s; }

        @keyframes jarvisCeq {
          0% { transform: scaleY(0.35); }
          100% { transform: scaleY(1.35); }
        }

        .jarvis-capsule-orb-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 1px solid rgba(245, 158, 11, 0.35);
          opacity: 0;
          animation: jarvisOrbPing 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
          pointer-events: none;
        }
        .jarvis-capsule-chassis.is-hearing .jarvis-capsule-orb-pulse {
          border-color: rgba(16, 185, 129, 0.6);
          animation-duration: 1.1s;
        }
        @keyframes jarvisOrbPing {
          0% { transform: scale(0.9); opacity: 0.8; }
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }

        /* Text Group */
        .jarvis-capsule-text-group {
          display: flex;
          flex-direction: column;
          gap: 1.5px;
        }
        .jarvis-capsule-status-line {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .jarvis-capsule-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .jarvis-capsule-dot.pulse-amber {
          background: #fbbf24;
          box-shadow: 0 0 8px #f59e0b;
        }
        .jarvis-capsule-dot.pulse-green {
          background: #10b981;
          box-shadow: 0 0 12px #10b981;
          animation: jarvisGreenDot 0.6s infinite alternate;
        }
        .jarvis-capsule-dot.is-off {
          background: #64748b;
        }
        @keyframes jarvisGreenDot {
          0% { transform: scale(0.85); opacity: 0.7; }
          100% { transform: scale(1.4); opacity: 1; }
        }
        .jarvis-capsule-title {
          font-family: monospace;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #ffffff;
        }
        .jarvis-capsule-desc {
          font-size: 9.5px;
          color: #94a3b8;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .jarvis-capsule-chassis.is-hearing .jarvis-capsule-desc {
          color: #34d399;
          font-weight: 700;
        }

        /* Tactile Toggle */
        .jarvis-capsule-toggle {
          width: 30px;
          height: 17px;
          border-radius: 999px;
          background: rgba(100, 116, 139, 0.4);
          border: 1px solid rgba(148, 163, 184, 0.35);
          position: relative;
          transition: all 0.25s ease;
          flex-shrink: 0;
          margin-left: 2px;
        }
        .jarvis-capsule-toggle.on {
          background: linear-gradient(90deg, #f59e0b, #d97706);
          border-color: #fbbf24;
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
        }
        .jarvis-capsule-toggle-knob {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #ffffff;
          position: absolute;
          top: 1px;
          left: 2px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .jarvis-capsule-toggle.on .jarvis-capsule-toggle-knob {
          transform: translateX(13px);
        }

        /* HIGH-TECH LASER SEAM DIVIDER */
        .jarvis-capsule-seam {
          position: relative;
          width: 1px;
          height: 32px;
          margin: 0 4px;
          background: rgba(255, 255, 255, 0.1);
        }
        .jarvis-seam-laser {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent, rgba(245, 158, 11, 0.8), transparent);
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
        }

        /* RIGHT ZONE: J.A.R.V.I.S. Core Launcher */
        .jarvis-zone-launcher {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px 6px 10px;
          border-radius: 999px;
          cursor: pointer;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(217, 119, 6, 0.04) 100%);
          border: 1px solid rgba(245, 158, 11, 0.3);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .jarvis-zone-launcher:hover {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.12) 100%);
          border-color: #fbbf24;
          box-shadow: 0 0 18px rgba(245, 158, 11, 0.35);
          transform: scale(1.02);
        }
        .jarvis-zone-launcher:active {
          transform: scale(0.97);
        }

        /* Arc Reactor Mini Core */
        .jarvis-capsule-reactor {
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 50%, #0d1e38 0%, #050b14 100%);
          border: 1.5px solid #f59e0b;
          box-shadow: 0 0 14px rgba(245, 158, 11, 0.6), inset 0 0 10px rgba(245, 158, 11, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .jarvis-reactor-spin-ring {
          position: absolute;
          inset: 2px;
          border-radius: 50%;
          border: 1.5px dashed rgba(251, 191, 36, 0.85);
          animation: jarvisReactorSpin 9s linear infinite;
        }
        .jarvis-reactor-center-core {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 10px #ffffff, 0 0 16px #f59e0b;
          animation: jarvisCoreGlow 2s ease-in-out infinite alternate;
        }
        @keyframes jarvisReactorSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes jarvisCoreGlow {
          0% { transform: scale(0.85); opacity: 0.85; }
          100% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 14px #ffffff, 0 0 22px #f59e0b; }
        }

        /* J.A.R.V.I.S. Brand Typography */
        .jarvis-capsule-brand-group {
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        .jarvis-capsule-brand-title {
          font-family: monospace;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.16em;
          color: #ffffff;
          text-shadow: 0 0 10px rgba(245, 158, 11, 0.9), 0 0 20px rgba(245, 158, 11, 0.4);
          line-height: 1.1;
        }
        .jarvis-capsule-brand-sub {
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #fbbf24;
          opacity: 0.85;
          margin-top: 1px;
        }

        /* Sparkle Accent */
        .jarvis-capsule-spark-wrap {
          color: #fbbf24;
          display: flex;
          align-items: center;
          margin-left: -2px;
          animation: jarvisSparkleTwinkle 2.5s ease-in-out infinite alternate;
        }
        @keyframes jarvisSparkleTwinkle {
          0% { transform: rotate(0deg) scale(0.9); opacity: 0.7; }
          50% { transform: rotate(20deg) scale(1.2); opacity: 1; }
          100% { transform: rotate(0deg) scale(0.9); opacity: 0.7; }
        }

        /* Translucent Frosted Dashboard Overlay (Exact Match to shared reference image) */
        .jarvis-modal-backdrop {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          z-index: 99999;
          background: radial-gradient(circle at 50% 40%, rgba(18, 30, 50, 0.68) 0%, rgba(10, 17, 30, 0.82) 100%) !important;
          backdrop-filter: blur(8px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(8px) saturate(180%) !important;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px 36px 14px 36px;
          box-sizing: border-box;
          overflow: hidden;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #e2e8f0;
          animation: jarvisBackdropIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .jarvis-modal-backdrop.is-closing {
          animation: jarvisBackdropOut 0.32s cubic-bezier(0.4, 0, 1, 1) forwards;
        }

        /* Top Bar Entrance & Exit */
        .jarvis-modal-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
          animation: jarvisSlideDown 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.05s backwards;
        }
        .jarvis-modal-backdrop.is-closing .jarvis-modal-topbar {
          animation: jarvisSlideUpExit 0.28s ease forwards;
        }
        .jarvis-badge-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #f59e0b, #b45309);
          border: 1.5px solid #fbbf24;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 900;
          font-size: 18px;
          font-family: monospace;
        }
        .jarvis-status-capsule {
          background: rgba(7, 20, 38, 0.88);
          border: 1px solid rgba(245, 158, 11, 0.55);
          border-radius: 24px;
          padding: 6px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 0 22px rgba(245, 158, 11, 0.3);
        }
        .jarvis-capsule-wave {
          display: flex;
          align-items: center;
          gap: 2.5px;
          margin-right: 2px;
        }
        .jarvis-capsule-wave span {
          width: 2.5px;
          border-radius: 2px;
          background: #fbbf24;
          box-shadow: 0 0 6px #f59e0b;
          animation: jarvisCapsuleWave 0.8s ease-in-out infinite alternate;
        }
        .jarvis-capsule-wave .cw1 { height: 7px; animation-delay: 0.1s; }
        .jarvis-capsule-wave .cw2 { height: 13px; animation-delay: 0.3s; }
        .jarvis-capsule-wave .cw3 { height: 8px; animation-delay: 0.2s; }
        @keyframes jarvisCapsuleWave {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1.3); }
        }
        .jarvis-ctrl-select {
          background-color: rgba(7, 20, 38, 0.9);
          border: 1px solid rgba(245, 158, 11, 0.45);
          border-radius: 20px;
          color: #ffffff;
          padding: 6px 12px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          outline: none;
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.2);
        }
        .jarvis-ctrl-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background-color: rgba(7, 20, 38, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .jarvis-ctrl-btn:hover {
          transform: scale(1.08);
          border-color: #f59e0b;
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
        }

        /* 3D Model Stage */
        .jarvis-3d-stage {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 280px;
        }
        .jarvis-holo-beam-flare {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 3px;
          height: 100%;
          background: linear-gradient(180deg, transparent 0%, rgba(245, 158, 11, 0.95) 50%, transparent 100%);
          box-shadow: 0 0 32px rgba(245, 158, 11, 0.9);
          pointer-events: none;
          z-index: 2;
          animation: jarvisFlareSweep 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .jarvis-three-container {
          width: 100%;
          height: 100%;
          cursor: grab;
        }
        .jarvis-three-container:active {
          cursor: grabbing;
        }
        .jarvis-stage-hint {
          position: absolute;
          bottom: 4px;
          font-size: 10px;
          font-weight: 700;
          color: rgba(245, 158, 11, 0.55);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          pointer-events: none;
          font-family: monospace;
        }

        /* Transcript Drawer (Glossy Liquid Glass) */
        .jarvis-chat-drawer {
          position: absolute;
          right: 28px;
          top: 75px;
          bottom: 180px;
          width: 330px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(8, 18, 38, 0.65) 100%);
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 20px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          z-index: 25;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.35), 0 16px 45px rgba(0, 0, 0, 0.75), 0 0 25px rgba(245, 158, 11, 0.2);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
        }

        /* UNIFIED SCULPTED HUD CONSOLE (100% MATCH TO REFERENCE) */
        .jarvis-hud-console-wrap {
          position: relative;
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          z-index: 20;
          animation: jarvisSlideUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.08s backwards;
        }
        .jarvis-modal-backdrop.is-closing .jarvis-hud-console-wrap {
          animation: jarvisSlideDownExit 0.28s ease forwards;
        }
        .jarvis-telemetry-badge {
          text-align: center;
          font-family: monospace;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.22em;
          color: #fbbf24;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          text-shadow: 0 0 14px rgba(245, 158, 11, 0.85);
        }
        .telemetry-sep {
          opacity: 0.55;
          color: #f59e0b;
        }

        /* Outer Chassis Frame with Layered Cyber Armor Bevel (100% Match to Reference) */
        .jarvis-hud-chassis {
          position: relative;
          width: 100%;
          border-radius: 36px;
          background: linear-gradient(180deg, rgba(245, 158, 11, 0.95) 0%, rgba(217, 119, 6, 0.35) 50%, rgba(245, 158, 11, 0.95) 100%);
          padding: 2px;
          clip-path: polygon(
            32px 0%, calc(100% - 32px) 0%,
            100% 28px, 100% calc(100% - 28px),
            calc(100% - 32px) 100%, 32px 100%,
            0% calc(100% - 28px), 0% 28px
          );
          box-shadow:
            0 0 38px rgba(245, 158, 11, 0.65),
            0 0 75px rgba(245, 158, 11, 0.25),
            0 28px 75px rgba(0, 0, 0, 0.95);
        }

        .jarvis-chassis-flank {
          position: absolute;
          top: 24px;
          bottom: 24px;
          width: 4px;
          border-radius: 4px;
          background: #f59e0b;
          box-shadow: 0 0 18px #f59e0b, 0 0 32px rgba(245, 158, 11, 0.85);
          z-index: 5;
          pointer-events: none;
        }
        .jarvis-chassis-flank.flank-left {
          left: -1px;
        }
        .jarvis-chassis-flank.flank-right {
          right: -1px;
        }

        /* Sci-Fi Armored Cyber Chassis Console (Gunmetal Slate-Gray Tint) */
        .jarvis-hud-console {
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, #172130 0%, #131a26 45%, #181920 100%);
          border-radius: 34px;
          clip-path: polygon(
            31px 0%, calc(100% - 31px) 0%,
            100% 27px, 100% calc(100% - 27px),
            calc(100% - 31px) 100%, 31px 100%,
            0% calc(100% - 27px), 0% 27px
          );
          padding: 18px 28px 20px 28px;
          backdrop-filter: blur(32px) saturate(210%);
          -webkit-backdrop-filter: blur(32px) saturate(210%);
          box-shadow:
            inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.25),
            inset 0 -2px 4px 0 rgba(0, 0, 0, 0.7),
            inset 0 0 35px rgba(245, 158, 11, 0.12);
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        /* Diagonal Specular Sheen Layer */
        .jarvis-glass-specular-sheen {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            118deg,
            rgba(255, 255, 255, 0.15) 0%,
            rgba(255, 255, 255, 0.05) 20%,
            transparent 45%,
            rgba(255, 255, 255, 0.02) 75%,
            rgba(255, 255, 255, 0.08) 100%
          );
          pointer-events: none;
          z-index: 1;
        }

        /* Holographic Tech Grid Overlay */
        .jarvis-glass-tech-grid {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 50%;
          background-image:
            radial-gradient(ellipse at 85% 50%, rgba(245, 158, 11, 0.12) 0%, transparent 70%),
            linear-gradient(rgba(245, 158, 11, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245, 158, 11, 0.06) 1px, transparent 1px);
          background-size: 100% 100%, 18px 18px, 18px 18px;
          opacity: 0.85;
          pointer-events: none;
          mask-image: linear-gradient(to right, transparent, black 35%);
          -webkit-mask-image: linear-gradient(to right, transparent, black 35%);
          z-index: 1;
        }

        /* Floor Rings and Glow Rig */
        .jarvis-console-floor-rig {
          position: relative;
          width: 96%;
          height: 42px;
          margin: -12px auto 0 auto;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .jarvis-floor-glow-pool {
          position: absolute;
          width: 86%;
          height: 32px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(245, 158, 11, 0.75) 0%, rgba(245, 158, 11, 0.28) 45%, transparent 75%);
          filter: blur(14px);
        }
        .jarvis-floor-ring {
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid rgba(245, 158, 11, 0.6);
          transform: perspective(700px) rotateX(72deg);
          box-shadow: 0 0 22px rgba(245, 158, 11, 0.7);
        }
        .jarvis-floor-ring.ring-1 {
          width: 96%;
          height: 52px;
        }
        .jarvis-floor-ring.ring-2 {
          width: 74%;
          height: 36px;
          border-style: dashed;
          border-color: rgba(251, 191, 36, 0.75);
          box-shadow: 0 0 16px rgba(251, 191, 36, 0.5);
        }

        /* Console Header */
        .jarvis-console-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 2px;
          z-index: 2;
        }
        .jarvis-console-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .jarvis-arc-mini-reactor {
          position: relative;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1.5px solid #fbbf24;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 14px rgba(245, 158, 11, 0.85);
          background: radial-gradient(circle, #f59e0b 0%, #b45309 60%, #000000 100%);
        }
        .jarvis-arc-mini-pulse {
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 1px dashed rgba(245, 158, 11, 0.75);
          animation: jarvisAvatarSpin 8s linear infinite;
        }
        .jarvis-arc-mini-core {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 8px #ffffff, 0 0 14px #f59e0b;
        }
        .jarvis-console-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.16em;
          font-family: monospace;
        }
        .jarvis-console-subtitle {
          font-size: 11px;
          font-weight: 800;
          color: #f59e0b;
          letter-spacing: 0.12em;
          font-family: monospace;
        }
        .jarvis-console-pipe {
          color: rgba(255, 255, 255, 0.25);
          font-size: 13px;
          margin: 0 2px;
        }
        .jarvis-console-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.32);
          border-radius: 9999px;
          padding: 2.5px 10px;
        }
        .jarvis-status-green-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #10b981;
          box-shadow: 0 0 8px #10b981;
        }
        .jarvis-status-green-text {
          font-size: 10px;
          font-weight: 800;
          color: #34d399;
          letter-spacing: 0.08em;
          font-family: monospace;
        }
        .jarvis-console-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .jarvis-console-action-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.45);
          cursor: pointer;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.15s ease;
        }
        .jarvis-console-action-btn:hover {
          color: #f59e0b;
          transform: scale(1.1);
        }

        /* Dialogue Row & Bubble */
        .jarvis-dialogue-row {
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 2;
        }
        .jarvis-wave-badge {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(9, 14, 24, 0.95) 100%);
          border: 1.5px solid #f59e0b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2.5px;
          flex-shrink: 0;
          box-shadow: 0 0 16px rgba(245, 158, 11, 0.55), inset 0 0 8px rgba(245, 158, 11, 0.25);
        }
        .jarvis-wave-bar {
          width: 2.5px;
          border-radius: 2px;
          background: #fbbf24;
          box-shadow: 0 0 6px #f59e0b;
          transition: height 0.15s ease;
        }
        .jarvis-wave-bar.b1 { height: 8px; }
        .jarvis-wave-bar.b2 { height: 15px; }
        .jarvis-wave-bar.b3 { height: 21px; }
        .jarvis-wave-bar.b4 { height: 14px; }
        .jarvis-wave-bar.b5 { height: 9px; }

        .jarvis-wave-badge.speaking .jarvis-wave-bar,
        .jarvis-wave-badge.listening .jarvis-wave-bar {
          animation: jarvisWaveDance 0.55s ease-in-out infinite alternate;
        }
        .jarvis-wave-badge.speaking .jarvis-wave-bar.b1 { animation-delay: 0.1s; }
        .jarvis-wave-badge.speaking .jarvis-wave-bar.b2 { animation-delay: 0.3s; }
        .jarvis-wave-badge.speaking .jarvis-wave-bar.b3 { animation-delay: 0s; }
        .jarvis-wave-badge.speaking .jarvis-wave-bar.b4 { animation-delay: 0.4s; }
        .jarvis-wave-badge.speaking .jarvis-wave-bar.b5 { animation-delay: 0.2s; }

        @keyframes jarvisWaveDance {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1.35); }
        }
        .jarvis-speech-bubble {
          position: relative;
          flex: 1;
          background: linear-gradient(180deg, #243043 0%, #192434 100%);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 13px 22px 14px 22px;
          box-shadow:
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.2),
            0 8px 24px rgba(0, 0, 0, 0.45);
          z-index: 2;
        }
        .jarvis-speech-bubble-tail {
          position: absolute;
          left: -6px;
          top: 50%;
          transform: translateY(-50%) rotate(45deg);
          width: 10px;
          height: 10px;
          background: #243043;
          border-left: 1px solid rgba(255, 255, 255, 0.15);
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }
        .jarvis-speech-primary {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.45;
          letter-spacing: -0.01em;
        }
        .jarvis-speech-secondary {
          font-size: 13px;
          color: #94a3b8;
          margin-top: 4px;
          font-weight: 400;
          letter-spacing: 0.01em;
        }
        .jarvis-speech-thinking {
          color: #f59e0b;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .jarvis-speech-capturing {
          color: #38bdf8;
          font-style: italic;
        }
        .jarvis-bubble-accent-tab {
          position: absolute;
          right: 20px;
          bottom: -1px;
          width: 65px;
          height: 2.5px;
          background: #f59e0b;
          box-shadow: 0 0 12px #f59e0b, 0 0 4px #fbbf24;
          border-radius: 2px;
        }

        /* Command Deck matching Reference */
        .jarvis-command-deck {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 2;
          width: 100%;
        }
        .jarvis-deck-mic-btn {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 35%, rgba(245, 158, 11, 0.25) 0%, #0a101d 85%);
          border: 2px solid #f59e0b;
          color: #fbbf24;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s ease;
          box-shadow: 0 0 22px rgba(245, 158, 11, 0.65), inset 0 0 10px rgba(245, 158, 11, 0.25);
        }
        .jarvis-deck-mic-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 0 30px rgba(245, 158, 11, 0.95);
          color: #ffffff;
        }
        .jarvis-deck-mic-btn.listening {
          border-color: #fbbf24;
          color: #ffffff;
          box-shadow: 0 0 35px rgba(245, 158, 11, 1), inset 0 0 14px rgba(245, 158, 11, 0.5);
          animation: jarvisMicPulse 1.4s ease-in-out infinite alternate;
        }
        @keyframes jarvisMicPulse {
          0% { transform: scale(1); box-shadow: 0 0 20px rgba(245, 158, 11, 0.6); }
          100% { transform: scale(1.08); box-shadow: 0 0 35px rgba(245, 158, 11, 1); }
        }
        .jarvis-deck-form {
          flex: 1;
          display: flex;
          align-items: center;
          background: #141d2c;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 9999px;
          padding: 4px 6px 4px 20px;
          gap: 10px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }
        .jarvis-deck-form:focus-within {
          border-color: rgba(245, 158, 11, 0.7);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6), 0 0 22px rgba(245, 158, 11, 0.4);
        }
        .jarvis-deck-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 13.5px;
          color: #ffffff;
          letter-spacing: 0.01em;
        }
        .jarvis-deck-input::placeholder {
          color: #64748b;
          font-weight: 400;
        }
        .jarvis-deck-inline-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .jarvis-deck-icon-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.15s ease;
        }
        .jarvis-deck-icon-btn:hover {
          color: #f59e0b;
          transform: scale(1.12);
        }
        .jarvis-deck-send-btn {
          width: 38px !important;
          height: 38px !important;
          border-radius: 50% !important;
          background: #f59e0b !important;
          border: none !important;
          color: #0b0f19 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          flex-shrink: 0 !important;
          box-shadow: 0 0 18px rgba(245, 158, 11, 0.9) !important;
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }
        .jarvis-deck-send-btn svg {
          color: #0b0f19 !important;
          stroke: #0b0f19 !important;
          fill: #0b0f19 !important;
        }
        .jarvis-deck-send-btn:hover:not(:disabled) {
          transform: scale(1.08) !important;
          box-shadow: 0 0 28px rgba(245, 158, 11, 1) !important;
        }
        .jarvis-deck-send-btn:disabled {
          opacity: 0.35 !important;
          cursor: default !important;
          box-shadow: none !important;
        }

        /* Quick Commands Section matching Reference */
        .jarvis-quick-section {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 3px;
          z-index: 2;
        }
        .jarvis-quick-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          justify-content: center;
        }
        .jarvis-quick-line {
          flex: 1;
          max-width: 140px;
          height: 1px;
          background: rgba(255, 255, 255, 0.12);
        }
        .jarvis-quick-label {
          font-family: monospace;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.22em;
          color: #94a3b8;
          opacity: 0.9;
        }
        .jarvis-quick-chips {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .jarvis-quick-chip {
          background: rgba(28, 38, 52, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 9999px;
          padding: 7px 18px;
          font-size: 12px;
          font-weight: 600;
          color: #e2e8f0;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .jarvis-quick-chip:hover {
          background: rgba(245, 158, 11, 0.18);
          border-color: #f59e0b;
          color: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 0 18px rgba(245, 158, 11, 0.45);
        }

        /* Animations */
        @keyframes jarvisBackdropIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes jarvisBackdropOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes jarvisFlareSweep {
          0% {
            opacity: 0;
            transform: scaleY(0) scaleX(1);
          }
          35% {
            opacity: 1;
            transform: scaleY(1) scaleX(22);
          }
          100% {
            opacity: 0;
            transform: scaleY(1.15) scaleX(0);
          }
        }
        @keyframes jarvisSlideDown {
          0% {
            opacity: 0;
            transform: translateY(-40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes jarvisSlideUp {
          0% {
            opacity: 0;
            transform: translateY(45px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes jarvisSlideDownExit {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(35px) scale(0.97);
          }
        }
        @keyframes jarvisSlideUpExit {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-30px);
          }
        }
        @keyframes jarvisBeamPulse {
          0%, 100% { opacity: 0.9; transform: scaleY(1); }
          50% { opacity: 0.4; transform: scaleY(0.85); }
        }
        @keyframes jarvisAvatarSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes jarvisEqDance {
          0% { height: 3px; }
          100% { height: 12px; }
        }
        @keyframes jarvisMicPulse {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        /* =========================================================
           MOBILE & TABLET RESPONSIVE ENGINE (iOS / Android / Portrait)
           ========================================================= */
        @media (max-width: 768px) {
          /* 1. Backdrop Full Screen with Dynamic Viewport Height */
          .jarvis-modal-backdrop {
            padding: 10px 10px 14px 10px;
            height: 100vh;
            height: 100dvh;
            max-height: 100dvh;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
            justify-content: space-between;
            gap: 6px;
          }

          /* 2. Compact Mobile Top Bar */
          .jarvis-modal-topbar {
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
            width: 100%;
            flex-shrink: 0;
          }
          .jarvis-modal-topbar > div:first-child {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
          }
          .jarvis-modal-topbar > div:last-child {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            gap: 6px;
          }
          .jarvis-badge-icon {
            width: 30px;
            height: 30px;
            font-size: 15px;
            border-radius: 8px;
          }
          .jarvis-ctrl-select {
            flex: 1;
            max-width: 150px;
            padding: 4px 8px;
            font-size: 10.5px;
            height: 32px;
          }
          .jarvis-ctrl-btn {
            width: 32px;
            height: 32px;
            flex-shrink: 0;
          }
          .jarvis-status-capsule {
            order: 3;
            justify-content: center;
            padding: 4px 12px;
            font-size: 10px;
            width: 100%;
            box-sizing: border-box;
          }

          /* 3. Scaled Holographic 3D Stage (Fits seamlessly above console) */
          .jarvis-3d-stage {
            flex: 0 1 auto;
            min-height: 150px;
            max-height: 220px;
            height: 190px;
            margin: 2px 0;
            width: 100%;
          }
          .jarvis-stage-hint {
            font-size: 9px;
            bottom: 0px;
            opacity: 0.7;
          }

          /* 4. Sculpted HUD Console - Full Visibility on Mobile */
          .jarvis-hud-console-wrap {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            flex-shrink: 0;
          }
          .jarvis-telemetry-badge {
            font-size: 9px;
            letter-spacing: 0.14em;
            margin-bottom: 5px;
            gap: 8px;
          }
          .jarvis-wing-bracket {
            display: none !important;
          }
          .jarvis-hud-console {
            padding: 10px 12px;
            border-radius: 18px;
            clip-path: none !important;
            gap: 8px;
            box-shadow: 
              inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.4),
              0 14px 34px rgba(0, 0, 0, 0.8),
              0 0 24px rgba(245, 158, 11, 0.35);
          }

          /* Header inside console */
          .jarvis-console-header {
            padding-bottom: 0;
          }
          .jarvis-console-title {
            font-size: 11px;
            letter-spacing: 0.12em;
          }
          .jarvis-console-subtitle {
            font-size: 9.5px;
          }
          .jarvis-status-green-text {
            font-size: 9.5px;
          }
          .jarvis-console-vents {
            display: none;
          }

          /* Dialogue row & bubble */
          .jarvis-dialogue-row {
            gap: 8px;
          }
          .jarvis-wave-badge {
            width: 28px;
            height: 28px;
            gap: 2px;
          }
          .jarvis-wave-bar {
            width: 2px;
          }
          .jarvis-wave-bar.b1 { height: 6px; }
          .jarvis-wave-bar.b2 { height: 11px; }
          .jarvis-wave-bar.b3 { height: 16px; }
          .jarvis-wave-bar.b4 { height: 10px; }
          .jarvis-wave-bar.b5 { height: 6px; }

          .jarvis-speech-bubble {
            padding: 8px 12px;
            border-radius: 14px;
          }
          .jarvis-speech-primary {
            font-size: 12px;
            line-height: 1.35;
          }
          .jarvis-speech-secondary {
            font-size: 10px;
            margin-top: 2px;
          }

          /* Command Deck */
          .jarvis-command-deck {
            padding: 3px 5px;
            border-radius: 28px;
          }
          .jarvis-deck-mic-btn {
            width: 36px;
            height: 36px;
          }
          .jarvis-deck-form {
            padding: 0 8px;
          }
          .jarvis-deck-input {
            font-size: 12px;
          }
          .jarvis-deck-send-btn {
            width: 32px;
            height: 32px;
          }

          /* Quick Chips - Fluid Horizontal Touch Swiper */
          .jarvis-quick-section {
            gap: 6px;
            margin-top: 0;
          }
          .jarvis-quick-divider {
            gap: 8px;
          }
          .jarvis-quick-line {
            max-width: 60px;
          }
          .jarvis-quick-label {
            font-size: 8.5px;
            letter-spacing: 0.12em;
          }
          .jarvis-quick-chips {
            display: flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            justify-content: flex-start;
            padding: 2px 2px 4px 2px;
            gap: 8px;
            scrollbar-width: none;
          }
          .jarvis-quick-chips::-webkit-scrollbar {
            display: none;
          }
          .jarvis-quick-chip {
            white-space: nowrap;
            flex-shrink: 0;
            padding: 6px 12px;
            font-size: 10.5px;
            border-radius: 16px;
          }

          /* Hide Floor Rings on Mobile to Save Space */
          .jarvis-console-floor-rig {
            display: none;
          }

          /* 5. Floating Capsule Dock When Closed */
          .jarvis-unified-dock {
            bottom: 14px;
            right: 14px;
          }
          .jarvis-dock-mini-orb {
            width: 38px;
            height: 38px;
          }
          .jarvis-capsule-chassis {
            padding: 4px 6px;
            border-radius: 999px;
          }
          .jarvis-zone-handsfree {
            padding: 4px 8px 4px 6px;
            gap: 6px;
          }
          .jarvis-capsule-mic-orb {
            width: 26px;
            height: 26px;
          }
          .jarvis-capsule-title {
            font-size: 9.5px;
          }
          .jarvis-capsule-desc {
            font-size: 8.5px;
          }
          .jarvis-capsule-toggle {
            width: 26px;
            height: 15px;
          }
          .jarvis-capsule-toggle-knob {
            width: 11px;
            height: 11px;
          }
          .jarvis-capsule-toggle.on .jarvis-capsule-toggle-knob {
            transform: translateX(11px);
          }
          .jarvis-zone-launcher {
            padding: 4px 10px 4px 6px;
            gap: 6px;
          }
          .jarvis-capsule-reactor {
            width: 26px;
            height: 26px;
          }
          .jarvis-reactor-center-core {
            width: 8px;
            height: 8px;
          }
          .jarvis-capsule-brand-title {
            font-size: 11px;
          }
          .jarvis-capsule-brand-sub {
            font-size: 7.5px;
          }

          /* Dialogue transcript drawer on mobile */
          .jarvis-chat-drawer {
            left: 10px;
            right: 10px;
            top: 70px;
            bottom: 80px;
            width: auto;
            border-radius: 16px;
            padding: 12px;
          }
        }
      `}</style>
    </>
  );
}
