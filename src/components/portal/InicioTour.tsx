'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/components/tours/bitacora-tour.css';
import { useSidebar } from '@/components/ui/sidebar';
import { useActiveRolePermissions } from '@/components/permissions/ActiveRolePermissionsProvider';
import {
  buildInicioTourSteps,
  INICIO_TOUR_BUTTONS,
  INICIO_TOUR_POPOVER_CLASS,
} from '@/lib/tours/inicio-tour';

export type InicioTourHandle = {
  startTour: () => void;
};

function filterExistingSteps(
  steps: ReturnType<typeof buildInicioTourSteps>
) {
  return steps.filter((s) => {
    if (typeof s.element !== 'string') return true;
    return document.querySelector(s.element) != null;
  });
}

export const InicioTour = forwardRef<InicioTourHandle>(
  function InicioTour(_props, ref) {
    const { can } = useActiveRolePermissions();
    const { setOpen, isMobile, setOpenMobile, expandOnHover, setHovered } =
      useSidebar();
    const driverRef = useRef<Driver | null>(null);
    const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

    const destroyTour = useCallback(() => {
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      driverRef.current?.destroy();
      driverRef.current = null;
      if (expandOnHover && !isMobile) {
        setHovered(false);
      }
    }, [expandOnHover, isMobile, setHovered]);

    useEffect(() => destroyTour, [destroyTour]);

    const startTour = useCallback(() => {
      destroyTour();

      // Expandir sidebar para que los labels sean visibles
      if (isMobile) {
        setOpenMobile(true);
      } else if (expandOnHover) {
        setHovered(true);
      } else {
        setOpen(true);
      }

      startTimeoutRef.current = setTimeout(() => {
        startTimeoutRef.current = null;
        const steps = filterExistingSteps(buildInicioTourSteps(can));
        if (steps.length === 0) return;

        const d = driver({
          showProgress: true,
          animate: true,
          allowClose: true,
          overlayOpacity: 0.55,
          stagePadding: 8,
          stageRadius: 8,
          popoverClass: INICIO_TOUR_POPOVER_CLASS,
          ...INICIO_TOUR_BUTTONS,
          steps,
          onDestroyed: () => {
            driverRef.current = null;
            if (expandOnHover && !isMobile) {
              setHovered(false);
            }
          },
        });
        driverRef.current = d;
        d.drive();
      }, 280);
    }, [
      can,
      destroyTour,
      expandOnHover,
      isMobile,
      setHovered,
      setOpen,
      setOpenMobile,
    ]);

    useImperativeHandle(ref, () => ({ startTour }), [startTour]);

    return null;
  }
);
