import React, { useState, useEffect, useRef } from 'react';
import patitoImg from '../assets/mascotas/pngs/patito.png';
import buocitoImg from '../assets/mascotas/pngs/buocito.png';
import cuervitoImg from '../assets/mascotas/pngs/cuervito.png';
import gatitoImg from '../assets/mascotas/pngs/gatito.png';
import loritoImg from '../assets/mascotas/pngs/lorito.gif';
import lobitoImg from '../assets/mascotas/pngs/lobito.gif';
import patitoIcon from '../assets/mascotas/icons/patito.svg';
import buoIcon from '../assets/mascotas/icons/buo.svg';
import cuervoIcon from '../assets/mascotas/icons/cuervo.svg';
import gatitoIcon from '../assets/mascotas/icons/gatito.svg';
import loritoIcon from '../assets/mascotas/icons/lorito.svg';
import lobitoIcon from '../assets/mascotas/icons/lobito.svg';
import sonidoPato from '../assets/sounds/pato.mp3';
import sonidoLobito from '../assets/sounds/lobito.mp3';
import sonidoBuo from '../assets/sounds/buo.mp3';
import sonidoCuervo from '../assets/sounds/cuervo.mp3';
import sonidoGato from '../assets/sounds/gato.mp3';
import sonidoLoro from '../assets/sounds/loro.mp3';
import sonidoRuleta from '../assets/sounds/ruleta.mp3';
import '../styles/mascota.css';

const MASCOTAS = [
    { id: 'pato', name: 'Patito', icon: patitoIcon, img: patitoImg, sound: sonidoPato },
    { id: 'buo', name: 'Buocito', icon: buoIcon, img: buocitoImg, sound: sonidoBuo },
    { id: 'cuervo', name: 'Cuervito', icon: cuervoIcon, img: cuervitoImg, sound: sonidoCuervo },
    { id: 'gato', name: 'Gatito', icon: gatitoIcon, img: gatitoImg, sound: sonidoGato },
    { id: 'loro', name: 'Lorito', icon: loritoIcon, img: loritoImg, sound: sonidoLoro },
    { id: 'lobito', name: 'Lobito', icon: lobitoIcon, img: lobitoImg, sound: sonidoLobito },
];

export { MASCOTAS };

