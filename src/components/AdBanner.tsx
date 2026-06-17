import * as React from 'react';
import { useEffect, useRef } from 'react';

interface AdBannerProps {
  type: 'native' | 'banner300' | 'banner728' | 'banner320';
}

export const AdBanner: React.FC<AdBannerProps> = ({ type }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = ''; // reset previous content

    if (type === 'native') {
      const containerDiv = document.createElement('div');
      containerDiv.id = 'container-efb999a0917e92293402322d5bcb91ec';
      containerRef.current.appendChild(containerDiv);

      const script = document.createElement('script');
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = 'https://pl29777828.effectivecpmnetwork.com/efb999a0917e92293402322d5bcb91ec/invoke.js';
      containerRef.current.appendChild(script);
    } else if (type === 'banner300') {
      // 300x250 Banner Widget
      const scriptConf = document.createElement('script');
      scriptConf.innerHTML = `
        atOptions = {
          'key' : 'ff933d2d516a751018c4ed744ec94c00',
          'format' : 'iframe',
          'height' : 250,
          'width' : 300,
          'params' : {}
        };
      `;
      containerRef.current.appendChild(scriptConf);

      const script = document.createElement('script');
      script.src = 'https://www.highperformanceformat.com/ff933d2d516a751018c4ed744ec94c00/invoke.js';
      containerRef.current.appendChild(script);
    } else if (type === 'banner728') {
      // 728x90 Banner Widget
      const scriptConf = document.createElement('script');
      scriptConf.innerHTML = `
        atOptions = {
          'key' : '7e0b25cad2d32e18c635cc4676c2db65',
          'format' : 'iframe',
          'height' : 90,
          'width' : 728,
          'params' : {}
        };
      `;
      containerRef.current.appendChild(scriptConf);

      const script = document.createElement('script');
      script.src = 'https://www.highperformanceformat.com/7e0b25cad2d32e18c635cc4676c2db65/invoke.js';
      containerRef.current.appendChild(script);
    } else if (type === 'banner320') {
      // 320x50 Mobile Banner Widget
      const scriptConf = document.createElement('script');
      scriptConf.innerHTML = `
        atOptions = {
          'key' : '06c7ac1d2f7e93db509e792788c32b98',
          'format' : 'iframe',
          'height' : 50,
          'width' : 320,
          'params' : {}
        };
      `;
      containerRef.current.appendChild(scriptConf);

      const script = document.createElement('script');
      script.src = 'https://www.highperformanceformat.com/06c7ac1d2f7e93db509e792788c32b98/invoke.js';
      containerRef.current.appendChild(script);
    }
  }, [type]);

  return (
    <div 
      ref={containerRef} 
      className={`ad-banner-container ad-${type}`}
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        margin: '0.75rem auto',
        minHeight: type === 'banner300' ? '250px' : type === 'banner728' ? '90px' : type === 'banner320' ? '50px' : 'auto',
        width: '100%',
        maxWidth: type === 'banner728' ? '728px' : type === 'banner300' ? '300px' : type === 'banner320' ? '320px' : '100%',
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px dashed rgba(255, 255, 255, 0.04)',
        borderRadius: 'var(--radius-sm)'
      }} 
    />
  );
};
