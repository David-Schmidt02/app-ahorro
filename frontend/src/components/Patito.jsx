import React, { useState, useEffect, useRef } from 'react';
import patitoImg from '../assets/patito.png';
import quackSoundFile from '../assets/quack.mp3';
import '../styles/patito.css';

const Patito = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isClicked, setIsClicked] = useState(false);
    const [particles, setParticles] = useState([]);
    const [clickCount, setClickCount] = useState(0);
    const audioRef = useRef(null);
    const hideTimeoutRef = useRef(null);

    useEffect(() => {
        let isEnabled = localStorage.getItem('patito_enabled') !== 'false';
        let localTimeout = null;

        // Inicializar audio
        audioRef.current = new Audio(quackSoundFile);
        audioRef.current.volume = 0.5;

        const scheduleRandomAppearance = () => {
            const isStillEnabled = localStorage.getItem('patito_enabled') !== 'false';
            if (!isStillEnabled) return;

            // Entre 30 y 90 segundos entre apariciones
            const nextAppearanceDelay = Math.random() * (90000 - 30000) + 30000;
            
            if (localTimeout) clearTimeout(localTimeout);
            localTimeout = setTimeout(() => {
                const checkEnabled = localStorage.getItem('patito_enabled') !== 'false';
                if (!checkEnabled) return;

                showPatito();
                scheduleRandomAppearance(); // Agendar la siguiente
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
                 // Si estaba apagado y ahora lo encendió, re-agendamos.
                 isEnabled = true;
                 scheduleRandomAppearance();
             }
        };

        window.addEventListener('storage', handleStorageChange);

        if (isEnabled) {
            // Mostrar patito en los primeros 10-20 segundos por primera vez
            localTimeout = setTimeout(() => {
                const checkEnabled = localStorage.getItem('patito_enabled') !== 'false';
                if (!checkEnabled) return;
                showPatito();
                scheduleRandomAppearance();
            }, Math.random() * (20000 - 10000) + 10000); 
        }

        return () => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            if (localTimeout) clearTimeout(localTimeout);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const showPatito = () => {
        setIsVisible(true);
        setClickCount(0); // Reiniciar clicks
        // Ocultarlo después de 5-8 segundos
        hideTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
        }, Math.random() * (8000 - 5000) + 5000);
    };

    const handleClick = () => {
        if (!isVisible || clickCount >= 3) return;
        
        // Reproducir sonido
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log('El navegador bloqueó el autoplay del patito', e));
        }

        // Animación de shock
        setIsClicked(true);
        setTimeout(() => setIsClicked(false), 500);

        // Generar confeti desde la posición del pato
        const newParticles = Array.from({ length: 15 }).map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 80 + 40; // 40 a 120 px de distancia
            return {
                id: Date.now() + i,
                dx: `${Math.cos(angle) * distance}px`,
                dy: `${Math.sin(angle) * distance - 50}px`, /* Un poco para arriba */
                color: ['#e11d48', '#d946ef', '#10b981', '#fbbf24', '#3b82f6'][Math.floor(Math.random() * 5)]
            };
        });

        setParticles(newParticles);
        
        // Limpiar particulas
        setTimeout(() => setParticles([]), 1000);

        const newCount = clickCount + 1;
        setClickCount(newCount);

        // Limpiar timeout de esconder
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        
        // Si ya se cliqueó 3 veces, asustarlo y que se vaya rápido
        if (newCount >= 3) {
            hideTimeoutRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 800);
        } else {
            // Si le quedan clicks, estirar el tiempo que se asoma por 3 segs más para permitir los siguientes clicks
            hideTimeoutRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
        }
    };

    return (
        <div className={`patito-container ${isVisible ? 'is-visible' : ''} ${isClicked ? 'is-clicked' : ''}`} onClick={handleClick}>
            <div style={{ position: 'relative' }}>
                <img src={patitoImg} alt="Patito de Goma" className="patito-img" />
                
                {/* Partículas de Confeti */}
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

export default Patito;