const Mascota = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isClicked, setIsClicked] = useState(false);
    const [isRolling, setIsRolling] = useState(false);
    const [particles, setParticles] = useState([]);
    const [clickCount, setClickCount] = useState(0);
    const [currentMascota, setCurrentMascota] = useState(MASCOTAS[0]);
    
    const audioRef = useRef(null);
    const rouletteAudioRef = useRef(new Audio(sonidoRuleta));
    const hideTimeoutRef = useRef(null);
    const rollIntervalRef = useRef(null);

    const showMascota = () => {
        // La card NO aparece todavía, solo empieza la ruleta en el ícono del navbar
        setIsRolling(true);
        setClickCount(0);

        const rouletteAudio = rouletteAudioRef.current;

        // Efecto de "ruleta": cicla íconos en el navbar
        let rollIndex = 0;
        if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = setInterval(() => {
            const mascota = MASCOTAS[rollIndex % MASCOTAS.length];
            setCurrentMascota(mascota);
            window.dispatchEvent(new CustomEvent('mascota:change', { detail: { mascota, isRolling: true } }));
            rollIndex++;
        }, 150);

        const finishRolling = () => {
            // Evitar doble llamada (fallback + onended)
            rouletteAudio.onended = null;

            clearInterval(rollIntervalRef.current);
            rollIntervalRef.current = null;
            setIsRolling(false);

            // Elegir mascota final
            const randomMascota = MASCOTAS[Math.floor(Math.random() * MASCOTAS.length)];
            setCurrentMascota(randomMascota);

            // Notificar al navbar la mascota seleccionada (ya no rolling)
            window.dispatchEvent(new CustomEvent('mascota:change', { detail: { mascota: randomMascota, isRolling: false } }));

            // Cargar audio de la mascota elegida
            if (randomMascota.sound) {
                audioRef.current = new Audio(randomMascota.sound);
                audioRef.current.volume = 0.5;
            } else {
                audioRef.current = null;
            }

            // Ahora sí aparece la card con la PNG/GIF
            setIsVisible(true);

            // Ocultar después de unos segundos
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = setTimeout(() => {
                setIsVisible(false);
            }, Math.random() * (8000 - 5000) + 5000);
        };

        if (rouletteAudio) {
            rouletteAudio.currentTime = 0;
            rouletteAudio.volume = 0.4;
            rouletteAudio.onended = finishRolling;
            rouletteAudio.play().catch(e => {
                console.log('Roulette sound error', e);
                // Fallback si falla el audio (ej: interacción del usuario requerida)
                setTimeout(finishRolling, 3500);
            });
        } else {
            setTimeout(finishRolling, 3500);
        }
    };

    useEffect(() => {
        let isEnabled = localStorage.getItem('patito_enabled') !== 'false';
        let localTimeout = null;

        const scheduleRandomAppearance = () => {
            const isStillEnabled = localStorage.getItem('patito_enabled') !== 'false';
            if (!isStillEnabled) return;

            const nextAppearanceDelay = Math.random() * (90000 - 30000) + 30000;
            
            if (localTimeout) clearTimeout(localTimeout);
            localTimeout = setTimeout(() => {
                const checkEnabled = localStorage.getItem('patito_enabled') !== 'false';
                if (!checkEnabled) return;

                showMascota();
                scheduleRandomAppearance();
            }, nextAppearanceDelay);
        };

        const handleStorageChange = () => {
             const currentlyEnabled = localStorage.getItem('patito_enabled') !== 'false';
             
             if (!currentlyEnabled) {
                 setIsVisible(false);
                 if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                 if (localTimeout) clearTimeout(localTimeout);
                 isEnabled = false;
             } else if (!isEnabled) {
                 isEnabled = true;
                 scheduleRandomAppearance();
             }
        };

        window.addEventListener('storage', handleStorageChange);

        if (isEnabled) {
            localTimeout = setTimeout(() => {
                const checkEnabled = localStorage.getItem('patito_enabled') !== 'false';
                if (!checkEnabled) return;
                showMascota();
                scheduleRandomAppearance();
            }, Math.random() * (20000 - 10000) + 10000); 
        }

        return () => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            if (localTimeout) clearTimeout(localTimeout);
            if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
            window.removeEventListener('storage', handleStorageChange);
            rouletteAudioRef.current?.pause();
        };
    }, []);

    const handleClick = () => {
        if (!isVisible || clickCount >= 3) return;
        
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log('Playback blocked', e));
        }

        setIsClicked(true);
        setTimeout(() => setIsClicked(false), 500);

        const newParticles = Array.from({ length: 15 }).map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 80 + 40;
            return {
                id: Date.now() + i,
                dx: `${Math.cos(angle) * distance}px`,
                dy: `${Math.sin(angle) * distance - 50}px`,
                color: ['#e11d48', '#d946ef', '#10b981', '#fbbf24', '#3b82f6'][Math.floor(Math.random() * 5)]
            };
        });

        setParticles(newParticles);
        setTimeout(() => setParticles([]), 1000);

        const newCount = clickCount + 1;
        setClickCount(newCount);

        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        
        if (newCount >= 3) {
            hideTimeoutRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 800);
        } else {
            hideTimeoutRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
        }
    };

    return (
        <div className={`patito-container ${isVisible ? 'is-visible' : ''} ${isClicked ? 'is-clicked' : ''}`} onClick={handleClick}>
            <div style={{ position: 'relative' }}>
                <img src={currentMascota.img} alt={currentMascota.name} className="patito-img" />
                
                {particles.map(p => (
                    <div 
                        key={p.id} 
                        className="confetti-particle"
                        style={{
                            backgroundColor: p.color,
                            '--dx': p.dx,
                            '--dy': p.dy,
                            top: '40%',
                            left: '40%'
                        }}
                    ></div>
                ))}
            </div>
        </div>
    );
};

export default Mascota;
