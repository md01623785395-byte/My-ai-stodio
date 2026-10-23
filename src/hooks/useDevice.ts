import { useState, useEffect } from 'react';
import { DeviceInfo, DeviceType } from '../types';

function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'desktop',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouch: false,
      orientation: 'landscape',
      screenWidth: 1280,
      screenHeight: 800,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  const isTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  let deviceType: DeviceType = 'desktop';
  if (width < 768) {
    deviceType = 'mobile';
  } else if (width >= 768 && width < 1024) {
    deviceType = 'tablet';
  } else {
    deviceType = 'desktop';
  }

  const orientation = width >= height ? 'landscape' : 'portrait';

  return {
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isTouch,
    orientation,
    screenWidth: width,
    screenHeight: height,
  };
}

export function useDevice(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo);

  useEffect(() => {
    let timeoutId: number | undefined;

    const handleResize = () => {
      // Debounce slightly for smooth resize transition
      if (timeoutId) {
        window.cancelAnimationFrame(timeoutId);
      }
      timeoutId = window.requestAnimationFrame(() => {
        setDeviceInfo(getDeviceInfo());
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    // Initial check in case of hydration differences
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (timeoutId) {
        window.cancelAnimationFrame(timeoutId);
      }
    };
  }, []);

  return deviceInfo;
}
